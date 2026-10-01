// Preview weapon behavior and HUD helpers; desert objectives are owned by mission.js.
function lineClear(a,b,clearance=3){
 const steps=Math.max(10,Math.ceil(a.distanceTo(b)/40));
 for(let i=1;i<steps;i++){const t=i/steps,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);if(terrainHeight(x,z)+clearance>THREE.MathUtils.lerp(a.y,b.y,t))return false;}
 return true;
}
function scenerySegmentHit(a,b,padding=0,verticalPad=0,majorOnly=false){
 const dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
 if(len2<.001)return null;
 for(const m of scenery){
  if(!m.visible||!m.userData.collisionR)continue;
  const r0=m.userData.collisionR||0,h0=m.userData.collisionH||8;
  if(majorOnly&&!m.userData.mountain&&r0<18&&h0<28)continue;
  const u=THREE.MathUtils.clamp(((m.position.x-a.x)*dx+(m.position.z-a.z)*dz)/len2,0,1);
  if(u<=.025||u>=.975)continue;
  const x=a.x+dx*u,z=a.z+dz*u,r=r0+padding;
  if((x-m.position.x)**2+(z-m.position.z)**2>r*r)continue;
  const y=THREE.MathUtils.lerp(a.y,b.y,u);
  if(Math.abs(y-m.position.y)>h0+verticalPad)continue;
  return new THREE.Vector3(x,y,z);
 }
 return null;
}
samLineClear=site=>lineClear(site.position,ship.position,6)&&!scenerySegmentHit(site.position,ship.position,5,8,true);
// Guided threats alternate; guns and terrain remain live during missile recovery.
function missilePressureReady(){return !hostileMissile&&sam.missiles.length===0&&missionElapsed>=sam.nextLaunchAt&&missionElapsed>=mission.recoveryUntil;}
const pacingRemoveSam=removeSamMissile;
removeSamMissile=function(target=null){
 const before=sam.missiles.length;pacingRemoveSam(target);
 if(before>0&&sam.missiles.length===0)sam.nextLaunchAt=Math.max(sam.nextLaunchAt,missionElapsed+2);
};
const pacingRemoveHostile=removeHostileMissile;
removeHostileMissile=function(){
 const existed=!!hostileMissile;pacingRemoveHostile();
 if(existed)sam.nextLaunchAt=Math.max(sam.nextLaunchAt,missionElapsed+2);
};
const pacingHostileSolution=hostileLockSolution;
hostileLockSolution=function(){return missilePressureReady()&&duel.state!=='extend'&&duel.state!=='break'&&pacingHostileSolution();};
const pacingHostileLaunch=launchHostileMissile;
launchHostileMissile=function(){if(missilePressureReady())pacingHostileLaunch();};
function clockBearing(pos){const p=pos.clone().sub(ship.position).applyQuaternion(ship.quaternion.clone().invert());return ((Math.round(Math.atan2(p.x,-p.z)*6/Math.PI)+12)%12)||12;}
const compassMarks=[];
for(let deg=0;deg<360;deg+=30){const mark=document.createElement('span');mark.textContent=({0:'N',90:'E',180:'S',270:'W'})[deg]||'·';mark.dataset.north=deg===0?'true':'false';compass.appendChild(mark);compassMarks.push({mark,deg});}
const objectiveItems=[...document.querySelectorAll('#objectives li')];
function updateObjectives(){
 const completed=[mission.identified,mission.destroyed,missionComplete];
 const active=completed.findIndex(done=>!done);
 objectiveItems.forEach((item,i)=>{
  const done=String(completed[i]),isActive=String(i===active);
  if(item.dataset.done!==done)item.dataset.done=done;
  if(item.dataset.active!==isActive)item.dataset.active=isActive;
  item.setAttribute('aria-label',item.textContent.replace('✓','').trim()+(completed[i]?' — complete':i===active?' — active':' — pending'));
 });
}
function updateInstruments(){
 updateObjectives();
 const f=heading(),headingDeg=THREE.MathUtils.radToDeg(Math.atan2(f.x,-f.z));
 for(const {mark,deg} of compassMarks){const delta=((deg-headingDeg+540)%360)-180;mark.hidden=Math.abs(delta)>66;mark.style.transform=`translateX(${delta*1.7}px)`;}
 radio.hidden=missionElapsed>mission.messageUntil;
 runTimeUI.textContent=formatTime(missionElapsed);
 const hasBest=Number.isFinite(bestTime);runBestUI.hidden=!hasBest;if(hasBest)runBestUI.textContent='BEST '+formatTime(bestTime);
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
function hideBanditCue(){banditCueActive=false;if(banditCue)banditCue.hidden=true;}
function updateBanditCue(dt){
 if(!banditCue||!enemyAlive||crashed||missionComplete){hideBanditCue();return;}
 banditCueInverse.copy(camera.quaternion).invert();
 banditCueLocal.copy(enemy.position).sub(camera.position).applyQuaternion(banditCueInverse);
 banditCueProjected.copy(enemy.position).project(camera);
 const behind=banditCueLocal.z>0;
 const seenNow=!behind&&Math.abs(banditCueProjected.x)<=.98&&Math.abs(banditCueProjected.y)<=.96;
 if(seenNow)banditKnown=true;
 if(!banditKnown){hideBanditCue();return;}
 const offscreen=behind||Math.abs(banditCueProjected.x)>1.02||Math.abs(banditCueProjected.y)>1.02;
 const reacquired=!behind&&Math.abs(banditCueProjected.x)<.96&&Math.abs(banditCueProjected.y)<.94;
 if((!banditCueActive&&!offscreen)||(banditCueActive&&reacquired)){hideBanditCue();return;}
 let dx,dy;
 if(!behind){dx=banditCueProjected.x;dy=-banditCueProjected.y;}
 else{
  const azimuth=Math.atan2(banditCueLocal.x,-banditCueLocal.z);
  const elevation=Math.atan2(banditCueLocal.y,Math.hypot(banditCueLocal.x,banditCueLocal.z));
  let lateral=Math.sin(azimuth);
  if(Math.abs(lateral)>.20)banditRearSide=Math.sign(lateral)||banditRearSide;
  else lateral=banditRearSide*.20;
  dx=lateral;dy=-Math.sin(elevation)*1.25;
 }
 if(Math.abs(dx)<.001&&Math.abs(dy)<.001)dx=banditRearSide*.20;
 const cx=innerWidth*.5,cy=innerHeight*.5,inset=Math.max(22,Math.min(30,Math.min(innerWidth,innerHeight)*.035));
 const halfW=Math.max(1,cx-inset),halfH=Math.max(1,cy-inset),edgeScale=1/Math.max(Math.abs(dx),Math.abs(dy),.0001);
 const targetX=cx+dx*edgeScale*halfW,targetY=cy+dy*edgeScale*halfH;
 const wasVisible=!banditCue.hidden,follow=wasVisible?1-Math.exp(-dt*18):1;
 banditCueX=THREE.MathUtils.lerp(wasVisible?banditCueX:targetX,targetX,follow);banditCueY=THREE.MathUtils.lerp(wasVisible?banditCueY:targetY,targetY,follow);
 const range=enemy.position.distanceTo(ship.position),close=1-THREE.MathUtils.smoothstep(range,180,1250),opacity=.34+close*.28;
 const angle=THREE.MathUtils.radToDeg(Math.atan2(targetY-cy,targetX-cx));
 banditCue.hidden=false;banditCueActive=true;banditCue.style.left=banditCueX+'px';banditCue.style.top=banditCueY+'px';banditCue.style.opacity=opacity.toFixed(3);banditCue.style.transform=`translate(-50%,-50%) rotate(${angle.toFixed(1)}deg)`;
 banditCue.dataset.rear=behind?'true':'false';
}
const STRIKE_LOCK_RANGE=700,SAM_COUNTER_RANGE=700;
const airGeometry=geometry;
geometry=function(){
 const air=enemyAlive?airGeometry():{state:0,hard:false,d:99999,onscreen:false};
 const ground=mission.destroyed?{state:0,hard:false,d:99999,onscreen:false}:projectedGeometry(rocket.position,STRIKE_LOCK_RANGE);
 let next=ground.state&&(!air.state||ground.d<air.d)?'ground':'air',best=next==='ground'?ground:air;
 for(const site of sam.sites){
  if(site.disabled)continue;
  const candidate=projectedGeometry(site.position,SAM_COUNTER_RANGE);
  if(candidate.state&&(!best.state||candidate.d<best.d)){next='sam:'+site.index;best=candidate;}
 }
 if(next!==mission.selected){lockState=lockTimer=lastLock=0;mission.selected=next;}
 return best;
};
function updateTargeting(dt){
 if(!seeker){lockState=lockTimer=lastLock=0;capture.hidden=true;reticle.className='';silence();return;}
 const t=geometry();capture.hidden=false;
 const airReversal=mission.selected==='air'&&playerInitiativeUntil>missionElapsed;
 const counterSite=selectedSam(),samReversal=!!counterSite&&missionElapsed<(counterSite.hotUntil||-99);
 const qualified=t.state&&!keys.Space,need=mission.selected==='ground'?.72:(mission.selected.startsWith('sam:')?(samReversal?.34:.78):(airReversal?.22:(firstTarget?.3:.55)));
 lockTimer=qualified?Math.min(1,lockTimer+dt*(t.hard?1.8:1)):Math.max(0,lockTimer-dt*.7);
 lockState=qualified?(lockTimer>=need?2:1):0;
 if(lockState===2&&lastLock!==2){chirp(980,.09,.045);chirp(1240,.12,.035,.07);}
 lastLock=lockState;reticle.className=capture.className=lockState===2?'lock':lockState===1?'track':'';
 if(audioCtx&&lockGain){lockGain.gain.setTargetAtTime(lockState===2?.022:0,audioCtx.currentTime,.03);}
}
function updateGuidance(){
 // Only a requested weapon designation gets a bracket. No permanent objective marker.
 const site=selectedSam();
 const pos=site&&!site.disabled?site.position:mission.selected==='ground'?rocket.position:mission.selected==='air'&&enemyAlive?enemy.position:null;
 const guideRange=mission.selected==='ground'?STRIKE_LOCK_RANGE:mission.selected.startsWith('sam:')?SAM_COUNTER_RANGE:1350;
 if(!seeker||!pos||!projectedGeometry(pos,guideRange).onscreen){targetUI.hidden=true;return;}
 const p=pos.clone().project(camera);targetUI.hidden=false;targetUI.style.opacity='.75';
 targetUI.style.left=(p.x*.5+.5)*innerWidth+'px';targetUI.style.top=(-p.y*.5+.5)*innerHeight+'px';
 targetUI.className=lockState===2?'lock':'';
}
function selectedSam(){return mission.selected.startsWith('sam:')?sam.sites[Number(mission.selected.slice(4))]:null;}
const airFireMissile=fireMissile;
fireMissile=function(){
 if(mission.selected==='air'){airFireMissile();return;}
 const site=selectedSam();
 if(crashed||(site?site.disabled:mission.destroyed)||missile||missileRearm>0||lockState!==2)return;
 const mesh=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,2.4,8),new THREE.MeshStandardMaterial({color:0xe8ded0,metalness:.35,roughness:.45})),flame=new THREE.Mesh(new THREE.ConeGeometry(.14,1.4,8),new THREE.MeshBasicMaterial({color:0xff7b31}));
 body.rotation.x=Math.PI/2;flame.rotation.x=-Math.PI/2;flame.position.z=1.7;flame.visible=false;mesh.add(body,flame);
 mesh.position.copy(ship.position).add(new THREE.Vector3(5,-.2,-1.5).applyQuaternion(ship.quaternion));mesh.quaternion.copy(ship.quaternion);scene.add(mesh);
 missile={mesh,flame,v:new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion).multiplyScalar(speed*.9).addScaledVector(worldUp,-16),life:6,guided:false,age:0,trailClock:0,ignited:false,igniteAt:.09,strikeTarget:true,site,targetPos:(site?site.position:rocket.position).clone()};
 missileRearm=1.2;setSeeker(false);chirp(175,.075,.045);
};
function disableSam(site){
 if(site.disabled)return;
 site.disabled=true;site.light.visible=false;
 site.group.rotation.z=.12;
 site.group.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color?.multiplyScalar(.28);}});
 if(sam.site===site){sam.site=null;sam.lock=0;sam.stage=0;}
 spawnImpactFX(site.position.clone(),true);v44MakeFire(site.position.clone(),.65,.45);
 announce('SAM DESTROYED');
 lockState=lockTimer=lastLock=0;setSeeker(false);
}
function segmentDistance(a,b,p){const d=b.clone().sub(a),u=THREE.MathUtils.clamp(p.clone().sub(a).dot(d)/Math.max(.001,d.lengthSq()),0,1);return a.clone().addScaledVector(d,u).distanceTo(p);}
function destroyTarget(){
 if(mission.destroyed)return;
 mission.destroyed=true;mission.hitAt=missionElapsed;mission.hp=0;rocket.visible=rocketFlame.visible=false;
 spawnLaunchClimax(rocket.position.clone());v44IgniteComplex(rocket.position.clone());
 mission.identified=true;mission.objective='escape';
 announce('TARGET DESTROYED');
 mission.detected=true;
 mission.recoveryUntil=missionElapsed+2;
 for(const site of sam.sites){
  if(site.disabled)continue;
  site.cooldown=Math.max(site.cooldown||0,2);
  site.lock=0;site.stage=0;
 }
 lockState=lockTimer=0;setSeeker(false);
 // Keep opponents physical: no relocation behind the player after a successful strike.
 // Existing projectiles remain live; only fresh attacks wait for recovery.
 cancelEnemyAttack(2);
 hostileLock=0;hostileLockStage=0;hostileLaunchDelay=0;
 hostileMissileCooldown=Math.max(hostileMissileCooldown,2);

}
const airWeapons=updateWeapons;
updateWeapons=function(dt){
 // SAM gun hits are independent of both the primary and the fighter lifecycle.
 for(let i=tracers.length-1;i>=0;i--){
  const t=tracers[i];if(t.friendly===false)continue;
  const end=t.mesh.position.clone().addScaledVector(t.velocity,dt);
  const site=sam.sites.find(s=>!s.disabled&&segmentDistance(t.mesh.position,end,s.position)<16&&lineClear(t.mesh.position,s.position,0));
  if(site){scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();tracers.splice(i,1);if(site.lastSalvo!==t.salvo){site.lastSalvo=t.salvo;site.hp=(site.hp??3)-1;spawnImpactFX(site.position.clone(),false);if(site.hp<=0)disableSam(site);}}
 }
 if(!mission.destroyed){
  for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];if(t.friendly===false)continue;const end=t.mesh.position.clone().addScaledVector(t.velocity,dt);
   if(segmentDistance(t.mesh.position,end,rocket.position)<14&&lineClear(t.mesh.position,rocket.position,0)){
    scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();tracers.splice(i,1);
    if(t.salvo!==mission.lastSalvo){mission.lastSalvo=t.salvo;mission.hp--;spawnImpactFX(rocket.position.clone(),false);announce('HIT');chirp(720,.035,.02);if(mission.hp<=0)destroyTarget();}
   }
  }
 }
 const strike=missile?.strikeTarget?missile:null;
 // The air weapon updater must never steer or resolve a ground missile against a fighter.
 if(strike)missile=null;
 airWeapons(dt);
 if(!strike)return;
 missile=strike;if(strike.site&&!strike.site.disabled)strike.targetPos.copy(strike.site.position);strike.life-=dt;strike.age+=dt;strike.trailClock-=dt;
 if(strike.age>=strike.igniteAt){strike.ignited=true;strike.flame.visible=true;const aim=strike.targetPos.clone().sub(strike.mesh.position).normalize().multiplyScalar(305);strike.v.lerp(aim,1-Math.exp(-dt*5.6));}
 const before=strike.mesh.position.clone();strike.mesh.position.addScaledVector(strike.v,dt);strike.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),strike.v.clone().normalize());
 if(strike.trailClock<=0){spawnMissileTrail(strike.mesh.position,strike.v);strike.trailClock=.04;}
 const hit=(strike.site?!strike.site.disabled:!mission.destroyed)&&segmentDistance(before,strike.mesh.position,strike.targetPos)<14&&lineClear(before,strike.targetPos,0);
 if(hit){removeMissile();if(strike.site)disableSam(strike.site);else destroyTarget();}
 else if(strike.life<=0||!lineClear(before,strike.mesh.position,0)||strike.mesh.position.y<terrainHeight(strike.mesh.position.x,strike.mesh.position.z)+2){hostileMissileBurst(strike.mesh.position.clone());removeMissile();}
};
// Bandit kills have no mission authority; the pilot can press through with every defender alive.
const airKill=explode;
explode=function(){airKill();missionCompleteTimer=0;respawn=999999;};

// Make cannon work feel generous without turning it into an aimbot. If the bandit is
// already near the nose, bend new tracers a little harder toward a short lead point.
const banditFlowMakeTracer=makeTracer;
makeTracer=function(side,salvo){
 const before=tracers.length;
 banditFlowMakeTracer(side,salvo);
 if(worldIndex!==0||!enemyAlive||mission.destroyed)return;
 const leadPoint=enemy.position.clone().addScaledVector(enemyVel,.10);
 for(let i=before;i<tracers.length;i++){
  const t=tracers[i];if(t.friendly===false)continue;
  const desired=leadPoint.clone().sub(t.mesh.position),range=desired.length();
  if(range<30||range>560)continue;
  desired.normalize();const current=t.velocity.clone().normalize(),angle=current.angleTo(desired);
  if(angle>.17)continue;
  const assist=THREE.MathUtils.lerp(.58,.30,THREE.MathUtils.smoothstep(range,140,560));
  const speedNow=t.velocity.length();t.velocity.copy(current.lerp(desired,assist).normalize().multiplyScalar(speedNow));
  t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),t.velocity.clone().normalize());
 }
};
