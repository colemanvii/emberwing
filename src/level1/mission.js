// One owner for Level 1 geography, targeting and lifecycle. North is negative Z.
const LEVEL={startZ:1300,entryZ:1050,targetX:-300,targetZ:-5700,exitZ:-7200};
// Four authored pressure patterns reuse the same geography and five physical batteries.
// They change where the mission leans hardest without adding random enemies or procedural chaos.
const MISSION_VARIANTS=Object.freeze([
 {id:'RIDGE',sam:[1250,1600,1700,2050,2100],cooldown:2.6,bandit:{trigger:260,z:-420,side:320,alt:115,delay:.55},escape:{trigger:-5900,z:-6500,side:650,alt:150,delay:1.25}},
 {id:'THROAT',sam:[1180,1725,1800,2000,2050],cooldown:2.9,bandit:{trigger:180,z:-620,side:-340,alt:120,delay:.6},escape:{trigger:-6000,z:-6620,side:520,alt:155,delay:1.35}},
 {id:'TERMINAL',sam:[1120,1500,1740,2150,2200],cooldown:3.0,bandit:{trigger:120,z:-760,side:360,alt:125,delay:.65},escape:{trigger:-5850,z:-6400,side:-620,alt:160,delay:1.2}},
 {id:'CROSSWIND',sam:[1320,1540,1620,2100,2150],cooldown:2.8,bandit:{trigger:220,z:-520,side:-320,alt:110,delay:.55},escape:{trigger:-6100,z:-6700,side:700,alt:165,delay:1.4}}
]);
let missionRun=-1;
const mission={phase:'flight',penetrated:false,destroyed:false,hp:8,lastSalvo:-1,bandit:false,escapeBandit:false,selected:'air',messageUntil:0,lastMessage:-10,hitAt:0,variant:0,introUntil:2.35};
function activeVariant(){return MISSION_VARIANTS[Math.max(0,mission.variant)%MISSION_VARIANTS.length];}
const sam={sites:[],missile:null,lock:0,stage:0,cooldown:5,site:null,lastCue:-99,smokeClock:0};
const briefing=document.getElementById('briefing'),deploy=document.getElementById('deploy'),radio=document.getElementById('radio');
const compass=document.getElementById('compass'),health=document.getElementById('health'),runTimeUI=document.getElementById('runTime'),runBestUI=document.getElementById('runBest');
const terrainPulse=(v,c,r,p=4)=>Math.exp(-Math.pow(Math.abs((v-c)/r),p));
const terrainLobe=(x,z,cx,cz,rx,rz,p=4)=>Math.exp(-Math.pow(Math.abs((x-cx)/rx),p)-Math.pow(Math.abs((z-cz)/rz),p));
const valleyCenter=z=>{
 // Keep the authored opening dogleg, then deliberately bleed out the inherited sine-wave wander.
 // The second half settles onto one west/northwest strike axis instead of reversing direction after each beat.
 const openingBlend=THREE.MathUtils.smoothstep(z,-2000,-400);
 const inherited=-320*Math.sin((2600-z)/1800)*(.22+.78*openingBlend);
 const attackAxis=-285*terrainPulse(z,-4800,3300);
 const terminalCommit=-95*terrainPulse(z,-5200,1500);
 const escapeAxis=-90*terrainPulse(z,-6600,1700);
 return inherited-170*terrainPulse(z,220,920)+attackAxis+terminalCommit+escapeAxis;
};
const inheritedTerrain=terrainHeight;
terrainHeight=function(x,z){
 if(worldIndex!==0)return inheritedTerrain(x,z);
 const center=valleyCenter(z),d=Math.abs(x-center);
 const entry=THREE.MathUtils.smoothstep(z,1800,3800);
 const throat=terrainPulse(z,-2150,720);
 const basin=terrainPulse(z,-5650,1050);
 // Hold the valley closed through the escape beat, then release it quickly into northern air.
 const opening=1-THREE.MathUtils.smoothstep(z,-7350,-6500);
 const half=440-throat*225+basin*300+opening*1080;
 const floor=-40+entry*205+noiseLand(x*.002,z*.0018)*11+4*Math.sin(z/590);
 const wall=THREE.MathUtils.smoothstep(d,half,half+720);
 // Quiet the generic skyline so the four authored masses own the silhouette.
 const ridge=330+105*noiseLand(x*.0007,z*.0005)+throat*180;
 const foothills=THREE.MathUtils.smoothstep(d,half*.76,half+135)*(30+throat*24);

 // 1. THE RIDGE CHOICE — the eastern wall ends in a long, blade-shaped spur.
 // Its low western toe can be cut closely; the wider west arc stays below the SAM shelf.
 const escarpment=480*terrainLobe(x,z,valleyCenter(220)+540,220,345,940,4);
 const escarpmentCrown=340*terrainLobe(x,z,valleyCenter(120)+440,120,175,570,5);
 const escarpmentToe=115*terrainLobe(x,z,valleyCenter(-40)+245,-40,180,660,4);
 const ridgeSpur=145*terrainLobe(x,z,valleyCenter(-100)+40,-100,130,320,4);
 const westernShelf=35*terrainLobe(x,z,valleyCenter(120)-550,120,300,740,4);

 // 2. THE NARROW THROAT — staggered sheer buttresses, with a low continuous slot.
 // The west prow arrives first; the taller east face fills the forward view on entry.
 const throatWest=330*terrainLobe(x,z,valleyCenter(-1950)-365,-1950,245,660,5);
 const throatEast=480*terrainLobe(x,z,valleyCenter(-2350)+350,-2350,230,720,5);

 // 3. THE BASIN REVEAL — a high eastern headland with a low western rounding shoulder.
 // Keep its western foot and northern falloff: they govern concealment and the firing window.
 const headland=520*terrainLobe(x,z,valleyCenter(-4850)+365,-4850,350,300);
 const headlandCrown=310*terrainLobe(x,z,valleyCenter(-4850)+445,-4850,200,280,5);
 const basinRim=220*terrainLobe(x,z,valleyCenter(-5750)+820,-5750,420,770,4);

 // 4. THE NORTH BREAKOUT — hug the inside of a western fin, then leave its blunt nose.
 // The inner foot stays low; the outer crest gives cover a distinct, readable silhouette.
 const breakoutSpine=255*terrainLobe(x,z,valleyCenter(-6420)-440,-6420,300,760);
 const breakoutCrest=285*terrainLobe(x,z,valleyCenter(-6300)-505,-6300,155,570,5);
 const breakoutGate=150*terrainLobe(x,z,valleyCenter(-6560)+640,-6560,390,430,4);

 return floor+foothills+wall*ridge*(1-opening*.84)+escarpment+escarpmentCrown+escarpmentToe+ridgeSpur+westernShelf+throatWest+throatEast+headland+headlandCrown+basinRim+breakoutSpine+breakoutCrest+breakoutGate;
};
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
const objectiveItems=[...document.querySelectorAll('#objectives li')];
function updateObjectives(){
 const completed=[mission.penetrated,mission.destroyed,missionComplete];
 objectiveItems.forEach((item,i)=>{const done=String(completed[i]);if(item.dataset.done!==done){item.dataset.done=done;item.setAttribute('aria-label',item.textContent.replace('✓','').trim()+(completed[i]?' — complete':' — pending'));}});
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
const airGeometry=geometry;
geometry=function(){
 const air=enemyAlive?airGeometry():{state:0,hard:false,d:99999,onscreen:false};
 const ground=mission.destroyed?{state:0,hard:false,d:99999,onscreen:false}:projectedGeometry(rocket.position,1350);
 let next=ground.state&&(!air.state||ground.d<air.d)?'ground':'air',best=next==='ground'?ground:air;
 for(const site of sam.sites){
  if(site.disabled)continue;
  const candidate=projectedGeometry(site.position,1350);
  if(candidate.state&&(!best.state||candidate.d<best.d)){next='sam:'+site.index;best=candidate;}
 }
 if(next!==mission.selected){lockState=lockTimer=lastLock=0;mission.selected=next;}
 return best;
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
 const site=selectedSam();
 const pos=site&&!site.disabled?site.position:mission.selected==='ground'?rocket.position:mission.selected==='air'&&enemyAlive?enemy.position:null;
 if(!seeker||!pos||!projectedGeometry(pos,1350).onscreen){targetUI.hidden=true;return;}
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
 lockState=lockTimer=lastLock=0;setSeeker(false);
}
function segmentDistance(a,b,p){const d=b.clone().sub(a),u=THREE.MathUtils.clamp(p.clone().sub(a).dot(d)/Math.max(.001,d.lengthSq()),0,1);return a.clone().addScaledVector(d,u).distanceTo(p);}
function destroyTarget(){
 if(mission.destroyed)return;
 mission.destroyed=true;mission.hitAt=missionElapsed;mission.hp=0;rocket.visible=rocketFlame.visible=false;
 spawnLaunchClimax(rocket.position.clone());v44IgniteComplex(rocket.position.clone());
 announce('TARGET DESTROYED');sam.cooldown=Math.min(sam.cooldown,.35);lockState=lockTimer=0;setSeeker(false);
 if(enemyAlive){enemyRole='ACE';duelState('engage');duel.speed=Math.max(duel.speed,TURBO_SPEED-8);resetEnemyAttack(.25);resetHostileThreat(.65);}else if(!mission.escapeBandit){mission.escapeBandit=true;spawnDefender(true);}
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
function spawnDefender(escape=false){
 const spec=escape?activeVariant().escape:activeVariant().bandit;
 spawnEnemy(!escape);
 // Defenders are strike-path interrupters, not chase bait. Spawn them off-axis and aim through
 // the player's future flight path so the first merge demands a bank/pull decision.
 enemyRole=escape?'ACE':'CLIMBER';
 const z=spec.z,x=valleyCenter(z)+spec.side;
 enemy.position.set(x,terrainHeight(x,z)+spec.alt,z);
 const crossingPoint=ship.position.clone().addScaledVector(heading(),escape?300:500);
 const direction=crossingPoint.sub(enemy.position).normalize();
 enemy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);enemyCourse.copy(direction);duel.forward.copy(direction);duelState('engage');
 duel.speed=escape?TURBO_SPEED-8:CRUISE_SPEED+30;
 enemyDetected=true;enemyTime=0;resetEnemyAttack(Math.min(spec.delay,escape?.45:.65));lastEnemy.copy(enemy.position);
}
// Level 1 bandits should be able to punish a straight strike line. Keep terrain LOS authoritative,
// but widen the firing solution enough that an oblique crossing pass is a real threat.
enemyFireSolution=function(){
 if(!enemyAlive||crashed||missionComplete||missionCompleteTimer>0||enemyTime<.65||duel.state==='extend'||duel.state==='break')return false;
 const aim=ship.position.clone().sub(enemy.position),range=aim.length();
 if(range<55||range>(mission.destroyed?700:660))return false;
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(enemy.quaternion).normalize();
 const cone=mission.destroyed?.82:.86;
 return forward.dot(aim.multiplyScalar(1/Math.max(range,.001)))>cone&&enemyLOS();
};
function updateMission(dt){
 if(crashed||missionComplete)return;
 const variant=activeVariant();
 // Invisible spatial activation only paces opponents; nothing gates the target or route.
 if(ship.position.z<=LEVEL.entryZ)mission.penetrated=true;
 if(!mission.bandit&&ship.position.z<variant.bandit.trigger){mission.bandit=true;spawnDefender();}
 if(mission.destroyed&&!mission.escapeBandit&&ship.position.z<variant.escape.trigger&&!enemyAlive){mission.escapeBandit=true;spawnDefender(true);}
 if(mission.destroyed&&ship.position.z<=LEVEL.exitZ){
  missionComplete=true;mission.phase='complete';finalTime=missionElapsed;releaseInputs();removeSamMissile();removeHostileMissile();
  const previousBest=bestTime,newBest=finalTime<previousBest;
  if(newBest){bestTime=finalTime;saveBest(finalTime);}
  const delta=Number.isFinite(previousBest)&&!newBest?finalTime-previousBest:null;
  const bestLine=newBest?`NEW BEST · ${formatTime(bestTime)}`:`PB ${formatTime(bestTime)}${delta!==null?` · +${delta.toFixed(1)}`:''}`;
  audioCtx?.suspend();document.body.dataset.state='complete';completeUI.style.display='grid';
  completeUI.innerHTML=`<div><small>EMBERWING / LEVEL 01</small><h1>EXTRACTED</h1><div class="runTime">${formatTime(finalTime)}</div><small class="${newBest?'best new':'best'}">${bestLine}</small><p>Target destroyed. Aircraft recovered.</p><small>HULL ${playerHP}/3</small><button id="again">FLY AGAIN</button></div>`;
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
  const roadStart=LEVEL.targetZ+500,z=roadStart-i*34,t=i/60,x=THREE.MathUtils.lerp(valleyCenter(roadStart)-55,LEVEL.targetX+105,t);
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
 missionRun=(missionRun+1)%MISSION_VARIANTS.length;
 Object.assign(mission,{phase:'flight',penetrated:false,destroyed:false,hp:8,lastSalvo:-1,bandit:false,escapeBandit:false,selected:'air',messageUntil:0,lastMessage:-10,hitAt:0,variant:missionRun,introUntil:2.35});
 const variant=activeVariant();
 enemyAlive=false;enemy.visible=false;respawn=999999;missionCompleteTimer=0;
 const x=valleyCenter(LEVEL.startZ),entryAimZ=650,entryAimX=valleyCenter(entryAimZ);
 ship.position.set(x,terrainHeight(x,LEVEL.startZ)+65,LEVEL.startZ);
 // Spawn already aligned with the opening dogleg. A hands-off player should enter the valley,
 // not be pointed at the eastern escarpment and forced into an emergency first input.
 const entryForward=new THREE.Vector3(entryAimX-x,0,entryAimZ-LEVEL.startZ).normalize();
 ship.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),entryForward);
 launchSite.position.set(LEVEL.targetX,terrainHeight(LEVEL.targetX,LEVEL.targetZ)+90,LEVEL.targetZ);launchSite.scale.setScalar(1);
 for(const child of launchSite.children)child.rotation.z=0;
 rocket.scale.setScalar(1);rocket.position.set(LEVEL.targetX,terrainHeight(LEVEL.targetX,LEVEL.targetZ)+34,LEVEL.targetZ);rocket.visible=true;
 // Overlapping threat envelopes: opening shelf, mid-valley, approach, terminal defense, escape battery.
 const specs=[[valleyCenter(200)+190,200],[valleyCenter(-1200)-240,-1200],[valleyCenter(-3000)+260,-3000],[-40,-5200],[-560,-6400]];
 sam.sites=specs.map(([sx,z],i)=>makeSamSite(sx-launchSite.position.x,z-LEVEL.targetZ,i));
 variant.sam.forEach((range,i)=>sam.sites[i].range=range);
 sam.cooldown=variant.cooldown;sam.smokeClock=0;seatServiceRoad();
 rebuildTerrain(0,Math.round(LEVEL.startZ/620)*620);positionDistantRidges(0,Math.round(LEVEL.startZ/620)*620);
 for(const m of scenery)place(m,true,false);clearSpawnCorridor();
 camera.position.set(x,ship.position.y+5.3,LEVEL.startZ+12);resetCameraFrame();
 releaseInputs();audioCtx?.suspend();missionElapsed=0;briefing.hidden=false;document.body.dataset.state='flight';radio.hidden=true;targetUI.hidden=true;capture.hidden=true;
 updateWorld();updateCamera(1/60);renderer.render(scene,camera);
 updateObjectives();deploy.disabled=true;renderer.domElement.focus();
};
const clock=new THREE.Clock();
function loop(){
 requestAnimationFrame(loop);const rawDt=Math.min(clock.getDelta(),.033);
 if(mission.phase!=='flight'||document.hidden)return;
 const dt=rawDt*(killSlow>0?.42:1);killSlow=Math.max(0,killSlow-rawDt);
 if(!crashed)missionElapsed+=rawDt;
 if(!briefing.hidden&&missionElapsed>=mission.introUntil)briefing.hidden=true;
 if(!crashed){updateTouchFlight();updateFlight(dt);updateDanger(dt);updateWorld();if(enemyAlive)updateEnemy(dt);updateEnemyAttack(dt);updateSamNetwork(dt);updateMission(dt);updateRange(dt);updateCamera(dt);updateSpeedFX(dt);updateCombatFX(dt);updateWeapons(dt);updateV43SamSmoke(dt);updateLaunchClimax(dt);v44UpdateFirestorm(dt);updateTargeting(dt);updateGuidance();updateInstruments();}
 renderer.render(scene,camera);
}
reset();requestAnimationFrame(loop);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
// Read-only diagnostics support repeatable browser verification without an alternate simulation.
window.emberwing=Object.freeze({snapshot:()=>({phase:mission.phase,variant:activeVariant().id,position:ship.position.toArray(),forward:new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion).toArray(),quaternion:ship.quaternion.toArray(),speed,altitude:ship.position.y-terrainHeight(ship.position.x,ship.position.z),elapsed:missionElapsed,destroyed:mission.destroyed,hp:playerHP,target:rocket.position.toArray(),targetHP:mission.hp,selected:mission.selected,lock:lockState,seeker,missile:!!missile,crashed,complete:missionComplete,bandit:enemyAlive,banditPosition:enemyAlive?enemy.position.toArray():null,sams:sam.sites.map(s=>s.position.toArray()),samMissile:!!sam.missile,samTracking:sam.stage,samDisabled:sam.sites.map(s=>s.disabled),samTrail:effects.samTrail.length,banditRange:enemyAlive?enemy.position.distanceTo(ship.position):null,geometry:projectedGeometry(rocket.position,1350)}),height:terrainHeight,center:valleyCenter});