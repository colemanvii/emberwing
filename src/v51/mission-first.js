// Emberwing V51 — Mission First
// Tiny HUD/directorial pass: a distant interceptor should pressure the strike,
// not hijack the player's eyes away from the objective.
// Close/rear threats still take priority. Holding X still lets the player work A-A normally.

const v51={
 lastMissionCue:-99
};

function v51PlaceObjectiveMarker(pos,label){
 const local=pos.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());
 const front=local.z<0,p=pos.clone().project(camera),ons=front&&Math.abs(p.x)<.86&&Math.abs(p.y)<.76;
 const cx=innerWidth*.5,cy=innerHeight*.42;
 let x,y;
 if(ons){
  x=(p.x*.5+.5)*innerWidth;y=(-p.y*.5+.5)*innerHeight;
  targetUI.dataset.stack='';
 }else{
  const az=Math.atan2(local.x,-local.z),flat=Math.max(1,Math.hypot(local.x,local.z));
  let dx=Math.sin(az),dy=-THREE.MathUtils.clamp(local.y/flat,-.82,.82);
  const mag=Math.max(.001,Math.hypot(dx,dy));dx/=mag;dy/=mag;
  const radius=Math.min(innerWidth,innerHeight)*.3;
  x=cx+dx*radius;y=cy+dy*radius;
  targetUI.dataset.stack=local.y>flat*.11?'▲':local.y<-flat*.11?'▼':'·';
 }
 guideX=x;guideY=y;
 targetUI.style.left=x+'px';targetUI.style.top=y+'px';
 targetUI.dataset.owner='mission';
 targetUI.dataset.range=label+' · '+Math.round(pos.distanceTo(ship.position)*FEET_PER_UNIT/10)*10+' FT';
 targetUI.style.opacity='.6';
 targetUI.className=ons?'':'offscreen';
}

const v51GuidanceBase=updateGuidance;
updateGuidance=function(){
 v51GuidanceBase();

 if(worldIndex!==0||missionBriefActive||crashed||missionComplete||seeker||v49.groundPriority)return;
 if(!enemyAlive||!enemyDetected)return;

 const range=enemy.position.distanceTo(ship.position);
 const toPlayer=ship.position.clone().sub(enemy.position).normalize();
 const shipForward=new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion);
 const enemyForwardNow=new THREE.Vector3(0,0,-1).applyQuaternion(enemy.quaternion);
 const rear=range<460&&shipForward.dot(toPlayer)>.55&&enemyForwardNow.dot(toPlayer)>.65;

 // Close/rear threats deserve attention. Everything else is background pressure.
 if(rear||range<620)return;

 let pos,label;
 if(v41.launch.destroyed){pos=v45.passPoint;label='HIGH PASS';}
 else if(v41.launch.active){pos=encounter.targetPos;label='LAUNCH VEHICLE';}
 else if(!v41.radarDestroyed&&encounter.kind==='radar'&&encounter.phase==='active'&&encounter.callout){pos=encounter.targetPos;label='RADAR';}
 else{pos=v42MissionObjective();label='NORTH';}

 if(!pos)return;
 v51PlaceObjectiveMarker(pos,label);

 // One restrained reminder when the HUD deliberately refuses to make a distant
 // fighter the center of the player's world.
 if(missionElapsed-v51.lastMissionCue>12){
  v51.lastMissionCue=missionElapsed;
  coachText.textContent='STAY ON MISSION';
  coachSub.textContent=label==='HIGH PASS'?'KEEP NORTH':label==='LAUNCH VEHICLE'?'TARGET HAS PRIORITY':'KEEP PRESSING';
 }
};

const v51ResetBase=reset;
reset=function(){v51.lastMissionCue=-99;v51ResetBase();};
