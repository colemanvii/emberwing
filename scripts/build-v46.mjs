import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v45.html');
const patch=read('src/v46/stealth-break.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V45 clock insertion point missing');
html=html
 .replace('Emberwing V45 — Valley Run','Emberwing V46 — Stealth Break')
 .replace('src/v45/flight.css','src/v46/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v46.html',import.meta.url),html);
console.log('Built V46 from V45 plus stealth-break pass.');
