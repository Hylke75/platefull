// Gate 0: pixelvergelijking van de Next.js-replica met de originele designbestanden (design-source/dist).
// Vereist: `npm run build && npm start` (poort 3000) en een statische server voor design-source/dist (poort 8081):
//   python3 -m http.server 8081 -d design-source/dist
// Gebruik: node scripts/visual-compare.mjs [--update]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const APP = process.env.APP_URL ?? 'http://localhost:3000/';
const REF = process.env.REF_URL ?? 'http://localhost:8081/index.html';
const OUT = new URL('../artifacts/visual/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const WIDTHS = [1440, 1024, 768, 390];
// Toestanden van de telefoon: [naam, klikreeks]. Selectors bestaan in beide implementaties.
const PHONE_STATES = [
  ['home', []],
  ['swap', ['[data-action="swap"]']],
  ['confirm', ['[data-action="confirm"]']],
  ['planb', ['[data-screen="planb"]']],
  ['planb-ready', ['[data-screen="planb"]', '[data-scenario="away"]', '[data-action="calculate"]']],
  ['planb-applied', ['[data-screen="planb"]', '[data-scenario="taste"]', '[data-action="calculate"]', '[data-action="apply-planb"]']],
  ['family', ['[data-screen="family"]']],
  ['person-lina', ['[data-screen="family"]', '.family-person >> nth=3']],
  ['person-toggle', ['[data-screen="family"]', '.family-person >> nth=3', '[data-action="toggle-override"]']],
  ['week', ['[data-screen="week"]']],
  ['groceries', ['[data-screen="groceries"]', '.shopping-item >> nth=2']],
  ['cook', ['[data-action="confirm"]', '[data-action="cook"]']],
];

function diff(a, b, name) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
  const ca = crop(A), cb = crop(B), d = new PNG({ width: w, height: h });
  const n = pixelmatch(ca.data, cb.data, d.data, w, h, { threshold: 0.1 });
  if (n > 0) writeFileSync(`${OUT}${name}-diff.png`, PNG.sync.write(d));
  return { name, pixels: n, ratio: n / (w * h), sizeA: `${A.width}x${A.height}`, sizeB: `${B.width}x${B.height}` };
}

async function shot(page, url, width, clicks, clip) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  for (const sel of clicks) { await page.locator(sel).first().click(); await page.waitForTimeout(80); }
  // Toast-animaties en caret uitschakelen voor een stabiele vergelijking.
  await page.addStyleTag({ content: '*{caret-color:transparent!important;transition:none!important;animation:none!important} .toast{display:none!important}' });
  await page.waitForTimeout(120);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const buf = clip ? await page.locator(clip).screenshot() : await page.screenshot({ fullPage: true });
  return { buf, overflow };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });

const results = [];
for (const w of WIDTHS) {
  const a = await shot(page, REF, w, [], null);
  const b = await shot(page, APP, w, [], null);
  writeFileSync(`${OUT}page-${w}-ref.png`, a.buf); writeFileSync(`${OUT}page-${w}-app.png`, b.buf);
  results.push({ ...diff(a.buf, b.buf, `page-${w}`), overflowRef: a.overflow, overflowApp: b.overflow });
}
for (const [name, clicks] of PHONE_STATES) {
  const a = await shot(page, REF, 1440, clicks, '.phone');
  const b = await shot(page, APP, 1440, clicks, '.phone');
  writeFileSync(`${OUT}phone-${name}-ref.png`, a.buf); writeFileSync(`${OUT}phone-${name}-app.png`, b.buf);
  results.push(diff(a.buf, b.buf, `phone-${name}`));
}
await browser.close();

console.table(results.map((r) => ({ ...r, ratio: `${(r.ratio * 100).toFixed(3)}%` })));
const appErrors = errors.filter((e) => e.includes(':3000'));
if (appErrors.length) console.log('Fouten in de app:', appErrors);
const worst = Math.max(...results.map((r) => r.ratio));
writeFileSync(`${OUT}report.json`, JSON.stringify({ results, errors: appErrors }, null, 2));
process.exit(worst > 0.001 || appErrors.length ? 1 : 0);
