// Emberwing V54 — Knife Edge
// Make V53's reveal impossible to miss: sharpen the crest, pull the defended basin
// closer to the pilot, frame the target with terrain, and briefly clear the haze when
// the entire installation first comes into view. No new mechanics.

const v54={revealFog:0};

// Compress the dead distance after the crest. The launch vehicle is still deep inside
// the valley, but close enough that the reveal reads as a place rather than a tiny marker.
v42Corridor.radar.set(-210,0,-1260);
v42Corridor.launch.set(-90,0,-2280);

// Sharpen the south ridge into a real knife-edge saddle and frame the basin with two
// broad shoulders. The central route remains flyable and all systems use this same terrain.
const v54TerrainBase=terrainHeight;
terrainHeight=function(x,z){
 const base=v54TerrainBase(x,z);
 if(worldIndex!==0||alpineTerrain||tempestTerrain)return base;

 const crestBand=Math.exp(-Math.pow((z-980)/250,2));
 const saddle=Math.exp(-Math.pow(x/300,4));
 const crestCut=92*crestBand*saddle;

 const basinBand=Math.exp(-Math.pow((z+2150)/1450,2));
 const leftWall=118*basinBand*Math.exp(-Math.pow((x+980)/330,2));
 const rightWall=118*basinBand*Math.exp(-Math.pow((x-980)/330,2));

 return base-crestCut+leftWall+rightWall;
};

function v54Reseat(){
 v45PlaceMissionTerrain();
 seatStrikeRoute();

 // Make the defended object hierarchy read from the ridge.
 launchSite.scale.setScalar(1.34);
 rocket.scale.setScalar(1.08);
 for(const site of v41.sam.sites)if(site&&site.group)site.group.scale.setScalar(1.2);
 if(encounter.group&&encounter.kind==='radar')encounter.group.scale.setScalar(1.5);
}

// V53 already owns the reveal trigger. V54 adds one visual directorial beat:
// the basin haze clears for roughly two seconds, then settles back naturally.
const v54WorldBase=updateWorld;
updateWorld=function(){
 v54WorldBase();

 if(worldIndex===0&&v53.revealAt>=0){
  const age=missionElapsed-v53.revealAt;
  if(age>=0&&age<2.25){
   const inEase=THREE.MathUtils.smoothstep(age,0,.22);
   const outEase=1-THREE.MathUtils.smoothstep(age,1.25,2.25);
   const reveal=inEase*outEase;
   scene.fog.density*=1-reveal*.34;
   v54.revealFog=reveal;
  }else v54.revealFog=0;
 }else v54.revealFog=0;
};

// Step every locator completely out of the way for the money shot, including the
// heading objective bug. The world gets to explain itself before the HUD resumes.
const v54GuidanceBase=updateGuidance;
updateGuidance=function(){
 v54GuidanceBase();
 if(worldIndex!==0||v53.revealAt<0)return;
 const age=missionElapsed-v53.revealAt;
 if(age>=0&&age<1.35&&!seeker){
  targetUI.style.opacity='0';
  if(v42.objectiveBug)v42.objectiveBug.style.opacity='0';
  coachText.textContent='';
  coachSub.textContent='';
 }
};

// The moving patrol should cross the launch complex itself, not some abstract middle distance.
// This makes the reveal read as one defended place.
const v54PatrolBase=updateV52Patrol;
updateV52Patrol=function(){
 if(worldIndex===0&&v53.revealAt>=0&&!v46.chaos){
  const age=missionElapsed-v53.revealAt;
  if(age>=0&&age<4.7){
   const t=THREE.MathUtils.clamp(age/4.7,0,1);
   const x=THREE.MathUtils.lerp(-720,560,t);
   const z=v42Corridor.launch.z+220-Math.sin(t*Math.PI)*120;
   const y=terrainHeight(x,z)+235;
   v52Patrol.position.set(x,y,z);
   v52PatrolMaterial.opacity=.5+.28*Math.pow(Math.max(0,Math.sin(age*5.4)),8);
   v52Patrol.scale.set(20,20,1);
   v52Patrol.visible=true;
   return;
  }
 }
 v54PatrolBase();
};

// Rebuild the streamed ground after the late terrain wrapper, then re-seat every fixed
// strike landmark on the new physical surface. This runs on every restart.
const v54ResetBase=reset;
reset=function(){
 v54ResetBase();
 const cz=Math.round(ship.position.z/620)*620;
 rebuildTerrain(0,cz);
 positionDistantRidges(0,cz);
 v54Reseat();
};

const v54AlpineBase=deployAlpine;
deployAlpine=function(){
 v54.revealFog=0;
 launchSite.scale.setScalar(1);
 v54AlpineBase();
};
