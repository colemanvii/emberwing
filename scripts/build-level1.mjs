import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
// Canonical sources only: no previous HTML releases or override insertion points.
const code=['core','assets','mission','bandit-flow'].map(name=>read(`src/level1/${name}.js`)).join('\n\n');
const build=createHash('sha256').update(code+read('src/level1/flight.css')+read('src/level1/touch.css')).digest('hex').slice(0,12);
writeFileSync(new URL('src/level1/game.js',root),code);
const shell=read('src/level1/shell.html').replaceAll('src/level1/game.js',`src/level1/game.js?build=${build}`).replaceAll('src/level1/flight.css',`src/level1/flight.css?build=${build}`).replaceAll('src/level1/touch.css',`src/level1/touch.css?build=${build}`);
writeFileSync(new URL('index.html',root),shell.replace('<body data-state="flight">','<body data-state="flight" data-first-flight="true">'));
writeFileSync(new URL('play.html',root),shell);
console.log(`Built Level 1 ${build}: public onboarding index + raw play entry.`);

// Gus Mode: the same canonical Level 1 runtime with the Gus layer appended in one module
// scope. It is a separate bundle and entry page; the Level 1 outputs above never include it.
const gus=read('src/gus/gus.js'),gusCss=read('src/gus/gus.css');
const gusBuild=createHash('sha256').update(code+gus+read('src/level1/flight.css')+read('src/level1/touch.css')+gusCss).digest('hex').slice(0,12);
writeFileSync(new URL('src/gus/game.js',root),`${code}\n\n${gus}`);
const gusShell=read('src/level1/shell.html')
 .replace('content="width=device-width,initial-scale=1,viewport-fit=cover"','content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"')
 .replace('<meta name="theme-color" content="#101311">','<meta name="theme-color" content="#101311"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">')
 .replaceAll('https://colemanvii.github.io/emberwing/play.html','https://colemanvii.github.io/emberwing/gus.html')
 .replace('<title>Emberwing — Valley Strike</title>','<title>Emberwing — Gus Mode</title>')
 .replaceAll('src/level1/game.js',`src/gus/game.js?build=${gusBuild}`)
 .replaceAll('src/level1/flight.css',`src/level1/flight.css?build=${gusBuild}`)
 .replaceAll('src/level1/touch.css',`src/level1/touch.css?build=${gusBuild}"><link rel="stylesheet" href="src/gus/gus.css?build=${gusBuild}`)
 .replace('<body data-state="flight">','<body data-state="flight" data-mode="gus">');
writeFileSync(new URL('gus.html',root),gusShell);
console.log(`Built Gus Mode ${gusBuild}: gus.html + src/gus/game.js.`);
