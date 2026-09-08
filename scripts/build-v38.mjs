import {readFileSync,writeFileSync} from 'node:fs';
let html=readFileSync(new URL('../v37.html',import.meta.url),'utf8');
const artStart=html.indexOf('setTimeout(()=>{const style=');
const artEnd=html.indexOf('const scene=new THREE.Scene()',artStart);
if(artStart<0||artEnd<0)throw Error('V37 source changed');
html=html.slice(0,artStart)+html.slice(artEnd);
html=html.replace('Emberwing V37 — No Country Above','Emberwing V38 — Distant Thunder');
html=html.replace('const size=3800,seg=150','const size=6400,seg=200');
html=html.replace('new THREE.Vector3(side*4.8,-.05,-7.4)','new THREE.Vector3(side*4.8,-.13,-2.5)');
html=html.replace('function updateCamera(dt){','function legacyCamera(dt){');
// The core remains pinned to V37; only the presentation and collision fixes below override it.
const world=readFileSync(new URL('../src/v38/world.js',import.meta.url),'utf8');
const camera=readFileSync(new URL('../src/v38/camera.js',import.meta.url),'utf8');
const controls=readFileSync(new URL('../src/v38/controls.js',import.meta.url),'utf8');
html=html.replace('const clock=new THREE.Clock();',world+'\n'+camera+'\n'+controls+'\nconst clock=new THREE.Clock();');
html=html.replace("reset();if(new URLSearchParams(location.search).get('realm')==='tempest')deployTempest();", "reset();const realm=new URLSearchParams(location.search).get('realm');if(realm==='tempest')deployTempest();if(realm==='alpine')deployAlpine();");
html=html.replace('turnAssist=(bank*.72+ri*.18)', 'turnAssist=(Math.asin(Math.sin(bank))*.72+ri*.18)');
// Never ease an aircraft up from below solid terrain.
html=html.replace('enemy.position.y=THREE.MathUtils.lerp(enemy.position.y,floor,1-Math.exp(-dt/.16))','enemy.position.y=floor');
html=html.replace("'ShiftRight','KeyX'", "'ShiftRight','KeyZ','KeyX'");
html=html.replace('↑↑ TURBO · R RESTART','Z BOOST · ↑↑ TURBO · R RESTART');
html=html.replace('updateFlight(dt);updateDanger(dt);','updateTouchFlight();updateFlight(dt);updateDanger(dt);');
html=html.replace('renderer.render(scene,camera);updateTargeting(dt);', 'renderer.render(scene,camera);updateFlightMetrics(rawDt);updateTargeting(dt);');
html=html.replace('ab=keys.ShiftLeft||keys.ShiftRight||turboBurst>0', 'ab=keys.KeyZ||keys.ShiftLeft||keys.ShiftRight||turboBurst>0');
html=html.replace('updateWeapons(dt);const shownTime','updateWeapons(dt);updateTouchLabels();const shownTime');
html=html.replace('</head>', '<link rel="stylesheet" href="src/v38/flight.css"></head>');
writeFileSync(new URL('../v38.html',import.meta.url),html);
console.log('Built V38 from the preserved V37 core.');
