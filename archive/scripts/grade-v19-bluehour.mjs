import fs from 'node:fs';
let html=fs.readFileSync('v19.html','utf8');
if(!html.includes('EMBERWING V19 // CINEMATIC LIGHT')) throw new Error('Expected V19 candidate');
const swaps=[
  ['sky.material.uniforms.top.value.setHex(0x06111f);','sky.material.uniforms.top.value.setHex(0x061827);'],
  ['sky.material.uniforms.hor.value.setHex(0x7d4b49);','sky.material.uniforms.hor.value.setHex(0x526676);'],
  ['sky.material.uniforms.low.value.setHex(0xf0bd77);c1.setHex(0x56432f);c2.setHex(0xa17c50);c3.setHex(0xd2ad72);c4.setHex(0xf4dfb3);','sky.material.uniforms.low.value.setHex(0xe9b16c);c1.setHex(0x66523a);c2.setHex(0xaa895c);c3.setHex(0xd6b97f);c4.setHex(0xf3dfb2);'],
  ['haze.setHex(0x9b785f);scene.background=haze;scene.fog.color.setHex(0xb98d68);scene.fog.density=.00038;','haze.setHex(0x8f8478);scene.background=haze;scene.fog.color.setHex(0xbca486);scene.fog.density=.00034;'],
  ['v18Basalt.color.setHex(0x070b10);','v18Basalt.color.setHex(0x05080d);v18Basalt.fog=false;'],
  ['v18WarmFace.color.setHex(0x2d2722);','v18WarmFace.color.setHex(0x17191c);v18WarmFace.fog=false;'],
  ['color:i%3===0?0x2e3132:i%3===1?0x393735:0x24292c','color:i%3===0?0x18232b:i%3===1?0x24313a:0x121b22']
];
for(const [a,b] of swaps){if(!html.includes(a))throw new Error('missing V19 blue-hour anchor: '+a);html=html.replace(a,b)}
fs.writeFileSync('v19.html',html);
console.log('Applied V19 blue-hour desert grade');
