// V40 mission beats: input hygiene, a physical traversal, and brief coach cues.
// No flight, camera, weapon or audio functions are modified.
function releaseMissionInputs(){
 for(const code in keys)keys[code]=false;
 releaseTouch();
}
function reconcileModifiers(e,down){
 if(e.metaKey||e.ctrlKey){releaseMissionInputs();return;}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight'){keys[e.code]=down;if(!down&&e.shiftKey===false)keys.ShiftLeft=keys.ShiftRight=false;return;}
 if(e.shiftKey===false)keys.ShiftLeft=keys.ShiftRight=false;
}
addEventListener('keydown',e=>reconcileModifiers(e,true));
addEventListener('keyup',e=>reconcileModifiers(e,false));
addEventListener('blur',releaseMissionInputs);
addEventListener('focus',releaseMissionInputs);
addEventListener('pagehide',releaseMissionInputs);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseMissionInputs();});
// Pointer events also expose the real modifier state after OS shortcuts.
for(const type of ['pointermove','pointerdown','pointerup'])addEventListener(type,e=>{if(e.metaKey||e.ctrlKey)releaseMissionInputs();else if(!e.shiftKey)keys.ShiftLeft=keys.ShiftRight=false;});

// One reused landmark; a broad, structural opening, not a glowing checkpoint.
for(const child of [...alpineRelay.children])alpineRelay.remove(child);
const relaySteel=new THREE.MeshStandardMaterial({color:0x555e60,roughness:.78,metalness:.45});
const relayBars=[];
for(const [x,y,z,w,h,d] of [[-55,-25,0,10,150,24],[55,-25,0,10,150,24],[0,50,0,120,10,24],[0,-50,0,120,10,24]]){
 const beam=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),relaySteel);beam.position.set(x,y,z);alpineRelay.add(beam);
 relayBars.push({min:new THREE.Vector3(x-w/2,y-h/2,z-d/2),max:new THREE.Vector3(x+w/2,y+h/2,z+d/2)});
}
const relayPass={cleared:false,previous:new THREE.Vector3(),ready:false};
const missionControl={task:'',until:0,line:'',sub:'',lastNudge:-100};
function resetMissionBeat(){releaseMissionInputs();relayPass.cleared=false;relayPass.ready=false;missionControl.task='';missionControl.until=0;missionControl.lastNudge=-100;}
const missionResetBase=reset;
reset=function(){resetMissionBeat();missionResetBase();};
const missionAlpineBase=deployAlpine;
deployAlpine=function(){resetMissionBeat();missionAlpineBase();};
const missionTempestBase=deployTempest;
deployTempest=function(){resetMissionBeat();missionTempestBase();};
function missionCue(line,sub){missionControl.line=line;missionControl.sub=sub;missionControl.until=missionElapsed+4;}
// Swept center segment prevents missed crossings at boost/low frame rates.
function segmentHitsRelay(a,b,box){
 let low=0,high=1;
 for(const axis of ['x','y','z']){
  const margin=axis==='x'?12:axis==='y'?2:6,min=box.min[axis]-margin,max=box.max[axis]+margin,delta=b[axis]-a[axis];
  if(Math.abs(delta)<1e-8){if(a[axis]<min||a[axis]>max)return false;continue;}
  let t0=(min-a[axis])/delta,t1=(max-a[axis])/delta;if(t0>t1)[t0,t1]=[t1,t0];low=Math.max(low,t0);high=Math.min(high,t1);if(low>high)return false;
 }
 return true;
}
function updateRelayPass(){
 if(worldIndex!==1||encounterBlocked()){relayPass.ready=false;return;}
 const local=ship.position.clone().sub(alpineRelay.position);
 if(relayPass.ready){
  const previous=relayPass.previous;
  for(const box of relayBars)if(segmentHitsRelay(previous,local,box)){crashNow('RELAY IMPACT');return;}
  // Cross the far face, not merely the center, so the whole airframe clears.
  if(!relayPass.cleared&&previous.z>-20&&local.z<=-20){
   const t=(previous.z+20)/(previous.z-local.z),x=THREE.MathUtils.lerp(previous.x,local.x,t),y=THREE.MathUtils.lerp(previous.y,local.y,t);
   if(Math.abs(x)<37&&Math.abs(y)<40){relayPass.cleared=true;missionCue('RELAY CLEARED','RESUME COURSE');}
  }
 }
 relayPass.previous.copy(local);relayPass.ready=true;
}
const missionWorldBase=updateWorld;
updateWorld=function(){missionWorldBase();updateRelayPass();};
const missionGuidanceBase=updateGuidance;
updateGuidance=function(){
 missionGuidanceBase();if(encounterBlocked())return;
 const owner=targetUI.dataset.owner;
 // Rear threats, strike controls and active designation retain the coach.
 if(owner==='rear'||owner==='radar'||seeker)return;
 const task=owner==='bandit'?'contact':owner==='challenge'?'relay':'course'+worldIndex;
 if(task!==missionControl.task){
  const previous=missionControl.task;missionControl.task=task;
  if(task==='contact'){
   const local=enemy.position.clone().sub(ship.position).applyQuaternion(ship.quaternion.clone().invert());
   const clock=((Math.round(Math.atan2(local.x,-local.z)*6/Math.PI)+12)%12)||12;
   missionCue('CONTACT — '+clock+" O’CLOCK",'INTERCEPT AUTHORIZED');
  }else if(task==='relay')missionCue('HIGH PASS RELAY AHEAD','TAKE THE GAP');
  else if(missionElapsed>=missionControl.until)missionCue(previous==='contact'?'AIRSPACE CLEAR':'AIRSPACE QUIET','CONTINUE TO '+destinations[worldIndex].name);
 }
 if(task==='relay'&&missionElapsed>=missionControl.until&&missionElapsed-missionControl.lastNudge>20){
  const to=alpineRelay.position.clone().sub(ship.position);if(to.dot(heading())<0){missionCue('RELAY NOT CLEARED','RETURN TO SOUTH APPROACH');missionControl.lastNudge=missionElapsed;}
 }
 if(missionElapsed<missionControl.until){coachText.textContent=missionControl.line;coachSub.textContent=missionControl.sub;}
};
// Desert mission identity: make the Launch Complex read like a real flight-test installation,
// not a ladder. This is presentation only; mission position and flight authority are untouched.
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

// Small, readable US markings on the canted tail surfaces.

const flagCanvas=document.createElement('canvas');flagCanvas.width=190;flagCanvas.height=100;
const flagContext=flagCanvas.getContext('2d');
for(let row=0;row<13;row++){flagContext.fillStyle=row%2?'#b8b9b0':'#80565a';flagContext.fillRect(0,row*100/13,190,100/13+1);}
flagContext.fillStyle='#435360';flagContext.fillRect(0,0,76,700/13);
flagContext.fillStyle='#c1c3b8';for(let row=0;row<9;row++)for(let col=0;col<(row%2?5:6);col++){flagContext.beginPath();const x=7+col*12+(row%2?6:0),y=5+row*5.5;for(let p=0;p<10;p++){const a=p*Math.PI/5-Math.PI/2,r=p%2?1:2.4;flagContext.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}flagContext.closePath();flagContext.fill();}
const flagTexture=new THREE.CanvasTexture(flagCanvas);flagTexture.colorSpace=THREE.SRGBColorSpace;
const flagMaterial=new THREE.MeshStandardMaterial({map:flagTexture,roughness:.62,metalness:.06,emissive:0x151515,emissiveIntensity:.12,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
function addTailFlag(side){
 const s=side<0?-1:1;
 const a=new THREE.Vector3(s*1.62,.38,.4),b=new THREE.Vector3(s*3.05,1.75,2.55),c=new THREE.Vector3(s*3.18,1.77,3.3);
 const normal=new THREE.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();
 const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.68,.88),flagMaterial.clone());
 flag.name='US flag tail marking';
 flag.position.set(s*2.58,1.18,2.72).addScaledVector(normal,.035);
 flag.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
 ship.add(flag);
}
addTailFlag(-1);addTailFlag(1);
// Opening operational brief: enough context to understand the sortie without lore bloat.
const missionBrief=document.createElement('div');
missionBrief.id='missionBrief';
missionBrief.innerHTML=`<div class="briefFrame">
  <div class="briefProgram">JFTD-7 // EW-01 // EYES ONLY</div>
  <div class="briefRule"></div>
  <div class="briefKicker">OPERATION DISTANT THUNDER</div>
  <div class="briefTitle">DESERT CORRIDOR</div>
  <div class="briefAlert">HOSTILE LAUNCH COMPLEX ACTIVE</div>
  <div class="briefIntel">AIR DEFENSE PATROLS + RADAR EMITTER IN SECTOR</div>
  <div class="briefObjective">MISSION</div>
  <div class="briefOrders">
    <span>PENETRATE THE VALLEY</span>
    <span>NEUTRALIZE AIR COVER</span>
    <span>SUPPRESS AIR DEFENSE RADAR</span>
    <span>DISRUPT LAUNCH OPERATIONS</span>
    <span>EXIT NORTH THROUGH HIGH PASS</span>
  </div>
  <button id="briefDeploy" type="button"><b>EW-01</b> // CLEARED HOT</button>
</div>`;
document.body.appendChild(missionBrief);
let missionBriefActive=true;
function dismissMissionBrief(){
 if(!missionBriefActive)return;
 missionBriefActive=false;releaseMissionInputs();
 missionElapsed=citySplit=alpineSplit=finalTime=0;
 audio();chirp(480,.055,.026);chirp(760,.09,.024,.07);
 missionBrief.classList.add('depart');
 missionControl.task='';missionCue('LAUNCH COMPLEX ACTIVE','PENETRATE THE VALLEY');
 setTimeout(()=>missionBrief.style.display='none',720);
 renderer.domElement.focus();focusUI.style.opacity='0';
}
missionBrief.querySelector('#briefDeploy').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();dismissMissionBrief();});
missionBrief.addEventListener('pointerdown',e=>e.stopPropagation());
const briefingKeyBase=key;
key=function(e,down){
 if(missionBriefActive){
  if(down&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();dismissMissionBrief();}
  else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyZ','KeyX','Space','KeyR'].includes(e.code))e.preventDefault();
  return;
 }
 briefingKeyBase(e,down);
};
// Freeze tactical state behind the brief; scenery can remain alive.
const briefingFlightBase=updateFlight;updateFlight=function(dt){if(missionBriefActive)return;briefingFlightBase(dt);};
const briefingDangerBase=updateDanger;updateDanger=function(dt){if(missionBriefActive)return;briefingDangerBase(dt);};
const briefingEnemyBase=updateEnemy;updateEnemy=function(dt){if(missionBriefActive)return;briefingEnemyBase(dt);};
const briefingAttackBase=updateEnemyAttack;updateEnemyAttack=function(dt){if(missionBriefActive)return;briefingAttackBase(dt);};
const briefingMissionBase=updateMission;updateMission=function(dt){if(missionBriefActive)return;briefingMissionBase(dt);};
const briefingWeaponsBase=updateWeapons;updateWeapons=function(dt){if(missionBriefActive)return;briefingWeaponsBase(dt);};
queueMicrotask(()=>{if(worldIndex===0){missionBrief.classList.add('show');releaseMissionInputs();}else{missionBriefActive=false;missionBrief.style.display='none';}});

// After the radar strike, reconnect the action to the hostile launch site.
const briefRadarFinishBase=finishRadarOpportunity;
finishRadarOpportunity=function(status){
 briefRadarFinishBase(status);
 if(status==='destroyed'&&worldIndex===0){missionControl.task='';missionCue('LAUNCH DEFENSES DEGRADED','CONTINUE TO LAUNCH COMPLEX');}
};

// Hold only the existing Alpine transition until the physical route is complete.
const missionExplodeBase=explode;
explode=function(){missionExplodeBase();if(worldIndex===1&&!relayPass.cleared&&kills>=MISSION_KILLS){missionCompleteTimer=0;respawn=999999;objective.textContent='RELAY PASS REQUIRED';}};
const relayMissionBase=updateMission;
updateMission=function(dt){
 if(worldIndex===1&&!relayPass.cleared&&kills>=MISSION_KILLS){missionCompleteTimer=0;respawn=999999;return;}
 if(worldIndex===1&&relayPass.cleared&&kills>=MISSION_KILLS&&missionCompleteTimer<=0&&!missionComplete&&!crashed){alpineSplit=missionElapsed-citySplit;missionCompleteTimer=4.2;}
 relayMissionBase(dt);
};
