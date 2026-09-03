const BASE_INDEX='https://raw.githubusercontent.com/colemanvii/emberwing/bac7ff82424b2d85a76b86a23ad62617996dc94c/index.html';
const BASELINE_V3='https://raw.githubusercontent.com/colemanvii/emberwing/7562a71d10468304675ed507e65ed77347e092b1/v3.html';

async function text(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.text();
}
function replaceExact(src,from,to,label=from.slice(0,48)){
  if(!src.includes(from))throw new Error(`Missing patch anchor: ${label}`);
  return src.replace(from,to);
}

const [base,wrapper]=await Promise.all([text(BASE_INDEX),text(BASELINE_V3)]);

const patchMarker='const patches=';
const patchStart=wrapper.indexOf(patchMarker);
if(patchStart<0)throw new Error('Baseline V3 patch array not found');
const patchBodyStart=patchStart+patchMarker.length;
const patchBodyEnd=wrapper.indexOf(';for(const [from,to] of patches)',patchBodyStart);
if(patchBodyEnd<0)throw new Error('Baseline V3 patch array terminator not found');
const patchSource=wrapper.slice(patchBodyStart,patchBodyEnd);
const patches=Function(`"use strict";return (${patchSource})`)();
if(!Array.isArray(patches)||!patches.length)throw new Error('Baseline V3 patch array invalid');

const hudMarker='const hud3333=`';
const hudStart=wrapper.indexOf(hudMarker);
const hudEnd=wrapper.indexOf('`;\nhtml=html.replace(\'</head><body>\'',hudStart);
if(hudStart<0||hudEnd<0)throw new Error('HUD 3333 block not found');
const hud3333=wrapper.slice(hudStart+hudMarker.length,hudEnd);

const opsMarker='const opsRuntime=`';
const opsStart=wrapper.indexOf(opsMarker);
const opsEnd=wrapper.indexOf('`;\nhtml=html.replace(\'</body>\'',opsStart);
if(opsStart<0||opsEnd<0)throw new Error('V3 runtime block not found');
const opsRuntime=wrapper.slice(opsStart+opsMarker.length,opsEnd);

let html=base;
for(const [from,to] of patches){
  if(!html.includes(from))throw new Error(`Baseline patch refused: ${from.slice(0,70)}`);
  html=html.replace(from,to);
}

const beauty=[
  ['scene.fog=new THREE.FogExp2(haze,.00094)','scene.fog=new THREE.FogExp2(haze,.00082)'],
  ['renderer.toneMappingExposure=1.13','renderer.toneMappingExposure=1.06'],
  ['top:{value:new THREE.Color(0x20172f)},hor:{value:new THREE.Color(0xbb684f)},low:{value:new THREE.Color(0xf2aa68)}','top:{value:new THREE.Color(0x161522)},hor:{value:new THREE.Color(0xb35f4b)},low:{value:new THREE.Color(0xf1ad74)}'],
  ['scene.fog.density=alpine?.00112:.00094','scene.fog.density=alpine?.00092:.00082'],
  ['haze.setHex(alpine?0xaec5cf:0xb8745d)','haze.setHex(alpine?0x9fb7c2:0xad6855)'],
  ['sky.material.uniforms.top.value.setHex(alpine?0x344f67:0x20172f);sky.material.uniforms.hor.value.setHex(alpine?0x91aebb:0xbb684f);sky.material.uniforms.low.value.setHex(alpine?0xe6eef1:0xf2aa68)','sky.material.uniforms.top.value.setHex(alpine?0x21384d:0x161522);sky.material.uniforms.hor.value.setHex(alpine?0x809da9:0xb35f4b);sky.material.uniforms.low.value.setHex(alpine?0xdce7ea:0xf1ad74)'],
  ['hull=new THREE.MeshStandardMaterial({color:enemy?0x11161c:0x242a2f,roughness:enemy?.32:.24,metalness:enemy?.55:.78}),wing=new THREE.MeshStandardMaterial({color:enemy?0x1d252d:0x4c555a,roughness:enemy?.43:.3,metalness:enemy?.4:.65})','hull=new THREE.MeshStandardMaterial({color:enemy?0x11161c:0x151b21,roughness:enemy?.32:.2,metalness:enemy?.55:.86}),wing=new THREE.MeshStandardMaterial({color:enemy?0x1d252d:0x38434a,roughness:enemy?.43:.26,metalness:enemy?.4:.72})'],
  ['color:enemy?0x071117:0x03131d,metalness:enemy?.8:.92,roughness:enemy?.1:.06','color:enemy?0x071117:0x061820,metalness:enemy?.8:.96,roughness:enemy?.1:.045'],
  ['snow.material.opacity=.6+burner*.18;snow.material.size=1.05+burner*.35','snow.material.opacity=.46+burner*.12;snow.material.size=.9+burner*.26'],
  ['speedMat.opacity=.045+thrust*.26+burner*.045','speedMat.opacity=.03+thrust*.18+burner*.035']
];
for(const [from,to] of beauty)html=replaceExact(html,from,to,'beauty');

html=replaceExact(html,'</head><body>',hud3333+'</head><body>','HUD injection');
html=html
  .replaceAll('EMBERWING / FIRST FLIGHT','EMBERWING // DESERT NODE')
  .replaceAll('EMBERWING / ALPINE INTERCEPT','EMBERWING // ALPINE NODE')
  .replaceAll('BANDITS','HOSTILES')
  .replaceAll('CLICK TO TAKE CONTROL','ENGAGE FLIGHT CONTROL')
  .replaceAll('MISSION COMPLETE','MISSION // COMPLETE')
  .replaceAll('BANDIT AHEAD','HOSTILE CONTACT');
html=replaceExact(html,'</body>',opsRuntime+'</body>','runtime injection');

html=replaceExact(html,
  '#hud{font-family:var(--hs);text-shadow:none;color:var(--h);mix-blend-mode:screen}#grade{opacity:.48}',
  '#hud{font-family:var(--hs);text-shadow:none;color:var(--h);mix-blend-mode:screen}#grade{opacity:.34}',
  'monk grade');
html=replaceExact(html,
  'width:20px;opacity:.55;background:repeating-linear-gradient',
  'width:20px;opacity:.38;background:repeating-linear-gradient',
  'monk rails');
html=replaceExact(html,
  '#mark:before{content:"EW-03";display:inline-block;margin-right:9px;color:rgba(247,251,253,.72);letter-spacing:.18em}',
  '#mark:before{content:"•  EW-03";display:inline-block;margin-right:9px;color:#ffc66f;letter-spacing:.18em;animation:havenPulse 2.8s ease-in-out infinite}',
  'Haven pulse');
html=replaceExact(html,
  '@media(max-width:900px)',
  '@keyframes havenPulse{0%,100%{opacity:.46}50%{opacity:1}}@media(max-width:900px)',
  'Haven keyframes');
html=html.replace('<title>Emberwing — First Flight</title>','<title>Emberwing V3</title>');
html=html.replace('<!doctype html>','<!doctype html>\n<!-- EMBERWING V3 // standalone snapshot // generated from accepted pinned flight core -->');

const forbidden=['<iframe id="game"','frame.srcdoc','document.write(src)','@7562a71d10468304675ed507e65ed77347e092b1/v3.html'];
for(const token of forbidden)if(html.includes(token))throw new Error(`Standalone validation failed: ${token}`);
const required=['acePhase=\'ATTACK\'','windGain','havenPulse','0x161522','HOLD Z BURNER','SKIMMER','CLIMBER','ACE'];
for(const token of required)if(!html.includes(token))throw new Error(`Standalone validation missing: ${token}`);

const {writeFile}=await import('node:fs/promises');
await writeFile('v3.html',html,'utf8');
console.log(`Flattened V3: ${html.length} bytes, ${patches.length} accepted gameplay/HUD patches + ${beauty.length} beauty patches`);
