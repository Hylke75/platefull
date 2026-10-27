// S-10 Voorraad (F-014): onbekend ≠ in huis; verificatie ouder dan 7 dagen → even controleren.
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { upsertPantry } from '@shared/core/actions';
import { loadPantry } from '@shared/core/repo';
import { pantryAvailability } from '@shared/domain/pantry';
import type { Unit } from '@shared/domain/types';
import { ScreenScroll } from '@/components/ScreenScroll';
import { ActionRow, AppTitle, Button, Chip, ChipRow, Field, FormError, SafeNote, SectionTitle, SubHeader, Subtitle, TasteChip, s } from '@/components/ui';
import { toUiError } from '@/lib/errors';
import { useCore } from '@/lib/session';
import { useLoad } from '@/lib/use-load';

const UNITS: Record<string, Unit[]> = { mass: ['g', 'kg'], volume: ['ml', 'l'], count: ['stuk', 'blik', 'pak', 'bakje'] };

export default function Voorraad() {
  const ctx = useCore();
  const [query, setQuery] = useState('');
  const [ing, setIng] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<Unit>('stuk');
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useLoad(useCallback(async () => {
    const [items, ingredients] = await Promise.all([loadPantry(ctx.supabase, ctx.householdId), ctx.supabase.from('ingredients').select('id, canonical_name, unit_kind').order('canonical_name')]);
    return { items, ingredients: (ingredients.data ?? []) as { id: string; canonical_name: string; unit_kind: string }[] };
  }, [ctx]));
  if (!data) return <ScreenScroll><SubHeader title="VOORRAAD" onBack={() => router.back()} /></ScreenScroll>;
  const name = (id: string) => data.ingredients.find((i) => i.id === id)?.canonical_name ?? id;
  const kind = data.ingredients.find((i) => i.id === ing)?.unit_kind ?? 'count';
  const units = UNITS[kind]!;
  const matches = query.trim() ? data.ingredients.filter((i) => i.canonical_name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12) : [];
  const now = new Date();

  const act = async (fn: () => Promise<unknown>) => { setError(null); try { await fn(); await reload(); } catch (e) { setError(toUiError(e).message); } };
  const save = (status: 'confirmed' | 'unknown') => act(async () => {
    if (!ing) return;
    await upsertPantry(ctx, { ingredient_id: ing, quantity: status === 'confirmed' && qty ? Number(qty.replace(',', '.')) : null, unit: status === 'confirmed' && qty ? (units.includes(unit) ? unit : units[0]!) : null, status });
    setIng(null); setQuery(''); setQty('');
  });

  return (
    <ScreenScroll>
      <SubHeader title="VOORRAAD" onBack={() => router.back()} />
      <AppTitle>{'Wat is er\nin huis?'}</AppTitle>
      <Subtitle>Niet verplicht. Alleen wat je bevestigt telt mee als ‘in huis’; onbekend blijft onbekend.</Subtitle>
      {data.items.map((i) => {
        const av = pantryAvailability(i, null, now);
        return (
          <View key={i.id} style={s.tasteRow}>
            <Text style={[s.tasteRowText, { flex: 1 }]}>{name(i.ingredientId)}{i.quantity != null ? ` · ${i.quantity} ${i.unit ?? ''}` : ''}</Text>
            <TasteChip type={av.status === 'in_stock' ? 'like' : 'care'}>{av.status === 'in_stock' ? 'In huis' : av.status === 'check' ? 'Even controleren' : 'Onbekend'}</TasteChip>
            {av.status !== 'in_stock' && i.quantity != null ? (
              <Pressable onPress={() => act(() => upsertPantry(ctx, { ingredient_id: i.ingredientId, quantity: i.quantity, unit: i.unit, status: 'confirmed' }))} style={s.chip}><Text style={s.chipText}>Klopt</Text></Pressable>
            ) : null}
            <Pressable onPress={() => act(async () => { const { error: e } = await ctx.supabase.from('pantry_items').delete().eq('id', i.id); if (e) throw e; })} hitSlop={8} accessibilityLabel={`${name(i.ingredientId)} verwijderen`}><Text style={{ fontSize: 16 }}>×</Text></Pressable>
          </View>
        );
      })}
      <SectionTitle>Toevoegen</SectionTitle>
      {ing ? (
        <>
          <Text style={[s.fieldLabel]}>{name(ing)}</Text>
          <Field label="Hoeveelheid" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
          <ChipRow>{units.map((u) => <Chip key={u} label={u} selected={(units.includes(unit) ? unit : units[0]) === u} onPress={() => setUnit(u)} />)}</ChipRow>
          <ActionRow><Button onPress={() => save('confirmed')} disabled={!qty}>In huis</Button><Button variant="plain" onPress={() => save('unknown')}>Weet ik niet zeker</Button></ActionRow>
        </>
      ) : (
        <>
          <Field label="Zoek een ingrediënt" value={query} onChangeText={setQuery} autoCapitalize="none" />
          <ChipRow>{matches.map((m) => <Chip key={m.id} label={m.canonical_name} onPress={() => setIng(m.id)} />)}</ChipRow>
        </>
      )}
      {error ? <FormError>{error}</FormError> : null}
      <SafeNote>Na 7 dagen vragen we je een voorraadregel opnieuw te bevestigen.</SafeNote>
    </ScreenScroll>
  );
}
