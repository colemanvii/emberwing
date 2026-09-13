// Isolated boundary and weapon scenarios. These are not counted as full-flight playtests.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/colecalfee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/src/level1/game.js*',async route=>{const res=await route.fetch();await route.fulfill({response:res,body:await res.text()+`\nwindow.scenario={
  boundary(destroyed,z,dt=1){reset();mission.phase='test';mission.destroyed=destroyed;ship.position.set(2000,800,z);updateMission(dt);return {complete:missionComplete,phase:mission.phase};},
  cannon(){reset();mission.phase='test';ship.position.copy(rocket.position).add(new THREE.Vector3(0,4,220));ship.quaternion.identity();enemyAlive=true;enemy.visible=true;enemy.position.copy(rocket.position).add(new THREE.Vector3(900,200,0));keys.Space=true;for(let i=0;i<100&&!mission.destroyed;i++)updateWeapons(1/60);keys.Space=false;return {destroyed:mission.destroyed,bandit:enemyAlive,hp:mission.hp};},
  missileBlocked(){reset();mission.phase='test';ship.position.set(240,terrainHeight(240,-4000)+60,-4000);return projectedGeometry(rocket.position,20000);},
  replay(){reset();return {phase:mission.phase,missile:sam.missile,smoke:effects.samTrail.length,fire:firestorm.fires.length,sams:sam.sites.length,time:missionElapsed};},
  audio(){return audioCtx?.state||'uninitialized';}
};`})});
 await p.goto('http://127.0.0.1:8892/play.html');await p.waitForFunction(()=>window.scenario);
 assert.equal(await p.locator('#briefing').count(),1);assert.equal(await p.locator('#realmCard,#missionBrief,#headingTape,#coach,#objective,#score,#readout').count(),0);
 const frozen=await p.evaluate(()=>emberwing.snapshot());await p.waitForTimeout(600);assert.deepEqual(await p.evaluate(()=>emberwing.snapshot()),frozen);
 assert.equal((await p.evaluate(()=>scenario.boundary(false,-12000,10000))).complete,false,'Exit without strike');
 assert.equal((await p.evaluate(()=>scenario.boundary(true,-7500,10000))).complete,false,'Timeout cannot complete');
 assert.equal((await p.evaluate(()=>scenario.boundary(true,-10999))).complete,false,'One unit short');
 assert.equal((await p.evaluate(()=>scenario.boundary(true,-11000))).complete,true,'Boundary is sufficient at any lateral position');
 const cannon=await p.evaluate(()=>scenario.cannon());assert.equal(cannon.destroyed,true);assert.equal(cannon.bandit,true);
 assert.equal((await p.evaluate(()=>scenario.missileBlocked())).onscreen,false);
 for(let i=0;i<3;i++){const reset=await p.evaluate(()=>scenario.replay());assert.deepEqual(reset,{phase:'briefing',missile:null,smoke:0,fire:0,sams:4,time:0});}
 assert.deepEqual(errors,[]);console.log('PASS: single frozen briefing, no obsolete DOM, extraction boundaries, no timeout, cannon strike with live bandit, concealment, repeated cleanup.');await b.close();
})();
