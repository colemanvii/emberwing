import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
// Reuse the exact preview aircraft, flight model, camera, weapons and physical bandit.
// Level 1's mission, bandit encounter staging and terrain controller are never loaded.
const code=[read('src/level1/core.js'),...['effects','world','mission','combat'].map(n=>read(`src/level2/${n}.js`)), 'reset(true);requestAnimationFrame(loop);'].join('\n\n');
const hash=createHash('sha256').update(code+read('src/level2/desert.css')).digest('hex').slice(0,12);
writeFileSync(new URL('src/level2/game.js',root),code);
writeFileSync(new URL('level2.html',root),read('src/level2/shell.html').replaceAll('src/level2/game.js',`src/level2/game.js?build=${hash}`).replaceAll('src/level2/desert.css',`src/level2/desert.css?build=${hash}`));
console.log(`Built Level 2 WHICH ONE ${hash}; Level 1 untouched.`);
