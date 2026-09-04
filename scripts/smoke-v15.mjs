import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failures = [];

page.on('pageerror', err => failures.push(`pageerror: ${err.message}`));
page.on('console', msg => {
  if (msg.type() === 'error') failures.push(`console: ${msg.text()}`);
});

const response = await page.goto('http://127.0.0.1:4173/v15.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
if (!response || !response.ok()) failures.push(`navigation status: ${response?.status() ?? 'no response'}`);
await page.waitForTimeout(5000);

const state = await page.evaluate(() => {
  const snap = window.__emberwingV15?.snapshot?.() ?? null;
  return {
    title: document.title,
    canvasCount: document.querySelectorAll('canvas').length,
    canvasVisible: [...document.querySelectorAll('canvas')].some(c => c.clientWidth > 500 && c.clientHeight > 300),
    reticle: !!document.getElementById('reticle'),
    target: !!document.getElementById('target'),
    coach: !!document.getElementById('coach'),
    boot: !!document.getElementById('boot'),
    v15: snap,
    bodyText: document.body.innerText.slice(0, 500)
  };
});

if (!/Emberwing V15/i.test(state.title)) failures.push(`unexpected title: ${state.title}`);
if (state.canvasCount !== 1) failures.push(`expected one canvas, found ${state.canvasCount}`);
if (!state.canvasVisible) failures.push('game canvas is not visibly sized');
if (!state.reticle || !state.target || !state.coach) failures.push('core HUD elements missing');
if (state.boot) failures.push('wrapper boot element present');
if (!state.v15) failures.push('V15 runtime hook missing');
if ((state.v15?.torusSegments ?? 0) < 24) failures.push(`torus incomplete: ${state.v15?.torusSegments}`);
if ((state.v15?.torusVisible ?? 0) < 24) failures.push(`desert torus not visible: ${state.v15?.torusVisible}`);
if (!state.v15?.cloudReady || !state.v15?.spineReady) failures.push('alpine anchor objects not initialized');
if (/LOAD ERROR|MONK MODE \/\//i.test(state.bodyText)) failures.push(`error/boot text visible: ${state.bodyText}`);

await page.screenshot({ path: '/tmp/emberwing-v15-desert.png', fullPage: true });
await browser.close();

if (failures.length) {
  console.error('V15 SMOKE TEST FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V15 SMOKE TEST PASSED');
console.log(JSON.stringify(state, null, 2));
