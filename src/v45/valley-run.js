// Emberwing V45 — Valley In / Valley Out
// The Desert mission now has a physical shape: cross a southern rim, descend into
// the defended valley, strike through it, then climb out through the northern high pass.
// Flight controls, camera, turbo/audio and weapon handling are untouched.

const v45={
 entered:false,
 dropped:false,
 northCue:false,
 clearCue:false,
 lastHighCue:-99,
 entryPoint:new THREE.Vector3(0,0,980),
 passPoint:new THREE.Vector3(180,0,-4620)
};

// V45 briefing matches the physical mission the player is about to fly.
if(typeof missionBrief!=='undefined'&&missionBrief){
 const title=missionBrief.querySelector('.briefTitle');
 const orders=missionBrief.querySelector('.briefOrders');
 if(title)title.textContent='VALLEY STRIKE';
 if(orders)orders.innerHTML=[
  'CROSS THE SOUTH RIDGELINE',
  'DROP INTO THE VALLEY — STAY LOW',
  'FIGHT THROUGH THE INTERCEPTORS',
  'DESTROY THE RADAR',
  'DESTROY THE LAUNCH VEHICLE',
  'CLIMB OUT NORTH THROUGH HIGH PASS'
 ].map(line=>'<span>'+line+'</span>').join('');
}

// Extend the V44 insertion. The target is now genuinely far away, with a ridgeline
// between EW-01 and the defended valley.
v44.startZ=2850;
v42Corridor.egress.set(v45.passPoint.x,0,v45.passPoint.z);

// Author the valley into the physical terrain itself. Because every existing
// collision, radar LOS and enemy terrain-avoidance system reads terrainHeight(),
// these rims are real geometry rather than scenery painted around the mission.
const v45TerrainBase=terrainHeight;
terrainHeight=function(x,z){
 const base=v45TerrainBase(x,z);
 if(worldIndex!==0||alpineTerrain||tempestTerrain)return base;

 // Southern escarpment: broad enough to read from the insertion point, steep on
 // the north face so crossing it creates an unmistakable "drop in" moment.
 const southBand=Math.exp(-Math.pow((z-980)/330,2));
 const southCrown=.9+.1*Math.sin(x*.0027+z*.0009);
 const southRim=265*southBand*southCrown;

 // Northern wall: higher and more severe, with one natural high-pass notch.
 // The notch is not a glowing gate; it is simply the lowest safe way out.
 const northBand=Math.exp(-Math.pow((z+4620)/390,2));
 const passNotch=Math.exp(-Math.pow((x-v45.passPoint.x)/285,2));
 const northTexture=.92+.08*Math.sin(x*.0031-z*.0014);
 const northRim=345*northBand*(1-.73*passNotch)*northTexture;

 return base+southRim+northRim;
};

function v45PlaceMissionTerrain(){
 // Re-seat fixed mission geography after the terrain function changes.
 placeV42Corridor();
 v45.entryPoint.y=terrainHeight(v45.entryPoint.x,v45.entryPoint.z)+190;
 v45.passPoint.y=terrainHeight(v45.passPoint.x,v45.passPoint.z)+118;
 v42Corridor.egress.copy(v45.passPoint);
 v41EgressPoint.copy(v45.passPoint);
 destinations[0].position.copy(v41.launchDestination);
}
v45PlaceMissionTerrain();

// The compass should first point at the ridge entry, then resume the strike chain,
// then point at the actual escape pass after the target burns.
const v45ObjectiveBase=v42MissionObjective;
v42MissionObjective=function(){
 if(worldIndex===0&&!v45.entered)return v45.entryPoint;
 if(worldIndex===0&&v41.launch.destroyed)return v45.passPoint;
 return v45ObjectiveBase();
};
const v45ObjectiveLabelBase=v43ObjectiveLabel;
v43ObjectiveLabel=function(){
 if(worldIndex===0&&!v45.entered)return 'ENTRY';
 if(worldIndex===0&&v41.launch.destroyed)return 'PASS';
 return v45ObjectiveLabelBase();
};

// Opening direction: the pilot should understand the geography before the first fight.
const v45DismissBase=dismissMissionBrief;
dismissMissionBrief=function(){
 v45DismissBase();
 if(worldIndex===0){
  missionControl.task='';
  missionCue('RIDGELINE AHEAD','CROSS THE CREST / DROP INTO THE VALLEY');
 }
};

function updateV45ValleyDirector(){
 if(worldIndex!==0||missionBriefActive||crashed)return;
 const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);

 if(!v45.entered&&ship.position.z<1120){
  v45.entered=true;
  missionControl.task='';
  missionCue('RIDGE CREST','DROP IN / STAY BELOW THE RIDGELINES');
 }

 if(v45.entered&&!v45.dropped){
  if(ship.position.z<720&&agl<145){
   v45.dropped=true;
   missionControl.task='';
   missionCue('VALLEY MASK ACQUIRED','PUSH NORTH');
  }else if(ship.position.z<620&&agl>210&&missionElapsed-v45.lastHighCue>5){
   v45.lastHighCue=missionElapsed;
   missionCue('YOU ARE EXPOSED','GET DOWN INTO THE VALLEY');
  }
 }

 if(v41.launch.destroyed){
  if(!v45.northCue){
   v45.northCue=true;
   missionControl.task='';
   missionCue('TARGET BURNING','CLIMB NORTH / HIGH PASS');
  }
  if(!v45.clearCue&&ship.position.z<-4140){
   v45.clearCue=true;
   missionControl.task='';
   missionCue('HIGH PASS AHEAD','TAKE THE GAP / KEEP GOING');
  }
 }
}

const v45WorldBase=updateWorld;
updateWorld=function(){
 v45WorldBase();
 updateV45ValleyDirector();
};

// V44 had a timed egress fallback. V45 removes it: the player actually has to
// climb out of the valley and cross the northern rim before the theater ends.
const v45MissionBase=updateMission;
updateMission=function(dt){
 if(worldIndex===0&&v41.launch.destroyed){
  v41.launch.egress=Math.max(0,v41.launch.egress-dt);
  const outsideNorth=ship.position.z<-5150;
  if(outsideNorth){
   citySplit=missionElapsed;
   missionCompleteTimer=.95;
  }
  return;
 }
 v45MissionBase(dt);
};

// Reset after V44 so the new terrain is already authoritative when the distant
// insertion, SAM sites, radar and first interceptor are staged.
const v45ResetBase=reset;
reset=function(){
 v45.entered=false;v45.dropped=false;v45.northCue=false;v45.clearCue=false;v45.lastHighCue=-99;
 v45PlaceMissionTerrain();
 v45ResetBase();
 // V44's reset rebuilt around the insertion. Recompute the authored terrain mesh
 // once more so the visible ground exactly matches the collision/radar surface.
 const cz=Math.round(ship.position.z/620)*620;
 rebuildTerrain(0,cz);positionDistantRidges(0,cz);
 v45PlaceMissionTerrain();
};

const v45AlpineBase=deployAlpine;
deployAlpine=function(){
 v45.entered=v45.dropped=v45.northCue=v45.clearCue=false;
 v45AlpineBase();
};
