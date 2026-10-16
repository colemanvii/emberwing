const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { startStaticServer } = require('./static-server.cjs');

(async () => {
  const server = await startStaticServer();
  let browser;
  try {
    browser = await chromium.launch({
      headless:true,
      args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox']
    });
    const page = await browser.newPage({ viewport:{width:1280,height:800} });
    const failures = [], badResponses=[];
    page.on('pageerror', e=>failures.push(e.stack||e.message));
    page.on('response', r=>{ if(r.status()>=400)badResponses.push(r.status()+' '+r.url()); });
    page.on('console', msg=>{ if(msg.type()==='error')failures.push('console: '+msg.text()); });
    await page.goto(server.url+'/gus.html?test', {waitUntil:'networkidle',timeout:30000});
    try {
      await page.waitForFunction(()=>!!window.gusTest,null,{timeout:7000});
    } catch (e) {
      console.error('Game module failed to initialize: '+e.message);
      console.error('Browser errors:',JSON.stringify(failures));
      console.error('HTTP failures:',JSON.stringify(badResponses));
      console.error('Rendered intro:',await page.locator('#intro').innerText());
      console.error('Module responses:',JSON.stringify(await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/gus/')).map(x=>({name:x.name,duration:x.duration,responseStatus:x.responseStatus})))));
      await page.screenshot({path:'gus-playtest.png',fullPage:true}).catch(()=>{});
      throw e;
    }
    const canvas = await page.locator('#sky').boundingBox();
    assert(canvas&&canvas.width>500&&canvas.height>300,'3D canvas has measurable size');
    await page.locator('#start').click();
    await page.waitForFunction(()=>window.gusTest.snapshot().state==='playing',{timeout:5000});
    const initial = await page.evaluate(()=>window.gusTest.snapshot());
    assert.equal(initial.orbs,320,'electrical storm exists');
    assert(initial.buddy.length===3,'police wingman exists');
    await page.keyboard.down('x');
    const fired=await page.evaluate(()=>window.gusTest.snapshot());
    await page.keyboard.up('x');
    assert(fired.stats.missiles>=1,'X launches a missile');
    assert(fired.shots.some(s=>s.missile),'Missile is present in scene');
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');
    const shooting=await page.evaluate(()=>window.gusTest.snapshot());
    assert(shooting.stats.lasers>0,'Space shoots lasers');
    await page.screenshot({path:'gus-playtest.png',fullPage:true});
    assert.deepEqual(badResponses,[],'No failed HTTP assets');
    assert.deepEqual(failures,[],'No browser errors');
    console.log('PASS: Gus Edition opens, WebGL canvas renders, police wingman present, 320 electric balls, X missile launched, SPACE lasers fire.');
    console.log(JSON.stringify({start:initial.stats,afterMissile:fired.stats,afterCannon:shooting.stats,drawCalls:shooting.drawCalls}));
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
