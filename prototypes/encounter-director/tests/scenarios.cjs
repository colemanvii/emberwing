const {chromium}=require('playwright');
const {startStaticServer}=require('../../../scripts/static-server.cjs');
const HOOK=`
const T={
 step(n,dt,fns){for(let i=0;i<n;i++){missionElapsed+=dt;for(const f of fns)f(dt);}},
 straggler(){
  reset();mission.phase='flight';missionElapsed=20;enemyAlive=false;enemy.visible=false;mission.bandit=false;
  ship.position.set(valleyCenter(-3000),terrainHeight(valleyCenter(-3000),-3000)+120,-3000);ship.quaternion.identity();
  const played=directorOpportunity({side:1});const radioA=radio.textContent,hpA=enemyHP;
  // Spawned defender must not replace the straggler.
  spawnDefender();const stillStraggler=director.straggler&&enemyHP===hpA;
  playerHP=1;const killsBefore=kills;
  enemy.position.copy(ship.position).add(new THREE.Vector3(0,0,-250));enemyVel.set(0,0,0);
  keys.Space=true;for(let i=0;i<120&&enemyAlive;i++){missionElapsed+=1/60;updateWeapons(1/60);enemy.position.copy(ship.position).add(new THREE.Vector3(0,0,-250));}keys.Space=false;
  director.deck=[];const killed=!enemyAlive;const trace=[];for(let i=0;i<5;i++){missionElapsed+=1/60;updateMission(1/60);trace.push([enemyAlive,director.straggler,kills,director.stragglerKills,mission.phase,crashed,missionComplete].join(','));}
  return{played,radioA,stillStraggler,killed,kills:kills-killsBefore,hp:playerHP,radioB:radio.textContent,marker:+hitMark.style.opacity,trace};
 },
 stragglerEscapeNoReward(){
  reset();mission.phase='flight';missionElapsed=20;kills=2;enemyAlive=false;enemy.visible=false;mission.bandit=false;
  ship.position.set(valleyCenter(-3000),terrainHeight(valleyCenter(-3000),-3000)+120,-3000);ship.quaternion.identity();
  director.deck=[];directorOpportunity({side:-1});playerHP=1;enemyAlive=false;enemy.visible=false;
  for(let i=0;i<3;i++){missionElapsed+=1/60;updateMission(1/60);}return{hp:playerHP,radio:radio.textContent};
 },
 ambush(){
  reset();mission.phase='flight';missionElapsed=30;
  ship.position.set(valleyCenter(-1500),terrainHeight(valleyCenter(-1500),-1500)+90,-1500);ship.quaternion.identity();
  const played=directorAmbush({side:1,fuse:1.2});const radioA=radio.textContent;
  director.deck=[];let before=null;
  for(let i=0;i<150;i++){missionElapsed+=1/60;updateMission(1/60);if(i===50)before=sam.missiles.length;}
  return{played,radioA,beforeFuse:before,afterFuse:sam.missiles.length,fuse:director.fuse};
 },
 intercept(){
  reset();mission.phase='flight';missionElapsed=8;
  ship.position.set(valleyCenter(-1000),terrainHeight(valleyCenter(-1000),-1000)+90,-1000);ship.quaternion.identity();
  directorIntercept({bearing:{name:'6 HIGH',fwd:-520,side:90,dy:70}});return{radio:radio.textContent,alive:enemyAlive};
 },
 pass(turn){
  reset();mission.phase='flight';missionElapsed=40;director.deck=[];director.straggler=false;
  ship.position.set(valleyCenter(-2500),terrainHeight(valleyCenter(-2500),-2500)+260,-2500);ship.quaternion.identity();
  spawnDefender();banditOfferActive=false;enemyAlive=true;enemy.visible=true;enemyHP=3;
  enemy.position.copy(ship.position).add(new THREE.Vector3(120,40,700));enemy.quaternion.setFromAxisAngle(worldUp,Math.PI);
  const modes=[],crossings=[],behindCalls=[];let window=0;
  for(let i=0;i<60*40;i++){const dt=1/60;missionElapsed+=dt;
   if(turn&&(pass.mode==='setup'||turn==='track'&&pass.mode==='cross')){const to=enemy.position.clone().sub(ship.position);to.y=0;const f=new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion);f.y=0;
    const yaw=Math.sign(f.x*to.z-f.z*to.x)*-1;ship.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(worldUp,yaw*.7*dt));}
   const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(ship.quaternion);ship.position.addScaledVector(fwd,speed*dt);
   ship.position.y=Math.max(ship.position.y,terrainHeight(ship.position.x,ship.position.z)+260);
   const was=pass.mode;updateEnemy(dt);
   if(!modes.length||!modes[modes.length-1].startsWith(pass.mode+'@'))modes.push(pass.mode+'@'+(missionElapsed-40).toFixed(1));
   if(was!=='cross'&&pass.mode==='cross'){crossings.push({deg:+(pass.crossAt.angle*180/Math.PI).toFixed(1),range:Math.round(pass.crossAt.range)});if(pass.crossAt.angle>PASS_NOSE)behindCalls.push(radio.textContent);}
   if(pass.mode==='cross'){const g=passGeometry();if(g.angle<.2&&g.range<560)window+=dt;}
  }
  return{modes,crossings,behindCalls,gunWindowSeconds:+window.toFixed(2)};
 }
};
window.T=T;`;
(async()=>{
 const local=await startStaticServer();const browser=await chromium.launch({args:['--no-sandbox']});
 const out={};
 {const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/encounter-director/src/level1/game.js*',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:await res.text()+HOOK});});
  await page.goto(local.url+'/prototypes/encounter-director/index.html?seed=7');await page.waitForFunction(()=>window.T,null,{timeout:30000});
  for(const [k,a] of [['intercept'],['straggler'],['stragglerEscapeNoReward'],['ambush'],['pass','track'],['pass',true],['pass',false]])out[k+(a===undefined?'':':'+(a==='track'?'tracking':a?'turning-only-in-setup':'straight'))]=await page.evaluate(([k,a])=>{try{return T[k](a)}catch(e){return 'ERR '+e.message+' '+e.stack.split('\n')[1]}},[k,a]);
  out.errors=errors;await page.close();}
 console.log(JSON.stringify(out,null,1));
 const assert=require('node:assert/strict'),deg=35,maxRange=750;
 assert.deepEqual(out.errors,[]);
 assert.equal(out.straggler.hp,2,'straggler kill patches hull');assert.match(out.straggler.radioB,/STRAGGLER SPLASHED/);
 assert.equal(out.stragglerEscapeNoReward.hp,1,'no reward if straggler is not killed');
 assert.equal(out.ambush.beforeFuse,0);assert.equal(out.ambush.afterFuse,1,'pop-up SAM fires on mission time');
 assert.match(out.intercept.radio,/^BANDIT · /);
 for(const k of ['pass:tracking','pass:turning-only-in-setup']){const p=out[k];assert.ok(p.crossings.length>0,k+': at least one crossing pass');
  for(const c of p.crossings){assert.ok(c.deg<=deg&&c.range<maxRange,`${k}: crossing began ahead (${c.deg}°, ${c.range}u)`);}}
 for(const k of ['pass:tracking','pass:turning-only-in-setup','pass:straight'])assert.deepEqual(out[k].behindCalls,[],k+': never calls CROSSING from behind');
 assert.ok(out['pass:tracking'].gunWindowSeconds>out['pass:turning-only-in-setup'].gunWindowSeconds,'tracking the crossing earns a longer gun window');
 console.log('scenario checks passed');await browser.close();local.close?.();local.server?.close?.();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
