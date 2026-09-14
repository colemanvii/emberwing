import fs from 'node:fs';

let html = fs.readFileSync('v14.html','utf8');
if(!html.includes('EMBERWING V14 // standalone flatten of effective V12')) throw new Error('Expected V14 standalone baseline');
if(/document\.write\(|cdn\.jsdelivr\.net\/gh\/colemanvii\/emberwing@/i.test(html)) throw new Error('Refusing wrapper architecture');

function swap(oldText,newText,label){
  if(!html.includes(oldText)) throw new Error(`V18 anchor missing: ${label}`);
  html=html.replace(oldText,newText);
}

swap('<!-- EMBERWING V14 // standalone flatten of effective V12 // zero gameplay changes -->','<!-- EMBERWING V18 // ART REBUILD // protected V14 gameplay, rebuilt world composition -->','marker');
swap('<title>Emberwing V11</title>','<title>Emberwing V18</title>','title');

// Remove the old prop-soup world at source. V18 rebuilds the visible world from zero.
swap('for(let i=0;i<135;i++){const h=5+Math.random()*26','for(let i=0;i<0;i++){const h=5+Math.random()*26','rocks');
swap('for(let i=0;i<70;i++){const m=makeCityTower()','for(let i=0;i<0;i++){const m=makeCityTower()','city');
swap('for(let i=0;i<20;i++){const h=35+Math.random()*55','for(let i=0;i<0;i++){const h=35+Math.random()*55','towers');
swap('for(let i=0;i<34;i++){const m=makeMountain()','for(let i=0;i<0;i++){const m=makeMountain()','mountains');
swap('for(let i=0;i<16;i++){const m=makeDistantRidge()','for(let i=0;i<0;i++){const m=makeDistantRidge()','distant ridges');

// Replace the noisy terrain heightfield with broad continental forms.
const terrainStart='let alpineTerrain=false;function terrainHeight(x,z){';
const terrainEnd='const size=3800';
const a=html.indexOf(terrainStart), b=html.indexOf(terrainEnd,a);
if(a<0||b<0) throw new Error('terrain block anchors missing');
const terrainBlock=`let alpineTerrain=false;function terrainHeight(x,z){if(alpineTerrain){const broad=Math.sin(x*.00118)*14+Math.cos(z*.00104)*12+Math.sin((x+z)*.00062)*9,shelf=Math.pow(Math.max(0,Math.sin((x-z)*.00105)),2)*28;return broad+shelf-138}const dune=Math.sin(x*.00105+Math.sin(z*.00048)*1.55)*13,cross=Math.sin((x+z)*.00072)*7,basin=Math.cos(z*.00063)*5;return dune+cross+basin-61}\n`;
html=html.slice(0,a)+terrainBlock+html.slice(b);

// New palettes: vast bone desert and cold graphite alpine.
swap('const c1=new THREE.Color(0x43282d),c2=new THREE.Color(0x8f4639),c3=new THREE.Color(0xc86a43),c4=new THREE.Color(0xf3c282)','const c1=new THREE.Color(0x26221f),c2=new THREE.Color(0x6e5d4a),c3=new THREE.Color(0xb5966a),c4=new THREE.Color(0xead6a7)','terrain colors');
swap('const scene=new THREE.Scene(),haze=new THREE.Color(0xb8745d)','const scene=new THREE.Scene(),haze=new THREE.Color(0x8b7562)','haze');
swap('top:{value:new THREE.Color(0x161522)},hor:{value:new THREE.Color(0xb35f4b)},low:{value:new THREE.Color(0xf1ad74)}','top:{value:new THREE.Color(0x020713)},hor:{value:new THREE.Color(0x8c604d)},low:{value:new THREE.Color(0xe7c98e)}','sky palette');
swap('scene.fog=new THREE.FogExp2(haze,.00082)','scene.fog=new THREE.FogExp2(haze,.0005)','fog');

const headStyle=`\n<style id="emberwing-v18-art-language">\n#grade{opacity:.62!important;background:radial-gradient(ellipse at 50% 42%,transparent 0 54%,rgba(2,6,12,.12) 76%,rgba(1,3,7,.42) 100%)!important}\n#hud:before,#hud:after{display:none!important}\n#mark{opacity:.34!important;letter-spacing:.32em!important}\n#score{opacity:.42!important}\n#readout{opacity:.48!important;border-left:0!important}\n#objective{left:50%!important;transform:translateX(-50%)!important;padding:0!important;letter-spacing:.32em!important;text-align:center!important}\n#objective:before,#objective:after{display:none!important}\n#coach{min-width:280px!important;border:0!important;border-top:1px solid rgba(247,251,253,.13)!important;background:linear-gradient(90deg,transparent,rgba(3,8,14,.28),transparent)!important;box-shadow:none!important;backdrop-filter:none!important;padding:8px 14px 7px!important}\n#coach small{opacity:.48!important}\n#hint{opacity:.22!important}\n#focus{border:0!important;border-top:1px solid rgba(255,217,151,.24)!important;background:rgba(3,8,14,.14)!important;letter-spacing:.28em!important}\n#capture{opacity:.18!important}\n</style>`;
html=html.replace('</head>',headStyle+'\n</head>');

const clockAnchor='const clock=new THREE.Clock();';
if(!html.includes(clockAnchor)) throw new Error('V18 runtime anchor missing');

const v18=String.raw`
// EMBERWING V18 // ART REBUILD
// Keep the V14 combat core. Rebuild what the eye sees.

// The old V11 hero is explicitly retired in this art direction.
v11Hero.visible=false;

function v18RadialTexture(stops,size=512){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),r=size*.5,gr=g.createRadialGradient(r,r,0,r,r,r);for(const [p,col] of stops)gr.addColorStop(p,col);g.fillStyle=gr;g.fillRect(0,0,size,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const v18SunGlowTex=v18RadialTexture([[0,'rgba(255,244,206,1)'],[.16,'rgba(255,211,127,.95)'],[.42,'rgba(255,160,75,.45)'],[.72,'rgba(255,126,55,.13)'],[1,'rgba(255,120,40,0)']]);
const v18SunCoreTex=v18RadialTexture([[0,'rgba(255,235,184,1)'],[.72,'rgba(255,212,135,.98)'],[.9,'rgba(255,180,90,.65)'],[1,'rgba(255,170,80,0)']]);
const v18SunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:v18SunGlowTex,transparent:true,opacity:.94,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
const v18SunCore=new THREE.Sprite(new THREE.SpriteMaterial({map:v18SunCoreTex,transparent:true,opacity:.98,depthWrite:false,fog:false}));
v18SunGlow.scale.set(1080,1080,1);v18SunCore.scale.set(310,310,1);scene.add(v18SunGlow,v18SunCore);
const v18SunDir=new THREE.Vector3(-.7,.12,-.7).normalize();

// DESERT: two giant blade-mesas form a cathedral-sized split in the horizon.
const v18Gate=new THREE.Group();
const v18Basalt=new THREE.MeshStandardMaterial({color:0x11161b,roughness:.98,metalness:.02,flatShading:true});
const v18WarmFace=new THREE.MeshStandardMaterial({color:0x6b5948,roughness:.96,metalness:.01,flatShading:true});
function v18Blade(side){const g=new THREE.Group(),main=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,5,1),v18Basalt),face=new THREE.Mesh(new THREE.BoxGeometry(18,520,160),v18WarmFace);main.scale.set(175,690,145);main.rotation.z=side*.09;face.position.set(side*-110,18,22);face.rotation.z=side*.08;g.add(main,face);g.position.set(side*330,300,0);return g}
v18Gate.add(v18Blade(-1),v18Blade(1));
const v18Shard=new THREE.Mesh(new THREE.BoxGeometry(350,72,135),v18WarmFace);v18Shard.position.set(145,585,-20);v18Shard.rotation.z=-.24;v18Gate.add(v18Shard);scene.add(v18Gate);

const v18GateProxies=[];for(const side of[-1,1]){const p=new THREE.Object3D();p.userData.fixedLandmark=true;p.userData.v18Hero=true;p.userData.mountain=true;p.userData.collisionR=118;p.userData.collisionH=275;scene.add(p);scenery.push(p);v18GateProxies.push({p,side})}

// Horizon silhouettes follow the player like a painted continental backdrop.
const v18Horizon=new THREE.Group(),v18HorizonMat=new THREE.MeshBasicMaterial({color:0x25292b,fog:true});
for(let i=0;i<7;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,5,1),v18HorizonMat),a=i/7*Math.PI*2+.26,r=2100+(i%2)*220;m.scale.set(460+(i%3)*120,140+(i%4)*40,210+(i%2)*70);m.position.set(Math.cos(a)*r,30+(i%3)*18,Math.sin(a)*r);m.rotation.y=a*.7;m.rotation.z=(i%2?.04:-.04);v18Horizon.add(m)}scene.add(v18Horizon);

// ALPINE: no snowfield. A cloud ocean and a single black granite continent.
function v18CloudTexture(seed=0){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle=seed?'#b9c9d3':'#e9f0f3';g.fillRect(0,0,512,512);for(let i=0;i<120;i++){const x=Math.random()*512,y=Math.random()*512,r=24+Math.random()*92,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,seed?'rgba(225,238,244,.78)':'rgba(255,255,255,.94)');gr.addColorStop(.55,'rgba(219,231,237,.34)');gr.addColorStop(1,'rgba(173,192,203,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(seed?8:6,seed?8:6);t.colorSpace=THREE.SRGBColorSpace;return t}
const v18CloudTexA=v18CloudTexture(0),v18CloudTexB=v18CloudTexture(1);
const v18CloudA=new THREE.Mesh(new THREE.PlaneGeometry(8200,8200),new THREE.MeshBasicMaterial({map:v18CloudTexA,color:0xf8fbfd,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide,fog:true}));
const v18CloudB=new THREE.Mesh(new THREE.PlaneGeometry(8200,8200),new THREE.MeshBasicMaterial({map:v18CloudTexB,color:0xb8ccd7,transparent:true,opacity:.31,depthWrite:false,side:THREE.DoubleSide,fog:true}));
for(const c of[v18CloudA,v18CloudB]){c.rotation.x=-Math.PI/2;c.visible=false;c.renderOrder=-1;scene.add(c)}

const v18Spine=new THREE.Group(),v18SpineMat=new THREE.MeshStandardMaterial({color:0x071019,roughness:.99,metalness:.01,flatShading:true}),v18SnowMat=new THREE.MeshStandardMaterial({color:0xb7c8d0,roughness:.94,flatShading:true});
for(let i=0;i<11;i++){const main=i===5,h=main?980:310+Math.random()*430,w=main?155:58+Math.random()*65,m=new THREE.Mesh(crag(),main?v18SnowMat:v18SpineMat);m.scale.set(w,h,w*(.28+Math.random()*.22));m.position.set((i-5)*84,(h-700)*.12,(i%2?58:-42));m.rotation.y=(i-5)*.11;v18Spine.add(m)}v18Spine.visible=false;scene.add(v18Spine);
const v18SpineProxies=[];for(let i=0;i<5;i++){const p=new THREE.Object3D();p.userData.fixedLandmark=true;p.userData.v18Hero=true;p.userData.mountain=true;p.userData.collisionR=72+(i===2?28:0);p.userData.collisionH=220+(i===2?130:0);p.visible=false;scene.add(p);scenery.push(p);v18SpineProxies.push({p,x:(i-2)*92,y:i===2?290:150,z:i%2?30:-24})}

const v18PlaceBase=place;place=function(m,initial=false,alpine=false){if(m.userData.fixedLandmark)return;return v18PlaceBase(m,initial,alpine)};

let v18Anchored=false,v18Mode=-1;
function v18PlaceWorld(){const f=heading().clone(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize();const gx=ship.position.x+f.x*1120+r.x*40,gz=ship.position.z+f.z*1120+r.z*40,gy=terrainHeight(gx,gz)+6;v18Gate.position.set(gx,gy,gz);v18Gate.rotation.y=Math.atan2(f.x,-f.z);v18Gate.updateMatrixWorld(true);for(const c of v18GateProxies){const q=v18Gate.localToWorld(new THREE.Vector3(c.side*330,300,0));c.p.position.copy(q)}const sx=ship.position.x+f.x*1380-r.x*430,sz=ship.position.z+f.z*1380-r.z*430;v18Spine.position.set(sx,terrainHeight(sx,sz)+360,sz);v18Spine.rotation.y=Math.atan2(f.x,-f.z)+.1;v18Spine.updateMatrixWorld(true);for(const c of v18SpineProxies){const q=v18Spine.localToWorld(new THREE.Vector3(c.x,c.y,c.z));c.p.position.copy(q)}v18Anchored=true}

function v18ApplyTheme(alpine){if(alpine){haze.setHex(0x91adbd);scene.background=haze;scene.fog.color.copy(haze);scene.fog.density=.00048;sky.material.uniforms.top.value.setHex(0x01091a);sky.material.uniforms.hor.value.setHex(0x6f98b0);sky.material.uniforms.low.value.setHex(0xf1f6f8);sky.material.uniforms.sunCol.value.setHex(0xe9f5ff);c1.setHex(0x0b141b);c2.setHex(0x2f434e);c3.setHex(0x7c919b);c4.setHex(0xecf2f4);hemi.color.setHex(0xeaf7ff);hemi.groundColor.setHex(0x0a141b);sun.color.setHex(0xdff2ff);sun.intensity=5.2;renderer.toneMappingExposure=1.14;speedMat.color.setHex(0xdff8ff);v18SunGlow.material.color.setHex(0xcfefff);v18SunGlow.material.opacity=.68;v18SunCore.material.color.setHex(0xf5fbff);v18Gate.visible=false;v18Horizon.visible=false;v18Spine.visible=true;v18CloudA.visible=true;v18CloudB.visible=true;for(const c of v18GateProxies)c.p.visible=false;for(const c of v18SpineProxies)c.p.visible=true;snow.visible=false}else{haze.setHex(0x8b7562);scene.background=haze;scene.fog.color.copy(haze);scene.fog.density=.0005;sky.material.uniforms.top.value.setHex(0x020713);sky.material.uniforms.hor.value.setHex(0x8c604d);sky.material.uniforms.low.value.setHex(0xe7c98e);sky.material.uniforms.sunCol.value.setHex(0xffd497);c1.setHex(0x26221f);c2.setHex(0x6e5d4a);c3.setHex(0xb5966a);c4.setHex(0xead6a7);hemi.color.setHex(0xffe7bd);hemi.groundColor.setHex(0x151719);sun.color.setHex(0xffc873);sun.intensity=6.0;renderer.toneMappingExposure=1.08;speedMat.color.setHex(0xffe8bd);v18SunGlow.material.color.setHex(0xffb55c);v18SunGlow.material.opacity=.94;v18SunCore.material.color.setHex(0xffe0a0);v18Gate.visible=true;v18Horizon.visible=true;v18Spine.visible=false;v18CloudA.visible=false;v18CloudB.visible=false;for(const c of v18GateProxies)c.p.visible=true;for(const c of v18SpineProxies)c.p.visible=false;snow.visible=false}rebuildTerrain(tcx,tcz);v11Hero.visible=false}

const v18ThemeBase=setWorldTheme;setWorldTheme=function(alpine){v18ThemeBase(alpine);v18Mode=+alpine;v18ApplyTheme(alpine)};
const v18WorldBase=updateWorld;updateWorld=function(){v18WorldBase();v11Hero.visible=false;snow.visible=false;if(!v18Anchored)v18PlaceWorld();const alpine=!!worldIndex;if(v18Mode!==+alpine){v18Mode=+alpine;v18ApplyTheme(alpine)}const sunPos=ship.position.clone().addScaledVector(v18SunDir,2450);sunPos.y=ship.position.y+(alpine?520:390);v18SunGlow.position.copy(sunPos);v18SunCore.position.copy(sunPos).addScaledVector(v18SunDir,-2);v18Horizon.position.set(ship.position.x,0,ship.position.z);if(alpine){const y=ship.position.y-92;v18CloudA.position.set(ship.position.x,y,ship.position.z);v18CloudB.position.set(ship.position.x,y-34,ship.position.z);const t=performance.now()*.000004;v18CloudTexA.offset.set(t%1,(t*.57)%1);v18CloudTexB.offset.set((-t*.45)%1,(t*.31)%1)}};
const v18ResetBase=reset;reset=function(){v18ResetBase();v18Anchored=false;v18Mode=+!!worldIndex;v18PlaceWorld();v18ApplyTheme(!!worldIndex)};
const v18DeployBase=deployAlpine;deployAlpine=function(){v18DeployBase();v18Anchored=false;v18PlaceWorld();v18ApplyTheme(true)};

window.__emberwingV18={snapshot:()=>({title:document.title,mode:worldIndex?'alpine':'desert',sceneryCount:scenery.length,gate:v18Gate.visible,gateParts:v18Gate.children.length,horizon:v18Horizon.visible,horizonParts:v18Horizon.children.length,clouds:[v18CloudA.visible,v18CloudB.visible],spine:v18Spine.visible,spineParts:v18Spine.children.length,legacyHero:v11Hero.visible})};
`;

html=html.replace(clockAnchor,v18+'\n'+clockAnchor);
fs.writeFileSync('v18.html',html);
console.log(`Built v18.html (${html.length.toLocaleString()} bytes)`);
