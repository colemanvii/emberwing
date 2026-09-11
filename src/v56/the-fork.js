const v56={choice:null};
function v56Gate(z){return (1-THREE.MathUtils.smoothstep(z,1180,1480))*THREE.MathUtils.smoothstep(z,-720,-420);}
function v56LeftX(z){const t=THREE.MathUtils.clamp((1120-z)/1750,0,1);return THREE.MathUtils.lerp(-360,-585,THREE.MathUtils.smoothstep(t,0,.28))+THREE.MathUtils.lerp(0,430,THREE.MathUtils.smoothstep(t,.48,1));}
function v56RightX(z){const t=THREE.MathUtils.clamp((1120-z)/1750,0,1);return THREE.MathUtils.lerp(300,430,THREE.MathUtils.smoothstep(t,0,.3))-THREE.MathUtils.lerp(0,330,THREE.MathUtils.smoothstep(t,.52,1));}
const v56TerrainBase=terrainHeight;
terrainHeight=function(x,z){
 const base=v56TerrainBase(x,z);
 if(worldIndex!==0||alpineTerrain||tempestTerrain)return base;
 const g=v56Gate(z);if(g<=.001)return base;
 const massif=315*g*Math.exp(-Math.pow((z-560)/610,4))*Math.exp(-Math.pow((x+35)/300,4));
 const lx=v56LeftX(z),rx=v56RightX(z),ld=Math.abs(x-lx),rd=Math.abs(x-rx);
 const leftCut=360*g*(1-THREE.MathUtils.smoothstep(ld,105,235));
 const rightCut=305*g*(1-THREE.MathUtils.smoothstep(rd,125,255));
 const leftFloor=68*g*(1-THREE.MathUtils.smoothstep(ld,0,165));
 const rightLift=38*g*Math.exp(-Math.pow((x-rx)/210,2))*Math.exp(-Math.pow((z-430)/620,2));
 return base+massif-leftCut-rightCut-leftFloor+rightLift;
};
v42Corridor.radar.set(500,0,-360);
v42Corridor.launch.set(80,0,-1280);
const v56ObjBase=v42MissionObjective;
v42MissionObjective=function(){if(worldIndex===0&&!v53.revealed)return v45.entryPoint;return v56ObjBase();};
const v56LabelBase=v43ObjectiveLabel;
v43ObjectiveLabel=function(){if(worldIndex===0&&!v53.revealed)return 'FORK';return v56LabelBase();};

const v56PlaceBase=place;
place=function(m,initial=false,alpine=false){
 v56PlaceBase(m,initial,alpine);
 if(worldIndex!==0||!m.visible)return;
 const z=m.position.z;if(z<-720||z>1480)return;
 const rr=(m.userData.collisionR||9)+42;
 const dl=Math.abs(m.position.x-v56LeftX(z)),dr=Math.abs(m.position.x-v56RightX(z));
 if(dl<150+rr||dr<165+rr){
  const side=m.position.x<0?-1:1;
  m.position.x=side*(1080+rr);
  m.position.y=terrainHeight(m.position.x,z)+(m.userData.raise||0);
 }
};
function v56Reseat(){
 placeV42Corridor();seatStrikeRoute();
 destinations[0].position.copy(v41.launchDestination);
 v45.entryPoint.set(v55CenterX(1120),terrainHeight(v55CenterX(1120),1120)+150,1120);
 launchSite.scale.setScalar(1.3);rocket.scale.setScalar(1.04);
 for(const site of v41.sam.sites)if(site&&site.group)site.group.scale.setScalar(1.18);
 if(encounter.group&&encounter.kind==='radar')encounter.group.scale.setScalar(1.45);
}
const v56StealthBase=updateV46StealthBreak;
updateV46StealthBreak=function(){
 if(worldIndex!==0||missionBriefActive||crashed||missionComplete){v56StealthBase();return;}
 if(!v46.chaos){
  if(ship.position.z>1040)return;
  if(v56.choice===null&&ship.position.z<900){
   if(ship.position.x<-185)v56.choice='left';
   else if(ship.position.x>150)v56.choice='right';
  }
  const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);
  if(v56.choice==='right'){
   if(agl>235&&ship.position.z<650)v46BreakStealth('exposed');
   else if(ship.position.z<170)v46BreakStealth('exposed');
  }else if(v56.choice==='left'){
   if(agl>205&&ship.position.z<520)v46BreakStealth('exposed');
   else if(ship.position.z<-610)v46BreakStealth('masked');
  }else if(ship.position.z<420)v46BreakStealth('exposed');
  return;
 }
 if(!v46.firstInterceptorSpawned&&missionElapsed>=v46.interceptorDue){
  v46.firstInterceptorSpawned=true;firstTarget=true;spawnEnemy(true);
  missionControl.task='';missionCue('INTERCEPTOR COMMITTED','KEEP NORTH / FIGHT THROUGH');
 }
};

const v56ValleyBase=updateV45ValleyDirector;
updateV45ValleyDirector=function(){
 if(worldIndex!==0){v56ValleyBase();return;}
 if(missionBriefActive||crashed)return;
 const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);

 if(!v53.revealed){
  const rightReveal=ship.position.z<760&&ship.position.x>150;
  const leftReveal=ship.position.z<-380&&ship.position.x<-180;
  if(rightReveal||leftReveal){
   v53.revealed=true;v53.revealAt=missionElapsed;v45.entered=true;missionControl.task='';
  }
 }
 if(v53.revealed&&!v53.dropCue&&missionElapsed-v53.revealAt>1){
  v53.dropCue=true;missionControl.task='';
  if(v56.choice==='left')missionCue('STAY IN THE WASH','TARGET WILL REAPPEAR AHEAD');
  else missionCue('BASIN OPEN','PRESS OR BREAK LEFT FOR COVER');
 }
 if(v53.revealed&&!v45.dropped){
  if(agl<155&&ship.position.z<560)v45.dropped=true;
  else if(agl>225&&ship.position.z<500&&missionElapsed-v45.lastHighCue>5){
   v45.lastHighCue=missionElapsed;missionCue('YOU ARE EXPOSED','TERRAIN IS YOUR COVER');
  }
 }
 if(v41.launch.destroyed){
  if(!v45.northCue){v45.northCue=true;missionControl.task='';missionCue('TARGET BURNING','CLIMB NORTH / HIGH PASS');}
  if(!v45.clearCue&&ship.position.z<-4140){v45.clearCue=true;missionControl.task='';missionCue('HIGH PASS AHEAD','TAKE THE GAP / KEEP GOING');}
 }
};

const v56BreakBase=v46BreakStealth;
v46BreakStealth=function(reason){
 if(v46.chaos||worldIndex!==0)return;
 v56BreakBase(reason);
 if(v56.choice==='right'){
  v46.interceptorDue=Math.max(v46.interceptorDue,missionElapsed+6);
  v41.sam.cooldown=Math.max(v41.sam.cooldown,8.6);
 }
};

const v56GuideBase=updateGuidance;
updateGuidance=function(){
 v56GuideBase();
 if(worldIndex!==0)return;
 if(!v53.revealed&&ship.position.z<1320&&ship.position.z>820&&!seeker){
  coachText.textContent='THE WASH DIVIDES';
  coachSub.textContent='READ THE TERRAIN';
 }
 if(v53.revealAt>=0){
  const age=missionElapsed-v53.revealAt;
  if(age>=0&&age<1.05&&!seeker){
   targetUI.style.opacity='0';
   if(v42.objectiveBug)v42.objectiveBug.style.opacity='0';
  }
 }
};

const v56ResetBase=reset;
reset=function(){
 v56.choice=null;
 v56ResetBase();
 const cz=Math.round(v55.startZ/620)*620;
 rebuildTerrain(0,cz);positionDistantRidges(0,cz);
 for(const m of scenery)place(m,true,false);
 clearSpawnCorridor();
 const sx=v55CenterX(v55.startZ);
 ship.position.set(sx,terrainHeight(sx,v55.startZ)+88,v55.startZ);
 ship.quaternion.identity();
 camera.position.set(sx,ship.position.y+5.3,v55.startZ+12);
 camera.lookAt(ship.position.clone().add(new THREE.Vector3(0,-7,-48)));
 v56Reseat();v46SilenceDefenders();
};

const v56AlpineBase=deployAlpine;
deployAlpine=function(){launchSite.scale.setScalar(1);v56AlpineBase();};
