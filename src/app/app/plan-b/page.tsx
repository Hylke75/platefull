import { redirect } from 'next/navigation';
import { appContext } from '@/server/page-context';
import { dayView, slotRecipeView } from '@/server/views';
import { PlanBClient } from './PlanBClient';

export const dynamic = 'force-dynamic';

export default async function PlanBPage({ searchParams }: { searchParams: Promise<{ slot?: string }> }) {
  const ctx = await appContext();
  let slotId = (await searchParams).slot;
  if (!slotId) slotId = (await dayView(ctx)).slot.id;
  const v = await slotRecipeView(ctx, slotId).catch(() => null);
  if (!v) redirect('/app/vandaag');
  return (
    <PlanBClient
      slotId={v.slot.id}
      revision={v.slot.revision}
      date={v.slot.local_date}
      recipeName={v.recipe.name}
      minutes={v.recipe.totalMinutes}
      eaters={v.attendees.filter((a) => a.attendance !== 'no' && a.profileId).map((a) => ({ id: a.profileId!, name: v.bundle.profiles.find((p) => p.id === a.profileId)?.display_name ?? '' }))}
      children_={v.bundle.profiles.filter((p) => p.age_band !== 'adult').map((p) => ({ id: p.id, name: p.display_name }))}
      ingredients={v.recipe.ingredients.map((i) => ({ id: i.ingredientId, name: v.bundle.catalog.get(i.ingredientId)?.canonicalName ?? i.ingredientId }))}
    />
  );
}
