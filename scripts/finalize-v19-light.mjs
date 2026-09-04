import fs from 'node:fs';
let html=fs.readFileSync('v19.html','utf8');
if(!html.includes('EMBERWING V19 // CINEMATIC LIGHT')) throw new Error('Expected V19 candidate');
const swaps=[
  ['haze.setHex(0x9b785f);scene.background=haze;scene.fog.color.setHex(0xc29a74);scene.fog.density=.0005;','haze.setHex(0x9b785f);scene.background=haze;scene.fog.color.setHex(0xb98d68);scene.fog.density=.00038;'],
  ['sun.intensity=7.1;sun.color.setHex(0xffc879);','sun.intensity=5.45;sun.color.setHex(0xffc879);'],
  ['v19Fill.color.setHex(0xffbd77);v19Fill.intensity=.58;','v19Fill.color.setHex(0xffbd77);v19Fill.intensity=.36;'],
  ['v18Basalt.color.setHex(0x11171d);','v18Basalt.color.setHex(0x070b10);'],
  ['v18WarmFace.color.setHex(0x715943);','v18WarmFace.color.setHex(0x2d2722);'],
  ['v18SunGlow.scale.set(760,760,1);v18SunCore.scale.set(190,190,1);','v18SunGlow.scale.set(690,690,1);v18SunCore.scale.set(160,160,1);']
];
for(const [a,b] of swaps){if(!html.includes(a))throw new Error('missing final V19 anchor: '+a);html=html.replace(a,b)}
const hook='window.__emberwingV19={snapshot:';
if(!html.includes(hook))throw new Error('V19 hook anchor missing');
const extra=`const v19CameraKey=new THREE.DirectionalLight(0xffdfb8,.38);scene.add(v19CameraKey);scene.add(v19CameraKey.target);ship.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial){o.material.roughness=Math.min(o.material.roughness??.4,.3);o.material.metalness=Math.max(o.material.metalness??0,.55)}});const v19LitWorld=updateWorld;updateWorld=function(){v19LitWorld();v19CameraKey.position.copy(camera.position).add(new THREE.Vector3(0,80,40));v19CameraKey.target.position.copy(ship.position)};\n`;
html=html.replace(hook,extra+hook);
fs.writeFileSync('v19.html',html);
console.log('Finalized V19 light contrast and aircraft key light');
