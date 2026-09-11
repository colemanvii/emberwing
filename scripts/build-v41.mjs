import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v40.html');
const patch=read('src/v41/strike-mission.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V40 clock insertion point missing');
html=html
 .replace('Emberwing V40 — Mission Flight','Emberwing V41 — Strike Mission')
 .replace('src/v40/flight.css','src/v41/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v41.html',import.meta.url),html);
console.log('Built V41 from frozen V40 plus strike mission patch.');
