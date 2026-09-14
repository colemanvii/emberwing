// Browser pilot: only normal keyboard inputs affect play. Telemetry is read-only.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const {startStaticServer}=require('./static-server.cjs');
const output=process.env.OUTPUT||path.resolve(__dirname,'../.artifacts/level1');fs.mkdirSync(output,{recursive:true});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
(async()=>{
 const local=process.env.URL?null:await startStaticServer();
 const launch={headless:true,args:['--no-sandbox']};if(process.env.CHROME)launch.executablePath=process.env.CHROME;
 const browser=await chromium.launch(launch);
 const page=await browser.newPage({viewport:{width:1360,height:860}}),errors=[],samples=[],captured=new Set(),held=new Set();
 page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(process.env.URL||(local.url+'/play.html'));await page.waitForFunction(()=>window.emberwing);
 const before=await page.evaluate(()=>emberwing.snapshot());await page.waitForTimeout(2000);const after=await page.evaluate(()=>emberwing.snapshot());
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Simulation moved during briefing');
 await page.screenshot({path:path.join(output,'briefing.png')});await page.click('#deploy');
 async function keys(next){for(const k of held)if(!next.has(k)){await page.keyboard.up(k);held.delete(k)}for(const k of next)if(!held.has(k)){await page.keyboard.down(k);held.add(k)}}
 let lastLog=-10,lastShot=-10;
 const started=Date.now();
 while(Date.now()-started<240000){
  const s=await page.evaluate(()=>{const s=emberwing.snapshot(),z=s.position[2];return {...s,center:emberwing.center(z-550),aheadFloor:emberwing.height(s.position[0],z-220)}});
  if(s.elapsed-lastLog>5){samples.push(s);lastLog=s.elapsed;console.log(JSON.stringify({t:s.elapsed.toFixed(1),p:s.position.map(Math.round),alt:Math.round(s.altitude),hp:s.hp,lock:s.lock,target:s.targetHP,sam:s.samMissile,destroyed:s.destroyed}));}
  const z=s.position[2];
  for(const [name,threshold] of [['approach',1200],['escarpment',850],['dogleg',250],['valley',-150],['bandit',-500],['throat',-1900],['bend',-4200],['reveal',-4800],['attack',-5350],['escape',-6200]])if(z<threshold&&!captured.has(name)){captured.add(name);await page.screenshot({path:path.join(output,name+'.png')});}
  if(s.destroyed&&!captured.has('destruction')){captured.add('destruction');await page.screenshot({path:path.join(output,'destruction.png')});}
  if(s.crashed||s.complete){await page.screenshot({path:path.join(output,s.complete?'extracted.png':'crash.png')});console.log('TERMINAL',JSON.stringify(s));samples.push(s);break;}
  const [x,y]=s.position,[qx,qy,qz,qw]=s.quaternion;
  const bank=Math.atan2(-2*(qx*qy+qw*qz),1-2*(qx*qx+qz*qz)),pitch=Math.asin(clamp(s.forward[1],-1,1)),yaw=Math.atan2(s.forward[0],-s.forward[2]);
  let targetX=s.center;
  // Follow the natural westward dogleg around the eastern escarpment without treating it like a binary lane choice.
  if(z<1180&&z>-260)targetX=s.center-120;
  if(z<-4400&&z>-5850&&!s.destroyed)targetX=s.target[0];
  let altitude=z>3500?110:50;
  let desiredY=s.aheadFloor+altitude;
  if(z<-4800&&!s.destroyed)desiredY=s.target[1]+100;
  let desiredPitch=clamp((desiredY-y)/480,-.21,.18);
  const desiredYaw=Math.atan2(targetX-x,600),yawError=Math.atan2(Math.sin(desiredYaw-yaw),Math.cos(desiredYaw-yaw)),desiredBank=clamp(yawError*1.8,-.5,.5);
  const next=new Set();
  if(bank<desiredBank-.045)next.add('ArrowRight');else if(bank>desiredBank+.045)next.add('ArrowLeft');
  if(pitch<desiredPitch-.016)next.add('ArrowDown');else if(pitch>desiredPitch+.016)next.add('ArrowUp');
  if((z<-1900&&z>-3500)||(s.destroyed&&z<-5900))next.add('Shift');
  if(!s.destroyed&&s.geometry.state&&s.selected!=='ground'&&!s.seeker)next.add('KeyX');
  if(!s.destroyed&&s.geometry.state&&!s.missile&&s.elapsed-lastShot>2){
   if(s.lock===2&&s.selected==='ground'){lastShot=s.elapsed;}
   else next.add('KeyX');
  }
  await keys(next);await page.waitForTimeout(110);
 }
 await keys(new Set());
 fs.writeFileSync(path.join(output,'flight-log.json'),JSON.stringify({errors,samples},null,2));
 await page.keyboard.press('r');await page.waitForTimeout(500);console.log('RESET',await page.evaluate(()=>emberwing.snapshot()));
 await browser.close();if(local)await local.close();
 if(errors.length||!samples.at(-1)?.complete)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
