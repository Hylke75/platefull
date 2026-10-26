// S-07 Gezin: profielen, rol en voorkeurstatus.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { loadHousehold, loadProfiles, loadRules } from '@shared/core/repo';
import { ScreenScroll } from '@/components/ScreenScroll';
import { ActionRow, AppHeader, AppTitle, Banner, Button, Chip, ChipRow, Eyeline, Field, FormError, PersonRow, SafeNote, SectionTitle, Subtitle } from '@/components/ui';
import { toUiError } from '@/lib/errors';
import { useCore } from '@/lib/session';
import { useLoad } from '@/lib/use-load';

const ROLE: Record<string, string> = { adult: 'Volwassene', teen16: '16+', child: 'Kind' };

export default function Gezin() {
  const ctx = useCore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [band, setBand] = useState<'adult' | 'teen16' | 'child'>('child');
  const [error, setError] = useState<string | null>(null);
  const { data, reload, loading } = useLoad(useCallback(async () => {
    const [household, profiles, rules] = await Promise.all([loadHousehold(ctx.supabase, ctx.householdId), loadProfiles(ctx.supabase, ctx.householdId), loadRules(ctx.supabase, ctx.householdId)]);
    return { household, profiles, rules };
  }, [ctx]));
  if (!data) return <ScreenScroll tabs><AppHeader /></ScreenScroll>;

  const sub = (id: string, status: string) => {
    const r = data.rules.filter((x) => x.profileId === id);
    const hard = r.filter((x) => x.severity.startsWith('HARD')).length;
    const soft = r.filter((x) => !x.severity.startsWith('HARD') && x.severity !== 'UNKNOWN').length;
    const parts = [soft ? `${soft} ${soft === 1 ? 'voorkeur' : 'voorkeuren'}` : 'Nog geen voorkeuren'];
    if (hard) parts.push(`${hard} harde ${hard === 1 ? 'beperking' : 'beperkingen'}`);
    else if (status === 'unknown') parts.push('allergieën nog onbekend');
    return parts.join(' · ');
  };

  async function add() {
    setError(null);
    const { error: e } = await ctx.supabase.from('profiles').insert({ household_id: ctx.householdId, display_name: name.trim(), age_band: band, avatar: `p${(data!.profiles.length % 4) + 1}` });
    if (e) { setError(toUiError(e).message); return; }
    setAdding(false); setName(''); await reload();
  }

  const n = data.profiles.length;
  return (
    <ScreenScroll tabs onRefresh={reload} refreshing={loading}>
      <AppHeader initials={data.household.name.slice(0, 2).toUpperCase()} />
      <Eyeline>JULLIE AAN TAFEL</Eyeline>
      <AppTitle>{'Iedereen heeft\neen eigen smaak.'}</AppTitle>
      <Subtitle>Plateful onthoudt wat werkt. Jullie beslissen samen wat er op tafel komt.</Subtitle>
      <Banner icon="♡" title={`${data.household.name} · ${n} ${n === 1 ? 'persoon' : 'personen'}`} sub={`${n} persoonlijke ${n === 1 ? 'profiel' : 'profielen'}, 1 gezamenlijke tafel`} />
      <SectionTitle>Kies een gezinslid</SectionTitle>
      {data.profiles.map((p) => (
        <PersonRow key={p.id} color={p.avatar} initial={p.display_name.slice(0, 1).toUpperCase()} name={p.display_name} role={ROLE[p.age_band] ?? ''} sub={sub(p.id, p.restrictions_status)} onPress={() => router.push(`/profiel/${p.id}`)} />
      ))}
      {adding ? (
        <>
          <Field label="Roepnaam" value={name} onChangeText={setName} maxLength={40} autoFocus />
          <ChipRow>{([['adult', 'Volwassene'], ['teen16', '16+'], ['child', '0–15']] as const).map(([k, l]) => <Chip key={k} label={l} selected={band === k} onPress={() => setBand(k)} />)}</ChipRow>
          {error ? <FormError>{error}</FormError> : null}
          <ActionRow><Button onPress={add} disabled={!name.trim()}>Toevoegen</Button><Button variant="plain" onPress={() => setAdding(false)}>Annuleren</Button></ActionRow>
        </>
      ) : <Button wide variant="plain" onPress={() => setAdding(true)}>+ Gezinslid toevoegen</Button>}
      <SafeNote>Medische beperkingen worden altijd als harde uitsluiting behandeld. Controleer bij allergieën zelf de etiketten.</SafeNote>
      <Button wide variant="plain" style={{ marginTop: 12 }} onPress={() => router.push('/instellingen')}>Instellingen & privacy</Button>
    </ScreenScroll>
  );
}
