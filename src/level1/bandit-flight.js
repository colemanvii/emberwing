// Level 1 ACE motion pass: preserve aggression, remove micro-jink noise.
// This wraps the core enemy update before mission.js adds its authored reattack logic.
const level1ArcEnemyUpdate=updateEnemy;
const level1ArcBefore=new THREE.Vector3(),level1ArcRaw=new THREE.Vector3(),level1ArcDir=new THREE.Vector3(),level1ArcVisible=new THREE.Vector3(),level1ArcQ=new THREE.Quaternion();
let level1ArcReady=false;
updateEnemy=function(dt){
 const compose=worldIndex===0&&enemyAlive&&enemyRole==='ACE'&&!crashed&&!missionComplete;
 if(!compose){level1ArcReady=false;level1ArcEnemyUpdate(dt);return;}
 level1ArcBefore.copy(enemy.position);
 level1ArcEnemyUpdate(dt);
 if(!enemyAlive||crashed||missionComplete){level1ArcReady=false;return;}
 const travel=level1ArcRaw.copy(enemy.position).sub(level1ArcBefore).length();
 if(travel<.001)return;
 level1ArcRaw.multiplyScalar(1/travel);
 if(!level1ArcReady){level1ArcDir.copy(level1ArcRaw);level1ArcReady=true;}
 else{
  const range=enemy.position.distanceTo(ship.position),tau=range<180?.11:.22;
  level1ArcDir.lerp(level1ArcRaw,1-Math.exp(-dt/tau)).normalize();
 }
 enemy.position.copy(level1ArcBefore).addScaledVector(level1ArcDir,travel);
 const floor=terrainHeight(enemy.position.x,enemy.position.z)+18;
 if(enemy.position.y<floor)enemy.position.y=floor;
 separateEnemyFromObstacles();
 level1ArcVisible.copy(enemy.position).sub(level1ArcBefore);
 if(level1ArcVisible.lengthSq()>.000001){
  level1ArcVisible.normalize();
  level1ArcQ.setFromUnitVectors(new THREE.Vector3(0,0,-1),level1ArcVisible);
  enemy.quaternion.slerp(level1ArcQ,1-Math.exp(-dt/.10));
 }
 // Keep each defensive break to one committed arc. The base ACE counter lasts long enough to
 // reverse its sinusoidal break side; capping it prevents that left/right twitch without removing it.
 enemyCounter=Math.min(enemyCounter,.68);
 enemyVel.copy(enemy.position).sub(level1ArcBefore).divideScalar(Math.max(dt,.001));
};
