// Real game loop, real deploy. Assisted autopilot: holds the valley line and altitude, keeps hull up,
// and splashes any bandit that has been alive 10s (stand-in for a pilot who wins fights).
const {chromium}=require('playwright');
const {startStaticServer}=require('../../../scripts/static-server.cjs');
const FAST=`
const __render=renderer.render.bind(renderer);let __frame=0;renderer.render=(a,b)=>{if(++__frame%40===0)__render(a,b);};`;
const ASSIST=`
const __uf=updateFlight;let __alive=0;
updateFlight=function(dt){__uf(dt);const cx=valleyCenter(ship.position.z);ship.position.x+=(cx-ship.position.x)*Math.min(1,dt*3);
 ship.position.y=Math.max(ship.position.y,terrainHeight(ship.position.x,ship.position.z)+90);playerHP=3;playerInvuln=Math.max(playerInvuln,.5);
 __alive=enemyAlive?__alive+dt:0;if(__alive>10){__alive=0;explode();}};
window.__dbg=()=>({crashed,complete:missionComplete,z:ship.position.z});`;
const DUR=+process.env.DUR||70;
(async()=>{
 const local=await startStaticServer();const browser=await chromium.launch({args:['--no-sandbox']});
 const run=async seed=>{
  const page=await browser.newPage({viewport:{width:960,height:540}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/encounter-director/src/level1/game.js*',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:await res.text()+FAST+(process.env.NOASSIST?'':ASSIST)});});
  await page.goto(local.url+'/prototypes/encounter-director/index.html?seed='+seed);
  await page.waitForFunction(()=>window.emberwing&&window.emberwingDirector,null,{timeout:30000});
  // Prototype page has no first-flight gate; if one is shown, deploy through it.
  if(await page.$('#firstFlight:not([hidden])')){await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.dataset.onboarding==='false',null,{timeout:15000});}
  const t0=await page.evaluate(()=>emberwing.snapshot().elapsed);
  await page.waitForTimeout(4000);
  const t1=await page.evaluate(()=>emberwing.snapshot().elapsed);
  const deck=await page.evaluate(()=>emberwingDirector.state().deck);
  let st;for(let i=0;i<DUR;i++){await page.waitForTimeout(1000);st=await page.evaluate(()=>({d:emberwingDirector.state(),s:emberwing.snapshot(),x:window.__dbg?.()}));if(st.d.next>=st.d.deck.length||st.x?.crashed||st.s.phase!=='flight')break;}
  const fails=[];if(!(t1-t0>.3&&st.s.elapsed>t1+5))fails.push(`clock not advancing (${t0}→${t1})`);
  if(st.s.elapsed>10&&!st.d.log.length)fails.push('director log empty after arm window');
  await page.close();
  return{seed,deck,clock:[+t0.toFixed(1),+t1.toFixed(1),+st.s.elapsed.toFixed(1)],log:st.d.log,played:st.d.log.filter(l=>!l.includes('skipped')).length,second:!!st.d.log[1],third:!!st.d.log[2],end:st.x||{phase:st.s.phase},errors,fails};
 };
 const res=[];for(const seed of [3,41,977])res.push(await run(seed));
 console.log(JSON.stringify(res,null,1));await browser.close();process.exit(res.some(r=>r.fails.length||r.errors.length)?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
