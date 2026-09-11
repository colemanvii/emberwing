// Emberwing V49 — Living Valley
// One defended objective, one continuous fight.
// Radar is useful but not a gate. Fighters and SAMs exist to protect the launch vehicle.
// The player can strike the target while a defender is still alive.
// Fast/low/decisive flight reaches the target before the valley fully organizes;
// slow/exposed flight produces a much nastier target area and egress.

const v49={
 stage:'stealth',
 sweepDone:false,
 firstKillAt:-1,
 launchOrdered:false,
 launchReason:'',
 defenderDue:-1,
 defenderSpawned:false,
 groundPriority:false,
 radarSurvivor:null,
 radarSkipped:false,
 lastCue:-99
};

// Strip the opening back to the actual job. Fighters/radar are discovered in the mission,
// not presented as chores before the player has even crossed the ridge.
if(typeof missionBrief!=='undefined'&&missionBrief){
 const alert=missionBrief.querySelector('.briefAlert');
 const title=missionBrief.querySelector('.briefTitle');
 const orders=missionBrief.querySelector('.briefOrders');
 if(alert)alert.textContent='A HOSTILE LAUNCH VEHICLE IS BEING PREPARED INSIDE THE VALLEY.';
 if(title)title.textContent='VALLEY STRIKE';
 if(orders)orders.innerHTML=[
  'CROSS THE SOUTH RIDGE',
  'STAY LOW — USE THE TERRAIN',
  'DESTROY THE LAUNCH VEHICLE',
  'EGRESS NORTH THROUGH HIGH PASS'
 ].map(line=>'<span>'+line+'</span>').join('');
}

// Radar improves the defensive organism while alive; destroying it degrades quality
// but never turns the valley "off."
const v49PressureBase=v47Pressure;
v47Pressure=function(){
 const base=v49PressureBase();
 if(worldIndex!==0||!v46.chaos)return base;
 let extra=0;
 if(!v41.radarDestroyed)extra+=.09;
 if(v41.launch.active)extra+=.08;
 if(v41.launch.destroyed)extra+=.12;
 return THREE.MathUtils.clamp(base+extra,0,1);
};

// First kill reveals an opportunity, not a mandatory gate.
const v49BeginRadarBase=beginRadarOpportunity;
beginRadarOpportunity=function(){
 if(worldIndex===0&&v41.launch.active){
  encounter.offered=true;
  return;
 }
 v49BeginRadarBase();
 if(worldIndex!==0||encounter.kind!=='radar')return;
 v49.stage='penetration';
 encounter.timer=Math.min(encounter.timer,1.0);
 respawn=999999;
 missionControl.task='';
 missionCue('ROUTE OPEN','EMITTER AHEAD / KILL IT IF CLEAN');
};

// Allow the player to leave a live emitter behind. It stays physical and the price is
// a more competent defense network.
const v49FinishRadarBase=finishRadarOpportunity;
finishRadarOpportunity=function(status){
 const radar=worldIndex===0&&encounter.kind==='radar';
 if(!radar){v49FinishRadarBase(status);return;}

 if(status!=='destroyed'){
  stopRadarCarrier();clearSurfaceShot();
  encounter.phase='done';encounter.age=0;encounter.timer=0;
  encounter.tracking=false;encounter.paint=0;encounter.launchWarned=false;encounter.shotFired=true;
  targetUI.style.opacity='0';lockState=lockTimer=lastLock=0;
  if(seeker)setSeeker(false);
  respawn=999999;v49.radarSkipped=true;
  missionControl.task='';
  missionCue('EMITTER STILL ACTIVE','KEEP MOVING / STAY IN THE TERRAIN');
  return;
 }

 v49FinishRadarBase(status);
 v49.stage='penetration';
 missionControl.task='';
 missionCue('NETWORK DEGRADED','PUSH THE TARGET');
};

// Emergency launch is a defender reaction to penetration/attack, not a hidden fail timer.
function v49LaunchRumble(){
 if(!audioCtx||audioCtx.state!=='running')return;
 const t=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
 osc.type='sine';osc.frequency.setValueAtTime(52,t);osc.frequency.exponentialRampToValueAtTime(31,t+1.05);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.045);gain.gain.exponentialRampToValueAtTime(.0001,t+1.08);
 osc.connect(gain).connect(audioCtx.destination);osc.start(t);osc.stop(t+1.12);
}
function v49OrderLaunch(reason){
 if(worldIndex!==0||v49.launchOrdered||v41.launch.active||v41.launch.destroyed)return;
 v49.launchOrdered=true;v49.launchReason=reason;v49.stage='strike';

 // If the optional radar is still standing, leave the physical site in the valley
 // while transferring targeting authority to the launch vehicle.
 if(encounter.group&&!v41.radarDestroyed){
  v49.radarSurvivor=encounter.group;
  stopRadarCarrier();clearSurfaceShot();
  encounter.tracking=false;encounter.paint=0;
 }
 activateLaunchStrike();
 v48.stage='strike';
 v48.launchCue=0;
 v49.defenderDue=missionElapsed+2.6;
 v49LaunchRumble();
 missionControl.task='';
 missionCue('EMERGENCY LAUNCH ORDER','TARGET IS MOVING / HIT IT NOW');
 announce('LAUNCH CREW COMMITTED');
}

// A single soft search sweep before detection gives the quiet ingress teeth without
// spawning a threat or filling the HUD.
function updateV49Director(){
 if(worldIndex!==0||missionBriefActive||crashed||missionComplete)return;

 if(!v46.chaos&&!v49.sweepDone&&v45.entered){
  const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);
  if(agl<185&&ship.position.z<930){
   v49.sweepDone=true;
   radarCarrier(encounter.targetPos);
   missionCue('SEARCH RADAR','HOLD THE VALLEY FLOOR');
   chirp(410,.05,.018);chirp(520,.045,.014,.16);
  }
 }

 if(v46.chaos&&!v49.launchOrdered&&!v41.launch.destroyed){
  const since=Math.max(0,missionElapsed-v46.detectedAt);
  const deep=ship.position.z<-1450;
  const networkHit=v41.radarDestroyed;
  const prolonged=since>50;
  if(networkHit)v49OrderLaunch('radar');
  else if(deep)v49OrderLaunch('penetration');
  else if(prolonged)v49OrderLaunch('prolonged');
 }

 // The defender only arrives if the player gives the valley time. If an earlier
 // interceptor is still alive, that aircraft already serves the same protective role.
 if(v41.launch.active&&!v41.launch.destroyed&&!v49.defenderSpawned&&missionElapsed>=v49.defenderDue){
  if(!enemyAlive){
   v49.defenderSpawned=true;
   spawnEnemy(false);
   enemyRole='ACE';enemyHP=enemyMaxHP=3;
   resetEnemyAttack(.72);
   hostileMissileCooldown=Math.min(hostileMissileCooldown,2.6);
   missionControl.task='';
   missionCue('DEFENDER COMMITTED','DO NOT LOSE THE TARGET');
  }else{
   v49.defenderDue=missionElapsed+1.5;
  }
 }
}

// Bypass V48's "kill final defender before strike" gate. Ground encounters keep updating,
// but no generic replacement bandit is allowed to appear on its own.
const v49EnemyBase=v48EnemyBase;
updateEnemy=function(dt){
 if(worldIndex===0){
  if(!enemyAlive)respawn=999999;
  v49EnemyBase(dt);
  return;
 }
 v49EnemyBase(dt);
};

// Record the first kill, but do not turn later kills into objective gates.
const v49ExplodeBase=explode;
explode=function(){
 const beforeWorld=worldIndex,beforeKills=kills;
 v49ExplodeBase();
 if(beforeWorld!==0)return;

 if(beforeKills===0&&kills===1){
  v49.firstKillAt=missionElapsed;
  v49.stage=v41.launch.active?'strike':'penetration';
  respawn=999999;
 }
 if(v41.launch.active&&!v41.launch.destroyed){
  missionCompleteTimer=0;respawn=999999;
  missionControl.task='';
  missionCue('THREAT SPLASHED','STAY ON THE LAUNCH VEHICLE');
 }
};

// ---------- Simultaneous air fight + ground strike ----------
// Holding X on a visible ground target gives that target priority only while the target
// is actually inside the designation ring. Otherwise X behaves exactly like the A-A seeker.
const v49GeometryBase=geometry;
geometry=function(){
 if(worldIndex===0&&seeker&&encounter.phase==='active'&&(encounter.kind==='radar'||encounter.kind==='launch')){
  const sg=strikeGeometry();
  const sticky=v49.groundPriority&&sg.onscreen&&sg.d<sg.trackR*1.35;
  if(sg.state||sticky){v49.groundPriority=true;return sg;}
 }
 v49.groundPriority=false;
 return v49GeometryBase();
};

function v49FireStrikeMissile(){
 if(encounterBlocked()||encounter.phase!=='active'||missile||missileRearm>0||lockState!==2)return;
 const m=new THREE.Group(),
  body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,2.4,8),new THREE.MeshStandardMaterial({color:0xe8ded0,metalness:.35,roughness:.45})),
  flame=new THREE.Mesh(new THREE.ConeGeometry(.14,1.4,8),new THREE.MeshBasicMaterial({color:0xff7b31,transparent:true,opacity:.9}));
 body.rotation.x=Math.PI/2;m.add(body);flame.rotation.x=-Math.PI/2;flame.position.z=1.7;flame.visible=false;m.add(flame);
 m.position.copy(ship.position).add(new THREE.Vector3(5,-.2,-1.5).applyQuaternion(ship.quaternion));m.quaternion.copy(ship.quaternion);scene.add(m);
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion);
 missile={mesh:m,flame,v:forward.multiplyScalar(speed*.9).addScaledVector(worldUp,-16),life:5.2,guided:false,age:0,trailClock:0,ignited:false,igniteAt:.09,strikeTarget:true};
 missileRearm=1.2;announce('GROUND WEAPON AWAY');chirp(175,.075,.045);chirp(62,.11,.033,.012);setSeeker(false);
}

const v49FireBase=fireMissile;
fireMissile=function(){
 if(worldIndex===0&&v49.groundPriority&&encounter.phase==='active'&&lockState===2){
  v49FireStrikeMissile();return;
 }
 v49FireBase();
};

const v49TargetingBase=updateTargeting;
updateTargeting=function(dt){
 v49TargetingBase(dt);
 if(worldIndex!==0||!v49.groundPriority||encounter.phase!=='active')return;
 const ft=Math.round(encounter.targetPos.distanceTo(ship.position)*FEET_PER_UNIT/10)*10;
 const label=encounter.kind==='launch'?'LAUNCH VEHICLE':'RADAR EMITTER';
 if(lockState===2){coachText.textContent=label+' LOCK';coachSub.textContent=ft+' FT · RELEASE X — FIRE';}
 else if(lockState===1){coachText.textContent='DESIGNATOR TRACKING';coachSub.textContent=label+' · '+ft+' FT';}
 else{coachText.textContent='DESIGNATOR UNCAGED';coachSub.textContent=label+' · '+ft+' FT';}
};

const v49GuidanceBase=updateGuidance;
updateGuidance=function(){
 v49GuidanceBase();
 if(worldIndex!==0||!v49.groundPriority||encounter.phase!=='active')return;
 const pos=encounter.targetPos,local=pos.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert()),front=local.z<0,p=pos.clone().project(camera);
 const ons=front&&Math.abs(p.x)<.86&&Math.abs(p.y)<.76;
 let x,y;
 if(ons){x=(p.x*.5+.5)*innerWidth;y=(-p.y*.5+.5)*innerHeight;}
 else{
  const az=Math.atan2(local.x,-local.z),flat=Math.max(1,Math.hypot(local.x,local.z));
  let dx=Math.sin(az),dy=-THREE.MathUtils.clamp(local.y/flat,-.82,.82),mag=Math.max(.001,Math.hypot(dx,dy));
  dx/=mag;dy/=mag;const radius=Math.min(innerWidth,innerHeight)*.3;
  x=innerWidth*.5+dx*radius;y=innerHeight*.42+dy*radius;
 }
 guideX=x;guideY=y;targetUI.style.left=x+'px';targetUI.style.top=y+'px';
 targetUI.dataset.owner=encounter.kind==='launch'?'launch':'radar';
 targetUI.dataset.range=(encounter.kind==='launch'?'LAUNCH VEHICLE':'RADAR')+' · '+Math.round(pos.distanceTo(ship.position)*FEET_PER_UNIT/10)*10+' FT';
 targetUI.style.opacity='.9';targetUI.className=!ons?'offscreen':lockState===2?'lock':lockState===1?'track':'';
};

// Make the launch site's vapor visibly build from "quiet preparation" to "emergency launch."
const v49VaporBase=updateLaunchVapor;
updateLaunchVapor=function(){
 v49VaporBase();
 if(worldIndex!==0||v41.launch.destroyed)return;
 const alert=!v46.chaos?.18:v41.launch.active?1:THREE.MathUtils.clamp(.42+v47Pressure()*.5,.42,.9);
 for(const puff of v43.vapor){
  if(!puff.mesh.visible)continue;
  puff.mesh.material.opacity*=.65+alert*1.35;
  const f=.9+alert*.22;puff.mesh.scale.multiplyScalar(f);
 }
};

// A launch order changes the soundscape once. V48's ignition/liftoff cues then carry
// the rest of the visible countdown.
const v49WorldBase=updateWorld;
updateWorld=function(){
 v49WorldBase();
 updateV49Director();
};

const v49StrikeBase=groundStrikeImpact;
groundStrikeImpact=function(){
 const launchHit=worldIndex===0&&encounter.kind==='launch'&&v41.launch.active;
 v49StrikeBase();
 if(launchHit&&v41.launch.destroyed){
  v49.stage='egress';
  v43.egressBanditSpawned=enemyAlive; // surviving defender becomes the pursuer; otherwise V43 may launch one last-ditch aircraft.
 }
};

function clearV49RadarSurvivor(){
 if(!v49.radarSurvivor)return;
 try{disposeObject3D(v49.radarSurvivor);}catch{scene.remove(v49.radarSurvivor);}
 v49.radarSurvivor=null;
}
const v49ResetBase=reset;
reset=function(){
 clearV49RadarSurvivor();
 Object.assign(v49,{stage:'stealth',sweepDone:false,firstKillAt:-1,launchOrdered:false,launchReason:'',defenderDue:-1,defenderSpawned:false,groundPriority:false,radarSkipped:false,lastCue:-99});
 v49ResetBase();
};
const v49AlpineBase=deployAlpine;
deployAlpine=function(){
 clearV49RadarSurvivor();v49.stage='done';v49.groundPriority=false;
 v49AlpineBase();
};
