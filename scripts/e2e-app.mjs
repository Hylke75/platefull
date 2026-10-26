// E2E van de echte app tegen een lokale Supabase-stack (`supabase start`) met Mailpit voor de inlogmails.
// Dekt U-01 (nieuw gezin), U-02/U-03 (afkeer/allergie), U-04 (Plan B + undo), U-06 (twee ouders),
// U-07 (allergie na acceptatie), U-12 (verwijderen) en R-10 (tenant-isolatie via de API).
// Gebruik: npm run build && npm start, daarna: node scripts/e2e-app.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const APP = process.env.APP_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
const SHOTS = new URL('../artifacts/e2e/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const run = Date.now().toString(36);

async function otpFor(email) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`).then((r) => r.json());
    const id = res.messages?.[0]?.ID;
    if (id) {
      const msg = await fetch(`${MAILPIT}/api/v1/message/${id}`).then((r) => r.json());
      const code = (msg.Text ?? msg.HTML ?? '').match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`geen inlogcode voor ${email}`);
}

async function login(page, email) {
  await page.goto(`${APP}/login?next=/onboarding`);
  await page.getByLabel('E-mailadres').fill(email);
  await page.getByRole('button', { name: /Stuur mijn inlogcode/ }).click();
  await page.getByText('Kijk in je mail').waitFor();
  await page.getByLabel('Code').fill(await otpFor(email));
  await page.getByRole('button', { name: 'Inloggen' }).click();
  await page.waitForURL((u) => /^\/(onboarding|app)/.test(new URL(u).pathname));
}

const api = (page, path, opts = {}) => page.evaluate(async ({ path, opts }) => {
  const headers = { 'Content-Type': 'application/json', ...(opts.revision ? { 'If-Match': String(opts.revision) } : {}), ...(opts.idem ? { 'Idempotency-Key': opts.idem } : {}) };
  const r = await fetch(`/api/v1${path}`, { method: opts.method ?? (opts.body ? 'POST' : 'GET'), headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}, { path, opts });

const checks = [];
const problems = [];
async function step(name, fn) {
  try { await fn(); checks.push(['✓', name]); } catch (e) { checks.push(['✗', `${name}: ${e.message.split('\n')[0]}`]); throw e; }
}

const browser = await chromium.launch();
const ctxA = await browser.newContext({ ...devices['iPhone 13'] });
const a = await ctxA.newPage();
for (const p of [a]) {
  p.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  p.on('response', (r) => { if (r.status() >= 500) problems.push(`${r.status()} ${r.url()}`); });
}
const emailA = `ouder-a-${run}@example.nl`;
const emailB = `ouder-b-${run}@example.nl`;
const emailX = `ander-gezin-${run}@example.nl`;

try {
  await step('S-01: niet ingelogd → /login', async () => {
    await a.goto(`${APP}/app/vandaag`);
    await a.waitForURL(/\/login/);
  });

  await step('S-01: ongeldig e-mailadres geeft foutmelding', async () => {
    await a.getByLabel('E-mailadres').fill('geen-adres');
    await a.getByRole('button', { name: /Stuur mijn inlogcode/ }).click();
    await a.getByText(/geldig e-mailadres|Vul een geldig/).waitFor({ timeout: 3000 }).catch(async () => {
      // De browser valideert type=email al vóór onze eigen controle.
      assert.equal(await a.getByLabel('E-mailadres').evaluate((el) => el.validity.valid), false);
    });
  });

  await step('O-02: inloggen met eenmalige code uit de mail', async () => { await login(a, emailA); });

  await step('O-03: huishouden aanmaken (voorwaarden verplicht)', async () => {
    await a.waitForURL(/\/onboarding/);
    await a.getByPlaceholder('Ons gezin').fill('Familie Vos');
    const next = a.getByRole('button', { name: 'Verder →' });
    assert.equal(await next.isDisabled(), true);
    await a.getByText('Ik ga akkoord').click();
    await next.click();
    await a.getByText('Iedereen een').waitFor();
  });

  await step('O-04: vier profielen toevoegen', async () => {
    for (const [name, band] of [['Emma', 'Volwassene'], ['Ruben', 'Volwassene'], ['Sam', '0–15'], ['Lina', '0–15']]) {
      await a.getByLabel('Roepnaam').fill(name);
      await a.getByRole('button', { name: band, exact: true }).click();
      await a.getByRole('button', { name: '+ Toevoegen' }).click();
      await a.locator('.family-person', { hasText: name }).waitFor();
    }
    await a.getByRole('button', { name: 'Verder →' }).click();
    await a.getByText('Allergieën en').waitFor();
  });

  await step('O-05: notenallergie Lina pas na expliciete toestemming; Ruben strikt vegetarisch', async () => {
    const lina = a.locator('.family-person', { hasText: 'Lina' });
    await lina.getByRole('button', { name: 'Noten', exact: true }).click();
    await lina.getByRole('button', { name: 'Vastleggen' }).click();
    await a.getByText('Geef eerst toestemming').waitFor();
    await a.getByText('Ik geef als volwassene toestemming').click();
    await lina.getByRole('button', { name: 'Vastleggen' }).click();
    await lina.getByText('· Noten').waitFor();
    const ruben = a.locator('.family-person', { hasText: 'Ruben' });
    await ruben.getByRole('button', { name: 'Vegetarisch', exact: true }).click();
    await ruben.getByRole('button', { name: 'Vastleggen' }).click();
    await ruben.getByText('· Vegetarisch').waitFor();
    for (const n of ['Emma', 'Sam']) {
      const row = a.locator('.family-person', { hasText: n });
      await row.getByRole('button', { name: 'Geen bekende' }).click();
      await row.getByText('geen bekende beperkingen').waitFor();
    }
    await a.getByRole('button', { name: 'Verder →' }).click();
  });

  await step('O-06: smaken (Lina: champignons echt niet lekker, broccoli liever niet)', async () => {
    for (const who of ['Emma', 'Ruben', 'Sam', 'Lina']) {
      await a.locator('.app-title', { hasText: who }).waitFor();
      if (who === 'Lina') {
        await a.locator('.taste-row', { hasText: 'Champignons' }).getByRole('button', { name: 'Echt niet lekker' }).click();
        await a.locator('.taste-row', { hasText: 'Broccoli' }).getByRole('button', { name: 'Liever niet' }).click();
      }
      if (who === 'Sam') await a.locator('.taste-row', { hasText: 'Rauwe tomaat' }).getByRole('button', { name: 'Liever niet' }).click();
      if (who === 'Emma') await a.locator('.taste-row', { hasText: 'Pasta' }).getByRole('button', { name: 'Heerlijk' }).click();
      await a.getByRole('button', { name: /Volgende persoon|Verder/ }).click();
    }
    await a.getByText('Hoeveel tijd').waitFor();
  });

  await step('O-07/O-08: context en eerste voorstel', async () => {
    await a.getByRole('button', { name: /eerste voorstel/ }).click();
    await a.waitForURL(/\/app\/vandaag/);
    await a.locator('.dinner-hero h3').waitFor({ timeout: 20000 });
    await a.screenshot({ path: `${SHOTS}01-vandaag.png`, fullPage: false });
  });

  let slot;
  await step('S-03: voorstel is veilig voor Lina en Ruben (alleen gecontroleerde ingrediënten)', async () => {
    const week = (await api(a, '/week-plans')).json;
    const plan = (await api(a, `/week-plans/${week.plan_id}`)).json;
    const today = await a.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date()));
    slot = plan.slots.find((s) => s.local_date === today);
    assert.equal(slot.state, 'proposed');
    assert.equal(slot.recipe_id, 'kleurrijke-rijstbowl', 'alleen de rijstbowl is volledig gecontroleerd voor deze tafel');
    assert.equal(slot.attendees.length, 4);
    // Alle profielen zijn bekend → label mag.
    assert.equal(await a.locator('.match-top span').first().innerText(), 'Past bij jullie gezin');
    assert.match(await a.locator('.app-view').innerText(), /broccoli apart voor Lina|Broccoli apart voor Lina/i);
  });

  await step('U-03: pesto (noten) kan ook via de API niet worden ingepland', async () => {
    const r = await api(a, `/week-plans/${slot.plan_id}`, { method: 'PATCH', body: { slot_id: slot.id, recipe_id: 'pasta-pesto-kip', revision: slot.revision } });
    assert.equal(r.status, 422);
    assert.match(r.json.error.message, /Bevat groene pesto — niet geschikt voor Lina/, JSON.stringify(r.json));
  });

  await step('S-03: Ander idee zonder veilig alternatief laat het voorstel staan', async () => {
    await a.getByRole('button', { name: '↻ Ander idee' }).click();
    await a.waitForTimeout(1500);
    assert.match(await a.locator('.dinner-hero h3').innerText(), /rijstbowl/i);
  });

  await step('Etiketcontrole wraps + yoghurtsaus → wraps worden een geldig alternatief', async () => {
    for (const [ingredient, allergens, animal] of [['wraps', ['gluten'], false], ['yoghurtsaus', ['milk'], true]]) {
      const r = await api(a, '/ingredient-checks', { body: { ingredient_id: ingredient, contains_allergens: allergens, diet: { meat: false, pork: false, fish: false, animal }, label_checked: true } });
      assert.equal(r.status, 201, JSON.stringify(r.json));
    }
    const s = (await api(a, '/meal-suggestions', { body: { slot_id: slot.id } })).json;
    assert.ok([s.suggestion?.recipeId, ...s.alternatives.map((x) => x.recipeId)].includes('wraps-voor-iedereen'), JSON.stringify(s));
  });

  await step('S-03: Dit eten we → bevestiging, boodschappenlijst gevuld', async () => {
    await a.reload();
    await a.getByRole('button', { name: '✓ Dit eten we' }).click();
    await a.getByText('Het is geregeld!').waitFor();
    await a.screenshot({ path: `${SHOTS}02-geaccepteerd.png` });
    await a.goto(`${APP}/app/boodschappen`);
    await a.locator('.shopping-item').first().waitFor();
    const text = await a.locator('.app-view').innerText();
    assert.match(text, /Zoete aardappel|Volkoren wraps/);
    await a.screenshot({ path: `${SHOTS}03-boodschappen.png`, fullPage: true });
  });

  let qtyBefore;
  await step('U-04: Plan B "iemand eet niet mee" → preview (geen side-effects) → toepassen → undo', async () => {
    const before = (await api(a, `/week-plans/${slot.plan_id}`)).json.slots.find((s) => s.id === slot.id);
    const list = (await api(a, '/week-plans')).json;
    const items1 = await a.evaluate(async () => (await (await fetch('/app/boodschappen')).text()).length);
    qtyBefore = items1;
    await a.goto(`${APP}/app/plan-b?slot=${slot.id}`);
    await a.getByRole('button', { name: /Iemand eet niet mee/ }).click();
    await a.getByRole('button', { name: 'Ruben', exact: true }).click();
    await a.getByRole('button', { name: /Voorstel bekijken/ }).click();
    await a.getByText('Dezelfde maaltijd, minder porties').waitFor();
    assert.match(await a.locator('.diff-list').innerText(), /4 → 3/);
    const mid = (await api(a, `/week-plans/${slot.plan_id}`)).json.slots.find((s) => s.id === slot.id);
    assert.equal(mid.revision, before.revision, 'preview mag niets wijzigen');
    await a.screenshot({ path: `${SHOTS}04-planb-preview.png`, fullPage: true });
    await a.getByRole('button', { name: '✓ Pas het menu aan' }).click();
    await a.waitForURL(/\/app\/vandaag/);
    await a.getByText('◉ 3 personen').waitFor();
    const after = (await api(a, `/week-plans/${slot.plan_id}`)).json.slots.find((s) => s.id === slot.id);
    assert.equal(after.servings, 3);
    await a.getByRole('button', { name: '↺ Maak ongedaan' }).click();
    await a.getByText('◉ 4 personen').waitFor();
    void list;
  });

  await step('U-06: tweede ouder via uitnodiging; gelijktijdige wijziging op oude revisie → 409', async () => {
    const inv = await api(a, '/invitations', { body: { email: emailB } });
    assert.equal(inv.status, 201);
    const ctxB = await browser.newContext({ ...devices['iPhone 13'] });
    const b = await ctxB.newPage();
    await login(b, emailB);
    await b.goto(inv.json.invite_url);
    await b.getByRole('button', { name: 'Doe mee met dit gezin' }).click({ timeout: 10000 }).catch(async (e) => { await b.screenshot({ path: `${SHOTS}debug-invite.png` }); console.log('URL', b.url(), (await b.locator('body').innerText()).slice(0, 400)); throw e; });
    await b.waitForURL(/\/app\/vandaag/);
    const cur = (await api(a, `/week-plans/${slot.plan_id}`)).json.slots.find((s) => s.id === slot.id);
    const rA = await api(a, `/meal-slots/${slot.id}/attendance`, { body: { attendees: cur.attendees.map((x) => ({ profile_id: x.profile_id, attendance: 'yes' })) }, revision: cur.revision, idem: `e2e-att-a-${run}` });
    assert.equal(rA.status, 200, JSON.stringify(rA.json));
    const rB = await api(b, `/meal-slots/${slot.id}/attendance`, { body: { attendees: cur.attendees.map((x) => ({ profile_id: x.profile_id, attendance: 'no' })) }, revision: cur.revision, idem: `e2e-att-b-${run}` });
    assert.equal(rB.status, 409);
    // Realtime/gedeelde lijst: B ziet dezelfde boodschappen.
    await b.goto(`${APP}/app/boodschappen`);
    await b.locator('.shopping-item').first().waitFor();
    await ctxB.close();
  });

  await step('R-10: ander gezin ziet niets van dit gezin, ook niet met bekende ids', async () => {
    const ctxX = await browser.newContext();
    const x = await ctxX.newPage();
    await login(x, emailX);
    await x.goto(`${APP}/onboarding`);
    await x.getByText('Ik ga akkoord').click();
    await x.getByRole('button', { name: 'Verder →' }).click();
    await x.getByText('Iedereen een').waitFor();
    for (const path of [`/week-plans/${slot.plan_id}`, `/profiles/${slot.attendees[0].profile_id}`, `/profiles/${slot.attendees[0].profile_id}/preferences`]) {
      const r = await api(x, path);
      assert.ok([403, 404].includes(r.status), `${path} → ${r.status}`);
    }
    const r = await api(x, `/meal-slots/${slot.id}/accept`, { body: {}, revision: 1, idem: `e2e-x-${run}` });
    assert.ok([403, 404].includes(r.status), `accept → ${r.status}`);
    await ctxX.close();
  });

  await step('U-07: nieuwe sesamallergie na acceptatie blokkeert het slot', async () => {
    const lina = slot.attendees.find(Boolean);
    const profiles = (await api(a, `/households/${(await api(a, '/households')).json.household.id}/profiles`)).json.profiles;
    const linaId = profiles.find((p) => p.display_name === 'Lina').id;
    void lina;
    const cur = (await api(a, `/week-plans/${slot.plan_id}`)).json.slots.find((s) => s.id === slot.id);
    const recipe = cur.recipe_id;
    // Rijstbowl heeft optioneel sesam; wraps niet. Kies een allergeen dat in het huidige gerecht zit.
    const allergen = recipe === 'kleurrijke-rijstbowl' ? 'sesame' : 'milk';
    const r = await api(a, `/profiles/${linaId}/hard-rules`, { body: { target_type: 'allergen', target_id: allergen, severity: 'HARD_ALLERGY' } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.ok(r.json.blocked_slots >= 1);
    await a.goto(`${APP}/app/vandaag`);
    await a.getByText('Controle nodig').first().waitFor();
    await a.screenshot({ path: `${SHOTS}05-geblokkeerd.png` });
  });

  await step('S-11 kookstand en afronden met restjes', async () => {
    await a.getByRole('button', { name: /Kies een ander gerecht/ }).click();
    await a.waitForTimeout(1500);
    await a.reload();
    const btn = a.getByRole('button', { name: '✓ Dit eten we' });
    if (await btn.count()) {
      await btn.click();
      await a.getByText('Het is geregeld!').waitFor();
      await a.getByRole('link', { name: /kookstappen/ }).click();
      await a.locator('.recipe-step').first().waitFor();
      await a.getByRole('button', { name: '✓ Gekookt' }).click();
      await a.getByRole('button', { name: '2 porties' }).click();
      await a.getByRole('button', { name: 'Afronden' }).click();
      await a.waitForURL(/\/app\/vandaag/);
      await a.locator('.confirmation h3', { hasText: 'Gekookt!' }).waitFor();
      await a.goto(`${APP}/app/restjes`);
      await a.getByText('Bruikbaar').waitFor();
    } else {
      throw new Error('geen veilig alternatief na nieuwe allergie');
    }
  });

  await step('S-13: export bevat gezinsdata zonder andere gezinnen', async () => {
    const r = await api(a, '/me/export');
    assert.equal(r.status, 200);
    assert.equal(r.json.profiles.length, 4);
    assert.ok(r.json.households.every((h) => h.name === 'Familie Vos'));
  });

  await step('Alle appschermen renderen zonder serverfout', async () => {
    for (const path of ['/app/vandaag', '/app/week', '/app/gezin', '/app/boodschappen', '/app/voorraad', '/app/restjes', '/app/instellingen', `/app/waarom/${slot.id}`, `/app/gerecht/wraps-voor-iedereen`]) {
      const res = await a.goto(`${APP}${path}`);
      assert.equal(res.status(), 200, path);
      await a.locator('.app-view').first().waitFor();
    }
    const fam = await a.goto(`${APP}/app/gezin`);
    assert.equal(fam.status(), 200);
    await a.locator('.family-person').nth(3).click();
    await a.getByText('Harde beperkingen — nooit overrulen').waitFor();
    await a.screenshot({ path: `${SHOTS}06-smaakprofiel.png`, fullPage: true });
    const overflow = await a.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.equal(overflow, 0);
  });

  await step('U-12: verwijderen na bevestiging trekt rechten direct in', async () => {
    await a.goto(`${APP}/app/instellingen`);
    await a.getByRole('button', { name: 'Hele gezin' }).click();
    await a.getByLabel('Typ VERWIJDEREN ter bevestiging').fill('VERWIJDEREN');
    await a.getByRole('button', { name: 'Definitief verwijderen' }).click();
    await a.waitForURL(`${APP}/`);
    const r = await api(a, `/week-plans/${slot.plan_id}`);
    assert.ok([401, 403, 404].includes(r.status));
  });
} catch {
  // detail staat in checks
} finally {
  await browser.close();
  for (const [s, n] of checks) console.log(s, n);
  if (problems.length) console.log('Problemen:', [...new Set(problems)]);
  process.exit(checks.some(([s]) => s === '✗') || problems.length ? 1 : 0);
}
