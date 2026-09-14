import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v43.html');
const patch=read('src/v44/firestorm-egress.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V43 clock insertion point missing');
html=html
 .replace('Emberwing V43 — Attack Run','Emberwing V44 — Firestorm Egress')
 .replace('src/v43/flight.css','src/v44/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v44.html',import.meta.url),html);
console.log('Built V44 from frozen V43 plus longer ingress / firestorm egress pass.');
