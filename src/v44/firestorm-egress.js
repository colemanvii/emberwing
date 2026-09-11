// Emberwing V44 — Firestorm Egress
// Longer ingress + unmistakable terminal strike. Preserve V43 flight/combat feel.
// A successful run is still one northbound attack: enter far out, fight through,
// kill the radar, kill the launch vehicle, fly away from the burning complex.

const v44={
 startZ:2050,
 fires:[],
 secondaries:[],
 fireAge:0,
 firestorm:false,
 egressWarn:0
};

// Start the sortie substantially farther south. The base world streams terrain,
// so we recenter the ground and scenery around the new insertion point.
function v44StageInsertion(){
 if(worldIndex!==0)return;
 ship.position.set(0,terrainHeight(0,v44.startZ)+78,v44.startZ);
 ship.quaternion.identity();
 rebuildTerrain(0,Math.round(v44.startZ/620)*620);
 positionDistantRidges(0,Math.round(v44.startZ/620)*620);
 for(const m of scenery)place(m,true,false);
 clearSpawnCorridor();
 camera.position.set(0,ship.position.y+5.3,v44.startZ+12);
 camera.lookAt(ship.position.clone().add(new THREE.Vector3(0,-8,-40)));
 // Re-stage the first interceptor relative to the actual insertion point.
 spawnEnemy(true);
 lastEnemy.copy(enemy.position);
 lastRangeWorld=enemy.position.distanceTo(ship.position);
 rangeFeet=displayRangeFeet=lastRangeWorld*FEET_PER_UNIT;closureFps=0;
 missionControl.task='';
 missionCue('PUSH NORTH','TARGET AREA 6 MILES / STAY IN THE TERRAIN');
}

const v44ResetBase=reset;
reset=function(){
 v44ClearFirestorm();
 v44ResetBase();
 v44StageInsertion();
};

// ----- Firestorm finale -----
const v44FireGeo=new THREE.IcosahedronGeometry(1,1);
const v44SmokeGeo=new THREE.IcosahedronGeometry(1,1);

function v44MakeFire(pos,scale=1,intensity=1){
 const flameMat=new THREE.MeshBasicMaterial({
  color:0xff6a24,transparent:true,opacity:.9,
  blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
 });
 const flame=new THREE.Mesh(v44FireGeo,flameMat);
 flame.position.copy(pos);flame.scale.set(5*scale,3.5*scale,5*scale);scene.add(flame);
 const light=new THREE.PointLight(0xff6427,34*intensity,320*scale,1.65);
 light.position.copy(pos).addScaledVector(worldUp,5*scale);scene.add(light);
 const smokeMat=new THREE.MeshBasicMaterial({color:0x17191a,transparent:true,opacity:.42,depthWrite:false,fog:true});
 const smoke=new THREE.Mesh(v44SmokeGeo,smokeMat);
 smoke.position.copy(pos).addScaledVector(worldUp,8*scale);smoke.scale.setScalar(6*scale);scene.add(smoke);
 v44.fires.push({flame,light,smoke,phase:Math.random()*10,scale,intensity});
}

function v44SecondaryBlast(pos,scale=1){
 const mat=new THREE.MeshBasicMaterial({
  color:0xffcf87,transparent:true,opacity:1,
  blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
 });
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),mat);
 mesh.position.copy(pos);scene.add(mesh);
 const light=new THREE.PointLight(0xff8c42,95*scale,650*scale,1.6);
 light.position.copy(pos).addScaledVector(worldUp,8);scene.add(light);
 v44.secondaries.push({mesh,light,life:.7,maxLife:.7,scale});
 flashScreen(.28*scale);hitKick=Math.max(hitKick,.45*scale);
 chirp(58,.14,.045);chirp(190,.08,.025,.035);
}

function v44IgniteComplex(origin){
 v44.firestorm=true;v44.fireAge=0;v44.egressWarn=0;
 // Fire pockets across fuel/service areas and launch cradle.
 const points=[
  [-26,3,-8,1.1], [24,4,6,.95], [-54,3,24,.82],
  [52,4,27,.8], [4,5,-28,1.25], [0,14,5,1.0]
 ];
 for(const [dx,dy,dz,s] of points){
  const p=origin.clone().add(new THREE.Vector3(dx,dy,dz));
  p.y=Math.max(p.y,terrainHeight(p.x,p.z)+2);
  v44MakeFire(p,s,1.0+s*.25);
 }
 // Delayed secondary fuel / ordnance cooks off while the player is already leaving.
 v44.secondaries.push({pending:true,at:.9,pos:origin.clone().add(new THREE.Vector3(-48,5,22)),scale:.8});
 v44.secondaries.push({pending:true,at:2.05,pos:origin.clone().add(new THREE.Vector3(35,10,-12)),scale:1.05});
 v44.secondaries.push({pending:true,at:3.6,pos:origin.clone().add(new THREE.Vector3(4,18,8)),scale:.72});
}

function v44UpdateFirestorm(dt){
 if(!v44.firestorm)return;
 v44.fireAge+=dt;

 // Persistent rolling fire and smoke remain as geographic memory during egress.
 for(const f of v44.fires){
  const pulse=.78+.22*Math.sin(v44.fireAge*8.2+f.phase);
  f.flame.scale.set(5*f.scale*pulse,3.7*f.scale*(.9+pulse*.18),5*f.scale*pulse);
  f.flame.material.opacity=.72+.2*pulse;
  f.light.intensity=34*f.intensity*(.72+.28*pulse);
  f.smoke.position.y+=dt*(1.8+.8*f.scale);
  f.smoke.position.x+=Math.sin(v44.fireAge*.28+f.phase)*dt*.45;
  f.smoke.scale.multiplyScalar(1+dt*.018);
  f.smoke.material.opacity=Math.max(.16,.42-v44.fireAge*.006);
 }

 for(let i=v44.secondaries.length-1;i>=0;i--){
  const s=v44.secondaries[i];
  if(s.pending){
   if(v44.fireAge>=s.at){
    v44SecondaryBlast(s.pos,s.scale);
    v44.secondaries.splice(i,1);
   }
   continue;
  }
  s.life-=dt;const t=1-THREE.MathUtils.clamp(s.life/s.maxLife,0,1);
  s.mesh.scale.setScalar((5+72*Math.pow(t,.62))*s.scale);
  s.mesh.material.opacity=Math.pow(1-t,2.2);
  s.light.intensity=95*s.scale*Math.pow(1-t,1.7);
  if(s.life<=0){
   scene.remove(s.mesh);scene.remove(s.light);s.mesh.geometry.dispose();s.mesh.material.dispose();
   v44.secondaries.splice(i,1);
  }
 }

 // One terse reminder if the pilot lingers to admire the fire.
 if(v41.launch.destroyed&&v44.fireAge>7&&v44.egressWarn===0){
  v44.egressWarn=1;
  missionCue('TARGET DESTROYED','EGRESS NORTH — NOW');
 }
}

// Wrap the final strike after V43's climax so the existing shock/debris remains,
// then layer sustained fuel fire and timed secondary detonations on top.
const v44StrikeBase=groundStrikeImpact;
groundStrikeImpact=function(){
 const finalStrike=worldIndex===0&&encounter.kind==='launch'&&v41.launch.active;
 const origin=finalStrike?encounter.targetPos.clone():null;
 v44StrikeBase();
 if(finalStrike&&v41.launch.destroyed){
  v41.launch.egress=30;
  v44IgniteComplex(origin);
  missionControl.task='';
  missionCue('TARGET DESTROYED','EGRESS NORTH — HIGH PASS / GO');
 }
};

// Do not let a timer cheapen the escape. The preferred transition is physical:
// put more than 1,150 units between EW-01 and the destroyed launch site to the north.
// 30 seconds remains only as a fail-safe if the player gets disoriented.
const v44MissionBase=updateMission;
updateMission=function(dt){
 if(worldIndex===0&&v41.launch.destroyed&&v41.launch.egress>0){
  v41.launch.egress-=dt;
  const northClear=ship.position.z<launchSite.position.z-1150;
  if(northClear||v41.launch.egress<=0){
   citySplit=missionElapsed;missionCompleteTimer=.95;
  }
  return;
 }
 v44MissionBase(dt);
};

const v44AttackBase=updateEnemyAttack;
updateEnemyAttack=function(dt){
 v44AttackBase(dt);
 v44UpdateFirestorm(dt);
};

function v44ClearFirestorm(){
 for(const f of v44.fires){
  scene.remove(f.flame);scene.remove(f.light);scene.remove(f.smoke);
  f.flame.geometry.dispose();f.flame.material.dispose();
  f.smoke.geometry.dispose();f.smoke.material.dispose();
 }
 v44.fires.length=0;
 for(const s of v44.secondaries){
  if(s.pending)continue;
  scene.remove(s.mesh);scene.remove(s.light);
  if(s.mesh){s.mesh.geometry.dispose();s.mesh.material.dispose();}
 }
 v44.secondaries.length=0;v44.firestorm=false;v44.fireAge=0;v44.egressWarn=0;
}

const v44AlpineBase=deployAlpine;
deployAlpine=function(){
 v44ClearFirestorm();
 v44AlpineBase();
};
