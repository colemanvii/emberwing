qaButton('V40 mission checks',()=>{
 qaPaused=true;const rows=[],check=(label,ok)=>rows.push((ok?'PASS ':'FAIL ')+label);
 qaScene(0);reconcileModifiers({code:'ShiftLeft',shiftKey:true},true);check('hold Shift',keys.ShiftLeft);reconcileModifiers({code:'ShiftLeft',shiftKey:false},false);check('release Shift',!keys.ShiftLeft&&!keys.ShiftRight);
 keys.ShiftLeft=true;reconcileModifiers({code:'Digit4',metaKey:true,shiftKey:true},true);check('Command Shift 4 clears held inputs',!keys.ShiftLeft);
 keys.ShiftRight=true;releaseMissionInputs();check('focus/hidden reset clears Shift',!keys.ShiftRight);
 lastForwardTap=performance.now()-100;key({code:'ArrowUp',repeat:false,preventDefault(){}},true);check('double tap burst remains',turboBurst>1);key({code:'ArrowUp',repeat:false,preventDefault(){}},false);
 function setup(){qaScene(1);enemyAlive=false;enemyDetected=false;ship.position.copy(alpineRelay.position).add(new THREE.Vector3(0,0,50));relayPass.ready=false;updateRelayPass();}
 setup();ship.position.z=alpineRelay.position.z-40;updateRelayPass();check('swept clean forward traversal',relayPass.cleared&&!crashed);updateGuidance();check('guidance returns to destination',targetUI.dataset.owner==='destination');
 setup();ship.position.x+=180;relayPass.ready=false;updateRelayPass();ship.position.z-=100;updateRelayPass();check('bypass does not clear',!relayPass.cleared&&!crashed);
 setup();ship.position.z-=100;relayPass.ready=false;updateRelayPass();ship.position.z+=100;updateRelayPass();check('reverse passage does not clear',!relayPass.cleared);
 setup();ship.position.x+=55;relayPass.ready=false;updateRelayPass();ship.position.z-=100;updateRelayPass();check('visible pylon collision',crashed&&!relayPass.cleared);
 setup();kills=MISSION_KILLS;missionCompleteTimer=.5;updateMission(1);check('kills cannot skip relay / flight remains free',worldIndex===1&&missionCompleteTimer===0);ship.position.z-=100;updateRelayPass();updateMission(.01);check('clearance releases existing transition',missionCompleteTimer>0);
 qaScene(1);check('reset restores challenge',!relayPass.cleared);enemyDetected=true;updateGuidance();check('bandit retains priority',targetUI.dataset.owner==='bandit');
 enemyDetected=false;updateGuidance();const until=missionControl.until;updateGuidance();check('stable task does not repeat cue',missionControl.until===until);check('flag small and attached',flagMark.parent===ship&&flagMark.geometry.parameters.width<1.5);
 qaScene(1);qaResult.style.maxHeight='70vh';qaResult.textContent=rows.join('\n');
});
qaButton('V40 relay view',()=>{qaScene(1);enemyAlive=false;enemyDetected=false;ship.position.copy(alpineRelay.position).add(new THREE.Vector3(0,0,230));ship.quaternion.identity();relayPass.ready=false;for(let i=0;i<60;i++)updateCamera(1/60);updateWorld();updateGuidance();qaPaused=true;renderer.render(scene,camera);});
