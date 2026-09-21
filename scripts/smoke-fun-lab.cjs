// Disposable fun-lab smoke scenes in the real browser build, not a full-run pilot.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {startStaticServer}=require('./static-server.cjs');
(async()=>{
 const server=await startStaticServer();let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1000,height:650}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/level1/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.funSmoke={
 bandit(){reset();mission.phase='test';spawnDefender();updateCamera(1/60);renderer.render(scene,camera);return {visible:airGeometry().onscreen,clear:lineClear(ship.position,enemy.position),offer:banditOfferClock,fire:enemyFireSolution(),airMissiles:hostileLockSolution()};},
 sam(){reset();mission.phase='test';mission.ingressArmed=true;const site=sam.sites[2];ship.position.copy(site.position).add(new THREE.Vector3(0,90,1000));ship.quaternion.identity();camera.position.copy(ship.position).add(new THREE.Vector3(0,6,16));resetCameraFrame();updateWorld();for(let i=0;i<30;i++)updateCamera(1/60);const visible=projectedGeometry(site.position,1400).onscreen,clear=samLineClear(site),enabled=sam.sites.filter(s=>!s.disabled).length;for(let i=0;i<180&&!sam.missiles.length;i++){missionElapsed+=1/60;updateSamNetwork(1/60);}const launched=sam.missiles.length;for(let i=0;i<60;i++){missionElapsed+=1/60;updateSamNetwork(1/60);updateV43SamSmoke(1/60);}renderer.render(scene,camera);return {visible,clear,enabled,launched,smoke:effects.samTrail.length,hp:playerHP,missileAge:sam.missiles[0]?.age};},
 strike(){reset();mission.phase='test';ship.position.copy(rocket.position).add(new THREE.Vector3(0,4,220));ship.quaternion.identity();keys.Space=true;for(let i=0;i<110&&!mission.destroyed;i++)updateWeapons(1/60);keys.Space=false;const destroyed=mission.destroyed,quiet=sam.sites.every(s=>s.disabled);ship.position.set(2000,800,LEVEL.exitZ-1);updateMission(1/60);return {destroyed,quiet,extracted:missionComplete};}
};`});});
 await page.goto(server.url+'/play.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.funSmoke);
 const start=await page.evaluate(()=>emberwing.snapshot());await page.waitForTimeout(300);const flight=await page.evaluate(()=>emberwing.snapshot());
 assert.equal(start.phase,'flight');assert.ok(flight.position.some((v,i)=>Math.abs(v-start.position[i])>5));assert.equal(flight.crashed,false);
 const bandit=await page.evaluate(()=>funSmoke.bandit());assert.ok(bandit.visible&&bandit.clear);assert.ok(bandit.offer>=5);assert.equal(bandit.fire,false);assert.equal(bandit.airMissiles,false);
 const sam=await page.evaluate(()=>funSmoke.sam());assert.equal(sam.enabled,1);assert.ok(sam.visible&&sam.clear&&sam.launched===1&&sam.smoke>10);assert.equal(sam.hp,3);
 const strike=await page.evaluate(()=>funSmoke.strike());assert.ok(strike.destroyed&&strike.quiet&&strike.extracted);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({flight:'moving, no crash',bandit,sam,strike,errors},null,2));
 }finally{if(browser)await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
