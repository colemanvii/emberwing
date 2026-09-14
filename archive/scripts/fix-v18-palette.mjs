import fs from 'node:fs';
let html=fs.readFileSync('v18.html','utf8');
const swaps=[
['c1.setHex(0x26221f);c2.setHex(0x6e5d4a);c3.setHex(0xb5966a);c4.setHex(0xead6a7)','c1.setHex(0x3b3128);c2.setHex(0x8d704e);c3.setHex(0xc6a46e);c4.setHex(0xf1d8a6)'],
['haze.setHex(0x8b7562);scene.background=haze;scene.fog.color.copy(haze);scene.fog.density=.0005','haze.setHex(0x976e50);scene.background=haze;scene.fog.color.copy(haze);scene.fog.density=.00046'],
['sky.material.uniforms.hor.value.setHex(0x8c604d);sky.material.uniforms.low.value.setHex(0xe7c98e)','sky.material.uniforms.hor.value.setHex(0x9b5f42);sky.material.uniforms.low.value.setHex(0xf0c77f)']
];
for(const [a,b] of swaps){if(!html.includes(a))throw new Error('missing palette anchor '+a);html=html.replace(a,b)}
fs.writeFileSync('v18.html',html);
console.log('Lifted V18 desert palette');
