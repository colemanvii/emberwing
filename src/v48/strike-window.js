// Emberwing V48 — Strike Window
// Re-choreograph Desert into distinct beats instead of three similar bandit kills:
// stealth ingress -> first intercept -> radar strike -> final defender -> launch strike -> egress.
// Preserve V47 lethality/escalation, V46 stealth, V45 valley, V44 firestorm, player flight/turbo/weapons.

const v48={
 stage:'stealth',
 secondDue:-1,
 secondSpawned:false,
 launchCue:0,
 radarCue:false
};

// Keep the brief simple; the second interceptor remains a surprise.
if(typeof missionBrief!=='undefined'&&missionBrief){
 const title=missionBrief.querySelector('.briefTitle');
 const orders=missionBrief.querySelector('.briefOrders');
 if(title)title.textContent='VALLEY STRIKE';
 if(orders)orders.innerHTML=[
  'CROSS THE SOUTH RIDGELINE',
  'DROP LOW — STAY UNSEEN',
  'BREAK THE INTERCEPT',
  'DESTROY THE RADAR',
  'DESTROY THE LAUNCH VEHICLE',
  'EGRESS NORTH THROUGH HIGH PASS'
 ].map(line=>'<span>'+line+'</span>').join('');
}

// Radar becomes the next unmistakable job immediately after the first kill.
const v48BeginRadarBase=beginRadarOpportunity;
beginRadarOpportunity=function(){
 v48BeginRadarBase();
 if(worldIndex!==0||encounter.kind!=='radar')return;
 v48.stage='radar';
 encounter.timer=Math.min(encounter.timer,1.15);
 missionControl.task='';
 missionCue('FIRST INTERCEPTOR DOWN','RADAR SITE NEXT / KEEP NORTH');
};

// Radar destruction opens a short attack window, then one hard defender comes off the complex.
const v48FinishRadarBase=finishRadarOpportunity;
finishRadarOpportunity=function(status){
 const wasRadar=worldIndex===0&&encounter.kind==='radar';
 v48FinishRadarBase(status);
 if(!wasRadar||status!=='destroyed')return;

 v48.stage='window';
 v48.secondDue=missionElapsed+3.0;
 v48.secondSpawned=false;
 respawn=999999;
 missionControl.task='';
 missionCue('RADAR DOWN','STRIKE WINDOW OPEN / PUSH NORTH');
};

// Distinct fighter sequence:
// 1) V46 owns the first stealth-break interceptor.
// 2) No generic respawn while waiting for the radar / strike-window defender.
// 3) One aggressive final defender appears from the defended north after radar destruction.
const v48EnemyBase=updateEnemy;
updateEnemy=function(dt){
 if(worldIndex===0){
  if((v48.stage==='radar'||v48.stage==='window')&&!enemyAlive){
   respawn=999999;
   if(v48.stage==='window'&&!v48.secondSpawned&&missionElapsed>=v48.secondDue){
    v48.secondSpawned=true;
    encounter.phase='done';
    spawnEnemy(false);
    enemyRole='ACE';
    enemyHP=enemyMaxHP=3;
    resetEnemyAttack(.8);
    hostileMissileCooldown=Math.min(hostileMissileCooldown,2.8);
    v48.stage='defender';
    missionControl.task='';
    missionCue('FAST MOVER OFF THE COMPLEX','FINAL DEFENDER / BREAK THROUGH');
   }
   return;
  }
  if(v48.stage==='strike'&&!enemyAlive){
   respawn=999999;
   return;
  }
 }
 v48EnemyBase(dt);
};

// Make the final defender the last required air-to-air kill. After that, the
// launch vehicle becomes the single final target. No third generic bandit.
const v48ExplodeBase=explode;
explode=function(){
 const beforeKills=kills,beforeWorld=worldIndex,beforeStage=v48.stage;
 v48ExplodeBase();

 if(beforeWorld!==0)return;

 if(beforeKills===0&&kills===1){
  v48.stage='radar';
  respawn=999999;
 }

 if(beforeStage==='defender'&&kills===beforeKills+1){
  missionCompleteTimer=0;
  respawn=999999;
  if(v41.radarDestroyed&&!v41.launch.destroyed){
   activateLaunchStrike();
   v48.stage='strike';
   v48.launchCue=0;
   missionControl.task='';
   missionCue('AIR COVER BROKEN','LAUNCH VEHICLE / ONE PASS');
  }
 }
};

// Final attack is a real rising-tension beat. No hard countdown game-over;
// the vehicle visibly transitions from cold pad -> ignition -> lift while SAMs remain active.
const v48EncounterBase=updateEncounter;
updateEncounter=function(dt){
 v48EncounterBase(dt);
 if(worldIndex!==0||!v41.launch.active||v41.launch.destroyed)return;

 if(v48.launchCue===0&&v41.launch.age>5.5){
  v48.launchCue=1;
  missionCue('LAUNCH SEQUENCE','IGNITION STARTING');
 }else if(v48.launchCue===1&&v41.launch.age>10.5){
  v48.launchCue=2;
  missionCue('VEHICLE HOT','TAKE THE SHOT');
  flashScreen(.05);chirp(710,.06,.026);chirp(940,.08,.022,.08);
 }else if(v48.launchCue===2&&v41.launch.age>17){
  v48.launchCue=3;
  missionCue('LIFTOFF COMMITTED','DESTROY IT NOW');
  flashScreen(.08);chirp(980,.07,.032);chirp(1260,.09,.028,.1);
 }
};

// Make lift visually meaningful after ignition without changing player weapons.
// The inherited V41 spectacle already starts motion; V48 accelerates only the late stage.
const v48SpectacleBase=updateV34Spectacle;
updateV34Spectacle=function(){
 v48SpectacleBase();
 if(worldIndex===0&&v41.launch.active&&!v41.launch.destroyed&&v41.launch.age>17){
  rocket.position.y+=Math.pow(v41.launch.age-17,1.28)*1.4;
 }
};

// Stage language on the compass should describe what matters now.
const v48LabelBase=v43ObjectiveLabel;
v43ObjectiveLabel=function(){
 if(worldIndex!==0)return v48LabelBase();
 if(v41.launch.destroyed)return 'PASS';
 if(v48.stage==='radar')return 'RADAR';
 if(v48.stage==='defender')return 'THREAT';
 if(v48.stage==='strike')return 'LAUNCH';
 return v48LabelBase();
};

const v48ResetBase=reset;
reset=function(){
 v48.stage='stealth';v48.secondDue=-1;v48.secondSpawned=false;v48.launchCue=0;v48.radarCue=false;
 v48ResetBase();
};

const v48AlpineBase=deployAlpine;
deployAlpine=function(){
 v48.stage='done';
 v48AlpineBase();
};
