import fs from 'node:fs';
let html=fs.readFileSync('v16.html','utf8');
function swap(a,b,label){if(!html.includes(a))throw new Error(`V16 finalizer anchor missing: ${label}`);html=html.replace(a,b)}
swap('scene.fog.density=.00061','scene.fog.density=.00038','clear desert atmosphere');
swap('f.x*1750+r.x*35','f.x*1600+r.x*25','ring distance x');
swap('f.z*1750+r.z*35','f.z*1600+r.z*25','ring distance z');
swap('terrainHeight(cx,cz)+345','terrainHeight(cx,cz)+465','ring horizon height');
swap('color:0xa3724e','color:0xb88458','ring rim contrast');
const clock='const clock=new THREE.Clock();';
if(!html.includes(clock))throw new Error('V16 finalizer clock missing');
const sparse=String.raw`
// V16 composition discipline // remove yesterday's procedural clutter from the image.
const v16OriginalScenery=scenery.filter(m=>!m.userData.fixedLandmark);let v16MountainN=0,v16SmallN=0;
for(const m of v16OriginalScenery){if(m.userData.city)m.userData.v16Suppress=true;else if(m.userData.mountain)m.userData.v16Suppress=(v16MountainN++%3)!==0;else m.userData.v16Suppress=(v16SmallN++%7)!==0}
const v16SparseWorldBase=updateWorld;updateWorld=function(){v16SparseWorldBase();for(const m of v16OriginalScenery)if(m.userData.v16Suppress)m.visible=false};
`;
html=html.replace(clock,sparse+'\n'+clock);fs.writeFileSync('v16.html',html);console.log('Applied sparse monumental V16 composition');
