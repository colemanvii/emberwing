// Fast browser checks for Level 1 mission boundaries and weapon behavior.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {startStaticServer}=require('./static-server.cjs');

(async()=>{
 let local,browser;
 try{
  const target=process.env.URL||(await (async()=>{local=await startStaticServer();return local.url+'/play.html';})());
  const launch={headless:true,args:['--no-sandbox']};
  if(process.env.CHROME)launch.executablePath=process.env.CHROME;
  browser=await chromium.launch(launch);
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));

  await page.route('**/src/level1/game.js*',async route=>{
   const response=await route.fetch();
   await route.fulfill({
    response,
    body:await response.text()+`
window.scenario={
  exitZ:LEVEL.exitZ,
  boundary(destroyed,z,dt=1){
    reset();mission.phase='test';mission.destroyed=destroyed;ship.position.set(2000,800,z);updateMission(dt);
    return {complete:missionComplete,phase:mission.phase};
  },
  cannon(){
    reset();mission.phase='test';ship.position.copy(rocket.position).add(new THREE.Vector3(0,4,220));ship.quaternion.identity();
    enemyAlive=true;enemy.visible=true;enemy.position.copy(rocket.position).add(new THREE.Vector3(900,200,0));
    keys.Space=true;for(let i=0;i<100&&!mission.destroyed;i++)updateWeapons(1/60);keys.Space=false;
    return {destroyed:mission.destroyed,bandit:enemyAlive,hp:mission.hp};
  },
  missileBlocked(){
    reset();mission.phase='test';ship.position.set(240,terrainHeight(240,-4000)+60,-4000);
    return projectedGeometry(rocket.position,20000);
  },
  samCover(){
    reset();mission.phase='test';
    const blocker=scenery.find(m=>m.userData.collisionR),position=blocker.position.clone(),visible=blocker.visible;
    const radius=blocker.userData.collisionR,height=blocker.userData.collisionH,mountain=blocker.userData.mountain;
    const site={position:new THREE.Vector3(0,1200,0)};ship.position.set(0,1200,500);
    blocker.visible=true;blocker.position.set(0,1200,250);blocker.userData.collisionR=80;blocker.userData.collisionH=80;blocker.userData.mountain=true;
    const blocked=!samLineClear(site),impact=!!scenerySegmentHit(site.position,ship.position,0,0,false);
    blocker.position.set(500,600,250);
    const clear=samLineClear(site);
    blocker.position.copy(position);blocker.visible=visible;blocker.userData.collisionR=radius;blocker.userData.collisionH=height;
    if(mountain===undefined)delete blocker.userData.mountain;else blocker.userData.mountain=mountain;
    return {blocked,impact,clear};
  },
  replay(){
    reset();
    return {phase:mission.phase,missile:sam.missile,smoke:effects.samTrail.length,fire:firestorm.fires.length,sams:sam.sites.length,time:missionElapsed};
  }
};`
   });
  });

  await page.goto(target,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.scenario);

  assert.equal(await page.locator('#briefing').count(),1);
  assert.equal(await page.locator('#realmCard,#missionBrief,#headingTape,#coach,#objective,#score,#readout').count(),0);

  const frozen=await page.evaluate(()=>emberwing.snapshot());
  await page.waitForTimeout(600);
  assert.deepEqual(await page.evaluate(()=>emberwing.snapshot()),frozen);

  const exitZ=await page.evaluate(()=>scenario.exitZ);
  assert.equal((await page.evaluate(()=>scenario.boundary(false,scenario.exitZ-1000,10000))).complete,false,'Exit without strike');
  assert.equal((await page.evaluate(()=>scenario.boundary(true,scenario.exitZ+1000,10000))).complete,false,'Timeout cannot complete');
  assert.equal((await page.evaluate(()=>scenario.boundary(true,scenario.exitZ+1))).complete,false,'One unit short');
  assert.equal((await page.evaluate(()=>scenario.boundary(true,scenario.exitZ))).complete,true,'Boundary is sufficient at any lateral position');

  const cannon=await page.evaluate(()=>scenario.cannon());
  assert.equal(cannon.destroyed,true);
  assert.equal(cannon.bandit,true);
  assert.equal((await page.evaluate(()=>scenario.missileBlocked())).onscreen,false);
  const samCover=await page.evaluate(()=>scenario.samCover());
  assert.equal(samCover.blocked,true,'Major scenery must break SAM line of sight');
  assert.equal(samCover.impact,true,'Physical scenery must register a missile-impact segment');
  assert.equal(samCover.clear,true,'SAM line of sight must recover when cover is removed');

  for(let i=0;i<3;i++){
   const reset=await page.evaluate(()=>scenario.replay());
   assert.equal(reset.phase,'briefing');
   assert.equal(reset.missile,null);
   assert.equal(reset.smoke,0);
   assert.equal(reset.fire,0);
   assert.equal(reset.sams,5);
   assert.equal(reset.time,0);
  }

  assert.deepEqual(errors,[]);
  console.log(`PASS: frozen briefing, mission boundary at ${exitZ}, strike authority, physical SAM cover, concealment, and replay cleanup.`);
 }finally{
  if(browser)await browser.close();
  if(local)await local.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
