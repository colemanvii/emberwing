/* Run with PLAYWRIGHT_MODULE pointing to an installed playwright package.
   Serve repository root on :8877. Optional BASE_URL and CHROME_PATH override. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
 const errors=[],results={};const base=process.env.BASE_URL||'http://127.0.0.1:8877';
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/gus.html?test');await page.waitForFunction(()=>window.gusTest);
 const snap=()=>page.evaluate(()=>gusTest.snapshot());const step=s=>page.evaluate(s=>gusTest.advance(s),s);
 assert.equal((await snap()).audio,undefined,'No autoplay audio');
 await page.keyboard.press('Enter');assert.equal((await snap()).state,'playing');assert.equal((await snap()).audio,'running');
 await page.keyboard.down('ArrowRight');await step(.3);await page.keyboard.up('ArrowRight');assert.ok((await snap()).hero[0]>3);
 await page.keyboard.down('KeyW');await step(.3);await page.keyboard.up('KeyW');assert.ok((await snap()).hero[1]>9);
 await page.keyboard.press('Enter');
 await page.keyboard.press('KeyX');let s=await snap();assert.equal(s.stats.missiles,1);let missile=s.shots.find(s=>s.missile);assert.ok(missile,'X creates a visible missile mesh');let z=missile.p[2];await step(.12);missile=(await snap()).shots.find(s=>s.missile);assert.ok(missile&&missile.p[2]<z,'Missile travels forward');await step(3);assert.equal((await snap()).stats.missileHits,1,'Missile hits a target');assert.ok((await snap()).score>0);
 await page.keyboard.down('Space');await step(3);await page.keyboard.up('Space');s=await snap();assert.ok(s.stats.lasers>10);assert.ok(s.stats.policeShots>5);assert.ok(s.stats.policeKills>0);results.combat=s.stats;
 await page.evaluate(()=>gusTest.orbAtHero(true));await step(.03);assert.ok((await snap()).stats.collections>0);
 // Repeated shield hits are forgiving, including automatic rescue on depletion.
 for(let i=0;i<6;i++){await step(2.1);await page.evaluate(()=>gusTest.orbAtHero(false));await step(.03);}
 assert.ok((await snap()).stats.rescues>0);assert.equal((await snap()).state,'playing');
 await page.keyboard.press('Enter');await step(33);assert.ok((await snap()).boss,'Boss enters in first minute');
 await page.keyboard.down('Space');await page.keyboard.down('KeyX');await step(35);await page.keyboard.up('Space');await page.keyboard.up('KeyX');s=await snap();assert.equal(s.state,'won');assert.ok(s.boss.hp.every(h=>h===0));results.victory=s.stats;
 await page.keyboard.press('Enter');s=await snap();assert.equal(s.state,'playing');assert.equal(s.score,0);assert.equal(s.boss,null);assert.equal(s.shield,5);
 await page.click('#mute');assert.equal((await snap()).muted,true);await page.click('#mute');assert.equal((await snap()).muted,false);
 const frames=await page.evaluate(()=>new Promise(resolve=>{let last=performance.now(),values=[];function f(t){values.push(t-last);last=t;if(values.length===120)resolve(values.slice(10));else requestAnimationFrame(f);}requestAnimationFrame(f);}));frames.sort((a,b)=>a-b);results.desktopFrames={medianMs:frames[Math.floor(frames.length*.5)],p95Ms:frames[Math.floor(frames.length*.95)]};
 const mobile=await browser.newContext({viewport:{width:1180,height:820},deviceScaleFactor:2,isMobile:true,hasTouch:true});const tablet=await mobile.newPage();tablet.on('pageerror',e=>errors.push(e.message));await tablet.goto(base+'/gus.html?test');await tablet.locator('#start').tap();
 const cdp=await mobile.newCDPSession(tablet),stick=await tablet.locator('#stick').boundingBox(),fire=await tablet.locator('#fire').boundingBox(),rocket=await tablet.locator('#missile').boundingBox();assert.ok(stick&&fire&&rocket);
 const pt=(r,id,dx=0,dy=0)=>({x:r.x+r.width/2+dx,y:r.y+r.height/2+dy,id});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(stick,1,35,-25),pt(fire,2)]});await tablet.evaluate(()=>gusTest.advance(.7));s=await tablet.evaluate(()=>gusTest.snapshot());assert.ok(s.hero[0]>4&&s.hero[1]>9);assert.ok(s.stats.lasers>2,'Simultaneous right-thumb flight and left-thumb fire');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await tablet.locator('#missile').tap();assert.equal((await tablet.evaluate(()=>gusTest.snapshot())).stats.missiles,1);await tablet.evaluate(()=>gusTest.advance(4));assert.ok((await tablet.evaluate(()=>gusTest.snapshot())).stats.missileHits>0);
 s=await tablet.evaluate(()=>gusTest.snapshot());assert.equal(s.touch.fire,false);assert.equal(s.touch.x,0);results.touch=s.stats;
 await tablet.screenshot({path:'/tmp/gus-ipad.png'});await tablet.setViewportSize({width:820,height:1180});await tablet.waitForTimeout(600);await tablet.screenshot({path:'/tmp/gus-ipad-portrait.png'});
 await tablet.locator('#restart').tap();assert.equal((await tablet.evaluate(()=>gusTest.snapshot())).score,0);
 assert.deepEqual(errors,[]);results.consoleErrors=errors;results.orbs=s.orbs;results.drawCalls=s.drawCalls;console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
