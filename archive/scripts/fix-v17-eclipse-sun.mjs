import fs from 'node:fs';
let html=fs.readFileSync('v17.html','utf8');
const oldText='function v17SetPalette(alpine){\n  if(alpine){';
const newText='function v17SetPalette(alpine){\n  sky.material.uniforms.sunDir.value.copy(v17SunDir);\n  if(alpine){';
if(!html.includes(oldText))throw new Error('V17 sun alignment anchor missing');
html=html.replace(oldText,newText);
fs.writeFileSync('v17.html',html);
console.log('Aligned eclipse core with shader sun');
