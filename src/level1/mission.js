// One owner for Level 1 geography, targeting and lifecycle. North is negative Z.
const LEVEL={startZ:4000,entryZ:2600,targetX:-300,targetZ:-7200,exitZ:-11000};
const mission={phase:'briefing',destroyed:false,hp:8,lastSalvo:-1,bandit:false,escapeBandit:false,selected:'air',messageUntil:0,lastMessage:-10,hitAt:0};
const sam={sites:[],missile:null,lock:0,stage:0,cooldown:5,site:null,lastCue:-99,smokeClock:0};
const briefing=document.getElementById('briefing'),deploy=document.getElementById('deploy'),radio=document.getElementById('radio');
const compass=document.getElementById('compass'),health=document.getElementById('health');
const valleyCenter=z=>-320*Math.sin((2600-z)/1800)*THREE.MathUtils.smoothstep(4000-z,0,1800)-560*Math.exp(-Math.pow((z+4900)/1100,2));
const inheritedTerrain=terrainHeight;
terrainHeight=function(x,z){
 if(worldIndex!==0)return inheritedTerrain(x,z);
 const center=valleyCenter(z),d=Math.abs(x-center);
 const entry=THREE.MathUtils.smoothstep(z,1800,3800);
 const basin=1-THREE.MathUtils.smoothstep(Math.abs(z+7100),850,1900);
 const opening=1-THREE.MathUtils.smoothstep(z,-11700,-9600);
 const half=420+basin*340+opening*1100;
 const floor=-38+entry*205+noiseLand(x*.002,z*.0018)*13+5*Math.sin(z/570);
 const wall=THREE.MathUtils.smoothstep(d,half,half+780);
 const ridge=330+260*noiseLand(x*.0012,z*.0009)+60*Math.sin(z/620);
 const foothills=THREE.MathUtils.smoothstep(d,half*.78,half+150)*32;
 // A broad headland hides the terminal basin until the western bend opens.
 const headland=360*Math.exp(-Math.pow((x-240)/270,4)-Math.pow((z+4950)/610,4));
 return floor+foothills+wall*ridge*(1-opening*.8)+headland;
};
function lineClear(a,b,clearance=3){
 const steps=Math.max(10,Math.ceil(a.distanceTo(b)/40));
 for(let i=1;i<steps;i++){const t=i/steps,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);if(terrainHeight(x,z)+clearance>THREE.MathUtils.lerp(a.y,b.y,t))return false;}
 return true;
}
samLineClear=site=>lineClear(site.position,ship.position,8);
function clockBearing(pos){const p=pos.clone().sub(ship.position).applyQuaternion(ship.quaternion.clone().invert());return ((Math.round(Math.atan2(p.x,-p.z)*6/Math.PI)+12)%12)||12;}
function announce(text){
 if(mission.phase!=='flight')return;
 const message=/SAM LAUNCH/.test(text)?'MISSILE INBOUND':/RADAR TRACK|SAM TRACK/.test(text)?'SAM TRACKING':/TARGET DESTROYED/.test(text)?'TARGET DESTROYED · EXIT NORTH':null;
 if(!message)return;
 if(missionElapsed-mission.lastMessage<4&&!/TARGET|INBOUND/.test(message))return;
 mission.lastMessage=missionElapsed;mission.messageUntil=missionElapsed+2.6;radio.textContent=message;
}
function releaseInputs(){for(const k in keys)keys[k]=false;releaseTouch();silence();}
addEventListener('blur',releaseInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseInputs();});
// Base flight/audio/rendering stay intact. There is no simulated time during briefing.
const flightKey=key;
key=function(e,down){
 if(mission.phase==='briefing'){if(down&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();if(!deploy.disabled)startMission();}return;}
 if(e.code==='KeyR'&&down){e.preventDefault();reset();return;}
 if(e.metaKey||e.ctrlKey){releaseInputs();return;}
 flightKey(e,down);
};
function startMission(){
 if(mission.phase!=='briefing')return;
 releaseInputs();mission.phase='flight';missionElapsed=0;clock.getDelta();
 audio();updateWorld();updateCamera(1/60);renderer.render(scene,camera);
 document.body.dataset.state='flight';briefing.hidden=true;renderer.domElement.focus();
}
deploy.addEventListener('click',startMission);
const compassMarks=[];
for(let deg=0;deg<360;deg+=30){const mark=document.createElement('span');mark.textContent=({0:'N',90:'E',180:'S',270:'W'})[deg]||'·';mark.dataset.north=deg===0?'true':'false';compass.appendChild(mark);compassMarks.push({mark,deg});}
function updateInstruments(){
 const f=heading(),headingDeg=THREE.MathUtils.radToDeg(Math.atan2(f.x,-f.z));
 for(const {mark,deg} of compassMarks){const delta=((deg-headingDeg+540)%360)-180;mark.hidden=Math.abs(delta)>66;mark.style.transform=`translateX(${delta*1.7}px)`;}
 radio.hidden=missionElapsed>mission.messageUntil;
 health.textContent='▰'.repeat(playerHP)+'▱'.repeat(3-playerHP);
 health.setAttribute('aria-label',`Hull ${playerHP} of 3`);
}
function projectedGeometry(pos,maxRange){
 const dist=pos.distanceTo(ship.position),p=pos.clone().project(camera),onscreen=p.z>-1&&p.z<1&&Math.abs(p.x)<1&&Math.abs(p.y)<1;
 const trackR=Math.min(innerWidth,innerHeight)*.28;
 if(!onscreen||dist>maxRange||!lineClear(ship.position,pos))return {state:0,hard:false,onscreen:false,dist,d:99999,trackR};
 const d=Math.hypot(p.x*.5*innerWidth,(-p.y*.5+.08)*innerHeight);
 return {state:d<trackR?1:0,hard:d<trackR*.7,onscreen,dist,d,trackR};
}
const airGeometry=geometry;
geometry=function(){
 const air=enemyAlive?airGeometry():{state:0,hard:false,d:99999,onscreen:false};
 const ground=mission.destroyed?{state:0,hard:false,d:99999,onscreen:false}:projectedGeometry(rocket.position,1350);
 const next=ground.state&&(!air.state||ground.d<air.d)?'ground':'air';
 if(next!==mission.selected){lockState=lockTimer=lastLock=0;mission.selected=next;}
 return next==='ground'?ground:air;
};
function updateTargeting(dt){
 if(!seeker){lockState=lockTimer=lastLock=0;capture.hidden=true;reticle.className='';silence();return;}
 const t=geometry();capture.hidden=false;
 const qualified=t.state&&!keys.Space,need=mission.selected==='ground'?.55:(firstTarget?.3:.55);
 lockTimer=qualified?Math.min(1,lockTimer+dt*(t.hard?1.8:1)):Math.max(0,lockTimer-dt*.7);
 lockState=qualified?(lockTimer>=need?2:1):0;
 if(lockState===2&&lastLock!==2){chirp(980,.09,.045);chirp(1240,.12,.035,.07);}
 lastLock=lockState;reticle.className=capture.className=lockState===2?'lock':lockState===1?'track':'';
 if(audioCtx&&lockGain){lockGain.gain.setTargetAtTime(lockState===2?.022:0,audioCtx.currentTime,.03);}
}
function updateGuidance(){
 // Only a requested weapon designation gets a bracket. No permanent objective marker.
 const pos=mission.selected==='ground'?rocket.position:enemyAlive?enemy.position:null;
 if(!seeker||!pos||!projectedGeometry(pos,1350).onscreen){targetUI.hidden=true;return;}
 const p=pos.clone().project(camera);targetUI.hidden=false;targetUI.style.opacity='.75';
 targetUI.style.left=(p.x*.5+.5)*innerWidth+'px';targetUI.style.top=(-p.y*.5+.5)*innerHeight+'px';
 targetUI.className=lockState===2?'lock':'';
}
const airFireMissile=fireMissile;
fireMissile=function(){
 if(mission.selected!=='ground'){airFireMissile();return;}
 if(crashed||mission.destroyed||missile||missileRearm>0||lockState!==2)return;
 const mesh=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,2.4,8),new THREE.MeshStandardMaterial({color:0xe8ded0,metalness:.35,roughness:.45})),flame=new THREE.Mesh(new THREE.ConeGeometry(.14,1.4,8),new THREE.MeshBasicMaterial({color:0xff7b31}));
 body.rotation.x=Math.PI/2;flame.rotation.x=-Math.PI/2;flame.position.z=1.7;flame.visible=false;mesh.add(body,flame);
 mesh.position.copy(ship.position).add(new THREE.Vector3(5,-.2,-1.5).applyQuaternion(ship.quaternion));mesh.quaternion.copy(ship.quaternion);scene.add(mesh);
 missile={mesh,flame,v:new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion).multiplyScalar(speed*.9).addScaledVector(worldUp,-16),life:6,guided:false,age:0,trailClock:0,ignited:false,igniteAt:.09,strikeTarget:true};
 missileRearm=1.2;setSeeker(false);chirp(175,.075,.045);
};
function segmentDistance(a,b,p){const d=b.clone().sub(a),u=THREE.MathUtils.clamp(p.clone().sub(a).dot(d)/Math.max(.001,d.lengthSq()),0,1);return a.clone().addScaledVector(d,u).distanceTo(p);}
function destroyTarget(){
 if(mission.destroyed)return;
 mission.destroyed=true;mission.hitAt=missionElapsed;mission.hp=0;rocket.visible=rocketFlame.visible=false;
 spawnLaunchClimax(rocket.position.clone());v44IgniteComplex(rocket.position.clone());
 announce('TARGET DESTROYED');sam.cooldown=Math.max(sam.cooldown,3.5);lockState=lockTimer=0;setSeeker(false);
}
const airWeapons=updateWeapons;
updateWeapons=function(dt){
 if(!mission.destroyed){
  for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];if(t.friendly===false)continue;const end=t.mesh.position.clone().addScaledVector(t.velocity,dt);
   if(segmentDistance(t.mesh.position,end,rocket.position)<14&&lineClear(t.mesh.position,rocket.position,0)){
    scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();tracers.splice(i,1);
    if(t.salvo!==mission.lastSalvo){mission.lastSalvo=t.salvo;mission.hp--;spawnImpactFX(rocket.position.clone(),false);if(mission.hp<=0)destroyTarget();}
   }
  }
 }
 const strike=missile?.strikeTarget?missile:null;
 // The air weapon updater must never steer or resolve a ground missile against a fighter.
 if(strike)missile=null;
 airWeapons(dt);
 if(!strike)return;
 missile=strike;strike.life-=dt;strike.age+=dt;strike.trailClock-=dt;
 if(strike.age>=strike.igniteAt){strike.ignited=true;strike.flame.visible=true;const aim=rocket.position.clone().sub(strike.mesh.position).normalize().multiplyScalar(305);strike.v.lerp(aim,1-Math.exp(-dt*5.6));}
 const before=strike.mesh.position.clone();strike.mesh.position.addScaledVector(strike.v,dt);strike.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),strike.v.clone().normalize());
 if(strike.trailClock<=0){spawnMissileTrail(strike.mesh.position,strike.v);strike.trailClock=.04;}
 const hit=!mission.destroyed&&segmentDistance(before,strike.mesh.position,rocket.position)<14&&lineClear(before,rocket.position,0);
 if(hit){removeMissile();destroyTarget();}
 else if(strike.life<=0||!lineClear(before,strike.mesh.position,0)||strike.mesh.position.y<terrainHeight(strike.mesh.position.x,strike.mesh.position.z)+2){hostileMissileBurst(strike.mesh.position.clone());removeMissile();}
};
// Bandit kills have no mission authority; the pilot can press through with every defender alive.
const airKill=explode;
explode=function(){airKill();missionCompleteTimer=0;respawn=999999;};
function spawnDefender(escape=false){
 spawnEnemy(!escape);
 const x=escape?valleyCenter(-8900)+650:valleyCenter(-2900)+650,z=escape?-8900:-2900;
 enemy.position.set(x,terrainHeight(x,z)+150,z);
 const direction=ship.position.clone().addScaledVector(heading(),160).sub(enemy.position).normalize();
 enemy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);enemyCourse.copy(direction);duel.forward.copy(direction);duelState('engage');duel.speed=126;
 enemyDetected=true;enemyTime=0;resetEnemyAttack(5);lastEnemy.copy(enemy.position);
}
function updateMission(dt){
 if(crashed||missionComplete)return;
 // Invisible spatial activation only paces opponents; nothing gates the target or route.
 if(!mission.bandit&&ship.position.z<-1500){mission.bandit=true;spawnDefender();}
 if(mission.destroyed&&!mission.escapeBandit&&ship.position.z<-8100&&!enemyAlive){mission.escapeBandit=true;spawnDefender(true);}
 if(mission.destroyed&&ship.position.z<=LEVEL.exitZ){
  missionComplete=true;mission.phase='complete';finalTime=missionElapsed;releaseInputs();removeSamMissile();removeHostileMissile();
  audioCtx?.suspend();document.body.dataset.state='complete';completeUI.style.display='grid';
  completeUI.innerHTML=`<div><small>EMBERWING / LEVEL 01</small><h1>EXTRACTED</h1><p>Target destroyed. Aircraft recovered.</p><small>${formatTime(finalTime)} · HULL ${playerHP}/3</small><button id="again">FLY AGAIN</button></div>`;
  document.getElementById('again').addEventListener('click',reset);chirp(330,.12,.03);chirp(660,.18,.035,.1);
 }
}
// Keep the vehicle on its pad; no inherited timed liftoff can remove the assignment.
const worldSpectacle=updateV34Spectacle;
updateV34Spectacle=function(){worldSpectacle();rocket.position.set(LEVEL.targetX,terrainHeight(LEVEL.targetX,LEVEL.targetZ)+34,LEVEL.targetZ);rocket.visible=!mission.destroyed;rocketFlame.visible=false;updateLaunchVapor();};
const flightCrash=crashNow;
crashNow=function(reason){flightCrash(reason);audioCtx?.suspend();releaseInputs();};
const roadMaterial=new THREE.MeshStandardMaterial({color:0x655d4c,roughness:1});
const serviceRoad=new THREE.Mesh(new THREE.BufferGeometry(),roadMaterial);scene.add(serviceRoad);
function seatServiceRoad(){
 const positions=[],indices=[];
 for(let i=0;i<=60;i++){
  const z=-5200-i*34,t=i/60,x=THREE.MathUtils.lerp(valleyCenter(-5200)-55,LEVEL.targetX+105,t);
  for(const side of [-1,1]){const sx=x+side*4;positions.push(sx,terrainHeight(sx,z)+.55,z);}
  if(i<60){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 serviceRoad.geometry.dispose();serviceRoad.geometry=new THREE.BufferGeometry();
 serviceRoad.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));serviceRoad.geometry.setIndex(indices);serviceRoad.geometry.computeVertexNormals();
}
const baseReset=reset;
reset=function(){
 clearSamNetwork();v44ClearFirestorm();
 for(const p of effects.samTrail){scene.remove(p.mesh);p.mesh.material.dispose();}effects.samTrail.length=0;
 for(const fx of effects.launchFx){scene.remove(fx.mesh);if(fx.light)scene.remove(fx.light);fx.mesh.geometry.dispose();fx.mesh.material.dispose();}effects.launchFx.length=0;
 baseReset();
 Object.assign(mission,{phase:'briefing',destroyed:false,hp:8,lastSalvo:-1,bandit:false,escapeBandit:false,selected:'air',messageUntil:0,lastMessage:-10,hitAt:0});
 enemyAlive=false;enemy.visible=false;respawn=999999;missionCompleteTimer=0;
 const x=valleyCenter(LEVEL.startZ);ship.position.set(x,terrainHeight(x,LEVEL.startZ)+110,LEVEL.startZ);ship.quaternion.identity();
 launchSite.position.set(LEVEL.targetX,terrainHeight(LEVEL.targetX,LEVEL.targetZ)+90,LEVEL.targetZ);launchSite.scale.setScalar(1);
 for(const child of launchSite.children)child.rotation.z=0;
 rocket.scale.setScalar(1);rocket.position.set(LEVEL.targetX,terrainHeight(LEVEL.targetX,LEVEL.targetZ)+34,LEVEL.targetZ);rocket.visible=true;
 // Early shelf, mid-valley shoulder, terminal defense, northern pursuit battery.
 const specs=[[valleyCenter(200)-650,200],[valleyCenter(-3500)+640,-3500],[450,-6500],[-700,-9200]];
 sam.sites=specs.map(([sx,z],i)=>makeSamSite(sx-launchSite.position.x,z-LEVEL.targetZ,i));sam.cooldown=5;sam.smokeClock=0;seatServiceRoad();
 rebuildTerrain(0,Math.round(LEVEL.startZ/620)*620);positionDistantRidges(0,Math.round(LEVEL.startZ/620)*620);
 for(const m of scenery)place(m,true,false);clearSpawnCorridor();
 camera.position.set(x,ship.position.y+5.3,LEVEL.startZ+12);resetCameraFrame();
 releaseInputs();audioCtx?.suspend();briefing.hidden=false;document.body.dataset.state='briefing';radio.hidden=true;targetUI.hidden=true;capture.hidden=true;
 deploy.disabled=false;deploy.textContent='BEGIN MISSION';deploy.focus();
};
const clock=new THREE.Clock();
function loop(){
 requestAnimationFrame(loop);const rawDt=Math.min(clock.getDelta(),.033);
 if(mission.phase!=='flight'||document.hidden)return;
 const dt=rawDt*(killSlow>0?.42:1);killSlow=Math.max(0,killSlow-rawDt);
 if(!crashed)missionElapsed+=rawDt;
 if(!crashed){updateTouchFlight();updateFlight(dt);updateDanger(dt);updateWorld();if(enemyAlive)updateEnemy(dt);updateEnemyAttack(dt);updateSamNetwork(dt);updateMission(dt);updateRange(dt);updateCamera(dt);updateSpeedFX(dt);updateCombatFX(dt);updateWeapons(dt);updateV43SamSmoke(dt);updateLaunchClimax(dt);v44UpdateFirestorm(dt);updateTargeting(dt);updateGuidance();updateInstruments();}
 renderer.render(scene,camera);
}
reset();requestAnimationFrame(loop);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
// Read-only diagnostics support repeatable browser verification without an alternate simulation.
window.emberwing=Object.freeze({snapshot:()=>({phase:mission.phase,position:ship.position.toArray(),forward:new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion).toArray(),quaternion:ship.quaternion.toArray(),speed,altitude:ship.position.y-terrainHeight(ship.position.x,ship.position.z),elapsed:missionElapsed,destroyed:mission.destroyed,hp:playerHP,target:rocket.position.toArray(),targetHP:mission.hp,selected:mission.selected,lock:lockState,seeker,missile:!!missile,crashed,complete:missionComplete,bandit:enemyAlive,sams:sam.sites.map(s=>s.position.toArray()),samMissile:!!sam.missile,geometry:projectedGeometry(rocket.position,1350)}),height:terrainHeight,center:valleyCenter});
