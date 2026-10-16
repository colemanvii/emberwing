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
    await page.evaluate(()=>window.gusTest.freeze(true));
    await page.waitForTimeout(150);
    const screenshotVisible=await page.screenshot({animations:'disabled'});
    await page.evaluate(()=>window.gusTest.planeVisible(false));
    const screenshotHidden=await page.screenshot({animations:'disabled'});
    await page.evaluate(()=>window.gusTest.planeVisible(true));
    const { PNG }=require('pngjs');
    const visiblePng=PNG.sync.read(screenshotVisible), hiddenPng=PNG.sync.read(screenshotHidden);
    assert.equal(visiblePng.width,hiddenPng.width);
    let differentPixels=0,minX=visiblePng.width,minY=visiblePng.height,maxX=0,maxY=0;
    for(let i=0;i<visiblePng.data.length;i+=4){
      const d=Math.abs(visiblePng.data[i]-hiddenPng.data[i])+Math.abs(visiblePng.data[i+1]-hiddenPng.data[i+1])+Math.abs(visiblePng.data[i+2]-hiddenPng.data[i+2]);
      if(d<60)continue;
      differentPixels++;
      const x=(i/4)%visiblePng.width,y=Math.floor((i/4)/visiblePng.width);
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    console.log('Fighter screenshot difference:',JSON.stringify({differentPixels,bounds:{minX,minY,maxX,maxY},size:[visiblePng.width,visiblePng.height]}));
    await require('node:fs/promises').writeFile('gus-playtest.png',screenshotVisible);
    assert(differentPixels>1500,'Aircraft MUST visibly render; toggling it must alter at least 1500 screenshot pixels');
    assert(minX<visiblePng.width*.65&&maxX>visiblePng.width*.35,'Fighter must be in the central screen');
    assert(maxY>visiblePng.height*.5,'Fighter must be in the lower half of the game');
    await page.evaluate(()=>window.gusTest.freeze(false));
    const initialPosition=await page.evaluate(()=>window.gusTest.planeScreen());
    console.log('Initial aircraft frame:',JSON.stringify(initialPosition));
    const visual=await page.evaluate(()=>window.gusTest.planePixelCoverage());
    console.log('Actual rendered aircraft pixels:',JSON.stringify(visual));
    // WebGL default-framebuffer readPixels may return zero with preserveDrawingBuffer=false.
    // The frozen Playwright PNG comparison above is the authoritative visibility test.
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
    await page.evaluate(()=>window.gusTest.freeze(true));
    const normal=await page.evaluate(()=>{const a=gusTest.snapshot().worldDistance;gusTest.advance(1);return gusTest.snapshot().worldDistance-a;});
    await page.keyboard.down('Shift');
    const boosted=await page.evaluate(()=>{gusTest.advance(1);const a=gusTest.snapshot().worldDistance;gusTest.advance(1);return {distance:gusTest.snapshot().worldDistance-a,s:gusTest.snapshot()};});
    assert(boosted.distance>normal*3,'Turbo accelerates actual world movement more than 3x');
    assert(boosted.s.fov>72,'Turbo widens camera');
    await page.keyboard.up('Shift');
    await page.evaluate(()=>gusTest.advance(2));
    assert((await page.evaluate(()=>gusTest.snapshot())).turbo<.01,'Turbo releases smoothly');
    assert((await page.evaluate(()=>gusTest.snapshot())).score>0,'Aliens destroyed with score feedback');
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
