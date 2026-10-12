// ─── EMBERWING · GUS MODE ────────────────────────────────────────────────────
// Appended after the canonical Level 1 modules ONLY in the generated src/gus/game.js.
// The adult bundle (src/level1/game.js) never contains this file.
//
// Reused as-is: the valley terrain, sky and lighting, the airframe, the chase camera,
// speed streaks, engine audio, impact sparks, kill debris, missile smoke and the
// launch-site destruction climax. Replaced for Gus: the mission director, flight
// input (assisted, uncrashable), weapons (generous aim assist), enemies (a small
// player-relative squadron) and the HUD (two big thumbs, a star counter, no text).
//
// Design rule: make Gus feel powerful, not protected. Enemies look and sound
// dangerous, shoot near-misses and launch missiles, but nothing can end the run.

const GUS_SPEED=200,GUS_SURGE=48,GUS_CLEAR=34,GUS_CEILING=230;
const GUS={phase:'title',started:false,t:0,real:0,next:0,slow:0,slowScale:1,stars:0,
 enemies:[],pool:[],ground:[],tracers:[],missiles:[],hostiles:[],flares:[],fx:[],fires:[],boss:null,
 victoryAt:-1,victoryPending:-1,againReadyAt:Infinity,fireHeld:0,fireClock:0,missileClock:0,salvo:0,surge:0,
 stick:{x:0,y:0,id:null,ox:0,oy:0},keys:{},inX:0,inY:0,yaw:0,pitch:0,bank:0,roll:0,rollFrom:-1,bumpCooldown:0,
 wingman:null,frames:0,fpsClock:0,fps:0,lockTarget:null,hits:0,kills:0,shots:0};

// ── Shared geometry, pooled lights ─────────────────────────────────────────────
// A fixed pool keeps the point-light count constant, so explosions never trigger
// a shader recompile on iPad mid-fight.
const gusSphereGeo=new THREE.SphereGeometry(1,14,10),gusIcoGeo=new THREE.IcosahedronGeometry(1,1);
const gusLights=[0,1].map(()=>{const light=new THREE.PointLight(0xff8a42,0,800,1.6);scene.add(light);return {light,life:0,max:1,peak:0};});
function gusLight(pos,peak,life){const slot=gusLights.reduce((a,b)=>a.life<b.life?a:b);slot.light.position.copy(pos);slot.peak=peak;slot.life=slot.max=life;}
function gusUpdateLights(dt){for(const s of gusLights){s.life=Math.max(0,s.life-dt);s.light.intensity=s.life>0?s.peak*Math.pow(s.life/s.max,1.7):0;}}

const gV1=new THREE.Vector3(),gV2=new THREE.Vector3(),gV3=new THREE.Vector3(),gP=new THREE.Vector3(),gF=new THREE.Vector3(),gR=new THREE.Vector3();
const gM=new THREE.Matrix4(),gQ=new THREE.Quaternion(),gRollQ=new THREE.Quaternion(),gEuler=new THREE.Euler(0,0,0,'YXZ');
const G_ZAXIS=new THREE.Vector3(0,0,1),G_ORIGIN=new THREE.Vector3();
const gusWrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const gusYawOf=v=>Math.atan2(-v.x,-v.z);
function gusFrame(out){
 // Horizontal player frame: forward, right, up. Enemies live in this frame so they stay readable.
 out.f.set(-Math.sin(GUS.yaw),0,-Math.cos(GUS.yaw));out.r.crossVectors(out.f,worldUp).normalize();return out;
}
const gusBasis={f:new THREE.Vector3(),r:new THREE.Vector3()};
function gusOrient(obj,dir,roll,dt,tau){
 if(dir.lengthSq()<1e-6)return;
 gM.lookAt(G_ORIGIN,gV3.copy(dir).normalize(),worldUp);gQ.setFromRotationMatrix(gM);
 gRollQ.setFromAxisAngle(G_ZAXIS,roll);gQ.multiply(gRollQ);
 obj.quaternion.slerp(gQ,tau>0?1-Math.exp(-dt/tau):1);
}

// ── Audio: big, physical, immediate ────────────────────────────────────────────
let gusBus=null,gusNoiseBuf=null,gusRumble=null,gusRumbleFilter=null;
function gusAudio(){
 audio();if(!audioCtx)return;
 if(audioCtx.state!=='running')audioCtx.resume();
 if(gusBus)return;
 const comp=audioCtx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;
 gusBus=audioCtx.createGain();gusBus.gain.value=.9;gusBus.connect(comp).connect(audioCtx.destination);
 gusNoiseBuf=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);
 const d=gusNoiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 // Engine body: low filtered roar under the existing turbine voices.
 const src=audioCtx.createBufferSource();src.buffer=gusNoiseBuf;src.loop=true;
 gusRumbleFilter=audioCtx.createBiquadFilter();gusRumbleFilter.type='lowpass';gusRumbleFilter.frequency.value=170;
 gusRumble=audioCtx.createGain();gusRumble.gain.value=.0001;src.connect(gusRumbleFilter).connect(gusRumble).connect(gusBus);src.start();
}
function gusNoise({dur=.3,gain=.2,f0=1200,f1=200,type='lowpass',q=.8,delay=0,attack=.006}){
 if(!gusBus||audioCtx.state!=='running')return;
 const t=audioCtx.currentTime+delay,src=audioCtx.createBufferSource(),flt=audioCtx.createBiquadFilter(),g=audioCtx.createGain();
 src.buffer=gusNoiseBuf;flt.type=type;flt.Q.value=q;flt.frequency.setValueAtTime(f0,t);flt.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 src.connect(flt).connect(g).connect(gusBus);src.start(t,Math.random()*1.5);src.stop(t+dur+.05);
}
function gusTone(freq,dur,gain,type='triangle',delay=0,slide=0){
 if(!gusBus||audioCtx.state!=='running')return;
 const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();
 o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g).connect(gusBus);o.start(t);o.stop(t+dur+.03);
}
const gusSnd={
 cannon(){gusNoise({dur:.075,gain:.2,f0:3200,f1:700,type:'bandpass',q:.9});gusTone(120,.05,.05,'square',0,70);},
 hit(){gusTone(1500,.05,.045,'square');gusTone(2200,.07,.03,'triangle',.02);gusNoise({dur:.08,gain:.08,f0:5000,f1:2000,type:'highpass'});},
 boom(size=1){gusNoise({dur:1.1+size*.5,gain:.65*Math.min(1.4,size),f0:1600,f1:55});gusTone(78,.55+size*.2,.22,'sine',0,28);gusNoise({dur:.18,gain:.3,f0:4000,f1:900,type:'bandpass',q:.6});},
 missile(){gusNoise({dur:1.1,gain:.24,f0:500,f1:3400,type:'bandpass',q:1.4,attack:.03});gusTone(190,.25,.05,'sawtooth',0,90);},
 whoosh(gain=.32){gusNoise({dur:.75,gain,f0:350,f1:2600,type:'bandpass',q:1.6,attack:.2});},
 zip(){gusNoise({dur:.16,gain:.12,f0:6000,f1:1800,type:'bandpass',q:2.5,attack:.01});},
 star(){gusTone(1319,.14,.05,'triangle');gusTone(1976,.22,.045,'triangle',.07);},
 flare(){for(let i=0;i<4;i++)gusTone(700+i*140,.06,.035,'square',i*.05);gusNoise({dur:.25,gain:.08,f0:3000,f1:600,type:'bandpass'});},
 warn(){for(let i=0;i<3;i++){gusTone(392,.16,.06,'square',i*.34);gusTone(330,.16,.05,'square',i*.34+.17);}},
 horn(){gusTone(98,1.4,.16,'sawtooth',0,92);gusTone(147,1.4,.08,'sawtooth',0,139);},
 join(){gusTone(660,.09,.04,'triangle');gusTone(880,.14,.04,'triangle',.09);},
 thud(){gusNoise({dur:.35,gain:.35,f0:600,f1:60});},
 go(){gusNoise({dur:1.6,gain:.4,f0:200,f1:1800,type:'bandpass',q:.7,attack:.12});gusTone(110,1.2,.07,'sawtooth',0,220);},
 fanfare(){const n=[523,659,784,1047];n.forEach((f,i)=>gusTone(f,.22,.08,'triangle',i*.13));for(const f of [523,659,784,1047])gusTone(f,1.5,.05,'triangle',.6);gusTone(1568,1.2,.03,'sine',.6);}
};

// ── Effects ────────────────────────────────────────────────────────────────────
function gusFx(pos,o){
 const mat=new THREE.MeshBasicMaterial({color:o.color,transparent:true,opacity:o.opacity??1,depthWrite:false,
  blending:o.smoke?THREE.NormalBlending:THREE.AdditiveBlending,toneMapped:!!o.smoke,fog:!!o.smoke});
 const mesh=new THREE.Mesh(o.geo||gusSphereGeo,mat);mesh.position.copy(pos);mesh.scale.setScalar(o.start||1);
 if(o.stretch)mesh.scale.z*=o.stretch;scene.add(mesh);
 GUS.fx.push({mesh,life:o.life,max:o.life,start:o.start||1,end:o.end??o.start??1,opacity:o.opacity??1,v:o.v||null,gravity:o.gravity||0,drag:o.drag||0,smoke:!!o.smoke,rise:o.rise||0});
}
function gusFireball(pos,size=1,vel=null){
 const drift=vel?vel.clone().multiplyScalar(.22):new THREE.Vector3(),jit=k=>new THREE.Vector3((Math.random()-.5)*k,(Math.random()-.5)*k*.8,(Math.random()-.5)*k);
 gusFx(pos,{color:0xfff1d0,start:2*size,end:11*size,life:.22,v:drift.clone()});
 for(let i=0;i<7;i++){
  const hot=i<3;
  gusFx(pos.clone().add(jit(7*size)),{color:hot?0xffb35a:i%2?0xff7a2e:0xe2461c,start:1.5*size,end:(hot?9:12+Math.random()*5)*size,life:(hot?.45:.7)+Math.random()*.35,opacity:hot?.75:.62,
   v:drift.clone().add(jit(18*size)).add(new THREE.Vector3(0,5,0)),drag:1.8});
 }
 for(let i=0;i<7;i++){const v=jit(1).normalize().multiplyScalar(6+Math.random()*10*size).add(drift);v.y=Math.abs(v.y);
  gusFx(pos.clone().add(jit(8*size)),{color:i%2?0x2a2220:0x3b2f29,smoke:true,geo:gusIcoGeo,start:3*size,end:(14+Math.random()*8)*size,life:1.8+Math.random()*1.2,opacity:.55,v,drag:.6,rise:4});}
 for(let i=0;i<16;i++){const v=new THREE.Vector3(Math.random()-.5,Math.random()-.25,Math.random()-.5).normalize().multiplyScalar((45+Math.random()*70)*Math.sqrt(size)).add(drift);
  gusFx(pos,{color:i%3?0xffc47a:0xffffff,start:.45*Math.sqrt(size),end:.1,life:.55+Math.random()*.5,v,gravity:30,drag:.8,stretch:2.4});}
 gusLight(pos,140*Math.min(2.2,size),.7+size*.25);
}
function gusSmokePuff(pos,size=1,color=0x5b4c40,opacity=.45,v=null){
 gusFx(pos,{color,smoke:true,geo:gusIcoGeo,start:2*size,end:9*size,life:1.6,opacity,v:v||new THREE.Vector3((Math.random()-.5)*4,5,(Math.random()-.5)*4),drag:.4,rise:3});
}
function gusUpdateFx(dt){
 for(let i=GUS.fx.length-1;i>=0;i--){
  const fx=GUS.fx[i];fx.life-=dt;const k=1-Math.max(0,fx.life)/fx.max;
  if(fx.v){fx.v.y-=fx.gravity*dt;if(fx.drag)fx.v.multiplyScalar(Math.exp(-dt*fx.drag));fx.mesh.position.addScaledVector(fx.v,dt);}
  if(fx.rise)fx.mesh.position.y+=fx.rise*dt;
  const s=THREE.MathUtils.lerp(fx.start,fx.end,fx.smoke?1-Math.pow(1-k,2):Math.pow(k,.55));
  fx.mesh.scale.set(s,s,fx.mesh.scale.z/Math.max(1e-4,fx.mesh.scale.x)*s);
  fx.mesh.material.opacity=fx.opacity*(fx.smoke?Math.min(1,(1-k)*1.6)*Math.min(1,k*8+.2):Math.pow(1-k,1.4));
  if(fx.life<=0){scene.remove(fx.mesh);fx.mesh.material.dispose();GUS.fx.splice(i,1);}
 }
}
// Lingering ground fire: flame core, pooled light share, rising smoke column.
function gusFire(pos,scale=1){
 const mat=new THREE.MeshBasicMaterial({color:0xff6a24,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const flame=new THREE.Mesh(gusIcoGeo,mat);flame.position.copy(pos);scene.add(flame);
 GUS.fires.push({flame,pos:pos.clone(),scale,phase:Math.random()*9,smoke:0});
}
function gusUpdateFires(dt){
 for(let i=GUS.fires.length-1;i>=0;i--){
  const f=GUS.fires[i],pulse=.78+.22*Math.sin(GUS.real*8.2+f.phase);
  f.flame.scale.set(6*f.scale*pulse,4.4*f.scale*(.9+pulse*.2),6*f.scale*pulse);f.flame.material.opacity=.7+.22*pulse;
  f.smoke-=dt;if(f.smoke<=0){f.smoke=.22;gusSmokePuff(f.pos.clone().add(new THREE.Vector3(0,6*f.scale,0)),1.6*f.scale,0x1d1a19,.5,new THREE.Vector3((Math.random()-.5)*3,9+Math.random()*5,(Math.random()-.5)*3));}
  if(f.pos.distanceToSquared(ship.position)>1900*1900){scene.remove(f.flame);f.flame.material.dispose();GUS.fires.splice(i,1);}
 }
}

// ── Aircraft: wingman and enemy squadron reuse the existing airframes ──────────
function gusCloneAirframe(src){const ud=src.userData;src.userData={};const copy=src.clone(true);src.userData=ud;copy.userData={};return copy;}
const gusEnemyProto=gusCloneAirframe(enemy);
function gusTakeEnemyMesh(){
 const pooled=GUS.pool.pop();if(pooled){pooled.mesh.visible=true;return pooled;}
 const mesh=gusCloneAirframe(gusEnemyProto),mats=[];
 mesh.traverse(o=>{if(o.isMesh&&o.material&&o.material.isMeshStandardMaterial){o.material=o.material.clone();mats.push(o.material);}});
 mesh.scale.setScalar(1.6);mesh.visible=true;scene.add(mesh);return {mesh,mats};
}
const gusWingmanMesh=gusCloneAirframe(ship);gusWingmanMesh.visible=false;scene.add(gusWingmanMesh);

// Enemies fly in the player's horizontal frame (a = ahead, s = right, h = up).
// That keeps every encounter in front of a four-year-old no matter how he steers.
function gusSpawn(kind,a,s,h,o={}){
 const {mesh,mats}=gusTakeEnemyMesh();
 const e={kind,mesh,mats,a,s,h,va:o.va||0,vs:o.vs||0,vh:o.vh||0,age:0,life:o.life||14,hp:o.hp||4,max:o.hp||4,alive:true,leaving:false,
  radius:10,lastSalvo:-1,flash:0,fireClock:o.fireDelay??.6,burst:0,passed:false,yawPrev:null,roll:0,weave:o.weave||0,phase:Math.random()*6,
  hold:o.hold??null,holdFor:o.holdFor||0,missileAt:o.missileAt??null,vel:new THREE.Vector3(),last:new THREE.Vector3(),pos:mesh.position,kindTag:'air',shoots:o.shoots??true};
 gusFrame(gusBasis);
 mesh.position.copy(ship.position).addScaledVector(gusBasis.f,a).addScaledVector(gusBasis.r,s).addScaledVector(worldUp,h);
 mesh.position.y=Math.max(mesh.position.y,terrainHeight(mesh.position.x,mesh.position.z)+30);
 e.last.copy(mesh.position);
 const dir=gV1.copy(gusBasis.f).multiplyScalar(speed+e.va).addScaledVector(gusBasis.r,e.vs);
 gusOrient(mesh,dir,0,0,0);
 for(const m of mats){m.emissive.setHex(0x000000);m.emissiveIntensity=1;}
 GUS.enemies.push(e);return e;
}
function gusRelease(e){e.alive=false;e.mesh.visible=false;GUS.pool.push({mesh:e.mesh,mats:e.mats});}
function gusUpdateEnemies(dt){
 gusFrame(gusBasis);const f=gusBasis.f,r=gusBasis.r;
 for(let i=GUS.enemies.length-1;i>=0;i--){
  const e=GUS.enemies[i];
  if(!e.alive){GUS.enemies.splice(i,1);continue;}
  e.age+=dt;
  // Pattern scripting: hold a station ahead, weave, then leave.
  if(e.hold!==null&&!e.leaving){
   const da=e.hold-e.a;e.va=THREE.MathUtils.clamp(da*1.4,-260,260);
   if(Math.abs(da)<40){e.holdFor-=dt;if(e.holdFor<=0){e.leaving=true;e.va=230;e.vh=45;}}
  }
  if(e.weave)e.vs=Math.sin(e.age*1.15+e.phase)*e.weave;
  e.a+=e.va*dt;e.s+=e.vs*dt;e.h+=e.vh*dt;
  if(e.kind==='headon'&&!e.passed&&e.a<20){e.passed=true;gusSnd.whoosh(.42);hitKick=Math.max(hitKick,.35);}
  if(e.kind==='overtake'&&!e.passed&&e.a>-10){e.passed=true;gusSnd.whoosh(.5);hitKick=Math.max(hitKick,.45);}
  gP.copy(ship.position).addScaledVector(f,e.a).addScaledVector(r,e.s).addScaledVector(worldUp,e.h);
  const floor=terrainHeight(gP.x,gP.z)+30;if(gP.y<floor)gP.y=floor;
  e.last.copy(e.mesh.position);
  e.mesh.position.lerp(gP,1-Math.exp(-dt/.16));
  e.vel.copy(e.mesh.position).sub(e.last).divideScalar(Math.max(dt,1e-3));
  if(e.vel.lengthSq()>30*30){
   const yaw=gusYawOf(e.vel),turn=e.yawPrev===null?0:gusWrap(yaw-e.yawPrev)/Math.max(dt,1e-3);e.yawPrev=yaw;
   e.roll=THREE.MathUtils.lerp(e.roll,THREE.MathUtils.clamp(turn*.9,-1.2,1.2)+Math.sin(e.age*2.3+e.phase)*.08,1-Math.exp(-dt/.25));
   gusOrient(e.mesh,e.vel,e.roll,dt,.14);
  }
  if(e.flash>0){e.flash-=dt;const v=e.flash>0?2.6:0;for(const m of e.mats){m.emissive.setHex(e.flash>0?0xffd0a0:0x000000);m.emissiveIntensity=v||1;}}
  // Threat without punishment: short red bursts that always miss, close enough to hiss past.
  if(e.shoots&&!e.leaving&&e.a>260&&e.a<850&&Math.abs(e.s)<260&&GUS.phase==='fly'){
   e.fireClock-=dt;
   if(e.fireClock<=0){gusEnemyShot(e);e.burst++;e.fireClock=e.burst%3?.11:1.25;}
  }
  if(e.missileAt!==null&&e.a<e.missileAt&&GUS.phase==='fly'){e.missileAt=null;gusLaunchHostile(e.mesh.position.clone(),e.vel.clone());}
  const gone=e.a<-320||e.a>2300||Math.abs(e.s)>900||e.age>e.life;
  if(gone)gusRelease(e);
 }
}
function gusEnemyShot(e){
 gusFrame(gusBasis);
 const start=e.mesh.position.clone(),range=start.distanceTo(ship.position),side=(Math.random()<.5?-1:1)*(14+Math.random()*8);
 const aim=ship.position.clone().addScaledVector(gusBasis.f,speed*range/620).addScaledVector(gusBasis.r,side).addScaledVector(worldUp,5+Math.random()*7);
 const dir=aim.sub(start).normalize();
 const mesh=new THREE.Mesh(gusSphereGeo,new THREE.MeshBasicMaterial({color:0xff5a3c,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 mesh.scale.set(.5,.5,4.4);mesh.position.copy(start);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),dir);scene.add(mesh);
 GUS.tracers.push({mesh,v:dir.multiplyScalar(560),age:0,life:1.6,friendly:false,near:false});
}

// ── Ground targets (existing SAM battery models) ───────────────────────────────
function gusPlaceGround(dist,side,index){
 const dir=gusGuideDir(ship.position),p=ship.position.clone().addScaledVector(dir,dist);
 const c=valleyCenter(p.z),z=p.z,x=(Math.abs(p.x-c)<500?c:p.x)+side,y=terrainHeight(x,z);
 const site=makeSamSite(0,0,index);site.group.position.set(x,y+.1,z);site.group.rotation.y=GUS.yaw+Math.PI*(index%2?.85:1.15);
 site.group.scale.setScalar(1.35);
 const g={kindTag:'ground',site,pos:new THREE.Vector3(x,y+9,z),alive:true,hp:3,max:3,radius:16,lastSalvo:-1,vel:new THREE.Vector3(),blink:index*.4};
 GUS.ground.push(g);return g;
}
function gusUpdateGround(dt){
 for(let i=GUS.ground.length-1;i>=0;i--){
  const g=GUS.ground[i];
  if(g.alive){g.blink+=dt;g.site.light.visible=Math.sin(g.blink*7)>-.2;g.site.light.scale.setScalar(1.6+Math.sin(g.blink*7)*.6);}
  if(g.pos.distanceToSquared(ship.position)>2100*2100&&gusBehind(g.pos)){disposeOwnTree(g.site.group);GUS.ground.splice(i,1);}
 }
}
function gusBehind(pos){gusFrame(gusBasis);return gV1.copy(pos).sub(ship.position).dot(gusBasis.f)<0;}

// ── Hostile missiles and automatic flares ──────────────────────────────────────
function gusMissileMesh(color=0x2b3036,tip=0xff4b32,flameColor=0xff3b24){
 const m=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,3.2,8),new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.38}));
 body.rotation.x=Math.PI/2;m.add(body);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(.26,.8,8),new THREE.MeshBasicMaterial({color:tip}));nose.rotation.x=-Math.PI/2;nose.position.z=-2;m.add(nose);
 const flame=new THREE.Mesh(new THREE.ConeGeometry(.26,2.4,8),new THREE.MeshBasicMaterial({color:flameColor,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
 flame.rotation.x=-Math.PI/2;flame.position.z=2.7;m.add(flame);m.userData.flame=flame;scene.add(m);return m;
}
function gusDisposeTree(m){m.traverse(o=>{if(o.geometry&&o.geometry!==gusSphereGeo&&o.geometry!==gusIcoGeo)o.geometry.dispose();if(o.material)o.material.dispose();});scene.remove(m);}
function gusLaunchHostile(from,inherit){
 const mesh=gusMissileMesh(),dir=ship.position.clone().addScaledVector(worldUp,10).sub(from).normalize();
 mesh.position.copy(from);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),dir);
 GUS.hostiles.push({mesh,v:dir.multiplyScalar(240).add(inherit?inherit.multiplyScalar(.3):new THREE.Vector3()),age:0,trail:0,flared:false,decoy:null,flaredAt:0});
 gusSnd.warn();gusSnd.missile();gusSmokePuff(from.clone(),2.5,0xc9b7a2,.5);
 gusEl.warn.classList.remove('show');void gusEl.warn.offsetWidth;gusEl.warn.classList.add('show');
}
function gusDeployFlares(){
 gusFrame(gusBasis);gusSnd.flare();
 const fwd=gV1.set(0,0,-1).applyQuaternion(ship.quaternion);
 for(let i=0;i<10;i++){
  const side=i%2?1:-1,mesh=new THREE.Mesh(gusSphereGeo,new THREE.MeshBasicMaterial({color:i%3?0xffe9b0:0xffffff,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  mesh.scale.setScalar(1.3);mesh.position.copy(ship.position).addScaledVector(fwd,8).addScaledVector(gusBasis.r,side*3).addScaledVector(worldUp,-1);scene.add(mesh);
  // Thrown forward and out so the decoyed missile detonates where Gus can see it.
  const v=fwd.clone().multiplyScalar(speed*1.12).addScaledVector(gusBasis.r,side*(14+Math.random()*22)).addScaledVector(worldUp,8+Math.random()*22);
  GUS.flares.push({mesh,v,life:2.4+Math.random()*.6,max:2.8,trail:Math.random()*.05});
 }
 gusLight(ship.position,60,.6);
}
function gusUpdateHostiles(dt){
 for(let i=GUS.hostiles.length-1;i>=0;i--){
  const h=GUS.hostiles[i];h.age+=dt;h.trail-=dt;
  const toShip=h.mesh.position.distanceTo(ship.position);
  if(!h.flared&&toShip<430){h.flared=true;h.flaredAt=h.age;gusDeployFlares();
   // Bite on the flare nearest the missile's side.
   h.decoy=GUS.flares.reduce((best,f)=>!best||f.mesh.position.distanceToSquared(h.mesh.position)<best.mesh.position.distanceToSquared(h.mesh.position)?f:best,null);}
  const target=h.flared&&h.decoy?h.decoy.mesh.position:gV2.copy(ship.position).addScaledVector(gV1.set(0,0,-1).applyQuaternion(ship.quaternion),speed*.12);
  const desired=gV1.copy(target).sub(h.mesh.position).normalize().multiplyScalar(h.flared?580:330);
  h.v.lerp(desired,1-Math.exp(-dt*(h.flared?10:2.6)));h.mesh.position.addScaledVector(h.v,dt);
  h.mesh.quaternion.setFromUnitVectors(gV2.set(0,0,-1),gV1.copy(h.v).normalize());
  if(h.trail<=0){spawnMissileTrail(h.mesh.position,h.v);h.trail=.028;}
  const nearDecoy=h.decoy&&h.mesh.position.distanceTo(h.decoy.mesh.position)<9,timeout=h.flared&&h.age-h.flaredAt>1.3;
  const tooClose=h.mesh.position.distanceTo(ship.position)<26,ground=h.mesh.position.y<terrainHeight(h.mesh.position.x,h.mesh.position.z)+2;
  if(nearDecoy||timeout||tooClose||ground||h.age>9){
   const p=h.mesh.position.clone();gusDisposeTree(h.mesh);GUS.hostiles.splice(i,1);
   gusFireball(p,tooClose?.7:.9,h.v);gusSnd.boom(.8);hitKick=Math.max(hitKick,tooClose?1:.6);flashScreen(.16);
  }
 }
 for(let i=GUS.flares.length-1;i>=0;i--){
  const f=GUS.flares[i];f.life-=dt;f.trail-=dt;f.v.y-=16*dt;f.mesh.position.addScaledVector(f.v,dt);
  f.mesh.material.opacity=Math.min(1,f.life/.5);f.mesh.scale.setScalar(1.2+Math.sin(GUS.real*40+i)*.35);
  if(f.trail<=0){spawnMissileTrail(f.mesh.position,f.v);f.trail=.05;}
  if(f.life<=0){scene.remove(f.mesh);f.mesh.material.dispose();GUS.flares.splice(i,1);for(const h of GUS.hostiles)if(h.decoy===f)h.decoy=null;}
 }
}

// ── Player weapons: one button, generous aim assist ────────────────────────────
const gusAim=new THREE.Vector3();
function gusTargets(){
 const list=[];for(const e of GUS.enemies)if(e.alive)list.push(e);for(const g of GUS.ground)if(g.alive)list.push(g);
 if(GUS.boss&&GUS.boss.alive)list.push(GUS.boss);return list;
}
function gusScreen(pos,out){
 gV2.copy(pos).sub(camera.position);const ahead=gV2.dot(gV1.set(0,0,-1).applyQuaternion(camera.quaternion));
 out.copy(pos).project(camera);out.ahead=ahead;return out;
}
const gusS=new THREE.Vector3();
// Anything reasonably near the nose is fair game: the central ~85% of the screen within 1.5 km.
function gusPickTarget(){
 let best=null,bestScore=Infinity;
 for(const t of gusTargets()){
  const dist=t.pos.distanceTo(ship.position);if(dist>(t.kindTag==='air'?1500:1700))continue;
  gusScreen(t.pos,gusS);if(gusS.ahead<=0||Math.abs(gusS.x)>.88||Math.abs(gusS.y)>(t.kindTag==='boss'?1.08:.92))continue;
  const score=Math.hypot(gusS.x,(gusS.y-.16)*1.25)+dist/5000-(t.kindTag==='boss'?.15:0);
  if(score<bestScore){bestScore=score;best=t;}
 }
 return best;
}
function gusTrigger(){
 if(GUS.phase!=='fly')return;
 if(GUS.fireClock>.03)return;
 gusFireSalvo();GUS.fireClock=.085;
 const target=gusPickTarget();
 if(target&&GUS.missileClock<=0){gusLaunchMissile(target,ship);GUS.missileClock=1.5;}
}
function gusFireSalvo(){
 GUS.salvo++;GUS.shots++;const target=gusPickTarget();GUS.lockTarget=target;
 for(const side of [-1,1]){
  const start=new THREE.Vector3(side*4.8,-.13,-2.5).applyQuaternion(ship.quaternion).add(ship.position);
  const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion);
  let dir=fwd.clone();
  if(target){const lead=target.pos.clone().addScaledVector(target.vel||G_ORIGIN,start.distanceTo(target.pos)/900);dir.lerp(lead.sub(start).normalize(),.6).normalize();}
  const mesh=new THREE.Mesh(gusSphereGeo,new THREE.MeshBasicMaterial({color:0xffe3a0,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  mesh.scale.set(.26,.26,5.6);mesh.position.copy(start);mesh.quaternion.setFromUnitVectors(gV2.set(0,0,-1),dir);scene.add(mesh);
  GUS.tracers.push({mesh,v:dir.multiplyScalar(760+speed*.3),age:0,life:1.5,friendly:true,target,salvo:GUS.salvo});
  const flare=new THREE.Mesh(gusSphereGeo,new THREE.MeshBasicMaterial({color:0xffe6bd,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  flare.scale.set(.42,.42,1.5);flare.position.set(side*4.8,-.13,-3.2);ship.add(flare);
  setTimeout(()=>{ship.remove(flare);flare.material.dispose();},50);
 }
 gunKick=Math.min(1,gunKick+.55);flashScreen(.03);gusSnd.cannon();
}
function gusLaunchMissile(target,from){
 const m=gusMissileMesh(0xe8ded0,0xd9d4c4,0xff7b31),q=from.quaternion;
 const side=from===ship?(GUS.salvo%2?1:-1):1;
 m.position.copy(new THREE.Vector3(side*3.2,-.8,-1).applyQuaternion(q).add(from.position));m.quaternion.copy(q);
 const v=new THREE.Vector3(0,0,-1).applyQuaternion(q).multiplyScalar(speed*.9).addScaledVector(worldUp,-14);
 GUS.missiles.push({mesh:m,v,target,age:0,trail:0,ignited:false,owner:from===ship?'gus':'wing'});
 m.userData.flame.visible=false;gusSnd.missile();
}
function gusRetarget(){const t=gusPickTarget();return t&&t.alive?t:null;}
function gusUpdateWeapons(dt){
 GUS.fireClock=Math.max(0,GUS.fireClock-dt);GUS.missileClock=Math.max(0,GUS.missileClock-dt);
 const firing=GUS.fireHeld>0||GUS.keys.Space;
 if(firing&&GUS.phase==='fly'&&GUS.fireClock<=0){gusFireSalvo();GUS.fireClock=.085;
  if(GUS.missileClock<=0){const t=gusPickTarget();if(t){gusLaunchMissile(t,ship);GUS.missileClock=1.5;}}}
 for(let i=GUS.tracers.length-1;i>=0;i--){
  const t=GUS.tracers[i],prev=gV3.copy(t.mesh.position);t.age+=dt;
  if(t.friendly&&t.target&&t.target.alive){
   const spd=t.v.length(),desired=gV1.copy(t.target.pos).sub(t.mesh.position).normalize().multiplyScalar(spd);
   t.v.lerp(desired,1-Math.exp(-dt*16));t.mesh.quaternion.setFromUnitVectors(gV2.set(0,0,-1),gV1.copy(t.v).normalize());
  }
  t.mesh.position.addScaledVector(t.v,dt);t.mesh.material.opacity=THREE.MathUtils.clamp((t.life-t.age)/.15,0,1);
  let done=t.age>=t.life;
  if(t.friendly){
   const target=t.target&&t.target.alive?t.target:null;
   if(target){
    const seg=gV1.copy(t.mesh.position).sub(prev),u=THREE.MathUtils.clamp(gV2.copy(target.pos).sub(prev).dot(seg)/Math.max(seg.lengthSq(),1e-4),0,1);
    if(prev.clone().addScaledVector(seg,u).distanceTo(target.pos)<target.radius){done=true;if(target.lastSalvo!==t.salvo){target.lastSalvo=t.salvo;gusDamage(target,1,t.mesh.position);}}
   }else if(t.mesh.position.y<terrainHeight(t.mesh.position.x,t.mesh.position.z)){done=true;gusSmokePuff(t.mesh.position.clone(),.5,0x8a6a50,.4);}
  }else{
   const d=t.mesh.position.distanceTo(ship.position);
   if(!t.near&&d<34){t.near=true;gusSnd.zip();hitKick=Math.max(hitKick,.22);}
  }
  if(done){scene.remove(t.mesh);t.mesh.material.dispose();GUS.tracers.splice(i,1);}
 }
 for(let i=GUS.missiles.length-1;i>=0;i--){
  const m=GUS.missiles[i];m.age+=dt;m.trail-=dt;
  if(!m.ignited&&m.age>.1){m.ignited=true;m.mesh.userData.flame.visible=true;m.v.normalize().multiplyScalar(260);}
  if(m.ignited){
   if(!m.target||!m.target.alive)m.target=m.owner==='gus'?gusRetarget():(GUS.boss&&GUS.boss.alive?GUS.boss:null);
   const spd=Math.min(m.owner==='wing'?620:430,m.v.length()+dt*260);
   if(m.target){const desired=gV1.copy(m.target.pos).addScaledVector(m.target.vel||G_ORIGIN,.12).sub(m.mesh.position).normalize().multiplyScalar(spd);m.v.lerp(desired,1-Math.exp(-dt*7));}
   else m.v.setLength(spd);
   if(m.trail<=0){spawnMissileTrail(m.mesh.position,m.v);m.trail=.024;}
  }
  const prev=gV3.copy(m.mesh.position);m.mesh.position.addScaledVector(m.v,dt);m.mesh.quaternion.setFromUnitVectors(gV2.set(0,0,-1),gV1.copy(m.v).normalize());
  let hit=false;
  if(m.target&&m.target.alive){const seg=gV1.copy(m.mesh.position).sub(prev),u=THREE.MathUtils.clamp(gV2.copy(m.target.pos).sub(prev).dot(seg)/Math.max(seg.lengthSq(),1e-4),0,1);hit=prev.clone().addScaledVector(seg,u).distanceTo(m.target.pos)<m.target.radius+3;}
  const ground=m.mesh.position.y<terrainHeight(m.mesh.position.x,m.mesh.position.z)+1;
  if(hit||ground||m.age>(m.owner==='wing'?9:4.5)){
   const p=m.mesh.position.clone();gusDisposeTree(m.mesh);GUS.missiles.splice(i,1);
   if(hit)gusDamage(m.target,m.owner==='wing'||m.target.kindTag!=='boss'?99:5,p,true);else{gusFireball(p,.55);gusSnd.boom(.5);}
  }
 }
}
function gusDamage(target,amount,at,missile=false){
 if(!target.alive)return;
 target.hp-=amount;GUS.hits++;const lethal=target.hp<=0;
 spawnImpactFX(at.clone(),lethal||missile,false);gusSnd.hit();
 if(target.mats)target.flash=.06;
 if(target.kindTag==='boss')target.shake=.25;
 hitKick=Math.max(hitKick,missile?.55:.22);
 if(missile){gusFireball(at,.8);gusSnd.boom(.7);}
 if(lethal)gusKill(target);
}
function gusKill(target){
 target.alive=false;GUS.kills++;
 const pos=target.pos.clone();
 if(target.kindTag==='air'){
  gusFireball(pos,2.1,target.vel);spawnKillDebris(pos,target.vel.clone());
  gusRelease(target);gusAddStar(pos,1);gusSlow(.32,.38);
 }else if(target.kindTag==='ground'){
  gusFireball(pos,1.9);gusFire(pos.clone().add(new THREE.Vector3(0,2,0)),1.1);
  const s=target.site;s.light.visible=false;s.group.rotation.z=.16;
  s.group.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color?.multiplyScalar(.25);}});
  gusAddStar(pos,1);gusSlow(.24,.45);
 }else if(target.kindTag==='boss'){gusBossDestroyed();return;}
 flashScreen(.26);hitKick=Math.max(hitKick,1);GUS.surge=Math.max(GUS.surge,1.1);
 gusSnd.boom(target.kindTag==='ground'?1.4:1.1);
}
function gusSlow(duration,scale){GUS.slow=Math.max(GUS.slow,duration);GUS.slowScale=Math.min(GUS.slow>0?GUS.slowScale:1,scale);}

// ── Boss: the launch complex, moved ahead of Gus for the finale ────────────────
function gusBossStart(){
 const dir=gusGuideDir(ship.position),p=ship.position.clone().addScaledVector(dir,1750),z=p.z,c=valleyCenter(z),x=Math.abs(p.x-c)<500?c:p.x,ground=terrainHeight(x,z);
 GUS.boss={kindTag:'boss',alive:true,hp:12,max:12,radius:15,lastSalvo:-1,age:0,lit:false,rise:0,rv:3,
  sitePos:new THREE.Vector3(x,ground+90,z),pos:new THREE.Vector3(x,ground+34,z),ground,vel:new THREE.Vector3(),shake:0,smoke:0,wingFired:false};
 launchSite.position.copy(GUS.boss.sitePos);launchSite.scale.setScalar(1);for(const c of launchSite.children)c.rotation.z=0;
 rocket.scale.setScalar(1);mission.destroyed=false;gusSnd.horn();
}
function gusUpdateBoss(dt){
 const b=GUS.boss;if(!b)return;
 b.age+=dt;b.shake=Math.max(0,b.shake-dt);
 if(!b.alive)return;
 if(!b.lit&&b.age>3){b.lit=true;gusSnd.horn();gusSnd.whoosh(.5);for(let i=0;i<14;i++)gusSmokePuff(b.pos.clone().add(new THREE.Vector3((Math.random()-.5)*30,-28,(Math.random()-.5)*30)),3.2,0xd8cbb8,.55,new THREE.Vector3((Math.random()-.5)*30,4+Math.random()*8,(Math.random()-.5)*30));}
 if(b.lit){b.rv=Math.min(26,b.rv+dt*4);if(b.rise>240)b.rv*=Math.exp(-dt*1.5);b.rise+=b.rv*dt;b.vel.set(0,b.rv,0);b.smoke-=dt;if(b.smoke<=0){b.smoke=.05;gusSmokePuff(b.pos.clone().add(new THREE.Vector3(0,-40,0)),2.4,0xe0d4c2,.5,new THREE.Vector3((Math.random()-.5)*8,-6,(Math.random()-.5)*8));}}
 b.pos.set(b.sitePos.x,b.ground+34+b.rise,b.sitePos.z);
 if(b.shake>0)b.pos.x+=Math.sin(GUS.real*90)*b.shake*2;
 // Gus can't lose: if the rocket is getting away (or he flew past it), the wingman finishes it.
 b.wingClock=Math.max(0,(b.wingClock||0)-dt);
 const escaping=b.age>15||(b.age>6&&gusBehind(b.pos));
 if(b.age>24){gusBossDestroyed();return;}
 if(escaping&&b.wingClock<=0&&!GUS.missiles.some(m=>m.owner==='wing')){b.wingClock=2.5;gusLaunchMissile(b,GUS.wingman&&GUS.wingman.on?gusWingmanMesh:ship);GUS.missiles[GUS.missiles.length-1].owner='wing';}
}
// Reused Level 1 effects add their own point lights. Hand those flashes to the pooled
// lights instead, so the light count never changes (no mid-fight shader recompile).
function gusPooledLights(effect){
 const before=effects.launchFx.length;effect();
 for(let i=before;i<effects.launchFx.length;i++){const fx=effects.launchFx[i];if(fx.light){gusLight(fx.light.position,fx.light.intensity*.8,fx.life);scene.remove(fx.light);fx.light.dispose?.();fx.light=null;}}
}
function gusBossDestroyed(){
 const b=GUS.boss;b.alive=false;mission.destroyed=true;
 gusPooledLights(()=>spawnLaunchClimax(b.pos.clone()));
 gusFireball(b.pos.clone(),3.6);gusLight(b.pos,320,1.8);
 const base=new THREE.Vector3(b.sitePos.x,b.ground,b.sitePos.z);
 for(const [dx,dz,s] of [[-26,-8,1.2],[24,6,1],[-50,24,.9],[48,26,.9],[4,-28,1.3]])gusFire(base.clone().add(new THREE.Vector3(dx,4,dz)),s);
 for(const [at,dx,dz,s] of [[.45,-40,20,1.6],[1.1,35,-12,2],[1.9,0,10,2.4],[2.8,-20,-30,1.8],[3.8,30,30,2.2]])
  setTimeout(()=>{if(GUS.boss!==b)return;const p=base.clone().add(new THREE.Vector3(dx,20+Math.random()*30,dz));gusFireball(p,s);gusSnd.boom(1.2);hitKick=Math.max(hitKick,.7);},at*1000);
 for(const c of launchSite.children)c.rotation.z+=(Math.random()-.5)*.08;
 gusAddStar(b.pos,3);gusSnd.boom(2.2);gusSlow(1.3,.3);hitKick=1.4;
 GUS.victoryPending=GUS.real+2.3;
}

// ── Wingman ────────────────────────────────────────────────────────────────────
function gusWingmanJoin(){GUS.wingman={on:true,a:-90,s:46,h:6,age:0,roll:0};gusWingmanMesh.visible=true;gusFrame(gusBasis);
 gusWingmanMesh.position.copy(ship.position).addScaledVector(gusBasis.f,-90).addScaledVector(gusBasis.r,46);gusWingmanMesh.quaternion.copy(ship.quaternion);gusSnd.join();gusSnd.whoosh(.25);}
function gusUpdateWingman(dt){
 const w=GUS.wingman;if(!w||!w.on)return;
 w.age+=dt;const k=1-Math.exp(-dt/.9);
 const station=GUS.phase==='victory'?{a:8,s:22,h:3}:{a:22,s:25,h:3};
 w.a=THREE.MathUtils.lerp(w.a,station.a,k);w.s=THREE.MathUtils.lerp(w.s,station.s,k);w.h=THREE.MathUtils.lerp(w.h,station.h+Math.sin(w.age*1.3)*1.2,k);
 gQ.setFromEuler(gEuler.set(GUS.pitch,GUS.yaw,0,'YXZ'));
 gP.set(w.s,w.h,-w.a).applyQuaternion(gQ).add(ship.position);
 gP.y=Math.max(gP.y,terrainHeight(gP.x,gP.z)+20);
 gusWingmanMesh.position.lerp(gP,1-Math.exp(-dt/.12));
 gQ.copy(ship.quaternion);
 const victoryRoll=GUS.rollFrom>=0?gusRollAngle(GUS.real-GUS.rollFrom-.35):0;
 gRollQ.setFromAxisAngle(G_ZAXIS,-victoryRoll+Math.sin(w.age*.9)*.05);gQ.multiply(gRollQ);
 gusWingmanMesh.quaternion.slerp(gQ,1-Math.exp(-dt/.18));
}

// ── Assisted, uncrashable flight ───────────────────────────────────────────────
// Gus steers bank and pitch directly (stick up = climb). Underneath, the aircraft
// looks ahead along its path and lifts over terrain, eases back toward the valley
// when he wanders far off it, and holds a soft ceiling so the action stays close.
function gusGuideDir(pos){const z=pos.z-700;return new THREE.Vector3(valleyCenter(z)-pos.x,0,z-pos.z).normalize();}
function gusGroundAt(x,z){
 let h=terrainHeight(x,z);
 const b=GUS.boss;if(b&&launchSite.visible){const d=Math.hypot(x-b.sitePos.x,z-b.sitePos.z);if(d<70)h=Math.max(h,b.sitePos.y+95);}
 return h;
}
function gusSyncAttitude(){gEuler.setFromQuaternion(ship.quaternion,'YXZ');GUS.yaw=gEuler.y;GUS.pitch=gEuler.x;GUS.bank=-gEuler.z;GUS.roll=0;}
function gusRollAngle(t){if(t<0||t>1.5)return 0;const k=t/1.5;return Math.PI*2*(k*k*(3-2*k));}
function gusFly(dt,auto){
 let rx=0,ry=0;
 if(!auto){
  const st=GUS.stick;rx=st.x;ry=st.y;
  const kx=(GUS.keys.ArrowRight?1:0)-(GUS.keys.ArrowLeft?1:0),ky=(GUS.keys.ArrowUp?1:0)-(GUS.keys.ArrowDown?1:0);
  if(kx||ky){rx=kx;ry=ky;}
 }
 GUS.inX=THREE.MathUtils.lerp(GUS.inX,rx,1-Math.exp(-dt/.07));GUS.inY=THREE.MathUtils.lerp(GUS.inY,ry,1-Math.exp(-dt/.07));
 const pos=ship.position,fx=-Math.sin(GUS.yaw),fz=-Math.cos(GUS.yaw);
 let targetBank=GUS.inX*1.05,targetPitch=GUS.inY*.42;
 // Valley guidance: free inside ±0.5 rad of the valley line, a soft bumper beyond.
 // The free cone narrows as he strays from the valley line, and the bumper always outweighs a held stick.
 const lateral=Math.abs(pos.x-valleyCenter(pos.z)),roam=THREE.MathUtils.clamp(1-(lateral-260)/420,0,1);
 const guide=gusGuideDir(pos),err=gusWrap(gusYawOf(guide)-GUS.yaw),free=auto?0:.5*roam;
 const excess=Math.sign(err)*Math.max(0,Math.abs(err)-free);
 targetBank+=THREE.MathUtils.clamp(-excess*(auto?1.2:2.3),-1.35,1.35);
 // Terrain look-ahead: the steepest climb any upcoming sample asks for.
 let need=-1;
 for(const s of [.35,.7,1.1,1.6,2.2,3]){
  const d=speed*s,px=pos.x+fx*d,pz=pos.z+fz*d,h=gusGroundAt(px,pz)+GUS_CLEAR;
  need=Math.max(need,Math.atan2(h-pos.y,d));
 }
 const agl=pos.y-gusGroundAt(pos.x,pos.z);
 if(agl<GUS_CLEAR)need=Math.max(need,THREE.MathUtils.clamp((GUS_CLEAR-agl)/GUS_CLEAR,0,1)*.55);
 if(need>.18){
  // A wall is coming: turn toward the lower side while lifting.
  const d=speed*1.4,a=.6,hl=gusGroundAt(pos.x+(-Math.sin(GUS.yaw+a))*d,pos.z+(-Math.cos(GUS.yaw+a))*d),hr=gusGroundAt(pos.x+(-Math.sin(GUS.yaw-a))*d,pos.z+(-Math.cos(GUS.yaw-a))*d);
  targetBank+=THREE.MathUtils.clamp((need-.18)*2.4,0,.75)*(hl<hr?-1:1);
 }
 if(agl>GUS_CEILING)targetPitch=Math.min(targetPitch,-THREE.MathUtils.clamp((agl-GUS_CEILING)/170,0,.32));
 // Hands off the vertical axis: settle back down into the valley where the action is.
 if(!auto&&Math.abs(GUS.inY)<.2&&agl>120)targetPitch-=THREE.MathUtils.clamp((agl-120)/500,0,.14);
 if(auto)targetPitch=Math.min(targetPitch,(85-agl)/260);
 if(GUS.phase==='victory')targetPitch=.1;
 targetPitch=THREE.MathUtils.clamp(Math.max(targetPitch,need+.05),-.5,.78);
 targetBank=THREE.MathUtils.clamp(targetBank,-1.15,1.15);
 if(lateral>520)targetPitch=Math.min(targetPitch,.08);
 const prevBank=GUS.bank,prevPitch=GUS.pitch;
 GUS.bank=THREE.MathUtils.lerp(GUS.bank,targetBank,1-Math.exp(-dt/.22));
 GUS.pitch=THREE.MathUtils.lerp(GUS.pitch,targetPitch,1-Math.exp(-dt/(targetPitch>GUS.pitch?.22:.34)));
 GUS.yaw=gusWrap(GUS.yaw-Math.sin(GUS.bank)*1.08*dt);
 rollRate=THREE.MathUtils.lerp(rollRate,(GUS.bank-prevBank)/Math.max(dt,1e-3),.3);pitchRate=THREE.MathUtils.lerp(pitchRate,(GUS.pitch-prevPitch)/Math.max(dt,1e-3)*1.5,.3);
 GUS.roll=GUS.rollFrom>=0?gusRollAngle(GUS.real-GUS.rollFrom):0;
 ship.quaternion.setFromEuler(gEuler.set(GUS.pitch,GUS.yaw,-(GUS.bank+GUS.roll),'YXZ'));
 GUS.surge=Math.max(0,GUS.surge-dt);
 const surge=GUS.surge>0?1:0;
 speed=THREE.MathUtils.lerp(speed,GUS_SPEED+surge*GUS_SURGE,1-Math.exp(-dt/(surge?.25:.6)));
 burner=THREE.MathUtils.lerp(burner,surge?1:.12,1-Math.exp(-dt/(surge?.1:.35)));
 const flicker=1+Math.sin(performance.now()*.027)*.045;
 for(const e of ship.userData.engines){e.scale.setScalar(.94+burner*.34+flicker*.045);}
 for(const p of ship.userData.plumes)p.scale.z=(1.05+burner*1.95)*flicker;
 gF.set(0,0,-1).applyQuaternion(ship.quaternion);
 ship.position.addScaledVector(gF,speed*dt);
 // Never a crash: a scrape is a bump, a bounce, and back to flying.
 GUS.bumpCooldown=Math.max(0,GUS.bumpCooldown-dt);
 const floor=gusGroundAt(pos.x,pos.z)+6;
 if(pos.y<floor){pos.y=floor;GUS.pitch=Math.max(GUS.pitch,.4);if(GUS.bumpCooldown<=0){GUS.bumpCooldown=.6;hitKick=Math.max(hitKick,.9);flashScreen(.12);gusSnd.thud();for(let i=0;i<5;i++)gusSmokePuff(pos.clone().add(new THREE.Vector3((Math.random()-.5)*10,-3,(Math.random()-.5)*10)),2,0x8a6a50,.5);}}
}

// ── Victory camera: a sweeping flyover around Gus and his wingman ─────────────
const gusCamPos=new THREE.Vector3(),gusCamLook=new THREE.Vector3();
function gusVictoryCamera(dt){
 const t=GUS.real-GUS.victoryAt;gusFrame(gusBasis);
 const theta=Math.PI+Math.min(1,t/5)*Math.PI*.95+t*.05,R=THREE.MathUtils.lerp(16,40,Math.min(1,t/3));
 gusCamPos.copy(ship.position).addScaledVector(gusBasis.f,Math.cos(theta)*R).addScaledVector(gusBasis.r,Math.sin(theta)*R+8).addScaledVector(worldUp,6+Math.sin(t*.5)*3);
 gusCamPos.y=Math.max(gusCamPos.y,terrainHeight(gusCamPos.x,gusCamPos.z)+6);
 camera.position.lerp(gusCamPos,1-Math.exp(-dt/.35));
 gusCamLook.copy(ship.position).addScaledVector(gusBasis.r,10).addScaledVector(gusBasis.f,6);
 camera.lookAt(gusCamLook);
 hitKick*=Math.exp(-dt/.2);if(hitKick>.02){camera.translateX(Math.sin(GUS.real*61)*hitKick*.12);camera.translateY(Math.sin(GUS.real*47)*hitKick*.08);}
 camera.fov=THREE.MathUtils.lerp(camera.fov,58,1-Math.exp(-dt/.6));camera.updateProjectionMatrix();sky.position.copy(camera.position);
}

// ── The mission: one deliberate rhythm, about ninety seconds ───────────────────
// Every beat gives Gus something he can do. Quiet gaps compress once a wave is cleared.
function gusDir(){
 // +1 means "start on the left, fly right". Start on whichever side has lower ground.
 gusFrame(gusBasis);const ahead=gV1.copy(ship.position).addScaledVector(gusBasis.f,480);
 const left=terrainHeight(ahead.x-gusBasis.r.x*300,ahead.z-gusBasis.r.z*300),right=terrainHeight(ahead.x+gusBasis.r.x*300,ahead.z+gusBasis.r.z*300);
 return Math.abs(left-right)<25?(Math.random()<.5?-1:1):left<right?1:-1;
}
const GUS_SCRIPT=[
 {at:2.5,run:gusWingmanJoin},
 // First contact: two jets slide across his nose, close and slow.
 {at:5,run:()=>{const d=gusDir();gusSpawn('cross',460,-d*250,24,{vs:d*78,va:-30,hp:4,life:11,shoots:false});gusSpawn('cross',540,-d*320,44,{vs:d*78,va:-30,hp:4,life:11,shoots:false});}},
 // Head-on pair: they shoot (and miss) as they rush past.
 {at:14,run:()=>{gusSpawn('headon',1300,-75,16,{va:-360,hp:3,fireDelay:.4});gusSpawn('headon',1380,80,30,{va:-360,hp:3,fireDelay:.7});}},
 // Roar past from behind, then settle ahead as an easy three-ship to chase.
 {at:23,run:()=>{gusSpawn('overtake',-140,0,24,{va:200,hold:300,holdFor:7,weave:34,hp:4,shoots:false});gusSpawn('overtake',-180,-34,16,{va:200,hold:340,holdFor:7,weave:30,hp:4,shoots:false});gusSpawn('overtake',-190,36,18,{va:200,hold:340,holdFor:7,weave:30,hp:4,shoots:false});}},
 // Ground strike: three batteries on the valley floor.
 {at:33,run:()=>{gusPlaceGround(1250,-120,0);gusPlaceGround(1500,95,1);gusPlaceGround(1750,-40,2);}},
 {at:37,run:()=>{const g=GUS.ground.find(g=>g.alive&&!gusBehind(g.pos));const from=g?g.pos.clone().add(new THREE.Vector3(0,6,0)):ship.position.clone().addScaledVector(gusGuideDir(ship.position),1100).setY(ship.position.y-40);gusLaunchHostile(from,null);if(g)gusPooledLights(()=>samLaunchBurst(g.site));}},
 {at:45,run:()=>{const d=gusDir();for(let i=0;i<3;i++)gusSpawn('cross',480+i*70,-d*(280+i*60),20+i*14,{vs:d*(80+i*6),va:-26,hp:4,life:12,shoots:i===0});}},
 // A bandit pulls up alongside, then breaks ahead.
 {at:53,run:()=>{gusSpawn('flank',36,-40,6,{va:0,hold:380,holdFor:6,weave:40,hp:5,shoots:false,life:16});}},
 {at:56,run:()=>{const e=GUS.enemies.find(e=>e.alive&&e.kind==='flank');const from=e?e.mesh.position.clone():ship.position.clone().addScaledVector(gusGuideDir(ship.position),900);gusLaunchHostile(from,null);}},
 // Diamond of four, head-on. The leader fires a missile.
 {at:61,run:()=>{gusSpawn('headon',1350,0,40,{va:-340,hp:3,missileAt:950,fireDelay:.5});gusSpawn('headon',1420,-62,16,{va:-340,hp:3,fireDelay:.8});gusSpawn('headon',1420,62,16,{va:-340,hp:3,fireDelay:.6});gusSpawn('headon',1500,0,-6,{va:-340,hp:3,shoots:false});}},
 // Furball: two pairs cross in opposite directions, high and low.
 {at:70,run:()=>{gusSpawn('cross',470,-300,46,{vs:84,va:-24,hp:4,life:12,shoots:false});gusSpawn('cross',530,-350,58,{vs:84,va:-24,hp:4,life:12,shoots:false});
  gusSpawn('cross',560,320,4,{vs:-80,va:-28,hp:4,life:12});gusSpawn('cross',620,370,14,{vs:-80,va:-28,hp:4,life:12,shoots:false});}},
 {at:79,run:gusBossStart}
];
function gusDirector(dt){
 GUS.t+=dt;
 const next=GUS_SCRIPT[GUS.next];
 if(next){
  const busy=GUS.enemies.some(e=>e.alive&&!e.leaving&&e.a>-60)||GUS.ground.some(g=>g.alive&&!gusBehind(g.pos));
  if(!busy&&GUS.t>9&&next.at-GUS.t>4.5)GUS.t=next.at-4.5;
  if(GUS.t>=next.at){GUS.next++;next.run();}
 }
 if(GUS.victoryPending>0&&GUS.real>=GUS.victoryPending){GUS.victoryPending=-1;gusVictory();}
}

// ── HUD: two thumbs, a star counter, target rings. No reading required. ────────
const GUS_JET='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4 L58 40 L95 66 L95 75 L58 64 L55 82 L67 91 L67 96 L50 91 L33 96 L33 91 L45 82 L42 64 L5 75 L5 66 L42 40 Z" fill="currentColor"/></svg>';
const GUS_STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z" fill="currentColor"/></svg>';
const GUS_AGAIN='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 8a16 16 0 1 1-15.2 11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M4 10l5.5 10.5L20 15" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const gusRoot=document.createElement('div');gusRoot.id='gus';
gusRoot.innerHTML=`
<div id="gusTouch" aria-hidden="true"></div>
<div id="gusSight" aria-hidden="true"><i></i></div>
<div id="gusRings" aria-hidden="true"></div>
<div id="gusStars" aria-label="Stars"></div>
<div id="gusWarn" aria-hidden="true"></div>
<div id="gusStick" aria-label="Steer"><div id="gusKnob"></div></div>
<button id="gusFire" aria-label="Fire" tabindex="-1"><span>${GUS_STAR}</span><b>FIRE</b></button>
<section id="gusTitle" aria-label="Start">
 <p class="gusMark">EMBERWING</p>
 <button id="gusGo" aria-label="Fly">${GUS_JET}<b>FLY</b></button>
</section>
<section id="gusVictory" aria-label="Mission complete" hidden>
 <div class="gusBurst">${GUS_STAR}</div>
 <p class="gusMark">MISSION COMPLETE</p>
 <div id="gusEarned"></div>
 <button id="gusAgain" aria-label="Fly again">${GUS_AGAIN}<b>FLY AGAIN</b></button>
</section>
<div id="gusRotate"><div>${GUS_JET}</div><p>↻</p></div>`;
document.body.appendChild(gusRoot);document.body.dataset.mode='gus';
const gusEl={touch:document.getElementById('gusTouch'),sight:document.getElementById('gusSight'),rings:document.getElementById('gusRings'),stars:document.getElementById('gusStars'),
 warn:document.getElementById('gusWarn'),stick:document.getElementById('gusStick'),knob:document.getElementById('gusKnob'),fire:document.getElementById('gusFire'),
 title:document.getElementById('gusTitle'),go:document.getElementById('gusGo'),victory:document.getElementById('gusVictory'),earned:document.getElementById('gusEarned'),again:document.getElementById('gusAgain')};
const gusRingPool=[],gusArrowPool=[];
for(let i=0;i<10;i++){const el=document.createElement('i');el.className='gusRing';gusEl.rings.appendChild(el);gusRingPool.push(el);}
for(let i=0;i<5;i++){const el=document.createElement('b');el.className='gusArrow';gusEl.rings.appendChild(el);gusArrowPool.push(el);}
function gusAddStar(pos,count){
 gusScreen(pos,gusS);
 const sx=gusS.ahead>0?(gusS.x*.5+.5)*innerWidth:innerWidth/2,sy=gusS.ahead>0?(-gusS.y*.5+.5)*innerHeight:innerHeight/2;
 for(let i=0;i<count;i++){
  GUS.stars++;const slot=document.createElement('i');slot.className='gusStar';slot.innerHTML=GUS_STAR;slot.style.opacity='0';gusEl.stars.appendChild(slot);
  const fly=document.createElement('i');fly.className='gusFlyStar';fly.innerHTML=GUS_STAR;gusRoot.appendChild(fly);
  const r=slot.getBoundingClientRect(),tx=r.left+r.width/2,ty=r.top+r.height/2;
  const anim=fly.animate([{transform:`translate(${sx}px,${sy}px) translate(-50%,-50%) scale(.4)`,opacity:0},{transform:`translate(${sx}px,${sy-50}px) translate(-50%,-50%) scale(1.9)`,opacity:1,offset:.28},{transform:`translate(${tx}px,${ty}px) translate(-50%,-50%) scale(.9)`,opacity:1}],{duration:820,delay:i*160,easing:'cubic-bezier(.5,0,.3,1)',fill:'both'});
  anim.onfinish=()=>{fly.remove();slot.style.opacity='1';slot.animate([{transform:'scale(1.9)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});gusSnd.star();};
 }
}
function gusUpdateHud(){
 camera.updateMatrixWorld();
 const showCombat=GUS.phase==='fly';
 const lock=showCombat?gusPickTarget():null;GUS.lockTarget=lock;
 gusEl.sight.classList.toggle('lock',!!lock);
 let ri=0,ai=0;
 if(showCombat)for(const t of gusTargets()){
  const dist=t.pos.distanceTo(ship.position);if(dist>2400)continue;
  gusScreen(t.pos,gusS);
  const on=gusS.ahead>0&&Math.abs(gusS.x)<1&&Math.abs(gusS.y)<1;
  if(on&&ri<gusRingPool.length){
   const el=gusRingPool[ri++],size=THREE.MathUtils.clamp((t.kindTag==='boss'?14000:6200)/dist,58,t.kindTag==='boss'?170:118);
   el.style.transform=`translate(${(gusS.x*.5+.5)*innerWidth}px,${(-gusS.y*.5+.5)*innerHeight}px) translate(-50%,-50%)`;
   el.style.width=el.style.height=size+'px';el.className='gusRing on'+(t===lock?' lock':'')+(t.kindTag==='ground'?' ground':'')+(t.kindTag==='boss'?' boss':'');
  }else if(!on&&t.kindTag==='air'&&dist<1500&&ai<gusArrowPool.length){
   const el=gusArrowPool[ai++];gV1.copy(t.pos).sub(camera.position).applyQuaternion(gQ.copy(camera.quaternion).invert());
   let dx=gV1.x,dy=-gV1.y;if(gV1.z>0){dx=Math.sign(dx||1);dy=dy*.3;}
   const m=Math.max(Math.abs(dx)/(innerWidth/2-80),Math.abs(dy)/(innerHeight/2-80),1e-4);
   el.style.transform=`translate(${innerWidth/2+dx/m}px,${innerHeight/2+dy/m}px) translate(-50%,-50%) rotate(${Math.atan2(dy,dx)}rad)`;el.className='gusArrow on';
  }
 }
 for(;ri<gusRingPool.length;ri++)if(gusRingPool[ri].className!=='gusRing')gusRingPool[ri].className='gusRing';
 for(;ai<gusArrowPool.length;ai++)if(gusArrowPool[ai].className!=='gusArrow')gusArrowPool[ai].className='gusArrow';
}

// ── Touch: left half steers (floating stick), right half fires. Multitouch-safe. ──
const GUS_STICK_R=78;
function gusStickHome(){const r=gusEl.stick.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function gusSetKnob(){gusEl.knob.style.transform=`translate(-50%,-50%) translate(${GUS.stick.x*GUS_STICK_R*.62}px,${-GUS.stick.y*GUS_STICK_R*.62}px)`;}
function gusStickMove(x,y){
 let dx=(x-GUS.stick.ox)/GUS_STICK_R,dy=-(y-GUS.stick.oy)/GUS_STICK_R;const len=Math.hypot(dx,dy);
 if(len>1){dx/=len;dy/=len;}
 const shape=v=>{const a=Math.abs(v);return a<.1?0:Math.sign(v)*Math.pow((a-.1)/.9,1.25);};
 GUS.stick.x=shape(dx);GUS.stick.y=shape(dy);gusSetKnob();
}
function gusStickRelease(){GUS.stick.id=null;GUS.stick.x=GUS.stick.y=0;gusEl.stick.classList.remove('active');gusEl.stick.style.left=gusEl.stick.style.top='';gusSetKnob();}
const gusFirePointers=new Set();
function gusFireRelease(id){if(gusFirePointers.delete(id)){GUS.fireHeld=gusFirePointers.size;gusEl.fire.classList.toggle('active',GUS.fireHeld>0);}}
gusEl.touch.addEventListener('pointerdown',e=>{
 e.preventDefault();gusAudio();
 if(GUS.phase==='title'){gusStart();}
 try{gusEl.touch.setPointerCapture(e.pointerId);}catch{}
 if(e.clientX<innerWidth*.5){
  if(GUS.stick.id!==null)return;
  GUS.stick.id=e.pointerId;
  const x=THREE.MathUtils.clamp(e.clientX,110,innerWidth*.5-60),y=THREE.MathUtils.clamp(e.clientY,110,innerHeight-110);
  GUS.stick.ox=x;GUS.stick.oy=y;gusEl.stick.style.left=x+'px';gusEl.stick.style.top=y+'px';gusEl.stick.classList.add('active');gusStickMove(e.clientX,e.clientY);
 }else{
  gusFirePointers.add(e.pointerId);GUS.fireHeld=gusFirePointers.size;gusEl.fire.classList.add('active');gusTrigger();
 }
},{passive:false});
gusEl.touch.addEventListener('pointermove',e=>{if(e.pointerId===GUS.stick.id)gusStickMove(e.clientX,e.clientY);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])gusEl.touch.addEventListener(type,e=>{if(e.pointerId===GUS.stick.id)gusStickRelease();gusFireRelease(e.pointerId);});
function gusReleaseAll(){gusStickRelease();gusFirePointers.clear();GUS.fireHeld=0;gusEl.fire.classList.remove('active');for(const k in GUS.keys)GUS.keys[k]=false;}
addEventListener('blur',gusReleaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)gusReleaseAll();});
// Keep iPad Safari from zooming, scrolling, selecting or opening callouts mid-flight.
for(const type of ['touchstart','touchmove','touchend','gesturestart','gesturechange','dblclick','contextmenu'])
 document.addEventListener(type,e=>{if(e.cancelable)e.preventDefault();},{passive:false});
// iPad Safari only unlocks Web Audio on touch *end*; pointerdown alone can leave it suspended.
for(const type of ['touchend','pointerup','click','keydown'])document.addEventListener(type,()=>gusAudio(),{capture:true,passive:true});
gusEl.go.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();gusAudio();gusStart();});
gusEl.title.addEventListener('pointerdown',e=>{e.preventDefault();gusAudio();gusStart();});
gusEl.again.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(GUS.real<GUS.againReadyAt)return;gusAudio();gusRestart();});
// Keyboard for desk testing: arrows steer (up = climb), Space fires, Enter starts.
key=function(e,down){
 const handled=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','KeyR'].includes(e.code);
 if(!handled)return;e.preventDefault();
 if(down)gusAudio();
 if(e.code==='Enter'&&down){if(GUS.phase==='title')gusStart();else if(GUS.phase==='victory'&&GUS.real>=GUS.againReadyAt)gusRestart();return;}
 if(e.code==='KeyR'){if(down&&!e.repeat)gusRestart();return;}
 GUS.keys[e.code]=down;
 if(e.code==='Space'&&down&&!e.repeat){if(GUS.phase==='title')gusStart();gusTrigger();}
};

// ── Lifecycle ──────────────────────────────────────────────────────────────────
function gusClear(){
 for(const e of GUS.enemies)if(e.alive)gusRelease(e);GUS.enemies.length=0;
 for(const g of GUS.ground)disposeOwnTree(g.site.group);GUS.ground.length=0;
 for(const t of GUS.tracers){scene.remove(t.mesh);t.mesh.material.dispose();}GUS.tracers.length=0;
 for(const m of GUS.missiles)gusDisposeTree(m.mesh);GUS.missiles.length=0;
 for(const h of GUS.hostiles)gusDisposeTree(h.mesh);GUS.hostiles.length=0;
 for(const f of GUS.flares){scene.remove(f.mesh);f.mesh.material.dispose();}GUS.flares.length=0;
 for(const fx of GUS.fx){scene.remove(fx.mesh);fx.mesh.material.dispose();}GUS.fx.length=0;
 for(const f of GUS.fires){scene.remove(f.flame);f.flame.material.dispose();}GUS.fires.length=0;
 for(const fx of combatFX){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();}combatFX.length=0;
 for(const s of gusLights)s.life=0;
 GUS.boss=null;GUS.wingman=null;gusWingmanMesh.visible=false;
}
function gusResetWorld(){
 gusClear();
 // The canonical reset rebuilds the valley, airframe, camera and effects state.
 reset();
 clearSamNetwork();
 briefing.hidden=true;radio.hidden=true;targetUI.hidden=true;capture.hidden=true;
 mission.phase='gus';mission.destroyed=true;enemyAlive=false;enemy.visible=false;respawn=1e9;
 launchSite.visible=false;rocket.visible=false;
 Object.assign(GUS,{t:0,next:0,slow:0,slowScale:1,stars:0,victoryAt:-1,victoryPending:-1,againReadyAt:Infinity,fireClock:0,missileClock:0,surge:0,rollFrom:-1,inX:0,inY:0,hits:0,kills:0,shots:0});
 gusEl.stars.innerHTML='';gusEl.victory.hidden=true;gusRoot.dataset.phase=GUS.phase;
 // Gus starts on the centered approach, already at speed, pointed up the valley.
 const z=2350,x=valleyCenter(z)-260;ship.position.set(x,terrainHeight(x,z)+105,z);
 const guide=gusGuideDir(ship.position);GUS.yaw=gusYawOf(guide);GUS.pitch=-.04;GUS.bank=0;GUS.roll=0;
 ship.quaternion.setFromEuler(gEuler.set(GUS.pitch,GUS.yaw,0,'YXZ'));speed=GUS_SPEED;burner=0;
 rebuildTerrain(0,Math.round(z/620)*620);positionDistantRidges(0,Math.round(z/620)*620);
 camera.position.copy(ship.position).addScaledVector(guide,-16).addScaledVector(worldUp,6);resetCameraFrame();
 camera.lookAt(look.copy(ship.position).addScaledVector(guide,42).addScaledVector(worldUp,-10));viewRight.set(1,0,0).applyQuaternion(camera.quaternion);
 if(GUS.started&&audioCtx)audioCtx.resume();
}
function gusStart(){
 if(GUS.phase!=='title')return;
 GUS.started=true;GUS.phase='fly';gusRoot.dataset.phase='fly';gusEl.title.hidden=true;
 GUS.t=0;GUS.next=0;GUS.surge=1.4;gusSnd.go();
}
function gusRestart(){
 gusResetWorld();GUS.phase='title';gusEl.title.hidden=false;gusStart();
}
function gusVictory(){
 GUS.phase='victory';GUS.victoryAt=GUS.real;gusRoot.dataset.phase='victory';gusReleaseAll();
 GUS.rollFrom=GUS.real+1.1;gusSnd.fanfare();
 for(const e of GUS.enemies)if(e.alive){e.leaving=true;e.hold=null;e.va=260;e.vh=60;}
 setTimeout(()=>{if(GUS.phase!=='victory')return;
  gusEl.earned.innerHTML='';gusEl.victory.hidden=false;
  for(let i=0;i<GUS.stars;i++){const s=document.createElement('i');s.className='gusStar';s.innerHTML=GUS_STAR;gusEl.earned.appendChild(s);
   s.animate([{transform:'scale(0) rotate(-90deg)',opacity:0},{transform:'scale(1.5) rotate(10deg)',opacity:1,offset:.7},{transform:'scale(1) rotate(0)',opacity:1}],{duration:420,delay:300+i*110,fill:'both',easing:'ease-out'});
   setTimeout(()=>{if(GUS.phase==='victory')gusSnd.star();},300+i*110);}
  GUS.againReadyAt=GUS.real+1.4+Math.min(GUS.stars,20)*.05;
 },2200);
 setTimeout(()=>{if(GUS.phase==='victory')GUS.rollFrom=GUS.real;},5600);
}

// ── Frame ──────────────────────────────────────────────────────────────────────
function gusStep(rawDt){
 GUS.real+=rawDt;
 if(GUS.slow>0){GUS.slow-=rawDt;if(GUS.slow<=0)GUS.slowScale=1;}
 const dt=rawDt*(GUS.slow>0?GUS.slowScale:1);
 gusFly(dt,GUS.phase!=='fly');
 updateWorld();
 if(GUS.phase==='fly')gusDirector(dt);else if(GUS.victoryPending>0)gusDirector(dt);
 gusUpdateEnemies(dt);gusUpdateGround(dt);gusUpdateBoss(dt);gusUpdateWingman(dt);
 gusUpdateWeapons(dt);gusUpdateHostiles(dt);
 updateCombatFX(dt);updateLaunchClimax(dt);gusUpdateFx(dt);gusUpdateFires(dt);gusUpdateLights(dt);
 if(GUS.phase==='victory')gusVictoryCamera(dt);else updateCamera(dt);
 updateSpeedFX(dt);
 if(gusRumble&&audioCtx){const now=audioCtx.currentTime;gusRumble.gain.setTargetAtTime(.05+burner*.11,now,.12);gusRumbleFilter.frequency.setTargetAtTime(150+burner*260,now,.15);}
 gusUpdateHud();
 if(GUS.phase==='victory')gusEl.again.classList.toggle('ready',GUS.real>=GUS.againReadyAt);
 GUS.frames++;GUS.fpsClock+=rawDt;if(GUS.fpsClock>=1){GUS.fps=GUS.frames/GUS.fpsClock;GUS.frames=0;GUS.fpsClock=0;}
}
// The launch complex only exists for the finale; keep it where the director put it.
const gusSpectacleBase=updateV34Spectacle;
updateV34Spectacle=function(){
 gusSpectacleBase();const b=GUS.boss;
 launchSite.visible=!!b;rocket.visible=!!(b&&b.alive);
 if(b){launchSite.position.copy(b.sitePos);rocket.position.copy(b.pos);rocketFlame.visible=b.lit&&b.alive;rocketFlame.scale.y=1.2+Math.sin(GUS.real*35)*.25;rocketFlame.scale.x=rocketFlame.scale.z=1.3;}
};
// Replace the Level 1 frame loop. The canonical loop yields once mission.phase leaves 'flight'.
loop=function(){
 requestAnimationFrame(loop);
 const rawDt=Math.min(clock.getDelta(),.033);
 if(document.hidden)return;
 gusStep(rawDt);
 renderer.render(scene,camera);
};
firestorm.firestorm=true;
gusResetWorld();
const gusOrientation=matchMedia('(orientation:portrait)');
// Read-only diagnostics for browser verification (mirrors window.emberwing).
window.gus=Object.freeze({snapshot:()=>({phase:GUS.phase,t:GUS.t,stars:GUS.stars,kills:GUS.kills,hits:GUS.hits,shots:GUS.shots,fps:GUS.fps,
 position:ship.position.toArray(),yaw:GUS.yaw,bank:GUS.bank,pitch:GUS.pitch,speed,altitude:ship.position.y-terrainHeight(ship.position.x,ship.position.z),
 stick:[GUS.stick.x,GUS.stick.y],fireHeld:GUS.fireHeld,lock:!!GUS.lockTarget,
 enemies:GUS.enemies.filter(e=>e.alive).map(e=>({kind:e.kind,a:Math.round(e.a),s:Math.round(e.s),hp:e.hp})),ground:GUS.ground.filter(g=>g.alive).length,
 boss:GUS.boss?{alive:GUS.boss.alive,hp:GUS.boss.hp,lit:GUS.boss.lit}:null,hostiles:GUS.hostiles.length,flares:GUS.flares.length,wingman:!!(GUS.wingman&&GUS.wingman.on),
 portrait:gusOrientation.matches,adultPhase:mission.phase})});
