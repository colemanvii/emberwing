// Emberwing V55 — Long Throat
// First actual Theater 1 level-design rebuild.
// The opening is now a designed canyon run: curved, constricted, fast, then abruptly
// opens into a defended basin with a real straight-vs-masked route choice.
// Core flight, camera, turbo, weapons, strike, firestorm and later theaters are untouched.

const v55={
 startZ:2850,
 exitZ:900,
 clearClock:0,
 choice:null
};

v44.startZ=v55.startZ;

// Bring the objective basin close enough to read at the throat exit.
// Straight line is shortest and exposed; the west fold is longer and masked.
v42Corridor.radar.set(520,0,-430);
v42Corridor.launch.set(90,0,-1370);

function v55ThroatT(z){
 return THREE.MathUtils.clamp((v55.startZ-z)/(v55.startZ-v55.exitZ),0,1);
}

function v55CenterX(z){
 const t=v55ThroatT(z);
 // Broad S-bends: enough steering to make speed legible, never a twitch course.
 return Math.sin(t*Math.PI*1.08)*115-Math.sin(t*Math.PI*2.1)*68;
}

function v55HalfWidth(z){
 const t=v55ThroatT(z);
 // ~520u wide at insertion, narrowing to ~330u near the exit.
 return THREE.MathUtils.lerp(260,165,Math.pow(t,.82));
}

const v55TerrainBase=terrainHeight;
terrainHeight=function(x,z){
 const base=v55TerrainBase(x,z);
 if(worldIndex!==0||alpineTerrain||tempestTerrain)return base;

 // Authored throat exists from insertion to the basin threshold.
 if(z>=760&&z<=3100){
  const t=v55ThroatT(z);
  const cx=v55CenterX(z);
  const d=Math.abs(x-cx);
  const half=v55HalfWidth(z);

  // Keep the wash readable and relatively smooth while the walls rise hard outside it.
  const floorMask=1-THREE.MathUtils.smoothstep(d,half*.58,half*.95);
  const floorCarve=(38+22*t)*floorMask;

  const wallT=THREE.MathUtils.smoothstep(d,half,half+235);
  const wallHeight=(195+95*t)*Math.pow(wallT,1.18);

  // Cut a clean saddle through V45/V53's old southern rim so the throat itself,
  // not a generic ridge wall, defines the reveal.
  const crest=Math.exp(-Math.pow((z-930)/250,2));
  const saddle=Math.exp(-Math.pow((x-v55CenterX(930))/245,4));
  const crestCut=190*crest*saddle;

  return base-floorCarve+wallHeight-crestCut;
 }

 // Basin composition after the throat: keep a low straight route, plus a western
 // masking fold separated from the radar by one physical ridge.
 if(z<760&&z>-2050){
  const basinGate=(1-THREE.MathUtils.smoothstep(z,520,760))*THREE.MathUtils.smoothstep(z,-2050,-1700);

  const centerFloor=Math.exp(-Math.pow(x/430,4));
  const basinDrop=54*basinGate*centerFloor;

  // West route: longer, lower, terrain-protected.
  const westWash=Math.exp(-Math.pow((x+430)/185,2));
  const westDrop=62*basinGate*westWash;

  // Central spine blocks radar LOS into the west wash but leaves straight route visible.
  const maskSpine=Math.exp(-Math.pow((x+145)/145,2));
  const spineBand=Math.exp(-Math.pow((z+120)/720,2));
  const spine=138*basinGate*maskSpine*spineBand;

  // Broad shoulders keep the target basin framed rather than returning to open desert.
  const westWall=105*basinGate*Math.exp(-Math.pow((x+1050)/330,2));
  const eastWall=105*basinGate*Math.exp(-Math.pow((x-1050)/330,2));

  return base-basinDrop-westDrop+spine+westWall+eastWall;
 }

 return base;
};

// Any procedural prop placed inside the authored throat is pushed into the walls.
// This keeps the first run readable and prevents random rocks from turning it into a minefield.
const v55PlaceBase=place;
place=function(m,initial=false,alpine=false){
 v55PlaceBase(m,initial,alpine);
 if(worldIndex!==0||!m.visible)return;
 const z=m.position.z;
 if(z<760||z>3100)return;

 const cx=v55CenterX(z),half=v55HalfWidth(z);
 const radius=(m.userData.collisionR||10)+46;
 const dx=m.position.x-cx;
 const safe=half+radius;
 if(Math.abs(dx)<safe){
  const side=dx<0?-1:1;
  m.position.x=cx+side*(safe+45);
  m.position.y=terrainHeight(m.position.x,m.position.z)+(m.userData.raise||0);
 }
};

function v55ReseatMission(){
 placeV42Corridor();
 seatStrikeRoute();
 v45.entryPoint.set(v55CenterX(930),terrainHeight(v55CenterX(930),930)+165,930);
 destinations[0].position.copy(v41.launchDestination);

 // Read clearly from the throat exit without becoming toy-scale.
 launchSite.scale.setScalar(1.28);
 rocket.scale.setScalar(1.02);
 for(const site of v41.sam.sites)if(site&&site.group)site.group.scale.setScalar(1.16);
 if(encounter.group&&encounter.kind==='radar')encounter.group.scale.setScalar(1.42);
}

// The throat itself is the opening objective. Do not point through the rock at the launch site.
const v55ObjectiveBase=v42MissionObjective;
v42MissionObjective=function(){
 if(worldIndex===0&&!v53.revealed)return v45.entryPoint;
 return v55ObjectiveBase();
};
const v55LabelBase=v43ObjectiveLabel;
v43ObjectiveLabel=function(){
 if(worldIndex===0&&!v53.revealed)return 'THROAT';
 return v55LabelBase();
};

// Replace generic opening prose with one physical instruction.
const v55DismissBase=dismissMissionBrief;
dismissMissionBrief=function(){
 v55DismissBase();
 if(worldIndex===0){
  missionControl.task='';
  missionCue('FOLLOW THE WASH','STAY IN THE CUT / PUSH NORTH');
 }
};

// Route choice is not a menu. Geometry decides what the player chose.
// Straight/right gets seen quickly; the west wash buys a longer masked run.
const v55StealthBase=updateV46StealthBreak;
updateV46StealthBreak=function(){
 if(worldIndex!==0||missionBriefActive||crashed||missionComplete){v55StealthBase();return;}

 if(!v46.chaos){
  if(ship.position.z>720)return;

  const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);
  const westMasked=ship.position.x<-270&&agl<175;
  const straight=ship.position.x>-210;

  if(v55.choice===null&&ship.position.z<650){
   v55.choice=westMasked?'masked':'direct';
  }

  if(straight&&ship.position.z<520){
   v46BreakStealth('exposed');
  }else if(agl>220&&ship.position.z<610){
   v46BreakStealth('exposed');
  }else if(westMasked&&ship.position.z<-260){
   v46BreakStealth('masked');
  }else if(ship.position.z<-520){
   v46BreakStealth('masked');
  }
  return;
 }

 // Preserve V46's delayed interceptor launch after detection.
 if(!v46.firstInterceptorSpawned&&missionElapsed>=v46.interceptorDue){
  v46.firstInterceptorSpawned=true;
  firstTarget=true;
  spawnEnemy(true);
  missionControl.task='';
  missionCue('INTERCEPTOR COMMITTED','KEEP NORTH / FIGHT THROUGH');
 }
};

// First defender visibly comes from the target basin rather than spawning as an abstract contact.
const v55SpawnBase=spawnEnemy;
spawnEnemy=function(first=false){
 v55SpawnBase(first);
 if(worldIndex!==0||!first||kills!==0)return;

 const side=1;
 const p=new THREE.Vector3(
  v42Corridor.launch.x+side*610,
  0,
  v42Corridor.launch.z+230
 );
 p.y=terrainHeight(p.x,p.z)+235;
 enemy.position.copy(p);

 const aim=ship.position.clone().add(new THREE.Vector3(-80,10,-210));
 const inbound=aim.sub(enemy.position).normalize();
 enemy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),inbound);
 enemyCourse.copy(inbound);
 if(typeof duel!=='undefined'){
  duel.forward.copy(inbound);duel.course.copy(inbound);duel.side=-1;
  duel.close=duel.pursuit=duel.pressure=0;duel.cooldown=0;duel.speed=132;
  duelState('engage');
 }
};

// V53's reveal is still useful, but the new geography should own it.
// One short beat: no locator, then immediate route instruction.
const v55GuidanceBase=updateGuidance;
updateGuidance=function(){
 v55GuidanceBase();
 if(worldIndex!==0||v53.revealAt<0)return;
 const age=missionElapsed-v53.revealAt;
 if(age>=0&&age<1.15&&!seeker){
  targetUI.style.opacity='0';
  if(v42.objectiveBug)v42.objectiveBug.style.opacity='0';
  coachText.textContent='';
  coachSub.textContent='';
 }
};

const v55ResetBase=reset;
reset=function(){
 v55.choice=null;
 v55ResetBase();

 // Late terrain wrapper is authoritative now.
 const cz=Math.round(v55.startZ/620)*620;
 rebuildTerrain(0,cz);
 positionDistantRidges(0,cz);

 // Re-place procedural scenery using the throat-aware placement wrapper.
 for(const m of scenery)place(m,true,false);
 clearSpawnCorridor();

 // Start on the authored wash centerline.
 const sx=v55CenterX(v55.startZ);
 ship.position.set(sx,terrainHeight(sx,v55.startZ)+88,v55.startZ);
 ship.quaternion.identity();
 camera.position.set(sx,ship.position.y+5.3,v55.startZ+12);
 camera.lookAt(ship.position.clone().add(new THREE.Vector3(0,-7,-48)));

 v55ReseatMission();
 v46SilenceDefenders();
};

const v55AlpineBase=deployAlpine;
deployAlpine=function(){
 launchSite.scale.setScalar(1);
 v55AlpineBase();
};
