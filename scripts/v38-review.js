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
// Sample the game's own frame callback; a second rAF chain distorts this host's scheduling.
let qaBench=null;
const profileMetricsBase=updateFlightMetrics;
updateFlightMetrics=function(dt){profileMetricsBase(dt);if(!qaBench)return;const now=performance.now();qaBench.times.push(now-qaBench.previous);qaBench.previous=now;qaBench.calls=Math.max(qaBench.calls,renderer.info.render.calls);if(now-qaBench.start<10000)return;const times=qaBench.times.sort((a,b)=>a-b);qaPaused=true;qaResult.textContent=`Scene ${worldIndex}: ${(times.length*1000/(now-qaBench.start)).toFixed(1)} FPS; p95 ${times[Math.floor(times.length*.95)].toFixed(1)}ms; max ${Math.max(...times).toFixed(1)}ms; ${qaBench.calls} calls; rebuild ${qaBench.rebuild.toFixed(1)}ms; crashed ${crashed}`;qaBench=null;};
const profileRebuildBase=rebuildTerrain;
rebuildTerrain=function(...args){const t=performance.now();profileRebuildBase(...args);if(qaBench)qaBench.rebuild=Math.max(qaBench.rebuild,performance.now()-t);};
qaButton('Benchmark scene',()=>{qaScene(worldIndex);qaPaused=false;const now=performance.now();qaBench={start:now,previous:now,times:[],calls:0,rebuild:0};});

// Presentation checks use the actual chase camera and the unmodified flight loop.
qaButton('Airframe bank',()=>{qaScene(1);ship.position.y+=180;ship.rotation.z=.65;for(let i=0;i<40;i++)updateCamera(1/60);qaPaused=true;updateWorld();renderer.render(scene,camera);qaResult.textContent='Banked chase view';});
qaButton('Airframe boost',()=>{qaScene(2);ship.position.y=700;keys.KeyZ=true;for(let i=0;i<90;i++){updateFlight(1/60);updateCamera(1/60);updateSpeedFX(1/60);}keys.KeyZ=false;qaPaused=true;updateWorld();renderer.render(scene,camera);qaResult.textContent='Boost chase view';});
qaButton('Control surface check',()=>{
 qaScene(2);qaPaused=true;ship.position.y=2000;const checks=[];
 const check=(label,ok)=>checks.push(`${ok?'PASS':'FAIL'} ${label}`);
 const fixed=airframeControls.map(s=>s.pivot.position.clone());
 keys.ArrowRight=true;for(let i=0;i<45;i++){updateFlight(1/60);updateSpeedFX(1/60);updateCamera(1/60);}keys.ArrowRight=false;
 const elevons=airframeControls.filter(s=>s.kind==='elevon');
 check('roll produces opposite elevon deflections',elevons[0].angle*elevons[1].angle<-.001);
 check('all surfaces stay within 11 degrees',airframeControls.every(s=>Math.abs(s.angle)<.192));
 check('hinges remain attached',airframeControls.every((s,i)=>s.pivot.position.distanceTo(fixed[i])<1e-9));
 keys.ArrowUp=true;for(let i=0;i<90;i++){updateFlight(1/60);updateSpeedFX(1/60);}keys.ArrowUp=false;
 check('pull raises both elevons',elevons.every(s=>s.angle<-.02));
 for(let i=0;i<180;i++){updateFlight(1/60);updateSpeedFX(1/60);}
 check('release settles to neutral',airframeControls.every(s=>Math.abs(s.angle)<.001));
 const beforeReset=ship.position.clone();reset();
 check('reset clears surface pose',airframeControls.every(s=>s.angle===0&&s.pivot.quaternion.angleTo(new THREE.Quaternion())<1e-8));
 qaScene(1);ship.position.y+=180;keys.ArrowRight=true;
 for(let i=0;i<20;i++){updateFlight(1/60);updateSpeedFX(1/60);updateCamera(1/60);}keys.ArrowRight=false;
 updateWorld();renderer.render(scene,camera);qaResult.textContent=checks.join('\n');
});

qaButton('Dogfight geometry',()=>{
 qaPaused=true;const rows=[],check=(name,ok,detail='')=>rows.push(`${ok?'PASS':'FAIL'} ${name} ${detail}`);
 for(const role of ['ROOKIE','SKIMMER','CLIMBER','ACE']){
  qaScene(2);enemyRole=role;ship.position.set(0,1800,0);ship.quaternion.identity();enemy.position.set(12,1808,-150);enemy.quaternion.identity();duel.forward.set(0,0,-1);duelState('extend');duel.course.copy(duel.forward);duel.cooldown=duel.pursuit=duel.pressure=0;enemyTime=0;
  const states=new Set();let front=false,rear=false,minRange=Infinity,maxTurn=0,finite=true,prev=new THREE.Quaternion();
  for(let i=0;i<3600;i++){ship.position.z-=124/60;prev.copy(enemy.quaternion);updateEnemy(1/60);states.add(duel.state);const relative=enemy.position.clone().sub(ship.position);front||=relative.z<0;rear||=relative.z>0;minRange=Math.min(minRange,relative.length());maxTurn=Math.max(maxTurn,prev.angleTo(enemy.quaternion));finite&&=enemy.position.toArray().every(Number.isFinite);}
  check(role+' swaps front / rear',front&&rear,`min ${minRange.toFixed(0)}; ${[...states].join(' → ')}`);
  check(role+' breaks sustained pursuit',states.has('break'));
  check(role+' re-engages',states.has('engage'));
  check(role+' gains pressure',states.has('press'));
  check(role+' stable turning',finite&&maxTurn<.034,`${(maxTurn*180/Math.PI).toFixed(2)}deg/frame`);
 }
 qaScene(0);qaResult.textContent=rows.join('\n');
});
qaButton('Live dogfight',()=>{qaScene(2);ship.position.y=1100;enemy.position.copy(ship.position).add(new THREE.Vector3(12,8,-150));enemy.quaternion.copy(ship.quaternion);duel.forward.set(0,0,-1);duelState('extend');duel.course.copy(duel.forward);duel.cooldown=duel.pursuit=duel.pressure=0;enemyTime=0;camera.position.copy(ship.position).add(new THREE.Vector3(0,5.3,14));qaPaused=false;qaResult.textContent='Live encounter: coast or use arrows. Watch the merge and rear locator.';});
let qaDuel=null;
qaButton('Dogfight flight test',()=>{qaScene(2);ship.position.set(0,1200,330);enemy.position.copy(ship.position).add(new THREE.Vector3(12,8,-150));enemy.quaternion.identity();duel.forward.set(0,0,-1);duelState('extend');duel.course.copy(duel.forward);duel.cooldown=duel.pursuit=duel.pressure=0;enemyTime=0;camera.position.copy(ship.position).add(new THREE.Vector3(0,5.3,14));qaDuel={time:0,events:[],state:'',minRange:Infinity,rear:0,frames:0,start:performance.now()};qaPaused=false;});
const qaDuelTickBase=qaTick;
qaTick=function(dt){qaDuelTickBase(dt);if(!qaDuel)return;const d=qaDuel;d.time+=dt;d.frames++;for(const k in keys)keys[k]=false;
 if(d.time>12&&d.time<16){keys.ArrowRight=true;keys.ArrowUp=true;}
 if(d.time>22&&d.time<26){keys.ArrowLeft=true;keys.ArrowUp=true;}
 const range=enemy.position.distanceTo(ship.position);d.minRange=Math.min(d.minRange,range);
 if(duel.playerForward.dot(duel.toPlayer)>.55&&range<460)d.rear+=dt;
 if(d.state!==duel.state){d.state=duel.state;d.events.push(`${d.time.toFixed(1)}s ${duel.state} (${range.toFixed(0)}m)`);}
 qaResult.textContent=d.events.join('\n')+`\n${d.time.toFixed(1)}s · rear threat ${d.rear.toFixed(1)}s · hull ${playerHP}/3`;
 if(d.time>40||crashed){qaPaused=true;qaResult.textContent+=`\nComplete: min range ${d.minRange.toFixed(0)}m, ${(d.frames/((performance.now()-d.start)/1000)).toFixed(1)} FPS, crashed ${crashed}`;qaDuel=null;}
};
qaButton('Merge and safety check',()=>{
 qaPaused=true;qaScene(2);ship.position.set(0,1400,0);ship.quaternion.identity();enemy.position.set(65,1408,-680);enemy.quaternion.identity();duel.forward.set(0,0,-1);duelState('extend');duel.course.copy(duel.forward);duel.age=6;duel.pursuit=duel.pressure=duel.cooldown=0;
 let opposing=false,min=Infinity,behind=false,previous=enemy.position.clone(),maxStep=0;
 for(let i=0;i<900;i++){ship.position.z-=124/60;previous.copy(enemy.position);updateEnemy(1/60);opposing||=duel.forward.dot(new THREE.Vector3(0,0,-1))<-.65;min=Math.min(min,enemy.position.distanceTo(ship.position));behind||=enemy.position.z>ship.position.z;maxStep=Math.max(maxStep,enemy.position.distanceTo(previous));}
 const rows=[`${opposing?'PASS':'FAIL'} turns back into opposing heading`,`${min<180&&behind?'PASS':'FAIL'} offset merge passes the player (closest ${min.toFixed(0)}m)`,`${maxStep<3?'PASS':'FAIL'} no position jumps (${maxStep.toFixed(2)}m/frame)`];
 qaScene(2);ship.position.set(0,1000,0);enemy.position.set(0,1000,200);enemy.quaternion.identity();enemyRole='SKIMMER';enemyTime=5;duel.state='press';resetEnemyAttack(0);playerHP=3;
 for(let i=0;i<42;i++)updateEnemyAttack(1/60);
 rows.push(`${tracers.filter(t=>t.friendly===false).length===0?'PASS':'FAIL'} rear attack has a warning before firing`);
 for(let i=0;i<60;i++)updateEnemyAttack(1/60);
 rows.push(`${tracers.filter(t=>t.friendly===false).length>0?'PASS':'FAIL'} skimmer can use existing guns from the rear`);
 duel.state='extend';rows.push(`${!enemyFireSolution()?'PASS':'FAIL'} separation suppresses attacks`);
 qaScene(0);qaResult.textContent=rows.join('\n');
});
qaButton('Crossing weapons',()=>{
 qaScene(2);qaPaused=true;ship.position.set(0,1200,0);ship.quaternion.identity();enemy.position.set(-22,1200,-140);enemy.quaternion.setFromAxisAngle(worldUp,Math.PI/2);enemyHP=enemyMaxHP=5;enemyVel.set(120,0,0);keys.Space=true;
 for(let i=0;i<32;i++){enemy.position.x+=120/60;updateWeapons(1/60);}keys.Space=false;
 const rows=[`${enemyHP<5?'PASS':'FAIL'} cannon hits a 90-degree crossing with lead`];
 qaScene(0);enemy.position.copy(ship.position).add(new THREE.Vector3(40,0,-140));enemy.quaternion.setFromAxisAngle(worldUp,Math.PI/2);for(let i=0;i<40;i++)updateCamera(1/60);renderer.render(scene,camera);
 rows.push(`${geometry().state?'PASS':'FAIL'} missile acquisition accepts an offset broadside target`);qaResult.textContent=rows.join('\n');
});
qaButton('Rear threat view',()=>{qaScene(2);qaPaused=true;ship.position.set(0,1000,0);enemy.position.set(15,1008,210);enemy.quaternion.identity();duel.forward.set(0,0,-1);duelState('press');duel.pursuit=duel.pressure=0;enemyTime=5;updateEnemy(1/60);for(let i=0;i<60;i++)updateCamera(1/60);updateWorld();updateRange(1/60);updateTargeting(1/60);updateGuidance();renderer.render(scene,camera);qaResult.textContent='Rear locator and break cue at normal chase distance';});
