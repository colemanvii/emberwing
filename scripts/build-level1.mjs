import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
// Canonical sources only: no previous HTML releases or override insertion points.
const code=['core','assets','mission','bandit-flow','aliens'].map(name=>read(`src/level1/${name}.js`)).join('\n\n');
const build='alien-encounter-v1';
writeFileSync(new URL('src/level1/game.js',root),code);
const shell=read('src/level1/shell.html').replaceAll('src/level1/game.js',`src/level1/game.js?build=${build}`).replaceAll('src/level1/flight.css',`src/level1/flight.css?build=${build}`).replaceAll('src/level1/touch.css',`src/level1/touch.css?build=${build}`);
writeFileSync(new URL('index.html',root),shell.replace('<body data-state="flight">','<body data-state="flight" data-first-flight="true">'));
writeFileSync(new URL('play.html',root),shell);
console.log(`Built Level 1 ${build}: public onboarding index + raw play entry.`);
