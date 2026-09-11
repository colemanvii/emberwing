// Emberwing lightweight encounter layer.
// First prototype: one optional radar-emitter strike after the opening bandit.
// Flight authority is untouched: this module only owns encounter state, targeting,
// presentation, and weapon resolution while no airborne enemy is active.
const encounter={
  kind:null,phase:'idle',age:0,timer:0,offered:false,callout:false,runCue:false,
  group:null,wreck:null,dishPivot:null,beacon:null,beaconLight:null,targetPos:new THREE.Vector3(),
  lastRange:0,carrierTimer:0,carrier:null,paint:0,tracking:false,launchWarned:false,shotFired:false,surfaceShot:null,fx:[]
};

function disposeObject3D(root){
  if(!root)return;
  root.traverse(o=>{
    if(o.geometry)o.geometry.dispose();
    if(o.material){
      const mats=Array.isArray(o.material)?o.material:[o.material];
      for(const m of mats)m.dispose();
    }
  });
  scene.remove(root);
}

function encounterBlocked(){return crashed||missionComplete||missionCompleteTimer>0;}

function clearSurfaceShot(){
  if(encounter.surfaceShot)disposeObject3D(encounter.surfaceShot.mesh);
  encounter.surfaceShot=null;
}

function clearRadarInstallation(){
  clearSurfaceShot();encounter.tracking=false;encounter.paint=0;
  disposeObject3D(encounter.group);
  encounter.group=encounter.dishPivot=encounter.beacon=encounter.beaconLight=null;
}

function stopRadarCarrier(){
  if(!encounter.carrier)return;
  encounter.carrier.gain.disconnect();encounter.carrier.osc.stop();encounter.carrier=null;
}

function radarCarrier(contactPosition=encounter.targetPos){
  if(!audioCtx||audioCtx.state!=='running'||encounterBlocked())return;
  stopRadarCarrier();
  const local=contactPosition.clone().sub(ship.position).applyQuaternion(ship.quaternion.clone().invert()).normalize();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),pan=audioCtx.createStereoPanner(),t=audioCtx.currentTime;
  const intensity=THREE.MathUtils.clamp(encounter.paint/4,0,1);
  osc.type=encounter.tracking?'triangle':'sine';osc.frequency.value=encounter.tracking?620+intensity*520:410;
  pan.pan.value=THREE.MathUtils.clamp(local.x,-1,1);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime((encounter.tracking?.025+intensity*.02:.008)*(.65+.35*Math.max(0,-local.z)),t+.025);gain.gain.linearRampToValueAtTime(0,t+.16);
  osc.connect(gain).connect(pan).connect(audioCtx.destination);osc.start(t);osc.stop(t+.18);
  const carrier={osc,gain};encounter.carrier=carrier;
  osc.onended=()=>{gain.disconnect();pan.disconnect();if(encounter.carrier===carrier)encounter.carrier=null;};
}

function clearEncounterVisuals(){
  stopRadarCarrier();clearRadarInstallation();
  disposeObject3D(encounter.wreck);encounter.wreck=null;
  for(const fx of encounter.fx){
    if(fx.mesh)disposeObject3D(fx.mesh);
    if(fx.light)scene.remove(fx.light);
  }
  encounter.fx.length=0;
  for(let i=combatFX.length-1;i>=0;i--)if(combatFX[i].encounterOwned){disposeObject3D(combatFX[i].mesh);combatFX.splice(i,1);}
  if(missile&&missile.strikeTarget)removeMissile();
}

function resetEncounter(allowAgain=false){
  clearEncounterVisuals();
  encounter.kind=null;encounter.phase='idle';encounter.age=encounter.timer=0;
  encounter.callout=false;encounter.runCue=false;encounter.beaconLight=null;encounter.lastRange=0;encounter.carrierTimer=0;encounter.launchWarned=false;encounter.shotFired=false;
  if(allowAgain)encounter.offered=false;
}

function strikeSiteClear(x,z){
  for(const m of scenery){
    if(!m.visible)continue;
    const dx=x-m.position.x,dz=z-m.position.z,r=(m.userData.collisionR||10)+42;
    if(dx*dx+dz*dz<r*r)return false;
  }
  return true;
}

function makeRadarInstallation(){
  const g=new THREE.Group();
  const concrete=new THREE.MeshStandardMaterial({color:0x35383a,roughness:.92,metalness:.05});
  const graphite=new THREE.MeshStandardMaterial({color:0x11171b,roughness:.5,metalness:.55});
  const steel=new THREE.MeshStandardMaterial({color:0x5c6669,roughness:.42,metalness:.66});
  const dishMat=new THREE.MeshStandardMaterial({color:0x747d7e,roughness:.34,metalness:.58,side:THREE.DoubleSide});
  const amber=new THREE.MeshStandardMaterial({color:0xff8a45,emissive:0xff5726,emissiveIntensity:3.2,roughness:.3});

  const pad=new THREE.Mesh(new THREE.CylinderGeometry(17,19,1.6,10),concrete);
  pad.position.y=.8;g.add(pad);

  const bunker=new THREE.Mesh(new THREE.BoxGeometry(18,5.5,11),graphite);
  bunker.position.set(-6,3.5,3);g.add(bunker);
  const bunkerCap=new THREE.Mesh(new THREE.BoxGeometry(20,1.1,13),steel);
  bunkerCap.position.set(-6,6.6,3);g.add(bunkerCap);

  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.55,.85,17,8),steel);
  mast.position.set(5,9.2,-2);g.add(mast);
  const mastCross=new THREE.Mesh(new THREE.BoxGeometry(8,.45,.45),steel);
  mastCross.position.set(5,13,-2);g.add(mastCross);

  const pivot=new THREE.Group();pivot.position.set(5,16.8,-2);g.add(pivot);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(7.5,28,12,0,Math.PI*2,0,Math.PI*.28),dishMat);
  dish.scale.y=.42;dish.rotation.z=-Math.PI/2;pivot.add(dish);
  const feed=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,5.8,6),steel);
  feed.rotation.z=Math.PI/2;feed.position.set(3.1,1.2,0);pivot.add(feed);
  const feedTip=new THREE.Mesh(new THREE.SphereGeometry(.55,8,6),graphite);
  feedTip.position.set(6,1.2,0);pivot.add(feedTip);

  const beacon=new THREE.Mesh(new THREE.SphereGeometry(.65,10,8),amber);
  beacon.position.set(-1.5,8.2,-1);g.add(beacon);
  const beaconStem=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,3,6),steel);
  beaconStem.position.set(-1.5,7,-1);g.add(beaconStem);
  const beaconLight=new THREE.PointLight(0xff7b3d,6.5,190,2);
  beaconLight.position.copy(beacon.position);g.add(beaconLight);

  // Sparse support structures make the target read as a real installation, not a prop.
  const shedA=new THREE.Mesh(new THREE.BoxGeometry(8,3.3,5.5),graphite);
  shedA.position.set(10,2,-8);g.add(shedA);
  const shedACap=new THREE.Mesh(new THREE.BoxGeometry(8.7,.45,6.2),steel);
  shedACap.position.set(10,3.85,-8);g.add(shedACap);
  const shedB=new THREE.Mesh(new THREE.BoxGeometry(6.5,2.7,4.8),concrete);
  shedB.position.set(-13,1.65,-6);g.add(shedB);

  for(let i=0;i<3;i++){
    const a=-5+i*4.5,antenna=new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,7+i*1.4,6),steel);
    antenna.position.set(a,9+(i*.7),-5);g.add(antenna);
  }

  g.userData.materials=[concrete,graphite,steel,dishMat,amber];
  encounter.dishPivot=pivot;encounter.beacon=beacon;encounter.beaconLight=beaconLight;
  return g;
}

function placeRadarInstallation(){
  const f=heading().clone(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize();
  const tries=[
    [690,165],[740,-190],[810,220],[620,-250],[900,120],[840,-310]
  ];
  let x=ship.position.x+f.x*720+r.x*170,z=ship.position.z+f.z*720+r.z*170;
  for(const [ahead,side] of tries){
    const tx=ship.position.x+f.x*ahead+r.x*side,tz=ship.position.z+f.z*ahead+r.z*side;
    if(strikeSiteClear(tx,tz)){x=tx;z=tz;break;}
  }
  const y=terrainHeight(x,z);
  encounter.targetPos.set(x,y+7,z);
  encounter.group=makeRadarInstallation();
  encounter.group.position.set(x,y+.15,z);
  encounter.group.rotation.y=Math.atan2(f.x,f.z)+Math.PI;
  scene.add(encounter.group);
  encounter.lastRange=ship.position.distanceTo(encounter.targetPos);
}

function beginRadarOpportunity(){
  if(encounter.offered||worldIndex!==0||encounterBlocked())return;
  encounter.offered=true;encounter.kind='radar';encounter.phase='quiet';
  encounter.timer=2.6;encounter.age=0;encounter.callout=false;
  respawn=999;
  lockState=lockTimer=lastLock=0;
  if(seeker)setSeeker(false);
}

function activateRadarOpportunity(){
  if(encounterBlocked())return;
  encounter.phase='active';encounter.age=0;encounter.callout=false;encounter.runCue=false;
  placeRadarInstallation();
  encounter.carrierTimer=0;encounter.paint=0;encounter.tracking=false;encounter.launchWarned=false;encounter.shotFired=false;
  objective.textContent='';
}

function finishRadarOpportunity(status){
  if(encounterBlocked()||encounter.phase!=='active')return;
  stopRadarCarrier();clearRadarInstallation();
  encounter.phase='egress';encounter.timer=status==='destroyed'?3.3:1.6;
  encounter.age=0;
  lockState=lockTimer=lastLock=0;
  if(seeker)setSeeker(false);
  targetUI.style.opacity='0';
  if(status==='destroyed')announce('STRIKE CONFIRMED');
  else announce('SIGNAL LOST');
}

function groundStrikeBoom(){
  if(!audioCtx||audioCtx.state!=='running')return;
  const t=audioCtx.currentTime;
  const osc=audioCtx.createOscillator(),og=audioCtx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(58,t);osc.frequency.exponentialRampToValueAtTime(32,t+.65);
  og.gain.setValueAtTime(.0001,t);og.gain.exponentialRampToValueAtTime(.19,t+.012);og.gain.exponentialRampToValueAtTime(.0001,t+.8);
  osc.connect(og).connect(audioCtx.destination);osc.start(t);osc.stop(t+.85);

  const length=Math.floor(audioCtx.sampleRate*.72),buffer=audioCtx.createBuffer(1,length,audioCtx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,1.7);
  const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),ng=audioCtx.createGain();
  src.buffer=buffer;filter.type='lowpass';filter.frequency.value=310;filter.Q.value=.7;
  ng.gain.setValueAtTime(.13,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.72);
  src.connect(filter).connect(ng).connect(audioCtx.destination);src.start(t);
}

function makeStrikeWreck(){
  const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x111315,roughness:.96,metalness:.18});
  const scorch=new THREE.Mesh(new THREE.CylinderGeometry(18,23,.5,28),new THREE.MeshStandardMaterial({color:0x17120f,roughness:1,metalness:0}));
  scorch.position.y=.18;g.add(scorch);
  for(let i=0;i<11;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(2+Math.random()*5,.4+Math.random()*1.4,2+Math.random()*6),mat);
    const a=Math.random()*Math.PI*2,d=3+Math.random()*13;
    m.position.set(Math.cos(a)*d,.4+Math.random()*.7,Math.sin(a)*d);
    m.rotation.set((Math.random()-.5)*.5,Math.random()*Math.PI,(Math.random()-.5)*.5);
    g.add(m);
  }
  const x=encounter.targetPos.x,z=encounter.targetPos.z,y=terrainHeight(x,z);
  g.position.set(x,y+.1,z);scene.add(g);encounter.wreck=g;
}

function groundStrikeImpact(){
  if(encounterBlocked()||encounter.phase!=='active')return;
  const pos=encounter.targetPos.clone();pos.y=terrainHeight(pos.x,pos.z)+4.5;
  removeMissile();
  clearRadarInstallation();
  makeStrikeWreck();

  flashScreen(.72);hitKick=Math.max(hitKick,1);killSlow=Math.max(killSlow,.34);
  groundStrikeBoom();chirp(74,.18,.055);chirp(210,.09,.028,.035);

  const flashMat=new THREE.MeshBasicMaterial({color:0xffe0a1,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const flashMesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),flashMat);
  flashMesh.position.copy(pos);scene.add(flashMesh);
  const light=new THREE.PointLight(0xffa052,95,520,1.8);light.position.copy(pos).addScaledVector(worldUp,15);scene.add(light);
  encounter.fx.push({kind:'flash',mesh:flashMesh,light,life:.42,maxLife:.42});

  const ringMat=new THREE.MeshBasicMaterial({color:0xffb36d,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(5.5,7.3,56),ringMat);
  ring.rotation.x=-Math.PI/2;ring.position.copy(pos);ring.position.y=terrainHeight(pos.x,pos.z)+1.2;scene.add(ring);
  encounter.fx.push({kind:'ring',mesh:ring,life:.9,maxLife:.9});

  for(let i=0;i<34;i++){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.25+Math.random()*.7,6,5),new THREE.MeshBasicMaterial({
      color:i%4===0?0xffffff:i%3===0?0xffc16b:0xff6d31,transparent:true,opacity:.95,
      blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
    }));
    mesh.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*8,Math.random()*7,(Math.random()-.5)*8));
    scene.add(mesh);
    const v=new THREE.Vector3(Math.random()-.5,.12+Math.random()*.85,Math.random()-.5).normalize().multiplyScalar(26+Math.random()*62);
    const life=.55+Math.random()*.45;combatFX.push({encounterOwned:true,mesh,v,life,maxLife:life,smoke:false});
  }
  for(let i=0;i<18;i++){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1.8+Math.random()*2.6,8,6),new THREE.MeshBasicMaterial({
      color:i%3?0x242526:0x4b4038,transparent:true,opacity:.44,depthWrite:false
    }));
    mesh.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*18,Math.random()*7,(Math.random()-.5)*18));
    scene.add(mesh);
    const v=new THREE.Vector3((Math.random()-.5)*4,4+Math.random()*8,(Math.random()-.5)*4);
    const life=5.8+Math.random()*4.2;combatFX.push({encounterOwned:true,mesh,v,life,maxLife:life,smoke:true,baseOpacity:.44,grow:.25+Math.random()*.2});
  }
  // One slow vertical column remains after the flash so the kill has a geographic memory.
  for(let i=0;i<9;i++){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(3+Math.random()*2.6,9,7),new THREE.MeshBasicMaterial({
      color:i<2?0x514239:0x202326,transparent:true,opacity:.36,depthWrite:false
    }));
    mesh.position.copy(pos).add(new THREE.Vector3((Math.random()-.5)*6,2+i*3.2,(Math.random()-.5)*6));
    scene.add(mesh);
    const v=new THREE.Vector3((Math.random()-.5)*1.3,2.4+Math.random()*2.8,(Math.random()-.5)*1.3);
    const life=8.5+Math.random()*5.5;combatFX.push({encounterOwned:true,mesh,v,life,maxLife:life,smoke:true,baseOpacity:.36,grow:.16+Math.random()*.1});
  }
  const fireCore=new THREE.Mesh(new THREE.SphereGeometry(2.8,12,9),new THREE.MeshBasicMaterial({color:0xff7a35,transparent:true,opacity:.86,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  fireCore.position.copy(pos).addScaledVector(worldUp,2.2);scene.add(fireCore);
  const fireLight=new THREE.PointLight(0xff6b32,18,170,2);fireLight.position.copy(fireCore.position);scene.add(fireLight);
  encounter.fx.push({kind:'fire',mesh:fireCore,light:fireLight,life:2.8,maxLife:2.8});
  for(let i=0;i<10;i++){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.7+Math.random()*1.8,.25+Math.random()*.6,.8+Math.random()*2.4),
      new THREE.MeshStandardMaterial({color:i%2?0x17191a:0x3a302a,roughness:.8,metalness:.28}));
    mesh.position.copy(pos);scene.add(mesh);
    const v=new THREE.Vector3(Math.random()-.5,.25+Math.random()*.9,Math.random()-.5).normalize().multiplyScalar(16+Math.random()*36);
    const life=1.8+Math.random()*1.5;
    combatFX.push({encounterOwned:true,mesh,v,life,maxLife:life,debris:true,spin:new THREE.Vector3((Math.random()-.5)*8,(Math.random()-.5)*10,(Math.random()-.5)*8)});
  }

  finishRadarOpportunity('destroyed');
}

function updateEncounterFX(dt){
  for(let i=encounter.fx.length-1;i>=0;i--){
    const fx=encounter.fx[i];fx.life-=dt;
    const t=THREE.MathUtils.clamp(1-fx.life/fx.maxLife,0,1);
    if(fx.kind==='flash'){
      fx.mesh.scale.setScalar(4+58*Math.pow(t,.7));
      fx.mesh.material.opacity=Math.pow(1-t,2.3);
      if(fx.light)fx.light.intensity=95*Math.pow(1-t,2);
    }else if(fx.kind==='ring'){
      fx.mesh.scale.setScalar(1+11*t);
      fx.mesh.material.opacity=.72*Math.pow(1-t,1.4);
    }else if(fx.kind==='fire'){
      const pulse=.78+.22*Math.sin(t*30);
      fx.mesh.scale.setScalar(1+1.8*t);
      fx.mesh.material.opacity=.86*Math.pow(1-t,1.5)*pulse;
      if(fx.light)fx.light.intensity=18*Math.pow(1-t,1.35)*pulse;
    }
    if(fx.life<=0){
      if(fx.light)scene.remove(fx.light);
      disposeObject3D(fx.mesh);encounter.fx.splice(i,1);
    }
  }
}

function updateEncounter(dt){
  if(encounterBlocked()){stopRadarCarrier();return;}
  updateEncounterFX(dt);
  if(encounter.phase==='idle'||encounter.phase==='done')return;
  encounter.age+=dt;

  if(encounter.phase==='quiet'){
    encounter.timer-=dt;
    if(encounter.timer<=0)activateRadarOpportunity();
    return;
  }

  if(encounter.phase==='active'){
    const range=ship.position.distanceTo(encounter.targetPos);
    const detected=range<(encounter.tracking?850:680);
    if(detected&&!encounter.tracking){
      encounter.tracking=true;encounter.callout=true;encounter.carrierTimer=0;announce('RADAR PAINT');
    }else if(!detected&&encounter.tracking){
      encounter.tracking=false;encounter.paint=0;encounter.launchWarned=false;
      stopRadarCarrier();clearSurfaceShot();announce('TRACK BROKEN');
    }
    if(encounter.tracking){
      const before=encounter.paint;encounter.paint+=dt;
      if(before<1.5&&encounter.paint>=1.5)announce('TRACKED — BREAK AWAY OR STRIKE');
      if(!encounter.shotFired&&encounter.paint>=3&&!encounter.launchWarned){encounter.launchWarned=true;announce('SURFACE LAUNCH IMMINENT');}
      if(!encounter.shotFired&&encounter.paint>=5){
        encounter.shotFired=true;
        const mesh=new THREE.Mesh(new THREE.ConeGeometry(1.2,9,8),new THREE.MeshBasicMaterial({color:0xffa052,toneMapped:false}));
        mesh.position.copy(encounter.targetPos).addScaledVector(worldUp,12);scene.add(mesh);
        encounter.surfaceShot={mesh,life:5,v:ship.position.clone().addScaledVector(heading(),speed*.8).sub(mesh.position).normalize().multiplyScalar(240)};
        announce('SURFACE MISSILE — BREAK AWAY');flashScreen(.1);
      }
    }
    if(encounter.surfaceShot){
      const shot=encounter.surfaceShot,previous=shot.mesh.position.clone();shot.life-=dt;
      shot.mesh.position.addScaledVector(shot.v,dt);shot.mesh.quaternion.setFromUnitVectors(worldUp,shot.v.clone().normalize());
      const travel=shot.mesh.position.clone().sub(previous),u=THREE.MathUtils.clamp(ship.position.clone().sub(previous).dot(travel)/Math.max(.001,travel.lengthSq()),0,1);
      if(previous.addScaledVector(travel,u).distanceTo(ship.position)<12){clearSurfaceShot();hitPlayer();if(encounterBlocked()){stopRadarCarrier();return;}}
      else if(shot.life<=0||shot.mesh.position.y<terrainHeight(shot.mesh.position.x,shot.mesh.position.z)+2)clearSurfaceShot();
    }
    if(encounter.dishPivot){
      if(encounter.tracking){
        const local=encounter.group.worldToLocal(ship.position.clone()).sub(encounter.dishPivot.position);
        encounter.dishPivot.rotation.set(0,-Math.atan2(local.z,local.x),Math.atan2(local.y,Math.hypot(local.x,local.z)));
      }else{encounter.dishPivot.rotation.z=0;encounter.dishPivot.rotation.y+=dt*.52;}
    }
    if(encounter.beacon){
      const pulse=.78+.22*Math.sin(encounter.age*(encounter.tracking?18:7.5));
      encounter.beacon.scale.setScalar(.9+pulse*.22);
      encounter.beacon.material.emissiveIntensity=2.2+pulse*2.4;
      if(encounter.beaconLight)encounter.beaconLight.intensity=4.5+pulse*5.5;
    }
    const bearing=encounter.targetPos.clone().sub(ship.position).normalize().dot(heading());
    encounter.carrierTimer-=dt;
    if((encounter.tracking||!encounter.callout)&&encounter.carrierTimer<=0){radarCarrier();encounter.carrierTimer=encounter.tracking?Math.max(.2,.8-encounter.paint*.12):2.3;}
    // Evidence precedes identification. Looking toward a nearby site or deliberately
    // designating it reveals the existing optional strike controls.
    if(!encounter.callout&&((encounter.age>1&&range<780&&bearing>.1)||(seeker&&strikeGeometry().state))){
      encounter.callout=true;stopRadarCarrier();announce('RADAR EMITTER');
    }
    if(encounter.callout&&!encounter.tracking&&!encounter.runCue&&range<430){
      encounter.runCue=true;announce('STRIKE WINDOW');
      chirp(720,.045,.028);chirp(980,.07,.024,.065);
    }
    // Weapon resolution owns the final decision once a strike has been launched.
    const strikeLive=missile&&missile.strikeTarget;
    if(!strikeLive&&(encounter.age>28||(encounter.age>8&&range>1750)))finishRadarOpportunity('lost');
    return;
  }

  if(encounter.phase==='egress'){
    encounter.timer-=dt;
    if(encounter.timer<=0){
      encounter.phase='done';respawn=.9;
      clearRadarInstallation();
    }
  }
}

function strikeGeometry(){
  if(encounter.phase!=='active'||!encounter.group||!encounter.group.visible)
    return{state:0,hard:false,onscreen:false,dist:0,d:999,trackR:0};
  const target=encounter.targetPos,dist=target.distanceTo(ship.position),p=target.clone().project(camera);
  const onscreen=p.z>-1&&p.z<1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1;
  if(!onscreen||dist>1350)return{state:0,hard:false,onscreen:false,dist,d:999,trackR:0};
  const sx=(p.x*.5+.5)*innerWidth,sy=(-p.y*.5+.5)*innerHeight,rx=innerWidth*.5,ry=innerHeight*.42;
  const d=Math.hypot(sx-rx,sy-ry),v=Math.min(innerWidth,innerHeight),trackR=v*.31,lockR=v*.22;
  return{state:d<trackR?1:0,hard:d<lockR,onscreen,dist,d,trackR};
}

const encounterGeometryBase=geometry;
geometry=function(){
  if(!enemyAlive&&encounter.phase==='active')return strikeGeometry();
  return encounterGeometryBase();
};

const encounterRangeBase=updateRange;
updateRange=function(dt){
  if(!enemyAlive&&encounter.phase==='active'){
    const d=ship.position.distanceTo(encounter.targetPos),instant=(encounter.lastRange-d)/Math.max(dt,.001)*FEET_PER_UNIT;
    encounter.lastRange=d;rangeFeet=d*FEET_PER_UNIT;
    displayRangeFeet=THREE.MathUtils.lerp(displayRangeFeet,rangeFeet,1-Math.exp(-dt/.055));
    closureFps=THREE.MathUtils.lerp(closureFps,instant,1-Math.exp(-dt/.22));return;
  }
  encounterRangeBase(dt);
};

const encounterTargetingBase=updateTargeting;
updateTargeting=function(dt){
  if(encounter.kind&&encounterBlocked()){stopRadarCarrier();silence();return;}
  encounterTargetingBase(dt);
  if(!enemyAlive&&encounter.phase==='active'){
    if(!encounter.callout&&!seeker){coachText.textContent='AIRSPACE QUIET';coachSub.textContent='';return;}
    const ft=Math.max(0,Math.round(displayRangeFeet/10)*10);
    if(!seeker){
      coachText.textContent=encounter.tracking?(encounter.surfaceShot?'SURFACE MISSILE':encounter.paint>=1.5?'TRACKED':'RADAR PAINT'):'HOLD X — DESIGNATE';
      coachSub.textContent=encounter.tracking?'BREAK AWAY OR HOLD X — STRIKE · '+ft+' FT':'OPTIONAL STRIKE · RADAR EMITTER · '+ft+' FT';
    }else if(lockState===2){
      coachText.textContent='GROUND LOCK';
      coachSub.textContent=ft+' FT · RELEASE X — FIRE';
    }else if(lockState===1){
      coachText.textContent='DESIGNATOR TRACKING';
      coachSub.textContent=ft+' FT · HOLD X · KEEP SITE IN RING';
    }else{
      coachText.textContent='DESIGNATOR UNCAGED';
      coachSub.textContent='BRING RADAR SITE INTO THE RING · '+ft+' FT';
    }
  }else if(encounter.phase==='quiet'){
    coachText.textContent='AIRSPACE QUIET';
    coachSub.textContent='FLY THE AIRFRAME';
  }
};

function fireStrikeMissile(){
  if(encounterBlocked()||encounter.phase!=='active'||enemyAlive||missile||missileRearm>0||lockState!==2)return;
  const m=new THREE.Group(),
    body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,2.4,8),new THREE.MeshStandardMaterial({color:0xe8ded0,metalness:.35,roughness:.45})),
    flame=new THREE.Mesh(new THREE.ConeGeometry(.14,1.4,8),new THREE.MeshBasicMaterial({color:0xff7b31,transparent:true,opacity:.9}));
  body.rotation.x=Math.PI/2;m.add(body);flame.rotation.x=-Math.PI/2;flame.position.z=1.7;flame.visible=false;m.add(flame);
  m.position.copy(ship.position).add(new THREE.Vector3(5,-.2,-1.5).applyQuaternion(ship.quaternion));m.quaternion.copy(ship.quaternion);scene.add(m);
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion);
  missile={mesh:m,flame,v:forward.multiplyScalar(speed*.9).addScaledVector(worldUp,-16),life:5.2,guided:false,age:0,trailClock:0,ignited:false,igniteAt:.09,strikeTarget:true};
  missileRearm=1.2;announce('GROUND WEAPON AWAY');chirp(175,.075,.045);chirp(62,.11,.033,.012);setSeeker(false);
}

const encounterFireMissileBase=fireMissile;
fireMissile=function(){
  if(!enemyAlive&&encounter.phase==='active'){fireStrikeMissile();return;}
  encounterFireMissileBase();
};

const encounterWeaponsBase=updateWeapons;
updateWeapons=function(dt){
  if(encounter.kind&&encounterBlocked()){stopRadarCarrier();return;}
  const strike=missile&&missile.strikeTarget?missile:null;
  const previous=strike?strike.mesh.position.clone():null;
  if(strike&&strike.ignited&&encounter.phase==='active'){
    const aim=encounter.targetPos.clone().addScaledVector(worldUp,-1.5).sub(strike.mesh.position).normalize().multiplyScalar(305);
    strike.v.lerp(aim,1-Math.exp(-dt*5.6));
    strike.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),strike.v.clone().normalize());
  }
  encounterWeaponsBase(dt);
  if(encounterBlocked()||!strike||missile!==strike||encounter.phase!=='active')return;
  const travel=strike.mesh.position.clone().sub(previous),toTarget=encounter.targetPos.clone().sub(previous);
  const u=THREE.MathUtils.clamp(toTarget.dot(travel)/Math.max(travel.lengthSq(),.001),0,1);
  const closest=previous.clone().addScaledVector(travel,u);
  const terrain=terrainHeight(strike.mesh.position.x,strike.mesh.position.z);
  if(closest.distanceToSquared(encounter.targetPos)<144){groundStrikeImpact();return;}
  if(strike.mesh.position.y<=terrain+2.5){
    const missPos=strike.mesh.position.clone();removeMissile();
    flashScreen(.08);chirp(92,.08,.026);announce('IMPACT — NO EFFECT');
    for(let i=0;i<7;i++){
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(.16+Math.random()*.28,5,4),new THREE.MeshBasicMaterial({color:i%2?0xffa14f:0xffe0a1,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));
      mesh.position.copy(missPos);scene.add(mesh);
      const v=new THREE.Vector3(Math.random()-.5,.2+Math.random()*.6,Math.random()-.5).normalize().multiplyScalar(7+Math.random()*14),life=.28+Math.random()*.22;
      combatFX.push({encounterOwned:true,mesh,v,life,maxLife:life,smoke:false});
    }
  }
};

// Keep strike aftermath frozen behind terminal/transition UI too.
const encounterCombatFXBase=updateCombatFX;
updateCombatFX=function(dt){if(encounter.kind&&encounterBlocked())return;encounterCombatFXBase(dt);};

const encounterExplodeBase=explode;
explode=function(){
  const beforeKills=kills,beforeWorld=worldIndex;
  encounterExplodeBase();
  if(beforeWorld===0&&beforeKills===0&&kills===1&&!encounter.offered)beginRadarOpportunity();
};

const encounterEnemyBase=updateEnemy;
updateEnemy=function(dt){
  updateEncounter(dt);
  if(!enemyAlive&&(encounter.phase==='quiet'||encounter.phase==='active'||encounter.phase==='egress'))return;
  encounterEnemyBase(dt);
};

const encounterResetBase=reset;
reset=function(){resetEncounter(true);encounterResetBase();};
const encounterAlpineBase=deployAlpine;
deployAlpine=function(){resetEncounter(false);encounter.offered=true;encounterAlpineBase();};
const encounterTempestBase=deployTempest;
deployTempest=function(){resetEncounter(false);encounter.offered=true;encounterTempestBase();};
