// Isolated browser fixtures exercise production targeting, weapons, threats and objectives.
// Hooks are injected by the test response only; the shipped page exposes read-only telemetry.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {startStaticServer}=require('./static-server.cjs');
const fixture=`
window.desertTest={
 reset(v){desertRun=(v+2)%3;reset(true);mission.phase='flight';missionElapsed=10;},
 aim(p){ship.position.copy(p).add(new THREE.Vector3(0,110,340));ship.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),p.clone().sub(ship.position).normalize());camera.position.copy(ship.position).add(new THREE.Vector3(0,5,14));camera.lookAt(p);camera.updateMatrixWorld();},
 samShot(fighter,gun=false,mobile=false){
  this.reset(1);enemyAlive=fighter;enemy.visible=fighter;enemy.position.set(6000,200,6000);const s=sam.sites[mobile?1:0];this.aim(s.position);setSeeker(true);
  for(let i=0;i<60;i++)updateTargeting(1/60);
  const selected=mission.selected,locked=lockState===2;
  if(gun){setSeeker(false);for(let salvo=0;salvo<4;salvo++){fireGun();for(let i=0;i<90;i++)updateWeapons(1/60);}}
  else{fireMissile();for(let i=0;i<300;i++){if(mobile){missionElapsed+=1/60;updateSamNetwork(1/60);}updateWeapons(1/60);}}
  return {selected,locked,disabled:s.disabled,primary:mission.destroyed};
 },
 primary(v){this.reset(v);sam.sites.forEach(s=>s.disabled=true);this.aim(rocket.position);setSeeker(true);for(let i=0;i<60;i++)updateTargeting(1/60);const selected=mission.selected;fireMissile();for(let i=0;i<300;i++)updateWeapons(1/60);return {selected,destroyed:mission.destroyed};},
 exits(){const result=[];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){this.reset(0);ship.position.copy(rocket.position).add(new THREE.Vector3(dx*3100,200,dz*3100));updateMission(.016);const before=missionComplete;spawnDefender();destroyTarget();updateMission(.016);result.push({before,complete:missionComplete,bandit:enemyAlive});}return result;},
 mobile(){this.reset(2);const s=sam.sites[1];s.cycle=1;this.aim(s.position);const p=s.position.clone();for(let i=0;i<120;i++){missionElapsed+=1/60;updateSamNetwork(1/60);}const moving={moved:p.distanceTo(s.position)>10,lock:s.lock,missiles:sam.missiles.length};s.cycle=13;this.aim(s.position);sam.sites[0].disabled=true;sam.nextLaunchAt=0;const stop=s.position.clone();for(let i=0;i<300;i++){missionElapsed+=1/60;updateSamNetwork(1/60);}return {moving,stationary:stop.distanceTo(s.position)<.01,launched:sam.lastLaunch>10};},
 convoy(){this.reset(0);const start=convoy.map(v=>v.mesh.position.clone());for(let i=0;i<60;i++)updateDesertWorld(1/60);return {moved:convoy.every((v,i)=>v.mesh.position.distanceTo(start[i])>15),dust:dust.filter(d=>d.life>0).length};},
 preview(v){this.reset(v);mission.phase='briefing';renderer.render(scene,camera);return emberwing.snapshot();}
};`;
(async()=>{let local,browser;try{
 local=await startStaticServer();browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
 await page.route('**/src/level2/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+fixture});});
 await page.goto(local.url+'/level2.html');await page.waitForFunction(()=>window.desertTest,null,{polling:100});
 const initial=await page.evaluate(()=>emberwing.snapshot());assert.equal(initial.phase,'briefing');assert.equal(initial.level,2);
 for(const fighter of [false,true])for(const gun of [false,true]){const s=await page.evaluate(([f,g])=>desertTest.samShot(f,g),[fighter,gun]);console.log('SAM', {fighter,gun,...s});assert.equal(s.selected,'sam:0');assert(s.locked);assert(s.disabled);assert(!s.primary);}
 for(const gun of [false,true]){const s=await page.evaluate(g=>desertTest.samShot(true,g,true),gun);console.log('MOBILE SAM / FIGHTER ALIVE', {gun,...s});assert.equal(s.selected,'sam:1');assert(s.locked&&s.disabled&&!s.primary);}
 for(let v=0;v<3;v++){const s=await page.evaluate(v=>desertTest.primary(v),v);console.log('PRIMARY',v,s);assert.equal(s.selected,'ground');assert(s.destroyed);}
 const exits=await page.evaluate(()=>desertTest.exits());console.log('EXITS',exits);assert(exits.every(e=>!e.before&&e.complete&&e.bandit));
 const mobile=await page.evaluate(()=>desertTest.mobile());console.log('MOBILE',mobile);assert(mobile.moving.moved);assert.equal(mobile.moving.lock,0);assert.equal(mobile.moving.missiles,0);assert(mobile.stationary);assert(mobile.launched);
 const traffic=await page.evaluate(()=>desertTest.convoy());assert(traffic.moved&&traffic.dust>0);
 const variants=[];for(let v=0;v<3;v++){variants.push(await page.evaluate(v=>desertTest.preview(v),v));}assert.equal(new Set(variants.map(v=>v.target.join(','))).size,3);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>desertTest.preview(2));assert(await page.locator('#deploy').isVisible());await page.locator('#deploy').click();assert.equal((await page.evaluate(()=>emberwing.snapshot())).phase,'flight');
 require('node:fs').mkdirSync('.artifacts',{recursive:true});await page.screenshot({path:require('node:path').resolve('.artifacts/level2-mobile.png')});
 assert.deepEqual(errors,[]);console.log('PASS: independent SAM missile/gun kills; three primary placements; E/W/S/N extraction with fighter alive; mobile stop-to-fire; convoy; mobile launch; no browser errors.');
 }finally{await browser?.close();await local?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
