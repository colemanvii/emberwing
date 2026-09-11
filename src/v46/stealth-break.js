// Emberwing V46 — Stealth Break
// Start quiet. Nothing is waiting in the sky. The first interceptor launches only
// after EW-01 penetrates the valley / gets exposed. Then the defended airspace wakes up.

const v46={
 chaos:false,
 detectedAt:-1,
 interceptorDue:-1,
 firstInterceptorSpawned:false
};

function v46SilenceDefenders(){
 if(worldIndex!==0)return;
 enemyAlive=false;
 enemy.visible=false;
 enemyDetected=false;
 contactLostTime=0;
 banditGlint.visible=false;
 respawn=999999;
 cancelEnemyAttack(999);
 resetHostileThreat(999);
 removeSamMissile();
 v41.sam.lock=0;v41.sam.stage=0;v41.sam.site=null;v41.sam.cooldown=999;
 targetUI.style.opacity='0';
}

function v46BreakStealth(reason){
 if(v46.chaos||worldIndex!==0)return;
 v46.chaos=true;
 v46.detectedAt=missionElapsed;
 v46.interceptorDue=missionElapsed+1.8;
 v41.sam.cooldown=4.0;
 v41.sam.lock=0;v41.sam.stage=0;v41.sam.site=null;
 missionControl.task='';
 missionCue(reason==='exposed'?'RADAR CONTACT':'VALLEY SENSOR TRIP','THEY KNOW WE\'RE HERE');
 announce('HOSTILE AIRSPACE ACTIVE');
 flashScreen(.07);
 chirp(510,.055,.028);chirp(760,.07,.026,.09);
}

function updateV46StealthBreak(){
 if(worldIndex!==0||missionBriefActive||crashed||missionComplete)return;

 if(!v46.chaos){
  const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);
  // Staying high after the crest gets you detected sooner. Flying the valley buys
  // a little more quiet before the defense network realizes you're inside.
  if(v45.entered&&agl>205&&ship.position.z<820){
   v46BreakStealth('exposed');
  }else if(v45.dropped&&ship.position.z<470){
   v46BreakStealth('masked');
  }
  return;
 }

 if(!v46.firstInterceptorSpawned&&missionElapsed>=v46.interceptorDue){
  v46.firstInterceptorSpawned=true;
  firstTarget=true;
  spawnEnemy(true);
  missionControl.task='';
  missionCue('INTERCEPTOR COMMITTED','KEEP NORTH / FIGHT THROUGH');
 }
}

// Do not let the inherited respawn loop silently create a fighter during the quiet ingress.
const v46EnemyBase=updateEnemy;
updateEnemy=function(dt){
 if(worldIndex===0&&!v46.chaos){
  enemyAlive=false;enemy.visible=false;enemyDetected=false;respawn=999999;
  return;
 }
 v46EnemyBase(dt);
};

// SAM batteries physically exist from mission start, but they do not radiate / engage
// until the valley defense network has actually detected EW-01.
const v46SamBase=updateSamNetwork;
updateSamNetwork=function(dt){
 if(worldIndex===0&&!v46.chaos){
  removeSamMissile();
  v41.sam.lock=0;v41.sam.stage=0;v41.sam.site=null;
  return;
 }
 v46SamBase(dt);
};

const v46WorldBase=updateWorld;
updateWorld=function(){
 v46WorldBase();
 updateV46StealthBreak();
};

const v46ResetBase=reset;
reset=function(){
 v46.chaos=false;v46.detectedAt=-1;v46.interceptorDue=-1;v46.firstInterceptorSpawned=false;
 v46ResetBase();
 v46SilenceDefenders();
};

const v46AlpineBase=deployAlpine;
deployAlpine=function(){
 v46.chaos=true;v46.firstInterceptorSpawned=true;
 v46AlpineBase();
};
