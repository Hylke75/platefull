import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = join(import.meta.dirname, 'dist');
const read = name => readFileSync(join(base, name), 'utf8');

let html = read('index.html');
let js = read('app.js');
const css = read('styles.css');
const brandCss = read('brand-v2.css');

const assets = [
  ['wraps.png', './assets/wraps.png'],
  ['roasted-bowl.png', './assets/roasted-bowl.png'],
  ['pasta.png', './assets/pasta.png'],
  ['plateful-icon.svg', './assets/plateful-icon.svg']
];

for (const [file, relative] of assets) {
  const buffer = readFileSync(join(base, 'assets', file));
  const mime = file.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  const encoded = `data:${mime};base64,${buffer.toString('base64')}`;
  js = js.replaceAll(relative, encoded);
  html = html.replaceAll(relative, encoded);
}

html = html.replace('<link rel="stylesheet" href="./styles.css" />', `<style>${css}</style>`);
html = html.replace('<link rel="stylesheet" href="./brand-v2.css" />', `<style>${brandCss}</style>`);
html = html.replace('<script src="./app.js"></script>', `<script>${js}</script>`);
writeFileSync(join(base, 'plateful-visueel-ontwerp-v2.html'), html, 'utf8');
