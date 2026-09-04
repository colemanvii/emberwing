import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failures = [];

page.on('pageerror', err => failures.push(`pageerror: ${err.message}`));
page.on('console', msg => {
  if (msg.type() === 'error') failures.push(`console: ${msg.text()}`);
});

const response = await page.goto('http://127.0.0.1:4173/v14.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
if (!response || !response.ok()) failures.push(`navigation status: ${response?.status() ?? 'no response'}`);

await page.waitForTimeout(5000);

const state = await page.evaluate(() => ({
  title: document.title,
  canvasCount: document.querySelectorAll('canvas').length,
  canvasVisible: [...document.querySelectorAll('canvas')].some(c => c.clientWidth > 500 && c.clientHeight > 300),
  reticle: !!document.getElementById('reticle'),
  target: !!document.getElementById('target'),
  coach: !!document.getElementById('coach'),
  boot: !!document.getElementById('boot'),
  bodyText: document.body.innerText.slice(0, 500)
}));

if (!/Emberwing/i.test(state.title)) failures.push(`unexpected title: ${state.title}`);
if (state.canvasCount !== 1) failures.push(`expected one canvas, found ${state.canvasCount}`);
if (!state.canvasVisible) failures.push('game canvas is not visibly sized');
if (!state.reticle || !state.target || !state.coach) failures.push('core HUD elements missing');
if (state.boot) failures.push('wrapper boot element survived flatten');
if (/LOAD ERROR|MONK MODE \/\//i.test(state.bodyText)) failures.push(`error/boot text visible: ${state.bodyText}`);

await page.screenshot({ path: '/tmp/emberwing-v14-smoke.png', fullPage: true });
await browser.close();

if (failures.length) {
  console.error('V14 SMOKE TEST FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V14 SMOKE TEST PASSED');
console.log(JSON.stringify(state, null, 2));
