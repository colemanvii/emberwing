// Emberwing V43 — Attack Run
// Directorial pass over V42. No player-flight, camera, turbo, cannon or missile handling changes.
// Goal: one authored northbound strike where the valley fights back and every beat points forward.

const v43={
 phase:'ingress',
 egressBanditAt:0,
 egressBanditSpawned:false,
 samTrail:[],
 samTrailClock:0,
 launchFx:[],
 launchFxAge:0,
 launchFxActive:false,
 road:new THREE.Group(),
 vapor:[],
 lastDetected:false
};
scene.add(v43.road);

// ----- World choreography: a real route on the ground, not floating gates. -----
const routeMat=new THREE.MeshStandardMaterial({color:0x514b42,roughness:1,metalness:0});
const routeEdgeMat=new THREE.MeshStandardMaterial({color:0x756a58,roughness:.98,metalness:0});
function makeRouteSegment(x,z,length=250,width=7){
 const y0=terrainHeight(x,z-length*.48),y1=terrainHeight(x,z+length*.48);
 const y=(y0+y1)*.5+.45,slope=Math.atan2(y0-y1,length);
 const body=new THREE.Mesh(new THREE.BoxGeometry(width,.7,length),routeMat);
 body.position.set(x,y,z);body.rotation.x=slope;body.receiveShadow=true;v43.road.add(body);
 if(length>100){
  for(const side of[-1,1]){
   const edge=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,length*.96),routeEdgeMat);
   edge.position.set(x+side*(width*.5+.7),y+.12,z);edge.rotation.x=slope;v43.road.add(edge);
  }
 }
}
function seatStrikeRoute(){
 for(const child of [...v43.road.children])v43.road.remove(child);
 // A sparse service road / utility line quietly pulls the eye north.
 for(let z=-720;z>=-3220;z-=250){
  const t=THREE.MathUtils.clamp((-z-720)/2500,0,1);
  const x=THREE.MathUtils.lerp(15,v42Corridor.launch.x,t)+Math.sin(t*Math.PI*2)*14;
  makeRouteSegment(x,z,225,6.5);
 }
 // Short east-west service spur at the radar site makes it feel installed, not spawned.
 const ry=terrainHeight(v42Corridor.radar.x,v42Corridor.radar.z)+.42;
 const spur=new THREE.Mesh(new THREE.BoxGeometry(150,.65,5.5),routeMat);
 spur.position.set(v42Corridor.radar.x,ry,v42Corridor.radar.z);spur.receiveShadow=true;v43.road.add(spur);
}
seatStrikeRoute();

// Distant launch-site steam gives the final objective a visual signature miles out.
const vaporGeo=new THREE.IcosahedronGeometry(1,1);
const vaporMat=new THREE.MeshBasicMaterial({color:0xd8d2c4,transparent:true,opacity:.12,depthWrite:false,fog:true});
for(let i=0;i<7;i++){
 const m=new THREE.Mesh(vaporGeo,vaporMat.clone());m.frustumCulled=true;scene.add(m);
 v43.vapor.push({mesh:m,phase:i/7,seed:i*2.17});
}
function updateLaunchVapor(){
 const active=worldIndex===0&&!v41.launch.destroyed;
 const t=performance.now()*.001;
 for(const puff of v43.vapor){
  puff.mesh.visible=active;if(!active)continue;
  const phase=(puff.phase+t*.035)%1;
  const sway=Math.sin(t*.24+puff.seed)*5;
  puff.mesh.position.set(launchSite.position.x+8+sway,launchSite.position.y-40+phase*92,launchSite.position.z+4+Math.cos(t*.19+puff.seed)*4);
  const s=4.5+phase*11;puff.mesh.scale.set(s,s*.72,s);
  puff.mesh.material.opacity=.12*(1-phase)*(.7+.3*Math.sin(t*.8+puff.seed));
 }
}

// ----- Interceptors: immediate hostile merges on the mission axis. -----
const v43SpawnBase=spawnEnemy;
spawnEnemy=function(first=false){
 v43SpawnBase(first);
 if(worldIndex!==0)return;

 // Spawn from the defended north, not from whatever direction the player happened
 // to be looking. Each fighter crosses the penetration route on a different side.
 const sidePattern=[-1,1,-1,1],index=Math.min(kills,sidePattern.length-1),side=sidePattern[index];
 const north=new THREE.Vector3(0,0,-1),right=new THREE.Vector3(1,0,0);
 const ahead=first?1380:1240,offset=first?190:285;
 const candidate=ship.position.clone().addScaledVector(north,ahead).addScaledVector(right,side*offset);
 candidate.y=Math.max(ship.position.y+30,terrainHeight(candidate.x,candidate.z)+(enemyRole==='CLIMBER'?105:72));
 if(typeof enemySpawnClear!=='function'||enemySpawnClear(candidate))enemy.position.copy(candidate);

 // Commit through the player's projected route. Start in ENGAGE, not EXTEND.
 const aim=ship.position.clone().addScaledVector(north,155).addScaledVector(right,-side*28);
 const inbound=aim.sub(enemy.position).normalize();
 enemy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),inbound);
 enemyCourse.copy(inbound);
 if(typeof duel!=='undefined'){
  duel.forward.copy(inbound);duel.course.copy(inbound);duel.side=-side;
  duel.close=duel.pursuit=duel.pressure=0;duel.cooldown=0;duel.speed=first?126:132;
  duelState('engage');
 }
 resetEnemyAttack(first?2.6:1.55);
 enemyDetected=false;contactLostTime=0;
 lastEnemy.copy(enemy.position);lastRangeWorld=enemy.position.distanceTo(ship.position);
 rangeFeet=displayRangeFeet=lastRangeWorld*FEET_PER_UNIT;closureFps=0;
};

// Long-range acquisition is operational, not magical: mission control sees the intercept,
 // then the player still has to visually work the merge.
const v43EnemyBase=updateEnemy;
updateEnemy=function(dt){
 const wasDetected=enemyDetected;
 v43EnemyBase(dt);
 if(worldIndex!==0)return;
 if(enemyAlive&&!enemyDetected&&enemy.position.distanceTo(ship.position)<1950){
  enemyDetected=true;contactLostTime=0;
  if(typeof duel!=='undefined'&&duel.state==='engage')duel.age=0;
  radarCarrier(enemy.position);
  announce('INTERCEPTOR COMMITTED — '+v41ClockBearing(enemy.position)+" O'CLOCK");
 }
 if(!wasDetected&&enemyDetected&&enemyAlive){
  missionCue('INTERCEPTOR COMMITTED','FIGHT THROUGH / KEEP NORTH');
 }
 v43.lastDetected=enemyDetected;
};

// ----- SAM launch spectacle: the player should SEE what is trying to kill them. -----
const samTrailGeo=new THREE.IcosahedronGeometry(1,1);
function spawnV43SamSmoke(pos,velocity){
 const mat=new THREE.MeshBasicMaterial({color:0xd9d7ce,transparent:true,opacity:.38,depthWrite:false,fog:true});
 const mesh=new THREE.Mesh(samTrailGeo,mat);mesh.position.copy(pos);mesh.scale.setScalar(1.7+Math.random()*.9);scene.add(mesh);
 const life=3.2+Math.random()*1.15;
 v43.samTrail.push({mesh,life,maxLife:life,v:velocity.clone().multiplyScalar(.012).add(new THREE.Vector3((Math.random()-.5)*.7,.7+Math.random()*.8,(Math.random()-.5)*.7))});
}
function updateV43SamSmoke(dt){
 for(let i=v43.samTrail.length-1;i>=0;i--){
  const p=v43.samTrail[i];p.life-=dt;p.mesh.position.addScaledVector(p.v,dt);
  p.v.multiplyScalar(Math.exp(-dt*.55));p.v.y+=dt*.2;
  const age=1-p.life/p.maxLife,scale=1+age*2.7;p.mesh.scale.multiplyScalar(1+dt*.31);
  p.mesh.material.opacity=.38*Math.pow(Math.max(0,p.life/p.maxLife),1.25);
  if(p.life<=0){scene.remove(p.mesh);p.mesh.material.dispose();v43.samTrail.splice(i,1);}
 }
}
function samLaunchBurst(site){
 const pos=site.position.clone().addScaledVector(worldUp,3);
 const flash=new THREE.PointLight(0xffa05d,58,360,1.8);flash.position.copy(pos);scene.add(flash);
 const core=new THREE.Mesh(new THREE.SphereGeometry(2.5,10,8),new THREE.MeshBasicMaterial({color:0xffb16e,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
 core.position.copy(pos);scene.add(core);
 v43.launchFx.push({kind:'samflash',mesh:core,light:flash,life:.48,maxLife:.48});
 for(let i=0;i<12;i++)spawnV43SamSmoke(pos.clone().add(new THREE.Vector3((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4)),new THREE.Vector3((Math.random()-.5)*5,10+Math.random()*6,(Math.random()-.5)*5));
}
const v43LaunchSamBase=launchSam;
launchSam=function(site){
 samLaunchBurst(site);
 v43LaunchSamBase(site);
};
const v43SamMissileBase=updateSamMissile;
updateSamMissile=function(dt){
 if(v41.sam.missile){
  v43.samTrailClock-=dt;
  if(v43.samTrailClock<=0){spawnV43SamSmoke(v41.sam.missile.mesh.position,v41.sam.missile.v);v43.samTrailClock=.075;}
 }
 v43SamMissileBase(dt);
};

// ----- Final strike climax: one target, one unmistakable result. -----
function spawnLaunchClimax(pos){
 v43.launchFxActive=true;v43.launchFxAge=0;
 const flashMat=new THREE.MeshBasicMaterial({color:0xffe1a8,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const flash=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),flashMat);flash.position.copy(pos);scene.add(flash);
 const light=new THREE.PointLight(0xff8a42,165,1050,1.55);light.position.copy(pos).addScaledVector(worldUp,20);scene.add(light);
 v43.launchFx.push({kind:'primary',mesh:flash,light,life:1.05,maxLife:1.05});

 const ring=new THREE.Mesh(new THREE.RingGeometry(8,10,64),new THREE.MeshBasicMaterial({color:0xffa65b,transparent:true,opacity:.76,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
 ring.rotation.x=-Math.PI/2;ring.position.set(pos.x,terrainHeight(pos.x,pos.z)+2,pos.z);scene.add(ring);
 v43.launchFx.push({kind:'shock',mesh:ring,life:1.35,maxLife:1.35});

 // Heavy gantry fragments — enough to sell destruction without feature soup.
 for(let i=0;i<15;i++){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2+Math.random()*5,.7+Math.random()*2,4+Math.random()*10),new THREE.MeshStandardMaterial({color:i%3?0x24292b:0x4b4039,roughness:.72,metalness:.5}));
  mesh.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*36,7+Math.random()*30,(Math.random()-.5)*32));scene.add(mesh);
  const dir=new THREE.Vector3((Math.random()-.5)*1.1,.42+Math.random()*.95,(Math.random()-.5)*1.1).normalize();
  v43.launchFx.push({kind:'debris',mesh,v:dir.multiplyScalar(28+Math.random()*65),spin:new THREE.Vector3((Math.random()-.5)*7,(Math.random()-.5)*9,(Math.random()-.5)*7),life:3.6+Math.random()*1.8,maxLife:5});
 }
 // Blacken and wound the gantry rather than simply making the whole installation disappear.
 for(let i=0;i<launchSite.children.length;i++){
  const child=launchSite.children[i];
  if(i%5===1)child.rotation.z+=(i%2?1:-1)*(.025+Math.random()*.035);
 }
 hitKick=Math.max(hitKick,1.35);flashScreen(.92);
 chirp(46,.28,.075);chirp(118,.22,.055,.06);chirp(310,.13,.035,.13);
}
function updateLaunchClimax(dt){
 for(let i=v43.launchFx.length-1;i>=0;i--){
  const fx=v43.launchFx[i];fx.life-=dt;const t=1-THREE.MathUtils.clamp(fx.life/fx.maxLife,0,1);
  if(fx.kind==='primary'){
   fx.mesh.scale.setScalar(5+110*Math.pow(t,.58));fx.mesh.material.opacity=Math.pow(1-t,2.1);
   if(fx.light)fx.light.intensity=165*Math.pow(1-t,1.7);
  }else if(fx.kind==='shock'){
   fx.mesh.scale.setScalar(1+18*t);fx.mesh.material.opacity=.74*Math.pow(1-t,1.4);
  }else if(fx.kind==='samflash'){
   fx.mesh.scale.setScalar(1+8*t);fx.mesh.material.opacity=.9*Math.pow(1-t,2);
   if(fx.light)fx.light.intensity=58*Math.pow(1-t,1.8);
  }else if(fx.kind==='debris'){
   fx.v.y-=21*dt;fx.mesh.position.addScaledVector(fx.v,dt);
   fx.mesh.rotation.x+=fx.spin.x*dt;fx.mesh.rotation.y+=fx.spin.y*dt;fx.mesh.rotation.z+=fx.spin.z*dt;
   const floor=terrainHeight(fx.mesh.position.x,fx.mesh.position.z)+.6;
   if(fx.mesh.position.y<floor){fx.mesh.position.y=floor;fx.v.multiplyScalar(.25);fx.v.y=Math.abs(fx.v.y)*.12;fx.spin.multiplyScalar(.35);}
  }
  if(fx.life<=0){
   if(fx.light)scene.remove(fx.light);scene.remove(fx.mesh);
   if(fx.mesh.geometry)fx.mesh.geometry.dispose();if(fx.mesh.material)fx.mesh.material.dispose();
   v43.launchFx.splice(i,1);
  }
 }
}
const v43StrikeBase=groundStrikeImpact;
groundStrikeImpact=function(){
 const finalStrike=worldIndex===0&&encounter.kind==='launch'&&v41.launch.active;
 const pos=finalStrike?encounter.targetPos.clone():null;
 v43StrikeBase();
 if(finalStrike&&v41.launch.destroyed){
  spawnLaunchClimax(pos);
  v43.phase='egress';v43.egressBanditAt=missionElapsed+3.6;v43.egressBanditSpawned=false;
  missionControl.task='';missionCue('LAUNCH DESTROYED','NORTH / HIGH PASS / GO');
 }
};

// A final interceptor chases the egress. It is a threat, not another checklist item.
const v43ExplodeBase=explode;
explode=function(){
 const egressKill=worldIndex===0&&v41.launch.destroyed&&enemyAlive;
 v43ExplodeBase();
 if(egressKill){
  missionCompleteTimer=0;respawn=999999;
  missionControl.task='';missionCue('AIRSPACE OPENING','KEEP NORTH');
 }
};
function updateV43Director(dt){
 hud.classList.toggle('sam-search',worldIndex===0&&v41.sam.stage>0&&!v41.sam.missile);
 hud.classList.toggle('sam-inbound',worldIndex===0&&!!v41.sam.missile);
 hud.classList.toggle('strike-egress',worldIndex===0&&v41.launch.destroyed);
 if(worldIndex!==0||missionBriefActive||crashed)return;
 if(v41.launch.destroyed&&!v43.egressBanditSpawned&&missionElapsed>=v43.egressBanditAt){
  if(!enemyAlive&&(!v41.sam.missile||missionElapsed-v43.egressBanditAt>2.4)){
   v43.egressBanditSpawned=true;spawnEnemy(false);
   missionCue('FAST MOVER — DEFENSIVE','DO NOT TURN BACK / KEEP NORTH');
  }
 }
 if(v41.launch.destroyed)v43.phase='egress';
 else if(v41.launch.active)v43.phase='strike';
 else if(v41.radarDestroyed)v43.phase='push';
 else if(encounter.kind==='radar'&&encounter.phase==='active')v43.phase='radar';
 else if(enemyAlive&&enemyDetected)v43.phase='intercept';
 else v43.phase='ingress';
}

// ----- Better cockpit meaning: heading bug names the actual next job. -----
function v43ObjectiveLabel(){
 if(worldIndex!==0)return 'OBJ';
 if(v41.launch.destroyed)return 'EGRESS';
 if(v41.launch.active)return 'LAUNCH';
 if(!v41.radarDestroyed&&encounter.kind==='radar'&&encounter.phase==='active')return 'RADAR';
 return 'NORTH';
}
const v43HeadingBase=updateHeadingTape;
updateHeadingTape=function(){
 v43HeadingBase();
 if(missionBriefActive||crashed||missionComplete)return;
 const objective=v42MissionObjective();
 if(objective)v42PlaceBearingBug(v42.objectiveBug,v42BearingDeg(objective),v42HeadingDeg(),v43ObjectiveLabel());
};

// Update visual direction and directorial effects once per tactical frame.
const v43AttackBase=updateEnemyAttack;
updateEnemyAttack=function(dt){
 v43AttackBase(dt);
 updateV43SamSmoke(dt);updateLaunchClimax(dt);updateV43Director(dt);
};
const v43WorldBase=updateWorld;
updateWorld=function(){
 v43WorldBase();
 v43.road.visible=worldIndex===0;updateLaunchVapor();
};

// ----- Lifecycle / cleanup -----
function clearV43Transient(){
 for(const p of v43.samTrail){scene.remove(p.mesh);p.mesh.material.dispose();}v43.samTrail.length=0;
 for(const fx of v43.launchFx){if(fx.light)scene.remove(fx.light);scene.remove(fx.mesh);if(fx.mesh.geometry)fx.mesh.geometry.dispose();if(fx.mesh.material)fx.mesh.material.dispose();}v43.launchFx.length=0;
 v43.launchFxActive=false;v43.egressBanditAt=0;v43.egressBanditSpawned=false;v43.phase='ingress';v43.samTrailClock=0;
}
const v43ResetBase=reset;
reset=function(){
 clearV43Transient();v43ResetBase();seatStrikeRoute();
 for(const child of launchSite.children)child.rotation.z=0;
};
const v43AlpineBase=deployAlpine;
deployAlpine=function(){
 clearV43Transient();v43.road.visible=false;
 for(const puff of v43.vapor)puff.mesh.visible=false;
 v43AlpineBase();
};
