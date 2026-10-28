// S-13 Instellingen: gezin, uitnodigen, toestemming, etiketcontroles, export, uitloggen en verwijderen.
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Share, Text, View } from 'react-native';
import { CONSENT_VERSIONS, LEGAL_URLS } from '@shared/core/constants';
import { loadHousehold } from '@shared/core/repo';
import { ALLERGEN_CODES, ALLERGEN_LABELS } from '@shared/domain/types';
import { ScreenScroll } from '@/components/ScreenScroll';
import {
  ActionRow, AppTitle, Button, Checkbox, Chip, ChipRow, Field, FormError, HardSection, HardText, ParentToggle, SafeNote, SectionTitle, SubHeader, Subtitle, TasteChip, TasteRow, s,
} from '@/components/ui';
import { toUiError } from '@/lib/errors';
import { useCore, useSession } from '@/lib/session';
import { useToast } from '@/lib/toast';
import { useLoad } from '@/lib/use-load';

const EXPORT_TABLES = ['households', 'profiles', 'consents', 'profile_rules', 'household_ingredient_checks', 'meal_plans', 'meal_slots', 'meal_attendees', 'pantry_items', 'shopping_items', 'leftovers', 'meal_feedback'] as const;

export default function Instellingen() {
  const ctx = useCore();
  const { role, session, signOut } = useSession();
  const toast = useToast();
  const { data, reload } = useLoad(useCallback(async () => {
    const [household, consent, checks, incomplete] = await Promise.all([
      loadHousehold(ctx.supabase, ctx.householdId),
      ctx.supabase.from('consents').select('granted_at').eq('household_id', ctx.householdId).eq('purpose', 'health_data').is('withdrawn_at', null).maybeSingle(),
      ctx.supabase.from('household_ingredient_checks').select('ingredient_id, contains_allergens, ingredients(canonical_name)').eq('household_id', ctx.householdId),
      ctx.supabase.from('ingredients').select('id, canonical_name').eq('allergen_status', 'incomplete').order('canonical_name'),
    ]);
    return {
      household, healthSince: (consent.data?.granted_at as string | undefined) ?? null,
      checks: (checks.data ?? []).map((c) => ({ id: c.ingredient_id as string, name: (c.ingredients as unknown as { canonical_name: string } | null)?.canonical_name ?? (c.ingredient_id as string), allergens: c.contains_allergens as string[] })),
      incomplete: (incomplete.data ?? []) as { id: string; canonical_name: string }[],
    };
  }, [ctx]));
  const [form, setForm] = useState<{ name: string; weekday: string; weekend: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [check, setCheck] = useState({ ingredient: '', allergens: [] as string[], vegetarian: true, vegan: false, confirmed: false });
  const [scope, setScope] = useState<'account' | 'household'>('account');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!data) return <ScreenScroll><SubHeader title="INSTELLINGEN" onBack={() => router.back()} /></ScreenScroll>;
  const f = form ?? { name: data.household.name, weekday: String(data.household.weekday_minutes ?? 30), weekend: data.household.weekend_minutes != null ? String(data.household.weekend_minutes) : '' };
  const act = async (fn: () => Promise<unknown>, msg?: string) => { setError(null); try { await fn(); if (msg) toast(msg); await reload(); } catch (e) { setError(toUiError(e).message); } };

  const saveHousehold = () => act(async () => {
    const num = (v: string) => (v.trim() === '' ? null : Math.max(5, Math.min(240, Math.round(Number(v)))));
    const { error: e } = await ctx.supabase.from('households').update({ name: f.name.trim() || 'Ons gezin', weekday_minutes: num(f.weekday), weekend_minutes: num(f.weekend) }).eq('id', ctx.householdId);
    if (e) throw e;
    setForm(null);
  }, 'Instellingen bewaard');

  const invite = () => act(async () => {
    const token = Array.from(Crypto.getRandomBytes(24), (b) => b.toString(16).padStart(2, '0')).join('');
    const sha = (v: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, v);
    const { error: e } = await ctx.supabase.from('invitations').insert({
      household_id: ctx.householdId, recipient_email_hash: await sha(inviteEmail.trim().toLowerCase()), token_hash: await sha(token),
      invited_by: ctx.userId, expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
    if (e) throw e;
    await Share.share({ message: `Doe mee met ons gezin in Plateful (7 dagen geldig, alleen voor ${inviteEmail.trim()}): platefull://uitnodiging?token=${token}` });
    setInviteEmail('');
  });

  const toggleConsent = () => {
    if (!data.healthSince) { void act(async () => { const { error: e } = await ctx.supabase.rpc('grant_health_consent', { p_version: CONSENT_VERSIONS.health }); if (e) throw e; }, 'Toestemming vastgelegd'); return; }
    Alert.alert('Toestemming intrekken?', 'Alle vastgelegde allergieën en medische beperkingen worden direct verwijderd, en Plateful doet daarna geen uitspraken meer over geschiktheid.', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Intrekken', style: 'destructive', onPress: () => void act(async () => { const { error: e } = await ctx.supabase.rpc('withdraw_health_consent'); if (e) throw e; }, 'Toestemming ingetrokken en gegevens verwijderd') },
    ]);
  };

  const saveCheck = () => act(async () => {
    const { error: e } = await ctx.supabase.from('household_ingredient_checks').upsert({
      household_id: ctx.householdId, ingredient_id: check.ingredient, contains_allergens: check.allergens, checked_by: ctx.userId, checked_at: new Date().toISOString(),
      diet: { meat: !check.vegetarian, pork: !check.vegetarian, fish: !check.vegetarian, animal: !check.vegan },
    }, { onConflict: 'household_id,ingredient_id' });
    if (e) throw e;
    setCheck({ ingredient: '', allergens: [], vegetarian: true, vegan: false, confirmed: false });
  }, 'Etiketcontrole vastgelegd');

  const exportData = () => act(async () => {
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), account: { id: ctx.userId, email: session?.user.email } };
    for (const t of EXPORT_TABLES) {
      const { data: rows, error: e } = await ctx.supabase.from(t).select('*').eq(t === 'households' ? 'id' : 'household_id', ctx.householdId);
      if (e) throw e;
      out[t] = rows;
    }
    await Share.share({ message: JSON.stringify(out, null, 2), title: 'plateful-export.json' });
  });

  const remove = () => Alert.alert('Definitief verwijderen?', 'Dit kan niet ongedaan worden gemaakt.', [
    { text: 'Annuleren', style: 'cancel' },
    { text: 'Verwijderen', style: 'destructive', onPress: () => void act(async () => {
      const { error: e } = await ctx.supabase.rpc('request_deletion', { p_scope: scope, p_confirm: 'VERWIJDEREN' });
      if (e) throw e;
      await signOut();
    }) },
  ]);

  return (
    <ScreenScroll>
      <SubHeader title="INSTELLINGEN" onBack={() => router.back()} />
      <AppTitle>{'Jullie gezin,\njullie regels.'}</AppTitle>
      <SectionTitle>Gezin</SectionTitle>
      <Field label="Naam" value={f.name} onChangeText={(v) => setForm({ ...f, name: v })} />
      <Field label="Kooktijd doordeweeks (min.)" value={f.weekday} onChangeText={(v) => setForm({ ...f, weekday: v })} keyboardType="number-pad" />
      <Field label="Kooktijd weekend (min., optioneel)" value={f.weekend} onChangeText={(v) => setForm({ ...f, weekend: v })} keyboardType="number-pad" />
      <Button wide onPress={saveHousehold} disabled={!form}>Bewaren</Button>

      {role === 'owner' ? (
        <>
          <SectionTitle>Tweede volwassene uitnodigen</SectionTitle>
          <Field label="E-mailadres" value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" autoCapitalize="none" hint="De uitnodiging is 7 dagen geldig en werkt alleen voor dit e-mailadres." />
          <Button wide variant="plain" onPress={invite} disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail.trim())}>Uitnodiging delen</Button>
        </>
      ) : null}

      <SectionTitle>Privacy & toestemming</SectionTitle>
      <ParentToggle title="Gezondheidsgegevens (allergieën, medisch)" sub={data.healthSince ? `Toestemming sinds ${new Date(data.healthSince).toLocaleDateString('nl-NL')}` : 'Geen toestemming — harde beperkingen kunnen niet worden vastgelegd'} on={!!data.healthSince} onToggle={toggleConsent} />

      <SectionTitle>Etiketcontroles</SectionTitle>
      <Subtitle>Samengestelde producten (wraps, sauzen, kaas) verschillen per merk. Leg vast wat er op het etiket van jóuw product staat; alleen dan kunnen ze bij een allergie worden voorgesteld.</Subtitle>
      {data.checks.map((c) => <TasteRow key={c.id} label={c.name}><TasteChip type="like">{c.allergens.length ? c.allergens.map((a) => ALLERGEN_LABELS[a as keyof typeof ALLERGEN_LABELS]).join(', ') : 'Geen allergenen'}</TasteChip></TasteRow>)}
      <Text style={[s.fieldLabel, { marginTop: 10 }]}>Product</Text>
      <ChipRow>{data.incomplete.map((i) => <Chip key={i.id} label={i.canonical_name} selected={check.ingredient === i.id} onPress={() => setCheck({ ...check, ingredient: i.id })} />)}</ChipRow>
      {check.ingredient ? (
        <>
          <Text style={[s.fieldLabel, { marginTop: 10 }]}>Bevat volgens het etiket (incl. ‘kan sporen bevatten’)</Text>
          <ChipRow>{ALLERGEN_CODES.map((a) => <Chip key={a} strict label={ALLERGEN_LABELS[a]} selected={check.allergens.includes(a)} onPress={() => setCheck({ ...check, allergens: check.allergens.includes(a) ? check.allergens.filter((x) => x !== a) : [...check.allergens, a] })} />)}</ChipRow>
          <ChipRow style={{ marginTop: 8 }}>
            <Chip label="Vegetarisch" selected={check.vegetarian} onPress={() => setCheck({ ...check, vegetarian: !check.vegetarian })} />
            <Chip label="Veganistisch" selected={check.vegan} onPress={() => setCheck({ ...check, vegan: !check.vegan })} />
          </ChipRow>
          <Checkbox checked={check.confirmed} onToggle={() => setCheck({ ...check, confirmed: !check.confirmed })} label="Ik heb het etiket zelf gecontroleerd" hint="Geldig voor 180 dagen. Een etiketcontrole kan nooit een bekend allergeen weghalen." />
          <Button wide variant="plain" onPress={saveCheck} disabled={!check.confirmed}>Etiketcontrole vastleggen</Button>
        </>
      ) : null}

      <SectionTitle>Je gegevens</SectionTitle>
      <Button wide variant="plain" onPress={exportData}>Exporteer gezinsgegevens</Button>
      <Button wide variant="plain" style={{ marginTop: 8 }} onPress={() => void signOut()}>Uitloggen ({session?.user.email})</Button>

      <HardSection title="Verwijderen">
        <HardText>{role === 'owner' ? 'Verwijder je account, of het hele gezin met alle profielen, voorkeuren en planning.' : 'Verwijder je account. Het gezin blijft bestaan voor de andere volwassene.'} Je rechten worden direct ingetrokken.</HardText>
        {role === 'owner' ? <ChipRow><Chip strict label="Mijn account" selected={scope === 'account'} onPress={() => setScope('account')} /><Chip strict label="Hele gezin" selected={scope === 'household'} onPress={() => setScope('household')} /></ChipRow> : null}
        <View style={{ marginTop: 8 }}><Field label="Typ VERWIJDEREN ter bevestiging" value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" /></View>
        <Button wide variant="orange" disabled={confirmText !== 'VERWIJDEREN'} onPress={remove}>Definitief verwijderen</Button>
      </HardSection>
      {error ? <FormError>{error}</FormError> : null}
      <ActionRow>
        <Button variant="plain" onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}>Privacyverklaring</Button>
        <Button variant="plain" onPress={() => void Linking.openURL(LEGAL_URLS.support)}>Support</Button>
      </ActionRow>
      <SafeNote>Platefull is geen medisch hulpmiddel. Privacyvragen (ook van kinderen vanaf 12 jaar): mail naar privacy@linkandlead.nl.</SafeNote>
    </ScreenScroll>
  );
}
