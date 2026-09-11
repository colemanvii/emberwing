// Emberwing V41 — Strike Mission
// A focused Desert-theater mission pass. Preserve the V40 flight model, camera,
// player weapons, turbo behavior/audio, terrain and later theaters.
//
// Thesis: EW-01 is the intruder. Defenders come to the player. Terrain matters.
// The mission now has a physical chain: ingress -> intercept -> radar -> CAP ->
// launch vehicle -> egress.

const v41={
 radarDestroyed:false,
 launch:{active:false,destroyed:false,age:0,egress:0,proxy:null,smoke:[]},
 sam:{sites:[],missile:null,lock:0,stage:0,cooldown:4.8,site:null,lastCue:-99},
 launchName:destinations[0].name,
 launchDestination:destinations[0].position.clone()
};
const v41EgressPoint=new THREE.Vector3(360,0,-4700);

// ----- Briefing: plain English, one dangerous job. -----
if(typeof missionBrief!=='undefined'&&missionBrief){
 const alert=missionBrief.querySelector('.briefAlert');
 if(alert)alert.textContent='A HOSTILE LAUNCH COMPLEX IS PREPARING TO FIRE.';
 const orders=[...missionBrief.querySelectorAll('.briefOrders span')];
 const copy=[
  'ENTER THE VALLEY — STAY LOW',
  'SURVIVE THE INTERCEPTORS',
  'DESTROY THE RADAR',
  'DESTROY THE LAUNCH VEHICLE',
  'ESCAPE NORTH THROUGH HIGH PASS'
 ];
 for(let i=0;i<Math.min(orders.length,copy.length);i++)orders[i].textContent=copy[i];
}
const v41DismissBriefBase=dismissMissionBrief;
dismissMissionBrief=function(){
 v41DismissBriefBase();
 if(worldIndex===0)missionCue('HOSTILE AIRSPACE','STAY LOW / EXPECT INTERCEPTORS');
};

// ----- Bandits: they are defending the complex, not waiting to be hunted. -----
const glintCanvas=document.createElement('canvas');glintCanvas.width=64;glintCanvas.height=64;
const glintCtx=glintCanvas.getContext('2d');
const glintGrad=glintCtx.createRadialGradient(32,32,0,32,32,30);
glintGrad.addColorStop(0,'rgba(255,248,222,1)');
glintGrad.addColorStop(.12,'rgba(255,235,188,.8)');
glintGrad.addColorStop(.42,'rgba(255,224,166,.16)');
glintGrad.addColorStop(1,'rgba(255,224,166,0)');
glintCtx.fillStyle=glintGrad;glintCtx.fillRect(0,0,64,64);
const glintTexture=new THREE.CanvasTexture(glintCanvas);glintTexture.colorSpace=THREE.SRGBColorSpace;
const glintMaterial=new THREE.SpriteMaterial({map:glintTexture,transparent:true,opacity:0,depthWrite:false,depthTest:true,fog:true});
const banditGlint=new THREE.Sprite(glintMaterial);banditGlint.scale.set(8.5,8.5,1);banditGlint.visible=false;enemy.add(banditGlint);

function v41ClockBearing(pos){
 const local=pos.clone().sub(ship.position).applyQuaternion(ship.quaternion.clone().invert());
 return ((Math.round(Math.atan2(local.x,-local.z)*6/Math.PI)+12)%12)||12;
}
const v41SpawnEnemyBase=spawnEnemy;
spawnEnemy=function(first=false){
 v41SpawnEnemyBase(first);
 if(worldIndex!==0)return;
 // Turn the spawn into an intercept. Aim through the player's future position
 // instead of flying away on the same heading.
 const predicted=ship.position.clone().addScaledVector(heading(),120+speed*.55);
 const inbound=predicted.sub(enemy.position).normalize();
 enemyCourse.copy(inbound);
 enemy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),inbound);
 resetEnemyAttack(firstTarget?2.0:1.15);
 enemyDetected=false;contactLostTime=0;
};
function updateBanditGlint(){
 if(worldIndex!==0||!enemyAlive||!enemyDetected){banditGlint.visible=false;return;}
 const range=enemy.position.distanceTo(ship.position);
 if(range<420||range>1950){banditGlint.visible=false;return;}
 const phase=Math.sin(performance.now()*.0067+enemyTime*1.9);
 const flash=Math.pow(Math.max(0,phase),18);
 glintMaterial.opacity=.08+flash*.72;
 banditGlint.visible=true;
 const s=7.2+THREE.MathUtils.clamp((range-420)/1500,0,1)*3.4;
 banditGlint.scale.set(s,s,1);
}
const v41EnemyBase=updateEnemy;
updateEnemy=function(dt){
 if(worldIndex===0&&enemyAlive&&!encounterBlocked()){
  const range=enemy.position.distanceTo(ship.position);
  if(!enemyDetected&&range<=1850){
   enemyDetected=true;contactLostTime=0;
   if(typeof duel!=='undefined'&&duel.state==='engage')duel.age=0;
   radarCarrier(enemy.position);
   announce('INTERCEPTOR INBOUND — '+v41ClockBearing(enemy.position)+" O'CLOCK");
  }
  // Preserve breaks and merges, but keep ordinary ingress pressure pointed at EW-01.
  if(range>340&&enemyCounter<=0){
   const intercept=ship.position.clone().addScaledVector(heading(),75).sub(enemy.position).normalize();
   enemyCourse.lerp(intercept,1-Math.exp(-dt*.26)).normalize();
  }
 }
 v41EnemyBase(dt);
 updateBanditGlint();
};

// ----- Physical SAM batteries. Visible from the beginning; terrain can mask them. -----
const samConcrete=new THREE.MeshStandardMaterial({color:0x4a4943,roughness:.96,metalness:.05});
const samSteel=new THREE.MeshStandardMaterial({color:0x333b3d,roughness:.58,metalness:.58});
const samDark=new THREE.MeshStandardMaterial({color:0x171d20,roughness:.72,metalness:.42});
const samLightMat=new THREE.MeshBasicMaterial({color:0xff7b3c});
function makeSamSite(dx,dz,index){
 const g=new THREE.Group(),pad=new THREE.Mesh(new THREE.CylinderGeometry(16,19,1.7,12),samConcrete);
 pad.position.y=.85;g.add(pad);
 const bunker=new THREE.Mesh(new THREE.BoxGeometry(19,5.5,12),samDark);bunker.position.set(-7,3.5,4);g.add(bunker);
 const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(3.3,4.5,4,10),samSteel);pedestal.position.set(6,2.4,-3);g.add(pedestal);
 const rack=new THREE.Group();rack.position.set(6,6,-3);rack.rotation.x=-.16;g.add(rack);
 for(const x of[-3.2,-1.05,1.05,3.2]){
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(.52,.62,9.5,8),samSteel);
  tube.rotation.x=Math.PI/2;tube.position.set(x,0,-1.2);rack.add(tube);
 }
 const mast=new THREE.Mesh(new THREE.CylinderGeometry(.3,.48,16,7),samSteel);mast.position.set(-10,8,-4);g.add(mast);
 const light=new THREE.Mesh(new THREE.SphereGeometry(.7,8,6),samLightMat.clone());light.position.set(-10,16.4,-4);g.add(light);
 const x=launchSite.position.x+dx,z=launchSite.position.z+dz,y=terrainHeight(x,z);
 g.position.set(x,y+.1,z);g.rotation.y=index*.72-.34;scene.add(g);
 return{group:g,position:new THREE.Vector3(x,y+10,z),disabled:false,light,index};
}
function disposeOwnTree(root){
 if(!root)return;
 root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Object.values({samConcrete,samSteel,samDark,samLightMat}).includes(o.material)){try{o.material.dispose()}catch{}}});
 scene.remove(root);
}
function removeSamMissile(){
 const h=v41.sam.missile;if(!h)return;
 h.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)try{o.material.dispose()}catch{}});
 scene.remove(h.mesh);v41.sam.missile=null;
}
function clearSamNetwork(){
 removeSamMissile();
 for(const s of v41.sam.sites){
  s.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!([samConcrete,samSteel,samDark].includes(o.material)))try{o.material.dispose()}catch{}});
  scene.remove(s.group);
 }
 v41.sam.sites.length=0;v41.sam.lock=0;v41.sam.stage=0;v41.sam.site=null;
}
function setupSamNetwork(){
 clearSamNetwork();
 const specs=[[-560,510],[540,190],[120,-520]];
 v41.sam.sites=specs.map((p,i)=>makeSamSite(p[0],p[1],i));
 v41.sam.cooldown=4.8;v41.sam.lock=0;v41.sam.stage=0;v41.sam.site=null;v41.sam.lastCue=-99;
}
function samLineClear(site){
 const a=site.position,b=ship.position;
 for(let i=1;i<=9;i++){
  const t=i/10,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t),y=THREE.MathUtils.lerp(a.y,b.y,t);
  if(terrainHeight(x,z)+18>y)return false;
 }
 return true;
}
function samCandidate(){
 const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);
 if(agl<58)return null;
 let best=null,bestRange=Infinity;
 for(const s of v41.sam.sites){
  if(s.disabled)continue;
  const range=s.position.distanceTo(ship.position);
  const maxRange=v41.radarDestroyed?1550:1900;
  if(range>maxRange||!samLineClear(s))continue;
  if(range<bestRange){bestRange=range;best={site:s,range,agl};}
 }
 return best;
}
function launchSam(site){
 const m=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.19,.26,3.2,8),new THREE.MeshStandardMaterial({color:0xc9c5b6,metalness:.38,roughness:.44}));
 body.rotation.x=Math.PI/2;m.add(body);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(.25,.75,8),new THREE.MeshBasicMaterial({color:0xff633a}));
 nose.rotation.x=-Math.PI/2;nose.position.z=-1.95;m.add(nose);
 const flame=new THREE.Mesh(new THREE.ConeGeometry(.23,2.1,8),new THREE.MeshBasicMaterial({color:0xff6b31,transparent:true,opacity:.94,blending:THREE.AdditiveBlending,depthWrite:false}));
 flame.rotation.x=-Math.PI/2;flame.position.z=2.45;m.add(flame);
 const start=site.position.clone().addScaledVector(worldUp,4);
 const initial=ship.position.clone().addScaledVector(worldUp,125).sub(start).normalize();
 m.position.copy(start);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),initial);scene.add(m);
 v41.sam.missile={mesh:m,v:initial.multiplyScalar(196),life:7.2,trail:0,warn:0,near:false};
 v41.sam.lock=0;v41.sam.stage=0;v41.sam.site=null;v41.sam.cooldown=v41.radarDestroyed?9.5:7.3;
 announce('SAM LAUNCH — '+v41ClockBearing(start)+" O'CLOCK");
 flashScreen(.1);chirp(1060,.07,.045);chirp(1450,.11,.04,.07);
}
function updateSamMissile(dt){
 const h=v41.sam.missile;if(!h)return;
 h.life-=dt;h.trail-=dt;h.warn-=dt;
 if(h.warn<=0){chirp(960,.04,.024);h.warn=.43;}
 if(h.trail<=0){spawnMissileTrail(h.mesh.position,h.v);h.trail=.04;}
 const previous=h.mesh.position.clone();
 const up=worldUp.clone().applyQuaternion(ship.quaternion),bank=Math.abs(Math.atan2(up.x,up.y));
 const defensive=THREE.MathUtils.clamp((bank-.45)/.55,0,1)*((keys.ArrowUp||keys.ArrowDown)?1:.35)*(burner>.45?1:.72);
 const lead=ship.position.clone().addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion),speed*.11);
 const desired=lead.sub(h.mesh.position).normalize().multiplyScalar(v41.radarDestroyed?214:226);
 const turnRate=(v41.radarDestroyed?1.45:1.9)*(1-defensive*.42);
 h.v.lerp(desired,1-Math.exp(-dt*turnRate));
 h.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),h.v.clone().normalize());
 h.mesh.position.addScaledVector(h.v,dt);
 const travel=h.mesh.position.clone().sub(previous),toShip=ship.position.clone().sub(previous);
 const u=THREE.MathUtils.clamp(toShip.dot(travel)/Math.max(.001,travel.lengthSq()),0,1),closest=previous.clone().addScaledVector(travel,u);
 const hit=closest.distanceToSquared(ship.position)<64;
 if(!h.near&&!hit&&closest.distanceToSquared(ship.position)<420){h.near=true;hostileNearMiss();}
 const blocked=h.mesh.position.y<=terrainHeight(h.mesh.position.x,h.mesh.position.z)+4;
 if(hit){
  const p=h.mesh.position.clone();removeSamMissile();hostileMissileBurst(p);hitKick=Math.max(hitKick,1);flashScreen(.3);chirp(58,.15,.06);hitPlayer();return;
 }
 if(blocked||h.life<=0){
  const p=h.mesh.position.clone();removeSamMissile();hostileMissileBurst(p);
  announce(blocked?'SAM DEFEATED — TERRAIN MASK':'SAM EVADED');chirp(430,.06,.032);chirp(690,.075,.024,.05);
 }
}
function updateSamNetwork(dt){
 if(missionBriefActive||worldIndex!==0||crashed||missionComplete||missionCompleteTimer>0){removeSamMissile();return;}
 v41.sam.cooldown=Math.max(0,v41.sam.cooldown-dt);
 if(v41.sam.missile){updateSamMissile(dt);return;}
 const c=samCandidate();
 if(!c||v41.sam.cooldown>0){
  if(v41.sam.stage&&v41.sam.lock>.28&&missionElapsed-v41.sam.lastCue>1.2){announce('SAM TRACK BROKEN');v41.sam.lastCue=missionElapsed;}
  v41.sam.lock=Math.max(0,v41.sam.lock-dt*1.7);if(v41.sam.lock<=.02){v41.sam.stage=0;v41.sam.site=null;}return;
 }
 v41.sam.site=c.site;
 const lowFactor=THREE.MathUtils.clamp((c.agl-62)/48,.3,1);
 const lockTime=v41.radarDestroyed?4.2:2.35;
 v41.sam.lock=Math.min(1,v41.sam.lock+dt/lockTime*lowFactor);
 if(v41.sam.stage===0){
  v41.sam.stage=1;announce('SAM SEARCH — STAY LOW');chirp(520,.045,.026);v41.sam.lastCue=missionElapsed;
 }else if(v41.sam.lock>.52&&v41.sam.stage===1){
  v41.sam.stage=2;announce('SAM TRACK — GET LOW / USE TERRAIN');chirp(690,.05,.03);chirp(910,.05,.026,.1);v41.sam.lastCue=missionElapsed;
 }
 if(v41.sam.lock>=1)launchSam(c.site);
}
function degradeSamNetwork(){
 v41.radarDestroyed=true;
 if(v41.sam.sites[0]){v41.sam.sites[0].disabled=true;v41.sam.sites[0].light.visible=false;v41.sam.sites[0].group.rotation.z=.055;}
 v41.sam.lock=0;v41.sam.stage=0;v41.sam.cooldown=Math.max(v41.sam.cooldown,2.8);
 announce('RADAR DOWN — SAM NETWORK DEGRADED');
}

// Add SAM logic after the existing hostile-aircraft threat update.
const v41AttackBase=updateEnemyAttack;
updateEnemyAttack=function(dt){
 v41AttackBase(dt);
 if(!missionBriefActive)updateSamNetwork(dt);
};

// Radar is mandatory and geographically persistent. Losing the run-in does not
// cause the installation to vanish or magically count as complete.
const v41FinishRadarBase=finishRadarOpportunity;
finishRadarOpportunity=function(status){
 const kind=encounter.kind;
 if(kind==='radar'&&status!=='destroyed'){
  stopRadarCarrier();clearSurfaceShot();
  encounter.phase='active';encounter.age=0;encounter.timer=0;encounter.callout=true;encounter.runCue=false;
  encounter.tracking=false;encounter.paint=0;encounter.launchWarned=false;encounter.shotFired=false;respawn=999;
  missionCue('RADAR STILL ACTIVE','RETURN TO STRIKE');
  return;
 }
 v41FinishRadarBase(status);
 if(kind==='radar'&&status==='destroyed')degradeSamNetwork();
};

// ----- Final strike: the thing the brief promised is now a thing the player does. -----
function activateLaunchStrike(){
 if(worldIndex!==0||v41.launch.active||v41.launch.destroyed)return;
 v41.launch.active=true;v41.launch.age=0;v41.launch.egress=0;respawn=999999;
 encounter.kind='launch';encounter.phase='active';encounter.age=0;encounter.timer=0;encounter.callout=true;encounter.runCue=true;
 encounter.tracking=false;encounter.paint=0;encounter.launchWarned=false;encounter.shotFired=false;
 const proxy=new THREE.Group();proxy.visible=true;scene.add(proxy);v41.launch.proxy=proxy;encounter.group=proxy;
 encounter.targetPos.copy(rocket.position);encounter.lastRange=ship.position.distanceTo(encounter.targetPos);
 missionControl.task='';missionCue('LAUNCH SEQUENCE ACTIVE','DESTROY THE LAUNCH VEHICLE');
 announce('LAUNCH VEHICLE EXPOSED');
 chirp(620,.06,.032);chirp(820,.09,.027,.08);
}
const v41EncounterBase=updateEncounter;
updateEncounter=function(dt){
 if(encounter.kind==='launch'&&v41.launch.active&&!v41.launch.destroyed){
  v41.launch.age+=dt;
  encounter.age+=dt;encounter.targetPos.copy(rocket.position);encounter.lastRange=ship.position.distanceTo(encounter.targetPos);
  return;
 }
 // V41 SAM batteries own the surface-missile threat. Keep the radar as sensor /
 // strike objective without also spawning the old prototype surface shot.
 if(encounter.kind==='radar'&&encounter.phase==='active')encounter.shotFired=true;
 v41EncounterBase(dt);
};
const v41ExplodeBase=explode;
explode=function(){
 const beforeWorld=worldIndex;
 v41ExplodeBase();
 if(beforeWorld===0&&kills>=MISSION_KILLS&&!v41.launch.destroyed){
  missionCompleteTimer=0;citySplit=0;respawn=999999;
  if(v41.radarDestroyed)activateLaunchStrike();
  else missionCue('RADAR STILL ACTIVE','KNOCK IT OUT BEFORE THE LAUNCH');
 }
};
const v41TargetingBase=updateTargeting;
updateTargeting=function(dt){
 v41TargetingBase(dt);
 if(worldIndex!==0||!v41.launch.active||enemyAlive)return;
 const ft=Math.round(encounter.targetPos.distanceTo(ship.position)*FEET_PER_UNIT/10)*10;
 if(!seeker){coachText.textContent='HOLD X — DESIGNATE LAUNCH VEHICLE';coachSub.textContent='STOP THE LAUNCH · '+ft+' FT';}
 else if(lockState===2){coachText.textContent='LAUNCH VEHICLE LOCK';coachSub.textContent=ft+' FT · RELEASE X — FIRE';}
 else if(lockState===1){coachText.textContent='DESIGNATOR TRACKING';coachSub.textContent='KEEP LAUNCH VEHICLE IN RING · '+ft+' FT';}
};
const v41GuidanceBase=updateGuidance;
updateGuidance=function(){
 v41GuidanceBase();
 if(worldIndex===0&&v41.launch.active&&!enemyAlive){
  targetUI.dataset.owner='launch';
  targetUI.dataset.range='LAUNCH VEHICLE · '+Math.round(encounter.targetPos.distanceTo(ship.position)*FEET_PER_UNIT/10)*10+' FT';
  targetUI.style.opacity=seeker?'.9':'.68';
 }
};
function addLaunchSmoke(pos){
 const mat=new THREE.MeshBasicMaterial({color:0x292b2a,transparent:true,opacity:.34,depthWrite:false,fog:true});
 for(let i=0;i<11;i++){
  const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mat.clone());
  mesh.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*13,8+i*8,(Math.random()-.5)*13));
  mesh.scale.setScalar(5+i*.72);scene.add(mesh);
  v41.launch.smoke.push({mesh,phase:Math.random()*10,baseY:mesh.position.y});
 }
}
const v41GroundStrikeBase=groundStrikeImpact;
groundStrikeImpact=function(){
 const launchHit=encounter.kind==='launch'&&v41.launch.active;
 if(!launchHit){v41GroundStrikeBase();return;}
 const impact=encounter.targetPos.clone();
 v41GroundStrikeBase();
 v41.launch.active=false;v41.launch.destroyed=true;v41.launch.egress=14;rocket.visible=false;rocketFlame.visible=false;
 destinations[0].name='HIGH PASS EGRESS';
 v41EgressPoint.y=terrainHeight(v41EgressPoint.x,v41EgressPoint.z)+115;destinations[0].position.copy(v41EgressPoint);
 addLaunchSmoke(impact);
 v41.sam.cooldown=Math.min(v41.sam.cooldown,1.4);v41.sam.lock=0;v41.sam.stage=0;
 missionControl.task='';missionCue('LAUNCH ABORTED','EGRESS NORTH — HIGH PASS');
 announce('LAUNCH ABORTED');
};

// Hold the launch vehicle on the pad until the final attack window; then begin
// a slow launch sequence so delay has visible consequence without a cheap timer.
const v41SpectacleBase=updateV34Spectacle;
updateV34Spectacle=function(){
 v41SpectacleBase();
 if(worldIndex===0&&!v41.launch.destroyed){
  rocket.visible=true;rocket.position.x=launchSite.position.x;rocket.position.z=launchSite.position.z;
  const padY=launchSite.position.y-58;
  const rise=v41.launch.active?Math.max(0,v41.launch.age-12)*1.25:0;
  rocket.position.y=padY+rise;
  rocketFlame.visible=v41.launch.active&&v41.launch.age>7;
  if(rocketFlame.visible)rocketFlame.scale.y=.72+.16*Math.sin(performance.now()*.035);
 }else if(v41.launch.destroyed){rocket.visible=false;rocketFlame.visible=false;}
 const t=performance.now()*.001;
 for(const s of v41.launch.smoke){
  s.mesh.position.y=s.baseY+Math.sin(t*.45+s.phase)*3;
  s.mesh.position.x+=Math.sin(t*.18+s.phase)*.008;
  const pulse=.88+.12*Math.sin(t*.7+s.phase);s.mesh.scale.multiplyScalar(1+(pulse-1)*.002);
 }
};

// Egress remains playable. No frozen victory card until EW-01 has had a few
// seconds to run north under the surviving autonomous SAM threat.
const v41MissionBase=updateMission;
updateMission=function(dt){
 if(worldIndex===0&&v41.launch.destroyed&&v41.launch.egress>0){
  v41.launch.egress-=dt;
  const northClear=ship.position.z<launchSite.position.z-650;
  if(northClear||v41.launch.egress<=0){citySplit=missionElapsed;missionCompleteTimer=.95;}
  return;
 }
 v41MissionBase(dt);
};

// ----- Lifecycle -----
function clearLaunchSmoke(){
 for(const s of v41.launch.smoke){scene.remove(s.mesh);s.mesh.geometry.dispose();s.mesh.material.dispose();}
 v41.launch.smoke.length=0;
}
function restoreLaunchDestination(){destinations[0].name=v41.launchName;destinations[0].position.copy(v41.launchDestination);}
const v41ResetBase=reset;
reset=function(){
 clearSamNetwork();clearLaunchSmoke();
 if(v41.launch.proxy){scene.remove(v41.launch.proxy);v41.launch.proxy=null;}
 restoreLaunchDestination();
 v41.radarDestroyed=false;v41.launch.active=false;v41.launch.destroyed=false;v41.launch.age=0;v41.launch.egress=0;
 v41ResetBase();
 setupSamNetwork();
};
const v41AlpineBase=deployAlpine;
deployAlpine=function(){
 clearSamNetwork();clearLaunchSmoke();banditGlint.visible=false;
 if(v41.launch.proxy){scene.remove(v41.launch.proxy);v41.launch.proxy=null;}
 restoreLaunchDestination();
 v41AlpineBase();
};
