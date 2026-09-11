import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v44.html');
const patch=read('src/v45/valley-run.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V44 clock insertion point missing');
html=html
 .replace('Emberwing V44 — Firestorm Egress','Emberwing V45 — Valley Run')
 .replace('src/v44/flight.css','src/v45/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v45.html',import.meta.url),html);
console.log('Built V45 from V44 plus physical valley ingress/egress.');
