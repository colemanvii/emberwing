// End-to-end keyboard pilot. No writes to simulation state; mission telemetry is read-only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {startStaticServer}=require('./static-server.cjs');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
(async()=>{let local,browser;try{
 local=await startStaticServer();browser=await chromium.launch({headless:true,...(process.env.CHROME?{executablePath:process.env.CHROME}:{}),args:['--no-sandbox']});
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],held=new Set();
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.goto(local.url+'/level2.html');await p.waitForFunction(()=>window.emberwing);await p.keyboard.press('Enter');
 if(process.env.VARIANT!==undefined){for(let i=0;i<3;i++){if((await p.evaluate(()=>emberwing.snapshot())).variant===Number(process.env.VARIANT))break;await p.keyboard.press('r');}}
 const out=path.resolve(process.env.OUTPUT||'.artifacts/level2');fs.mkdirSync(out,{recursive:true});
 await p.screenshot({path:path.join(out,'opening.png')});
 async function setKeys(next){for(const k of held)if(!next.has(k)){await p.keyboard.up(k);held.delete(k);}for(const k of next)if(!held.has(k)){await p.keyboard.down(k);held.add(k);}}
 let exit=null,lastLog=-5,struck=false,complete=false;const seen=new Set();const start=Date.now();
 while(Date.now()-start<150000){
  const s=await p.evaluate(()=>emberwing.snapshot());
  if(s.elapsed-lastLog>3){lastLog=s.elapsed;console.log(JSON.stringify({t:+s.elapsed.toFixed(1),variant:s.variant,pos:s.position.map(Math.round),hp:s.hp,selected:s.selected,lock:s.lock,sam:s.samMissile,destroyed:s.destroyed,dist:Math.round(s.responseDistance)}));}
  for(const [name,t] of [['clues-at-speed',4],['approach',9]])if(s.elapsed>t&&!seen.has(name)){seen.add(name);await p.screenshot({path:path.join(out,name+'.png')});}
  if(s.crashed||s.complete){complete=s.complete;await p.screenshot({path:path.join(out,s.complete?'extracted.png':'crash.png')});break;}
  const [x,y,z]=s.position,[qx,qy,qz,qw]=s.quaternion;
  const bank=Math.atan2(-2*(qx*qy+qw*qz),1-2*(qx*qx+qz*qz)),pitch=Math.asin(clamp(s.forward[1],-1,1)),yaw=Math.atan2(s.forward[0],-s.forward[2]);
  if(s.destroyed&&!struck){struck=true;exit=[x+s.forward[0]*5000,170,z+s.forward[2]*5000];await p.screenshot({path:path.join(out,'strike.png')});}
  const dest=exit||s.target,range=Math.hypot(dest[0]-x,dest[2]-z),desiredYaw=Math.atan2(dest[0]-x,z-dest[2]);
  const yawError=Math.atan2(Math.sin(desiredYaw-yaw),Math.cos(desiredYaw-yaw));
  const desiredBank=clamp(yawError*1.6,-.7,.7);
  let desiredY=s.destroyed?160:range<1000?s.target[1]+100:130;
  const desiredPitch=clamp((desiredY-y)/500,-.16,.20);
  const next=new Set();
  if(bank<desiredBank-.04)next.add('ArrowRight');else if(bank>desiredBank+.04)next.add('ArrowLeft');
  if(pitch<desiredPitch-.018)next.add('ArrowDown');else if(pitch>desiredPitch+.018)next.add('ArrowUp');
  if(s.destroyed)next.add('Shift');
  if(!s.destroyed&&!s.missile&&s.geometry.state){if(!(s.lock===2&&s.selected==='ground'))next.add('KeyX');}
  await setKeys(next);await p.waitForTimeout(65);
 }
 await setKeys(new Set());assert.deepEqual(errors,[]);assert(struck,'Pilot never struck the primary');assert(complete,'Pilot did not extract');console.log('PASS: normal keyboard flight → identify → missile strike → survive → extraction.');
 }finally{await browser?.close();await local?.close();}})().catch(e=>{console.error(e);process.exitCode=1});
