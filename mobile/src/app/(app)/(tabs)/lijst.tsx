// S-09 Boodschappen: per categorie, afvinken met versiecontrole, realtime tussen volwassenen, handmatig toevoegen.
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addManualItem, setShoppingItemState } from '@shared/core/actions';
import { todayFor } from '@shared/core/planning';
import { loadHousehold } from '@shared/core/repo';
import { weekStart } from '@shared/domain/dates';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@shared/domain/shopping';
import { formatQuantity, type BaseUnit } from '@shared/domain/units';
import { ScreenScroll } from '@/components/ScreenScroll';
import { ActionRow, AppHeader, AppTitle, Button, Eyeline, Field, FormError, SafeNote, ShoppingItem, Subtitle, Tip, s } from '@/components/ui';
import { toUiError } from '@/lib/errors';
import { useCore } from '@/lib/session';
import { useLoad, useLocalCopy } from '@/lib/use-load';
import { colors, fonts } from '@/theme';

interface Item {
  id: string; description: string; qty: number | null; unit: string | null; category: keyof typeof CATEGORY_LABELS;
  origin: 'auto' | 'manual'; state: 'open' | 'checked' | 'removed'; not_needed: boolean; check_status: 'confirmed' | 'check' | 'unknown'; version: number;
}
const amount = (i: Item) => (i.qty != null && i.unit ? formatQuantity(Number(i.qty), i.unit as BaseUnit) : i.qty != null ? String(i.qty) : '');

export default function Lijst() {
  const ctx = useCore();
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const { data, reload, loading } = useLoad(useCallback(async () => {
    const household = await loadHousehold(ctx.supabase, ctx.householdId);
    const plan = await ctx.supabase.rpc('ensure_week_plan', { p_week_start: weekStart(todayFor(household)) });
    if (plan.error) throw plan.error;
    const list = await ctx.supabase.from('shopping_lists').select('id').eq('plan_id', plan.data as string).single();
    if (list.error) throw list.error;
    const rows = await ctx.supabase.from('shopping_items').select('*').eq('list_id', list.data.id).order('description');
    if (rows.error) throw rows.error;
    return { household, listId: list.data.id as string, items: rows.data as Item[] };
  }, [ctx]));

  const [items, setItems] = useLocalCopy(data, (d) => d.items, [] as Item[]);

  // Realtime: afvinken door de andere volwassene direct zichtbaar (RLS geldt ook hier).
  useEffect(() => {
    if (!data) return;
    const ch = ctx.supabase.channel(`list-${data.listId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${data.listId}` }, (payload) => {
      setItems((cur) => {
        if (payload.eventType === 'DELETE') return cur.filter((i) => i.id !== (payload.old as Item).id);
        const row = payload.new as Item;
        return cur.some((i) => i.id === row.id) ? cur.map((i) => (i.id === row.id && row.version >= i.version ? row : i)) : [...cur, row];
      });
    }).subscribe();
    return () => { void ctx.supabase.removeChannel(ch); };
  }, [ctx, data, setItems]);

  const visible = items.filter((i) => i.state !== 'removed' && !i.not_needed);
  const notNeeded = items.filter((i) => i.not_needed && i.state !== 'removed');
  const groups = useMemo(() => CATEGORY_ORDER.map((c) => [c, visible.filter((i) => i.category === c)] as const).filter(([, l]) => l.length), [visible]);
  const checked = visible.filter((i) => i.state === 'checked').length;

  async function toggle(item: Item) {
    setError(null);
    const next = item.state === 'checked' ? 'open' : 'checked';
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, state: next, version: i.version + 1 } : i)));
    try {
      const row = (await setShoppingItemState(ctx, item.id, next, item.version)) as Item;
      setItems((cur) => cur.map((i) => (i.id === item.id ? row : i)));
    } catch (e) {
      const u = toUiError(e);
      setItems((cur) => cur.map((i) => (i.id === item.id ? (u.details?.current as Item | undefined) ?? item : i)));
      setError(u.code === 'revision_conflict' ? 'Iemand anders heeft dit item net aangepast.' : u.message);
    }
  }

  async function add(description: string) {
    if (!description.trim() || !data) return;
    try {
      const row = (await addManualItem(ctx, data.listId, description.trim())) as Item;
      setItems((cur) => (cur.some((i) => i.id === row.id) ? cur : [...cur, row]));
      setNewItem('');
    } catch (e) { setError(toUiError(e).message); }
  }

  async function restore(item: Item) {
    await add(`${item.description}${amount(item) ? ` (${amount(item)})` : ''}`);
    try { await setShoppingItemState(ctx, item.id, 'removed', item.version); } catch { /* blijft zichtbaar */ }
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, state: 'removed' } : i)));
  }

  return (
    <ScreenScroll tabs onRefresh={reload} refreshing={loading}>
      <AppHeader initials={data?.household.name.slice(0, 2).toUpperCase()} />
      <Eyeline>SAMEN GEREGELD</Eyeline>
      <AppTitle>{'Een lijstje.\nAlles in huis.'}</AppTitle>
      <Subtitle>Dit hebben jullie nog nodig voor de bevestigde maaltijden van deze week.</Subtitle>
      <View style={[s.rowBetween, { marginTop: 6, marginBottom: 15 }]}>
        <View style={{ backgroundColor: colors.progressBg, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 20 }}><Text style={{ fontSize: 10, color: colors.progressText, fontFamily: fonts.body800 }}>{checked} van {visible.length} afgevinkt</Text></View>
        <Text style={{ fontSize: 10, color: colors.progressText, fontFamily: fonts.body800 }}>Automatisch uit het menu {'✳︎'}</Text>
      </View>
      {data && visible.length === 0 ? <SafeNote>Nog niets nodig. Bevestig een maaltijd met ‘Dit eten we’ en de lijst vult zich vanzelf.</SafeNote> : null}
      {groups.map(([cat, list]) => (
        <View key={cat} style={{ marginVertical: 18 }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.body800, color: colors.forest, marginBottom: 8 }}>{CATEGORY_LABELS[cat]}</Text>
          {list.map((i) => (
            <ShoppingItem key={i.id} label={i.description} amount={amount(i)} checked={i.state === 'checked'} onToggle={() => toggle(i)}
              note={i.origin === 'auto' && i.check_status !== 'confirmed' ? (i.check_status === 'check' ? 'Voorraad even controleren' : 'Voorraad onbekend') : undefined} />
          ))}
        </View>
      ))}
      <Field label="Zelf iets toevoegen" value={newItem} onChangeText={setNewItem} maxLength={80} onSubmitEditing={() => add(newItem)} returnKeyType="done" />
      <Button wide variant="plain" onPress={() => add(newItem)} disabled={!newItem.trim()}>+ Toevoegen</Button>
      {error ? <FormError>{error}</FormError> : null}
      {notNeeded.length ? (
        <View style={{ marginVertical: 18 }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.body800, color: colors.forest, marginBottom: 8 }}>Niet meer nodig</Text>
          {notNeeded.map((i) => (
            <View key={i.id} style={s.shoppingItem}>
              <Text style={[s.shoppingText, s.done, { flex: 1 }]}>{i.description} {amount(i)}</Text>
              <Pressable onPress={() => restore(i)} style={[s.chip]}><Text style={s.chipText}>Toch kopen</Text></Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <Tip title="Goed om te weten">Alleen bevestigde voorraad telt als ‘in huis’. Geen winkelprijzen of bestellingen in deze versie.</Tip>
      <ActionRow>
        <Button variant="plain" style={{ flex: 1 }} onPress={() => router.push('/voorraad')}>Voorraad</Button>
        <Button variant="plain" style={{ flex: 1 }} onPress={() => router.push('/restjes')}>Restjes</Button>
      </ActionRow>
    </ScreenScroll>
  );
}
