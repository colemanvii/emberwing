import * as T from './vendor/three.module.js';
const $=id=>document.getElementById(id), clamp=T.MathUtils.clamp, rand=(a,b)=>a+Math.random()*(b-a);
const scene=new T.Scene();scene.background=new T.Color('#b8745d');scene.fog=new T.FogExp2('#b8745d',.0012);
const camera=new T.PerspectiveCamera(66,innerWidth/innerHeight,.1,3200);camera.position.set(0,22,31);camera.lookAt(0,12,-25);
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('sky'),antialias:true,powerPreference:'high-performance'});}catch(e){$('intro').innerHTML='<h1>Our airplane needs WebGL</h1><p>Open this link in Safari or Chrome with graphics acceleration enabled.</p>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
const sky=new T.Mesh(new T.SphereGeometry(2500,32,18),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new T.Color(0x20172f)},hor:{value:new T.Color(0xbb684f)},low:{value:new T.Color(0xf2aa68)},sunDir:{value:new T.Vector3(-.58,.17,-.79).normalize()},sunCol:{value:new T.Color(0xffd19b)}},vertexShader:'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 hor;uniform vec3 low;uniform vec3 sunDir;uniform vec3 sunCol;varying vec3 d;void main(){float h=d.y;vec3 c=mix(hor,top,smoothstep(.02,.72,h));c=mix(low,c,smoothstep(-.28,.14,h));float horizon=exp(-pow(abs(h)/.065,2.0));c+=sunCol*horizon*.09;float sd=max(dot(normalize(d),normalize(sunDir)),0.0);float halo=pow(sd,18.0)*.23+pow(sd,90.0)*.72;float disc=smoothstep(.99935,.99986,sd);c+=sunCol*(halo+disc*1.35);gl_FragColor=vec4(c,1.0);}'}));scene.add(sky);
scene.add(new T.HemisphereLight('#ffd6bd','#241a22',1.85));const sun=new T.DirectionalLight('#ffbd76',6.4);sun.position.set(-520,260,-650);scene.add(sun);
const materials=new Map();function mat(color,glow=false){const key=color+glow;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.55,metalness:.15,emissive:glow?color:0,emissiveIntensity:glow?2:0}));return materials.get(key);}
const sphere=new T.SphereGeometry(1,16,12),box=new T.BoxGeometry(1,1,1);
function mesh(parent,geo,color,pos=[0,0,0],scale=[1,1,1],glow=false){const m=new T.Mesh(geo,mat(color,glow));m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
function ball(parent,color,pos,scale,glow=false){return mesh(parent,sphere,color,pos,scale,glow);}
function block(parent,color,pos,scale){return mesh(parent,box,color,pos,scale);}

// Actual plate and makeShip geometry from main/src/level1/game.js.
// Gus wears matte green; the wingman wears blue-white police paint.
function plate(points,t=.28){const n=points.length,v=[],idx=[];for(const y of[-t/2,t/2])for(const p of points)v.push(p[0],y,p[1]);for(let i=1;i<n-1;i++)idx.push(n,n+i,n+i+1,0,i+1,i);for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,n+j,i,n+j,n+i)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g}
function makeShip(police=false){const enemy=false;const g=new T.Group(),hull=new T.MeshStandardMaterial({color:enemy?0x11161c:police?0xd9e5e3:0x386b39,roughness:enemy?.32:police?.43:.89,metalness:enemy?.55:police?.34:.13}),wing=new T.MeshStandardMaterial({color:enemy?0x1d252d:police?0x305f87:0x477b43,roughness:enemy?.43:police?.45:.93,metalness:enemy?.4:police?.32:.11}),pts=enemy?[[-.5,-3],[-4,.6],[-3,2],[0,1.1],[3,2],[4,.6],[.5,-3]]:[[-.8,-3.5],[-3,-1.6],[-8.5,.5],[-7.5,3],[-3.2,2.2],[0,1.2],[3.2,2.2],[7.5,3],[8.5,.5],[3,-1.6],[.8,-3.5]];g.add(new T.Mesh(plate(pts),wing));const body=new T.Mesh(new T.CylinderGeometry(enemy?.7:1.05,enemy?1:1.4,enemy?6.5:9,8),hull);body.rotation.x=Math.PI/2;g.add(body);const nose=new T.Mesh(new T.ConeGeometry(enemy?.75:1.1,enemy?3:4,8),hull);nose.rotation.x=-Math.PI/2;nose.position.z=enemy?-4.6:-6.2;g.add(nose);const canopy=new T.Mesh(new T.SphereGeometry(enemy?.6:.9,12,8),new T.MeshStandardMaterial({color:enemy?0x071117:0x03131d,metalness:enemy?.8:.92,roughness:enemy?.1:.06}));canopy.scale.set(.8,.42,1.6);canopy.position.set(0,.72,enemy?-1.7:-2.1);g.add(canopy);g.userData.plumes=[];g.userData.engines=[];if(!enemy){for(const x of[-2.6,2.6]){const fin=new T.Mesh(new T.BoxGeometry(.22,1.55,2.45),wing);fin.position.set(x,.72,2);fin.rotation.z=x<0?.12:-.12;g.add(fin)}const spine=new T.Mesh(new T.BoxGeometry(.72,.22,4.6),hull);spine.position.set(0,.36,.35);g.add(spine)}const xs=enemy?[-1.35,1.35]:[-5,-1.7,1.7,5];if(enemy)g.userData.hitMats=[hull,wing];for(const x of xs){const e=new T.Mesh(new T.SphereGeometry(enemy?.25:.38,8,6),new T.MeshBasicMaterial({color:enemy?0x6dd8ff:0xff9a43,transparent:!enemy,opacity:enemy?1:.9,blending:enemy?T.NormalBlending:T.AdditiveBlending,depthWrite:enemy}));e.position.set(x,0,3.35);g.add(e);if(!enemy){g.userData.engines.push(e);const p=new T.Mesh(new T.ConeGeometry(.34,3.4,8),new T.MeshBasicMaterial({color:0xff8a3b,transparent:true,opacity:.76,blending:T.AdditiveBlending,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set(x,0,4.9);g.add(p);g.userData.plumes.push(p)}}if(police){const white=new T.MeshStandardMaterial({color:0xebeee7,roughness:.42,metalness:.21});for(const s of [-1,1]){const band=new T.Mesh(new T.BoxGeometry(2.3,.042,1.1),white);band.position.set(s*5.25,.17,.9);g.add(band);}g.userData.lights=[ball(g,'#ff4150',[-.48,1.18,-.45],[.3,.22,.28],true),ball(g,'#408eff',[.48,1.18,-.45],[.3,.22,.28],true)];}return g}
const hero=makeShip();hero.position.set(0,15,6);
const buddy=makeShip(true);buddy.scale.setScalar(.78);buddy.position.set(-9,17,-2);
// The original Emberwing makeShip() returns a group but does not add it to the scene.
// Both aircraft must be attached explicitly, or neither will ever render.
scene.add(hero,buddy);
const terrainGeo=new T.PlaneGeometry(2000,2000,110,110);
terrainGeo.rotateX(-Math.PI/2);
const terrainP=terrainGeo.attributes.position,terrainColors=new Float32Array(terrainP.count*3);
const low=new T.Color('#603b39'),mid=new T.Color('#a85b48'),high=new T.Color('#e4a06a'),crest=new T.Color('#edbf86'),tc=new T.Color();
for(let i=0;i<terrainP.count;i++){
  const x=terrainP.getX(i),z=terrainP.getZ(i);
  const ridge=Math.pow(Math.abs(Math.sin(x*.008+z*.002)),3)*8;
  const roll=Math.sin(x*.012)*2.7+Math.cos(z*.013)*3.4+Math.sin((x+z)*.006)*3.5;
  const y=-11+Math.max(0,ridge+roll);
  terrainP.setY(i,y);
  const level=T.MathUtils.clamp((y+14)/17,0,1);
  tc.copy(low).lerp(mid,Math.min(1,level*1.4));
  if(level>.36)tc.lerp(high,(level-.36)*.8);
  if(level>.7)tc.lerp(crest,(level-.7)*1.8);
  terrainColors.set(tc.toArray(),i*3);
}
terrainGeo.setAttribute('color',new T.BufferAttribute(terrainColors,3));
terrainGeo.computeVertexNormals();
const ground=new T.Mesh(terrainGeo,new T.MeshStandardMaterial({vertexColors:true,roughness:.98,metalness:0}));
ground.position.set(0,0,-300);scene.add(ground);
// Desert sunlight is drawn by Emberwing's original atmospheric sky shader.
const rocks=[];
const rockBatches=[['#bd744e',.66,1],['#e79d5b',.68,.76],['#f5c278',.5,.64]].map(([c,top,bottom])=>{const m=new T.InstancedMesh(new T.CylinderGeometry(top,bottom,1,5),mat(c),65);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;});
const rockDummy=new T.Object3D();
for(let i=0;i<65;i++){const h=rand(10,44),w=rand(5,15);rocks.push({position:new T.Vector3((i%2?1:-1)*rand(28,155),-4,-i*8),h,w});}
function updateRocks(){rocks.forEach((r,i)=>{for(let layer=0;layer<3;layer++){rockDummy.position.copy(r.position);rockDummy.position.y+=r.h*[.5,.78,1.03][layer];rockDummy.scale.set(r.w,r.h*[1,.2,.08][layer],r.w);rockDummy.updateMatrix();rockBatches[layer].setMatrixAt(i,rockDummy.matrix);}});rockBatches.forEach(m=>m.instanceMatrix.needsUpdate=true);}
updateRocks();
const dunes=[];for(let i=0;i<30;i++){const m=ball(scene,i%2?'#f4c780':'#dda063',[rand(-140,140),-5,-i*19],[rand(10,35),rand(2,5),rand(8,30)]);dunes.push(m);}
// Batched sprites: one draw call for hundreds of luminous electric balls.
const spriteCanvas=document.createElement('canvas');spriteCanvas.width=spriteCanvas.height=64;const cx=spriteCanvas.getContext('2d');const grad=cx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'#fff');grad.addColorStop(.13,'#fff');grad.addColorStop(.27,'rgba(180,255,255,.85)');grad.addColorStop(.5,'rgba(80,190,255,.3)');grad.addColorStop(1,'rgba(0,100,255,0)');cx.fillStyle=grad;cx.fillRect(0,0,64,64);const glowTexture=new T.CanvasTexture(spriteCanvas);
const orbCount=320,orbPositions=new Float32Array(orbCount*3),orbColors=new Float32Array(orbCount*3),orbs=[];const og=new T.BufferGeometry();og.setAttribute('position',new T.BufferAttribute(orbPositions,3));og.setAttribute('color',new T.BufferAttribute(orbColors,3));const orbMat=new T.PointsMaterial({size:2.1,map:glowTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true});const orbPoints=new T.Points(og,orbMat);orbPoints.frustumCulled=false;scene.add(orbPoints);
function resetOrb(o,far=true){o.x=rand(-65,65);o.y=rand(2,43);o.z=far?rand(-240,-90):rand(-250,15);}for(let i=0;i<orbCount;i++){const o={collect:i%5===0,phase:rand(0,7)};resetOrb(o,false);orbs.push(o);}
const particles=[], maxParticles=900,pp=new Float32Array(maxParticles*3),pc=new Float32Array(maxParticles*3);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pp,3));pg.setAttribute('color',new T.BufferAttribute(pc,3));const sparks=new T.Points(pg,new T.PointsMaterial({size:1.25,map:glowTexture,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));sparks.frustumCulled=false;scene.add(sparks);
let engineOsc,engineGain;let audio,master,muted=false;function unlock(){if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=muted?0:.24;master.connect(audio.destination);const hum=audio.createOscillator(),hg=audio.createGain();hum.type='sine';hum.frequency.value=58;hg.gain.value=.035;hum.connect(hg);hg.connect(master);hum.start();engineOsc=hum;engineGain=hg;}if(audio.state==='suspended')audio.resume();}
function tone(f,end,d=.15,type='sine',gain=.4,delay=0){if(!audio||muted)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+d);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02);}
function sound(kind){if(kind==='pew'){tone(180,45,.09,'square',.22);tone(1800,240,.055,'sawtooth',.12);}if(kind==='police')tone(450,70,.11,'square',.12);if(kind==='missile'){tone(85,1100,.46,'sawtooth',.38);tone(220,45,.72,'triangle',.6);tone(1300,300,.18,'square',.12,.08);}if(kind==='pop'){tone(rand(100,230),32,.3,'sawtooth',.4);tone(600,90,.15,'sine',.5);}if(kind==='power')[520,660,790,1040].forEach((f,i)=>tone(f,f*1.1,.16,'sine',.4,i*.07));if(kind==='roar'){tone(65,125,1.5,'sawtooth',.5);tone(135,35,2,'triangle',.6);}if(kind==='win')[392,523,659,784,659,784,1047].forEach((f,i)=>tone(f,f, .45,'triangle',.55,i*.15));if(kind==='zap')tone(180,650,.11,'sawtooth',.13);}
let level=1,wolverineTimer=2,wolverineAttack=null;let state='ready',time=0,visualTime=0,score=0,shield=5,invulnerable=0,power=0,shotTimer=0,missileTimer=0,buddyTimer=0,messageTime=0,boss=null,victoryTimer=0;
let turbo=0,worldDistance=0,kick=0,combo=0,lastKill=-10,points=0;const shockwaves=[];
const muzzle=ball(hero,'#fff5b0',[0,0,-7.9],[.5,.5,1.4],true);muzzle.visible=false;let muzzleTime=0;
const streakGeo=new T.BufferGeometry(),streakPositions=new Float32Array(48*6);for(let i=0;i<48;i++){const a=i*2.399,r=rand(18,38),z=rand(-110,10);streakPositions.set([Math.cos(a)*r,15+Math.sin(a)*r,z,Math.cos(a)*r,15+Math.sin(a)*r,z+8],i*6);}streakGeo.setAttribute('position',new T.BufferAttribute(streakPositions,3));const streaks=new T.LineSegments(streakGeo,new T.LineBasicMaterial({color:0xc8efff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));scene.add(streaks);
function shockwave(pos,major=false){const m=new T.Mesh(new T.RingGeometry(.85,1,48),new T.MeshBasicMaterial({color:major?0xffd28a:0xafffff,transparent:true,opacity:1,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));m.position.copy(pos);scene.add(m);shockwaves.push({mesh:m,life:0,max:major?.65:.35,size:major?24:8});kick=Math.max(kick,major?.65:.12);}
function feedback(text){$('combat').textContent=text;$('combat').classList.remove('pop');void $('combat').offsetWidth;$('combat').classList.add('pop');}
// Wolverine rides an ion board alongside Gus, then leaps into claw strikes.
const wolverine=new T.Group();scene.add(wolverine);wolverine.visible=false;
const board=ball(wolverine,'#273747',[0,-2,0],[2.5,.25,3]);
ball(wolverine,'#75eaff',[0,-2.2,1.8],[1.7,.2,1.1],true);
block(wolverine,'#e4b92e',[0,0,0],[1.7,2.2,.9]);
block(wolverine,'#203966',[0,-1.1,0],[1.7,.5,1]);
for(const side of [-1,1])for(let stripe=0;stripe<3;stripe++){const m=block(wolverine,'#172638',[side*.64,.65-stripe*.42,-.47],[.5,.16,.06]);m.rotation.z=side*.4;}
ball(wolverine,'#efc477',[0,1.4,-.57],[.42,.28,.15]);
ball(wolverine,'#efc477',[0,1.6,-.1],[.7,.75,.6]);
ball(wolverine,'#e9bd25',[0,1.9,0],[.76,.65,.65]);
for(const side of [-1,1]){
 const ear=mesh(wolverine,new T.ConeGeometry(.38,1.4,3),'#172638',[side*.59,2.5,0]);ear.rotation.z=-side*.25;
 block(wolverine,'#fff8cc',[side*.3,1.9,-.59],[.29,.12,.08]);
 block(wolverine,'#23436b',[side*.5,-1.5,0],[.65,1,.7]);
 ball(wolverine,'#e3b82b',[side*1.1,.55,0],[.55,.7,.5]);
 block(wolverine,'#e9bd7e',[side*1.4,-.1,-.25],[.55,1,.65]);
 block(wolverine,'#23436b',[side*1.4,-.65,-.45],[.65,.55,.8]);
 for(let claw=0;claw<3;claw++)block(wolverine,'#e5fcff',[side*1.4+(claw-1)*.19,-.6,-1.65],[.065,.09,2.1]);
}
const fortress=new T.Group();scene.add(fortress);fortress.visible=false;
for(const side of [-1,1]){block(fortress,'#303c38',[side*31,13,-110],[10,42,16]);block(fortress,'#98ff55',[side*31,14,-101.8],[.5,32,.3]);}
block(fortress,'#394638',[0,33,-110],[68,5,16]);
function updateWolverine(dt){
 wolverine.visible=level>=2;
 fortress.visible=level>=2;
 if(level<2)return;
 const home=new T.Vector3(hero.position.x+10,hero.position.y+2,hero.position.z-9);
 if(state!=='playing'){wolverine.position.lerp(home,.1);return;}
 wolverineTimer-=dt;
 if(!wolverineAttack&&wolverineTimer<=0){
  const target=boss&&!boss.dead?targets().find(t=>t.pod):nearest(wolverine.position);
  if(target){wolverineAttack={target,from:home.clone(),to:target.p.clone(),age:0,hit:false};wolverineTimer=4.5;say('WOLVERINE // CLAWS OUT',1.2);tone(450,1800,.2,'sawtooth',.18);}
 }
 if(wolverineAttack){const a=wolverineAttack;a.age+=dt;
  if(a.target.pod)a.to.copy(a.target.pod.mesh.getWorldPosition(new T.Vector3()));else if(a.target.e?.hp>0)a.to.copy(a.target.e.mesh.position);
  const t=Math.min(a.age/.45,1);if(a.age<=.45)wolverine.position.lerpVectors(a.from,a.to,t*t);else wolverine.position.lerpVectors(a.to,home,Math.min((a.age-.45)/.65,1));
  wolverine.rotation.y=0;wolverine.rotation.z=Math.sin(a.age*12)*.35;
  if(!a.hit&&a.age>=.45){a.hit=true;const alive=a.target.e?a.target.e.hp>0:a.target.pod.hp>0;if(alive){stats.wolverineHits++;hit(a.target,a.target.pod?9:8,'wolverine');explode(a.to,'#c6f8ff',65);shockwave(a.to,true);feedback('WOLVERINE // CLAW STRIKE');tone(1600,80,.3,'sawtooth',.4);}}
  if(a.age>1.1)wolverineAttack=null;
 }else{wolverine.rotation.y=2.7;wolverine.position.lerp(home,1-Math.exp(-dt*6));wolverine.position.y+=Math.sin(time*3)*dt*.6;wolverine.rotation.z=Math.sin(time*2)*.08;}
 $('ally-status').textContent=wolverineAttack?'WOLVERINE // CLAW STRIKE':wolverineTimer>0?'WOLVERINE // STRIKE IN '+Math.ceil(wolverineTimer)+'s':'WOLVERINE // HUNTING';
}
// Level 3: each teammate has a visible attack and contributes actual damage.
const teamEffects=[];
function nameTag(parent,text,y){const c=document.createElement('canvas');c.width=256;c.height=48;const ctx=c.getContext('2d');ctx.fillStyle='#102526cc';ctx.fillRect(0,0,256,48);ctx.font='bold 25px Arial';ctx.textAlign='center';ctx.fillStyle='#fff6cc';ctx.fillText(text,128,33);const m=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthWrite:false}));m.position.y=y;m.scale.set(5.6,1.05,1);parent.add(m);}
function teammate(kind){
 const g=new T.Group(),hulk=kind==='HULK',iron=kind==='IRON MAN',storm=kind==='STORM',skin=hulk?'#57aa42':storm?'#83543c':'#e4b78b',suit=iron?'#b83328':storm?'#e4e7ec':'#354655';
 ball(g,hulk?skin:suit,[0,0,0],hulk?[1.8,2,1]:[.95,1.4,.6]);
 ball(g,iron?'#e7b64e':skin,[0,hulk?2.25:1.9,0],hulk?[.95,1,.85]:[.65,.75,.6]);
 if(!iron)ball(g,hulk?'#1b3024':storm?'#f3f5ff':'#d1ab68',[0,hulk?2.9:2.4,.12],hulk?[.95,.4,.78]:[.72,.45,.62]);
 for(const side of [-1,1]){block(g,iron?'#aefaff':'#eaffd2',[side*.24,hulk?2.4:2,-.61],[.23,.13,.12]);ball(g,hulk?'#614185':suit,[side*(hulk?.8:.45),-1.5,0],[hulk?.85:.4,1,.5]);}
 const arms=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*(hulk?1.7:1),.7,0);g.add(arm);ball(arm,hulk?skin:suit,[side*.35,-.5,0],hulk?[.9,1.2,.85]:[.4,.9,.4]);ball(arm,iron?'#deb049':skin,[side*.5,-1.45,-.2],hulk?[1.05,.85,.95]:[.4,.4,.4]);arms.push(arm);}
 if(iron){ball(g,'#c9fbff',[0,.3,-.59],[.28,.28,.12],true);for(const side of [-1,1])ball(g,'#a9efff',[side*.45,-2.6,0],[.2,.8,.2],true);}
 if(!hulk&&!iron){const cape=block(g,storm?'#eef1ff':'#962e30',[0,-.1,.75],[2.7,3.5,.12]);cape.rotation.x=-.15;}
 if(kind==='THOR'){block(g,'#986a38',[1.5,-.7,-.3],[.15,1.7,.15]);block(g,'#c0d2df',[1.5,-.05,-.3],[1.2,.65,.7]);}
 if(hulk){block(g,'#614185',[0,-1.15,0],[2.6,1.2,1.5]);block(g,'#d1e8bc',[0,1.95,-.8],[.75,.18,.1]);}
 nameTag(g,kind,hulk?4:3.3);scene.add(g);g.visible=false;g.rotation.y=Math.PI;return {mesh:g,arms};
}
const hulk=teammate('HULK'),avengers=[{...teammate('IRON MAN'),name:'IRON MAN',color:'#9bf4ff',offset:[15,5,-20],cool:1.2},{...teammate('THOR'),name:'THOR',color:'#b7cdff',offset:[-16,7,-27],cool:2.8},{...teammate('STORM'),name:'STORM',color:'#f3dcff',offset:[3,10,-26],cool:4}];
let hulkCooldown=0,hulkAttack=null;
function beam(from,to,color,lightning=false){const vertices=[from.clone()];if(lightning)for(let i=1;i<7;i++)vertices.push(from.clone().lerp(to,i/7).add(new T.Vector3(rand(-1.8,1.8),rand(-1.2,1.2),0)));vertices.push(to.clone());const m=new T.Line(new T.BufferGeometry().setFromPoints(vertices),new T.LineBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));scene.add(m);teamEffects.push({mesh:m,life:.35,max:.35});}
function callHulk(){
 if(level!==3||state!=='playing'||hulkAttack||hulkCooldown>0)return false;
 const target=boss&&!boss.dead?targets().find(t=>t.pod):nearest(hulk.mesh.position);if(!target)return false;
 hulkAttack={from:hulk.mesh.position.clone(),to:target.p.clone(),target,age:0,hit:false};hulkCooldown=7;say('HULK // SMASH!',1.8);tone(70,38,.65,'sawtooth',.6);return true;
}
function updateTeam(dt){
 for(let i=teamEffects.length-1;i>=0;i--){const e=teamEffects[i];e.life-=dt;e.mesh.material.opacity=Math.max(0,e.life/e.max);if(e.life<=0){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();teamEffects.splice(i,1);}}
 const enabled=level===3;hulk.mesh.visible=enabled;avengers.forEach(a=>a.mesh.visible=enabled);$('smash').hidden=!enabled||state!=='playing';if(!enabled)return;
 const home=new T.Vector3(hero.position.x-11,hero.position.y+1,hero.position.z-12);
 if(state==='playing'){
 hulkCooldown=Math.max(0,hulkCooldown-dt);
 if(!hulkAttack&&hulkCooldown<=0&&time>2)callHulk();
 if(hulkAttack){const a=hulkAttack;a.age+=dt;const alive=a.target.e?a.target.e.hp>0:a.target.pod.hp>0;
 if(alive)a.to.copy(a.target.pod?a.target.pod.mesh.getWorldPosition(new T.Vector3()):a.target.e.mesh.position);
 if(a.age<1){hulk.mesh.position.lerpVectors(a.from,a.to,a.age);hulk.mesh.position.y+=Math.sin(a.age*Math.PI)*17;hulk.mesh.rotation.y=0;hulk.arms.forEach((arm,i)=>arm.rotation.z=(i?1:-1)*2.6);}else{
 if(!a.hit){a.hit=true;stats.hulkSmashes++;if(alive){const hp=a.target.pod?.hp||0;hit(a.target,a.target.pod?32:16,'hulk');if(a.target.pod){stats.hulkBossDamage+=Math.min(hp,32);boss.stagger=.8;}}
 for(const t of targets())if((t.e||t.pod)!==(a.target.e||a.target.pod)&&t.p.distanceTo(a.to)<22){const hp=t.pod?.hp||0;hit(t,t.pod?12:10,'hulk');if(t.pod)stats.hulkBossDamage+=Math.min(hp,12);}
 explode(a.to,'#a4ff69',150);shockwave(a.to,true);feedback('HULK SMASH!  +500');points+=500;tone(100,25,.7,'sawtooth',.7);tone(55,22,.8,'triangle',.6);}
 hulk.mesh.position.lerpVectors(a.to,home,Math.min((a.age-1)/.85,1));hulk.arms.forEach(arm=>arm.rotation.z=0);
 }if(a.age>1.85)hulkAttack=null;
 }else{hulk.mesh.position.lerp(home,1-Math.exp(-dt*5));hulk.mesh.rotation.y=2.8;}
 }
 for(const a of avengers){const dest=hero.position.clone().add(new T.Vector3(...a.offset));a.mesh.position.lerp(dest,1-Math.exp(-dt*5));a.mesh.position.y+=Math.sin(visualTime*2+a.offset[0])*dt*.5;if(state!=='playing')continue;a.cool-=dt;
 if(a.cool<=0){const target=boss&&!boss.dead?targets().find(t=>t.pod):nearest(a.mesh.position);if(target){const from=a.mesh.position.clone();from.y+=.5;beam(from,target.p,a.color,a.name!=='IRON MAN');hit(target,a.name==='IRON MAN'?2:4,a.name);stats[a.name==='IRON MAN'?'ironManHits':a.name==='THOR'?'thorHits':'stormHits']++;tone(a.name==='IRON MAN'?1200:250,60,.18,'sawtooth',.12);}a.cool=a.name==='IRON MAN'?2.6:4.2;}
 }
 $('smash').disabled=!!hulkAttack||hulkCooldown>0;$('smash').textContent=hulkAttack?'HULK SMASH!':hulkCooldown>0?'HULK // '+Math.ceil(hulkCooldown)+'s':'H · HULK SMASH';
 $('ally-status').textContent='AVENGERS + X-MEN // TOGETHER';
}
function resetTeam(){hulkAttack=null;hulkCooldown=0;hulk.mesh.position.set(-11,16,-6);hulk.arms.forEach(a=>a.rotation.z=0);avengers.forEach((a,i)=>{a.cool=1.2+i*1.4;a.mesh.position.copy(hero.position).add(new T.Vector3(...a.offset));});for(const e of teamEffects){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();}teamEffects.length=0;}
const stats={hulkSmashes:0,hulkBossDamage:0,ironManHits:0,thorHits:0,stormHits:0,wolverineHits:0,wolverineKills:0,orbPops:0,protects:0,lasers:0,missiles:0,missileHits:0,policeShots:0,policeKills:0,bossHits:0,collections:0,rescues:0};const enemies=[],shots=[],keys=new Set(),touch={x:0,y:0,fire:false,turbo:false};
function say(text,d=3){$('message').textContent=text;messageTime=d;}
function saucer(big=false){const g=new T.Group();ball(g,big?'#c957d5':'#797ee4',[0,0,0],[big?3.5:2,.45,big?2.5:1.5]);const ring=mesh(g,new T.TorusGeometry(big?2.65:1.5,.15,6,24),'#63ffbb',[0,.05,0],[1,1,1],true);ring.rotation.x=Math.PI/2;ball(g,'#71e2d1',[0,.55,0],[.9,.8,.9]);ball(g,'#75ec43',[0,.68,.15],[.54,.58,.5]);for(const x of [-.22,.22])ball(g,'#132841',[x,.85,.55],[.13,.2,.1]);for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(g,'#ffef77',[Math.cos(a)*1.5,-.12,Math.sin(a)*1.3],[.12,.12,.12],true);}scene.add(g);return g;}
function spawn(i=0,initial=false){const big=i%5===0,g=saucer(big);const e={mesh:g,hp:big?(level===3?10:level===2?7:5):(level>=2?3:2),big,phase:rand(0,6),baseX:((i%5)-2)*6,baseY:6+Math.floor(i%10/5)*7,cool:rand(2,6)};g.position.set(e.baseX,e.baseY,initial?-32-Math.floor(i/5)*24:rand(-170,-110));enemies.push(e);}
function explode(pos,color='#ffb72f',n=45){sound('pop');const c=new T.Color(color);for(let i=0;i<n;i++){if(particles.length>=maxParticles)particles.shift();particles.push({p:pos.clone(),v:new T.Vector3(rand(-12,12),rand(-10,12),rand(-12,12)),life:rand(.4,1.1),max:1.1,c:c.clone()});}}
function removeMesh(m){scene.remove(m);m.traverse(n=>{if(n.geometry&&![sphere,box,laserGeo,missileGeo].includes(n.geometry))n.geometry.dispose();});}
function killEnemy(e,owner){if(e.hp<=0)return;e.hp=0;explode(e.mesh.position,e.big?'#ff97f7':'#ffca54',e.big?65:35);score+=e.big?5:1;combo=time-lastKill<2.2?combo+1:1;lastKill=time;const reward=(e.big?500:100)*Math.min(combo,8);points+=reward;shockwave(e.mesh.position);feedback((owner==='police'?'BLUE // ': '')+(combo===2?'DOUBLE KILL':combo>2?'COMBO ×'+Math.min(combo,8):'DESTROYED')+'  +'+reward);if(combo===2){tone(660,880,.16,'triangle',.3);tone(880,1320,.2,'triangle',.3,.1);}if(owner==='police')stats.policeKills++;if(owner==='wolverine')stats.wolverineKills++;removeMesh(e.mesh);}
function targets(){return [...enemies.filter(e=>e.hp>0).map(e=>({p:e.mesh.position,e})),...(boss&&!boss.dead?boss.pods.filter(p=>p.hp>0).map(p=>({p:p.mesh.getWorldPosition(new T.Vector3()),pod:p})):[])];}
function nearest(pos){return targets().filter(t=>t.p.z<pos.z-1).sort((a,b)=>a.p.distanceToSquared(pos)-b.p.distanceToSquared(pos))[0];}
const laserGeo=new T.CylinderGeometry(.11,.11,4.5,5);laserGeo.rotateX(Math.PI/2);
const missileGeo=new T.ConeGeometry(.55,3.6,8);missileGeo.rotateX(-Math.PI/2);
let nextMissilePylon=-1;

function fire(owner='gus',missile=false){
  if(state!=='playing'||(missile&&missileTimer>0))return false;
  const source=owner==='police'?buddy:hero;
  const p=source.position.clone();
  if(missile){
    // The rocket must visibly leave the wing before it begins homing.
    p.x+=nextMissilePylon*3.3;nextMissilePylon*=-1;
    p.y-=.85;p.z-=1.1;
  }else p.z-=3;
  const target=missile&&boss&&!boss.dead
    ? boss.pods.filter(p=>p.hp>0).map(p=>({p:p.mesh.getWorldPosition(new T.Vector3()),pod:p}))[0]||nearest(p)
    : nearest(p);
  if(owner==='gus'&&!missile){
    const o=orbs.find(o=>!o.collect&&o.z<p.z&&o.z>p.z-30&&Math.hypot(o.x-p.x,o.y-p.y)<2);
    if(o){explode(new T.Vector3(o.x,o.y,o.z),'#8defff',12);resetOrb(o);stats.orbPops++;sound('zap');}
  }
  const m=new T.Group();
  mesh(m,missile?missileGeo:laserGeo,missile?'#dfe8dd':owner==='police'?'#89dfff':'#aaff63',[0,0,0],[1,1,1],!missile);
  if(missile){
    ball(m,'#fff6b1',[0,0,-1.8],[.55,.55,.65],true);
    ball(m,'#ffb526',[0,0,1.8],[.5,.5,.95],true);
    block(m,'#415646',[0,0,.95],[1.45,.12,.85]);
    block(m,'#415646',[0,0,.95],[.12,1.45,.85]);
  }
  m.position.copy(p);scene.add(m);
  shots.push({mesh:m,target,owner,missile,life:5,speed:missile?66:155});
  if(missile){
    missileTimer=1.55;stats.missiles++;
    say('MISSILE AWAY  //  TARGET TRACKING',1.8);
    document.body.classList.add('missile-fired');
  }else if(owner==='gus'){stats.lasers++;muzzleTime=.045;muzzle.visible=true;}else stats.policeShots++;
  sound(missile?'missile':owner==='police'?'police':'pew');
  return true;
}
function makeBoss(){const g=new T.Group();g.position.set(0,-27,-78);scene.add(g);ball(g,'#4bbd40',[0,0,0],[10,12,6]);ball(g,'#93dd48',[0,-3,4],[7,7,3]);ball(g,'#65d13d',[0,10,0],[9,8,6]);for(const x of [-3.7,3.7]){ball(g,'#fff5bf',[x,12,5.1],[2.6,2.8,1]);ball(g,'#e7ff4a',[x,12,6],[1.25,1.6,.6],true);ball(g,'#1b3c38',[x,12,6.5],[.5,1,.25]);ball(g,'#3c9e37',[x*1.8,16,0],[1.2,3,1.3]);}ball(g,'#235c38',[0,6.5,5.5],[4.5,1.7,.6]);for(const x of [-2.6,0,2.6])block(g,'#fff6ce',[x,7.2,6.1],[1.5,1.4,.35]);const arms=[];for(const sign of [-1,1]){const arm=new T.Group();arm.position.set(sign*8,1,0);g.add(arm);ball(arm,'#51c340',[sign*4,-1,0],[6,2.5,2.5]);ball(arm,'#6fda44',[sign*8,0,0],[3.3,3.3,3.3]);arms.push(arm);}const pods=[];for(const [x,y]of [[-16,1],[16,1],[0,-3]]){const m=ball(g,'#ff90ee',[x,y,4],[2,2,1.5],true);pods.push({mesh:m,hp:level===3?120:level===2?36:18});}boss={mesh:g,pods,arms,dead:false,deathTime:0};$('bossbar').hidden=false;say(level===3?'WORLD BREAKER // HULK: THAT ONE IS MINE!':level===2?'TITAN PRIME // WOLVERINE: LET’S FINISH THIS':'WARNING // GREEN TITAN INBOUND',4);if(level>=2){g.scale.setScalar(1.15);shockwave(g.position,true);}sound('roar');}
function hit(target,damage,owner){if(target.e){const e=target.e;if(e.hp<=0)return;if(e.hp<=damage)killEnemy(e,owner);else{e.hp-=damage;e.flash=.12;explode(e.mesh.position,'#9effad',9);kick=Math.max(kick,.075);if(time-lastKill>.7)feedback('HIT');}}else if(target.pod&&target.pod.hp>0){const p=target.pod;p.hp=Math.max(0,p.hp-damage);stats.bossHits++;explode(p.mesh.getWorldPosition(new T.Vector3()),'#d5ff64',damage>1?35:8);if(!p.hp){p.mesh.visible=false;say('TITAN ARMOR DESTROYED',2);}if(boss.pods.every(p=>p.hp===0)){boss.dead=true;say('TITAN CORE CRITICAL',3);sound('roar');}}}
function reset(nextLevel=1){level=nextLevel;resetTeam();wolverineTimer=1.5;wolverineAttack=null;wolverine.visible=level>=2;fortress.visible=level>=2;$('ally-status').hidden=level<2;$('level-label').textContent=level===3?'LEVEL 3 // HEROES ASSEMBLE':level===2?'LEVEL 2 // CLAW ASSAULT':'LEVEL 1 // ALIEN STRIKE';$('bossbar').querySelector('span').textContent=level===3?'WORLD BREAKER // GIANT GREEN ALIEN':level===2?'TITAN PRIME // FORTRESS COMMANDER':'GREEN TITAN // BOSS';$('next-level').hidden=true;scene.fog.color.set(level===2?'#795e70':'#b8745d');sky.material.uniforms.hor.value.set(level===2?'#815975':'#bb684f');for(const w of shockwaves){scene.remove(w.mesh);w.mesh.geometry.dispose();w.mesh.material.dispose();}shockwaves.length=0;turbo=worldDistance=kick=combo=points=0;lastKill=-10;touch.turbo=false;$('combat').textContent='';for(const e of enemies)removeMesh(e.mesh);for(const s of shots)removeMesh(s.mesh);enemies.length=shots.length=particles.length=0;if(boss)removeMesh(boss.mesh);boss=null;time=score=shotTimer=missileTimer=buddyTimer=power=invulnerable=victoryTimer=0;shield=5;Object.keys(stats).forEach(k=>stats[k]=0);hero.position.set(0,15,6);buddy.position.set(-9,17,-2);hero.rotation.set(0,0,0);for(let i=0;i<15;i++)spawn(i,true);orbs.forEach(o=>resetOrb(o,false));$('bossbar').hidden=true;$('victory').hidden=true;keys.clear();touch.x=touch.y=0;touch.fire=false;$('knob').style.transform='';state='playing';document.body.className='playing';say(level===3?'CAPTAIN GUS + COLE // HEROES ASSEMBLE':level===2?'LEVEL 2 // WOLVERINE JOINS THE HUNT':'OFFICER BLUE ON YOUR WING // ENGAGE',3);sound('power');}
function start(){unlock();reset();}
$('smash').onclick=()=>{unlock();callHulk();};$('level-three').onclick=()=>{unlock();reset(3);};$('level-two').onclick=()=>{unlock();reset(2);};$('next-level').onclick=()=>{unlock();reset(Math.min(3,level+1));};$('start').onclick=start;$('again').onclick=()=>{unlock();reset(level);};$('restart').onclick=()=>{unlock();reset(level);};$('mute').onclick=()=>{unlock();muted=!muted;master.gain.value=muted?0:.24;$('mute').textContent=muted?'SOUND OFF':'SOUND ON';$('mute').setAttribute('aria-label',muted?'Enable sound':'Mute sound');};
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','KeyW','KeyA','KeyS','KeyD','KeyX','KeyM','ShiftLeft','ShiftRight','KeyH'].includes(e.code)){e.preventDefault();unlock();if(e.code==='Enter'){if(!e.repeat)start();return;}if(state==='ready')reset();keys.add(e.code);if(e.code==='KeyH'&&!e.repeat)callHulk();if((e.code==='KeyX'||e.code==='KeyM')&&!e.repeat)fire('gus',true);}});window.addEventListener('keyup',e=>keys.delete(e.code));
function clearInput(){touch.turbo=false;keys.clear();touch.fire=false;touch.x=touch.y=0;$('knob').style.transform='';}
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
for(const [id,isMissile]of [['fire',false],['missile',true],['launch',true]]){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();unlock();b.setPointerCapture(e.pointerId);if(isMissile)fire('gus',true);else touch.fire=true;});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{if(!isMissile)touch.fire=false;});}
$('turbo').addEventListener('pointerdown',e=>{e.preventDefault();unlock();$('turbo').setPointerCapture(e.pointerId);touch.turbo=true;});for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('turbo').addEventListener(ev,()=>touch.turbo=false);
let stickPointer=null;function moveStick(e){if(e.pointerId!==stickPointer)return;const r=$('stick').getBoundingClientRect(),radius=r.width*.35;let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;const n=Math.max(1,Math.hypot(x,y));touch.x=x/n;touch.y=-y/n;$('knob').style.transform=`translate(${touch.x*radius}px,${-touch.y*radius}px)`;}
$('stick').addEventListener('pointerdown',e=>{unlock();if(stickPointer!==null)return;stickPointer=e.pointerId;$('stick').setPointerCapture(e.pointerId);moveStick(e);});$('stick').addEventListener('pointermove',moveStick);for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('stick').addEventListener(ev,e=>{if(e.pointerId===stickPointer){stickPointer=null;touch.x=touch.y=0;$('knob').style.transform='';}});
function update(dt){visualTime+=dt;const active=state==='playing';if(active)time+=dt;turbo=T.MathUtils.damp(turbo,active&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.turbo)?1:0,5,dt);const speedBoost=1+turbo*3;worldDistance+=dt*(active?17*speedBoost:5);document.body.classList.toggle('turbo-active',turbo>.2);$('turbo').setAttribute('aria-pressed',turbo>.2?'true':'false');if(engineOsc){engineOsc.frequency.setTargetAtTime(58+turbo*100,audio.currentTime,.12);engineGain.gain.setTargetAtTime(.035+turbo*.09,audio.currentTime,.12);}muzzleTime-=dt;muzzle.visible=muzzleTime>0;streaks.material.opacity=turbo*.45;for(let i=0;i<48;i++){streakPositions[i*6+2]+=dt*140*speedBoost;if(streakPositions[i*6+2]>30)streakPositions[i*6+2]=-140;streakPositions[i*6+5]=streakPositions[i*6+2]+8+turbo*15;}streakGeo.attributes.position.needsUpdate=true;for(let i=shockwaves.length-1;i>=0;i--){const w=shockwaves[i];w.life+=dt;w.mesh.scale.setScalar(1+w.life/w.max*w.size);w.mesh.material.opacity=Math.max(0,1-w.life/w.max);if(w.life>=w.max){scene.remove(w.mesh);w.mesh.geometry.dispose();w.mesh.material.dispose();shockwaves.splice(i,1);}}
for(const m of [...rocks,...dunes]){m.position.z+=dt*(active?17*speedBoost:5);if(m.position.z>48)m.position.z-=520;}
updateRocks();
for(const ship of [hero,buddy])for(const plume of ship.userData.plumes||[]){plume.scale.y=1+turbo*2.8+.18*Math.sin(visualTime*31);plume.position.z=4.9+turbo*4.5;plume.material.opacity=.76+turbo*.24;}buddy.userData.lights.forEach((m,i)=>m.visible=Math.floor(visualTime*8)%2===i);
if(active){const x=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0)+touch.x,y=(keys.has('ArrowUp')||keys.has('KeyW')?1:0)-(keys.has('ArrowDown')||keys.has('KeyS')?1:0)+touch.y;hero.position.x=clamp(hero.position.x+x*17*(1+turbo*.4)*dt,-Math.min(14,camera.aspect*10),Math.min(14,camera.aspect*10));hero.position.y=clamp(hero.position.y+y*12*(1+turbo*.4)*dt,12,26);hero.rotation.z=T.MathUtils.damp(hero.rotation.z,-x*.45,8,dt);hero.rotation.x=T.MathUtils.damp(hero.rotation.x,y*.18,8,dt);shotTimer-=dt;missileTimer=Math.max(0,missileTimer-dt);buddyTimer-=dt;invulnerable-=dt;power-=dt;if((keys.has('Space')||touch.fire)&&shotTimer<=0){fire();shotTimer=power>0?.065:.095;}if(buddyTimer<=0){fire('police');buddyTimer=.32;const danger=orbs.find(o=>!o.collect&&o.z>hero.position.z-14&&o.z<hero.position.z-3&&Math.hypot(o.x-hero.position.x,o.y-hero.position.y)<4);if(danger){explode(new T.Vector3(danger.x,danger.y,danger.z),'#77deff',14);resetOrb(danger);stats.protects++;}}
if(time>=(level===3?12:level===2?23:32)&&!boss)makeBoss();
const dive=Math.sin(time*.45)> .7;const bp=new T.Vector3(hero.position.x-9,hero.position.y+2,dive?-16:1);buddy.position.lerp(bp,1-Math.exp(-dt*2));buddy.rotation.z=Math.sin(time*2)*.12+hero.rotation.z*.5;
for(const e of enemies){if(e.hp<=0)continue;e.mesh.position.z+=dt*((e.big?7:11)+turbo*30);e.mesh.position.x=e.baseX+Math.sin(time*1.2+e.phase)*3;e.mesh.position.y=e.baseY+Math.sin(time*2+e.phase)*1.4;e.flash=Math.max(0,(e.flash||0)-dt);e.mesh.scale.setScalar(e.flash>0?1.2:1);e.mesh.rotation.z=Math.sin(time*3+e.phase)*.18+(e.flash>0?.3:0);e.mesh.rotation.y+=dt*.6;if(e.mesh.position.z>18){e.mesh.position.z=-160;e.hp=e.big?(level===3?10:level===2?7:5):(level>=2?3:2);}e.cool-=dt;if(e.cool<0){e.cool=rand(4,8);const o=orbs.find(o=>!o.collect&&o.z< -100);if(o){o.x=e.mesh.position.x;o.y=e.mesh.position.y;o.z=e.mesh.position.z;}}}
for(let i=enemies.length-1;i>=0;i--)if(enemies[i].hp<=0)enemies.splice(i,1);if(enemies.length<12&&!boss)spawn(Math.floor(rand(0,15)));if(enemies.length<4&&boss&&!boss.dead)spawn(Math.floor(rand(0,15)));
for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.life-=dt;let t=s.target;if(t&&(t.e?.hp<=0||t.pod?.hp<=0)){t=s.target=nearest(s.mesh.position);}if(t?.pod)t.p.copy(t.pod.mesh.getWorldPosition(new T.Vector3()));let dir=t?t.p.clone().sub(s.mesh.position):new T.Vector3(0,0,-100);const distance=dir.length(),step=s.speed*dt;dir.normalize();s.mesh.position.addScaledVector(dir,Math.min(step,distance));if(s.missile){s.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),dir);for(let trail=0;trail<4&&particles.length<maxParticles;trail++)particles.push({p:s.mesh.position.clone().add(new T.Vector3(rand(-.3,.3),rand(-.3,.3),1.5+rand(0,.7))),v:new T.Vector3(rand(-1,1),rand(-1,1),rand(2,7)),life:.4,max:.4,c:new T.Color(trail%2?'#f9f1d6':'#ff9e43')});}if(t&&distance<step+1.7){hit(t,s.missile?8:1,s.owner);if(s.missile){stats.missileHits++;say('MISSILE STRIKE  //  +250',1.2);points+=250;shockwave(s.mesh.position,true);explode(s.mesh.position,'#ffbd45',110);for(const other of targets())if((other.e||other.pod)!==(t.e||t.pod)&&other.p.distanceTo(s.mesh.position)<14)hit(other,8,s.owner);}s.life=0;}if(s.life<=0||s.mesh.position.z< -260){scene.remove(s.mesh);shots.splice(i,1);}}
if(boss){const b=boss;if(!b.dead){b.stagger=Math.max(0,(b.stagger||0)-dt);b.mesh.rotation.z=Math.sin(visualTime*35)*b.stagger*.22;b.mesh.position.y=T.MathUtils.damp(b.mesh.position.y,13,1,dt);b.mesh.position.x=Math.sin(time*.5)*6;b.arms.forEach((a,i)=>a.rotation.z=Math.sin(time*2+i)*.3);b.pods.forEach((p,i)=>p.mesh.scale.setScalar(1+.12*Math.sin(time*6+i)));$('bossfill').style.width=`${b.pods.reduce((n,p)=>n+p.hp,0)/(level===3?360:level===2?108:54)*100}%`;if(Math.floor(time*8)%3===0){const p=b.pods[Math.floor(time*3)%3];if(p.hp>0&&particles.length<maxParticles)particles.push({p:p.mesh.getWorldPosition(new T.Vector3()),v:new T.Vector3(rand(-20,20),rand(-10,15),rand(8,30)),life:.5,max:.5,c:new T.Color('#a1ffef')});}}else{b.deathTime+=dt;b.mesh.rotation.z=Math.sin(b.deathTime*12)*.12;b.mesh.scale.setScalar(1+Math.sin(b.deathTime*8)*.12);b.mesh.position.y+=dt*8;if(Math.random()<dt*12)explode(b.mesh.position.clone().add(new T.Vector3(rand(-12,12),rand(-8,18),rand(-3,6))),'#aaff67',45);if(b.deathTime>3.5){explode(b.mesh.position,'#ffed80',250);shockwave(b.mesh.position,true);points+=5000;feedback('TITAN DESTROYED  +5000');removeMesh(b.mesh);state='won';document.body.className='won';$('victory').hidden=false;$('bossbar').hidden=true;$('victoryscore').textContent=level===3?`Captain Gus and Cole saved the desert! Hulk smashed ${stats.hulkSmashes} times. Avengers and X-Men: mission complete.`:level===2?`${score} alien craft destroyed. Wolverine landed ${stats.wolverineHits} claw strikes. Fortress secured!`:`${score} alien craft destroyed. Titan defeated. Wolverine is waiting in Level 2.`;$('next-level').hidden=level>=3;$('next-level').textContent=level===1?'LEVEL 2 · WOLVERINE ↗':'LEVEL 3 · HULK + HEROES ↗';$('victory').querySelector('.eyebrow').textContent=level===3?'HEROES UNITED // WORLD BREAKER DEFEATED':level===2?'LEVEL 2 COMPLETE // FORTRESS SECURED':'LEVEL 1 COMPLETE // NEXT MISSION UNLOCKED';say('');sound('win');}}}
}
if(!active){buddy.position.y=17+Math.sin(visualTime)*.5;hero.rotation.z=Math.sin(visualTime*.7)*.08;}
for(let i=0;i<orbCount;i++){const o=orbs[i];o.z+=dt*(active?15*speedBoost:5);if(o.z>24)resetOrb(o);if(active&&Math.abs(o.z-hero.position.z)<1.7&&Math.hypot(o.x-hero.position.x,o.y-hero.position.y)<2){if(o.collect){stats.collections++;power=6;shield=Math.min(5,shield+1);sound('power');say('WEAPONS OVERCHARGED',2);}else if(invulnerable<=0){shield--;invulnerable=2;sound('zap');if(shield<=0){shield=5;stats.rescues++;say('OFFICER BLUE // SHIELD RESTORED',3);sound('power');}else say('SHIELD HIT // STAY ON TARGET',1.5);}resetOrb(o);}orbPositions.set([o.x+Math.sin(visualTime+o.phase)*.4,o.y,o.z],i*3);const pulse=.65+.35*Math.sin(visualTime*4+o.phase);orbColors.set(o.collect?[pulse,pulse,.18]:[.2*pulse,.8*pulse,pulse],i*3);}og.attributes.position.needsUpdate=og.attributes.color.needsUpdate=true;
for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.p.addScaledVector(p.v,dt);p.v.multiplyScalar(1-dt*1.3);if(p.life<=0)particles.splice(i,1);}particles.forEach((p,i)=>{pp.set(p.p.toArray(),i*3);pc.set([p.c.r*p.life/p.max,p.c.g*p.life/p.max,p.c.b*p.life/p.max],i*3);});pg.setDrawRange(0,particles.length);pg.attributes.position.needsUpdate=pg.attributes.color.needsUpdate=true;
if(messageTime>0){messageTime-=dt;if(messageTime<=0)$('message').textContent='';}// Shield impacts must never hide the player's aircraft. Keep it visible at all times.
updateWolverine(dt);updateTeam(dt);hero.visible=true;$('score').textContent=score;$('shield').textContent='● '.repeat(shield)+'○ '.repeat(5-shield);$('missilestatus').textContent=missileTimer>0?'MISSILE // '+missileTimer.toFixed(1)+'s':'MISSILE // X / M // READY';$('missile').style.opacity=missileTimer>0?.5:1;$('launch').disabled=missileTimer>0;document.body.classList.toggle('missile-fired',missileTimer>1.18);
camera.position.x=T.MathUtils.damp(camera.position.x,hero.position.x,3,dt);
camera.position.y=T.MathUtils.damp(camera.position.y,hero.position.y+7.5,3,dt);
camera.position.z=T.MathUtils.damp(camera.position.z,hero.position.z+24,3,dt);
// Follow the aircraft, rather than looking below it into the terrain.
kick=T.MathUtils.damp(kick,0,14,dt);camera.position.x+=Math.sin(visualTime*91)*kick;camera.position.y+=Math.cos(visualTime*79)*kick;camera.fov=T.MathUtils.damp(camera.fov,66+turbo*10,5,dt);camera.updateProjectionMatrix();camera.lookAt(hero.position.x,hero.position.y-2,hero.position.z-27);$('points').textContent=points.toLocaleString()+' PTS';
sky.position.copy(camera.position);
}
for(let i=0;i<15;i++)spawn(i,true);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.fov=66;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let freezeFrame=false;let last=performance.now();function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.04);last=now;if(!document.hidden){if(!freezeFrame)update(dt);renderer.render(scene,camera);}}requestAnimationFrame(loop);
// Read-only diagnostics plus deterministic stepping only in explicit test mode.
if(new URLSearchParams(location.search).has('test'))window.gusTest={
  planeScreen:()=>{hero.updateWorldMatrix(true,true);const p=hero.getWorldPosition(new T.Vector3()).project(camera);return {ndc:[p.x,p.y,p.z],pixels:[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2],camera:camera.position.toArray(),hero:hero.position.toArray(),heroVisible:hero.visible,planeChildren:hero.children.length};},
  planeVisible:(on)=>{hero.visible=on;buddy.visible=on;renderer.render(scene,camera);},
  freeze:(on)=>{freezeFrame=!!on;renderer.render(scene,camera);},
  planePixelCoverage:()=>{
    const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    function capture(){
      renderer.render(scene,camera);
      const out=new Uint8Array(w*h*4);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,out);
      return out;
    }
    const wasHero=hero.visible,wasBuddy=buddy.visible;
    hero.visible=true;buddy.visible=true;
    const on=capture();
    hero.visible=false;buddy.visible=false;
    const off=capture();
    hero.visible=wasHero;buddy.visible=wasBuddy;
    renderer.render(scene,camera);
    let changed=0,minX=w,minY=h,maxX=0,maxY=0;
    for(let i=0;i<on.length;i+=4){
      if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])<50)continue;
      changed++;
      const pixel=i/4,x=pixel%w,y=Math.floor(pixel/w);
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);
      minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    return {changed,ratio:changed/(w*h),bounds:changed?{left:minX/w,top:1-maxY/h,right:maxX/w,bottom:1-minY/h}:null,screen:this?.planeScreen?.(),drawSize:[w,h],bufferSample:[...on.slice((Math.floor(h/2)*w+Math.floor(w/2))*4,(Math.floor(h/2)*w+Math.floor(w/2))*4+4)],nonzeroBytes:on.filter(v=>v>0).length,glError:gl.getError()};
  },
  snapshot:()=>({state,level,team:{hulkVisible:hulk.mesh.visible,hulkPosition:hulk.mesh.position.toArray(),hulkAttacking:!!hulkAttack,hulkCooldown,members:avengers.filter(a=>a.mesh.visible).map(a=>a.name)},wolverine:{visible:wolverine.visible,p:wolverine.position.toArray(),attacking:!!wolverineAttack},time,score,shield,turbo,worldDistance,points,combo,fov:camera.fov,stats:{...stats},hero:hero.position.toArray(),buddy:buddy.position.toArray(),shots:shots.map(s=>({missile:s.missile,p:s.mesh.position.toArray()})),boss:boss?{hp:boss.pods.map(p=>p.hp),dead:boss.dead}:null,orbs:orbCount,particles:particles.length,drawCalls:renderer.info.render.calls,audio:audio?.state,muted,touch:{...touch}}),orbAtHero:(collect)=>{const o=orbs[0];o.collect=collect;o.x=hero.position.x;o.y=hero.position.y;o.z=hero.position.z;},advance:(seconds)=>{for(let i=0;i<seconds*60;i++)update(1/60);renderer.render(scene,camera);}};
