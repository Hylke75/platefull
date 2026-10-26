import { redirect } from 'next/navigation';
import { getContext, type RequestContext } from './context';
import { ApiError } from './http';

/** Voor Server Components onder /app: stuurt door naar login of onboarding wanneer nodig. */
export async function appContext(): Promise<RequestContext & { householdId: string; role: 'owner' | 'co_parent' }> {
  let ctx: RequestContext;
  try {
    ctx = await getContext();
  } catch (e) {
    if (e instanceof ApiError && e.code === 'not_configured') redirect('/login?config=missing');
    redirect('/login');
  }
  if (!ctx.householdId || !ctx.role) redirect('/onboarding');
  return ctx as RequestContext & { householdId: string; role: 'owner' | 'co_parent' };
}
