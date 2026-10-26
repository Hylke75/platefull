import { createHash, randomBytes } from 'node:crypto';
import { requireHousehold, requireOwner } from '@/server/context';
import { handler, ok, parseJson } from '@/server/http';
import { invitationSchema } from '@/server/schemas';

/** Tweede volwassene uitnodigen (alleen eigenaar). We bewaren alleen hashes; de link wordt één keer getoond. */
export const POST = handler(async (req: Request) => {
  const ctx = await requireHousehold();
  requireOwner(ctx);
  const body = await parseJson(req, invitationSchema);
  const token = randomBytes(24).toString('base64url');
  const sha = (s: string) => createHash('sha256').update(s).digest('hex');
  const { error } = await ctx.supabase.from('invitations').insert({
    household_id: ctx.householdId, recipient_email_hash: sha(body.email.trim().toLowerCase()), token_hash: sha(token), invited_by: ctx.user.id,
    expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  });
  if (error) throw error;
  const origin = new URL(req.url).origin;
  return ok({ invite_url: `${origin}/uitnodiging?token=${token}`, expires_in_days: 7 }, { status: 201 });
});
