// Missile Duel prototype build. Reads the canonical Level 1 sources plus one prototype layer.
// Writes only src/duel/game.js and duel.html; never touches index.html, play.html or src/level1/game.js.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const code=[...['core','assets','mission','bandit-flow'].map(n=>read(`src/level1/${n}.js`)),read('src/duel/missile-duel.js')].join('\n\n');
const css=['src/level1/flight.css','src/level1/bandit-cue.css','src/level1/touch.css','src/duel/duel.css'];
const build=createHash('sha256').update(code+css.map(read).join('')).digest('hex').slice(0,12);
writeFileSync(new URL("src/duel/game.js",root),code);
let shell=read('src/level1/shell.html')
 .replace(/<title>[^<]*<\/title>/,'<title>Emberwing — Missile Duel (prototype)</title>')
 .replace(/<link rel="canonical"[^>]*>/,'<meta name="robots" content="noindex">')
 .replace('<link rel="stylesheet" href="src/level1/touch.css">',`<link rel="stylesheet" href="src/level1/touch.css?build=${build}"><link rel="stylesheet" href="src/duel/duel.css?build=${build}">`)
 .replaceAll('src/level1/flight.css',`src/level1/flight.css?build=${build}`)
 .replaceAll("import('./src/level1/game.js')",`import('./src/duel/game.js?build=${build}')`);
if(!shell.includes('src/duel/game.js'))throw Error('duel shell did not point at the duel bundle');
writeFileSync(new URL('duel.html',root),shell);
console.log(`Built Missile Duel prototype ${build}: duel.html`);
