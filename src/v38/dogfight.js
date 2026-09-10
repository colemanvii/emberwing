// Geometry-led encounters. Player handling, weapons, terrain and airframe stay pinned.
const duel={state:'extend',age:0,pursuit:0,cooldown:0,side:1,reversed:false,merged:false,pressure:0,speed:112,
 course:new THREE.Vector3(0,0,-1),forward:new THREE.Vector3(),playerForward:new THREE.Vector3(),toPlayer:new THREE.Vector3(),right:new THREE.Vector3(),intent:new THREE.Vector3(),aim:new THREE.Vector3(),q:new THREE.Quaternion()};
function duelState(state){
 const previous=duel.state;duel.state=state;duel.age=0;duel.merged=false;duel.reversed=false;duel.course.copy(duel.forward);
 if(state==='extend'&&previous!=='extend')duel.course.applyAxisAngle(worldUp,duel.side*.95).normalize();
 if(state==='break'){duel.pursuit=0;duel.cooldown=8;duel.side*=-1;}
 if(state==='engage')announce('BANDIT TURNING IN');
 if(state==='break')announce('BANDIT BREAKING');
 if(state==='extend'&&previous==='press')announce('BANDIT EXTENDING');
}
const spawnDuelBase=spawnEnemy;
spawnEnemy=function(first=false){spawnDuelBase(first);duel.forward.set(0,0,-1).applyQuaternion(enemy.quaternion);duelState('extend');duel.course.copy(duel.forward);duel.pursuit=duel.pressure=duel.cooldown=0;duel.speed=enemyRole==='ROOKIE'?108:118;duel.side=(kills+worldIndex)%2?1:-1;resetEnemyAttack(first?4:2.5);};
const inactiveDuelBase=updateEnemy;
updateEnemy=function(dt){
 if(!enemyAlive){inactiveDuelBase(dt);return;}
 if(crashed||missionComplete||missionCompleteTimer>0)return;
 lastEnemy.copy(enemy.position);enemyTime+=dt;duel.age+=dt;duel.cooldown=Math.max(0,duel.cooldown-dt);
 const f=duel.forward.set(0,0,-1).applyQuaternion(enemy.quaternion).normalize();
 const pf=duel.playerForward.set(0,0,-1).applyQuaternion(ship.quaternion).normalize();
 const to=duel.toPlayer.copy(ship.position).sub(enemy.position),range=to.length();to.multiplyScalar(1/Math.max(range,.001));
 const facing=f.dot(to),behind=pf.dot(to),tail=range<240&&range>25&&facing<-.65&&behind<-.75;
 duel.pursuit=tail?duel.pursuit+dt:Math.max(0,duel.pursuit-dt*2);
 duel.pressure=behind>.55&&facing>.65&&range<460?duel.pressure+dt:Math.max(0,duel.pressure-dt*2);
 if(duel.pursuit>(enemyRole==='ROOKIE'?2.5:1.65)&&duel.cooldown<=0&&duel.state!=='break')duelState('break');
 if(duel.state==='extend'&&duel.age>(firstTarget?3.8:3.1)&&(range>310||duel.age>5.5))duelState('engage');
 if(duel.state==='engage'){
  if(range<100)duel.merged=true;
  if(duel.pressure>.35)duelState('press');
  else if((duel.merged&&range>155&&facing<.2)||duel.age>9){duelState('extend');duel.side*=-1;}
 }
 if(duel.state==='break'){
  if(behind>.35&&duel.age>.65)duelState('press');
  else if(duel.age>1.55&&!duel.reversed&&tail){duel.side*=-1;duel.reversed=true;}
  if(duel.state==='break'&&duel.age>3.2)duelState('engage');
 }
 if(duel.state==='press'&&(duel.age>6.5||(duel.age>1.8&&(range>540||behind<-.25))))duelState('extend');
 const intent=duel.intent,right=duel.right.crossVectors(pf,worldUp).normalize();
 let targetSpeed=enemyRole==='ROOKIE'?110:enemyRole==='ACE'?130:120,turn=enemyRole==='ROOKIE'?1.05:1.35;
 if(duel.state==='extend'){
  intent.copy(duel.course);targetSpeed+=8;
 }else if(duel.state==='break'){
  right.crossVectors(duel.course,worldUp).normalize();
  intent.copy(duel.course).multiplyScalar(.2).addScaledVector(right,duel.side);
  targetSpeed=enemyRole==='ROOKIE'?91:87;turn=1.95;
 }else{
  // A lateral offset creates an oblique merge; fade it near contact so passes stay close.
  const offset=duel.state==='engage'?duel.side*Math.min(95,range*.23):0;
  duel.aim.copy(ship.position).addScaledVector(pf,Math.min(range/(targetSpeed+speed),.65)*speed).addScaledVector(right,offset);
  intent.copy(duel.aim).sub(enemy.position);
  if(duel.state==='engage'&&behind>.3&&range>400)targetSpeed=138;
  if(duel.state==='press'){targetSpeed=Math.min(134,Math.max(100,speed+(range>160?7:-8)));turn=1.25;}
 }
 const clearance=enemyRole==='SKIMMER'?42:enemyRole==='CLIMBER'?90:62;
 // Stay in the player's altitude band; a climber's modest high-side pass is bounded.
 const altitude=Math.max(terrainHeight(enemy.position.x,enemy.position.z)+clearance,ship.position.y+(enemyRole==='CLIMBER'&&duel.state==='engage'?55:8));
 intent.normalize();intent.y=THREE.MathUtils.clamp((altitude-enemy.position.y)/210,-.28,.34);intent.normalize();
 const dir=steerAroundObstacles(enemy.position,intent,clearance);
 duel.q.setFromUnitVectors(new THREE.Vector3(0,0,-1),dir);
 // Bounded angular speed prevents instantaneous flips at the merge.
 enemy.quaternion.rotateTowards(duel.q,turn*dt);
 duel.speed=THREE.MathUtils.lerp(duel.speed,targetSpeed,1-Math.exp(-dt/.65));
 enemy.position.addScaledVector(duel.forward.set(0,0,-1).applyQuaternion(enemy.quaternion),duel.speed*dt);
 enemy.position.y=Math.max(enemy.position.y,terrainHeight(enemy.position.x,enemy.position.z)+16);
 separateEnemyFromObstacles();enemyVel.copy(enemy.position).sub(lastEnemy).divideScalar(Math.max(dt,.001));
 enemyCourse.copy(duel.forward);
};
// Existing tracers/damage, with a longer warning and breathing room for the easier roles.
enemyFireSolution=function(){
 if(!enemyAlive||crashed||missionComplete||missionCompleteTimer>0||enemyTime<3||duel.state==='extend'||duel.state==='break')return false;
 const aim=ship.position.clone().sub(enemy.position),range=aim.length();
 if(range<80||range>(enemyRole==='ACE'?500:420))return false;
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(enemy.quaternion);
 return forward.dot(aim.multiplyScalar(1/Math.max(range,.001)))>(enemyRole==='ACE'?.94:.97)&&enemyLOS();
};
// Keep the existing edge-of-screen locator, and make a genuine rear threat explicit.
const duelGuidanceBase=updateGuidance;
updateGuidance=function(){
 duelGuidanceBase();
 if(!enemyAlive||crashed||missionComplete)return;
 const behind=duel.playerForward.dot(duel.toPlayer)>.55,range=enemy.position.distanceTo(ship.position);
 if(behind&&range<460&&duel.forward.dot(duel.toPlayer)>.65){
  targetUI.dataset.range='ON YOUR SIX · '+Math.round(displayRangeFeet)+' FT';targetUI.style.opacity='1';
  if(!seeker){coachText.textContent='BANDIT ON YOUR SIX';coachSub.textContent='BREAK / REVERSE / BOOST';}
 }else if(!seeker&&duel.state==='engage'&&range>240){coachSub.textContent='BANDIT TURNING IN · '+Math.round(displayRangeFeet)+' FT';}
};
