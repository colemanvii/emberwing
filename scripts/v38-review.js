// Development-only review UI, generated into an ignored file by prepare-v38-review.mjs.
let qaPaused=false,qaLive=null,qaElapsed=0,qaFrames=0,qaWall=performance.now();
const qaPanel=document.createElement('div');qaPanel.style='position:fixed;left:8px;bottom:8px;z-index:99;background:#07121dcc;color:white;font:10px monospace;padding:8px;max-width:98vw';
const qaResult=document.createElement('pre');qaResult.id='qaResult';qaResult.style='max-height:150px;overflow:auto;margin:4px 0';
function qaButton(label,fn){const b=document.createElement('button');b.textContent=label;b.style='font:10px monospace;margin:2px';b.onclick=fn;qaPanel.appendChild(b);}
function qaScene(realm){reset();if(realm===1)deployAlpine();if(realm===2)deployTempest();for(let i=0;i<40;i++)updateCamera(1/60);document.getElementById('realmCard').classList.remove('show');focusUI.style.opacity=0;updateWorld();renderer.render(scene,camera);}
for(const [label,realm] of [['Desert',0],['Alpine',1],['Tempest',2]])qaButton(label,()=>{qaScene(realm);qaPaused=true;qaResult.textContent='Frozen launch view';});
qaButton('Play / pause',()=>{qaPaused=!qaPaused;});
qaButton('Run regression suite',()=>{
  qaPaused=true;const results=[],check=(name,ok,detail='')=>results.push(`${ok?'PASS':'FAIL'} ${name} ${detail}`);
  for(let realm=0;realm<3;realm++){
    qaScene(realm);check(`realm ${realm} launched`,worldIndex===realm&&!crashed);
    for(const [label,inputs] of [['left',['ArrowLeft']],['right',['ArrowRight']],['reverse',[]],['pull',['ArrowUp']],['dive',['ArrowDown']],['burn bank',['ArrowLeft','KeyZ']]]){
      qaScene(realm);ship.position.y=3000;camera.position.copy(ship.position).add(new THREE.Vector3(0,5,14));viewRight.set(1,0,0);for(let j=0;j<60;j++)updateCamera(1/60);
      let maxAngle=0,minDistance=Infinity,minGround=Infinity,finite=true,maxFovStep=0;const prev=new THREE.Quaternion(),positionBefore=ship.position.clone();
      for(let i=0;i<480;i++){
        for(const k in keys)keys[k]=false;
        for(const k of inputs)keys[k]=true;
        if(label==='reverse')keys[i<240?'ArrowLeft':'ArrowRight']=true;
        prev.copy(camera.quaternion);const oldFov=camera.fov;
        updateFlight(1/60);updateCamera(1/60);
        maxAngle=Math.max(maxAngle,prev.angleTo(camera.quaternion));maxFovStep=Math.max(maxFovStep,Math.abs(oldFov-camera.fov));minDistance=Math.min(minDistance,camera.position.distanceTo(ship.position));minGround=Math.min(minGround,camera.position.y-terrainHeight(camera.position.x,camera.position.z));
        finite&&=[...camera.position.toArray(),...camera.quaternion.toArray(),camera.fov].every(Number.isFinite);
      }
      check(`realm ${realm} ${label}`,finite&&maxAngle<.25&&minDistance>=9.9&&minGround>=3.99&&maxFovStep<1,`rotation ${(maxAngle*180/Math.PI).toFixed(1)}deg/frame, clearance ${minGround.toFixed(1)}, FOV step ${maxFovStep.toFixed(2)}`);
      check(`${label} flight advances`,positionBefore.distanceTo(ship.position)>30);
    }
    qaScene(realm);
    for(const angle of [-3.14,-1.57,0,1.57,3.14]){
      ship.quaternion.setFromEuler(new THREE.Euler(.35,.2,angle));const startCount=tracers.length;makeTracer(1,999);const tr=tracers[startCount],expected=new THREE.Vector3(4.8,-.13,-2.5).applyQuaternion(ship.quaternion).add(ship.position),forward=new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion);
      check(`muzzle / direction ${realm} ${angle}`,tr.mesh.position.distanceTo(expected)<.001&&tr.velocity.clone().normalize().dot(forward)>.99);
    }
    qaScene(realm);ship.position.y=terrainHeight(0,330)+6;ship.quaternion.setFromEuler(new THREE.Euler(0,0,1.4));camera.position.copy(ship.position).add(new THREE.Vector3(0,-12,14));updateCamera(1/60);check(`low camera ${realm}`,camera.position.y>=terrainHeight(camera.position.x,camera.position.z)+3.99);
    // Stress the real enemy update near a steep slope and each structure.
    enemy.position.set(1200,terrainHeight(1200,-400)+2,-400);for(let i=0;i<240;i++)updateEnemy(1/60);
    check(`enemy above terrain ${realm}`,enemy.position.y>=terrainHeight(enemy.position.x,enemy.position.z));
  }
  qaScene(0);for(let realm=0;realm<3;realm++){for(let k=0;k<MISSION_KILLS;k++){enemyAlive=true;enemy.visible=true;explode();}updateMission(1.1);check(`campaign transition ${realm}`,realm<2?worldIndex===realm+1:missionComplete);}
  qaScene(0);enemy.position.copy(ship.position).add(new THREE.Vector3(0,0,-90));enemy.quaternion.copy(ship.quaternion);enemyVel.set(0,0,0);lockState=2;seeker=true;fireMissile();check('missile launch',!!missile);for(let i=0;i<180&&missile;i++)updateWeapons(1/60);check('missile impact / cleanup',!missile);
  qaScene(0);enemy.position.copy(ship.position).add(new THREE.Vector3(0,0,-90));enemyVel.set(0,0,0);enemyHP=2;keys.Space=true;for(let i=0;i<80&&enemyAlive;i++)updateWeapons(1/60);keys.Space=false;check('cannon impact and kill',!enemyAlive&&kills===1);
  qaScene(0);const building=scenery.find(m=>m.visible);ship.position.copy(building.position);checkObstacleCollision();check('building collision',crashed);
  qaScene(2);ship.position.copy(platform.position);checkObstacleCollision();check('platform collision',crashed);
  qaScene(0);qaResult.textContent=results.join('\n');console.log(qaResult.textContent);
});
qaButton('Live flight stress',()=>{qaScene(2);ship.position.y=1800;camera.position.copy(ship.position).add(new THREE.Vector3(0,5,14));qaPaused=false;qaElapsed=0;qaFrames=0;qaWall=performance.now();qaLive=true;});
function qaTick(dt){if(!qaLive)return;qaElapsed+=dt;qaFrames++;for(const k in keys)keys[k]=false;const stages=[['LEFT',['ArrowLeft']],['RIGHT',['ArrowRight']],['PULL',['ArrowUp']],['DIVE',['ArrowDown']],['BOOST BANK',['ArrowLeft','KeyZ']],['CANNON',['Space']],['MISSILE TRACK',['KeyX']]];const index=Math.floor(qaElapsed/3);if(index>=stages.length){qaLive=false;qaPaused=true;qaResult.textContent=`Live flight complete: ${qaFrames} frames, ${(qaFrames/((performance.now()-qaWall)/1000)).toFixed(1)} actual fps, ${renderer.info.render.calls} draw calls, ${renderer.info.render.triangles} triangles. Crashed: ${crashed}`;return;}for(const k of stages[index][1])keys[k]=true;qaResult.textContent=`Live ${stages[index][0]} — ${qaElapsed.toFixed(1)}s, ${renderer.info.render.calls} calls`;}
qaButton('Render stats',()=>{qaResult.textContent=JSON.stringify({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,pixelRatio:renderer.getPixelRatio(),worldIndex,crashed,ship:ship.position.toArray(),touch:touchState},null,2);});
qaPanel.appendChild(qaResult);document.body.appendChild(qaPanel);

qaButton('Cannon proof',()=>{qaScene(0);qaPaused=true;fireGun();renderer.render(scene,camera);});
qaButton('Benchmark scene',()=>{qaScene(worldIndex);qaPaused=false;const start=performance.now();let count=0,maxCalls=0;function frame(){count++;maxCalls=Math.max(maxCalls,renderer.info.render.calls);if(performance.now()-start<8000){requestAnimationFrame(frame);return;}qaPaused=true;qaResult.textContent=`Scene ${worldIndex}: ${(count*1000/(performance.now()-start)).toFixed(1)} actual FPS, max ${maxCalls} draw calls; crashed ${crashed}`;}requestAnimationFrame(frame);});
