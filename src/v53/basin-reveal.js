// Emberwing V53 — Basin Reveal
// Recompose the opening scene, not its polish.
// The southern ridge now hides a deeper defended basin; crossing the crest reveals the
// launch complex and defense layout at once, then the pilot must dive into the terrain.

const v53={
 revealed:false,
 revealAt:-1,
 dropCue:false
};

// The existing V45 valley remains authoritative for collision, radar LOS and AI.
// V53 changes the composition: a deeper basin north of the crest, stronger approach
// shoulders, and two low terrain folds that give the pilot somewhere to disappear.
const v53TerrainBase=terrainHeight;
terrainHeight=function(x,z){
 const base=v53TerrainBase(x,z);
 if(worldIndex!==0||alpineTerrain||tempestTerrain)return base;

 // Deep defended basin: no change on the south face; the floor drops hard after crest
 // and stays low until the northern wall. Every fixed mission object is re-seated onto it.
 const northGate=1-THREE.MathUtils.smoothstep(z,520,820);
 const southOfExit=THREE.MathUtils.smoothstep(z,-4320,-3880);
 const basinX=Math.exp(-Math.pow(x/1450,4));
 const basinDrop=112*northGate*southOfExit*basinX;

 // Tighten the final approach visually without creating a checkpoint gate.
 const approachBand=Math.exp(-Math.pow((z-1480)/620,2));
 const westShoulder=82*approachBand*Math.exp(-Math.pow((x+520)/270,2));
 const eastShoulder=82*approachBand*Math.exp(-Math.pow((x-520)/270,2));

 // Once over the crest, two low longitudinal folds create an immediate masking route.
 const foldNorth=1-THREE.MathUtils.smoothstep(z,560,780);
 const foldSouth=THREE.MathUtils.smoothstep(z,-1450,-1030);
 const foldGate=foldNorth*foldSouth;
 const westFold=78*foldGate*Math.exp(-Math.pow((x+410)/185,2));
 const eastFold=78*foldGate*Math.exp(-Math.pow((x-410)/185,2));

 return base-basinDrop+westShoulder+eastShoulder+westFold+eastFold;
};

function v53SeatBasin(){
 // The target should read as a major industrial object in the reveal, not a tiny prop.
 launchSite.scale.setScalar(1.22);
 rocket.scale.setScalar(1.0);
 for(const site of v41.sam.sites)if(site&&site.group)site.group.scale.setScalar(1.12);
 if(encounter.group&&encounter.kind==='radar')encounter.group.scale.setScalar(1.42);
}

// Replace V45's early crest cue so the launch objective does not reveal itself on the HUD
// before the geography does. The physical money shot happens near z=930.
const v53ValleyDirectorBase=updateV45ValleyDirector;
updateV45ValleyDirector=function(){
 if(worldIndex!==0){v53ValleyDirectorBase();return;}
 if(missionBriefActive||crashed)return;

 const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);

 if(!v53.revealed&&ship.position.z<930){
  v53.revealed=true;
  v53.revealAt=missionElapsed;
  v45.entered=true;
  missionControl.task='';
  missionControl.until=missionElapsed+.9;
  missionControl.line='';
  missionControl.sub='';
 }

 // Give the image a beat before telling the pilot what to do.
 if(v53.revealed&&!v53.dropCue&&missionElapsed-v53.revealAt>1.15){
  v53.dropCue=true;
  missionControl.task='';
  missionCue('DROP INTO THE BASIN','USE THE TERRAIN / KEEP NORTH');
 }

 if(v53.revealed&&!v45.dropped){
  if(ship.position.z<610&&agl<150){
   v45.dropped=true;
   missionControl.task='';
   missionCue('MASKED IN THE FOLDS','PUSH THE TARGET');
  }else if(ship.position.z<570&&agl>215&&missionElapsed-v45.lastHighCue>5){
   v45.lastHighCue=missionElapsed;
   missionCue('YOU ARE EXPOSED','GET BELOW THE RIDGELINES');
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
};

// Keep the ENTRY objective until the aircraft physically reaches the crest.
// This prevents an omniscient launch-complex diamond from spoiling the reveal.
const v53ObjectiveBase=v42MissionObjective;
v42MissionObjective=function(){
 if(worldIndex===0&&!v53.revealed)return v45.entryPoint;
 return v53ObjectiveBase();
};
const v53LabelBase=v43ObjectiveLabel;
v43ObjectiveLabel=function(){
 if(worldIndex===0&&!v53.revealed)return 'ENTRY';
 return v53LabelBase();
};

// During the reveal beat, remove the floating target diamond for a moment.
// The world itself is the information.
const v53GuidanceBase=updateGuidance;
updateGuidance=function(){
 v53GuidanceBase();
 if(worldIndex!==0||v53.revealAt<0)return;
 const age=missionElapsed-v53.revealAt;
 if(age>=0&&age<1.05&&!seeker){
  targetUI.style.opacity='0';
  coachText.textContent='';
  coachSub.textContent='';
 }
};

// Make the existing distant patrol cross the defended basin during the reveal rather
// than relying only on mission-clock timing. It remains non-interactive.
const v53PatrolBase=updateV52Patrol;
updateV52Patrol=function(){
 if(worldIndex===0&&v53.revealAt>=0&&!v46.chaos){
  const age=missionElapsed-v53.revealAt;
  if(age>=0&&age<5.2){
   const t=THREE.MathUtils.clamp(age/5.2,0,1);
   const x=THREE.MathUtils.lerp(-620,470,t);
   const z=-2050-Math.sin(t*Math.PI)*130;
   const y=terrainHeight(x,z)+250;
   v52Patrol.position.set(x,y,z);
   v52PatrolMaterial.opacity=.42+.34*Math.pow(Math.max(0,Math.sin(age*5.1)),8);
   v52Patrol.scale.set(18,18,1);
   v52Patrol.visible=true;
   return;
  }
 }
 v53PatrolBase();
};

const v53ResetBase=reset;
reset=function(){
 Object.assign(v53,{revealed:false,revealAt:-1,dropCue:false});
 v53ResetBase();

 // The late terrain wrapper is now authoritative; rebuild once so rendered ground,
 // collision and radar masking all agree from frame one.
 const cz=Math.round(ship.position.z/620)*620;
 rebuildTerrain(0,cz);
 positionDistantRidges(0,cz);
 v45PlaceMissionTerrain();
 v53SeatBasin();
};

const v53AlpineBase=deployAlpine;
deployAlpine=function(){
 v53.revealed=true;v53.revealAt=-1;v53.dropCue=false;
 launchSite.scale.setScalar(1);
 v53AlpineBase();
};
