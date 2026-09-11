import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v41.html');
const patch=read('src/v42/tactical-flight.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V41 clock insertion point missing');
html=html
 .replace('Emberwing V41 — Strike Mission','Emberwing V42 — Terrain Mask')
 .replace('src/v41/flight.css','src/v42/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v42.html',import.meta.url),html);
console.log('Built V42 from frozen V41 plus terrain-mask/heading/corridor pass.');
