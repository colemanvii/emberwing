import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v46.html');
const patch=read('src/v47/escalation.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V46 clock insertion point missing');
html=html
 .replace('Emberwing V46 — Stealth Break','Emberwing V47 — Escalation')
 .replace('src/v46/flight.css','src/v47/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v47.html',import.meta.url),html);
console.log('Built V47 from V46 plus hostile missile escalation.');
