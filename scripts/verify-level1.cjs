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
 const page=await browser.newPage({viewport:{width:840,height:520}}),errors=[],samples=[],captured=new Set(),held=new Set();
 page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(process.env.URL||(local.url+'/play.html'));await page.waitForFunction(()=>window.emberwing);
 // Level 1 is deliberately one authored mission. Repeat runs test mastery, not hidden encounter variants.
 const reckless=process.env.RECKLESS==='1';
 const opening=await page.evaluate(()=>emberwing.snapshot());
 if(opening.phase!=='flight')throw Error('Level 1 did not begin in live flight');
 await page.waitForTimeout(350);
 await page.screenshot({path:path.join(output,'opening.png')});
 async function keys(next){for(const k of held)if(!next.has(k)){await page.keyboard.up(k);held.delete(k)}for(const k of next)if(!held.has(k)){await page.keyboard.down(k);held.add(k)}}
 let lastLog=-10,lastShot=-10,recklessPunished=false;
 const events={};
 const started=Date.now();
 while(Date.now()-started<(reckless?120000:420000)){
  const s=await page.evaluate(()=>{const s=emberwing.snapshot(),z=s.position[2];return {...s,center:emberwing.center(z-550),aheadFloor:emberwing.height(s.position[0],z-220)}});
  if(s.elapsed-lastLog>1){samples.push(s);lastLog=s.elapsed;console.log(JSON.stringify({t:s.elapsed.toFixed(1),p:s.position.map(Math.round),alt:Math.round(s.altitude),ahead:Math.round(s.aheadFloor),hp:s.hp,lock:s.lock,target:s.targetHP,sam:s.samMissile,bandit:s.banditRange===null?null:Math.round(s.banditRange),passes:s.banditPasses,destroyed:s.destroyed}));}
  const z=s.position[2];
  if(reckless&&s.hp<=1&&z<-2200){
   recklessPunished=true;
   await page.screenshot({path:path.join(output,'reckless-critical.png')});
   samples.push(s);
   break;
  }
  for(const [event,active] of [['targetVisible',s.geometry.onscreen],['targetAcquired',s.selected==='ground'&&s.lock===2],['strike',s.destroyed]])if(active&&!events[event]){events[event]={time:s.elapsed,position:s.position,altitude:s.altitude};await page.screenshot({path:path.join(output,event+'.png')});}
  for(const [name,threshold] of [['approach',1200],['escarpment',850],['dogleg',250],['valley',-150],['bandit',-500],['throat',-1900],['pre-reveal',-4400],['headland',-5000],['reveal',-5200],['attack',-5450],['post-strike',-5800],['escape',-6200],['breakout',-7000]])if(z<threshold&&!captured.has(name)){captured.add(name);await page.screenshot({path:path.join(output,name+'.png')});}
  if(s.destroyed&&!captured.has('destruction')){captured.add('destruction');await page.screenshot({path:path.join(output,'destruction.png')});}
  if(s.crashed||s.complete){await page.screenshot({path:path.join(output,s.complete?'extracted.png':'crash.png')});console.log('TERMINAL',JSON.stringify(s));samples.push(s);break;}
  const [x,y]=s.position,[qx,qy,qz,qw]=s.quaternion;
  const bank=Math.atan2(-2*(qx*qy+qw*qz),1-2*(qx*qx+qz*qz)),pitch=Math.asin(clamp(s.forward[1],-1,1)),yaw=Math.atan2(s.forward[0],-s.forward[2]);
  let targetX=s.center;
  if(!reckless){
   // Follow the natural westward dogleg around the eastern escarpment without treating it like a binary lane choice.
   if(z<1180&&z>-260)targetX=s.center-120;
   // Read the western shoulder, then turn toward the installation once around the headland.
   if(z<-3600&&z>-4900)targetX=s.center-130;
   // Break west after impact: flying through the surviving launch tower is still a collision.
   if(s.destroyed&&z>-6100)targetX=s.center-180;
  }
  if(z<=-4900&&z>-5900&&!s.destroyed)targetX=s.target[0];
  const altitude=Number(process.env.ALTITUDE||(reckless?110:50));
  let desiredY=s.aheadFloor+altitude;
  if(z<-5150&&!s.destroyed)desiredY=s.target[1]+(reckless?95:65);
  // The normal pilot reacts. The reckless regression pilot deliberately ignores every warning.
  const missileBreak=!reckless&&s.samMissile;
  const banditBreak=!reckless&&s.banditRange!==null&&s.banditRange<245;
  let desiredPitch=clamp((desiredY-y)/480,-.21,.18);

  const aiming=z<-4900&&z>-5480&&!s.destroyed;
  if(aiming)desiredPitch=clamp(Math.atan2(s.target[1]-y,Math.hypot(s.target[0]-x,s.target[2]-z)),-.21,.18);
  const desiredYaw=aiming?Math.atan2(s.target[0]-x,z-s.target[2]):Math.atan2(targetX-x,600),yawError=Math.atan2(Math.sin(desiredYaw-yaw),Math.cos(desiredYaw-yaw));
  let desiredBank=clamp(yawError*1.8,-.58,.58);
  if(missileBreak){
   desiredBank=(x<s.center?1:-1)*.72;
   // Stay low when there is room, but never flatten the pull when terrain is already rising into us.
   if(s.altitude>72)desiredPitch=Math.min(desiredPitch,-.08);
   else{desiredPitch=Math.max(desiredPitch,.13);desiredBank=clamp(desiredBank,-.38,.38);}
  }else if(banditBreak&&s.banditPosition){
   desiredBank=(x<s.center?1:-1)*.66;
   if(s.altitude>88)desiredPitch=Math.min(desiredPitch,-.055);
   else{desiredPitch=Math.max(desiredPitch,.12);desiredBank=clamp(desiredBank,-.38,.38);}
  }
  // Terrain is the final authority. A verification pilot may evade, but it may not knowingly trade
  // radar masking for a ground collision. Recover toward the authored corridor before resuming the break.
  if(!reckless&&(s.altitude<45||s.aheadFloor+38>y)){
   desiredBank=clamp(yawError*1.25,-.34,.34);
   desiredPitch=Math.max(desiredPitch,.15);
  }
  const next=new Set();
  if(bank<desiredBank-.045)next.add('ArrowRight');else if(bank>desiredBank+.045)next.add('ArrowLeft');
  if(pitch<desiredPitch-.016)next.add('ArrowDown');else if(pitch>desiredPitch+.016)next.add('ArrowUp');
  if(reckless||missileBreak||banditBreak||(z<-1900&&z>-3500)||(s.destroyed&&z<-5900))next.add('Shift');
  if(!s.destroyed&&s.geometry.state&&s.selected!=='ground'&&!s.seeker)next.add('KeyX');
  if(!s.destroyed&&s.geometry.state&&!s.missile&&s.elapsed-lastShot>2){
   if(s.lock===2&&s.selected==='ground'){lastShot=s.elapsed;}
   else next.add('KeyX');
  }

  await keys(next);await page.waitForTimeout(110);
 }
 await keys(new Set());
 fs.writeFileSync(path.join(output,'flight-log.json'),JSON.stringify({errors,events,samples},null,2));
 await page.keyboard.press('r');await page.waitForTimeout(500);console.log('RESET',await page.evaluate(()=>emberwing.snapshot()));
 const terminal=samples.at(-1),tookHostileDamage=samples.some(sample=>sample.hp<3);
 await browser.close();if(local)await local.close();
 if(reckless){
  if(errors.length||terminal?.complete||!tookHostileDamage||!recklessPunished){
   console.error('RECKLESS REGRESSION',JSON.stringify({complete:terminal?.complete,crashed:terminal?.crashed,hp:terminal?.hp,tookHostileDamage,recklessPunished}));
   process.exitCode=1;
  }else console.log('PASS: reckless centerline reaches critical damage before the terminal half');
 }else if(errors.length||!terminal?.complete)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});