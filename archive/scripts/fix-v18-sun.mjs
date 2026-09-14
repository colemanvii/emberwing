import fs from 'node:fs';
let html=fs.readFileSync('v18.html','utf8');
for(const hex of ['0xe9f5ff','0xffd497']){
  const needle=`sky.material.uniforms.sunCol.value.setHex(${hex})`;
  if(!html.includes(needle)) throw new Error(`missing V18 sun color ${hex}`);
  html=html.replace(needle,'sky.material.uniforms.sunCol.value.setHex(0x000000)');
}
fs.writeFileSync('v18.html',html);
console.log('Removed legacy shader sun from V18');
