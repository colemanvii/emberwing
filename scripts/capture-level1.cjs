// Visual review for Level 1: the real game, stepped at a fixed 60 Hz so screenshots land on
// exact moments. The pilot uses only real keyboard events (the same policy as verify-level1);
// the page's own rAF loop is paused and replaced by an identical fixed-step body.
//   node scripts/capture-level1.cjs [outDir] [w]x[h]
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const {startStaticServer}=require('./static-server.cjs');
const out=path.resolve(process.argv[2]||path.join(__dirname,'../.artifacts/level1/capture'));
const [W,H]=(process.argv[3]||'1280x720').split('x').map(Number);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const local=await startStaticServer({port:0});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:W,height:H}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/level1/game.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+`
window.__cap={pause(){loop=function(){};},
 step(frames){const rawDt=1/60;for(let i=0;i<frames;i++){if(mission.phase!=='flight'||crashed)break;
  const dt=rawDt*(killSlow>0?.42:1);killSlow=Math.max(0,killSlow-rawDt);missionElapsed+=rawDt;
  if(!briefing.hidden&&missionElapsed>=mission.introUntil)briefing.hidden=true;
  updateTouchFlight();updateFlight(dt);updateDanger(dt);updateWorld();if(enemyAlive)updateEnemy(dt);updateEnemyAttack(dt);updateSamNetwork(dt);updateMission(dt);updateRange(dt);updateCamera(dt);updateSpeedFX(dt);updateCombatFX(dt);updateWeapons(dt);updateV43SamSmoke(dt);updateLaunchClimax(dt);v44UpdateFirestorm(dt);updateTargeting(dt);updateGuidance();updateBanditCue(dt);updateInstruments();
  if(typeof cinematicFrame==='function')cinematicFrame(dt,rawDt);}
  renderer.render(scene,camera);}};`});});
 await page.goto(local.url+'/play.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.emberwing&&window.__cap);
 await page.evaluate(()=>__cap.pause());
 const held=new Set();
 async function keys(next){for(const k of held)if(!next.has(k)){await page.keyboard.up(k);held.delete(k)}for(const k of next)if(!held.has(k)){await page.keyboard.down(k);held.add(k)}}
 const shots=[3,6,10,14,18,24,30,38,46,54,62,70],taken=new Set(),events={};let lastShot=-10,lastRange=null;
 const shoot=async name=>{await page.screenshot({path:path.join(out,name+'.png')});};
 for(let n=0;n<1400;n++){
  await page.evaluate(()=>__cap.step(6));
  const s=await page.evaluate(()=>{const s=emberwing.snapshot(),[x,,z]=s.position,[fx,,fz]=s.forward,h=Math.hypot(fx,fz)||1;
   return {...s,center:emberwing.center(z-550),aheadFloor:emberwing.height(x+fx/h*220,z+fz/h*220),farFloor:emberwing.height(x+fx/h*420,z+fz/h*420)};});
  for(const t of shots)if(s.elapsed>=t&&!taken.has(t)){taken.add(t);await shoot('t'+String(t).padStart(3,'0'));}
  for(const [ev,on] of [['bandit-near',s.banditRange!==null&&s.banditRange<260],['sam-missile',s.samMissile],['lock',s.lock===2],['strike',s.destroyed]])
   if(on&&!events[ev]){events[ev]=s.elapsed;await shoot('ev-'+ev);}
  if(events.strike&&!events.strike2&&s.elapsed>events.strike+.6){events.strike2=s.elapsed;await shoot('ev-strike-0.6s');}
  if(s.crashed||s.complete){await shoot(s.complete?'extracted':'crash');console.log('TERMINAL',s.complete?'complete':'crash',s.elapsed.toFixed(1),'hp',s.hp);break;}
  const [x,y,z]=s.position,[qx,qy,qz,qw]=s.quaternion;
  const bank=Math.atan2(-2*(qx*qy+qw*qz),1-2*(qx*qx+qz*qz)),pitch=Math.asin(clamp(s.forward[1],-1,1)),yaw=Math.atan2(s.forward[0],-s.forward[2]);
  const closing=s.banditRange!==null&&lastRange!==null&&s.banditRange<lastRange-2;lastRange=s.banditRange;
  let targetX=s.center;
  if(z<1180&&z>-260)targetX=s.center-120;
  if(z<-2400&&z>-5150)targetX=s.center-480;
  if(s.destroyed&&z>-6100)targetX=s.center-180;
  if(z<=-5150&&z>-5900&&!s.destroyed)targetX=s.target[0];
  let desiredY=Math.max(s.aheadFloor+50,s.farFloor+38);
  if(z<-5200&&!s.destroyed)desiredY=s.target[1]+65;
  let desiredPitch=clamp((desiredY-y)/480,-.21,.18);
  const aiming=z<-5150&&z>-5530&&!s.destroyed;
  if(aiming)desiredPitch=clamp(Math.atan2(s.target[1]-y,Math.hypot(s.target[0]-x,s.target[2]-z)),-.21,.18);
  const desiredYaw=aiming?Math.atan2(s.target[0]-x,z-s.target[2]):Math.atan2(targetX-x,600),yawError=Math.atan2(Math.sin(desiredYaw-yaw),Math.cos(desiredYaw-yaw));
  let desiredBank=clamp(yawError*1.8,-.58,.58);
  const tight=s.altitude<48||s.aheadFloor+50>y||s.farFloor+40>y;
  const missileBreak=s.samMissile,banditBreak=s.banditRange!==null&&s.banditRange<285&&(closing||s.banditRange<170);
  if(missileBreak||banditBreak){desiredBank=(x<s.center?1:-1)*.7;if(!tight&&s.altitude>80)desiredPitch=Math.min(desiredPitch,-.05);else{desiredPitch=Math.max(desiredPitch,.12);desiredBank=clamp(desiredBank,-.38,.38);}}
  if(tight){desiredBank=clamp(yawError*1.25,-.34,.34);desiredPitch=Math.max(desiredPitch,.17);}
  const next=new Set();
  if(bank<desiredBank-.045)next.add('ArrowRight');else if(bank>desiredBank+.045)next.add('ArrowLeft');
  if(pitch<desiredPitch-.016)next.add('ArrowDown');else if(pitch>desiredPitch+.016)next.add('ArrowUp');
  if(((missileBreak||banditBreak)&&!tight)||(z<-1900&&z>-3500)||(s.destroyed&&z<-5900))next.add('Shift');
  // Guns whenever the bandit sits near the nose and in range.
  if(s.banditPosition&&s.banditRange<700){const [bx,by,bz]=s.banditPosition,dx=bx-x,dy=by-y,dz=bz-z,d=Math.hypot(dx,dy,dz);
   if((dx*s.forward[0]+dy*s.forward[1]+dz*s.forward[2])/d>.96)next.add('Space');}
  if(!s.destroyed&&s.geometry.state&&s.selected!=='ground'&&!s.seeker)next.add('KeyX');
  if(!s.destroyed&&s.geometry.state&&!s.missile&&s.elapsed-lastShot>2){if(s.lock===2&&s.selected==='ground')lastShot=s.elapsed;else next.add('KeyX');}
  await keys(next);
 }
 await keys(new Set());
 fs.writeFileSync(path.join(out,'events.json'),JSON.stringify({events,errors},null,2));
 console.log('events',JSON.stringify(events),errors.length?errors:'no page errors');
 await browser.close();await local.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
