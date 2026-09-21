// Development-only browser pilot: real game loop, fixed clock, ordinary flight inputs.
// Matched post-Throat Z/time checkpoints, already committed to each lateral line.
// The clock starts at 23s for encounter state only; reported section times subtract it.
// This does not certify full-run pacing. No enemy/physics/health overrides.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {startStaticServer}=require('./static-server.cjs');
(async()=>{
 const server=await startStaticServer();
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1000,height:650}}),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=417;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};});
 await page.route('**/src/level1/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
const routeEvents=[];
const routeHit=hitPlayer;hitPlayer=function(){const hp=playerHP;routeHit();if(playerHP<hp)routeEvents.push({type:'damage',t:missionElapsed,source:new Error().stack.includes('updateOneSamMissile')?'sam':'other'});};
const routeLaunch=launchSam;
launchSam=function(site){const n=sam.missiles.length;routeLaunch(site);if(sam.missiles.length>n)routeEvents.push({type:'launch',t:missionElapsed,site:site.index+1});};
window.routePilot={
 start(route){reset();const x=valleyCenter(-3050)+(route.startsWith('west')?-480:200);ship.position.set(x,terrainHeight(x,-3050)+(route==='west-cover'?620:65),-3050);ship.quaternion.identity();speed=TURBO_SPEED;missionElapsed=23;mission.ingressArmed=mission.detected=mission.bandit=true;mission.penetrated=false;spawnDefender();camera.position.copy(ship.position).add(new THREE.Vector3(0,6,16));resetCameraFrame();updateWorld();updateCamera(1/60);routeEvents.length=0;clock.getDelta=()=>1/60;},
 step(input){for(const k of new Set([...Object.keys(keys),...input])){const down=input.includes(k);if(k==='KeyX'){if(!!keys[k]!==down)key({code:k,repeat:false,preventDefault(){}},down);}else keys[k]=down;}loop();return this.read();},
 read(){return {...emberwing.snapshot(),terrainVisible:lineClear(ship.position,rocket.position),exposure:sam.sites.map(s=>samExposure(s)?.exposure||0),locks:sam.sites.map(s=>s.lock),los:sam.sites.map(s=>samLineClear(s)),events:[...routeEvents],terrainLos:sam.sites.map(s=>lineClear(s.position,ship.position,6)),incoming:sam.missiles.map(m=>m.mesh.position.distanceTo(ship.position)),ahead:[180,360,540].map(d=>{const f=heading();return terrainHeight(ship.position.x+f.x*d,ship.position.z+f.z*d);})};}
};`});});
 await page.goto(server.url+'/play.html');await page.waitForFunction(()=>window.routePilot,null,{polling:100});
 fs.mkdirSync('.artifacts/routes',{recursive:true});
 const results=[];
 for(const route of (process.env.ROUTES||'west,east,east-low,west-cover').split(',')){
 await page.evaluate(route=>routePilot.start(route),route);
 const result=await page.evaluate(route=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let s=routePilot.read(),last=s;
 const m={route,checkpoint:23,visible:null,opportunity:null,strike:null,arrival:null,extraction:null,tracking:0,weightedExposure:0,trackBreaks:[],minHull:3,strikeHull:null,launches:[],samples:[]};
 for(let i=0;i<60*32&&!s.crashed&&!s.complete&&!s.destroyed;i++){
 const [x,y,z]=s.position,[qx,qy,qz,qw]=s.quaternion;
 const bank=Math.atan2(-2*(qx*qy+qw*qz),1-2*(qx*qx+qz*qz)),pitch=Math.asin(clamp(s.forward[1],-1,1)),yaw=Math.atan2(s.forward[0],-s.forward[2]);
 let tx=emberwing.center(z-400)+(route.startsWith('west')?-480:200);
 const turnZ=route.startsWith('west')?-5150:-4900;if(z<turnZ)tx=s.target[0];
 if(s.destroyed||s.missile)tx=emberwing.center(z-400)+250;
 let desiredY=Math.max(...s.ahead)+(route==='east-low'?25:55);if(s.destroyed||s.missile)desiredY=Math.max(desiredY,150);
 const aiming=z<turnZ&&!s.destroyed&&!s.missile;
 let dp=clamp((desiredY-y)/420,-.23,.23);
 if(aiming&&s.terrainVisible)dp=clamp(Math.atan2(s.target[1]-y,Math.hypot(s.target[0]-x,s.target[2]-z)),-.23,.18);
 const dyaw=aiming?Math.atan2(s.target[0]-x,z-s.target[2]):Math.atan2(tx-x,450);
 const err=Math.atan2(Math.sin(dyaw-yaw),Math.cos(dyaw-yaw));let db=clamp(err*5,-1.4,1.4);
 if(s.altitude<(route==='east-low'?18:32)){dp=Math.max(dp,.19);db=clamp(db,-.35,.35);}
 const input=(route.startsWith('west')&&z<-4550&&!s.destroyed)?[]:['ShiftLeft'];
 if(bank<db-.025)input.push('ArrowRight');else if(bank>db+.025)input.push('ArrowLeft');
 if(aiming&&Math.abs(err)>.25&&Math.abs(bank)>1.1)input.push('ArrowDown');else if(pitch<dp-.012)input.push('ArrowDown');else if(pitch>dp+.012)input.push('ArrowUp');
 // Hold/release the normal missile key; no forced hit or target state changes.
 if(aiming&&!s.missile&&!(s.selected==='ground'&&s.lock===2))input.push('KeyX');
 s=routePilot.step(input);
 const dt=s.elapsed-last.elapsed;
 if(s.terrainVisible&&m.visible===null)m.visible=s.elapsed-23;
 if(s.geometry.state&&m.opportunity===null)m.opportunity=s.elapsed-23;
 if(z<=-5350&&m.arrival===null)m.arrival=s.elapsed-23;
 if(!s.destroyed){m.tracking+=s.samTracks.some(v=>v>0)?dt:0;m.weightedExposure+=s.exposure.reduce((a,b)=>a+b,0)*dt;}
 for(let j=0;j<5;j++)if(last.locks[j]>.05&&last.los[j]&&!s.los[j])m.trackBreaks.push({t:s.elapsed-23,site:j+1,lock:last.locks[j],terrainBlocked:!s.terrainLos[j]});
 if(s.destroyed&&m.strike===null){m.strike=s.elapsed-23;m.strikeHull=s.hp;m.launches=s.events.filter(e=>e.type==='launch');}
 m.minHull=Math.min(m.minHull,s.hp);
 if(i%60===0)m.samples.push({t:s.elapsed-23,p:s.position,alt:s.altitude,hp:s.hp,tracks:s.samTracks,exposure:s.exposure,geometry:s.geometry,lock:s.lock,selected:s.selected,seeker:s.seeker,missile:s.missile});
 last=s;
 }
 m.launchesBeforeStrike=m.strike===null?s.events.filter(e=>e.type==='launch').length:m.launches.length;m.extraction=s.complete?s.elapsed:null;m.terminal=s;return m;
 },route);
 await page.screenshot({path:'.artifacts/routes/'+route+'.png'});
 results.push(result);
 console.log(JSON.stringify({...result,samples:undefined,terminal:{position:result.terminal.position,hp:result.terminal.hp,crashed:result.terminal.crashed,destroyed:result.terminal.destroyed,events:result.terminal.events}}));
 }
 fs.writeFileSync('.artifacts/routes/'+(process.env.REPORT||'results')+'.json',JSON.stringify({errors,results},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 const west=results.find(r=>r.route==='west'),east=results.find(r=>r.route==='east');
 if(west&&east){
  assert.ok(west.terminal.destroyed&&east.terminal.destroyed,'Both representative lines must complete the strike');
  assert.ok(west.opportunity>east.opportunity+1&&west.strike>east.strike+1,'The west shoulder must delay the strike');
  assert.ok(west.tracking<east.tracking*.5&&west.weightedExposure<east.weightedExposure*.5,'West must materially reduce SAM exposure');
  assert.equal(west.strikeHull,3,'The masked line must allow a damage-free strike');
  assert.ok(east.launchesBeforeStrike>west.launchesBeforeStrike&&east.strikeHull<3,'Greedy east must meet a credible threat');
 }
 const cover=results.find(r=>r.route==='west-cover');
 if(cover)assert.ok(cover.trackBreaks.some(b=>b.terrainBlocked)&&cover.samples.some(s=>s.t>3&&s.t<6&&s.tracks.every(t=>t===0)),'Terrain must extinguish an established track');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
