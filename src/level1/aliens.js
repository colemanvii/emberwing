
// Alien encounter: isolated from the canonical bandit and SAM mission.
// All enemies are original geometric designs; Space fires the cannon.
const alienTargets=[];
let alienKills=0,alienBossSpawned=false,alienShotClock=0;
const alienDark=new THREE.MeshStandardMaterial({color:0x151b23,metalness:.77,roughness:.32});
const alienBlack=new THREE.MeshStandardMaterial({color:0x090b10,metalness:.42,roughness:.62});
const alienEye=new THREE.MeshBasicMaterial({color:0xff3d26});
const alienGreen=new THREE.MeshBasicMaterial({color:0x9aff79});
const alienHUD=document.createElement('div');
alienHUD.style.cssText='position:fixed;top:72px;right:22px;z-index:9;pointer-events:none;color:#f3dbc0;font:12px monospace;letter-spacing:2px;text-align:right;text-shadow:0 2px 7px #17101c';
alienHUD.textContent='ALIENS 0 / 3';document.body.appendChild(alienHUD);
function alienPart(group,geometry,material,x=0,y=0,z=0){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;
}
function alienCreate(boss=false){
 const g=new THREE.Group();
 if(!boss){
  alienPart(g,new THREE.SphereGeometry(6,12,8),alienDark);
  const disc=alienPart(g,new THREE.CylinderGeometry(12,12,2.2,16),alienDark,0,-1,0);
  disc.rotation.z=.08;
  alienPart(g,new THREE.SphereGeometry(2.1,8,6),alienGreen,-3,1,-5);
  alienPart(g,new THREE.SphereGeometry(2.1,8,6),alienGreen,3,1,-5);
  for(const x of[-9,9])alienPart(g,new THREE.ConeGeometry(2,5,6),alienDark,x,-4,0).rotation.z=Math.PI;
 }else{
  // Towering black-armored space tyrant: helmet, cape, red visor, chest reactor.
  alienPart(g,new THREE.ConeGeometry(24,57,4),alienBlack,0,-13,12).rotation.y=Math.PI/4;
  alienPart(g,new THREE.BoxGeometry(25,32,16),alienDark,0,13,0);
  alienPart(g,new THREE.SphereGeometry(15,12,8),alienBlack,0,37,0);
  alienPart(g,new THREE.BoxGeometry(26,4,6),alienEye,0,39,-12);
  alienPart(g,new THREE.ConeGeometry(15,19,4),alienBlack,0,28,-7).rotation.x=Math.PI;
  alienPart(g,new THREE.BoxGeometry(8,8,2),alienEye,0,15,-9);
  for(const x of[-19,19]){
   alienPart(g,new THREE.BoxGeometry(10,32,10),alienDark,x,11,0);
   alienPart(g,new THREE.BoxGeometry(11,20,11),alienBlack,x/2,-13,0);
  }
  const cape=alienPart(g,new THREE.ConeGeometry(27,63,4),alienBlack,0,-3,14);
  cape.rotation.y=Math.PI/4;cape.scale.z=.45;
 }
 scene.add(g);return g;
}
function alienRemoveAll(){
 for(const a of alienTargets){scene.remove(a.mesh);a.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
 alienTargets.length=0;alienKills=0;alienBossSpawned=false;alienShotClock=0;
 alienHUD.textContent='ALIENS 0 / 3';
}
function alienSpawn(boss=false,index=0){
 const g=alienCreate(boss),f=heading().clone().normalize(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize();
 const distance=boss?460:210+index*74,side=boss?0:[-38,45,-22][index];
 g.position.copy(ship.position).addScaledVector(f,distance).addScaledVector(r,side);
 g.position.y=Math.max(ship.position.y+(boss?24:8),terrainHeight(g.position.x,g.position.z)+(boss?100:70));
 g.rotation.y=Math.atan2(-f.x,-f.z);
 const a={mesh:g,boss,hp:boss?7:2,origin:g.position.clone(),time:index*1.7,alive:true};
 alienTargets.push(a);if(boss){alienBossSpawned=true;announce('BLACK TITAN INBOUND');}
}
function alienUpdate(dt){
 if(crashed||missionComplete||mission.phase!=='flight')return;
 alienShotClock=Math.max(0,alienShotClock-dt);
 for(const a of alienTargets){
  if(!a.alive)continue;
  a.time+=dt;
  a.mesh.position.y=a.origin.y+Math.sin(a.time*(a.boss?.65:1.6))*(a.boss?5:8);
  a.mesh.rotation.z=Math.sin(a.time*.8)*(a.boss?.035:.13);
 }
 if(!keys.Space||alienShotClock>0)return;
 alienShotClock=.12;
 // Require an enemy in the nose cone, with limited aim assist for child-friendly combat.
 const forward=heading().clone().normalize();
 let chosen=null,best=Infinity;
 for(const a of alienTargets){
  if(!a.alive)continue;
  const to=a.mesh.position.clone().sub(ship.position),range=to.length();
  if(range>800||range<15)continue;
  const angle=forward.angleTo(to.normalize());
  const cone=a.boss?.16:.115;
  if(angle<cone&&angle<best){chosen=a;best=angle;}
 }
 if(!chosen)return;
 chosen.hp--;
 chirp(chosen.boss?130:550,.09,.045);
 flashScreen(.065);confirmHit(chosen.hp<=0);
 chosen.mesh.scale.multiplyScalar(chosen.hp>0?.975:1);
 if(chosen.hp>0){announce(chosen.boss?'TITAN HIT':'ALIEN HIT');return;}
 chosen.alive=false;scene.remove(chosen.mesh);
 spawnKillDebris(chosen.mesh.position.clone(),new THREE.Vector3());
 if(chosen.boss){alienHUD.textContent='BLACK TITAN DESTROYED';announce('BLACK TITAN DESTROYED');}
 else{alienKills++;alienHUD.textContent='ALIENS '+alienKills+' / 3';announce('ALIEN DESTROYED');
  if(alienKills===3&&!alienBossSpawned)alienSpawn(true);
 }
}
const alienUpdateWeaponsBase=updateWeapons;
updateWeapons=function(dt){alienUpdateWeaponsBase(dt);alienUpdate(dt);};
const alienResetBase=reset;
reset=function(){alienRemoveAll();alienResetBase();for(let i=0;i<3;i++)alienSpawn(false,i);};
