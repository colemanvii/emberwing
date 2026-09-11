// Emberwing V50 — Closing Door
// Directorial tuning pass: no new objective stack.
// The valley now escalates in readable stages, briefly loses coordination in the
// launch firestorm, then tries to close the northern exit behind EW-01.

const v50={
 alert:0,                // 0 quiet, 1 fleeting track, 2 confirmed, 3 fully awake
 contactAt:-1,
 confirmedCue:false,
 fullCue:false,
 disruptionUntil:-1,
 passClearAt:-1,
 passQuiet:false,
 lastNetworkCue:-99
};

// Detection is now a ramp. V46 still decides WHEN the player has been found;
// V50 changes what "found" means and how quickly the valley can react.
const v50BreakBase=v46BreakStealth;
v46BreakStealth=function(reason){
 if(v46.chaos||worldIndex!==0)return;
 v50BreakBase(reason);
 v50.alert=1;
 v50.contactAt=missionElapsed;
 v50.confirmedCue=false;
 v50.fullCue=false;

 // Do not let the whole valley fire at once. A fleeting track becomes a confirmed
 // prosecution over several seconds unless the player keeps masking.
 v46.interceptorDue=missionElapsed+5.2;
 v41.sam.cooldown=Math.max(v41.sam.cooldown,7.2);
 missionControl.task='';
 missionCue('FLEETING TRACK','STAY LOW / KEEP MOVING');
};

// Stage the wake-up without meters or percentages.
function updateV50Alert(){
 if(worldIndex!==0||!v46.chaos||missionBriefActive||crashed)return;
 const age=Math.max(0,missionElapsed-v50.contactAt);
 const agl=Math.max(0,ship.position.y-terrainHeight(ship.position.x,ship.position.z));

 // High/exposed flight accelerates confirmation; disciplined terrain flying buys time.
 const exposure=THREE.MathUtils.clamp((agl-105)/150,0,1);
 const confirmAt=3.4-exposure*1.25;
 const fullAt=7.8-exposure*2.15;

 if(v50.alert<2&&age>=confirmAt){
  v50.alert=2;
  if(!v50.confirmedCue){
   v50.confirmedCue=true;
   missionControl.task='';
   missionCue('TRACK CONFIRMED','DEFENSES REACTING');
   chirp(610,.05,.022);chirp(820,.055,.019,.11);
  }
 }
 if(v50.alert<3&&age>=fullAt){
  v50.alert=3;
  if(!v50.fullCue){
   v50.fullCue=true;
   missionControl.task='';
   missionCue('DEFENSE NET ACTIVE','DO NOT CLIMB / DO NOT LINGER');
   chirp(760,.055,.025);chirp(1040,.07,.023,.1);
  }
 }
}

// SAMs join progressively. Existing missiles stay physical; this only controls
// acquisition quality before and after the valley fully coordinates.
const v50SamBase=updateSamNetwork;
updateSamNetwork=function(dt){
 if(worldIndex!==0){v50SamBase(dt);return;}
 if(!v46.chaos){v50SamBase(dt);return;}

 // Firestorm disruption never deletes an airborne missile. It only ruins fresh
 // tracking for a few seconds, giving the player a window rather than immunity.
 if(v41.launch.destroyed&&missionElapsed<v50.disruptionUntil){
  if(v41.sam.missile){v50SamBase(dt);return;}
  v41.sam.lock=Math.max(0,v41.sam.lock-dt*1.9);
  v41.sam.stage=0;
  v41.sam.cooldown=Math.max(v41.sam.cooldown,.65);
  return;
 }

 // Fleeting track: batteries exist, search, and wait. No launch yet.
 if(v50.alert<2){
  v41.sam.lock=Math.max(0,v41.sam.lock-dt*1.4);
  v41.sam.stage=0;
  return;
 }

 const before=v41.sam.lock;
 v50SamBase(dt);

 // Partial network: slower acquisition. Fully awake network: fighter position can
 // help cue surviving SAM sites, making air + ground defense feel coordinated.
 if(v50.alert===2&&!v41.sam.missile){
  v41.sam.lock=Math.min(v41.sam.lock,before+dt*.34);
 }
 if(v50.alert>=3&&!v41.radarDestroyed&&!v41.sam.missile&&enemyAlive&&enemyDetected){
  const range=enemy.position.distanceTo(ship.position);
  if(range<720)v41.sam.lock=Math.min(1,v41.sam.lock+dt*.085);
 }
};

// Fighter missile pressure follows the same alert state. A fleeting detection does not
// instantly produce a perfect A-A missile solution.
const v50ThreatBase=updateHostileThreat;
updateHostileThreat=function(dt){
 if(worldIndex!==0){v50ThreatBase(dt);return;}
 if(!v46.chaos||v50.alert<2){
  if(hostileMissile){v50ThreatBase(dt);return;}
  hostileLock=Math.max(0,hostileLock-dt*2);
  hostileLockStage=0;hostileLaunchDelay=0;
  return;
 }
 v50ThreatBase(dt);
};

// The first interceptor is pressure, not a mandatory duel. Give it crossing geometry
// and let the player refuse the fight by staying fast and on mission.
const v50SpawnBase=spawnEnemy;
spawnEnemy=function(first=false){
 v50SpawnBase(first);
 if(worldIndex!==0)return;

 if(first&&kills===0){
  const side=-1;
  const north=new THREE.Vector3(0,0,-1),right=new THREE.Vector3(1,0,0);
  const candidate=ship.position.clone().addScaledVector(north,1080).addScaledVector(right,side*330);
  candidate.y=Math.max(ship.position.y+92,terrainHeight(candidate.x,candidate.z)+118);
  if(typeof enemySpawnClear!=='function'||enemySpawnClear(candidate))enemy.position.copy(candidate);

  // Cross the player's route rather than materialize directly in front of the nose.
  const aim=ship.position.clone().addScaledVector(north,260).addScaledVector(right,150);
  const inbound=aim.sub(enemy.position).normalize();
  enemy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),inbound);
  enemyCourse.copy(inbound);
  if(typeof duel!=='undefined'){
   duel.forward.copy(inbound);duel.course.copy(inbound);duel.side=1;
   duel.close=duel.pursuit=duel.pressure=0;duel.cooldown=0;duel.speed=132;
   duelState('engage');
  }
  enemyRole='CLIMBER';
  resetEnemyAttack(2.1);
  hostileMissileCooldown=Math.max(hostileMissileCooldown,4.4);
 }
};

// Firestorm = temporary disorder, not safety. The residual fighter remains alive and
// the remaining SAMs will rebuild their picture after a short disruption window.
const v50StrikeBase=groundStrikeImpact;
groundStrikeImpact=function(){
 const launchHit=worldIndex===0&&encounter.kind==='launch'&&v41.launch.active;
 v50StrikeBase();
 if(launchHit&&v41.launch.destroyed){
  v50.disruptionUntil=missionElapsed+7.2;
  v50.passClearAt=-1;v50.passQuiet=false;
  v41.sam.lock=0;v41.sam.stage=0;
  if(!hostileMissile)resetHostileThreat(1.8);
  missionControl.task='';
  missionCue('TARGET DESTROYED','GO NORTH');
 }
};

// During egress, the surviving fighter becomes the mobile part of the closing door.
// We do not teleport it or guarantee a shot; we simply keep it committed and bias its
// next extension back toward the pass instead of letting it wander away.
const v50EnemyBase=updateEnemy;
updateEnemy=function(dt){
 v50EnemyBase(dt);
 if(worldIndex!==0||!v41.launch.destroyed||!enemyAlive||crashed)return;

 if(typeof duel!=='undefined'){
  const pass=v45.passPoint.clone();
  const toPass=pass.sub(enemy.position);toPass.y*=.35;
  if(toPass.lengthSq()>.001){
   toPass.normalize();
   if(duel.state==='extend'){
    duel.course.lerp(toPass,.055).normalize();
    duel.cooldown=Math.min(duel.cooldown,2.2);
   }
  }
 }
};

// Closing-door cue: the pass is the only thing that matters now. Use one terse
// reminder near the final wall, then silence after the player physically clears it.
function updateV50Egress(){
 if(worldIndex!==0||!v41.launch.destroyed||crashed)return;

 if(ship.position.z<-4070&&missionElapsed-v50.lastNetworkCue>8&&v50.passClearAt<0){
  v50.lastNetworkCue=missionElapsed;
  missionControl.task='';
  missionCue('HIGH PASS','KEEP YOUR ENERGY / GET OUT');
 }

 if(v50.passClearAt<0&&ship.position.z<-5150){
  v50.passClearAt=missionElapsed;
  v50.passQuiet=true;

  // The door is behind you. Kill the threat presentation, not the aircraft model,
  // and let the engine/turbo audio carry the final seconds.
  removeSamMissile();
  v41.sam.lock=0;v41.sam.stage=0;v41.sam.cooldown=999;
  removeHostileMissile();
  cancelEnemyAttack(999);
  resetHostileThreat(999);
  missionControl.task='';
  missionCue('RIDGE CLEAR','');
  silence();
 }
}

// V45 used an immediate theater transition after the north wall. V50 holds open sky
// for a few seconds first, then moves to Alpine without a victory banner.
const v50MissionBase=updateMission;
updateMission=function(dt){
 if(worldIndex===0&&v41.launch.destroyed){
  updateV50Egress();

  if(v50.passClearAt>=0){
   if(missionElapsed-v50.passClearAt>=3.1){
    citySplit=missionElapsed;
    deployAlpine();
   }
   return;
  }

  // Stay in the playable egress until the pass is actually crossed.
  return;
 }
 v50MissionBase(dt);
};

// Do not score Theater 1 by bodies. The HUD reports mission phase instead.
// The main loop calls this helper after all tactical updates.
function v50StatusLine(){
 const t=formatTime(finalTime||missionElapsed);
 if(worldIndex!==0)return `THEATER ${worldIndex+1}/3 · CONTACTS ${String(Math.max(0,MISSION_KILLS-kills)).padStart(2,'0')} · ${t}${bestTime<Infinity?' · RECORD '+formatTime(bestTime):''}`;
 let state='INGRESS';
 if(v41.launch.destroyed)state=v50.passClearAt>=0?'CLEAR':'EGRESS';
 else if(v41.launch.active)state='STRIKE';
 else if(v46.chaos)state=v50.alert>=3?'CONTESTED':'TRACKED';
 return `DESERT · ${state} · ${t}${playerHP<3?' · HULL '+playerHP+'/3':''}`;
}

const v50WorldBase=updateWorld;
updateWorld=function(){
 v50WorldBase();
 updateV50Alert();
 // updateV50Egress is intentionally owned by updateMission so it runs once per frame.
};

const v50ResetBase=reset;
reset=function(){
 Object.assign(v50,{alert:0,contactAt:-1,confirmedCue:false,fullCue:false,disruptionUntil:-1,passClearAt:-1,passQuiet:false,lastNetworkCue:-99});
 v50ResetBase();
};

const v50AlpineBase=deployAlpine;
deployAlpine=function(){
 v50.alert=3;v50.passQuiet=false;
 v50AlpineBase();
};
