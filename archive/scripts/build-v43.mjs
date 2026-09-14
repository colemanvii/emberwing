import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v42.html');
const patch=read('src/v43/attack-run.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V42 clock insertion point missing');
html=html
 .replace('Emberwing V42 — Terrain Mask','Emberwing V43 — Attack Run')
 .replace('src/v42/flight.css','src/v43/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v43.html',import.meta.url),html);
console.log('Built V43 from frozen V42 plus authored attack-run pass.');
