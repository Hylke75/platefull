// S-06 Week: 7 dagen, eters en maaltijden; handmatig plannen binnen de gecontroleerde catalogus.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { planDay } from '@shared/core/actions';
import { loadBundle, todayFor } from '@shared/core/planning';
import { loadHousehold, loadPlanSlots, toAttendees } from '@shared/core/repo';
import { addDays, dayLong, dayNumber, dayShort, weekStart } from '@shared/domain/dates';
import { countEaters } from '@shared/domain/engine';
import { Image } from 'expo-image';
import { ScreenScroll } from '@/components/ScreenScroll';
import { ActionRow, AppHeader, AppTitle, Button, Chip, ChipRow, DayLine, Eyeline, FormError, PlanBStrip, SectionTitle, Subtitle, glyph, s } from '@/components/ui';
import { idemKey, toUiError } from '@/lib/errors';
import { recipeImage } from '@/lib/images';
import { useCore } from '@/lib/session';
import { useToast } from '@/lib/toast';
import { useLoad } from '@/lib/use-load';
import { colors, fonts } from '@/theme';

const STATE_LABEL: Record<string, string> = {
  draft: 'Nog niet gepland', proposed: 'Voorstel', accepted: 'Op het menu', changed: 'Aangepast', cooking: 'Wordt gekookt',
  completed: 'Gegeten', dismissed: 'Overgeslagen', cancelled: 'Geannuleerd', blocked: 'Controle nodig',
};

export default function Week() {
  const ctx = useCore();
  const toast = useToast();
  const [offset, setOffset] = useState(0);
  const [manual, setManual] = useState<{ slotId: string; recipeId: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, loading, reload, error: loadError } = useLoad(useCallback(async () => {
    const household = await loadHousehold(ctx.supabase, ctx.householdId);
    const today = todayFor(household);
    const start = addDays(weekStart(today), offset * 7);
    const plan = await ctx.supabase.rpc('ensure_week_plan', { p_week_start: start });
    if (plan.error) throw plan.error;
    const [{ slots, attendees }, bundle] = await Promise.all([loadPlanSlots(ctx.supabase, plan.data as string), loadBundle(ctx, start)]);
    return { household, today, start, planId: plan.data as string, slots, attendees, recipes: bundle.recipes };
  }, [ctx, offset]));

  if (!data) return <ScreenScroll tabs><AppHeader /><FormError>{loading ? 'Laden…' : loadError}</FormError></ScreenScroll>;
  const days = Array.from({ length: 7 }, (_, i) => addDays(data.start, i));

  async function save(remove: boolean) {
    if (!manual) return;
    const slot = data!.slots.find((x) => x.id === manual.slotId);
    if (!slot) return;
    setError(null);
    try {
      await planDay(ctx, data!.planId, slot.id, remove ? null : manual.recipeId, slot.revision, idemKey());
      toast(remove ? 'Dag leeggemaakt' : 'Gerecht ingepland — bevestig het op de dag zelf');
      setManual(null);
      await reload();
    } catch (e) { setError(toUiError(e).message); }
  }

  return (
    <ScreenScroll tabs onRefresh={reload} refreshing={loading}>
      <AppHeader initials={data.household.name.slice(0, 2).toUpperCase()} />
      <Eyeline>ETEN ZONDER GEDOE</Eyeline>
      <AppTitle>{'Een fijne week\nop tafel.'}</AppTitle>
      <Subtitle>De planning past zich aan als jullie dag anders loopt.</Subtitle>
      <DayLine days={days.map((d) => ({ key: d, label: dayShort(d), number: dayNumber(d), selected: d === data.today, onPress: () => router.navigate({ pathname: '/vandaag', params: { datum: d } }) }))} />
      <View style={[s.rowBetween, { marginTop: 4 }]}>
        <Pressable onPress={() => setOffset(offset - 1)} hitSlop={8}><Text style={s.sectionTitle}>‹ Vorige</Text></Pressable>
        <Text style={s.sectionTitle}>Week van {Number(data.start.slice(8))}/{Number(data.start.slice(5, 7))}</Text>
        <Pressable onPress={() => setOffset(offset + 1)} hitSlop={8}><Text style={s.sectionTitle}>Volgende ›</Text></Pressable>
      </View>
      <View style={{ gap: 10 }}>
        {data.slots.map((slot) => {
          const r = slot.recipe_id ? data.recipes.find((x) => x.id === slot.recipe_id) : null;
          const eaters = countEaters(toAttendees(data.attendees.get(slot.id) ?? []));
          const img = recipeImage(r?.image);
          return (
            <Pressable key={slot.id} onPress={() => router.navigate({ pathname: '/vandaag', params: { datum: slot.local_date } })} accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.weekBorder, backgroundColor: colors.white, borderRadius: 15, padding: 9, minHeight: 80 }}>
              <View style={{ width: 75, height: 62, borderRadius: 11, overflow: 'hidden', backgroundColor: '#DFEBDF', alignItems: 'center', justifyContent: 'center' }}>
                {img ? <Image source={img} style={{ width: 75, height: 62 }} contentFit="cover" /> : <Text style={{ fontSize: 26, color: '#89AD92' }}>{glyph('✳')}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: colors.weekDate, fontFamily: fonts.body800, textTransform: 'uppercase' }}>{slot.local_date === data.today ? `Vandaag · ${dayLong(slot.local_date)}` : dayLong(slot.local_date)}</Text>
                <Text style={{ fontSize: 13, fontFamily: fonts.body800, color: colors.forest, marginVertical: 3 }}>{r?.name ?? STATE_LABEL[slot.state]}</Text>
                <Text style={{ fontSize: 10, color: colors.weekMeta, fontFamily: fonts.body400 }}>{r ? `${r.totalMinutes} min · ` : ''}{eaters} {eaters === 1 ? 'persoon' : 'personen'} · {STATE_LABEL[slot.state]}</Text>
              </View>
              <Text style={{ color: '#B6C5B9', fontSize: 18 }}>›</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Zelf een gerecht kiezen</SectionTitle>
      <ChipRow>
        {data.slots.filter((x) => !['completed', 'cooking'].includes(x.state)).map((x) => (
          <Chip key={x.id} label={`${dayShort(x.local_date)} ${dayNumber(x.local_date)}`} selected={manual?.slotId === x.id} onPress={() => setManual({ slotId: x.id, recipeId: manual?.recipeId ?? null })} />
        ))}
      </ChipRow>
      {manual ? (
        <>
          <Text style={[s.fieldHint, { marginBottom: 8 }]}>Gerechten die niet passen bij een harde beperking worden geweigerd.</Text>
          <ChipRow>{data.recipes.map((r) => <Chip key={r.id} label={`${r.name} · ${r.totalMinutes}′`} selected={manual.recipeId === r.id} onPress={() => setManual({ ...manual, recipeId: r.id })} />)}</ChipRow>
          {error ? <FormError>{error}</FormError> : null}
          <ActionRow>
            <Button onPress={() => save(false)} disabled={!manual.recipeId}>Inplannen</Button>
            <Button variant="plain" onPress={() => save(true)}>Dag leegmaken</Button>
          </ActionRow>
        </>
      ) : null}
      <PlanBStrip title="↗ Iets gewijzigd?" subtitle="Schuif mee met jullie week" onPress={() => router.push('/plan-b')} />
    </ScreenScroll>
  );
}
