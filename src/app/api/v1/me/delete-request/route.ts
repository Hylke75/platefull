import { createClient } from '@supabase/supabase-js';
import { getContext } from '@/server/context';
import { handler, ok, parseJson } from '@/server/http';
import { deleteSchema } from '@/server/schemas';

/** U-12: na expliciete bevestiging zijn rechten direct ingetrokken; enige volwassene → gezinsdata verwijderd. */
export const POST = handler(async (req: Request) => {
  const ctx = await getContext();
  const body = await parseJson(req, deleteSchema);
  const { data, error } = await ctx.supabase.rpc('request_deletion', { p_scope: body.scope, p_confirm: body.confirm });
  if (error) throw error;
  // Het auth-account zelf kan alleen met de service-rol worden verwijderd (nooit in de client, §11.1).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let authDeleted = false;
  if (serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
    const del = await admin.auth.admin.deleteUser(ctx.user.id);
    authDeleted = !del.error;
  }
  await ctx.supabase.auth.signOut();
  return ok({ request: data, auth_account_deleted: authDeleted });
});
