// Emberwing V42 — Terrain Masking + Heading Tape
// V42 is a realism pass over V41. No flight-control, camera, turbo or weapon changes.
// Principle: terrain breaks radar line of sight; low altitude reduces acquisition quality
// but is never a magic invisibility threshold.

const v42={
 threatBearing:null,
 threatUntil:0,
 compass:null,
 objectiveBug:null,
 threatBug:null,
 readout:null,
 ticks:[]
};

// One-way mission geometry. A successful Desert run keeps pushing north:
// ingress -> radar -> launch vehicle -> high-pass egress. No backtracking.
const v42Corridor={
 radar:new THREE.Vector3(-55,0,-1880),
 launch:new THREE.Vector3(-120,0,-3050),
 egress:new THREE.Vector3(180,0,-5200)
};
function placeV42Corridor(){
 const ly=terrainHeight(v42Corridor.launch.x,v42Corridor.launch.z);
 launchSite.position.set(v42Corridor.launch.x,ly+92,v42Corridor.launch.z);
 v41.launchDestination.set(v42Corridor.launch.x,ly,v42Corridor.launch.z);
 v41EgressPoint.copy(v42Corridor.egress);
 v41EgressPoint.y=terrainHeight(v41EgressPoint.x,v41EgressPoint.z)+115;
 destinations[0].name='LAUNCH COMPLEX';
 destinations[0].position.copy(v41.launchDestination);
}
placeV42Corridor();

// Override the inherited radar staging so it lies BEFORE the launch complex on
// the same northbound penetration corridor instead of appearing off-route.
stagePersistentRadarSite=function(){
 if(worldIndex!==0||encounter.group||encounter.wreck)return;
 const x=v42Corridor.radar.x,z=v42Corridor.radar.z,y=terrainHeight(x,z);
 encounter.targetPos.set(x,y+9,z);
 encounter.group=makeRadarInstallation();
 encounter.group.position.set(x,y+.15,z);
 encounter.group.rotation.y=.12;
 encounter.group.scale.setScalar(1.35);
 scene.add(encounter.group);
 encounter.lastRange=ship.position.distanceTo(encounter.targetPos);
};

// Plain-language aviation wording: "north" now maps to an actual cockpit instrument.
if(typeof missionBrief!=='undefined'&&missionBrief){
 const orders=[...missionBrief.querySelectorAll('.briefOrders span')];
 if(orders[4])orders[4].textContent='EGRESS NORTH THROUGH HIGH PASS';
}

// ----- Quiet heading tape -----
const headingTape=document.createElement('div');
headingTape.id='headingTape';
headingTape.innerHTML='<div class="headingTrack"></div><div class="headingCaret"></div><div class="headingReadout">HDG 000</div><div class="headingObjective">OBJ</div><div class="headingThreat">SAM</div>';
document.body.appendChild(headingTape);
const headingTrack=headingTape.querySelector('.headingTrack');
v42.readout=headingTape.querySelector('.headingReadout');
v42.objectiveBug=headingTape.querySelector('.headingObjective');
v42.threatBug=headingTape.querySelector('.headingThreat');

function v42NormDeg(d){d%=360;if(d<0)d+=360;return d;}
function v42DeltaDeg(target,current){let d=v42NormDeg(target)-v42NormDeg(current);if(d>180)d-=360;if(d<-180)d+=360;return d;}
function v42HeadingDeg(){
 const f=new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion);
 f.y=0;if(f.lengthSq()<.0001)return 0;f.normalize();
 return v42NormDeg(THREE.MathUtils.radToDeg(Math.atan2(f.x,-f.z)));
}
function v42BearingDeg(pos){
 const dx=pos.x-ship.position.x,dz=pos.z-ship.position.z;
 return v42NormDeg(THREE.MathUtils.radToDeg(Math.atan2(dx,-dz)));
}
function v42CompassLabel(deg){
 const card={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};
 if(card[deg]!==undefined)return card[deg];
 return deg%30===0?String(deg).padStart(3,'0'):'';
}
for(let deg=0;deg<360;deg+=5){
 const tick=document.createElement('div');tick.className='headingTick';
 if(deg%10===0)tick.classList.add('major');
 if(deg%45===0)tick.classList.add('cardinal');
 tick.dataset.deg=deg;
 const label=v42CompassLabel(deg);
 if(label)tick.innerHTML='<span>'+label+'</span>';
 headingTrack.appendChild(tick);v42.ticks.push(tick);
}
function v42MissionObjective(){
 if(worldIndex===0){
  if(v41.launch.destroyed)return v41EgressPoint;
  if(v41.launch.active)return encounter.targetPos;
  if(!v41.radarDestroyed&&encounter.kind==='radar'&&encounter.phase==='active')return encounter.targetPos;
  return launchSite.position;
 }
 if(worldIndex===1&&!relayPass.cleared)return alpineRelay.position;
 return destinations[worldIndex].position;
}
function v42PlaceBearingBug(el,bearing,heading,label){
 const delta=v42DeltaDeg(bearing,heading),limit=67,clamped=THREE.MathUtils.clamp(delta,-limit,limit);
 el.style.left=(50+clamped/limit*47)+'%';
 el.style.opacity='1';
 el.textContent=(delta<-limit?'‹ ':delta>limit?' ›':'')+label+' '+String(Math.round(bearing)%360).padStart(3,'0');
 el.dataset.edge=Math.abs(delta)>limit?'1':'0';
}
function updateHeadingTape(){
 if(!v42.compass)v42.compass=true;
 if(missionBriefActive||crashed||missionComplete){headingTape.style.opacity='0';return;}
 headingTape.style.opacity='1';
 const hdg=v42HeadingDeg(),pxPerDeg=3.25;
 v42.readout.textContent='HDG '+String(Math.round(hdg)%360).padStart(3,'0');
 for(const tick of v42.ticks){
  const deg=Number(tick.dataset.deg),delta=v42DeltaDeg(deg,hdg);
  if(Math.abs(delta)>75){tick.style.display='none';continue;}
  tick.style.display='block';tick.style.left='calc(50% + '+(delta*pxPerDeg).toFixed(1)+'px)';
 }
 const objective=v42MissionObjective();
 if(objective)v42PlaceBearingBug(v42.objectiveBug,v42BearingDeg(objective),hdg,worldIndex===0&&v41.launch.destroyed?'EGRESS':'OBJ');
 else v42.objectiveBug.style.opacity='0';
 if(v42.threatBearing!==null&&missionElapsed<v42.threatUntil)v42PlaceBearingBug(v42.threatBug,v42.threatBearing,hdg,'SAM');
 else v42.threatBug.style.opacity='0';
}

// ----- Radar/SAM realism -----
// No altitude cutoff. Terrain is the binary mask. AGL only changes how quickly a
// clear-line-of-sight radar can build a usable track through ground clutter.
samCandidate=function(){
 const agl=Math.max(0,ship.position.y-terrainHeight(ship.position.x,ship.position.z));
 let best=null,bestScore=Infinity;
 for(const s of v41.sam.sites){
  if(s.disabled)continue;
  const range=s.position.distanceTo(ship.position),maxRange=v41.radarDestroyed?1550:1900;
  if(range>maxRange||!samLineClear(s))continue;
  // Very low flight is difficult to track but not invisible over open ground.
  // Above ~160 units AGL, ground-clutter benefit is mostly gone.
  const clutter=.16+.84*THREE.MathUtils.smoothstep(agl,18,165);
  const rangeQuality=THREE.MathUtils.clamp(1-(range/maxRange)*.34,.62,1);
  const exposure=clutter*rangeQuality;
  const score=range/Math.max(.18,exposure);
  if(score<bestScore){bestScore=score;best={site:s,range,agl,exposure};}
 }
 return best;
};

updateSamNetwork=function(dt){
 if(missionBriefActive||worldIndex!==0||crashed||missionComplete||missionCompleteTimer>0){removeSamMissile();return;}
 v41.sam.cooldown=Math.max(0,v41.sam.cooldown-dt);
 if(v41.sam.missile){updateSamMissile(dt);return;}
 const c=samCandidate();
 if(!c||v41.sam.cooldown>0){
  if(v41.sam.stage&&v41.sam.lock>.25&&missionElapsed-v41.sam.lastCue>1.2){
   announce('RADAR TRACK BROKEN — TERRAIN MASK');
   v41.sam.lastCue=missionElapsed;
  }
  v41.sam.lock=Math.max(0,v41.sam.lock-dt*2.15);
  if(v41.sam.lock<=.02){v41.sam.stage=0;v41.sam.site=null;}
  return;
 }
 v41.sam.site=c.site;
 const baseLock=v41.radarDestroyed?4.5:2.55;
 v41.sam.lock=Math.min(1,v41.sam.lock+dt/baseLock*c.exposure);
 if(v41.sam.stage===0){
  v41.sam.stage=1;
  announce(c.agl<70?'RADAR SEARCH — STAY IN THE TERRAIN':'RADAR SEARCH — GET LOW / USE TERRAIN');
  chirp(520,.045,.026);v41.sam.lastCue=missionElapsed;
 }else if(v41.sam.lock>.52&&v41.sam.stage===1){
  v41.sam.stage=2;
  announce('RADAR TRACK — BREAK LINE OF SIGHT');
  chirp(690,.05,.03);chirp(910,.05,.026,.1);v41.sam.lastCue=missionElapsed;
 }
 if(v41.sam.lock>=1)launchSam(c.site);
};

// Surface missiles remain physical after launch. Terrain impact defeats them;
// maneuvering changes miss geometry but "low altitude" never deletes a missile.
const v42LaunchSamBase=launchSam;
launchSam=function(site){
 v42.threatBearing=v42BearingDeg(site.position);
 v42.threatUntil=missionElapsed+4.2;
 v42LaunchSamBase(site);
};

// Mission Control teaches the geometry once, then trusts the player.
const v42DismissBase=dismissMissionBrief;
dismissMissionBrief=function(){
 v42DismissBase();
 if(worldIndex===0)missionCue('PUSH NORTH','USE TERRAIN / EXPECT INTERCEPTORS');
};

// Keep the compass alive as a quiet cockpit instrument, not a waypoint UI.
const v42WorldBase=updateWorld;
updateWorld=function(){
 v42WorldBase();
 updateHeadingTape();
};


// Reassert corridor geometry before each Desert reset. V41's reset then stages
// the persistent radar and SAM batteries around these fixed mission landmarks.
const v42ResetBase=reset;
reset=function(){
 placeV42Corridor();
 v42ResetBase();
};
