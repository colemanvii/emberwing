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
// Small, muted flag painted on the upper aft fuselage; geometry stays unchanged.
const flagCanvas=document.createElement('canvas');flagCanvas.width=190;flagCanvas.height=100;
const flagContext=flagCanvas.getContext('2d');
for(let row=0;row<13;row++){flagContext.fillStyle=row%2?'#b8b9b0':'#80565a';flagContext.fillRect(0,row*100/13,190,100/13+1);}
flagContext.fillStyle='#435360';flagContext.fillRect(0,0,76,700/13);
flagContext.fillStyle='#c1c3b8';for(let row=0;row<9;row++)for(let col=0;col<(row%2?5:6);col++){flagContext.beginPath();const x=7+col*12+(row%2?6:0),y=5+row*5.5;for(let p=0;p<10;p++){const a=p*Math.PI/5-Math.PI/2,r=p%2?1:2.4;flagContext.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}flagContext.closePath();flagContext.fill();}
const flagTexture=new THREE.CanvasTexture(flagCanvas);flagTexture.colorSpace=THREE.SRGBColorSpace;
const flagMark=new THREE.Mesh(new THREE.PlaneGeometry(1.35,.71),new THREE.MeshStandardMaterial({map:flagTexture,roughness:.72,metalness:.1,polygonOffset:true,polygonOffsetFactor:-2}));
flagMark.name='Small US aft marking';flagMark.rotation.x=-Math.PI/2;flagMark.position.set(.3,.53,1.7);ship.add(flagMark);
// Hold only the existing Alpine transition until the physical route is complete.
const missionExplodeBase=explode;
explode=function(){missionExplodeBase();if(worldIndex===1&&!relayPass.cleared&&kills>=MISSION_KILLS){missionCompleteTimer=0;respawn=999999;objective.textContent='RELAY PASS REQUIRED';}};
const relayMissionBase=updateMission;
updateMission=function(dt){
 if(worldIndex===1&&!relayPass.cleared&&kills>=MISSION_KILLS){missionCompleteTimer=0;respawn=999999;return;}
 if(worldIndex===1&&relayPass.cleared&&kills>=MISSION_KILLS&&missionCompleteTimer<=0&&!missionComplete&&!crashed){alpineSplit=missionElapsed-citySplit;missionCompleteTimer=4.2;}
 relayMissionBase(dt);
};
