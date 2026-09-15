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
  variants(){return MISSION_VARIANTS.map(v=>({id:v.id,sam:[...v.sam],bandit:{...v.bandit},escape:{...v.escape},cooldown:v.cooldown}));},
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
  },
  routing(){
    reset();mission.phase='test';
    const point=(z,offset=0,altitude=40)=>{const x=valleyCenter(z)+offset;return new THREE.Vector3(x,terrainHeight(x,z)+altitude,z);};
    const sight=(index,p)=>lineClear(sam.sites[index].position,p,8)&&!scenerySegmentHit(sam.sites[index].position,p,5,8,true);
    return {
      concealed:lineClear(point(-4400,-130,50),rocket.position),
      revealed:lineClear(point(-4900,-130,50),rocket.position),
      escapeFloor:[-5700,-5900,-6100,-6300,-6500,-6800].map(z=>terrainHeight(valleyCenter(z),z)),
      terminalMasked:sight(3,point(-5100,-100)),
      terminalExposed:sight(3,point(-5500)),
      escapeMasked:sight(4,point(-5500,-100)),
      escapeClimb:sight(4,point(-5500,-100,160)),
      escapeOpen:sight(4,point(-5500))
    };
  },
  entrySafe(){
    reset();mission.phase='test';crashed=false;
    for(let i=0;i<240&&!crashed;i++){updateFlight(1/60);updateWorld();}
    return {crashed,position:ship.position.toArray(),altitude:ship.position.y-terrainHeight(ship.position.x,ship.position.z)};
  }
};`
   });
  });

  await page.goto(target,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.scenario);

  assert.equal(await page.locator('#briefing').count(),1);
  assert.equal(await page.locator('#realmCard,#missionBrief,#headingTape,#coach,#objective,#score,#readout').count(),0);

  const opening=await page.evaluate(()=>emberwing.snapshot());
  assert.equal(opening.phase,'flight','Level 1 must begin in live flight');
  assert.equal(await page.locator('#deploy').isHidden(),true,'Level 1 must not present a launch button');
  await page.waitForFunction(()=>emberwing.snapshot().elapsed>.25,{timeout:6000});
  const moving=await page.evaluate(()=>emberwing.snapshot());
  const traveled=Math.hypot(...moving.position.map((v,i)=>v-opening.position[i]));
  assert.ok(traveled>15,'Aircraft must already be moving when Level 1 loads');

  const entry=await page.evaluate(()=>scenario.entrySafe());
  assert.equal(entry.crashed,false,'Level 1 spawn must survive four seconds hands-off');
  assert.ok(entry.altitude>8,'Opening line must retain safe terrain clearance');

  const strikeAxis=await page.evaluate(()=>[-3000,-4100,-4900,-5700,-6300,-6900].map(z=>emberwing.center(z)));
  assert.ok(Math.max(...strikeAxis)-Math.min(...strikeAxis)<220,'Terminal route must read as one coherent strike axis');
  assert.ok(strikeAxis.slice(3).every(x=>x<-150),'Post-strike corridor must not swing back east');

  const routing=await page.evaluate(()=>scenario.routing());
  assert.equal(routing.concealed,false,'Western ingress must conceal the target before the headland');
  assert.equal(routing.revealed,true,'Rounding the western shoulder must leave room to acquire the target');
  assert.ok(routing.escapeFloor.every(y=>y<40),'The strike axis must remain low through the escape spine');
  assert.equal(routing.terminalMasked,false,'Headland must mask SAM4 on low ingress');
  assert.equal(routing.terminalExposed,true,'SAM4 must see the exposed strike basin');
  assert.equal(routing.escapeMasked,false,'Western shoulder must mask SAM5 before the strike');
  assert.equal(routing.escapeClimb,true,'Climbing out of that cover must expose the aircraft to SAM5');
  assert.equal(routing.escapeOpen,true,'SAM5 must pressure the open basin line');

  const variants=await page.evaluate(()=>scenario.variants());
  assert.equal(variants.length,4,'Level 1 should ship four curated pressure patterns');
  assert.equal(new Set(variants.map(v=>v.id)).size,4,'Pressure pattern IDs must be unique');
  for(const v of variants){
   assert.equal(v.sam.length,5,'Every pressure pattern must preserve the five-SAM network');
   assert.ok(v.sam.every(range=>range>=1000&&range<=2000),'SAM range variation must remain bounded');
   assert.ok(v.bandit.trigger>v.escape.trigger,'Ingress defender must activate before escape pressure');
  }

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
   assert.equal(reset.phase,'flight');
   assert.equal(reset.missile,null);
   assert.equal(reset.smoke,0);
   assert.equal(reset.fire,0);
   assert.equal(reset.sams,5);
   assert.equal(reset.time,0);
  }

  assert.deepEqual(errors,[]);
  console.log(`PASS: airborne start, transient mission title, mission boundary at ${exitZ}, strike authority, physical SAM cover, concealment, and replay cleanup.`);
 }finally{
  if(browser)await browser.close();
  if(local)await local.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
