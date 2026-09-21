// Level 1 bandit flow: target opportunity first, threat second.
// The first ingress defender is staged visibly in the forward hemisphere so the
// player gets a clean guns decision before the ACE is allowed to become a pursuit problem.
let banditOfferActive=false,banditOfferClock=0;
const banditOfferDir=new THREE.Vector3(),banditOfferForward=new THREE.Vector3(),banditOfferRight=new THREE.Vector3(),banditOfferQ=new THREE.Quaternion();
const banditMissLead=new THREE.Vector3(),banditMissRight=new THREE.Vector3();

const banditFlowSpawnDefender=spawnDefender;
spawnDefender=function(escape=false){
 if(escape){banditOfferActive=false;banditFlowSpawnDefender(true);return;}
 const spec=activeVariant().bandit;
 spawnEnemy(true);
 enemyRole='ACE';
 const f=banditOfferForward.copy(heading()).normalize(),r=banditOfferRight.crossVectors(f,worldUp).normalize();
 const side=(entryRun%2?1:-1)*90;
 // Put the jet where the player can actually see and shoot it: roughly 11/1 o'clock,
 // not on a crossing vector that immediately flashes through six.
 enemy.position.copy(ship.position).addScaledVector(f,440).addScaledVector(r,side);
 enemy.position.y=Math.max(terrainHeight(enemy.position.x,enemy.position.z)+82,ship.position.y+18);
 banditOfferDir.copy(f).addScaledVector(r,-Math.sign(side)*.23).normalize();
 enemy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),banditOfferDir);
 enemyCourse.copy(banditOfferDir);duel.forward.copy(banditOfferDir);duel.course.copy(banditOfferDir);
 duel.state='extend';duel.age=0;duel.speed=185;duel.side=-Math.sign(side)||1;
 enemyDetected=true;enemyTime=0;enemyHP=enemyMaxHP=2;lastEnemy.copy(enemy.position);
 resetEnemyAttack(8);resetHostileThreat(99);
 banditOfferActive=true;banditOfferClock=5.5;banditReattackClock=6;
 announce('BANDIT AHEAD');
};

// During the opening offer, fly one legible crossing arc. Do not run the duel AI yet:
// no snap turn, no six-o'clock teleport, no hostile shot before the player has had a chance.
const banditFlowEnemyUpdate=updateEnemy;
updateEnemy=function(dt){
 if(!(banditOfferActive&&worldIndex===0&&enemyAlive&&!mission.destroyed&&!crashed&&!missionComplete)){
  banditFlowEnemyUpdate(dt);return;
 }
 lastEnemy.copy(enemy.position);enemyTime+=dt;banditOfferClock-=dt;
 const floor=terrainHeight(enemy.position.x,enemy.position.z)+70;
 const desiredY=Math.max(floor,ship.position.y+12);
 banditOfferDir.y=THREE.MathUtils.lerp(banditOfferDir.y,THREE.MathUtils.clamp((desiredY-enemy.position.y)/360,-.08,.10),1-Math.exp(-dt/.38));
 banditOfferDir.normalize();
 banditOfferQ.setFromUnitVectors(new THREE.Vector3(0,0,-1),banditOfferDir);
 enemy.quaternion.rotateTowards(banditOfferQ,.72*dt);
 duel.speed=THREE.MathUtils.lerp(duel.speed,188,1-Math.exp(-dt/.45));
 enemy.position.addScaledVector(banditOfferForward.set(0,0,-1).applyQuaternion(enemy.quaternion),duel.speed*dt);
 enemy.position.y=Math.max(enemy.position.y,terrainHeight(enemy.position.x,enemy.position.z)+18);
 separateEnemyFromObstacles();
 enemyVel.copy(enemy.position).sub(lastEnemy).divideScalar(Math.max(dt,.001));
 enemyCourse.copy(banditOfferForward);duel.forward.copy(banditOfferForward);
 if(banditOfferClock>0)return;
 banditOfferActive=false;

 // Missing the opening shot still creates a dangerous intercept, but not a mathematically
 // perfect merge. Aim through the near-future path with only a small energy advantage so a
 // real lateral break or terrain mask can spoil the pass without making straight flight safe.
 const playerForward=heading().clone(),right=banditMissRight.crossVectors(playerForward,worldUp).normalize();
 banditMissLead.copy(ship.position).addScaledVector(playerForward,175).addScaledVector(right,duel.side*78);
 banditMissLead.y=Math.max(terrainHeight(banditMissLead.x,banditMissLead.z)+72,ship.position.y+10);
 enemyCourse.copy(banditMissLead.sub(enemy.position).normalize());
 duel.forward.copy(enemyCourse);duel.course.copy(enemyCourse);duelState('engage');
 // Hand the bandit into combat with retained energy, not an arcade speed jump.
 // The duel AI can build speed from here, but the player should see acceleration rather than teleportation.
 duel.speed=Math.max(duel.speed,CRUISE_SPEED+8);
 banditReattackClock=.6;
 resetEnemyAttack(3);resetHostileThreat(99);
};

// Make cannon work feel generous without turning it into an aimbot. If the bandit is
// already near the nose, bend new tracers a little harder toward a short lead point.
const banditFlowMakeTracer=makeTracer;
makeTracer=function(side,salvo){
 const before=tracers.length;
 banditFlowMakeTracer(side,salvo);
 if(worldIndex!==0||!enemyAlive||mission.destroyed)return;
 const leadPoint=enemy.position.clone().addScaledVector(enemyVel,.10);
 for(let i=before;i<tracers.length;i++){
  const t=tracers[i];if(t.friendly===false)continue;
  const desired=leadPoint.clone().sub(t.mesh.position),range=desired.length();
  if(range<30||range>560)continue;
  desired.normalize();const current=t.velocity.clone().normalize(),angle=current.angleTo(desired);
  if(angle>.22)continue;
  const assist=THREE.MathUtils.lerp(.70,.42,THREE.MathUtils.smoothstep(range,140,560));
  const speedNow=t.velocity.length();t.velocity.copy(current.lerp(desired,assist).normalize().multiplyScalar(speedNow));
  t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),t.velocity.clone().normalize());
 }
};

const banditFlowReset=reset;
reset=function(){banditOfferActive=false;banditOfferClock=0;banditFlowReset();};
