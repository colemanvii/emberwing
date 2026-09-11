// Emberwing V57 — The Price of Visibility
// Make the fork explain its own trade before commitment.
// Right: clear view of the defended basin, but clear sensor geometry.
// Left: target disappears behind a real spine until the late emergence.

const v57={choice:null};

function v57WindowT(z){
 return THREE.MathUtils.clamp((900-z)/1850,0,1);
}
function v57RightLineX(z){
 const t=v57WindowT(z);
 return THREE.MathUtils.lerp(v56RightX(820),v42Corridor.launch.x,t);
}

const v57TerrainBase=terrainHeight;
terrainHeight=function(x,z){
 const base=v57TerrainBase(x,z);
 if(worldIndex!==0||alpineTerrain||tempestTerrain)return base;

 // Make the center an unmistakable no-route.
 const forkBand=Math.exp(-Math.pow((z-560)/620,4));
 const centerWall=118*forkBand*Math.exp(-Math.pow((x+20)/345,4));

 // Right corridor: preserve a clean visual channel from the fork to the basin.
 // This is a sightline carve, not a gameplay bonus.
 let rightCarve=0;
 if(z<900&&z>-1100){
  const cx=v57RightLineX(z);
  const d=Math.abs(x-cx);
  const gate=(1-THREE.MathUtils.smoothstep(z,720,900))*THREE.MathUtils.smoothstep(z,-1100,-930);
  rightCarve=86*gate*(1-THREE.MathUtils.smoothstep(d,125,330));
 }

 // Left corridor: deepen the wash and extend a real occluding spine between it
 // and the launch complex. The target should vanish almost immediately on commit.
 const leftGate=(1-THREE.MathUtils.smoothstep(z,820,1040))*THREE.MathUtils.smoothstep(z,-650,-480);
 const lx=v56LeftX(z);
 const leftWash=44*leftGate*(1-THREE.MathUtils.smoothstep(Math.abs(x-lx),80,230));
 const blindSpine=205*leftGate
  *Math.exp(-Math.pow((x+120)/210,4))
  *Math.exp(-Math.pow((z-80)/780,4));

 return base+centerWall-rightCarve-leftWash+blindSpine;
};

function v57MoveSite(site,x,z){
 if(!site)return;
 const y=terrainHeight(x,z);
 site.group.position.set(x,y+.1,z);
 site.position.set(x,y+10,z);
 site.group.scale.setScalar(1.22);
}

function v57SeatThreats(){
 // Put existing threat objects where the right-hand deal can be read before commitment.
 v42Corridor.radar.set(520,0,-430);
 v42Corridor.launch.set(80,0,-1280);
 placeV42Corridor();
 seatStrikeRoute();
 destinations[0].position.copy(v41.launchDestination);

 if(encounter.group&&encounter.kind==='radar'){
  const y=terrainHeight(v42Corridor.radar.x,v42Corridor.radar.z);
  encounter.group.position.set(v42Corridor.radar.x,y+.15,v42Corridor.radar.z);
  encounter.targetPos.set(v42Corridor.radar.x,y+9,v42Corridor.radar.z);
  encounter.group.scale.setScalar(1.52);
 }
 v57MoveSite(v41.sam.sites[0],-650,-760);
 v57MoveSite(v41.sam.sites[1],610,-720);
 v57MoveSite(v41.sam.sites[2],180,-1680);

 launchSite.scale.setScalar(1.34);
 rocket.scale.setScalar(1.08);
}

// Geometry should determine detection timing.
// On the right, a real clear sensor line starts the escalation early.
// On the left, the spine keeps the picture broken until the late emergence.
const v57StealthBase=updateV46StealthBreak;
updateV46StealthBreak=function(){
 if(worldIndex!==0||missionBriefActive||crashed||missionComplete){v57StealthBase();return;}

 if(!v46.chaos){
  if(ship.position.z>1040)return;

  if(v56.choice===null&&ship.position.z<900){
   if(ship.position.x<-185)v56.choice='left';
   else if(ship.position.x>150)v56.choice='right';
  }
  v57.choice=v56.choice;

  const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);
  if(v56.choice==='right'){
   if((ship.position.z<650&&v52SearchLOS())||agl>235)v46BreakStealth('exposed');
  }else if(v56.choice==='left'){
   if(agl>205&&ship.position.z<500)v46BreakStealth('exposed');
   else if(ship.position.z<-690)v46BreakStealth('masked');
  }else if(ship.position.z<420){
   v46BreakStealth('exposed');
  }
  return;
 }

 if(!v46.firstInterceptorSpawned&&missionElapsed>=v46.interceptorDue){
  v46.firstInterceptorSpawned=true;firstTarget=true;spawnEnemy(true);
  missionControl.task='';missionCue('INTERCEPTOR COMMITTED','KEEP NORTH / FIGHT THROUGH');
 }
};

// Keep the open route readable, not hopeless.
const v57BreakBase=v46BreakStealth;
v46BreakStealth=function(reason){
 if(v46.chaos||worldIndex!==0)return;
 v57BreakBase(reason);
 if(v56.choice==='right'){
  v46.interceptorDue=Math.max(v46.interceptorDue,missionElapsed+6.4);
  v41.sam.cooldown=Math.max(v41.sam.cooldown,9.2);
 }
};

// At the decision itself, step the coaching back. The physical view is the lesson.
const v57GuideBase=updateGuidance;
updateGuidance=function(){
 v57GuideBase();
 if(worldIndex!==0)return;
 if(v56.choice===null&&ship.position.z<1250&&ship.position.z>860&&!seeker){
  coachText.textContent='';
  coachSub.textContent='';
  targetUI.style.opacity='0';
  if(v42.objectiveBug)v42.objectiveBug.style.opacity='0';
 }
};

const v57ResetBase=reset;
reset=function(){
 v57.choice=null;
 v57ResetBase();

 const cz=Math.round(v55.startZ/620)*620;
 rebuildTerrain(0,cz);positionDistantRidges(0,cz);
 for(const m of scenery)place(m,true,false);
 clearSpawnCorridor();

 const sx=v55CenterX(v55.startZ);
 ship.position.set(sx,terrainHeight(sx,v55.startZ)+88,v55.startZ);
 ship.quaternion.identity();
 camera.position.set(sx,ship.position.y+5.3,v55.startZ+12);
 camera.lookAt(ship.position.clone().add(new THREE.Vector3(0,-7,-48)));

 v57SeatThreats();
 v46SilenceDefenders();
};

const v57AlpineBase=deployAlpine;
deployAlpine=function(){
 launchSite.scale.setScalar(1);
 v57AlpineBase();
};
