// Emberwing V47 — Escalation
// Once stealth breaks, hostile fighters can employ missiles in the Desert.
// The longer EW-01 stays exposed / lingers in the valley, the defense gets sharper.
// No player-flight, camera, turbo/audio or weapon-control changes.

const v47={
 pressure:0,
 lastCall:-99,
 extraSamBias:0
};

function v47Pressure(){
 if(worldIndex!==0||!v46.chaos)return 0;
 const since=Math.max(0,missionElapsed-v46.detectedAt);
 const agl=Math.max(0,ship.position.y-terrainHeight(ship.position.x,ship.position.z));
 const linger=THREE.MathUtils.clamp((since-18)/72,0,1);
 const high=THREE.MathUtils.clamp((agl-95)/180,0,1);
 const deep=THREE.MathUtils.clamp((650-ship.position.z)/4200,0,1);
 return THREE.MathUtils.clamp(linger*.58+high*.28+deep*.14,0,1);
}

// Desert interceptors can now launch AAMs after detection. A clean, fast, low run
// buys time; a sloppy exposed run lets the enemy build repeated firing solutions.
const v47HostileSolutionBase=hostileLockSolution;
hostileLockSolution=function(){
 if(worldIndex!==0)return v47HostileSolutionBase();
 if(!v46.chaos||!enemyAlive||crashed||missionComplete||missionCompleteTimer>0||enemyTime<2.4)return false;
 const p=v47Pressure();
 const toShip=ship.position.clone().sub(enemy.position),range=toShip.length();
 const maxRange=THREE.MathUtils.lerp(560,760,p);
 if(range<135||range>maxRange)return false;
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(enemy.quaternion).normalize();
 const aspect=THREE.MathUtils.lerp(.84,.68,p);
 return forward.dot(toShip.multiplyScalar(1/Math.max(range,.001)))>aspect&&enemyLOS();
};

const v47ThreatBase=updateHostileThreat;
updateHostileThreat=function(dt){
 if(worldIndex!==0){v47ThreatBase(dt);return;}
 if(!v46.chaos){resetHostileThreat(999);return;}
 const p=v47Pressure();

 // Scale the inherited lock/cooldown system without changing its warning language.
 if(hostileMissileCooldown>0)hostileMissileCooldown=Math.max(0,hostileMissileCooldown-dt*p*.55);

 const beforeStage=hostileLockStage;
 v47ThreatBase(dt);

 // As pressure rises, a maintained firing solution completes lock faster.
 if(hostileLockStage>0&&!hostileMissile){
  hostileLock=Math.min(1,hostileLock+dt*p*.42);
 }
 if(hostileMissileCooldown>0&&p>.72)hostileMissileCooldown=Math.min(hostileMissileCooldown,4.8);

 if(beforeStage===0&&hostileLockStage===1&&p>.55&&missionElapsed-v47.lastCall>8){
  v47.lastCall=missionElapsed;
  missionCue('ENEMY MISSILE THREAT','KEEP MOVING / BREAK THEIR SOLUTION');
 }
};

// SAM pressure also tightens with time/exposure: not by cheating LOS, but by
// shortening reacquisition windows when the network has had time to organize.
const v47SamBase=updateSamNetwork;
updateSamNetwork=function(dt){
 if(worldIndex!==0||!v46.chaos){v47SamBase(dt);return;}
 const p=v47Pressure();
 const beforeCooldown=v41.sam.cooldown;
 v47SamBase(dt);
 if(!v41.sam.missile&&v41.sam.cooldown>0){
  const shaved=dt*p*.65;
  v41.sam.cooldown=Math.max(0,v41.sam.cooldown-shaved);
 }
 if(p>.82&&missionElapsed-v47.lastCall>10){
  v47.lastCall=missionElapsed;
  missionCue('DEFENSE NETWORK FULLY ALERT','DO NOT LINGER');
 }
};

// Make later Desert interceptors increasingly capable without turning them into
// arcade bullet sponges.
const v47SpawnBase=spawnEnemy;
spawnEnemy=function(first=false){
 v47SpawnBase(first);
 if(worldIndex!==0)return;
 const p=v47Pressure();
 if(p>.62)enemyRole='ACE';
 else if(p>.32)enemyRole='CLIMBER';
 else enemyRole=first?'ROOKIE':'SKIMMER';
 resetEnemyAttack(first?2.4:THREE.MathUtils.lerp(1.7,.9,p));
 if(p>.45)hostileMissileCooldown=Math.min(hostileMissileCooldown,THREE.MathUtils.lerp(6.8,3.8,p));
};

const v47WorldBase=updateWorld;
updateWorld=function(){
 v47WorldBase();
 v47.pressure=v47Pressure();
};

const v47ResetBase=reset;
reset=function(){
 v47.pressure=0;v47.lastCall=-99;v47.extraSamBias=0;
 v47ResetBase();
};
