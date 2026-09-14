import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const V3_COMMIT = 'fa7f28e7e1987f151250fba078d9f10ad808d38d';
const V11_COMMIT = '34dec9a5249a771522998c05b328a903d18bc8ae';

function gitShow(commit, path) {
  return execFileSync('git', ['show', `${commit}:${path}`], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function classicScript(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Classic wrapper script not found');
  return match[1];
}

async function resolveWrapper(wrapperHtml, fetchMap, label) {
  const boot = { textContent: '' };
  let written = '';
  const document = {
    open() { written = ''; },
    write(value) { written += String(value); },
    close() {},
    getElementById() { return boot; }
  };

  const fetch = async (url) => {
    const key = [...fetchMap.keys()].find(k => String(url).includes(k));
    if (!key) return { ok: false, status: 404, text: async () => '' };
    return { ok: true, status: 200, text: async () => fetchMap.get(key) };
  };

  const context = vm.createContext({ document, fetch, console, setTimeout, clearTimeout });
  const result = vm.runInContext(classicScript(wrapperHtml), context, { timeout: 5000, filename: `${label}.wrapper.js` });
  if (result && typeof result.then === 'function') await result;
  if (!written) throw new Error(`${label} produced no document output${boot.textContent ? `: ${boot.textContent}` : ''}`);
  return written;
}

const v12 = fs.readFileSync('v12.html', 'utf8');
const pinnedV11 = gitShow(V11_COMMIT, 'v11.html');
const pinnedV3 = gitShow(V3_COMMIT, 'v3.html');

const effectiveV11 = await resolveWrapper(
  v12,
  new Map([['/v11.html', pinnedV11]]),
  'v12'
);

let flat = await resolveWrapper(
  effectiveV11,
  new Map([['/v3.html', pinnedV3]]),
  'v11+v12'
);

const mustContain = [
  '// EMBERWING V10 //',
  '// EMBERWING V11 //',
  '// EMBERWING V12 //',
  "baseWeaveAmp=role==='ROOKIE'?.045:role==='SKIMMER'?.17:role==='CLIMBER'?.11:.36",
  "escape=range<52?(52-range)*(role==='ACE'?.38:(role==='SKIMMER'||role==='CLIMBER')?.13:.38):0",
  "enemyRole==='SKIMMER'?90:enemyRole==='ACE'?150:105",
  'addScaledVector(f,980).addScaledVector(r,(worldIndex?-1:1)*430)',
  'const v12SeparateEnemyBase=separateEnemyFromObstacles'
];
for (const marker of mustContain) {
  if (!flat.includes(marker)) throw new Error(`Flatten validation failed; missing: ${marker}`);
}

const forbidden = [
  'Could not load V11 baseline',
  'Could not load V3 flight core',
  "document.write(outer)",
  "document.write(html)",
  'V12 MONK MODE // '
];
for (const marker of forbidden) {
  if (flat.includes(marker)) throw new Error(`Flatten validation failed; wrapper residue: ${marker}`);
}

if (!flat.includes('<script type="module">')) throw new Error('Flatten validation failed; module game script missing');
if (flat.length < 50000) throw new Error(`Flatten output unexpectedly small: ${flat.length} bytes`);

flat = flat.replace(
  '<!doctype html>',
  '<!doctype html>\n<!-- EMBERWING V14 // standalone flatten of effective V12 // zero gameplay changes -->'
);

fs.writeFileSync('v14.html', flat, 'utf8');

const moduleMatch = flat.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!moduleMatch) throw new Error('Could not extract module script for syntax validation');
fs.writeFileSync('/tmp/emberwing-v14-check.mjs', moduleMatch[1], 'utf8');
execFileSync(process.execPath, ['--check', '/tmp/emberwing-v14-check.mjs'], { stdio: 'inherit' });

const sha = createHash('sha256').update(flat).digest('hex');
console.log(`V14 flattened successfully: ${flat.length} bytes`);
console.log(`SHA256 ${sha}`);
