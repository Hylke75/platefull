// E2E van de mobiele app (React Native-code via react-native-web) tegen een lokale Supabase-stack met Mailpit.
// Dekt dezelfde kernflows als de web-E2E: OTP-login, onboarding met allergie/dieet, voorstel, accepteren,
// boodschappen, Plan B + ongedaan maken, smaakprofiel, kookstand met restjes, harde regel na acceptatie.
// Gebruik: EXPO_PUBLIC_*=… npx expo export --platform web --output-dir <dir>, serveer met SPA-fallback, dan:
//   APP_URL=http://localhost:8082 node scripts/e2e-web.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const APP = process.env.APP_URL ?? 'http://localhost:8082';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
const SHOTS = path.join(__dirname, '..', '..', 'artifacts', 'mobile');
fs.mkdirSync(SHOTS, { recursive: true });
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

const checks = [];
const problems = [];
let current = null;
async function step(name, fn) {
  try { await fn(); checks.push(['✓', name]); } catch (e) {
    checks.push(['✗', `${name}: ${String(e.message).split('\n').slice(0, 3).join(' | ')}`]);
    if (current) await current.screenshot({ path: path.join(SHOTS, 'failure.png') }).catch(() => {});
    throw e;
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  current = page;
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Download the React DevTools|aria-hidden/.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`); });
  const email = `app-${run}@example.nl`;
  const btn = (name) => page.getByRole('button', { name, exact: false }).filter({ visible: true }).first();
  const text = (t) => page.getByText(t, { exact: false }).filter({ visible: true }).first();
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${n}.png`) });

  try {
    await step('S-01: zonder sessie → login', async () => {
      await page.goto(`${APP}/vandaag`);
      await text('Welkom aan').waitFor({ timeout: 20000 });
      await shot('01-login');
    });

    await step('O-02: inloggen met de 6-cijferige code', async () => {
      await page.getByLabel('E-mailadres').fill(email);
      await btn('Stuur mijn inlogcode').click();
      await text('Kijk in je mail').waitFor();
      await page.getByLabel('Code').fill(await otpFor(email));
      await btn('Inloggen').click();
      await text('Maak jullie').waitFor({ timeout: 15000 });
    });

    await step('O-03: huishouden (voorwaarden verplicht)', async () => {
      await page.getByLabel('Hoe heet jullie huishouden? (optioneel)').fill('Familie Vos');
      await page.getByRole('checkbox', { name: /akkoord/ }).click();
      await btn('Verder →').click();
      await text('Iedereen een').waitFor();
    });

    await step('O-04: vier profielen', async () => {
      for (const [name, band] of [['Emma', 'Volwassene'], ['Ruben', 'Volwassene'], ['Sam', '0–15'], ['Lina', '0–15']]) {
        await page.getByLabel('Roepnaam').fill(name);
        await page.getByRole('button', { name: band, exact: true }).click();
        await btn('+ Toevoegen').click();
        await page.getByText(name, { exact: true }).first().waitFor();
      }
      await shot('02-profielen');
      await btn('Verder →').click();
      await text('Allergieën en').waitFor();
    });

    await step('O-05: notenallergie Lina pas na toestemming; Ruben vegetarisch; rest geen bekende', async () => {
      const card = (n) => page.locator('div').filter({ has: page.getByText(new RegExp(`^${n} ·`)) }).filter({ has: page.getByRole('button', { name: 'Vastleggen' }) }).last();
      await card('Lina').getByRole('button', { name: 'Noten', exact: true }).click();
      await card('Lina').getByRole('button', { name: 'Vastleggen' }).click();
      await text('Geef eerst toestemming').waitFor();
      await page.getByRole('checkbox', { name: /toestemming/ }).click();
      await card('Lina').getByRole('button', { name: 'Vastleggen' }).click();
      await page.getByText(/^Lina · Noten/).waitFor();
      await card('Ruben').getByRole('button', { name: 'Vegetarisch', exact: true }).click();
      await card('Ruben').getByRole('button', { name: 'Vastleggen' }).click();
      await page.getByText(/^Ruben · Vegetarisch/).waitFor();
      for (const n of ['Emma', 'Sam']) {
        await card(n).getByRole('button', { name: 'Geen bekende' }).click();
        await page.getByText(new RegExp(`^${n} · geen bekende beperkingen`)).waitFor();
      }
      await shot('03-beperkingen');
      await btn('Verder →').click();
    });

    await step('O-06: smaken (Lina champignons echt niet lekker)', async () => {
      for (const who of ['Emma', 'Ruben', 'Sam', 'Lina']) {
        await page.getByText(new RegExp(`${who} lekker\\?`)).waitFor();
        if (who === 'Lina') {
          const row = page.locator('div').filter({ has: page.getByText('Champignons', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Echt niet lekker' }) }).last();
          await row.getByRole('button', { name: 'Echt niet lekker' }).click();
        }
        await page.getByRole('button', { name: /Volgende persoon|Verder/ }).first().click();
      }
      await text('Hoeveel tijd').waitFor();
    });

    await step('O-07/O-08: eerste voorstel (veilig voor Lina en Ruben)', async () => {
      await btn('Laat het eerste voorstel zien').click();
      await text('Kleurrijke rijstbowl').waitFor({ timeout: 30000 });
      await text('Past bij jullie gezin').waitFor();
      await shot('04-vandaag');
    });

    await step('S-03: Dit eten we → bevestiging', async () => {
      await btn('✓ Dit eten we').click();
      await text('Het is geregeld!').waitFor({ timeout: 15000 });
      await shot('05-geregeld');
    });

    await step('S-09: boodschappenlijst gevuld en afvinken telt mee', async () => {
      await page.getByRole('tab', { name: 'Lijst' }).click();
      await text('Zoete aardappel').waitFor({ timeout: 15000 });
      const before = await page.getByText(/^\d+ van \d+ afgevinkt$/).innerText();
      assert.match(before, /^0 van/);
      await page.getByRole('checkbox').first().click();
      await page.getByText(/^1 van \d+ afgevinkt$/).waitFor();
      await shot('06-lijst');
    });

    await step('U-04: Plan B "iemand eet niet mee" → 3 personen → ongedaan maken', async () => {
      await page.getByRole('tab', { name: 'Vandaag' }).click();
      await text('Het is geregeld!').waitFor();
      await btn('Loopt de dag anders?').click();
      await text('Oeps, plannen veranderd?').waitFor();
      await btn('Iemand eet niet mee').click();
      await page.getByRole('button', { name: 'Ruben', exact: true }).click();
      await btn('Voorstel bekijken').click();
      await text('Dezelfde maaltijd, minder porties').waitFor({ timeout: 15000 });
      await text('4 → 3').waitFor();
      await shot('07-planb');
      await btn('Pas het menu aan').click();
      await text('3 personen').waitFor({ timeout: 15000 });
      await btn('Maak ongedaan').click();
      await text('4 personen').waitFor({ timeout: 15000 });
    });

    await step('S-08: smaakprofiel toont harde beperking apart en bewaart voorkeur', async () => {
      await page.getByRole('tab', { name: 'Gezin' }).click();
      await page.getByRole('button', { name: /^Lina, Kind/ }).click();
      await text('Harde beperkingen — nooit overrulen').waitFor();
      await text('Noten').waitFor();
      await shot('08-smaakprofiel');
      const row = page.locator('div').filter({ has: page.getByText('Broccoli', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Liever niet' }) }).last();
      await row.getByRole('button', { name: 'Liever niet' }).click();
      await btn('Voorkeuren bewaren').click();
      await text('Smaakprofiel bewaard').waitFor();
      await page.getByRole('button', { name: 'Terug' }).click();
    });

    await step('S-11: kookstand en afronden met restjes', async () => {
      await page.getByRole('tab', { name: 'Vandaag' }).click();
      await btn('Bekijk de kookstappen').click();
      await text('STAP 1 VAN').waitFor();
      await btn('✓ Gekookt').click();
      await btn('2 porties').click();
      await btn('Afronden').click();
      await text('Gekookt!').waitFor({ timeout: 15000 });
    });

    await step('U-07: nieuwe allergie blokkeert een geaccepteerd gerecht van morgen', async () => {
      // Morgen inplannen en accepteren, dan sesamallergie (rijstbowl heeft sesam als optionele topping).
      const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' });
      await page.goto(`${APP}/vandaag?datum=${tomorrow}`);
      await text('Zo eten jullie').waitFor({ timeout: 20000 });
      await btn('✓ Dit eten we').click({ timeout: 30000 });
      await text('Het is geregeld!').waitFor({ timeout: 15000 });
      await page.getByRole('tab', { name: 'Gezin' }).click();
      await page.getByRole('button', { name: /^Lina, Kind/ }).click();
      await page.getByRole('button', { name: 'Sesam', exact: true }).click();
      await btn('Vastleggen').click();
      await text('moeten worden aangepast').waitFor({ timeout: 15000 });
      await page.goto(`${APP}/vandaag?datum=${tomorrow}`);
      await text('Controle nodig').waitFor({ timeout: 20000 });
      await shot('09-geblokkeerd');
    });

    await step('Navigatie: alle tabs en vervolgschermen renderen', async () => {
      for (const [tab, t] of [['Week', 'Een fijne week'], ['Gezin', 'Iedereen heeft'], ['Lijst', 'Een lijstje.']]) {
        await page.getByRole('tab', { name: tab }).click();
        await text(t).waitFor();
      }
      await btn('Restjes').click();
      await text('Bruikbaar').waitFor();
      await page.getByRole('button', { name: 'Terug' }).click();
      await btn('Voorraad').click();
      await text('Wat is er').waitFor();
    });
  } catch {
    // details staan in checks
  } finally {
    await browser.close();
    for (const [s, n] of checks) console.log(s, n);
    if (problems.length) console.log('Problemen:', [...new Set(problems)].slice(0, 10));
    process.exit(checks.some(([s]) => s === '✗') || problems.length ? 1 : 0);
  }
})();
