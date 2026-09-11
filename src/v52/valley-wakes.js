const v52={nextSweep:0,hadSearch:false,hadLOS:false,wakeAt:-1,patrolSeen:false};

const v52PatrolMaterial=new THREE.SpriteMaterial({map:glintTexture,transparent:true,opacity:0,depthWrite:false,depthTest:true,fog:true});
const v52Patrol=new THREE.Sprite(v52PatrolMaterial);
v52Patrol.scale.set(13,13,1);
v52Patrol.visible=false;
scene.add(v52Patrol);

function v52SearchLOS(){
 const sx=v42Corridor.radar.x,sz=v42Corridor.radar.z;
 const a=new THREE.Vector3(sx,terrainHeight(sx,sz)+72,sz);
 const b=ship.position;
 for(let i=1;i<12;i++){
  const t=i/12;
  const x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t),y=THREE.MathUtils.lerp(a.y,b.y,t);
  if(terrainHeight(x,z)+14>y)return false;
 }
 return true;
}

function updateV52Search(){
 if(worldIndex!==0||missionBriefActive||crashed||missionComplete||v46.chaos)return;
 if(missionElapsed<9||ship.position.z>2250)return;
 const los=v52SearchLOS();
 if(los&&(!v52.hadLOS||missionElapsed>=v52.nextSweep)){
  v52.hadSearch=true;v52.hadLOS=true;
  v52.nextSweep=missionElapsed+THREE.MathUtils.lerp(3.8,2.45,THREE.MathUtils.clamp((1700-ship.position.z)/1900,0,1));
  const sensor=new THREE.Vector3(v42Corridor.radar.x,terrainHeight(v42Corridor.radar.x,v42Corridor.radar.z)+72,v42Corridor.radar.z);
  radarCarrier(sensor);chirp(398,.045,.014);chirp(474,.038,.011,.105);
 }else if(!los&&v52.hadLOS){
  stopRadarCarrier();v52.hadLOS=false;v52.nextSweep=missionElapsed+.7;
 }
}

function updateV52Patrol(){
 if(worldIndex!==0||missionBriefActive||crashed||missionComplete||v46.chaos){v52Patrol.visible=false;return;}
 if(missionElapsed<16||missionElapsed>31||ship.position.z>1750){v52Patrol.visible=false;return;}
 const t=THREE.MathUtils.clamp((missionElapsed-16)/15,0,1);
 const x=THREE.MathUtils.lerp(-390,410,t),z=-780-Math.sin(t*Math.PI)*90,y=terrainHeight(x,z)+255+Math.sin(t*Math.PI)*24;
 v52Patrol.position.set(x,y,z);
 const pulse=.22+.78*Math.pow(Math.max(0,Math.sin(missionElapsed*4.7)),10);
 v52PatrolMaterial.opacity=.12+pulse*.52;
 const s=12+3*Math.sin(t*Math.PI);v52Patrol.scale.set(s,s,1);v52Patrol.visible=true;
 if(!v52.patrolSeen&&t>.18)v52.patrolSeen=true;
}

const v52VaporBase=updateLaunchVapor;
updateLaunchVapor=function(){
 v52VaporBase();
 if(worldIndex!==0||v41.launch.destroyed)return;
 const approach=THREE.MathUtils.clamp((2200-ship.position.z)/3600,0,1);
 const wake=v52.wakeAt>=0?Math.exp(-Math.max(0,missionElapsed-v52.wakeAt)/2.1):0;
 for(const puff of v43.vapor){
  if(!puff.mesh.visible)continue;
  const factor=1.45+approach*.75+wake*1.1;
  puff.mesh.material.opacity=Math.min(.32,puff.mesh.material.opacity*factor);
  puff.mesh.scale.multiplyScalar(1+approach*.035+wake*.08);
 }
};

const v52BreakBase=v46BreakStealth;
v46BreakStealth=function(reason){
 if(v46.chaos||worldIndex!==0)return;
 v52BreakBase(reason);
 v52.wakeAt=missionElapsed;v52Patrol.visible=false;
 for(const site of v41.sam.sites)if(site.light){site.light.visible=true;site.light.scale.setScalar(2.25);}
 missionControl.task='';
 missionCue('THEY HAVE A TRACK','KEEP LOW / PRESS NORTH');
 announce('VALLEY ALERT');
 chirp(470,.05,.025);chirp(690,.065,.026,.08);chirp(910,.075,.021,.17);
};

function updateV52Wake(){
 if(v52.wakeAt<0||worldIndex!==0)return;
 const age=missionElapsed-v52.wakeAt;
 if(age<0||age>2.4)return;
 const s=1+1.25*Math.exp(-age*1.9);
 for(const site of v41.sam.sites)if(site.light)site.light.scale.setScalar(s);
}

const v52WorldBase=updateWorld;
updateWorld=function(){v52WorldBase();updateV52Search();updateV52Patrol();updateV52Wake();};

const v52ResetBase=reset;
reset=function(){
 Object.assign(v52,{nextSweep:0,hadSearch:false,hadLOS:false,wakeAt:-1,patrolSeen:false});
 v52Patrol.visible=false;v52PatrolMaterial.opacity=0;
 v52ResetBase();
 v49.sweepDone=true;
};

const v52AlpineBase=deployAlpine;
deployAlpine=function(){v52Patrol.visible=false;v52.hadLOS=false;v52.wakeAt=-1;v52AlpineBase();};
