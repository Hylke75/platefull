// S-03 Vandaag: één voorstel, max. drie redenen, expliciete bevestiging, 'Ander idee', Plan B en ongedaan maken.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { swapSlot, setAttendance } from '@shared/core/actions';
import { acceptSlot, proposeSlot, undoSlot } from '@shared/core/planning';
import { dayView, type DayView } from '@shared/core/views';
import { ScreenScroll } from '@/components/ScreenScroll';
import {
  ActionRow, AppHeader, AppTitle, Avatar, Button, Confirmation, DayLine, Eyeline, FormError, MatchPanel, MealHero,
  PlanBStrip, SafeNote, SkeletonHero, Tip, TodayFooter, s,
} from '@/components/ui';
import { idemKey, toUiError } from '@/lib/errors';
import { recipeImage } from '@/lib/images';
import { useCore } from '@/lib/session';
import { useToast } from '@/lib/toast';
import { useLoad } from '@/lib/use-load';
import { colors } from '@/theme';

const NEXT_ATT: Record<string, 'yes' | 'no' | 'unknown'> = { yes: 'no', no: 'unknown', unknown: 'yes' };
const ATT_LABEL: Record<string, string> = { yes: 'eet mee', no: 'eet niet mee', unknown: 'nog onbekend' };

export default function Vandaag() {
  const ctx = useCore();
  const toast = useToast();
  const { datum } = useLocalSearchParams<{ datum?: string }>();
  // Een gekozen dagpil geldt zolang de route-parameter niet verandert (geen state-synchronisatie in een effect).
  const [pick, setPick] = useState<{ under?: string; date: string } | null>(null);
  const date = pick && pick.under === datum ? pick.date : datum;
  const setDate = (d: string) => setPick({ under: datum, date: d });
  const { data: view, error: loadError, loading, reload } = useLoad<DayView>(useCallback(() => dayView(ctx, date), [ctx, date]));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [softConflict, setSoftConflict] = useState<{ profile?: string; ingredient?: string }[] | null>(null);
  const suggested = useRef<string | null>(null);

  // Lege dag: bereken een voorstel en bewaar het als voorstelversie (nooit als geaccepteerd).
  useEffect(() => {
    if (!view || suggested.current === view.slot.id) return;
    if (['draft', 'dismissed', 'cancelled'].includes(view.slot.state) && view.eaters > 0) {
      suggested.current = view.slot.id;
      // Het skelet staat al zichtbaar zolang de dag leeg is; alleen het resultaat zet state.
      proposeSlot(ctx, view.slot.id, 'propose', idemKey()).then(() => reload()).catch((e) => setError(toUiError(e).message));
    }
  }, [view, ctx, reload]);

  async function run(kind: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(kind); setError(null);
    try {
      await fn();
      if (success) toast(success);
    } catch (e) {
      const u = toUiError(e);
      if (u.details?.soft_conflicts) setSoftConflict(u.details.soft_conflicts as { profile?: string; ingredient?: string }[]);
      else setError(u.message);
    } finally {
      setBusy(null);
      await reload();
    }
  }

  if (!view) {
    return <ScreenScroll tabs><AppHeader />{loading ? <SkeletonHero /> : <FormError>{loadError ?? 'Laden lukte niet.'}</FormError>}</ScreenScroll>;
  }

  const { slot, recipe, explanation } = view;
  const isToday = view.date === view.today;
  const accepted = ['accepted', 'changed', 'cooking'].includes(slot.state);
  const tag = slot.state === 'blocked' ? 'Controle nodig' : slot.plan_b_note ? 'Plan B toegepast' : accepted ? 'Op het menu' : 'Slim voorstel voor jullie';
  const note = slot.state === 'blocked' || (explanation && !explanation.safe)
    ? explanation?.blockedReasons[0] ?? 'Een nieuwe harde beperking vraagt om een ander gerecht.'
    : slot.plan_b_note || explanation?.adaptations[0] || explanation?.reasons.find((r) => !r.endsWith(' min')) || explanation?.reasons.join(' · ');
  // Initialen in gezinsvolgorde (zoals in het ontwerp), gasten achteraan.
  const order = (id: string | null) => (id ? view.profiles.findIndex((p) => p.id === id) : 99);
  const initials = view.attendees.filter((a) => a.attendance !== 'no').sort((a, b) => order(a.profile_id) - order(b.profile_id))
    .map((a) => (a.profile_id ? view.profiles.find((p) => p.id === a.profile_id)?.initial ?? '?' : (a.guest_label ?? 'G').slice(0, 1).toUpperCase()));
  const emptyDay = ['draft', 'dismissed', 'cancelled'].includes(slot.state);

  const accept = (override = false) => run('accept', () => acceptSlot(ctx, slot.id, slot.revision, idemKey(), { override_soft: override }), 'Vanavond is geregeld!');
  const swap = () => run('swap', () => swapSlot(ctx, slot.id, slot.revision, idemKey()), 'Nieuw gerecht voorgesteld');
  const undo = () => run('undo', () => undoSlot(ctx, slot.id, slot.revision, idemKey()), 'Wijziging ongedaan gemaakt');
  const toggleAttendance = (profileId: string) => run('att', () => setAttendance(ctx, slot.id, slot.revision, idemKey(), [
    ...view.profiles.map((p) => {
      const cur = view.attendees.find((x) => x.profile_id === p.id)?.attendance ?? 'unknown';
      return { profile_id: p.id, attendance: p.id === profileId ? NEXT_ATT[cur]! : cur };
    }),
    ...view.attendees.filter((a) => !a.profile_id).map((g) => ({ profile_id: null, guest_label: g.guest_label ?? 'Gast', guest_allergies_known: g.guest_allergies_known, attendance: g.attendance })),
  ]));

  return (
    <ScreenScroll tabs onRefresh={reload} refreshing={loading && !!view}>
      <AppHeader initials={view.householdName.slice(0, 2).toUpperCase()} />
      <Eyeline>{isToday ? `${view.greeting} ☀︎` : view.date}</Eyeline>
      <AppTitle>{isToday ? 'Vanavond wordt\nhet lekker.' : 'Zo eten jullie\ndie dag.'}</AppTitle>
      <DayLine
        days={view.days.map((d) => ({ key: d.date, label: d.label, number: d.number, selected: d.selected, onPress: () => setDate(d.date) }))}
        label="Deze week →"
        onLabel={() => router.navigate('/week')}
      />

      {busy === 'suggest' || (emptyDay && view.eaters > 0 && !error) ? (
        <SkeletonHero />
      ) : recipe && !emptyDay ? (
        <MealHero image={recipeImage(recipe.image)} name={recipe.name} tag={tag} minutes={recipe.totalMinutes} diners={view.eaters} />
      ) : (
        <Tip title={view.eaters === 0 ? 'Niemand eet mee' : 'Nog geen voorstel'}>
          {view.eaters === 0 ? 'Volgens de planning eet er die dag niemand thuis.' : 'We vonden geen gecontroleerd gerecht dat bij iedereen past. Vul profielen of etiketcontroles aan, of kies zelf in het weekplan.'}
        </Tip>
      )}

      {recipe && explanation && !emptyDay ? (
        <MatchPanel
          title={view.fitLabelAllowed ? 'Past bij jullie gezin' : 'Nog even controleren'}
          badge={view.fitLabelAllowed ? '✓ Goed passend' : 'Controleer'}
          check={!view.fitLabelAllowed}
          initials={initials.slice(0, 6)}
          comment={`${view.eaters} ${view.eaters === 1 ? 'smaakprofiel' : 'smaakprofielen'} meegenomen`}
          note={note}
        />
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }} accessibilityLabel="Wie eet er mee?">
        {view.profiles.map((p) => {
          const att = view.attendees.find((x) => x.profile_id === p.id)?.attendance ?? 'unknown';
          return (
            <Pressable key={p.id} disabled={!!busy} onPress={() => toggleAttendance(p.id)} accessibilityRole="button" accessibilityLabel={`${p.name} ${ATT_LABEL[att]}. Tik om te wijzigen.`}
              style={{ borderWidth: 1.5, borderStyle: att === 'unknown' ? 'dashed' : 'solid', borderColor: colors.bannerIcon, backgroundColor: colors.white, borderRadius: 20, paddingVertical: 5, paddingLeft: 5, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: att === 'no' ? 0.5 : 1 }}>
              <Avatar color={p.avatar} initial={p.initial} size={22} />
              <Text style={[s.matchTop, { fontSize: 10 }, att === 'no' && { textDecorationLine: 'line-through' }]}>{p.name}{att === 'unknown' ? ' ?' : ''}</Text>
            </Pressable>
          );
        })}
      </View>

      {recipe && explanation?.safe && explanation.reasons.length && !emptyDay ? (
        <Pressable onPress={() => router.push(`/waarom/${slot.id}`)} accessibilityRole="link" style={{ marginTop: 10 }}>
          <Text style={[s.subtitle, { marginBottom: 0 }]}>Waarom: {explanation.reasons.join(' · ')} — <Text style={{ color: colors.forest, fontWeight: '800' }}>Waarom deze?</Text></Text>
        </Pressable>
      ) : null}

      {view.warnings.map((w) => <SafeNote key={w}>{w}</SafeNote>)}
      {error ? <FormError>{error}</FormError> : null}

      {softConflict ? (
        <View style={s.parentToggle} accessibilityRole="alert">
          <View style={{ flex: 1 }}>
            <Text style={s.parentB}>{softConflict.map((c) => `${c.profile} vindt ${c.ingredient?.toLowerCase()} echt niet lekker`).join(', ')}</Text>
            <Text style={s.parentSmall}>De voorkeur blijft opgeslagen. Niemand hoeft iets te eten wat hij of zij niet wil.</Text>
          </View>
          <Button onPress={() => { setSoftConflict(null); void accept(true); }} disabled={!!busy}>Toch kiezen</Button>
        </View>
      ) : null}

      {recipe && accepted ? (
        <Confirmation title="Het is geregeld!" text={`${recipe.name} staat ${isToday ? 'voor vanavond' : 'die dag'} op het menu.`}>
          <Button wide style={{ alignSelf: 'stretch' }} onPress={() => router.push(`/koken/${slot.id}`)}>Bekijk de kookstappen →</Button>
        </Confirmation>
      ) : recipe && slot.state === 'completed' ? (
        <Confirmation title="Gekookt!" text="Fijn gegeten? Restjes vind je onder Lijst → Restjes." />
      ) : recipe && explanation?.safe && slot.state === 'proposed' ? (
        <ActionRow>
          <Button onPress={() => accept(false)} busy={busy === 'accept'} disabled={!!busy}>✓ Dit eten we</Button>
          <Button variant="plain" onPress={swap} busy={busy === 'swap'} disabled={!!busy}>↻ Ander idee</Button>
        </ActionRow>
      ) : recipe && !emptyDay ? (
        <ActionRow><Button variant="plain" wide style={{ flex: 1 }} onPress={swap} disabled={!!busy}>↻ Kies een ander gerecht</Button></ActionRow>
      ) : null}

      {view.undoAvailable ? <Button wide variant="plain" style={{ marginTop: 8 }} onPress={undo} disabled={!!busy}>↺ Maak ongedaan</Button> : null}
      {recipe && !emptyDay ? <Button wide variant="plain" style={{ marginTop: 8 }} onPress={() => router.push({ pathname: '/gerecht/[id]', params: { id: recipe.id, slot: slot.id } })}>Ingrediënten & aanpassingen</Button> : null}
      {recipe && !emptyDay && slot.state !== 'completed' ? <PlanBStrip title="↗ Loopt de dag anders?" subtitle="Regel direct een slim plan B" onPress={() => router.push({ pathname: '/plan-b', params: { slot: slot.id } })} /> : null}
      <TodayFooter />
    </ScreenScroll>
  );
}
