import fs from 'node:fs';

let html = fs.readFileSync('v14.html', 'utf8');

if (!html.includes('EMBERWING V14 // standalone flatten of effective V12')) throw new Error('Expected V14 baseline');
if (/document\.write\(|cdn\.jsdelivr\.net\/gh\/colemanvii\/emberwing@/i.test(html)) throw new Error('Refusing to build on wrapper architecture');

function swap(oldText,newText,label){if(!html.includes(oldText))throw new Error(`V16 anchor missing: ${label}`);html=html.replace(oldText,newText)}

swap('<!-- EMBERWING V14 // standalone flatten of effective V12 // zero gameplay changes -->','<!-- EMBERWING V16 // VISUAL SHOCK // new world language + honest landmark collision -->','marker');
swap('<title>Emberwing V11</title>','<title>Emberwing V16</title>','title');

// Make the desert visibly different before a single new object appears.
swap('haze=new THREE.Color(0xb8745d)','haze=new THREE.Color(0x8d786a)','desert haze');
swap("top:{value:new THREE.Color(0x161522)},hor:{value:new THREE.Color(0xb35f4b)},low:{value:new THREE.Color(0xf1ad74)},sunDir:{value:new THREE.Vector3(-.58,.17,-.79).normalize()},sunCol:{value:new THREE.Color(0xffd19b)}","top:{value:new THREE.Color(0x07111f)},hor:{value:new THREE.Color(0x9b5d43)},low:{value:new THREE.Color(0xf2cc8d)},sunDir:{value:new THREE.Vector3(-.58,.17,-.79).normalize()},sunCol:{value:new THREE.Color(0xffe0aa)}",'sky palette');
swap('const c1=new THREE.Color(0x43282d),c2=new THREE.Color(0x8f4639),c3=new THREE.Color(0xc86a43),c4=new THREE.Color(0xf3c282)','const c1=new THREE.Color(0x20262b),c2=new THREE.Color(0x59534d),c3=new THREE.Color(0xa88967),c4=new THREE.Color(0xead7aa)','terrain palette');
swap('rockMat=new THREE.MeshStandardMaterial({color:0x5a3433,roughness:1})','rockMat=new THREE.MeshStandardMaterial({color:0x292c30,roughness:1})','rock palette');
swap('sandMat=new THREE.MeshStandardMaterial({color:0xb47756,roughness:.92})','sandMat=new THREE.MeshStandardMaterial({color:0xb8a17d,roughness:.94})','city stone palette');
swap('cityDarkMat=new THREE.MeshStandardMaterial({color:0x70463d,roughness:.82})','cityDarkMat=new THREE.MeshStandardMaterial({color:0x41454a,roughness:.86})','city dark palette');
swap('peakDarkMat=new THREE.MeshStandardMaterial({color:0x3b252a,roughness:.96,metalness:.02,flatShading:true})','peakDarkMat=new THREE.MeshStandardMaterial({color:0x24272a,roughness:.98,metalness:.02,flatShading:true})','peak dark');
swap('peakMat=new THREE.MeshStandardMaterial({color:0x744036,roughness:.94,metalness:.02,flatShading:true})','peakMat=new THREE.MeshStandardMaterial({color:0x686159,roughness:.96,metalness:.02,flatShading:true})','peak mid');
swap('peakLightMat=new THREE.MeshStandardMaterial({color:0xc27b52,roughness:.88,metalness:.03,flatShading:true})','peakLightMat=new THREE.MeshStandardMaterial({color:0xc7b38d,roughness:.9,metalness:.03,flatShading:true})','peak light');
swap('farRidgeMat=new THREE.MeshStandardMaterial({color:0x76514d,roughness:1,flatShading:true})','farRidgeMat=new THREE.MeshStandardMaterial({color:0x6b6966,roughness:1,flatShading:true})','ridge palette');

const worldLoopAnchor="for(const m of scenery){const dx=m.position.x-ship.position.x,dz=m.position.z-ship.position.z,d2=dx*dx+dz*dz;if(m.userData.city){";
swap(worldLoopAnchor,"for(const m of scenery){if(m.userData.fixedLandmark)continue;const dx=m.position.x-ship.position.x,dz=m.position.z-ship.position.z,d2=dx*dx+dz*dz;if(m.userData.city){",'fixed landmark recycling guard');

const clockAnchor='const clock=new THREE.Clock();';
if(!html.includes(clockAnchor))throw new Error('V16 runtime anchor missing');

const v16=String.raw`
// EMBERWING V16 // VISUAL SHOCK
// A real visual language change, not another subtle garnish pass.
const v16Ring=new THREE.Group(),v16RingColliders=[];
const v16RingBlack=new THREE.MeshStandardMaterial({color:0x15191d,roughness:.89,metalness:.2});
const v16RingRim=new THREE.MeshStandardMaterial({color:0x9b7656,roughness:.93,metalness:.06});
const v16R=670,v16Tube=58,v16Lean=-.43,v16Arcs=[[.18,1.72],[2.18,1.46],[4.02,1.82]];
for(const [start,arc] of v16Arcs){
  const body=new THREE.Mesh(new THREE.TorusGeometry(v16R,v16Tube,10,46,arc),v16RingBlack);body.rotation.z=start;v16Ring.add(body);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(v16R-2,12,6,46,arc),v16RingRim);rim.rotation.z=start;v16Ring.add(rim);
  for(let a=start+.04;a<start+arc-.04;a+=.095){const p=new THREE.Object3D();p.visible=true;p.userData.fixedLandmark=true;p.userData.collisionR=42;p.userData.collisionH=42;p.userData.v16Ring=true;scenery.push(p);v16RingColliders.push({p,a})}
}
for(const a of[1.99,3.79]){const shard=new THREE.Mesh(new THREE.BoxGeometry(170,70,96),v16RingRim);shard.position.set(Math.cos(a)*(v16R+42),Math.sin(a)*(v16R+42),0);shard.rotation.z=a+Math.PI/2+.16;v16Ring.add(shard)}
scene.add(v16Ring);
function v16PlaceRing(){
  const f=heading().clone(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize(),n=f.clone().multiplyScalar(-1).normalize(),cx=ship.position.x+f.x*1120+r.x*170,cz=ship.position.z+f.z*1120+r.z*170,cy=terrainHeight(cx,cz)+430,basis=new THREE.Matrix4().makeBasis(r,worldUp,n);
  v16Ring.position.set(cx,cy,cz);v16Ring.quaternion.setFromRotationMatrix(basis);v16Ring.rotateZ(v16Lean);v16Ring.updateMatrixWorld(true);
  for(const c of v16RingColliders){const q=v16Ring.localToWorld(new THREE.Vector3(Math.cos(c.a)*v16R,Math.sin(c.a)*v16R,0));c.p.position.copy(q);c.p.visible=!worldIndex}
  v16Ring.visible=!worldIndex;
}

const v16Spine=new THREE.Group(),v16SpineColliders=[];
const v16SpineBlack=new THREE.MeshStandardMaterial({color:0x0c1218,roughness:.97,metalness:.03,flatShading:true}),v16SpineEdge=new THREE.MeshStandardMaterial({color:0x26313a,roughness:.94,metalness:.04,flatShading:true});
(function(){const H=760;for(let i=0;i<7;i++){const main=i===3,h=H*(main?1:.34+Math.abs(3-i)*.055),w=main?122:54+Math.abs(3-i)*9,m=new THREE.Mesh(crag(),main?v16SpineEdge:v16SpineBlack);m.scale.set(w,h,w*(.38+(i%3)*.06));m.position.set((i-3)*54,(h-H)/2,(i%2?34:-30));m.rotation.y=(i-3)*.14;v16Spine.add(m)}for(let i=0;i<6;i++){const p=new THREE.Object3D();p.visible=false;p.userData.fixedLandmark=true;p.userData.collisionR=62+(i===2||i===3?20:0);p.userData.collisionH=175+(i===2||i===3?110:0);p.userData.v16Spine=true;scenery.push(p);v16SpineColliders.push({p,x:(i-2.5)*58,y:i===2||i===3?185:80,z:i%2?20:-18})}scene.add(v16Spine)})();
let v16SpinePlaced=false,v16CloudY=0;
function v16PlaceSpine(){const f=heading().clone(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize(),cx=ship.position.x+f.x*1020-r.x*390,cz=ship.position.z+f.z*1020-r.z*390;v16Spine.position.set(cx,terrainHeight(cx,cz)+365,cz);v16Spine.rotation.y=Math.atan2(f.x,-f.z)+.18;v16Spine.updateMatrixWorld(true);for(const c of v16SpineColliders){const q=v16Spine.localToWorld(new THREE.Vector3(c.x,c.y,c.z));c.p.position.copy(q);c.p.visible=true}v16SpinePlaced=true;v16CloudY=ship.position.y-72}

function v16CloudTexture(seed=0){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle=seed?'#c8d7df':'#e2edf1';g.fillRect(0,0,512,512);for(let i=0;i<110;i++){const x=Math.random()*512,y=Math.random()*512,r=24+Math.random()*82,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,seed?'rgba(236,248,252,.78)':'rgba(255,255,255,.88)');gr.addColorStop(.52,'rgba(231,242,246,.34)');gr.addColorStop(1,'rgba(178,197,208,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(seed?8:6,seed?8:6);t.colorSpace=THREE.SRGBColorSpace;return t}
const v16CloudTexA=v16CloudTexture(0),v16CloudTexB=v16CloudTexture(1),v16CloudA=new THREE.Mesh(new THREE.PlaneGeometry(7600,7600),new THREE.MeshBasicMaterial({map:v16CloudTexA,color:0xf6fbfd,transparent:true,opacity:.62,depthWrite:false,side:THREE.DoubleSide,fog:true})),v16CloudB=new THREE.Mesh(new THREE.PlaneGeometry(7600,7600),new THREE.MeshBasicMaterial({map:v16CloudTexB,color:0xcfe0e8,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,fog:true}));
for(const c of[v16CloudA,v16CloudB]){c.rotation.x=-Math.PI/2;c.visible=false;c.renderOrder=-1;scene.add(c)}

const v16TrailGeo=new THREE.CylinderGeometry(1,1,1,6,1,true),v16Trails=[];let v16TrailClock=0,v16TrailPrev=null;
function v16TrailColor(){return enemyRole==='ROOKIE'?0xb7bfc3:enemyRole==='SKIMMER'?0x66dcff:enemyRole==='CLIMBER'?0xffb86f:0xe6fbff}
function v16DropTrail(){const s=v16Trails.shift();if(!s)return;scene.remove(s.mesh);s.mesh.material.dispose()}
function v16SpawnTrail(a,b){const d=b.clone().sub(a),len=d.length();if(len<1)return;const mat=new THREE.MeshBasicMaterial({color:v16TrailColor(),transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending}),m=new THREE.Mesh(v16TrailGeo,mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(worldUp,d.normalize());m.scale.set(.72,len,.72);scene.add(m);v16Trails.push({mesh:m,life:6.6,maxLife:6.6});while(v16Trails.length>18)v16DropTrail()}
function v16UpdateTrails(dt){for(let i=v16Trails.length-1;i>=0;i--){const s=v16Trails[i];s.life-=dt;const q=Math.max(0,s.life/s.maxLife);s.mesh.material.opacity=.3*q*q;s.mesh.scale.x=s.mesh.scale.z=.72+(1-q)*.65;if(s.life<=0){scene.remove(s.mesh);s.mesh.material.dispose();v16Trails.splice(i,1)}}if(!enemyAlive){v16TrailPrev=null;v16TrailClock=0;return}const p=enemy.position.clone();if(!v16TrailPrev||p.distanceToSquared(v16TrailPrev)>220*220){v16TrailPrev=p;v16TrailClock=.24;return}v16TrailClock-=dt;if(v16TrailClock<=0){v16SpawnTrail(v16TrailPrev,p);v16TrailPrev=p;v16TrailClock=.25}}

function v16SmokeTexture(){const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d'),gr=g.createRadialGradient(80,80,7,80,80,76);gr.addColorStop(0,'rgba(7,10,13,.96)');gr.addColorStop(.36,'rgba(13,16,19,.82)');gr.addColorStop(.72,'rgba(27,31,34,.32)');gr.addColorStop(1,'rgba(40,44,47,0)');g.fillStyle=gr;g.fillRect(0,0,160,160);return new THREE.CanvasTexture(c)}
const v16SmokeTex=v16SmokeTexture(),v16Smoke=[];
function v16DropSmoke(){const s=v16Smoke.shift();if(!s)return;scene.remove(s.sprite);s.sprite.material.dispose()}
function v16SpawnSmoke(pos){for(let j=0;j<2;j++){const mat=new THREE.SpriteMaterial({map:v16SmokeTex,color:j?0x20262b:0x11161a,transparent:true,opacity:j?.52:.7,depthWrite:false}),sprite=new THREE.Sprite(mat);sprite.position.copy(pos).add(new THREE.Vector3((j-.5)*6,j*4,(.5-j)*5));sprite.scale.setScalar(j?32:42);scene.add(sprite);v16Smoke.push({sprite,life:10.5-j*1.2,maxLife:10.5-j*1.2,base:j?.52:.7,drift:new THREE.Vector3((Math.random()-.5)*1.4,.7+j*.4,(Math.random()-.5)*1.4)})}while(v16Smoke.length>8)v16DropSmoke()}
function v16UpdateSmoke(dt){for(let i=v16Smoke.length-1;i>=0;i--){const s=v16Smoke[i];s.life-=dt;s.sprite.position.addScaledVector(s.drift,dt);const q=Math.max(0,s.life/s.maxLife),p=1-q;s.sprite.scale.setScalar(38+p*68);s.sprite.material.opacity=s.base*Math.pow(q,.68);if(s.life<=0){scene.remove(s.sprite);s.sprite.material.dispose();v16Smoke.splice(i,1)}}}

function v16ApplyPalette(alpine){if(alpine){haze.setHex(0x9fc3d5);scene.background=haze;scene.fog.color.setHex(0x9fc3d5);scene.fog.density=.00054;sky.material.uniforms.top.value.setHex(0x051427);sky.material.uniforms.hor.value.setHex(0x78a9c6);sky.material.uniforms.low.value.setHex(0xf5fbff);sky.material.uniforms.sunCol.value.setHex(0xf2fbff);c1.setHex(0x14202a);c2.setHex(0x415665);c3.setHex(0x8ba4b1);c4.setHex(0xf0f6f7);rockMat.color.setHex(0x25313a);sandMat.color.setHex(0x8ba0aa);peakDarkMat.color.setHex(0x0d171e);peakMat.color.setHex(0x344751);peakLightMat.color.setHex(0xb8cbd2);farRidgeMat.color.setHex(0x526c79);hemi.color.setHex(0xe9f7ff);hemi.groundColor.setHex(0x15232d);sun.color.setHex(0xe9f6ff);renderer.toneMappingExposure=1.15;speedMat.color.setHex(0xd7f5ff)}else{haze.setHex(0x8d786a);scene.background=haze;scene.fog.color.setHex(0x8d786a);scene.fog.density=.0007;sky.material.uniforms.top.value.setHex(0x07111f);sky.material.uniforms.hor.value.setHex(0x9b5d43);sky.material.uniforms.low.value.setHex(0xf2cc8d);sky.material.uniforms.sunCol.value.setHex(0xffe0aa);c1.setHex(0x20262b);c2.setHex(0x59534d);c3.setHex(0xa88967);c4.setHex(0xead7aa);rockMat.color.setHex(0x292c30);sandMat.color.setHex(0xb8a17d);peakDarkMat.color.setHex(0x24272a);peakMat.color.setHex(0x686159);peakLightMat.color.setHex(0xc7b38d);farRidgeMat.color.setHex(0x6b6966);hemi.color.setHex(0xffe1c4);hemi.groundColor.setHex(0x20242a);sun.color.setHex(0xffc47d);renderer.toneMappingExposure=1.1;speedMat.color.setHex(0xffddb0)}rebuildTerrain(tcx,tcz);const grade=document.getElementById('grade');if(grade)grade.style.background=alpine?'radial-gradient(ellipse at 50% 42%,rgba(210,240,255,.035) 0,transparent 34%,rgba(8,25,38,.04) 68%,rgba(2,10,18,.24) 100%)':'radial-gradient(ellipse at 50% 41%,rgba(255,223,170,.035) 0,transparent 30%,rgba(28,22,20,.04) 65%,rgba(4,8,12,.3) 100%)'}
const v16ThemeBase=setWorldTheme;setWorldTheme=function(alpine){v16ThemeBase(alpine);v16ApplyPalette(!!alpine)};
const v16ExplodeBase=explode;explode=function(){const before=kills,p=enemy.position.clone();v16ExplodeBase();if(kills>before)v16SpawnSmoke(p)};
const v16EnemyBase=updateEnemy;updateEnemy=function(dt){v16EnemyBase(dt);v16UpdateTrails(dt);v16UpdateSmoke(dt)};
const v16WorldBase=updateWorld;updateWorld=function(){v16WorldBase();if(typeof v11Hero!=='undefined')v11Hero.visible=false;const alpine=!!worldIndex;v16Ring.visible=!alpine;for(const c of v16RingColliders)c.p.visible=!alpine;v16Spine.visible=alpine;for(const c of v16SpineColliders)c.p.visible=alpine&&v16SpinePlaced;v16CloudA.visible=v16CloudB.visible=alpine;if(alpine&&!v16SpinePlaced)v16PlaceSpine();if(!alpine)v16SpinePlaced=false;if(alpine){v16CloudA.position.set(ship.position.x,v16CloudY,ship.position.z);v16CloudB.position.set(ship.position.x,v16CloudY-34,ship.position.z);const t=performance.now()*.0000024;v16CloudTexA.offset.set(t%1,(t*.52)%1);v16CloudTexB.offset.set((-.7*t)%1,(t*.31)%1)}};
function v16ClearMemory(){while(v16Trails.length)v16DropTrail();while(v16Smoke.length)v16DropSmoke();v16TrailPrev=null;v16TrailClock=0}
const v16ResetBase=reset;reset=function(){v16ResetBase();v16ClearMemory();v16SpinePlaced=false;v16Spine.visible=false;for(const c of v16SpineColliders)c.p.visible=false;v16CloudA.visible=v16CloudB.visible=false;v16PlaceRing();v16ApplyPalette(false)};
window.__emberwingV16={snapshot:()=>({ringVisible:v16Ring.visible,ringMeshes:v16Ring.children.length,ringColliders:v16RingColliders.length,spineReady:!!v16Spine,cloudLayers:2,trailCount:v16Trails.length,smokeCount:v16Smoke.length,nearestRing:v16RingColliders.reduce((m,c)=>Math.min(m,c.p.position.distanceTo(ship.position)),Infinity)})};
`;

html=html.replace(clockAnchor,v16+'\n'+clockAnchor);
fs.writeFileSync('v16.html',html);
console.log(`Built v16.html (${html.length.toLocaleString()} bytes)`);
