// ─── Cinematic layer ──────────────────────────────────────────────────────────
// Appended last. Owns no mission state: it only reacts to events the canonical
// modules already produce (shots, hits, launches, kills, crashes) and makes them
// physical — fire, smoke, dust, vapor, light, sound and a little camera weight.
// Everything is pooled or drawn in two GPU particle layers, so cost is bounded.

// ── GPU particles: one additive fire layer, one alpha smoke layer ─────────────
const CINE_FIRE_MAX=lowPower?480:1100,CINE_SMOKE_MAX=lowPower?420:960;
const cineFogColor=new THREE.Color(),cineUniforms={scale:{value:1},fogColor:{value:cineFogColor},fogDensity:{value:.0009}};
function cineLayer(max,additive){
 const geo=new THREE.BufferGeometry(),pos=new Float32Array(max*3),col=new Float32Array(max*4),size=new Float32Array(max),seed=new Float32Array(max);
 geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
 geo.setAttribute('aColor',new THREE.BufferAttribute(col,4).setUsage(THREE.DynamicDrawUsage));
 geo.setAttribute('aSize',new THREE.BufferAttribute(size,1).setUsage(THREE.DynamicDrawUsage));
 geo.setAttribute('aSeed',new THREE.BufferAttribute(seed,1).setUsage(THREE.DynamicDrawUsage));
 geo.setDrawRange(0,0);
 const mat=new THREE.ShaderMaterial({uniforms:cineUniforms,transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,
  vertexShader:`attribute vec4 aColor;attribute float aSize,aSeed;uniform float scale;varying vec4 vColor;varying float vSeed,vDepth;
   void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vColor=aColor;vSeed=aSeed;vDepth=-mv.z;gl_PointSize=clamp(aSize*scale/max(-mv.z,.5),0.,900.);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 fogColor;uniform float fogDensity;varying vec4 vColor;varying float vSeed,vDepth;
   void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;
    float fog=1.-exp(-fogDensity*fogDensity*vDepth*vDepth*.55);
    ${additive?
     `float a=pow(1.-r,1.7);gl_FragColor=vec4(vColor.rgb*vColor.a*a*(1.-fog),1.);`:
     `float c=cos(vSeed*6.28),s=sin(vSeed*6.28);vec2 q=mat2(c,-s,s,c)*p;
      float edge=r+sin(q.x*5.3+vSeed*11.)*sin(q.y*4.1-vSeed*7.)*.16;float a=smoothstep(1.,.18,edge);
      vec3 rgb=vColor.rgb*(.82+.3*clamp(.5-q.y*.5,0.,1.));gl_FragColor=vec4(mix(rgb,fogColor,fog),vColor.a*a);`}
   }`});
 const points=new THREE.Points(geo,mat);points.frustumCulled=false;points.renderOrder=additive?3:2;scene.add(points);
 return {geo,pos,col,size,seed,max,list:[],points};
}
const cineFire=cineLayer(CINE_FIRE_MAX,true),cineSmoke=cineLayer(CINE_SMOKE_MAX,false);
// o: {v,drag,grav,rise,life,s0,s1,c0,c1,a,delay,smoke}
function cineEmit(layer,p,o){
 if(layer.list.length>=layer.max)return;
 layer.list.push({x:p.x,y:p.y,z:p.z,vx:o.v?o.v.x:0,vy:o.v?o.v.y:0,vz:o.v?o.v.z:0,drag:o.drag||0,grav:o.grav||0,rise:o.rise||0,
  age:-(o.delay||0),life:o.life,s0:o.s0,s1:o.s1??o.s0,c0:o.c0,c1:o.c1||o.c0,a:o.a??1,seed:Math.random(),fadeIn:o.fadeIn??(layer===cineSmoke?.12:0)});
}
function cineUpdateLayer(layer,dt){
 const L=layer.list;let n=0;
 for(let i=L.length-1;i>=0;i--){
  const q=L[i];q.age+=dt;if(q.age<0)continue;
  if(q.age>=q.life){L[i]=L[L.length-1];L.pop();continue;}
  const damp=Math.exp(-q.drag*dt);q.vx*=damp;q.vy=q.vy*damp-q.grav*dt;q.vz*=damp;
  q.x+=q.vx*dt;q.y+=(q.vy+q.rise)*dt;q.z+=q.vz*dt;
 }
 for(const q of L){
  if(q.age<0)continue;
  const k=q.age/q.life,ck=Math.pow(k,.6),o3=n*3,o4=n*4;
  layer.pos[o3]=q.x;layer.pos[o3+1]=q.y;layer.pos[o3+2]=q.z;
  layer.col[o4]=q.c0[0]+(q.c1[0]-q.c0[0])*ck;layer.col[o4+1]=q.c0[1]+(q.c1[1]-q.c0[1])*ck;layer.col[o4+2]=q.c0[2]+(q.c1[2]-q.c0[2])*ck;
  const fade=layer===cineSmoke?Math.pow(1-k,1.25):Math.pow(1-k,1.5);
  layer.col[o4+3]=q.a*fade*(q.fadeIn>0?Math.min(1,q.age/q.fadeIn):1);
  layer.size[n]=q.s0+(q.s1-q.s0)*(1-Math.pow(1-k,2.4));layer.seed[n]=q.seed;n++;
 }
 const g=layer.geo;g.setDrawRange(0,n);
 if(n){for(const name of ['position','aColor','aSize','aSeed']){const a=g.attributes[name];a.needsUpdate=true;a.clearUpdateRanges?.();a.addUpdateRange?.(0,n*a.itemSize);}}
}
function cineClearParticles(){cineFire.list.length=0;cineSmoke.list.length=0;cineFire.geo.setDrawRange(0,0);cineSmoke.geo.setDrawRange(0,0);}

// ── Pooled lights (fixed count: no shader recompiles mid-fight) ───────────────
const cineLights=[0,1].map(()=>{const light=new THREE.PointLight(0xff9a52,0,900,1.5);scene.add(light);return {light,life:0,max:1,peak:0};});
const cineGunLight=new THREE.PointLight(0xffd59a,0,60,1.6);cineGunLight.position.set(0,.4,-6);ship.add(cineGunLight);
function cineFlash(pos,peak,life){const slot=cineLights.reduce((a,b)=>a.life<b.life?a:b);slot.light.position.copy(pos);slot.peak=peak;slot.life=slot.max=life;}

// ── Sound: filtered noise and low sines, through one compressor ───────────────
let cineBus=null,cineNoise=null,cineMuted=0;
function cineAudio(){
 if(cineBus||!audioCtx)return !!cineBus;
 const comp=audioCtx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.25;
 cineBus=audioCtx.createGain();cineBus.gain.value=.85;cineBus.connect(comp).connect(audioCtx.destination);
 cineNoise=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);const d=cineNoise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 return true;
}
function cinePan(pos){if(!pos)return 0;const rel=pos.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());return THREE.MathUtils.clamp(rel.x/Math.max(1,Math.hypot(rel.x,rel.z)),-.8,.8);}
function cineOut(pan){if(!pan||!audioCtx.createStereoPanner)return cineBus;const p=audioCtx.createStereoPanner();p.pan.value=pan;p.connect(cineBus);return p;}
function cineHiss({dur=.3,gain=.2,f0=1200,f1=200,type='lowpass',q=.8,delay=0,attack=.005,pan=0}){
 if(!audioCtx||audioCtx.state!=='running'||!cineAudio())return;
 const t=audioCtx.currentTime+delay,src=audioCtx.createBufferSource(),f=audioCtx.createBiquadFilter(),g=audioCtx.createGain();
 src.buffer=cineNoise;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(25,f1),t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 src.connect(f).connect(g).connect(cineOut(pan));src.start(t,Math.random()*1.4);src.stop(t+dur+.05);
}
function cineTone(f0,f1,dur,gain,type='sine',delay=0,pan=0){
 if(!audioCtx||audioCtx.state!=='running'||!cineAudio())return;
 const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();
 o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g).connect(cineOut(pan));o.start(t);o.stop(t+dur+.03);
}
const cineSound={
 gun(){const v=Math.random()*.12;cineHiss({dur:.085,gain:.2,f0:2600+v*900,f1:520,type:'bandpass',q:.75});cineTone(118,48,.07,.2,'sine');cineHiss({dur:.03,gain:.1,f0:7000,f1:3500,type:'highpass'});},
 ping(pos){const pan=cinePan(pos);cineTone(2300+Math.random()*500,1500,.07,.035,'triangle',0,pan);cineHiss({dur:.06,gain:.07,f0:6000,f1:2500,type:'highpass',pan});},
 rail(){cineHiss({dur:.2,gain:.32,f0:520,f1:70});cineTone(90,40,.18,.16);},
 ignite(){cineHiss({dur:1.5,gain:.34,f0:260,f1:2900,type:'bandpass',q:1.1,attack:.04});cineHiss({dur:.9,gain:.12,f0:5200,f1:1600,type:'highpass',attack:.03});cineTone(70,140,.5,.08,'sawtooth');},
 boom(size,pos){
  const dist=pos?pos.distanceTo(camera.position):0,att=THREE.MathUtils.clamp(1-dist/2600,.12,1),delay=Math.min(.55,dist/1500),pan=cinePan(pos),s=Math.min(1.6,size);
  cineHiss({dur:.14,gain:.28*att*s,f0:3800,f1:700,type:'bandpass',q:.6,delay,pan});
  cineHiss({dur:1.3+size*.55,gain:.62*att*s,f0:1500,f1:40,delay,pan,attack:.01});
  cineTone(74,26,.9+size*.3,.36*att*s,'sine',delay);
  if(size>1.2)cineHiss({dur:2.6,gain:.22*att,f0:420,f1:40,delay:delay+.18,attack:.3});
 },
 whoosh(pos){const pan=cinePan(pos);cineHiss({dur:.55,gain:.34,f0:3400,f1:380,type:'bandpass',q:2.2,attack:.04,pan});cineTone(1600,420,.4,.03,'sawtooth',0,pan);},
 impact(){cineHiss({dur:2.8,gain:.9,f0:1800,f1:30,attack:.004});cineTone(60,22,2.2,.5);cineHiss({dur:.25,gain:.5,f0:4500,f1:600,type:'bandpass',q:.5});}
};
// Replace the square-wave beeps on physical events; interface chirps stay as they are.
const cineChirpBase=chirp;chirp=function(...a){if(cineMuted>0)return;cineChirpBase(...a);};
function cineQuiet(fn){cineMuted++;try{return fn();}finally{cineMuted--;}}

// ── Camera weight: shake from events, lag under roll and G ────────────────────
let cineShake=0,cineCamRoll=0,cineCamPull=0;const cineCamOffset=new THREE.Vector3(),cineTmp=new THREE.Vector3();
function cineKick(amount){cineShake=Math.max(cineShake,amount);}
const cineCameraBase=updateCamera;
updateCamera=function(dt){
 // Offsets are applied after the chase solve and removed before the next one, so they never accumulate.
 camera.position.sub(cineCamOffset);
 cineCameraBase(dt);
 cineCamRoll=THREE.MathUtils.lerp(cineCamRoll,rollRate,1-Math.exp(-dt/.12));
 cineCamPull=THREE.MathUtils.lerp(cineCamPull,pitchRate,1-Math.exp(-dt/.16));
 cineShake*=Math.exp(-dt/.16);
 const t=performance.now()*.001,k=Math.min(1.2,cineShake);
 const before=cineTmp.copy(camera.position);
 camera.translateX(-cineCamRoll*.42+(k>.01?Math.sin(t*71)*k*.34+Math.sin(t*37)*k*.22:0));
 camera.translateY(-cineCamPull*.75+(k>.01?Math.sin(t*59)*k*.24:0));
 cineCamOffset.copy(camera.position).sub(before);
 if(k>.01){camera.rotateZ(Math.sin(t*43)*k*.012);}
 cineUniforms.scale.value=renderer.domElement.height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2));
};

// ── Recipes ────────────────────────────────────────────────────────────────────
const cineRnd=(k=1)=>(Math.random()-.5)*2*k,cineV=(x,y,z)=>new THREE.Vector3(x,y,z),cineP=new THREE.Vector3();
const CINE_WHITE=[1,.96,.86],CINE_GOLD=[1,.78,.42],CINE_ORANGE=[1,.46,.14],CINE_EMBER=[.62,.12,.03];
const CINE_SOOT=[.09,.075,.07],CINE_ASH=[.36,.32,.3],CINE_SAND=[.66,.5,.36],CINE_DUSK=[.75,.62,.5];
function cineExplosion(pos,size=1,vel=null,{ground=false,quiet=false}={}){
 const drift=vel?vel.clone().multiplyScalar(.28):cineV(0,0,0),S=size,root=Math.sqrt(size);
 cineEmit(cineFire,pos,{s0:5*S,s1:24*S,life:.18,c0:CINE_WHITE,c1:CINE_GOLD,a:.8,v:drift});
 const balls=Math.min(18,Math.round(9*Math.pow(S,.75))+3);
 for(let i=0;i<balls;i++){
  cineP.set(pos.x+cineRnd(3*S),pos.y+cineRnd(2.2*S),pos.z+cineRnd(3*S));
  const v=cineV(cineRnd(16*S),cineRnd(12*S)+5*S,cineRnd(16*S)).add(drift);if(ground)v.y=Math.abs(v.y)+4*S;
  cineEmit(cineFire,cineP,{v,drag:2.6,rise:4*S,s0:6*S,s1:(15+Math.random()*9)*S,life:.55+Math.random()*.55,c0:i<2?CINE_WHITE:CINE_GOLD,c1:i%2?CINE_EMBER:CINE_ORANGE,a:.55,delay:i>8?Math.random()*.12:0});
 }
 for(let i=0;i<Math.round(16*root)+6;i++){
  const v=cineV(cineRnd(1),Math.random()*.9-.15,cineRnd(1)).normalize().multiplyScalar((55+Math.random()*80)*root).add(drift);
  cineEmit(cineFire,pos,{v,drag:.9,grav:38,s0:1.1*root,s1:.35,life:.6+Math.random()*.7,c0:CINE_GOLD,c1:CINE_ORANGE,a:1});
 }
 for(let i=0;i<Math.round(9*root)+4;i++){
  cineP.set(pos.x+cineRnd(4*S),pos.y+cineRnd(3*S),pos.z+cineRnd(4*S));
  const v=cineV(cineRnd(9*S),Math.random()*7*S+2,cineRnd(9*S)).add(drift.clone().multiplyScalar(.5));
  cineEmit(cineSmoke,cineP,{v,drag:1.1,rise:4+3*S,s0:7*S,s1:(26+Math.random()*16)*S,life:2.8+Math.random()*1.8,c0:CINE_SOOT,c1:ground?CINE_DUSK:CINE_ASH,a:.78,delay:.08+Math.random()*.25,fadeIn:.25});
 }
 if(ground)cineDust(pos,size*1.3);
 cineFlash(pos,180*Math.min(2.4,S),.55+S*.22);
 const near=1-THREE.MathUtils.smoothstep(pos.distanceTo(camera.position),60,900);cineKick(near*Math.min(1.2,.35+S*.35));
 if(!quiet)cineSound.boom(size,pos);
}
function cineDust(pos,size=1,dir=null){
 const n=Math.round(6+size*5);
 for(let i=0;i<n;i++){
  const a=Math.random()*Math.PI*2,r=(4+Math.random()*8)*size;cineP.set(pos.x+Math.cos(a)*r*.4,pos.y+.6,pos.z+Math.sin(a)*r*.4);
  const v=cineV(Math.cos(a)*r*1.6,3+Math.random()*7*size,Math.sin(a)*r*1.6);if(dir)v.addScaledVector(dir,.25);
  cineEmit(cineSmoke,cineP,{v,drag:1.5,rise:1.6,s0:3*size,s1:(12+Math.random()*8)*size,life:1.4+Math.random()*1.2,c0:CINE_SAND,c1:CINE_DUSK,a:.5});
 }
}
function cineSparks(pos,n,speed=40,dir=null){
 for(let i=0;i<n;i++){const v=cineV(cineRnd(1),Math.random()*.8,cineRnd(1)).normalize().multiplyScalar(speed*(.5+Math.random()));if(dir)v.addScaledVector(dir,.3);
  cineEmit(cineFire,pos,{v,drag:1.2,grav:45,s0:.7,s1:.2,life:.25+Math.random()*.3,c0:CINE_WHITE,c1:CINE_ORANGE,a:1});}
}

// Burning wreckage: falls, tumbles, trails fire and smoke, and detonates on the valley floor.
const cineWreck=[],cineWreckGeo=[new THREE.BoxGeometry(2.4,.4,3.6),new THREE.BoxGeometry(1.4,.5,2.6),new THREE.TetrahedronGeometry(1.4)];
const cineWreckMat=new THREE.MeshStandardMaterial({color:0x15191c,roughness:.7,metalness:.45});
function cineSpawnWreck(pos,vel,count){
 for(let i=0;i<count;i++){
  const mesh=new THREE.Mesh(cineWreckGeo[i%3],cineWreckMat);mesh.position.copy(pos).add(cineV(cineRnd(3),cineRnd(2),cineRnd(3)));mesh.castShadow=!lowPower;scene.add(mesh);
  const v=vel.clone().multiplyScalar(.55+Math.random()*.25).add(cineV(cineRnd(38),10+Math.random()*26,cineRnd(38)));
  cineWreck.push({mesh,v,spin:cineV(cineRnd(6),cineRnd(7),cineRnd(6)),age:0,emit:0,big:i===0});
 }
}
function cineUpdateWreck(dt){
 for(let i=cineWreck.length-1;i>=0;i--){
  const w=cineWreck[i];w.age+=dt;w.v.y-=34*dt;w.v.multiplyScalar(Math.exp(-dt*.35));w.mesh.position.addScaledVector(w.v,dt);
  w.mesh.rotation.x+=w.spin.x*dt;w.mesh.rotation.y+=w.spin.y*dt;w.mesh.rotation.z+=w.spin.z*dt;
  w.emit-=dt;if(w.emit<=0){w.emit=.026;
   cineEmit(cineFire,w.mesh.position,{s0:w.big?4.2:2.6,s1:.8,life:.22,c0:CINE_GOLD,c1:CINE_ORANGE,a:.9});
   cineEmit(cineSmoke,w.mesh.position,{v:cineV(cineRnd(1.5),2,cineRnd(1.5)),rise:2.5,s0:w.big?3:2,s1:w.big?15:10,life:2.4+Math.random(),c0:CINE_SOOT,c1:CINE_ASH,a:.6});}
  const floor=terrainHeight(w.mesh.position.x,w.mesh.position.z);
  if(w.mesh.position.y<floor+1||w.age>7){
   if(w.mesh.position.y<floor+1){w.mesh.position.y=floor+1;cineExplosion(w.mesh.position,w.big?1.1:.6,null,{ground:true,quiet:!w.big});v44MakeFire?.(w.mesh.position.clone(),w.big?.45:.25,.3);}
   scene.remove(w.mesh);cineWreck.splice(i,1);
  }
 }
}
function cineClearWreck(){for(const w of cineWreck)scene.remove(w.mesh);cineWreck.length=0;}

// ── Hooks into canonical events ────────────────────────────────────────────────
// Cannon: heavier tracers, a muzzle light on the airframe, a real report.
const cineFireGunBase=fireGun;
fireGun=function(){
 const before=tracers.length;cineQuiet(()=>cineFireGunBase());if(tracers.length===before)return;
 for(let i=before;i<tracers.length;i++){const t=tracers[i];t.mesh.scale.set(.34,.34,7.6);t.mesh.material.color.setHex(i%2?0xffd892:0xfff0c8);t.mesh.material.toneMapped=false;t.life=1.05;}
 cineGunLight.intensity=lowPower?18:42;cineSound.gun();
};
// Rounds that reach the ground throw dust; rounds that reach an airframe throw sparks.
const cineWeaponsBase=updateWeapons;
updateWeapons=function(dt){
 for(const t of tracers){
  if(t.friendly===false||t.cineDone)continue;
  const p=t.mesh.position,nx=p.x+t.velocity.x*dt,ny=p.y+t.velocity.y*dt,nz=p.z+t.velocity.z*dt,h=terrainHeight(nx,nz);
  if(ny<h){t.cineDone=true;cineP.set(nx,h+.4,nz);
   if(Math.random()<(lowPower?.5:.85)){cineDust(cineP,.32,t.velocity.clone().normalize().multiplyScalar(20));cineSparks(cineP,3,26);}}
 }
 cineWeaponsBase(dt);
};
const cineImpactBase=spawnImpactFX;
spawnImpactFX=function(pos,lethal=false,sound=true){
 cineQuiet(()=>cineImpactBase(pos,lethal,false));
 cineSparks(pos,lethal?16:8,lethal?70:46,enemyAlive?enemyVel:null);
 cineEmit(cineFire,pos,{s0:2,s1:7,life:.1,c0:CINE_WHITE,c1:CINE_GOLD,a:1});
 cineEmit(cineSmoke,pos,{v:enemyAlive?enemyVel.clone().multiplyScalar(.3):null,s0:1.5,s1:7,life:1.2,c0:CINE_SOOT,c1:CINE_ASH,a:.45});
 if(sound)cineSound.ping(pos);
};
// Air kill: the aircraft comes apart, burns, and falls into the valley.
const cineExplodeBase=explode;
explode=function(){
 if(!enemyAlive)return cineExplodeBase();
 const at=enemy.position.clone(),vel=enemyVel.clone();
 cineQuiet(()=>cineExplodeBase());
 cineExplosion(at,2.1,vel);cineSpawnWreck(at,vel,lowPower?2:3);
};
const cineBurstBase=hostileMissileBurst;
hostileMissileBurst=function(pos){cineBurstBase(pos);cineExplosion(pos,.85,null,{ground:pos.y<terrainHeight(pos.x,pos.z)+6});};
const cineDisableSamBase=disableSam;
disableSam=function(site){const was=site.disabled;cineQuiet(()=>cineDisableSamBase(site));if(!was&&site.disabled){cineExplosion(site.position.clone().addScaledVector(worldUp,3),1.9,null,{ground:true});cineFlash(site.position,260,1.1);}};
const cineDestroyTargetBase=destroyTarget;
// The launch site is the climax: it has to read from a kilometre out. One main blast,
// then the complex cooks off in a short chain while a column of smoke climbs over the valley.
const cineChain=[];
destroyTarget=function(){
 const was=mission.destroyed;cineDestroyTargetBase();if(was||!mission.destroyed)return;
 const p=rocket.position.clone();// Centres sit above the gantry so its walls cannot depth-cull the fireball.
 cineExplosion(p.clone().addScaledVector(worldUp,40),9,null,{ground:true});cineExplosion(p.clone().addScaledVector(worldUp,110),5,null,{quiet:true});cineKick(1.2);
 [[.45,42,0,3.5],[.8,-36,22,4],[1.25,14,-40,3],[1.9,-8,8,5]].forEach(([t,x,z,size])=>cineChain.push({t,pos:cineV(p.x+x,terrainHeight(p.x+x,p.z+z)+24,p.z+z),size}));
 for(let i=0;i<26;i++)cineEmit(cineSmoke,cineV(p.x+cineRnd(14),p.y+cineRnd(10),p.z+cineRnd(14)),{v:cineV(cineRnd(5),18+Math.random()*16,cineRnd(5)),drag:.35,rise:9,s0:30,s1:130+Math.random()*70,life:7+Math.random()*3,c0:CINE_SOOT,c1:CINE_ASH,a:.7,delay:.3+i*.09,fadeIn:.5});
};
function cineUpdateChain(dt){for(let i=cineChain.length-1;i>=0;i--){const c=cineChain[i];c.t-=dt;if(c.t<=0){cineExplosion(c.pos,c.size,null,{ground:true});cineChain.splice(i,1);}}}
const cineNearMissBase=hostileNearMiss;
hostileNearMiss=function(){const ready=hostileNearCooldown<=0&&!crashed;cineQuiet(()=>cineNearMissBase());if(ready)cineSound.whoosh(ship.position.clone().add(cineV(cineRnd(6),2,0)));};

// Missiles: rail drop, ignition, a long persistent smoke trail, a motor you can see.
let cineMissileSeen=null;
function cineTrail(mesh,v,state,hostile){
 const tail=cineTmp.set(0,0,hostile?2.6:2).applyQuaternion(mesh.quaternion).add(mesh.position);
 cineEmit(cineFire,tail,{s0:hostile?3.2:2.6,s1:1,life:.07,c0:CINE_WHITE,c1:CINE_ORANGE,a:1});
 const last=state.last||tail.clone(),steps=lowPower?1:2;
 for(let i=1;i<=steps;i++){
  cineP.copy(last).lerp(tail,i/steps);
  cineEmit(cineSmoke,cineP,{v:cineV(cineRnd(1.2),.8,cineRnd(1.2)),rise:1.1,drag:.6,s0:1.2,s1:hostile?9:7,life:hostile?2.6:3.2,c0:hostile?[.58,.55,.52]:[.86,.84,.8],c1:[.62,.6,.58],a:hostile?.42:.48,fadeIn:.04});
 }
 state.last=(state.last||new THREE.Vector3()).copy(tail);
}
function cineUpdateMissiles(){
 if(missile){
  if(missile!==cineMissileSeen){cineMissileSeen=missile;missile.cine={ignited:false};cineSound.rail();
   cineEmit(cineSmoke,missile.mesh.position,{s0:1.5,s1:6,life:.9,c0:CINE_ASH,c1:CINE_DUSK,a:.35});}
  const c=missile.cine;
  if(missile.ignited&&!c.ignited){c.ignited=true;cineSound.ignite();cineFlash(missile.mesh.position,70,.25);cineKick(.18);
   for(let i=0;i<5;i++)cineEmit(cineSmoke,missile.mesh.position,{v:cineV(cineRnd(6),cineRnd(4),cineRnd(6)),s0:2,s1:9,life:1.6,c0:[.8,.78,.74],c1:CINE_ASH,a:.5});
   cineEmit(cineFire,missile.mesh.position,{s0:3,s1:9,life:.14,c0:CINE_WHITE,c1:CINE_GOLD,a:1});}
  if(c.ignited)cineTrail(missile.mesh,missile.v,c,false);
 }else cineMissileSeen=null;
 for(const h of sam.missiles){h.cine=h.cine||{};cineTrail(h.mesh,h.v,h.cine,true);}
 if(typeof hostileMissile!=='undefined'&&hostileMissile){hostileMissile.cine=hostileMissile.cine||{};cineTrail(hostileMissile.mesh,hostileMissile.v,hostileMissile.cine,true);}
}

// ── The aircraft in its environment: vapor, ground effect, bandit beacons ──────
const cineShipBox=new THREE.Box3().setFromObject(ship),cineTipL=new THREE.Vector3(),cineTipR=new THREE.Vector3(),cineLastTip=[null,null];
// Wingtips in the airframe's local frame (the hull sits at the group origin at load).
const cineTipX=Math.max(Math.abs(cineShipBox.min.x),Math.abs(cineShipBox.max.x))*.94,cineTipZ=cineShipBox.max.z*.55;
function cineAirframeFX(dt){
 if(!ship.visible)return;
 // Wingtip vortices: they appear under real load (hard pull, or a hard turn at speed).
 const load=Math.abs(pitchRate)/1.5+Math.max(0,Math.abs(rollRate)-1.6)*.2+burner*.18;
 if(load>.55){
  const a=THREE.MathUtils.clamp((load-.55)*1.4,0,1)*.42;
  [cineTipL.set(-cineTipX,0,cineTipZ),cineTipR.set(cineTipX,0,cineTipZ)].forEach((tip,i)=>{
   tip.applyQuaternion(ship.quaternion).add(ship.position);const last=cineLastTip[i]||tip.clone();
   for(let j=1;j<=3;j++){cineP.copy(last).lerp(tip,j/3);cineEmit(cineSmoke,cineP,{s0:.35,s1:1.5,life:.45,c0:[.95,.95,.94],c1:[.9,.9,.9],a,fadeIn:.02});}
   cineLastTip[i]=(cineLastTip[i]||new THREE.Vector3()).copy(tip);
  });
 }else cineLastTip[0]=cineLastTip[1]=null;
 // Ground effect: below ~32 units the jet's wake lifts the desert behind it.
 const floor=terrainHeight(ship.position.x,ship.position.z),agl=ship.position.y-floor,wake=THREE.MathUtils.clamp(1-(agl-6)/26,0,1);
 if(wake>0){
  const f=cineTmp.set(0,0,-1).applyQuaternion(ship.quaternion),count=Math.random()<wake*(lowPower?.6:1)*(speed/200)*1.6?2:Math.random()<wake?1:0;
  for(let i=0;i<count;i++){
   const back=8+Math.random()*12,side=cineRnd(5);cineP.set(ship.position.x-f.x*back+f.z*side,0,ship.position.z-f.z*back-f.x*side);cineP.y=terrainHeight(cineP.x,cineP.z)+.8;
   cineEmit(cineSmoke,cineP,{v:cineV(f.z*side*3+cineRnd(4),5+wake*9,-f.x*side*3+cineRnd(4)).addScaledVector(f,speed*.18),drag:1.4,rise:1.2,s0:2.5,s1:10+wake*10,life:1.1+Math.random()*.7,c0:CINE_SAND,c1:CINE_DUSK,a:.28+wake*.3});
  }
 }
}
// Bandit beacons: a hot engine and an anti-collision strobe make the fighter readable at range.
const cineGlowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,220,170,.8)');g.addColorStop(1,'rgba(255,140,60,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
const cineEnemyBox=new THREE.Box3().setFromObject(enemy);
const cineBanditGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:cineGlowTex,color:0xffb070,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
cineBanditGlow.position.set(0,0,cineEnemyBox.max.z/enemy.scale.z*.95);cineBanditGlow.scale.setScalar(2.6);enemy.add(cineBanditGlow);
const cineStrobe=new THREE.Sprite(new THREE.SpriteMaterial({map:cineGlowTex,color:0xff3a22,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
cineStrobe.position.set(0,.9,0);enemy.add(cineStrobe);
function cineBanditFX(){
 if(!enemyAlive||!enemy.visible)return;
 const range=enemy.position.distanceTo(camera.position),t=performance.now()*.001;
 // Sprites hold a minimum apparent size so the fighter never shrinks to a lost pixel.
 const keep=THREE.MathUtils.clamp(range/320,1,5);
 cineBanditGlow.scale.setScalar(1.5*keep*(.92+Math.sin(t*41)*.08));
 const blink=(t*1.15)%1;cineStrobe.visible=blink<.07||(blink>.16&&blink<.21);cineStrobe.scale.setScalar(2.2*keep);
}

// ── Crash: the run ends on screen, not on a black card ─────────────────────────
let cineCrashAt=-1,cineCrashTimer=null;const cineCrashLook=new THREE.Vector3(),cineCrashCam=new THREE.Vector3();
const cineCrashBase=crashNow;
crashNow=function(reason){
 if(crashed)return;
 const at=ship.position.clone(),vel=cineTmp.set(0,0,-1).applyQuaternion(ship.quaternion).multiplyScalar(speed).clone();
 cineCrashBase(reason);
 if(!crashed)return;
 // Hold the termination card while the wreck burns; R still restarts immediately.
 crashUI.style.display='none';audioCtx?.resume();
 ship.visible=false;cineCrashAt=performance.now();cineCrashLook.copy(at);
 cineTmp.set(vel.x,0,vel.z);if(cineTmp.lengthSq()<1)cineTmp.set(0,0,-1);cineTmp.normalize();
 cineCrashCam.copy(at).addScaledVector(cineTmp,-95);cineCrashCam.y=Math.max(at.y,terrainHeight(cineCrashCam.x,cineCrashCam.z))+38;
 const ground=at.y<terrainHeight(at.x,at.z)+8;
 cineExplosion(at,1.9,vel,{ground,quiet:true});cineSound.impact();cineSpawnWreck(at,vel.multiplyScalar(.6),lowPower?2:4);cineKick(1.3);flashScreen(.5);
 if(ground)v44MakeFire?.(at.clone(),.7,.5);
 clearTimeout(cineCrashTimer);
 cineCrashTimer=setTimeout(()=>{if(!crashed||cineCrashAt<0)return;crashUI.style.display='grid';audioCtx?.suspend();},1650);
};
function cineCrashCamera(dt){
 // The chase camera stops with the aircraft and settles on the impact as it pulls back.
 const t=(performance.now()-cineCrashAt)/1000,f=1-Math.exp(-dt/.35);
 camera.position.lerp(cineCrashCam,f);camera.position.y=Math.max(camera.position.y,terrainHeight(camera.position.x,camera.position.z)+8);
 camera.lookAt(cineCrashLook);
 cineShake*=Math.exp(-dt/.25);if(cineShake>.01){camera.translateX(Math.sin(t*71)*cineShake*.4);camera.translateY(Math.sin(t*59)*cineShake*.3);}
 camera.fov=THREE.MathUtils.lerp(camera.fov,58,f);camera.updateProjectionMatrix();sky.position.copy(camera.position);
}
const cineResetBase=reset;
reset=function(){
 clearTimeout(cineCrashTimer);cineCrashAt=-1;ship.visible=true;
 cineClearParticles();cineClearWreck();cineChain.length=0;for(const s of cineLights)s.life=0;
 cineShake=cineCamRoll=cineCamPull=0;cineCamOffset.set(0,0,0);cineMissileSeen=null;cineLastTip[0]=cineLastTip[1]=null;
 cineResetBase();
};

// ── Light and land ─────────────────────────────────────────────────────────────
// A tight, sharp shadow volume around the aircraft: its shadow racing over the dunes
// is the clearest altitude cue in the game. The launch complex still shadows itself.
if(renderer.shadowMap.enabled){
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-150,right:150,top:150,bottom:-150});
 sun.shadow.camera.updateProjectionMatrix();sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.normalBias=.6;
 ship.traverse(o=>{if(o.isMesh)o.castShadow=true;});enemy.traverse(o=>{if(o.isMesh)o.castShadow=true;});
}
// Near-field desert texture: wind ripples and grit fade in close to the camera, so
// terrain proximity reads as speed. Desert realm only; distant land is unchanged.
const cineLandBase=landMaterial.onBeforeCompile;
landMaterial.onBeforeCompile=(shader,r)=>{
 cineLandBase(shader,r);
 shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb=rock;',`
  if(realm<.5){float cd=distance(landWorld,cameraPosition),near=1.-smoothstep(40.,520.,cd);
   vec2 w=landWorld.xz;float warp=noise2(w*.035)*7.;float rip=sin(dot(w,vec2(.83,.56))*1.05+warp);
   float grit=noise2(w*.85),flatness=max(normalize(landNormal).y,0.);
   rock*=1.+near*(rip*.075*smoothstep(.55,.95,flatness)+(grit-.5)*.12);
   rock*=1.+(1.-near)*(noise2(w*.012)-.5)*.1;}
  diffuseColor.rgb=rock;`);
};
landMaterial.customProgramCacheKey=()=>'cinematic-land-1';landMaterial.needsUpdate=true;

// ── Frame ──────────────────────────────────────────────────────────────────────
// Called by the main loop every frame, including after a crash, so fire keeps burning.
function cinematicFrame(dt,rawDt){
 if(crashed&&cineCrashAt>=0)cineCrashCamera(rawDt);
 cineFogColor.copy(scene.fog.color).convertLinearToSRGB();cineUniforms.fogDensity.value=scene.fog.density;
 if(!crashed){cineAirframeFX(dt);cineUpdateMissiles();cineBanditFX();}
 cineUpdateWreck(dt);cineUpdateChain(dt);
 cineGunLight.intensity*=Math.exp(-rawDt/.035);
 for(const s of cineLights){s.life=Math.max(0,s.life-rawDt);s.light.intensity=s.life>0?s.peak*Math.pow(s.life/s.max,1.6):0;}
 cineUpdateLayer(cineFire,dt);cineUpdateLayer(cineSmoke,dt);
}
