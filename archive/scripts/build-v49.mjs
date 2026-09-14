import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let html=read('v48.html');
const patch=read('src/v49/living-valley.js');
if(!html.includes('const clock=new THREE.Clock();'))throw Error('V48 clock insertion point missing');
html=html
 .replace('Emberwing V48 — Strike Window','Emberwing V49 — Living Valley')
 .replace('src/v48/flight.css','src/v49/flight.css')
 .replace('const clock=new THREE.Clock();',patch+'\nconst clock=new THREE.Clock();');
writeFileSync(new URL('../v49.html',import.meta.url),html);
console.log('Built V49 from V48 plus living-valley choreography.');
