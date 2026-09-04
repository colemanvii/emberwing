import fs from 'node:fs';
let html=fs.readFileSync('v19.html','utf8');
if(!html.includes('EMBERWING V19 // CINEMATIC LIGHT')) throw new Error('Expected V19 candidate');
const swaps=[
  ['smoothstep(.02,.72,h)','smoothstep(-.04,.46,h)'],
  ['const v18SunDir=new THREE.Vector3(-.7,.12,-.7).normalize();','const v18SunDir=new THREE.Vector3(-.5,.16,-.85).normalize();'],
  ['const gx=ship.position.x+f.x*1120+r.x*40,gz=ship.position.z+f.z*1120+r.z*40','const gx=ship.position.x+f.x*1520+r.x*520,gz=ship.position.z+f.z*1520+r.z*520'],
  ['v18Gate.rotation.y=Math.atan2(f.x,-f.z);','v18Gate.rotation.y=Math.atan2(f.x,-f.z)+.18;'],
  ['haze.setHex(0x9f7658);scene.background=haze;scene.fog.color.setHex(0xb0815f);scene.fog.density=.00054;','haze.setHex(0x9b785f);scene.background=haze;scene.fog.color.setHex(0xc29a74);scene.fog.density=.0005;'],
  ['sky.material.uniforms.hor.value.setHex(0xa25e40);','sky.material.uniforms.hor.value.setHex(0x7d4b49);'],
  ['sky.material.uniforms.low.value.setHex(0xf1c784);','sky.material.uniforms.low.value.setHex(0xf0bd77);c1.setHex(0x56432f);c2.setHex(0xa17c50);c3.setHex(0xd2ad72);c4.setHex(0xf4dfb3);'],
  ['sun.position.set(ship.position.x-820,ship.position.y+980,ship.position.z+620);','sun.position.set(ship.position.x-900,ship.position.y+720,ship.position.z-1450);'],
  ['const broad=.88+.12*(.5+.5*Math.sin(x*.0031+z*.0011));','const broad=.82+.18*(.5+.5*Math.sin(x*.0031+z*.0011));']
];
for(const [a,b] of swaps){if(!html.includes(a))throw new Error('missing V19 polish anchor: '+a);html=html.replace(a,b)}
fs.writeFileSync('v19.html',html);
console.log('Polished V19 composition, sky and desert material range');
