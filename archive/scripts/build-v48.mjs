import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v47.html');
const patch=read('src/v48/strike-window.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V47 clock insertion point missing');
html=html
 .replace('Emberwing V47 — Escalation','Emberwing V48 — Strike Window')
 .replace('src/v47/flight.css','src/v48/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v48.html',import.meta.url),html);
console.log('Built V48 from V47 plus authored strike-window flow.');
