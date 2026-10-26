// E2E: acceptatiecriteria van de masterprompt voor de klikbare ontwerpdemo op de landingspagina.
// Vereist een draaiende app (npm start). Gebruik: node scripts/e2e-demo.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const APP = process.env.APP_URL ?? 'http://localhost:3000/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
await page.goto(APP, { waitUntil: 'networkidle' });

const phone = page.locator('.phone');
const title = () => phone.locator('.dinner-hero h3').innerText();
const checks = [];
const check = async (name, fn) => { try { await fn(); checks.push(['✓', name]); } catch (e) { checks.push(['✗', `${name}: ${e.message}`]); } };

await check('logo’s gebruiken overal het v2-icoon', async () => {
  const srcs = await page.locator('.brand-symbol img, .app-brand img, .footer-brand img, .identity-preview img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
  assert.ok(srcs.length >= 6);
  for (const s of srcs) assert.equal(s, '/assets/plateful-icon.svg');
});
await check('woordmerk: plateful in Fraunces met mandarijn punt', async () => {
  const font = await page.locator('.brand').evaluate((e) => getComputedStyle(e).fontFamily);
  assert.match(font, /Fraunces/);
  const dot = await page.locator('.brand-dot').evaluate((e) => getComputedStyle(e).color);
  assert.equal(dot, 'rgb(242, 107, 58)');
});
await check('startscherm: wraps, gezinsscore, dagpillen, knoppen', async () => {
  assert.equal(await title(), 'Wraps voor iedereen');
  assert.equal(await phone.locator('.match-badge').innerText(), '✓ Goed passend');
  assert.equal(await phone.locator('.day-pill').count(), 5);
  for (const a of ['confirm', 'swap', 'planb']) assert.equal(await phone.locator(`[data-action="${a}"]`).count(), 1);
});
await check('Ander idee: wraps → pasta → rijstbowl → wraps', async () => {
  const seen = [];
  for (let i = 0; i < 3; i++) { await phone.locator('[data-action="swap"]').click(); seen.push(await title()); }
  assert.deepEqual(seen, ['Romige tomatenpasta', 'Kleurrijke rijstbowl', 'Wraps voor iedereen']);
  assert.equal(await phone.locator('.toast').innerText(), 'Nieuw gerecht voorgesteld');
});
await check('Dit eten we → bevestigingskaart → kookstand', async () => {
  await phone.locator('[data-action="confirm"]').click();
  assert.equal(await phone.locator('.confirmation h3').innerText(), 'Het is geregeld!');
  await phone.locator('[data-action="cook"]').click();
  assert.equal(await phone.locator('.recipe-step').count(), 3);
  assert.equal(await phone.locator('.nav-button.active').innerText(), '⌂\nVandaag');
});
await check('toast verdwijnt na ~3 seconden', async () => {
  // Na 'Dit eten we' toont ook het origineel geen 'Ander idee' meer: begin met een verse demo.
  await page.reload({ waitUntil: 'networkidle' });
  await phone.locator('[data-action="swap"]').click();
  assert.equal(await phone.locator('.toast').count(), 1);
  await page.waitForTimeout(3300);
  assert.equal(await phone.locator('.toast').count(), 0);
  await phone.locator('[data-action="swap"]').click(); await phone.locator('[data-action="swap"]').click();
});
await check('Plan B: vier scenario’s, berekenen en toepassen keert terug', async () => {
  await page.locator('[data-screen="planb"]').click();
  assert.equal(await phone.locator('.scenario').count(), 4);
  for (const [s, note, meta] of [['time', 'Snellere bereiding', '15 min'], ['away', 'Drie eters', '3 personen'], ['missing', 'Kikkererwten', null], ['taste', 'Rauwe tomaat apart voor Sam', null]]) {
    await page.locator('[data-screen="planb"]').click();
    await phone.locator(`[data-scenario="${s}"]`).click();
    assert.equal(await phone.locator('.scenario-output').count(), 0);
    await phone.locator('[data-action="calculate"]').click();
    assert.equal(await phone.locator('.scenario-output').count(), 1);
    await phone.locator('[data-action="apply-planb"]').click();
    assert.match(await phone.locator('.micro-note').innerText(), new RegExp(note));
    assert.equal(await phone.locator('.small-glass-tag').innerText(), '✳ Plan B toegepast');
    if (meta) assert.match(await phone.locator('.dinner-metadata').innerText(), new RegExp(meta));
  }
});
await check('gezin: vier profielen; regie alleen voor kinderen; allergie blijft strikt', async () => {
  await page.locator('[data-screen="family"]').click();
  assert.equal(await phone.locator('.family-person').count(), 4);
  await phone.locator('.family-person').nth(0).click();
  assert.equal(await phone.locator('.switch').count(), 0);
  await phone.locator('[data-action="back-family"]').click();
  await phone.locator('.family-person').nth(3).click();
  assert.equal(await phone.locator('.taste-status.strict').innerText(), 'Allergie — nooit overrulen');
  const sw = phone.locator('.switch');
  assert.equal(await sw.getAttribute('aria-pressed'), 'true');
  await sw.click();
  assert.equal(await sw.getAttribute('aria-pressed'), 'false');
  assert.equal(await phone.locator('.taste-status.strict').innerText(), 'Allergie — nooit overrulen');
});
await check('boodschappen: afvinken, voortgang loopt mee', async () => {
  await page.locator('[data-screen="groceries"]').click();
  assert.match(await phone.locator('.progress-note span').innerText(), /^1 van 8/);
  await phone.locator('.shopping-item input').nth(1).check();
  assert.match(await phone.locator('.progress-note span').innerText(), /^2 van 8/);
  await phone.locator('.shopping-item input').nth(0).uncheck();
  assert.match(await phone.locator('.progress-note span').innerText(), /^1 van 8/);
});
await check('bottom-navigatie en snelle voorbeeldknoppen wisselen schermen', async () => {
  for (const [nav, title] of [['week', 'Een fijne week'], ['family', 'Iedereen heeft'], ['groceries', 'Een lijstje.'], ['home', 'Vanavond wordt']]) {
    await phone.locator(`[data-nav="${nav}"]`).click();
    assert.match(await phone.locator('.app-title').first().innerText(), new RegExp(title));
    assert.equal(await phone.locator(`[data-nav="${nav}"]`).getAttribute('class'), 'nav-button active');
    assert.equal(await page.locator(`[data-screen="${nav}"]`).getAttribute('class'), 'quick-view active');
  }
});
await check('toetsenbord: knoppen bereikbaar met focusstijl', async () => {
  await page.locator('[data-action="swap"]').focus();
  const outline = await page.locator('[data-action="swap"]').evaluate((e) => getComputedStyle(e).outlineStyle);
  assert.ok(outline);
});

await browser.close();
for (const [s, n] of checks) console.log(s, n);
if (problems.length) console.log('Problemen:', problems);
process.exit(checks.some(([s]) => s === '✗') || problems.length ? 1 : 0);
