// Gate 1/2/4: tenant-isolatie (R-10), harde regels in de database, versieconflicten (U-06), undo en idempotentie.
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AsUser, connect, createUser, freshDatabase } from './harness';

const A1 = '10000000-0000-4000-8000-0000000000a1'; // ouder A in gezin A
const A2 = '10000000-0000-4000-8000-0000000000a2'; // mede-ouder in gezin A
const B1 = '20000000-0000-4000-8000-0000000000b1'; // ouder in gezin B
const X = '30000000-0000-4000-8000-0000000000c1'; // zonder gezin

let admin: pg.Client;
let a1: AsUser, a2: AsUser, b1: AsUser, x: AsUser, anon: AsUser;
let hidA: string, hidB: string;
let profileLina: string, profileEmma: string, profileB: string;

async function errorOf(p: Promise<unknown>): Promise<{ code?: string; message: string }> {
  try { await p; } catch (e) { return e as { code?: string; message: string }; }
  throw new Error('verwachtte een fout');
}

beforeAll(async () => {
  const url = await freshDatabase('plateful_rls');
  admin = await connect(url);
  for (const [id, email] of [[A1, 'a1@example.nl'], [A2, 'a2@example.nl'], [B1, 'b1@example.nl'], [X, 'x@example.nl']] as const) await createUser(admin, id, email);
  const mk = async (id: string | null) => new AsUser(await connect(url), id);
  a1 = await mk(A1); a2 = await mk(A2); b1 = await mk(B1); x = await mk(X); anon = await mk(null);

  hidA = await a1.rpc<string>('create_household', ['Familie Vos', 4, 'v1']);
  hidB = await b1.rpc<string>('create_household', ['Familie B', 2, 'v1']);
  // A1 nodigt A2 uit (token-hash + email-hash), A2 accepteert.
  await a1.query(`insert into public.invitations (household_id, recipient_email_hash, token_hash, invited_by, expires_at)
    values ($1, encode(extensions.digest('a2@example.nl','sha256'),'hex'), encode(extensions.digest('geheim-token','sha256'),'hex'), $2, now() + interval '7 days')`, [hidA, A1]);
  await a2.rpc('accept_invitation', ['geheim-token']);

  const ins = async (u: AsUser, hid: string, name: string, band: string) =>
    (await u.query<{ id: string }>('insert into public.profiles (household_id, display_name, age_band) values ($1,$2,$3) returning id', [hid, name, band])).rows[0]!.id;
  profileEmma = await ins(a1, hidA, 'Emma', 'adult');
  profileLina = await ins(a1, hidA, 'Lina', 'child');
  profileB = await ins(b1, hidB, 'Bas', 'adult');
});

afterAll(async () => {
  for (const u of [a1, a2, b1, x, anon]) await (u as unknown as { client: pg.Client }).client?.end();
  await admin?.end();
});

describe('R-10 tenant-isolatie', () => {
  it('gezin B ziet niets van gezin A, ook niet met een bekend id', async () => {
    expect((await b1.query('select * from public.households where id = $1', [hidA])).rowCount).toBe(0);
    expect((await b1.query('select * from public.profiles where id = $1', [profileLina])).rowCount).toBe(0);
    expect((await b1.query('select * from public.profiles')).rows.map((r) => r.display_name)).toEqual(['Bas']);
  });

  it('gezin B kan niet schrijven in gezin A', async () => {
    const e = await errorOf(b1.query('insert into public.profiles (household_id, display_name, age_band) values ($1, $2, $3)', [hidA, 'Indringer', 'adult']));
    expect(e.message).toMatch(/row-level security/);
    const upd = await b1.query('update public.profiles set display_name = $1 where id = $2', ['Gehackt', profileLina]);
    expect(upd.rowCount).toBe(0);
    const del = await b1.query('delete from public.profiles where id = $1', [profileLina]);
    expect(del.rowCount).toBe(0);
  });

  it('mede-ouder ziet hetzelfde gezin', async () => {
    expect((await a2.query('select display_name from public.profiles order by display_name')).rows.map((r) => r.display_name)).toEqual(['Emma', 'Lina']);
  });

  it('anon en gebruikers zonder gezin zien niets', async () => {
    const e = await errorOf(anon.query('select * from public.profiles'));
    expect(e.message).toMatch(/permission denied/);
    expect((await x.query('select * from public.profiles')).rowCount).toBe(0);
    expect((await x.query('select * from public.households')).rowCount).toBe(0);
  });

  it('een gebruiker kan zichzelf niet aan een ander gezin toevoegen', async () => {
    const e = await errorOf(x.query(`insert into public.household_accounts (household_id, auth_user_id, role) values ($1, $2, 'owner')`, [hidA, X]));
    expect(e.message).toMatch(/permission denied/);
  });

  it('een uitnodiging werkt alleen voor het juiste e-mailadres', async () => {
    await a1.query(`insert into public.invitations (household_id, recipient_email_hash, token_hash, invited_by, expires_at)
      values ($1, encode(extensions.digest('iemand@example.nl','sha256'),'hex'), encode(extensions.digest('token-2','sha256'),'hex'), $2, now() + interval '7 days')`, [hidA, A1]);
    const e = await errorOf(x.rpc('accept_invitation', ['token-2']));
    expect(e.code).toBe('PT403');
  });

  it('cross-tenant attendee via functie wordt geweigerd', async () => {
    const plan = await a1.rpc<string>('ensure_week_plan', ['2026-10-19']);
    const slot = (await a1.query<{ id: string; revision: number }>('select id, revision from public.meal_slots where plan_id = $1 and local_date = $2', [plan, '2026-10-21'])).rows[0]!;
    const e = await errorOf(a1.rpc('commit_slot_change', [slot.id, slot.revision, null, 'attendance', 'draft', null, null, null, JSON.stringify([{ profile_id: profileB, attendance: 'yes' }]), null, null, null]));
    expect(e.message).toMatch(/forbidden|violates foreign key/);
  });

  it('gezin B kan geen slot van gezin A muteren', async () => {
    const slot = (await a1.query<{ id: string; revision: number }>('select id, revision from public.meal_slots limit 1')).rows[0]!;
    const e = await errorOf(b1.rpc('commit_slot_change', [slot.id, slot.revision, null, 'propose', 'proposed', 'kleurrijke-rijstbowl', [], 4, null, null, null, null]));
    expect(e.code).toBe('PT403');
  });
});

describe('F-005 harde regels alleen via geautoriseerde functie met toestemming', () => {
  it('directe insert van een harde regel wordt door RLS geweigerd', async () => {
    const e = await errorOf(a1.query(`insert into public.profile_rules (household_id, profile_id, target_type, target_id, severity, source) values ($1,$2,'allergen','nuts','HARD_ALLERGY','adult')`, [hidA, profileLina]));
    expect(e.message).toMatch(/row-level security/);
  });

  it('zonder gezondheidstoestemming kan geen harde regel worden vastgelegd', async () => {
    const e = await errorOf(a1.rpc('add_hard_rule', [profileLina, 'allergen', 'nuts', 'HARD_ALLERGY']));
    expect(e.code).toBe('PT403');
  });

  it('zachte voorkeur mag direct (ook vanaf gedeeld toestel)', async () => {
    await a1.query(`insert into public.profile_rules (household_id, profile_id, target_type, target_id, severity, source) values ($1,$2,'ingredient','champignons','STRONG_DISLIKE','child_shared_device')`, [hidA, profileLina]);
  });

  it('met toestemming: harde regel vastleggen, en daarna niet via update te verzwakken', async () => {
    await a1.rpc('grant_health_consent', ['health-v1']);
    const res = await a1.rpc<{ rule_id: string }>('add_hard_rule', [profileLina, 'allergen', 'nuts', 'HARD_ALLERGY']);
    const upd = await a1.query(`update public.profile_rules set severity = 'SOFT_DISLIKE' where id = $1`, [res.rule_id]);
    expect(upd.rowCount).toBe(0);
    const del = await a1.query('delete from public.profile_rules where id = $1', [res.rule_id]);
    expect(del.rowCount).toBe(0);
    // Ook een zachte regel kan niet naar hard worden 'gepromoveerd' via update.
    const soft = (await a1.query<{ id: string }>(`select id from public.profile_rules where target_id = 'champignons'`)).rows[0]!;
    const e = await errorOf(a1.query(`update public.profile_rules set severity = 'HARD_ALLERGY' where id = $1`, [soft.id]));
    expect(e.message).toMatch(/row-level security/);
    // Audit bevat het type, niet de gevoelige waarde.
    const audit = (await a1.query(`select metadata_redacted from public.audit_events where event_type = 'hard_rule_added'`)).rows[0]!;
    expect(JSON.stringify(audit.metadata_redacted)).not.toMatch(/nuts/);
  });

  it('U-03: database weigert accepteren van een recept dat onveilig is voor Lina', async () => {
    const slot = (await a1.query<{ id: string; revision: number }>(`select id, revision from public.meal_slots where local_date = '2026-10-22'`)).rows[0]!;
    // Pesto bevat noten.
    const e = await errorOf(a1.rpc('commit_slot_change', [slot.id, slot.revision, null, 'propose', 'proposed', 'pasta-pesto-kip', [], 4, null, null, null, null]));
    expect(e.code).toBe('PT422');
    // Wraps: onvolledige allergeneninformatie → ook geweigerd.
    const e2 = await errorOf(a1.rpc('commit_slot_change', [slot.id, slot.revision, null, 'propose', 'proposed', 'wraps-voor-iedereen', [], 4, null, null, null, null]));
    expect(e2.code).toBe('PT422');
    // Rijstbowl: alles gecontroleerd → toegestaan.
    const ok = await a1.rpc<{ revision: number }>('commit_slot_change', [slot.id, slot.revision, null, 'propose', 'proposed', 'kleurrijke-rijstbowl', [], 4, null, null, null, null]);
    expect(ok.revision).toBe(slot.revision + 1);
  });

  it('etiketcontrole door het gezin maakt wraps mogelijk, maar alleen voor dat gezin', async () => {
    await a1.query(`insert into public.household_ingredient_checks (household_id, ingredient_id, contains_allergens, diet, checked_by) values ($1, 'wraps', '{gluten}', '{"meat":false,"pork":false,"fish":false,"animal":false}', $2)`, [hidA, A1]);
    await a1.query(`insert into public.household_ingredient_checks (household_id, ingredient_id, contains_allergens, diet, checked_by) values ($1, 'yoghurtsaus', '{milk}', '{"meat":false,"pork":false,"fish":false,"animal":true}', $2)`, [hidA, A1]);
    const n = await admin.query(`select private.hard_violations($1, 'wraps-voor-iedereen', '{}', array[$2]::uuid[]) as n`, [hidA, profileLina]);
    expect(n.rows[0]!.n).toBe(0);
    expect((await b1.query('select * from public.household_ingredient_checks')).rowCount).toBe(0);
  });

  it('U-07: nieuwe allergie na acceptatie blokkeert het geaccepteerde slot', async () => {
    const slot = (await a1.query<{ id: string; revision: number }>(`select id, revision from public.meal_slots where local_date = '2026-10-23'`)).rows[0]!;
    // Freeze 'today' is niet nodig: datum ligt in de toekomst t.o.v. de testdatum? Zorg dat het slot in de toekomst ligt.
    await admin.query(`update public.meal_slots set local_date = (now() at time zone 'Europe/Amsterdam')::date + 1 where id = $1`, [slot.id]);
    await a1.rpc('commit_slot_change', [slot.id, slot.revision, 'idem-accept-1', 'propose', 'proposed', 'kleurrijke-rijstbowl', [], 4, null, null, null, null]);
    await a1.rpc('commit_slot_change', [slot.id, slot.revision + 1, 'idem-accept-2', 'accept', 'accepted', null, null, null, null, null, null, null]);
    const res = await a1.rpc<{ blocked_slots: number }>('add_hard_rule', [profileLina, 'allergen', 'sesame', 'HARD_ALLERGY']);
    expect(res.blocked_slots).toBeGreaterThanOrEqual(1);
    const after = (await a1.query(`select state, blocked_reason from public.meal_slots where id = $1`, [slot.id])).rows[0]!;
    expect(after).toEqual({ state: 'blocked', blocked_reason: 'hard_rule' });
  });

  it('intrekken van toestemming verwijdert harde regels en blokkeert veiligheidsclaims', async () => {
    await a1.rpc('withdraw_health_consent', []);
    expect((await a1.query(`select * from public.profile_rules where severity like 'HARD%'`)).rowCount).toBe(0);
    expect((await a1.query('select safety_claims_blocked from public.households')).rows[0]!.safety_claims_blocked).toBe(true);
    expect((await a1.query(`select restrictions_status from public.profiles where id = $1`, [profileLina])).rows[0]!.restrictions_status).toBe('unknown');
  });
});

describe('U-06 / §8.4 versieconflict, idempotentie en undo', () => {
  let slotId: string;
  let rev: number;

  beforeAll(async () => {
    const plan = await a1.rpc<string>('ensure_week_plan', ['2026-10-26']);
    const s = (await a1.query<{ id: string; revision: number }>(`select id, revision from public.meal_slots where plan_id = $1 and local_date = '2026-10-27'`, [plan])).rows[0]!;
    slotId = s.id;
    const r = await a1.rpc<{ revision: number }>('commit_slot_change', [slotId, s.revision, null, 'propose', 'proposed', 'wraps-voor-iedereen', [], 4, null, null, null, null]);
    rev = r.revision;
  });

  it('ensure_week_plan is idempotent', async () => {
    const p1 = await a1.rpc<string>('ensure_week_plan', ['2026-10-26']);
    const p2 = await a2.rpc<string>('ensure_week_plan', ['2026-10-26']);
    expect(p1).toBe(p2);
    expect((await a1.query(`select count(*)::int as n from public.meal_slots where plan_id = $1`, [p1])).rows[0]!.n).toBe(7);
  });

  it('ouder B met oude revisie krijgt een expliciet conflict, geen stille overschrijving', async () => {
    const shopping = JSON.stringify([{ origin: 'auto', item_key: 'wraps|stuk', ingredient_id: 'wraps', description: 'Volkoren wraps', qty: 8, unit: 'stuk', category: 'brood_granen' }]);
    const r = await a1.rpc<{ revision: number }>('commit_slot_change', [slotId, rev, 'accept-A', 'accept', 'accepted', null, null, null, null, null, shopping, null]);
    expect(r.revision).toBe(rev + 1);
    const e = await errorOf(a2.rpc('commit_slot_change', [slotId, rev, 'accept-B', 'accept', 'accepted', null, null, null, null, null, null, null]));
    expect(e.code).toBe('PT409');
    rev = r.revision;
  });

  it('dezelfde Idempotency-Key levert hetzelfde antwoord zonder dubbele mutatie', async () => {
    const again = await a1.rpc<{ revision: number }>('commit_slot_change', [slotId, rev - 1, 'accept-A', 'accept', 'accepted', null, null, null, null, null, null, null]);
    expect(again.revision).toBe(rev);
    const items = await a1.query(`select * from public.shopping_items where item_key = 'wraps|stuk'`);
    expect(items.rowCount).toBe(1);
  });

  it('U-04: Plan B toepassen en ongedaan maken herstelt slot, eters en boodschappen', async () => {
    const attendees = JSON.stringify([{ profile_id: profileEmma, attendance: 'yes' }, { profile_id: profileLina, attendance: 'no' }]);
    const shopping = JSON.stringify([{ origin: 'auto', item_key: 'wraps|stuk', ingredient_id: 'wraps', description: 'Volkoren wraps', qty: 4, unit: 'stuk', category: 'brood_granen' }]);
    const applied = await a1.rpc<{ revision: number }>('commit_slot_change', [slotId, rev, 'planb-key-1', 'plan_b_apply', 'accepted', null, null, 2, attendees, 'Eén eter minder', shopping, null]);
    expect((await a1.query(`select qty::int from public.shopping_items where item_key = 'wraps|stuk'`)).rows[0]!.qty).toBe(4);
    const undone = await a1.rpc<{ revision: number; state: string }>('undo_slot_change', [slotId, applied.revision, 'undo-key-1']);
    expect(undone.state).toBe('accepted');
    expect((await a1.query(`select qty::int from public.shopping_items where item_key = 'wraps|stuk'`)).rows[0]!.qty).toBe(8);
    expect((await a1.query(`select servings from public.meal_slots where id = $1`, [slotId])).rows[0]!.servings).toBe(4);
    expect((await a1.query(`select count(*)::int as n from public.meal_attendees where slot_id = $1 and attendance = 'no'`, [slotId])).rows[0]!.n).toBe(0);
    // Maar één keer.
    const e = await errorOf(a1.rpc('undo_slot_change', [slotId, undone.revision, 'undo-key-2']));
    expect(e.code).toBe('PT409');
    rev = undone.revision;
  });

  it('undo verloopt na 10 minuten', async () => {
    const r = await a1.rpc<{ revision: number }>('commit_slot_change', [slotId, rev, 'attendance-key-1', 'attendance', 'accepted', null, null, 3, null, null, null, null]);
    await admin.query(`update public.slot_revisions set created_at = now() - interval '11 minutes' where slot_id = $1 and revision = $2`, [slotId, rev]);
    const e = await errorOf(a1.rpc('undo_slot_change', [slotId, r.revision, 'undo-key-3']));
    expect(e.message).toMatch(/undo_expired/);
    rev = r.revision;
  });

  it('ongeldige statusovergang wordt geweigerd', async () => {
    const e = await errorOf(a1.rpc('commit_slot_change', [slotId, rev, null, 'complete', 'completed', null, null, null, null, null, null, null]));
    expect(e.code).toBe('PT422');
  });

  it('automatische boodschappenregels kunnen niet direct worden aangemaakt of verwijderd; afvinken wel', async () => {
    const list = (await a1.query<{ id: string }>('select id from public.shopping_lists limit 1')).rows[0]!;
    const e = await errorOf(a1.query(`insert into public.shopping_items (household_id, list_id, item_key, description, origin) values ($1, $2, 'x|g', 'X', 'auto')`, [hidA, list.id]));
    expect(e.message).toMatch(/row-level security/);
    await a1.query(`insert into public.shopping_items (household_id, list_id, description, origin) values ($1, $2, 'Koffie', 'manual')`, [hidA, list.id]);
    const del = await a1.query(`delete from public.shopping_items where origin = 'auto'`);
    expect(del.rowCount).toBe(0);
    const item = (await a1.query<{ id: string; version: number }>(`select id, version from public.shopping_items where item_key = 'wraps|stuk'`)).rows[0]!;
    const ok = await a2.query(`update public.shopping_items set state = 'checked', version = version + 1 where id = $1 and version = $2`, [item.id, item.version]);
    expect(ok.rowCount).toBe(1);
    const stale = await a1.query(`update public.shopping_items set state = 'open', version = version + 1 where id = $1 and version = $2`, [item.id, item.version]);
    expect(stale.rowCount).toBe(0);
    const e2 = await errorOf(a1.query(`update public.shopping_items set qty = 99 where id = $1`, [item.id]));
    expect(e2.message).toMatch(/permission denied/);
  });
});

describe('U-12 verwijderen', () => {
  it('na verwijderverzoek zijn rechten direct ingetrokken; enige ouder → gezinsdata weg', async () => {
    const e = await errorOf(b1.rpc('request_deletion', ['account', 'nee']));
    expect(e.code).toBe('PT400');
    await b1.rpc('request_deletion', ['account', 'VERWIJDEREN']);
    expect((await b1.query('select * from public.profiles')).rowCount).toBe(0);
    expect((await admin.query('select * from public.households where id = $1', [hidB])).rowCount).toBe(0);
  });
});
