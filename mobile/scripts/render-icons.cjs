// Rendert de app-iconen uit de originele Plateful v2-vectoren (public/assets) naar de PNG's die Expo nodig heeft.
// Geen hertekening: dezelfde vormen, kleuren en verhoudingen. Gebruik: node scripts/render-icons.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const out = path.join(__dirname, '..', 'assets');
const shapes = (plate, place, accent, hole) => `
  <circle cx="24" cy="24" r="8.6" fill="${plate}"/>
  ${hole ? `<circle cx="24" cy="24" r="4.2" fill="${hole}"/>` : ''}
  <rect x="19" y="7.2" width="10" height="6.4" rx="3.2" fill="${place}"/>
  <rect x="7.2" y="19" width="6.4" height="10" rx="3.2" fill="${place}"/>
  <rect x="34.4" y="19" width="6.4" height="10" rx="3.2" fill="${place}"/>
  <rect x="19" y="34.4" width="10" height="6.4" rx="3.2" fill="${accent}"/>`;
// Monochroom: het gat in het bord moet transparant zijn (Android gebruikt alleen alfa).
const mono = `<path fill-rule="evenodd" fill="#000" d="M24 15.4a8.6 8.6 0 1 1 0 17.2a8.6 8.6 0 1 1 0-17.2zM24 19.8a4.2 4.2 0 1 0 0 8.4a4.2 4.2 0 1 0 0-8.4z"/>
  <rect x="19" y="7.2" width="10" height="6.4" rx="3.2"/><rect x="7.2" y="19" width="6.4" height="10" rx="3.2"/>
  <rect x="34.4" y="19" width="6.4" height="10" rx="3.2"/><rect x="19" y="34.4" width="10" height="6.4" rx="3.2"/>`;
// Adaptieve iconen: inhoud binnen de veilige zone (~66 % van 108 dp) → viewBox met marge.
const adaptiveBox = '-9 -9 66 66';

const jobs = [
  ['android-icon-foreground.png', 1024, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${adaptiveBox}">${shapes('#FFF7E8', '#FFF7E8', '#F26B3A', '#124E43')}</svg>`],
  ['android-icon-background.png', 1024, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#124E43"/></svg>`],
  ['android-icon-monochrome.png', 1024, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${adaptiveBox}">${mono}</svg>`],
  ['splash-icon.png', 1024, fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'assets', 'plateful-icon.svg'), 'utf8')],
  ['favicon.png', 48, fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'assets', 'plateful-icon.svg'), 'utf8')],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, size, svg] of jobs) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.locator('svg').screenshot({ path: path.join(out, name), omitBackground: true });
  }
  fs.copyFileSync(path.join(__dirname, '..', '..', 'public', 'assets', 'plateful-app-icon-1024.png'), path.join(out, 'icon.png'));
  await browser.close();
  console.log('Iconen gerenderd in', out);
})();
