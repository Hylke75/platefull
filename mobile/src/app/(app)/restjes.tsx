// S-12 Restjes (F-015, R-07): koelkast max. 2 dagen, nooit automatisch 'veilig'.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { addLeftover } from '@shared/core/actions';
import { loadLeftovers } from '@shared/core/repo';
import { leftoverState } from '@shared/domain/pantry';
import { ScreenScroll } from '@/components/ScreenScroll';
import { AppTitle, Button, Chip, ChipRow, Field, FormError, SafeNote, SectionTitle, SubHeader, Subtitle, TasteChip, s } from '@/components/ui';
import { toUiError } from '@/lib/errors';
import { useCore } from '@/lib/session';
import { useLoad } from '@/lib/use-load';

const fmt = (d: string) => new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }).format(new Date(d));

export default function Restjes() {
  const ctx = useCore();
  const [label, setLabel] = useState('');
  const [portions, setPortions] = useState(2);
  const [storage, setStorage] = useState<'fridge' | 'freezer'>('fridge');
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useLoad(useCallback(() => loadLeftovers(ctx.supabase, ctx.householdId), [ctx]));
  const act = async (fn: () => Promise<unknown>) => { setError(null); try { await fn(); await reload(); } catch (e) { setError(toUiError(e).message); } };
  const patch = (id: string, status: 'used' | 'discarded' | 'unsafe') => act(async () => { const { error: e } = await ctx.supabase.from('leftovers').update({ status }).eq('id', id); if (e) throw e; });
  const active = (data ?? []).filter((l) => l.status === 'available' || l.status === 'unsafe');
  const now = new Date();
  return (
    <ScreenScroll>
      <SubHeader title="RESTJES" onBack={() => router.back()} />
      <AppTitle>{'Slim opmaken,\nveilig bewaren.'}</AppTitle>
      <Subtitle>Afgedekt in de koelkast maximaal twee dagen; langer bewaren? Invriezen.</Subtitle>
      {data && !active.length ? <SafeNote>Geen restjes bewaard.</SafeNote> : null}
      {active.map((l) => {
        const st = leftoverState(l, now);
        return (
          <View key={l.id} style={[s.familyPerson, { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={s.rowBetween}>
              <Text style={s.personName}>{l.label} · {l.portions} {l.portions === 1 ? 'portie' : 'porties'}</Text>
              <TasteChip type={st === 'usable' ? 'like' : 'strict'}>{st === 'usable' ? 'Bruikbaar' : 'Controle nodig'}</TasteChip>
            </View>
            <Text style={s.personSub}>{l.storage === 'fridge' ? 'Koelkast' : 'Vriezer'} · bewaard {fmt(l.storedAt)} · op tot {fmt(l.useBy)}</Text>
            <ChipRow style={{ marginTop: 8 }}>
              <Chip label="Opgemaakt" onPress={() => patch(l.id, 'used')} />
              <Chip label="Weggedaan" onPress={() => patch(l.id, 'discarded')} />
              {l.status !== 'unsafe' ? <Chip strict label="Niet meer goed" onPress={() => patch(l.id, 'unsafe')} /> : null}
            </ChipRow>
          </View>
        );
      })}
      <SectionTitle>Restje toevoegen</SectionTitle>
      <Field label="Wat?" value={label} onChangeText={setLabel} maxLength={80} />
      <ChipRow>{[1, 2, 3, 4].map((n) => <Chip key={n} label={String(n)} selected={portions === n} onPress={() => setPortions(n)} />)}</ChipRow>
      <ChipRow style={{ marginTop: 8 }}>
        <Chip label="Koelkast" selected={storage === 'fridge'} onPress={() => setStorage('fridge')} />
        <Chip label="Vriezer" selected={storage === 'freezer'} onPress={() => setStorage('freezer')} />
      </ChipRow>
      {error ? <FormError>{error}</FormError> : null}
      <Button wide style={{ marginTop: 10 }} disabled={!label.trim()} onPress={() => act(async () => { await addLeftover(ctx, { label: label.trim(), portions, storage }); setLabel(''); })}>Bewaren</Button>
      <SafeNote>Na de bewaartermijn markeren we restjes nooit automatisch als veilig. Twijfel? Weggooien.</SafeNote>
    </ScreenScroll>
  );
}
