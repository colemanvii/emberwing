// V39: persistent geography and one locator owner. No flight/camera authority.
let enemyDetected=false,contactLostTime=0;
const destinations=[
 {name:'LAUNCH COMPLEX',position:new THREE.Vector3(-420,0,-2800)},
 {name:'HIGH PASS RELAY',position:new THREE.Vector3(380,0,-3000)},
 {name:'OFFSHORE PLATFORM',position:new THREE.Vector3(620,38,-3100)}
];
const alpineRelay=launchSite.clone();spectacle.add(alpineRelay);
function placeDestinations(){
 for(let i=0;i<2;i++)if(i===worldIndex){const p=destinations[i].position;p.y=terrainHeight(p.x,p.z)+92;}
 launchSite.position.copy(destinations[0].position);
 alpineRelay.position.copy(destinations[1].position);alpineRelay.visible=worldIndex===1;
 platform.position.set(destinations[2].position.x,-42,destinations[2].position.z);
}
const destinationSpectacleBase=updateV34Spectacle;
updateV34Spectacle=function(){
 destinationSpectacleBase();alpineRelay.visible=worldIndex===1;
 if(worldIndex===0){rocket.position.x=launchSite.position.x;rocket.position.z=launchSite.position.z;
 rocket.position.y=launchSite.position.y-60+Math.pow(Math.max(0,missionElapsed-8),1.48)*5.5;}
};
const navigationResetBase=reset;
reset=function(){enemyDetected=false;contactLostTime=0;navigationResetBase();placeDestinations();objective.textContent="";};
const navigationAlpineBase=deployAlpine;
deployAlpine=function(){enemyDetected=false;contactLostTime=0;navigationAlpineBase();placeDestinations();};
const navigationTempestBase=deployTempest;
deployTempest=function(){enemyDetected=false;contactLostTime=0;navigationTempestBase();placeDestinations();};
const contactUpdateBase=updateEnemy;
updateEnemy=function(dt){
 contactUpdateBase(dt);
 if(!enemyAlive){enemyDetected=false;contactLostTime=0;return;}
 if(encounterBlocked())return;
 const contactRange=enemy.position.distanceTo(ship.position);
 contactLostTime=enemyDetected&&contactRange>1600?contactLostTime+dt:0;
 if(contactLostTime>4){enemyDetected=false;contactLostTime=0;}
 if(!encounterBlocked()&&!enemyDetected&&enemy.position.distanceTo(ship.position)<=1000){
  enemyDetected=true;
  // Travel before detection must not consume the first merge's engage window.
  if(duel.state==='engage')duel.age=0;
  radarCarrier(enemy.position);announce('DISTANT CONTACT');
 }
};
// Visual acquisition and the existing weapons remain available inside detection range.
const contactGeometryBase=geometry;
geometry=function(){const g=contactGeometryBase();if(enemyAlive&&!enemyDetected){g.state=0;g.onscreen=false;g.hard=false;}return g;};
const contactTargetingBase=updateTargeting;
updateTargeting=function(dt){
 contactTargetingBase(dt);
 if(enemyAlive&&!enemyDetected){coachText.textContent='AIRSPACE QUIET';coachSub.textContent='CONTINUE TO '+destinations[worldIndex].name;}
};
// The optional radar strike is a mission objective while identified/designated.
// Rear threat > detected aircraft > identified radar > theater destination.
updateGuidance=function(){
 if(encounterBlocked()){targetUI.style.opacity='0';targetUI.dataset.owner='';return;}
 const bandit=enemyAlive&&enemyDetected;
 const radar=!bandit&&!enemyAlive&&encounter.phase==='active'&&(encounter.callout||seeker);
 const destination=destinations[worldIndex];
 const pos=bandit?enemy.position:radar?encounter.targetPos:destination.position;
 const range=pos.distanceTo(ship.position);
 const toPlayer=ship.position.clone().sub(enemy.position).normalize();
 const rear=bandit&&range<460&&new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion).dot(toPlayer)>.55&&new THREE.Vector3(0,0,-1).applyQuaternion(enemy.quaternion).dot(toPlayer)>.65;
 const owner=rear?'rear':bandit?'bandit':radar?'radar':'destination';
 const local=pos.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert()),front=local.z<0,p=pos.clone().project(camera),ons=front&&Math.abs(p.x)<.86&&Math.abs(p.y)<.76,cx=innerWidth*.5,cy=innerHeight*.42;
 guideSide=local.x<0?-1:1;
 let x,y;
 if(ons){x=(p.x*.5+.5)*innerWidth;y=(-p.y*.5+.5)*innerHeight;targetUI.dataset.stack='';}
 else{
  const az=Math.atan2(local.x,-local.z),flat=Math.max(1,Math.hypot(local.x,local.z));let dx=Math.sin(az),dy=-THREE.MathUtils.clamp(local.y/flat,-.82,.82);
  if(!front&&Math.abs(dx)<.09)dx=guideSide*.09;
  const mag=Math.max(.001,Math.hypot(dx,dy));dx/=mag;dy/=mag;
  const radius=Math.min(innerWidth,innerHeight)*.3;x=cx+dx*radius;y=cy+dy*radius;
  targetUI.dataset.stack=local.y>flat*.11?'▲':local.y<-flat*.11?'▼':'·';
 }
 // Snap between owners; ease only within the same contact, avoiding cross-target sweeps.
 if(targetUI.dataset.owner!==owner){guideX=x;guideY=y;}
 else{guideX=THREE.MathUtils.lerp(guideX,x,ons?.5:.28);guideY=THREE.MathUtils.lerp(guideY,y,ons?.5:.28);}
 targetUI.dataset.owner=owner;targetUI.style.left=guideX+'px';targetUI.style.top=guideY+'px';
 const designated=(bandit||radar)&&seeker;
 targetUI.style.opacity=rear?'1':designated?'.84':'.52';
 const label=rear?'ON YOUR SIX':bandit?'CONTACT':radar?(encounter.tracking?'RADAR PAINT':'RADAR'):destination.name;
 targetUI.dataset.range=label+' · '+Math.round(range*FEET_PER_UNIT/10)*10+' FT';
 targetUI.className=!ons?'offscreen':designated&&lockState===2?'lock':designated&&lockState===1?'track':'';
 if(rear&&!seeker){coachText.textContent='BANDIT ON YOUR SIX';coachSub.textContent='BREAK / REVERSE / BOOST';}
};
// One new prop family, three pooled isolated utility outposts across the valley.
const outpostMaterial=new THREE.MeshStandardMaterial({color:0x625d50,roughness:.95,metalness:.12});
const navigationPlaceBase=place;
place=function(m,initial=false,alpine=false){
 if(!m.userData.outpost){navigationPlaceBase(m,initial,alpine);return;}
 m.visible=worldIndex!==2;if(!m.visible)return;
 aroundPoint(m,700,1700,true);
 // Seat each low structure on the existing terrain without changing its surface.
 for(const child of m.children){child.position.y=terrainHeight(m.position.x+child.position.x,m.position.z+child.position.z)-m.position.y+child.userData.halfHeight;}
};
for(let i=0;i<3;i++){
 const g=new THREE.Group();g.userData={outpost:true,raise:0,collisionR:28,collisionH:12};
 for(const [x,z,w,h,d] of [[0,0,19,7,11],[23,8,9,4,7],[-11,-6,1,22,1]]){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),outpostMaterial);mesh.position.set(x,h/2,z);mesh.userData.halfHeight=h/2;g.add(mesh);
 }
 scenery.push(g);scene.add(g);place(g);
}
