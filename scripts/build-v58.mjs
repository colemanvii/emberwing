import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v57.html');
const patch=read('src/v58/portal.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V57 clock insertion point missing');
html=html
 .replace('Emberwing V57 — The Price of Visibility','Emberwing V58 — Enter the Valley')
 .replace('src/v57/flight.css','src/v57/flight.css"><link rel="stylesheet" href="src/v58/portal.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v58.html',import.meta.url),html);
console.log('Built V58 from V57 plus Haven entry portal.');
