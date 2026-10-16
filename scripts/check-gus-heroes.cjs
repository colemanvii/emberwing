const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {startStaticServer}=require('./static-server.cjs');
(async()=>{const server=await startStaticServer();let browser;try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.BASE_URL||server.url)+'/gus.html?test');await page.waitForFunction(()=>window.gusTest);await page.locator('#level-three').click();await page.evaluate(()=>gusTest.freeze(true));
 const snap=()=>page.evaluate(()=>gusTest.snapshot()),step=s=>page.evaluate(s=>gusTest.advance(s),s);
 await step(.1);let s=await snap();assert.equal(s.level,3);assert(s.team.hulkVisible);assert(s.wolverine.visible);assert.deepEqual(s.team.members,['IRON MAN','THOR','STORM']);
 await page.keyboard.press('h');assert((await snap()).team.hulkAttacking,'H calls Hulk');const launch=(await snap()).team.hulkPosition;await step(.5);assert((await snap()).team.hulkPosition[1]>launch[1]+5,'Hulk leaps visibly');await step(.6);assert.equal((await snap()).stats.hulkSmashes,1,'Hulk lands a smash');await page.keyboard.press('h');assert.equal((await snap()).stats.hulkSmashes,1,'Cooldown prevents repeated smashes');
 await step(1.5);await page.screenshot({path:'gus-heroes.png'});
 await step(17);s=await snap();assert(s.boss,'Giant green alien arrives');assert(s.stats.hulkBossDamage>0,'Hulk really damages the giant alien');for(const key of ['ironManHits','thorHits','stormHits','wolverineHits'])assert(s.stats[key]>0,key+' contributes');
 await page.keyboard.down('Space');await page.keyboard.press('x');await page.keyboard.down('Shift');await step(1);await page.keyboard.up('Shift');assert((await snap()).turbo>.9);await step(55);await page.keyboard.up('Space');
 s=await snap();assert.equal(s.state,'won');assert(s.boss.hp.every(h=>h===0));assert(s.stats.hulkSmashes>=3);assert(!(await page.locator('#next-level').isVisible()));assert((await page.locator('#victoryscore').innerText()).includes('Captain Gus and Cole'));assert(!(await page.locator('#smash').isVisible()));
 await page.locator('#again').click();assert.equal((await snap()).level,3);assert.equal((await snap()).stats.hulkSmashes,0);await step(.1);assert(await page.locator('#smash').isVisible());
 await page.keyboard.press('Enter');await step(.1);assert.equal((await snap()).level,1);assert(!(await snap()).team.hulkVisible);assert.equal((await snap()).team.members.length,0);
 await page.goto((process.env.BASE_URL||server.url)+'/gus.html?test');await page.locator('#level-two').click();await page.evaluate(()=>gusTest.freeze(true));await page.keyboard.down('Space');await step(85);await page.keyboard.up('Space');assert.equal((await snap()).state,'won');await page.locator('#next-level').click();assert.equal((await snap()).level,3);
 assert.deepEqual(errors,[]);console.log('PASS: heroes visible, H calls a visible Hulk leap, smash cooldown, Hulk damages boss, Avengers/X-Men deal damage, weapons/turbo, victory, restart, Level 2 progression, no JS errors.');console.log(JSON.stringify(s.stats));
}finally{await browser?.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
