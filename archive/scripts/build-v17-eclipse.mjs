import fs from 'node:fs';

let html = fs.readFileSync('v14.html','utf8');
if(!html.includes('EMBERWING V14 // standalone flatten of effective V12')) throw new Error('Expected V14 standalone baseline');
if(/document\.write\(|cdn\.jsdelivr\.net\/gh\/colemanvii\/emberwing@/i.test(html)) throw new Error('Refusing wrapper architecture');

html = html.replace('<!-- EMBERWING V14 // standalone flatten of effective V12 // zero gameplay changes -->','<!-- EMBERWING V17 // ECLIPSE // visual rewrite over protected V14 gameplay -->');
html = html.replace('<title>Emberwing V11</title>','<title>Emberwing V17</title>');

const headStyle = `
<style id="emberwing-v17-screen-language">
#grade{opacity:.78!important;background:
radial-gradient(circle at 72% 17%,rgba(255,224,154,.09),transparent 18%),
radial-gradient(ellipse at 50% 43%,transparent 0 48%,rgba(2,7,15,.16) 74%,rgba(1,4,9,.42) 100%)!important}
#hud:before,#hud:after{opacity:.12!important}
#mark{color:rgba(238,245,248,.42)!important}
#score{color:rgba(238,245,248,.28)!important}
#objective{color:rgba(244,247,248,.76)!important;letter-spacing:.32em!important}
#coach{min-width:290px!important;padding:8px 14px 7px!important;border:0!important;border-top:1px solid rgba(238,245,248,.18)!important;background:linear-gradient(90deg,transparent,rgba(3,10,18,.42),transparent)!important;box-shadow:none!important;backdrop-filter:none!important}
#coach small{opacity:.58!important}
#hint{opacity:.25!important;letter-spacing:.14em!important}
#focus{border:0!important;border-top:1px solid rgba(255,213,139,.28)!important;background:rgba(3,9,16,.18)!important;letter-spacing:.26em!important}
#capture{opacity:.2!important}
#target{filter:drop-shadow(0 0 4px rgba(0,0,0,.36))!important}
</style>`;
html = html.replace('</head>', headStyle+'\n</head>');

const clockAnchor='const clock=new THREE.Clock();';
if(!html.includes(clockAnchor)) throw new Error('V17 runtime anchor missing');

const v17 = String.raw`
// EMBERWING V17 // ECLIPSE
// A new visual language only. No flight/combat/collision tuning.

function v17RadialTexture(stops,size=512){
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),r=size*.5,gr=g.createRadialGradient(r,r,0,r,r,r);
  for(const [p,col] of stops)gr.addColorStop(p,col);g.fillStyle=gr;g.fillRect(0,0,size,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t
}
const v17GlowTex=v17RadialTexture([[0,'rgba(255,247,207,1)'],[.18,'rgba(255,213,125,.92)'],[.46,'rgba(255,158,74,.38)'],[.72,'rgba(255,123,55,.12)'],[1,'rgba(255,120,40,0)']]);
const v17CoreTex=v17RadialTexture([[0,'rgba(5,9,16,1)'],[.82,'rgba(5,9,16,1)'],[.9,'rgba(14,20,28,.98)'],[1,'rgba(14,20,28,0)']]);
const v17SunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:v17GlowTex,transparent:true,opacity:.92,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
const v17SunCore=new THREE.Sprite(new THREE.SpriteMaterial({map:v17CoreTex,transparent:true,opacity:.97,depthWrite:false,fog:false}));
v17SunGlow.scale.set(920,920,1);v17SunCore.scale.set(430,430,1);scene.add(v17SunGlow,v17SunCore);
const v17SunDir=new THREE.Vector3(-.72,.105,-.69).normalize();

const v17NeedleMat=new THREE.MeshStandardMaterial({color:0x0b1016,roughness:.96,metalness:.04,flatShading:true});
const v17NeedleEdge=new THREE.MeshStandardMaterial({color:0x58493c,roughness:.9,metalness:.02,flatShading:true});
const v17Needles=new THREE.Group();
for(let i=0;i<7;i++){
  const h=250+i*68+(i===3?250:0),w=38+i*7,m=new THREE.Mesh(new THREE.ConeGeometry(1,1,5,1),i===3?v17NeedleEdge:v17NeedleMat);
  m.scale.set(w,h,w*.5);m.position.set((i-3)*105,(h-500)*.18,(i%2?40:-45));m.rotation.y=i*.31;v17Needles.add(m)
}
scene.add(v17Needles);

function v17CloudTexture(seed=0){
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle=seed?'#b7c7d2':'#e7eef2';g.fillRect(0,0,512,512);
  for(let i=0;i<120;i++){const x=Math.random()*512,y=Math.random()*512,r=22+Math.random()*90,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,seed?'rgba(228,239,244,.76)':'rgba(255,255,255,.92)');gr.addColorStop(.56,'rgba(220,232,238,.32)');gr.addColorStop(1,'rgba(178,195,206,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(seed?8:6,seed?8:6);t.colorSpace=THREE.SRGBColorSpace;return t
}
const v17CloudTexA=v17CloudTexture(0),v17CloudTexB=v17CloudTexture(1);
const v17CloudA=new THREE.Mesh(new THREE.PlaneGeometry(7000,7000),new THREE.MeshBasicMaterial({map:v17CloudTexA,color:0xf7fbfd,transparent:true,opacity:.64,depthWrite:false,side:THREE.DoubleSide,fog:true}));
const v17CloudB=new THREE.Mesh(new THREE.PlaneGeometry(7000,7000),new THREE.MeshBasicMaterial({map:v17CloudTexB,color:0xbed1dc,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide,fog:true}));
for(const c of[v17CloudA,v17CloudB]){c.rotation.x=-Math.PI/2;c.visible=false;c.renderOrder=-1;scene.add(c)}

const v17AlpineSpine=new THREE.Group(),v17SpineMat=new THREE.MeshStandardMaterial({color:0x071018,roughness:.98,flatShading:true}),v17SpineSnow=new THREE.MeshStandardMaterial({color:0xaabcc6,roughness:.9,flatShading:true});
for(let i=0;i<9;i++){const main=i===4,h=main?840:280+Math.random()*330,w=main?135:52+Math.random()*55,m=new THREE.Mesh(crag(),main?v17SpineSnow:v17SpineMat);m.scale.set(w,h,w*(.32+Math.random()*.2));m.position.set((i-4)*72,(h-620)*.12,(i%2?48:-38));m.rotation.y=(i-4)*.13;v17AlpineSpine.add(m)}
v17AlpineSpine.visible=false;scene.add(v17AlpineSpine);

const v17TrailGeo=new THREE.CylinderGeometry(1,1,1,6,1,true),v17Trails=[];let v17TrailPrev=null,v17TrailClock=0;
function v17TrailColor(){return enemyRole==='ROOKIE'?0xa9b5ba:enemyRole==='SKIMMER'?0x69dfff:enemyRole==='CLIMBER'?0xffb66b:0xe9fbff}
function v17DropTrail(){const s=v17Trails.shift();if(!s)return;scene.remove(s.mesh);s.mesh.material.dispose()}
function v17SpawnTrail(a,b){const d=b.clone().sub(a),len=d.length();if(len<1)return;const mat=new THREE.MeshBasicMaterial({color:v17TrailColor(),transparent:true,opacity:.24,depthWrite:false,blending:THREE.AdditiveBlending}),m=new THREE.Mesh(v17TrailGeo,mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(worldUp,d.normalize());m.scale.set(.55,len,.55);scene.add(m);v17Trails.push({mesh:m,life:4.8,max:4.8});while(v17Trails.length>14)v17DropTrail()}
function v17UpdateTrails(dt){for(let i=v17Trails.length-1;i>=0;i--){const s=v17Trails[i];s.life-=dt;const q=Math.max(0,s.life/s.max);s.mesh.material.opacity=.24*q*q;s.mesh.scale.x=s.mesh.scale.z=.55+(1-q)*.55;if(s.life<=0){scene.remove(s.mesh);s.mesh.material.dispose();v17Trails.splice(i,1)}}if(!enemyAlive){v17TrailPrev=null;v17TrailClock=0;return}const p=enemy.position.clone();if(!v17TrailPrev||p.distanceToSquared(v17TrailPrev)>220*220){v17TrailPrev=p;v17TrailClock=.24;return}v17TrailClock-=dt;if(v17TrailClock<=0){v17SpawnTrail(v17TrailPrev,p);v17TrailPrev=p;v17TrailClock=.28}}

let v17Mode=-1,v17Anchored=false;
function v17SetPalette(alpine){
  if(alpine){
    haze.setHex(0x94b5c8);scene.background=haze;scene.fog.color.copy(haze);scene.fog.density=.00056;
    sky.material.uniforms.top.value.setHex(0x02091a);sky.material.uniforms.hor.value.setHex(0x6f9ab7);sky.material.uniforms.low.value.setHex(0xf2f7fa);sky.material.uniforms.sunCol.value.setHex(0xeef8ff);
    c1.setHex(0x0b151e);c2.setHex(0x304551);c3.setHex(0x8096a1);c4.setHex(0xecf2f4);
    rockMat.color.setHex(0x1c2931);sandMat.color.setHex(0x718892);cityDarkMat.color.setHex(0x253540);peakDarkMat.color.setHex(0x08131a);peakMat.color.setHex(0x293e49);peakLightMat.color.setHex(0xa9bec7);farRidgeMat.color.setHex(0x4c6470);
    hemi.color.setHex(0xe7f5ff);hemi.groundColor.setHex(0x0b151d);sun.color.setHex(0xdff3ff);renderer.toneMappingExposure=1.15;
    v17SunGlow.material.color.setHex(0xdff5ff);v17SunGlow.material.opacity=.68;v17SunCore.material.opacity=.98;v17Needles.visible=false;v17AlpineSpine.visible=true;v17CloudA.visible=true;v17CloudB.visible=true
  }else{
    haze.setHex(0x98765f);scene.background=haze;scene.fog.color.copy(haze);scene.fog.density=.00058;
    sky.material.uniforms.top.value.setHex(0x020611);sky.material.uniforms.hor.value.setHex(0x8a5144);sky.material.uniforms.low.value.setHex(0xe7bd83);sky.material.uniforms.sunCol.value.setHex(0xffd38d);
    c1.setHex(0x12171d);c2.setHex(0x403832);c3.setHex(0x8d7356);c4.setHex(0xe7d09e);
    rockMat.color.setHex(0x20252a);sandMat.color.setHex(0x9d8567);cityDarkMat.color.setHex(0x2b3036);peakDarkMat.color.setHex(0x11171c);peakMat.color.setHex(0x4d4740);peakLightMat.color.setHex(0x9d8b70);farRidgeMat.color.setHex(0x4c4f50);
    hemi.color.setHex(0xffe2b0);hemi.groundColor.setHex(0x10161d);sun.color.setHex(0xffc979);renderer.toneMappingExposure=1.08;
    v17SunGlow.material.color.setHex(0xffb65d);v17SunGlow.material.opacity=.94;v17SunCore.material.opacity=.97;v17Needles.visible=true;v17AlpineSpine.visible=false;v17CloudA.visible=false;v17CloudB.visible=false
  }
  rebuildTerrain(tcx,tcz)
}
function v17PlaceAnchors(){
  const f=heading().clone(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize();
  const nx=ship.position.x+f.x*1450+r.x*780,nz=ship.position.z+f.z*1450+r.z*780;v17Needles.position.set(nx,terrainHeight(nx,nz)+315,nz);v17Needles.rotation.y=Math.atan2(f.x,-f.z)-.22;
  const ax=ship.position.x+f.x*1320-r.x*520,az=ship.position.z+f.z*1320-r.z*520;v17AlpineSpine.position.set(ax,terrainHeight(ax,az)+340,az);v17AlpineSpine.rotation.y=Math.atan2(f.x,-f.z)+.12;
  v17Anchored=true
}
function v17Frame(dt){
  const alpine=!!worldIndex;if(v17Mode!==+alpine){v17Mode=+alpine;v17SetPalette(alpine)}if(!v17Anchored)v17PlaceAnchors();
  const base=ship.position.clone().addScaledVector(v17SunDir,2450);base.y=ship.position.y+(alpine?510:360);v17SunGlow.position.copy(base);v17SunCore.position.copy(base).addScaledVector(v17SunDir,-2);
  if(alpine){const y=ship.position.y-88;v17CloudA.position.set(ship.position.x,y,ship.position.z);v17CloudB.position.set(ship.position.x,y-28,ship.position.z);const t=performance.now()*.000004;v17CloudTexA.offset.set(t%1,(t*.61)%1);v17CloudTexB.offset.set((-t*.52)%1,(t*.35)%1)}
  v17UpdateTrails(dt)
}
const v17EnemyBase=updateEnemy;updateEnemy=function(dt){v17EnemyBase(dt);v17Frame(dt)};
const v17ResetBase=reset;reset=function(){v17ResetBase();while(v17Trails.length)v17DropTrail();v17TrailPrev=null;v17TrailClock=0;v17Anchored=false;v17Mode=-1;v17PlaceAnchors();v17SetPalette(!!worldIndex)};
window.__emberwingV17={snapshot:()=>({title:document.title,mode:worldIndex?'alpine':'desert',sun:true,needles:v17Needles.children.length,spine:v17AlpineSpine.children.length,clouds:[v17CloudA.visible,v17CloudB.visible],trails:v17Trails.length})};
`;

html = html.replace(clockAnchor, v17+'\n'+clockAnchor);
fs.writeFileSync('v17.html',html);
console.log(`Built v17.html (${html.length.toLocaleString()} bytes)`);
