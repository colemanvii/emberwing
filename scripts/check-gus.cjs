// Browser checks for Gus Mode (gus.html): real multitouch input on an iPad-landscape
// viewport, then full fixed-step missions under several "four-year-old" input styles.
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require('playwright');
const {startStaticServer}=require('./static-server.cjs');
const OUT=path.resolve(__dirname,'..','.artifacts','gus');

(async()=>{
 let local,browser;
 try{
  fs.mkdirSync(OUT,{recursive:true});
  const base=process.env.URL||(await (async()=>{local=await startStaticServer();return local.url;})());
  const launch={headless:true,args:['--no-sandbox']};
  if(process.env.CHROME)launch.executablePath=process.env.CHROME;
  browser=await chromium.launch(launch);
  const context=await browser.newContext({viewport:{width:1180,height:820},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));

  // Test-only hooks: pause the rAF loop and step the real Gus simulation at a fixed rate.
  await page.route('**/src/gus/game.js*',async route=>{
   const response=await route.fetch();
   await route.fulfill({response,body:await response.text()+`
window.gusTest={
  pause(){loop=function(){requestAnimationFrame(loop)};},
  render(){renderer.render(scene,camera);},
  restart(){gusRestart();},
  // policy(t) -> {x,y,fire}; returns per-run telemetry.
  run(seconds,policyName,seed=1){
   let r=seed;const rand=()=>(r=(r*16807)%2147483647)/2147483647;
   const policies={
    mash:()=>({x:0,y:0,fire:true}),
    handsOff:()=>({x:0,y:0,fire:false}),
    wiggle:(t,s)=>{if(t>=s.until){s.until=t+.4+rand()*.9;s.x=(rand()*2-1);s.y=(rand()*2-1);s.fire=rand()<.6;}return s;},
    hardRight:(t)=>({x:1,y:-.4,fire:Math.floor(t*2)%3!==0}),
    diveAndFire:(t)=>({x:Math.sin(t*.7)*.6,y:-1,fire:true})
   };
   const policy=policies[policyName],state={until:0,x:0,y:0,fire:false};
   let minAgl=Infinity,maxAgl=-Infinity,firstEnemy=null,firstKill=null,victory=null,bumps=0,lastBump=0,maxGap=0,lastEvent=0,nan=false,kills=0;
   const killTimes=[];
   const dt=1/60;
   for(let i=0;i<seconds*60;i++){
    const t=i*dt,inp=policy(t,state);
    GUS.stick.x=inp.x;GUS.stick.y=inp.y;GUS.fireHeld=inp.fire?1:0;
    gusStep(dt);
    const agl=ship.position.y-terrainHeight(ship.position.x,ship.position.z);
    if(!Number.isFinite(agl)||!Number.isFinite(ship.position.x))nan=true;
    minAgl=Math.min(minAgl,agl);maxAgl=Math.max(maxAgl,agl);
    if(GUS.bumpCooldown>lastBump+.3)bumps++;lastBump=GUS.bumpCooldown;
    if(firstEnemy===null&&GUS.enemies.some(e=>e.alive))firstEnemy=t;
    if(GUS.kills>kills){kills=GUS.kills;killTimes.push(+t.toFixed(1));if(firstKill===null)firstKill=t;}
    if(victory===null&&GUS.phase==='victory')victory=i*dt;
   }
   GUS.stick.x=GUS.stick.y=0;GUS.fireHeld=0;
   return {policy:policyName,phase:GUS.phase,minAgl,maxAgl,bumps,firstEnemy,firstKill,victory,kills:GUS.kills,stars:GUS.stars,killTimes,nan,crashed,
     shots:GUS.shots,hits:GUS.hits,bossAlive:GUS.boss?GUS.boss.alive:null,z:ship.position.z};
  }
};`});
  });

  await page.goto(base+'/gus.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.gus&&window.gusTest);
  const cdp=await context.newCDPSession(page);
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:12,radiusY:12,force:1}))});
  const snap=()=>page.evaluate(()=>gus.snapshot());

  // 1. One obvious action. Title over a live, already-moving valley.
  let s=await snap();
  assert.equal(s.phase,'title');
  assert.equal(await page.locator('#gusGo').isVisible(),true,'Giant FLY button must be visible');
  for(const id of ['#touchControls','#briefing','#compass','#objectives','#runClock','#health','#radio'])
   assert.equal(await page.locator(id).isVisible(),false,`Level 1 HUD ${id} must be hidden in Gus Mode`);
  const titlePos=s.position;await page.waitForTimeout(400);
  assert.ok(Math.hypot(...(await snap()).position.map((v,i)=>v-titlePos[i]))>1,'The jet must already be flying behind the title');
  await page.screenshot({path:path.join(OUT,'01-title.png')});

  // 2. A single tap anywhere starts flight immediately.
  await touch('touchStart',[[590,410,1]]);await touch('touchEnd',[]);
  await page.waitForFunction(()=>gus.snapshot().phase==='fly',null,{timeout:2000});
  const start=await snap();await page.waitForTimeout(700);
  const moved=await snap();
  assert.ok(Math.hypot(...moved.position.map((v,i)=>v-start.position[i]))>20,'Forward flight must begin at once');

  // 3. Left thumb steers right while the right thumb holds FIRE (true simultaneous multitouch).
  const yaw0=(await snap()).yaw;
  await touch('touchStart',[[260,600,1]]);
  for(let x=260;x<=360;x+=20)await touch('touchMove',[[x,600,1]]);
  await page.waitForTimeout(250);
  await touch('touchStart',[[360,600,1],[1010,640,2]]);
  await page.waitForTimeout(150);
  const both=await snap();
  assert.ok(both.stick[0]>.8,'Stick must report a strong right input');
  assert.equal(both.fireHeld,1,'FIRE must register while the stick is held');
  await page.waitForTimeout(900);
  const turning=await snap();
  assert.ok(turning.bank>.3,`Right stick must bank right (bank ${turning.bank})`);
  assert.ok(turning.yaw<yaw0-.02,`Right stick must turn right (yaw ${yaw0} → ${turning.yaw})`);
  assert.ok(turning.shots>=4,`Held FIRE must keep firing while steering (shots ${turning.shots})`);
  await page.screenshot({path:path.join(OUT,'02-steer-and-fire.png')});
  // Release the stick but keep firing, then release everything.
  await touch('touchMove',[[1010,640,2]]);await touch('touchEnd',[]);
  await page.waitForTimeout(100);
  const released=await snap();
  assert.equal(released.fireHeld,0);assert.deepEqual(released.stick,[0,0]);

  // 4. Full missions at a fixed step under different kid styles. Nobody crashes; everyone wins.
  await page.evaluate(()=>gusTest.pause());
  const results=[];
  for(const policy of ['mash','wiggle','handsOff','hardRight','diveAndFire']){
   await page.evaluate(()=>gusTest.restart());
   const r=await page.evaluate(p=>gusTest.run(110,p,7),policy);
   results.push(r);
   console.log(JSON.stringify(r));
   assert.equal(r.nan,false,`${policy}: simulation must stay finite`);
   assert.equal(r.crashed,false,`${policy}: Gus can never crash`);
   assert.ok(r.minAgl>0,`${policy}: aircraft must never go below terrain (min AGL ${r.minAgl.toFixed(1)})`);
   assert.ok(r.firstEnemy!==null&&r.firstEnemy<9,`${policy}: something to shoot must appear within ~8s (${r.firstEnemy})`);
   assert.ok(r.victory!==null&&r.victory>70&&r.victory<100,`${policy}: victory must arrive in a short mission (${r.victory})`);
   assert.equal(r.bossAlive,false,`${policy}: the finale must always end with the rocket destroyed`);
   if(policy!=='handsOff'){
    assert.ok(r.firstKill!==null&&r.firstKill<16,`${policy}: first kill should come within ~15s (${r.firstKill})`);
    assert.ok(r.kills>=8,`${policy}: imprecise play must still score plenty of kills (${r.kills})`);
   }
   if(policy==='mash'){
    for(let i=1;i<r.killTimes.length;i++)assert.ok(r.killTimes[i]-r.killTimes[i-1]<12,`mash: no long dead stretches between kills (${r.killTimes})`);
   }
  }

  // 5. Victory presents a giant FLY AGAIN that restarts straight into flight.
  await page.evaluate(()=>{gusTest.restart();gusTest.run(100,'mash',3);});
  await page.waitForTimeout(2600);
  await page.evaluate(()=>{gusTest.run(.5,'handsOff');gusTest.render();});
  await page.screenshot({path:path.join(OUT,'05-victory.png')});
  assert.equal((await snap()).phase,'victory');
  assert.equal(await page.locator('#gusAgain').isVisible(),true,'FLY AGAIN must be visible after victory');
  await page.evaluate(()=>gusTest.run(2,'handsOff'));
  const box=await page.locator('#gusAgain').boundingBox();
  assert.ok(box.width>=300&&box.height>=140,'FLY AGAIN must be a giant target');
  await touch('touchStart',[[box.x+box.width/2,box.y+box.height/2,5]]);await touch('touchEnd',[]);
  const again=await snap();
  assert.equal(again.phase,'fly','FLY AGAIN must go straight back into flight');
  assert.equal(again.stars,0);

  // 6. Portrait shows only the rotate prompt.
  await page.setViewportSize({width:820,height:1180});
  assert.equal(await page.locator('#gusRotate').isVisible(),true,'Portrait must ask to rotate');
  await page.setViewportSize({width:1180,height:820});

  assert.deepEqual(errors,[]);
  console.log(`PASS: Gus Mode — one-tap start, multitouch steer+fire, ${results.length} full missions without a crash, victory and FLY AGAIN.`);
 }finally{
  if(browser)await browser.close();
  if(local)await local.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
