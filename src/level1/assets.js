// Selected V40 installation, V41/V42 SAMs, V43/V44 impact effects. No mission wrappers.
for(const child of [...launchSite.children])launchSite.remove(child);
const launchSteel=new THREE.MeshStandardMaterial({color:0x4b5458,roughness:.74,metalness:.42});
const launchDark=new THREE.MeshStandardMaterial({color:0x2e3539,roughness:.82,metalness:.28});
const launchConcrete=new THREE.MeshStandardMaterial({color:0x8b8272,roughness:.96,metalness:.02});
const launchTank=new THREE.MeshStandardMaterial({color:0x7d817c,roughness:.72,metalness:.24});
const launchBeaconMat=new THREE.MeshBasicMaterial({color:0xe9a05e});
function launchBox(w,h,d,x,y,z,mat=launchSteel){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;launchSite.add(m);return m;
}
function launchCylinder(rt,rb,h,x,y,z,mat=launchTank,rotZ=0){
 const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,14),mat);m.position.set(x,y,z);m.rotation.z=rotZ;m.castShadow=true;m.receiveShadow=true;launchSite.add(m);return m;
}
function launchBeacon(x,y,z,r=1.25){const m=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),launchBeaconMat);m.position.set(x,y,z);launchSite.add(m);return m;}
const launchGround=-90;
// Broad concrete pad and service apron establish scale from miles out.
launchBox(166,4,112,0,launchGround+2,0,launchConcrete);
launchBox(118,2,26,0,launchGround+3,67,launchConcrete);
// Twin gantry towers with chunky vertical mass and sparse catwalks.
for(const x of[-34,34]){
 launchBox(8,104,8,x,launchGround+52,0,launchDark);
 launchBox(3.5,100,3.5,x-9,launchGround+50,0,launchSteel);
 launchBox(3.5,100,3.5,x+9,launchGround+50,0,launchSteel);
 for(const y of[launchGround+18,launchGround+42,launchGround+66])launchBox(25,3,5,x,y,0,launchSteel);
 launchBeacon(x,launchGround+106,0,1.4);
}
launchBox(86,6,14,0,launchGround+84,0,launchSteel);
launchBox(68,3,10,0,launchGround+52,0,launchDark);
// Central launch cradle / service core.
launchBox(18,25,18,0,launchGround+14,-6,launchDark);
launchBox(22,3,18,0,launchGround+27,-3,launchSteel);
// Tanks, hangar and instrumentation mast make the complex asymmetrical and authored.
for(const x of[-61,61])launchCylinder(10,10,30,x,launchGround+15,25,launchTank);
launchBox(38,17,28,-59,launchGround+8.5,-42,launchConcrete);
launchBox(40,2.5,30,-59,launchGround+18,-42,launchDark);
launchBox(2.5,54,2.5,66,launchGround+27,-34,launchDark);
launchBox(13,2,3,66,launchGround+48,-34,launchSteel);
launchBeacon(66,launchGround+55,-34,1.2);
for(const z of[-30,-8,14,36])launchBeacon(0,launchGround+5,z,.7);

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
 return{group:g,position:new THREE.Vector3(x,y+10,z),disabled:false,light,index,lock:0,stage:0,cooldown:index*.12,lastCue:-99};
}
function disposeOwnTree(root){
 if(!root)return;
 root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Object.values({samConcrete,samSteel,samDark,samLightMat}).includes(o.material)){try{o.material.dispose()}catch{}}});
 scene.remove(root);
}
function disposeSamMissile(h){if(!h)return;h.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)try{o.material.dispose()}catch{}});scene.remove(h.mesh)}
function syncSamMissileAlias(){sam.missile=sam.missiles[0]||null}
function removeSamMissile(target=null){if(target){const i=sam.missiles.indexOf(target);if(i>=0)sam.missiles.splice(i,1);disposeSamMissile(target)}else{for(const h of sam.missiles)disposeSamMissile(h);sam.missiles.length=0}syncSamMissileAlias()}
function clearSamNetwork(){removeSamMissile();for(const s of sam.sites){s.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!([samConcrete,samSteel,samDark].includes(o.material)))try{o.material.dispose()}catch{}});scene.remove(s.group)}sam.sites.length=0;sam.lock=0;sam.stage=0;sam.site=null;sam.lastLaunch=-99}
function setupSamNetwork(){clearSamNetwork();const specs=[[-560,510],[540,190],[120,-520]];sam.sites=specs.map((p,i)=>makeSamSite(p[0],p[1],i));sam.lock=0;sam.stage=0;sam.site=null;sam.lastCue=-99;sam.lastLaunch=-99}
function samLineClear(site){const a=site.position,b=ship.position;for(let i=1;i<=9;i++){const t=i/10,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t),y=THREE.MathUtils.lerp(a.y,b.y,t);if(terrainHeight(x,z)+18>y)return false}return true}
function launchSam(site){if(sam.missiles.length>=2||missionElapsed-sam.lastLaunch<.55)return;samLaunchBurst(site);const m=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.19,.26,3.2,8),new THREE.MeshStandardMaterial({color:0xc9c5b6,metalness:.38,roughness:.44}));body.rotation.x=Math.PI/2;m.add(body);const nose=new THREE.Mesh(new THREE.ConeGeometry(.25,.75,8),new THREE.MeshBasicMaterial({color:0xff633a}));nose.rotation.x=-Math.PI/2;nose.position.z=-1.95;m.add(nose);const flame=new THREE.Mesh(new THREE.ConeGeometry(.23,2.1,8),new THREE.MeshBasicMaterial({color:0xff6b31,transparent:true,opacity:.94,blending:THREE.AdditiveBlending,depthWrite:false}));flame.rotation.x=-Math.PI/2;flame.position.z=2.45;m.add(flame);const start=site.position.clone().addScaledVector(worldUp,4),initial=ship.position.clone().addScaledVector(worldUp,95).sub(start).normalize();m.position.copy(start);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),initial);scene.add(m);const h={mesh:m,v:initial.multiplyScalar(218),life:8,trail:0,warn:0,smoke:0,near:false,site};sam.missiles.push(h);syncSamMissileAlias();sam.lastLaunch=missionElapsed;site.lock=0;site.stage=0;site.cooldown=mission.destroyed?1.05:1.55;sam.site=site;announce('SAM LAUNCH — '+clockBearing(start)+" O'CLOCK");flashScreen(.1);chirp(1060,.07,.045);chirp(1450,.11,.04,.07)}
function updateOneSamMissile(h,dt){h.life-=dt;h.trail-=dt;h.warn-=dt;h.smoke-=dt;if(h.warn<=0){chirp(960,.04,.024);h.warn=.36}if(h.trail<=0){spawnMissileTrail(h.mesh.position,h.v);h.trail=.035}if(h.smoke<=0){spawnV43SamSmoke(h.mesh.position,h.v);h.smoke=.065}const previous=h.mesh.position.clone(),up=worldUp.clone().applyQuaternion(ship.quaternion),bank=Math.abs(Math.atan2(up.x,up.y));const defensive=THREE.MathUtils.clamp((bank-.55)/.45,0,1)*((keys.ArrowUp||keys.ArrowDown)?1:.25)*(burner>.48?1:.7);const lead=ship.position.clone().addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion),speed*.09),desired=lead.sub(h.mesh.position).normalize().multiplyScalar(mission.destroyed?262:252),turnRate=(mission.destroyed?2.9:2.72)*(1-defensive*.58);h.v.lerp(desired,1-Math.exp(-dt*turnRate));h.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),h.v.clone().normalize());h.mesh.position.addScaledVector(h.v,dt);const travel=h.mesh.position.clone().sub(previous),toShip=ship.position.clone().sub(previous),u=THREE.MathUtils.clamp(toShip.dot(travel)/Math.max(.001,travel.lengthSq()),0,1),closest=previous.clone().addScaledVector(travel,u),hit=closest.distanceToSquared(ship.position)<72;if(!h.near&&!hit&&closest.distanceToSquared(ship.position)<440){h.near=true;hostileNearMiss()}const sceneryHit=scenerySegmentHit(previous,h.mesh.position,1.5,2,false),blocked=h.mesh.position.y<=terrainHeight(h.mesh.position.x,h.mesh.position.z)+4||!!sceneryHit;if(hit&&!blocked){const p=h.mesh.position.clone();removeSamMissile(h);hostileMissileBurst(p);hitKick=Math.max(hitKick,1.15);flashScreen(.42);chirp(48,.18,.075);hitPlayer(2);return}if(blocked||h.life<=0){const p=sceneryHit||h.mesh.position.clone();removeSamMissile(h);hostileMissileBurst(p);announce(blocked?'SAM DEFEATED — TERRAIN MASK':'SAM EVADED');chirp(430,.06,.032);chirp(690,.075,.024,.05)}}
function updateSamMissiles(dt){for(const h of [...sam.missiles])updateOneSamMissile(h,dt);syncSamMissileAlias()}
function samExposure(s){if(s.disabled)return null;const agl=Math.max(0,ship.position.y-terrainHeight(ship.position.x,ship.position.z)),range=s.position.distanceTo(ship.position),maxRange=s.range||(mission.destroyed?1550:1900);if(range>maxRange||!samLineClear(s))return null;const clutter=.24+.76*THREE.MathUtils.smoothstep(agl,22,100),highExposure=1+THREE.MathUtils.smoothstep(agl,120,215)*1.35,rangeQuality=THREE.MathUtils.clamp(1-(range/maxRange)*.30,.68,1);return{site:s,range,agl,exposure:clutter*highExposure*rangeQuality}}
function updateSamNetwork(dt){if(mission.phase==='briefing'||worldIndex!==0||crashed||missionComplete||missionCompleteTimer>0){removeSamMissile();return}updateSamMissiles(dt);let leadSite=null,leadScore=-1;for(const s of sam.sites){if(s.disabled)continue;s.cooldown=Math.max(0,(s.cooldown||0)-dt);const c=samExposure(s);if(!c){s.lock=Math.max(0,(s.lock||0)-dt*1.7);if(s.lock<=.02)s.stage=0}else{const baseLock=mission.destroyed?.78:(s.index===0?.92:(s.index>=3?.86:1.08));s.lock=Math.min(1,(s.lock||0)+dt/baseLock*c.exposure);if(s.stage===0){s.stage=1;if(missionElapsed-sam.lastCue>1.15){announce(c.agl<70?'RADAR SEARCH — STAY IN THE TERRAIN':'RADAR SEARCH — GET LOW / USE TERRAIN');sam.lastCue=missionElapsed}chirp(520,.045,.026);s.lastCue=missionElapsed}else if(s.lock>.46&&s.stage===1){s.stage=2;if(missionElapsed-sam.lastCue>.7){announce('RADAR TRACK — BREAK LINE OF SIGHT');sam.lastCue=missionElapsed}chirp(690,.05,.03);chirp(910,.05,.026,.1);s.lastCue=missionElapsed}if(s.lock>=1&&s.cooldown<=0&&sam.missiles.length<2&&missionElapsed-sam.lastLaunch>=.55)launchSam(s)}const score=(s.stage||0)*2+(s.lock||0);if(score>leadScore){leadScore=score;leadSite=s}}sam.site=leadSite&&leadSite.stage?leadSite:null;sam.lock=leadSite?.lock||0;sam.stage=leadSite?.stage||0}

const effects={samTrail:[],launchFx:[],launchFxActive:false,launchFxAge:0};
const samTrailGeo=new THREE.IcosahedronGeometry(1,1);

function spawnV43SamSmoke(pos,velocity){
 const mat=new THREE.MeshBasicMaterial({color:0xd9d7ce,transparent:true,opacity:.52,depthWrite:false,fog:true});
 const mesh=new THREE.Mesh(samTrailGeo,mat);mesh.position.copy(pos);mesh.scale.setScalar(2.4+Math.random()*.9);scene.add(mesh);
 const life=4.2+Math.random()*1.15;
 effects.samTrail.push({mesh,life,maxLife:life,v:velocity.clone().multiplyScalar(.012).add(new THREE.Vector3((Math.random()-.5)*.7,.7+Math.random()*.8,(Math.random()-.5)*.7))});
}

function updateV43SamSmoke(dt){
 for(let i=effects.samTrail.length-1;i>=0;i--){
  const p=effects.samTrail[i];p.life-=dt;p.mesh.position.addScaledVector(p.v,dt);
  p.v.multiplyScalar(Math.exp(-dt*.55));p.v.y+=dt*.2;
  const age=1-p.life/p.maxLife,scale=1+age*2.7;p.mesh.scale.multiplyScalar(1+dt*.31);
  p.mesh.material.opacity=.52*Math.pow(Math.max(0,p.life/p.maxLife),1.25);
  if(p.life<=0){scene.remove(p.mesh);p.mesh.material.dispose();effects.samTrail.splice(i,1);}
 }
}

function samLaunchBurst(site){
 const pos=site.position.clone().addScaledVector(worldUp,3);
 const flash=new THREE.PointLight(0xffa05d,58,360,1.8);flash.position.copy(pos);scene.add(flash);
 const core=new THREE.Mesh(new THREE.SphereGeometry(2.5,10,8),new THREE.MeshBasicMaterial({color:0xffb16e,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
 core.position.copy(pos);scene.add(core);
 effects.launchFx.push({kind:'samflash',mesh:core,light:flash,life:.48,maxLife:.48});
 for(let i=0;i<12;i++)spawnV43SamSmoke(pos.clone().add(new THREE.Vector3((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4)),new THREE.Vector3((Math.random()-.5)*5,10+Math.random()*6,(Math.random()-.5)*5));
}

function spawnLaunchClimax(pos){
 effects.launchFxActive=true;effects.launchFxAge=0;
 const flashMat=new THREE.MeshBasicMaterial({color:0xffe1a8,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const flash=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),flashMat);flash.position.copy(pos);scene.add(flash);
 const light=new THREE.PointLight(0xff8a42,165,1050,1.55);light.position.copy(pos).addScaledVector(worldUp,20);scene.add(light);
 effects.launchFx.push({kind:'primary',mesh:flash,light,life:1.05,maxLife:1.05});

 const ring=new THREE.Mesh(new THREE.RingGeometry(8,10,64),new THREE.MeshBasicMaterial({color:0xffa65b,transparent:true,opacity:.76,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
 ring.rotation.x=-Math.PI/2;ring.position.set(pos.x,terrainHeight(pos.x,pos.z)+2,pos.z);scene.add(ring);
 effects.launchFx.push({kind:'shock',mesh:ring,life:1.35,maxLife:1.35});

 // Heavy gantry fragments — enough to sell destruction without feature soup.
 for(let i=0;i<15;i++){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2+Math.random()*5,.7+Math.random()*2,4+Math.random()*10),new THREE.MeshStandardMaterial({color:i%3?0x24292b:0x4b4039,roughness:.72,metalness:.5}));
  mesh.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*36,7+Math.random()*30,(Math.random()-.5)*32));scene.add(mesh);
  const dir=new THREE.Vector3((Math.random()-.5)*1.1,.42+Math.random()*.95,(Math.random()-.5)*1.1).normalize();
  effects.launchFx.push({kind:'debris',mesh,v:dir.multiplyScalar(28+Math.random()*65),spin:new THREE.Vector3((Math.random()-.5)*7,(Math.random()-.5)*9,(Math.random()-.5)*7),life:3.6+Math.random()*1.8,maxLife:5});
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
 for(let i=effects.launchFx.length-1;i>=0;i--){
  const fx=effects.launchFx[i];fx.life-=dt;const t=1-THREE.MathUtils.clamp(fx.life/fx.maxLife,0,1);
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
   effects.launchFx.splice(i,1);
  }
 }
}

const firestorm={fires:[],secondaries:[],fireAge:0,firestorm:false,egressWarn:0};
const v44FireGeo=new THREE.IcosahedronGeometry(1,1),v44SmokeGeo=new THREE.IcosahedronGeometry(1,1);

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
 firestorm.fires.push({flame,light,smoke,phase:Math.random()*10,scale,intensity});
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
 firestorm.secondaries.push({mesh,light,life:.7,maxLife:.7,scale});
 flashScreen(.28*scale);hitKick=Math.max(hitKick,.45*scale);
 chirp(58,.14,.045);chirp(190,.08,.025,.035);
}

function v44IgniteComplex(origin){
 firestorm.firestorm=true;firestorm.fireAge=0;firestorm.egressWarn=0;
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
 firestorm.secondaries.push({pending:true,at:.9,pos:origin.clone().add(new THREE.Vector3(-48,5,22)),scale:.8});
 firestorm.secondaries.push({pending:true,at:2.05,pos:origin.clone().add(new THREE.Vector3(35,10,-12)),scale:1.05});
 firestorm.secondaries.push({pending:true,at:3.6,pos:origin.clone().add(new THREE.Vector3(4,18,8)),scale:.72});
}

function v44UpdateFirestorm(dt){
 if(!firestorm.firestorm)return;
 firestorm.fireAge+=dt;

 // Persistent rolling fire and smoke remain as geographic memory during egress.
 for(const f of firestorm.fires){
  const pulse=.78+.22*Math.sin(firestorm.fireAge*8.2+f.phase);
  f.flame.scale.set(5*f.scale*pulse,3.7*f.scale*(.9+pulse*.18),5*f.scale*pulse);
  f.flame.material.opacity=.72+.2*pulse;
  f.light.intensity=34*f.intensity*(.72+.28*pulse);
  f.smoke.position.y+=dt*(1.8+.8*f.scale);
  f.smoke.position.x+=Math.sin(firestorm.fireAge*.28+f.phase)*dt*.45;
  f.smoke.scale.multiplyScalar(1+dt*.018);
  f.smoke.material.opacity=Math.max(.16,.42-firestorm.fireAge*.006);
 }

 for(let i=firestorm.secondaries.length-1;i>=0;i--){
  const s=firestorm.secondaries[i];
  if(s.pending){
   if(firestorm.fireAge>=s.at){
    v44SecondaryBlast(s.pos,s.scale);
    firestorm.secondaries.splice(i,1);
   }
   continue;
  }
  s.life-=dt;const t=1-THREE.MathUtils.clamp(s.life/s.maxLife,0,1);
  s.mesh.scale.setScalar((5+72*Math.pow(t,.62))*s.scale);
  s.mesh.material.opacity=Math.pow(1-t,2.2);
  s.light.intensity=95*s.scale*Math.pow(1-t,1.7);
  if(s.life<=0){
   scene.remove(s.mesh);scene.remove(s.light);s.mesh.geometry.dispose();s.mesh.material.dispose();
   firestorm.secondaries.splice(i,1);
  }
 }

}

function v44ClearFirestorm(){
 for(const f of firestorm.fires){
  scene.remove(f.flame);scene.remove(f.light);scene.remove(f.smoke);
  f.flame.geometry.dispose();f.flame.material.dispose();
  f.smoke.geometry.dispose();f.smoke.material.dispose();
 }
 firestorm.fires.length=0;
 for(const s of firestorm.secondaries){
  if(s.pending)continue;
  scene.remove(s.mesh);scene.remove(s.light);
  if(s.mesh){s.mesh.geometry.dispose();s.mesh.material.dispose();}
 }
 firestorm.secondaries.length=0;firestorm.firestorm=false;firestorm.fireAge=0;firestorm.egressWarn=0;
}

const vaporGeo=new THREE.IcosahedronGeometry(1,1);const v43VaporMat=new THREE.MeshBasicMaterial({color:0xd8d2c4,transparent:true,opacity:.12,depthWrite:false,fog:true});
effects.vapor=[];
for(let i=0;i<7;i++){const mesh=new THREE.Mesh(vaporGeo,v43VaporMat.clone());scene.add(mesh);effects.vapor.push({mesh,phase:i/7,seed:i*2.17});}
function updateLaunchVapor(){
 const active=worldIndex===0&&!mission.destroyed;
 const t=performance.now()*.001;
 for(const puff of effects.vapor){
  puff.mesh.visible=active;if(!active)continue;
  const phase=(puff.phase+t*.035)%1;
  const sway=Math.sin(t*.24+puff.seed)*5;
  puff.mesh.position.set(launchSite.position.x+8+sway,launchSite.position.y-40+phase*92,launchSite.position.z+4+Math.cos(t*.19+puff.seed)*4);
  const s=4.5+phase*11;puff.mesh.scale.set(s,s*.72,s);
  puff.mesh.material.opacity=.12*(1-phase)*(.7+.3*Math.sin(t*.8+puff.seed));
 }
}