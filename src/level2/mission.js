// Objective-driven lifecycle: identify → strike → leave the response envelope.
// Geography and travel have no authority over completion until the primary is destroyed.
const mission={phase:'briefing',objective:'find',identified:false,destroyed:false,hp:8,lastSalvo:-1,selected:'air',variant:0,hitAt:0,recoveryUntil:0,messageUntil:0,messagePriority:0,lastMessage:-10,bandit:false,escapeBandit:false};
const sam={sites:[],missiles:[],missile:null,lock:0,stage:0,site:null,lastCue:-99,lastLaunch:-99,nextLaunchAt:0};
const briefing=document.getElementById('briefing'),deploy=document.getElementById('deploy'),radio=document.getElementById('radio'),compass=document.getElementById('compass'),banditCue=document.getElementById('banditCue'),health=document.getElementById('health'),runTimeUI=document.getElementById('runTime'),runBestUI=document.getElementById('runBest'),intel=document.getElementById('desertIntel');
let banditKnown=false,banditCueActive=false,banditCueX=0,banditCueY=0,banditRearSide=1;
const banditCueLocal=new THREE.Vector3(),banditCueProjected=new THREE.Vector3(),banditCueInverse=new THREE.Quaternion();
let desertRun=-1;
const RESPONSE_RADIUS=2600;
function announce(text){
 if(mission.phase!=='flight')return;
 if(/TARGET DESTROYED/.test(text))text='TARGET DESTROYED · BREAK AWAY / ANY BEARING';
 if(/BANDIT|ACE INBOUND/.test(text))banditKnown=true;
 const priority=/MISSILE|AIRFRAME|TARGET DESTROYED/.test(text)?3:/RADAR|SAM|BANDIT/.test(text)?2:1;
 if(missionElapsed<mission.messageUntil&&priority<mission.messagePriority)return;
 if(text===radio.textContent&&missionElapsed-mission.lastMessage<1)return;
 radio.textContent=text;radio.dataset.tone=/MISSILE|TRACK|AIRFRAME/.test(text)?'threat':'status';mission.messageUntil=missionElapsed+3.2;mission.lastMessage=missionElapsed;mission.messagePriority=priority;
}
function releaseInputs(){for(const k in keys)keys[k]=false;releaseTouch();silence();}
addEventListener('blur',releaseInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseInputs();});
loadBest=function(){try{return Number(localStorage.getItem('emberwingDesertBest'))||Infinity}catch{return Infinity}};
saveBest=function(t){try{localStorage.setItem('emberwingDesertBest',String(t))}catch{}};bestTime=loadBest();
function responseDistance(){return Math.hypot(ship.position.x-rocket.position.x,ship.position.z-rocket.position.z);}
function outsideResponse(){return responseDistance()>RESPONSE_RADIUS&&sam.sites.every(s=>s.disabled||Math.hypot(ship.position.x-s.position.x,ship.position.z-s.position.z)>s.range);}
function spawnDefender(){
 const s=DESERT_SITES[mission.variant];spawnEnemy(false);enemyRole='ACE';
 const side=mission.variant%2?1:-1;
 enemy.position.set(s.x+side*1500,terrainHeight(s.x,s.z)+210,s.z-700);
 const dir=ship.position.clone().addScaledVector(heading(),250).sub(enemy.position).normalize();
 enemy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),dir);enemyCourse.copy(dir);duel.forward.copy(dir);duel.course.copy(dir);duelState('engage');duel.speed=225;
 enemyDetected=true;enemyTime=0;enemyHP=enemyMaxHP=2;lastEnemy.copy(enemy.position);resetEnemyAttack(2.5);resetHostileThreat(4);
 banditKnown=true;announce('BANDIT · '+clockBearing(enemy.position)+" O'CLOCK");
}
function updateSamNetwork(dt){
 if(crashed||missionComplete)return;
 sam.stage=0;sam.lock=0;sam.site=null;
 for(const s of sam.sites){
  if(s.disabled)continue;s.cooldown=Math.max(0,(s.cooldown||0)-dt);
  if(s.mobile){
   s.cycle=(s.cycle+dt)%24;const moving=s.cycle<13;
   if(moving){s.progress+=dt*16/s.roadLength;const t=.28+Math.abs((s.progress%1.04)-.52);s.group.position.copy(roadPoint(DESERT_SITES[mission.variant],t,4));s.group.position.y-=2.2;s.position.copy(s.group.position).addScaledVector(worldUp,10);s.group.rotation.y=Math.atan2(DESERT_SITES[mission.variant].x,DESERT_SITES[mission.variant].z-roadHub.z)+(s.progress%1.04<.52?0:Math.PI);s.dustClock-=dt;if(s.dustClock<=0){emitDust(s.group.position);s.dustClock=.38;}}
   s.moving=moving;if(moving){s.lock=0;s.stage=0;s.light.visible=false;continue;}
  }
  const range=s.position.distanceTo(ship.position),clear=range<s.range&&samLineClear(s);
  const allowed=missionElapsed>5&&missionElapsed>=mission.recoveryUntil;
  s.lock=clear&&allowed?Math.min(1,s.lock+dt*.27):Math.max(0,s.lock-dt*.65);
  const stage=s.lock>=.72?2:s.lock>.18?1:0;
  if(stage>s.stage){s.hotUntil=missionElapsed+5;announce(stage===2?'SAM TRACK · '+clockBearing(s.position)+" O'CLOCK":'RADAR SEARCH · '+clockBearing(s.position)+" O'CLOCK");chirp(stage===2?760:490,.07,.025);}
  s.stage=stage;s.light.visible=stage>0;s.light.scale.setScalar(1+Math.sin(missionElapsed*6)*.35);
  if(s.lock>sam.lock){sam.lock=s.lock;sam.stage=stage;sam.site=s;}
  if(s.lock>=1&&s.cooldown<=0&&missilePressureReady()){launchSam(s);s.cooldown=7;sam.nextLaunchAt=missionElapsed+3;}
 }
 updateSamMissiles(dt);
}
function updateMission(dt){
 if(crashed||missionComplete)return;
 const range=responseDistance();
 // Live traffic and moving radar give the answer before radio confirms close reconnaissance.
 if(!mission.identified&&(range<1000||convoy.some(v=>v.mesh.position.distanceTo(ship.position)<650))){mission.identified=true;mission.objective='strike';announce('ACTIVE SITE · '+DESERT_SITES[mission.variant].name+' · COMMAND TRUCK');}
 if(!mission.bandit&&(range<1650||missionElapsed>22+mission.variant*3)){mission.bandit=true;spawnDefender();}
 if(mission.destroyed&&!mission.escapeBandit&&!enemyAlive&&missionElapsed>mission.hitAt+3){mission.escapeBandit=true;spawnDefender();}
 if(mission.destroyed&&outsideResponse()){
  missionComplete=true;mission.phase='complete';mission.objective='complete';finalTime=missionElapsed;releaseInputs();removeSamMissile();removeHostileMissile();
  const newBest=finalTime<bestTime;if(newBest){bestTime=finalTime;saveBest(finalTime);}
  audioCtx?.suspend();document.body.dataset.state='complete';completeUI.style.display='grid';
  completeUI.innerHTML=`<div><small>EMBERWING / LEVEL 02 — WHICH ONE</small><h1>CLEAR OF RESPONSE</h1><div class="runTime">${formatTime(finalTime)}</div><p>Command vehicle destroyed. Aircraft recovered.</p><small>HULL ${playerHP}/3 · ${newBest?'NEW BEST':'BEST'} ${formatTime(bestTime)}</small><button id="again">FLY AGAIN</button></div>`;
  document.getElementById('again').addEventListener('click',()=>reset());
 }
 if(mission.destroyed)intel.textContent='BREAK AWAY · '+Math.max(0,Math.ceil((RESPONSE_RADIUS-range)/100)*100)+'m TO CLEAR · ANY BEARING';
 else if(mission.identified)intel.textContent=DESERT_SITES[mission.variant].name+' · LOW COMMAND TRUCK / ANTENNA';
 else intel.textContent='WHICH ONE · FOLLOW THE MOVING DUST / LOOK FOR RADAR';
}
const desertBaseReset=reset;
reset=function(brief=false){
 clearSamNetwork();v44ClearFirestorm();
 for(const p of effects.samTrail){scene.remove(p.mesh);p.mesh.material.dispose();}effects.samTrail.length=0;
 for(const fx of effects.launchFx){scene.remove(fx.mesh);if(fx.light)scene.remove(fx.light);fx.mesh.geometry.dispose();fx.mesh.material.dispose();}effects.launchFx.length=0;
 desertBaseReset();desertTheme();
 // Rotate three authored arrangements between sorties; initial pick is random.
 desertRun=desertRun<0?Math.floor(Math.random()*3):(desertRun+1)%3;
 Object.assign(mission,{phase:brief?'briefing':'flight',objective:'find',identified:false,destroyed:false,hp:8,lastSalvo:-1,selected:'air',variant:desertRun,hitAt:0,recoveryUntil:0,messageUntil:0,messagePriority:0,lastMessage:-10,bandit:false,escapeBandit:false});
 banditKnown=banditCueActive=false;hideBanditCue();enemyAlive=false;enemy.visible=false;respawn=999999;missionCompleteTimer=0;playerInitiativeUntil=-99;
 const active=DESERT_SITES[desertRun];rocket.position.set(active.x,terrainHeight(active.x,active.z)+9,active.z);rocket.visible=true;rocket.quaternion.identity();
 // Slightly oblique entry still presents the full lateral spread immediately.
 ship.position.set(0,terrainHeight(0,2150)+170,2150);ship.quaternion.identity();speed=CRUISE_SPEED;burner=0;
 convoy.forEach((v,i)=>{v.t=.32+i*.048+desertRun*.08;v.mesh.position.copy(roadPoint(active,.12+Math.abs(((v.t+.88)%1.76)-.88)));v.smoke=0;v.mesh.rotation.y=Math.atan2(active.x,active.z-roadHub.z)+Math.PI;});
 parkedEscorts.forEach((m,i)=>{m.position.set(active.x-45+i*42,terrainHeight(active.x,active.z)+1,active.z+48);});
 for(const p of dust){p.life=0;p.mesh.visible=false;}
 for(const v of convoy)for(let age=0;age<6;age+=.7){const p=v.mesh.position.clone();p.z+=age*15;emitDust(p,age);}
 const fixed=makeSamSite(active.x+210-launchSite.position.x,active.z+120-launchSite.position.z,0);fixed.range=1350;fixed.cooldown=3;
 const mobile=makeSamSite(-launchSite.position.x,-launchSite.position.z,1);mobile.range=1150;mobile.mobile=true;mobile.progress=.3+desertRun*.11;mobile.cycle=desertRun*3;mobile.dustClock=0;mobile.roadLength=Math.hypot(active.x,active.z-roadHub.z);mobile.moving=true;
 // Replace the stationary pad/bunker with a wheeled chassis, retaining physical launcher tubes.
 mobile.group.children[0].visible=false;mobile.group.children[1].visible=false;
 box(mobile.group,16,3,22,0,2,0,truckMat);
 for(const x of [-8,8])for(const z of [-7,7]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(2,2,2,8),darkMat);wheel.rotation.z=Math.PI/2;wheel.position.set(x,1.5,z);mobile.group.add(wheel);}
 mobile.group.position.copy(roadPoint(active,.28+Math.abs((mobile.progress%1.04)-.52),4));mobile.group.position.y-=2.2;mobile.position.copy(mobile.group.position).addScaledVector(worldUp,10);
 sam.sites=[fixed,mobile];sam.nextLaunchAt=6;sam.lastLaunch=-99;
 rebuildTerrain(0,1860);camera.position.copy(ship.position).add(new THREE.Vector3(0,6,16));resetCameraFrame();updateCamera(1/60);
 releaseInputs();audioCtx?.suspend();missionElapsed=0;briefing.hidden=!brief;deploy.disabled=false;document.body.dataset.state=mission.phase;radio.hidden=targetUI.hidden=capture.hidden=true;
 document.getElementById('countdown').hidden=true;intel.textContent='WHICH ONE · FOLLOW THE MOVING DUST / LOOK FOR RADAR';updateObjectives();updateWorld();renderer.render(scene,camera);
};
const desertKey=key;
key=function(e,down){
 if(e.metaKey||e.ctrlKey){releaseInputs();return;}
 if(mission.phase==='briefing'){if(down&&['Enter','Space', 'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();startMission();}return;}
 desertKey(e,down);
};
function startMission(){if(mission.phase!=='briefing')return;audio();mission.phase='flight';briefing.hidden=true;document.body.dataset.state='flight';renderer.domElement.focus();clock.getDelta();}
deploy.addEventListener('click',startMission);
const crashDesert=crashNow;crashNow=function(reason){crashDesert(reason);audioCtx?.suspend();releaseInputs();};
const clock=new THREE.Clock();
function loop(){
 requestAnimationFrame(loop);const rawDt=Math.min(clock.getDelta(),.033);if(document.hidden||mission.phase!=='flight')return;
 const dt=rawDt*(killSlow>0?.42:1);killSlow=Math.max(0,killSlow-rawDt);
 if(!crashed){missionElapsed+=rawDt;updateTouchFlight();updateFlight(dt);updateDanger(dt);updateDesertWorld(dt);updateWorld();if(enemyAlive)updateEnemy(dt);updateEnemyAttack(dt);updateSamNetwork(dt);updateMission(dt);updateRange(dt);updateCamera(dt);updateSpeedFX(dt);updateCombatFX(dt);updateWeapons(dt);updateV43SamSmoke(dt);updateLaunchClimax(dt);v44UpdateFirestorm(dt);updateTargeting(dt);updateGuidance();updateBanditCue(dt);updateInstruments();targetUI.dataset.label=mission.selected==='ground'?'COMMAND':mission.selected.startsWith('sam:')?'SAM':'BANDIT';}
 renderer.render(scene,camera);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.render(scene,camera);});
// Read-only telemetry for browser piloting and regression checks.
window.emberwing=Object.freeze({height:terrainHeight,snapshot:()=>({level:2,phase:mission.phase,objective:mission.objective,variant:mission.variant,position:ship.position.toArray(),quaternion:ship.quaternion.toArray(),forward:new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion).toArray(),speed,altitude:ship.position.y-terrainHeight(ship.position.x,ship.position.z),elapsed:missionElapsed,hp:playerHP,crashed,complete:missionComplete,destroyed:mission.destroyed,identified:mission.identified,target:rocket.position.toArray(),targetHP:mission.hp,selected:mission.selected,lock:lockState,seeker,missile:!!missile,bandit:enemyAlive,banditPosition:enemyAlive?enemy.position.toArray():null,banditRange:enemyAlive?enemy.position.distanceTo(ship.position):null,samMissile:sam.missiles.length>0,sams:sam.sites.map(s=>({position:s.position.toArray(),disabled:s.disabled,moving:!!s.moving,stage:s.stage,lock:s.lock})),convoy:convoy.map(v=>v.mesh.position.toArray()),dust:dust.filter(p=>p.life>0).length,responseDistance:responseDistance(),geometry:projectedGeometry(rocket.position,STRIKE_LOCK_RANGE)})});
