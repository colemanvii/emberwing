// Fast browser checks for Level 1 mission boundaries and weapon behavior.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {startStaticServer}=require('./static-server.cjs');

(async()=>{
 let local,browser;
 try{
  const target=process.env.URL||(await (async()=>{local=await startStaticServer();return local.url+'/play.html';})());
  const launch={headless:true,args:['--no-sandbox']};
  if(process.env.CHROME)launch.executablePath=process.env.CHROME;
  browser=await chromium.launch(launch);
  const page=await browser.newPage({hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));

  const instrument=async route=>{
   const response=await route.fetch();
   await route.fulfill({
    response,
    body:await response.text()+`
window.scenario={
  exitZ:LEVEL.exitZ,
  combatFeedback(){
    reset();mission.phase='flight';missionElapsed=10;
    const originalChirp=chirp,originalFlash=flashScreen,sounds=[];let flashes=0;
    chirp=(...args)=>sounds.push(args);flashScreen=()=>{flashes++;};
    try{
      spawnDefender();enemyDetected=true;
      const mats=enemy.userData.hitMats||[];
      hitKick=0;spawnImpactFX(rocket.position.clone(),false);
      const groundFlashedFighter=mats.some(m=>m.emissive.getHex()!==0),hitKickAmount=hitKick;
      hitKick=0;spawnImpactFX(enemy.position.clone(),true,true,true);
      const fighterFlashed=mats.some(m=>m.emissive.getHex()!==0),killKickAmount=hitKick;
      camera.position.copy(ship.position);camera.quaternion.identity();
      hitKick=0;hostileNearCooldown=0;const hp=playerHP;sounds.length=0;flashes=0;
      hostileNearMiss(ship.position.clone().add(new THREE.Vector3(-10,0,0)));
      const near={sounds:sounds.length,left:sounds.every(a=>a[4]<0),soft:sounds.every(a=>a[5]==='sine'),flashes,kick:hitKick,hpUnchanged:hp===playerHP};
      hostileNearMiss(ship.position.clone().add(new THREE.Vector3(10,0,0)));
      const throttled=sounds.length===2;
      sounds.length=0;
      const far=missileWarning(ship.position.clone().add(new THREE.Vector3(900,0,0)));
      const close=missileWarning(ship.position.clone().add(new THREE.Vector3(50,0,0)));
      const directional=sounds.every(a=>a[4]>0);
      missionElapsed=20;mission.messageUntil=0;enemyTime=5;duel.state='engage';duelState('extend');const leaving=radio.textContent;
      missionElapsed+=2;duelState('engage');const returning=radio.textContent;
      announce('MISSILE INBOUND');missionElapsed+=.5;announce('BANDIT BREAKING');const urgent=radio.textContent;
      return {groundFlashedFighter,fighterFlashed,hitKickAmount,killKickAmount,near,throttled,far,close,directional,leaving,returning,urgent};
    }finally{chirp=originalChirp;flashScreen=originalFlash;reset();mission.phase='test';}
  },
  fighterCadence(){
    reset();mission.phase='test';spawnDefender();banditOfferActive=false;
    ship.position.set(0,1400,0);ship.quaternion.identity();
    enemy.position.set(0,1400,-600);enemy.quaternion.identity();duel.forward.set(0,0,-1);duelState('extend');
    mission.detected=true;enemyTime=5;banditReattackClock=0;
    let earlyAttack=false;
    for(let i=0;i<120;i++){missionElapsed+=1/60;updateEnemy(1/60);earlyAttack ||= duel.state!=='extend'||enemyFireSolution()||hostileLockSolution();}
    const stayedOut=!earlyAttack;
    for(let i=0;i<30;i++){missionElapsed+=1/60;updateEnemy(1/60);}
    const returned=duel.state!=='extend';
    enemy.position.set(0,1400,300);enemy.quaternion.identity();duel.forward.set(0,0,-1);duelState('press');duel.age=3.51;
    updateEnemy(1/60);const endedPress=duel.state==='extend';
    return {stayedOut,returned,endedPress};
  },
  samCadence(){
    reset();mission.phase='test';mission.ingressArmed=true;mission.detected=true;
    ship.position.set(0,1400,500);playerInvuln=999;
    const site=sam.sites[0];site.position.set(0,1200,0);site.cooldown=0;
    for(const other of sam.sites.slice(1))other.disabled=true;
    const originalExposure=samExposure;let exposed=true;
    samExposure=s=>s===site&&exposed?{exposure:10,agl:200}:null;
    const advance=n=>{for(let i=0;i<n;i++){missionElapsed+=1/60;updateSamNetwork(1/60);}};
    try{
      advance(60);const premature=sam.missiles.length;
      exposed=false;advance(1);exposed=true;advance(60);const afterCover=sam.missiles.length;
      advance(27);const launched=sam.missiles.length;
      const active=sam.missiles[0],life=active.life;advance(1);const stillMoving=active.life<life;
      launchHostileMissile();const overlap=!!hostileMissile;
      removeSamMissile();advance(100);const quiet=sam.missiles.length===0&&site.lock===0;
      launchHostileMissile();const earlyFighter=!!hostileMissile;
      advance(21);launchHostileMissile();const fighter=!!hostileMissile;
      launchSam(site);const samOverlap=sam.missiles.length;
      removeHostileMissile();advance(100);const afterFighter=sam.missiles.length;
      advance(110);const resumed=sam.missiles.length;
      return {premature,afterCover,launched,stillMoving,overlap,quiet,earlyFighter,fighter,samOverlap,afterFighter,resumed};
    }finally{samExposure=originalExposure;reset();mission.phase='test';}
  },
  sustainedPressure(){
    reset();mission.phase='test';mission.ingressArmed=true;mission.destroyed=true;
    ship.position.set(0,1400,500);playerInvuln=999;
    const site=sam.sites[0];site.position.set(0,1200,0);site.cooldown=0;
    for(const other of sam.sites.slice(1))other.disabled=true;
    const originalExposure=samExposure;samExposure=s=>s===site?{exposure:10,agl:200}:null;
    let maximum=0,launches=0,lastEnd=null,minGap=Infinity,previous=0;
    try{
      for(let i=0;i<5400;i++){
        missionElapsed+=1/30;updateSamNetwork(1/30);
        const count=sam.missiles.length;maximum=Math.max(maximum,count);
        if(count&&!previous){launches++;if(lastEnd!==null)minGap=Math.min(minGap,missionElapsed-lastEnd);}
        if(!count&&previous)lastEnd=missionElapsed;
        previous=count;
      }
      return {maximum,launches,minGap,elapsed:missionElapsed};
    }finally{samExposure=originalExposure;reset();mission.phase='test';}
  },
  feedback(){
    reset();missionElapsed=10;announce('HIT');const hit=radio.textContent;
    announce('MISSILE INBOUND');const danger=radio.textContent;
    missionElapsed+=.5;announce('HIT');const protectedDanger=radio.textContent;
    missionElapsed+=2;announce('CONTACT DESTROYED');
    const kill=radio.textContent;mission.phase='test';return {hit,danger,protectedDanger,kill};
  },
  earlyOffer(){
    reset();mission.phase='test';missionElapsed=1.19;updateMission(0);const before=enemyAlive;
    missionElapsed=1.2;updateMission(0);
    return {before,offered:enemyAlive,offer:banditOfferActive,clock:banditOfferClock,canFire:enemyFireSolution(),ingress:mission.ingressArmed};
  },
  recovery(){
    reset();spawnDefender();banditOfferActive=false;
    enemy.position.copy(ship.position).add(new THREE.Vector3(900,200,0));
    const before=enemy.position.toArray();missionElapsed=20;destroyTarget();
    const after=enemy.position.toArray(),until=mission.recoveryUntil;
    for(let i=0;i<100;i++){missionElapsed+=.016;updateSamNetwork(.016);}
    const freshMissiles=sam.missiles.length,canFire=enemyFireSolution();
    enemyAlive=false;updateMission(0);const earlyEscape=enemyAlive;
    missionElapsed=until;updateMission(0);
    const escape=enemyAlive;mission.phase='test';
    return {before,after,until,freshMissiles,canFire,earlyEscape,escape};
  },
  inputs(){return {keys:{...keys},tracers:tracers.length,seeker,missile:!!missile,turboBurst};},
  variants(){return MISSION_VARIANTS.map(v=>({id:v.id,sam:[...v.sam],bandit:{...v.bandit},escape:{...v.escape},cooldown:v.cooldown}));},
  boundary(destroyed,z,dt=1){
    reset();mission.phase='test';mission.destroyed=destroyed;ship.position.set(2000,800,z);updateMission(dt);
    return {complete:missionComplete,phase:mission.phase};
  },
  cannon(){
    reset();mission.phase='test';ship.position.copy(rocket.position).add(new THREE.Vector3(0,4,220));ship.quaternion.identity();
    enemyAlive=true;enemy.visible=true;enemy.position.copy(rocket.position).add(new THREE.Vector3(900,200,0));
    keys.Space=true;for(let i=0;i<100&&!mission.destroyed;i++)updateWeapons(1/60);keys.Space=false;
    return {destroyed:mission.destroyed,bandit:enemyAlive,hp:mission.hp};
  },
  missileBlocked(){
    reset();mission.phase='test';ship.position.set(valleyCenter(-4550)-480,terrainHeight(valleyCenter(-4550)-480,-4550)+55,-4550);
    return projectedGeometry(rocket.position,20000);
  },
  samCover(){
    reset();mission.phase='test';
    const blocker=scenery.find(m=>m.userData.collisionR),position=blocker.position.clone(),visible=blocker.visible;
    const radius=blocker.userData.collisionR,height=blocker.userData.collisionH,mountain=blocker.userData.mountain;
    const site={position:new THREE.Vector3(0,1200,0)};ship.position.set(0,1200,500);
    blocker.visible=true;blocker.position.set(0,1200,250);blocker.userData.collisionR=80;blocker.userData.collisionH=80;blocker.userData.mountain=true;
    const blocked=!samLineClear(site),impact=!!scenerySegmentHit(site.position,ship.position,0,0,false);
    blocker.position.set(500,600,250);
    const clear=samLineClear(site);
    blocker.position.copy(position);blocker.visible=visible;blocker.userData.collisionR=radius;blocker.userData.collisionH=height;
    if(mountain===undefined)delete blocker.userData.mountain;else blocker.userData.mountain=mountain;
    return {blocked,impact,clear};
  },
  replay(){
    reset();
    return {phase:mission.phase,missile:sam.missile,smoke:effects.samTrail.length,fire:firestorm.fires.length,sams:sam.sites.length,time:missionElapsed};
  },
  routing(){
    reset();mission.phase='test';
    const point=(z,offset=0,altitude=40)=>{const x=valleyCenter(z)+offset;return new THREE.Vector3(x,terrainHeight(x,z)+altitude,z);};
    const sight=(index,p)=>lineClear(sam.sites[index].position,p,8)&&!scenerySegmentHit(sam.sites[index].position,p,5,8,true);
    return {
      ridgeMasked:sight(0,point(-300,-220,40)),
      throat:[-1950,-2150,-2350].map(z=>({floor:terrainHeight(valleyCenter(z),z),west:terrainHeight(valleyCenter(z)-220,z),east:terrainHeight(valleyCenter(z)+220,z)})),
      shadowMasked:sight(2,point(-3600,-480,55)),
      shadowFast:sight(2,point(-3600,0,55)),
      concealed:lineClear(point(-4550,-480,55),rocket.position),
      fastReveal:lineClear(point(-5000,0,70),rocket.position),
      safeReveal:lineClear(point(-5250,-480,55),rocket.position),
      escapeFloor:[-5700,-5900,-6100,-6300,-6500,-6800].map(z=>terrainHeight(valleyCenter(z),z)),
      terminalMasked:sight(3,point(-5100,-480)),
      terminalExposed:sight(3,point(-5500)),
      escapeMasked:sight(4,point(-5500,-100)),
      escapeClimb:sight(4,point(-5500,-100,160)),
      escapeOpen:sight(4,point(-5500))
    };
  },
  entrySafety(){
    const results=[];
    for(let run=0;run<ENTRY_PATTERNS.length;run++){
      reset();mission.phase='test';crashed=false;
      const start=ship.position.toArray();let clearance=Infinity;
      for(let i=0;i<480&&!crashed;i++){updateFlight(1/60);updateWorld();clearance=Math.min(clearance,ship.position.y-terrainHeight(ship.position.x,ship.position.z));}
      results.push({entry:mission.entry,start,crashed,clearance,position:ship.position.toArray(),forward:heading().toArray(),altitude:ship.position.y-terrainHeight(ship.position.x,ship.position.z)});
    }
    return results;
  },
  entrySelection(){
    const random=Math.random,fresh=[],rotations=[],invalid=[];
    try{
      for(const value of [null,'4','-2','0.5','NaN']){
        if(value===null)sessionStorage.removeItem('emberwingEntryRun');else sessionStorage.setItem('emberwingEntryRun',value);
        invalid.push(loadEntryRun());
      }
      for(const value of [0,.5,.999]){
        sessionStorage.removeItem('emberwingEntryRun');entryRun=loadEntryRun();
        Math.random=()=>value;reset();fresh.push(mission.entry);
      }
    }finally{Math.random=random;}
    for(let i=0;i<4;i++){reset();rotations.push(mission.entry);}
    mission.phase='test';return {fresh,rotations,invalid};
  }
};`
   });
  };

  await page.route('**/src/level1/game.js*',instrument);
  await page.goto(target,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.scenario);

  assert.equal(await page.locator('#briefing').count(),1);
  assert.equal(await page.locator('#realmCard,#missionBrief,#headingTape,#coach,#objective,#score,#readout').count(),0);

  const opening=await page.evaluate(()=>emberwing.snapshot());
  assert.equal(opening.phase,'briefing','First load must pause for the briefing');
  assert.equal(await page.locator('#deploy').isVisible(),true);
  for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','x','Shift','r'])await page.keyboard.press(key);
  await page.waitForTimeout(400);
  const paused=await page.evaluate(()=>emberwing.snapshot());
  assert.deepEqual(paused.position,opening.position,'Briefing inputs must not move the aircraft');
  assert.deepEqual(paused.quaternion,opening.quaternion);
  assert.equal(paused.elapsed,0);
  assert.equal(paused.entry,opening.entry,'R must not reset during briefing');
  const idle=await page.evaluate(()=>scenario.inputs());
  assert.equal(idle.tracers,0);assert.equal(idle.seeker,false);assert.equal(idle.missile,false);assert.equal(idle.turboBurst,0);
  await page.keyboard.down('Space');await page.keyboard.down('x');await page.keyboard.down('ArrowUp');await page.keyboard.down('Shift');
  await page.evaluate(()=>{
   window.launchMarks=[];
   new MutationObserver(()=>launchMarks.push({text:document.querySelector('#countdown').textContent,time:performance.now()})).observe(document.querySelector('#countdown'),{childList:true});
   window.launchStart=performance.now();
  });
  await page.keyboard.down('Enter');
  assert.equal(await page.evaluate(()=>emberwing.snapshot().phase),'countdown');
  await page.waitForTimeout(750);await page.keyboard.down('Enter');
  assert.equal(await page.locator('#countdown').textContent(),'2','Repeated Enter must not restart launch');
  assert.deepEqual((await page.evaluate(()=>emberwing.snapshot())).position,opening.position,'Countdown must preserve the starting position');
  await page.waitForFunction(()=>emberwing.snapshot().phase==='flight',null,{timeout:5000});
  const handoff=await page.evaluate(()=>({duration:performance.now()-launchStart,marks:launchMarks.map(m=>m.text)}));
  assert.ok(handoff.duration>=2000&&handoff.duration<3000,`Launch took ${handoff.duration}ms`);
  assert.deepEqual([...new Set(handoff.marks)],['3','2','1','GO']);
  for(const key of ['Space','x','ArrowUp','Shift'])await page.keyboard.down(key);
  const held=await page.evaluate(()=>scenario.inputs());
  assert.ok(held.tracers>0,'Held fire must shoot at handoff');assert.equal(held.seeker,false);assert.equal(held.turboBurst,0);
  assert.equal(held.keys.ArrowUp,true,'Held steering must survive handoff');assert.equal(held.keys.ShiftLeft,true);
  for(const key of ['Enter','Space','x','ArrowUp','Shift'])await page.keyboard.up(key);
  await page.keyboard.down('Space');
  assert.ok((await page.evaluate(()=>scenario.inputs())).tracers>0,'Gun must work after handoff');
  await page.keyboard.up('Space');await page.keyboard.down('x');
  assert.equal((await page.evaluate(()=>scenario.inputs())).seeker,true,'Missile tracking must work after handoff');
  await page.keyboard.up('x');await page.keyboard.down('ArrowRight');await page.keyboard.down('Shift');
  const active=await page.evaluate(()=>scenario.inputs());
  assert.equal(active.keys.ArrowRight,true);assert.equal(active.keys.ShiftLeft,true);
  await page.keyboard.up('ArrowRight');await page.keyboard.up('Shift');
  await page.waitForFunction(()=>document.querySelector('#countdown').hidden);
  assert.equal(await page.locator('#briefing').isHidden(),true);
  const moving=await page.evaluate(()=>emberwing.snapshot());
  assert.ok(Math.hypot(...moving.position.map((v,i)=>v-opening.position[i]))>15,'Flight must resume after GO');

  const entries=await page.evaluate(()=>scenario.entrySafety());
  assert.equal(entries.length,3,'Level 1 should ship three authored opening patterns');
  assert.equal(new Set(entries.map(e=>e.entry)).size,3,'Every opening pattern must be distinct');
  const unsafeEntries=entries.filter(e=>e.crashed||e.altitude<=8);
  assert.ok(entries.every(e=>!e.crashed),`Every authored opening must survive eight seconds hands-off. Unsafe: ${JSON.stringify(unsafeEntries)}`);
  assert.ok(entries.every(e=>e.clearance>25),'Every opening must retain reaction room throughout its first eight seconds');
  assert.ok(entries.every(e=>e.altitude>8),`Every opening line must retain safe terrain clearance. Unsafe: ${JSON.stringify(unsafeEntries)}`);
  const startXs=entries.map(e=>Math.round(e.start[0])),startZs=entries.map(e=>Math.round(e.start[2]));
  assert.ok(Math.max(...startXs)-Math.min(...startXs)>350,'Opening patterns must meaningfully vary lateral position');
  assert.ok(Math.max(...startZs)-Math.min(...startZs)<=200,'Opening depth must stay bounded to preserve mission pacing');
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
   const a=entries[i],b=entries[j];
   assert.ok(Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2])>280,'Openings must remain spatially distinct at eight seconds');
   assert.ok(Math.acos(Math.min(1,a.forward.reduce((sum,v,k)=>sum+v*b.forward[k],0)))>.35,'Openings must retain visibly different approach angles at eight seconds');
  }

  const selection=await page.evaluate(()=>scenario.entrySelection());
  assert.deepEqual(selection.invalid,[-1,-1,-1,-1,-1],'Missing or obsolete session indices must request a fresh selection');
  assert.deepEqual(selection.fresh,['LOW_WEST','HIGH_CENTER','EAST_SWEEP'],'Fresh sessions must be able to select every authored opening');
  assert.equal(new Set(selection.rotations.slice(0,3)).size,3,'Resets must visit all openings without immediate repeats');
  assert.equal(selection.rotations[0],selection.rotations[3],'Rotation must wrap after three openings');
  await page.keyboard.down('r');
  const firstReset=await page.evaluate(()=>emberwing.snapshot().entry);
  await page.keyboard.down('r');await page.keyboard.down('r');
  assert.equal(await page.evaluate(()=>emberwing.snapshot().entry),firstReset,'Held R must not cycle through additional openings');
  await page.keyboard.up('r');await page.keyboard.press('r');
  assert.notEqual(await page.evaluate(()=>emberwing.snapshot().entry),firstReset,'A new R press must still restart into the next opening');

  const strikeAxis=await page.evaluate(()=>[-3000,-4100,-4900,-5700,-6300,-6900].map(z=>emberwing.center(z)));
  assert.ok(Math.max(...strikeAxis)-Math.min(...strikeAxis)<220,'Terminal route must read as one coherent strike axis');
  assert.ok(strikeAxis.slice(3).every(x=>x<-150),'Post-strike corridor must not swing back east');

  const routing=await page.evaluate(()=>scenario.routing());
  assert.equal(routing.ridgeMasked,false,'Wide low ridge line must break SAM1 visibility');
  assert.ok(routing.throat.every(p=>p.floor<0&&p.west-p.floor>170&&p.east-p.floor>170),'Throat must have a continuous low slot between substantial close faces');
  assert.equal(routing.shadowMasked,false,'West of the mid-valley spine must break SAM3 visibility');
  assert.equal(routing.shadowFast,true,'The direct inside line must remain exposed to SAM3');
  assert.equal(routing.concealed,false,'The masked western line must keep the target hidden before the basin shoulder');
  assert.equal(routing.fastReveal,true,'The direct exposed line must acquire the target first');
  assert.equal(routing.safeReveal,true,'Rounding the basin shoulder must reveal the target to the masked line');
  assert.ok(routing.escapeFloor.every(y=>y<40),'The strike axis must remain low through the escape spine');
  assert.equal(routing.terminalMasked,false,'Headland must mask SAM4 on low ingress');
  assert.equal(routing.terminalExposed,true,'SAM4 must see the exposed strike basin');
  assert.equal(routing.escapeMasked,false,'Western shoulder must mask SAM5 before the strike');
  assert.equal(routing.escapeClimb,true,'Climbing out of that cover must expose the aircraft to SAM5');
  assert.equal(routing.escapeOpen,true,'SAM5 must pressure the open basin line');

  const variants=await page.evaluate(()=>scenario.variants());
  assert.equal(variants.length,1,'Level 1 should ship one authored, learnable pressure pattern');
  assert.equal(variants[0].id,'VALLEY','Level 1 pressure pattern should remain the canonical VALLEY mission');
  for(const v of variants){
   assert.equal(v.sam.length,5,'The canonical mission must preserve the five-SAM network');
   assert.ok(v.sam.every(range=>range>=1000&&range<=2000),'SAM ranges must remain bounded');
   assert.ok(v.bandit.trigger>v.escape.trigger,'Ingress defender must activate before escape pressure');
  }

  const exitZ=await page.evaluate(()=>scenario.exitZ);
  assert.equal((await page.evaluate(()=>scenario.boundary(false,scenario.exitZ-1000,10000))).complete,false,'Exit without strike');
  assert.equal((await page.evaluate(()=>scenario.boundary(true,scenario.exitZ+1000,10000))).complete,false,'Timeout cannot complete');
  assert.equal((await page.evaluate(()=>scenario.boundary(true,scenario.exitZ+1))).complete,false,'One unit short');
  assert.equal((await page.evaluate(()=>scenario.boundary(true,scenario.exitZ))).complete,true,'Boundary is sufficient at any lateral position');

  const cannon=await page.evaluate(()=>scenario.cannon());
  assert.equal(cannon.destroyed,true);
  assert.equal(cannon.bandit,true);
  assert.equal((await page.evaluate(()=>scenario.missileBlocked())).onscreen,false);
  const samCover=await page.evaluate(()=>scenario.samCover());
  assert.equal(samCover.blocked,true,'Major scenery must break SAM line of sight');
  assert.equal(samCover.impact,true,'Physical scenery must register a missile-impact segment');
  assert.equal(samCover.clear,true,'SAM line of sight must recover when cover is removed');

  for(let i=0;i<3;i++){
   const reset=await page.evaluate(()=>scenario.replay());
   assert.equal(reset.phase,'flight');
   assert.equal(reset.missile,null);
   assert.equal(reset.smoke,0);
   assert.equal(reset.fire,0);
   assert.equal(reset.sams,5);
   assert.equal(reset.time,0);
  }

  const beforeReload=await page.evaluate(()=>emberwing.snapshot().entry);
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.scenario);
  assert.notEqual(await page.evaluate(()=>emberwing.snapshot().entry),beforeReload,'Reload in the same tab must advance the saved opening');
  assert.equal(await page.evaluate(()=>emberwing.snapshot().phase),'briefing');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>emberwing.snapshot().phase==='flight');
  await page.goto(target.replace('/play.html','/index.html'),{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.scenario);
  assert.equal(await page.evaluate(()=>emberwing.snapshot().phase),'briefing');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>emberwing.snapshot().phase==='flight');

  const feel=await page.evaluate(()=>scenario.combatFeedback());
  assert.equal(feel.groundFlashedFighter,false,'Ground impacts must not flash an unrelated fighter');
  assert.equal(feel.fighterFlashed,true,'Fighter impacts must retain their local flash');
  assert.ok(feel.killKickAmount>feel.hitKickAmount*4,'Kills must remain distinct from routine hits');
  assert.deepEqual(feel.near,{sounds:2,left:true,soft:true,flashes:0,kick:0,hpUnchanged:true});
  assert.equal(feel.throttled,true,'A burst of near misses must not stack sound cues');
  assert.ok(feel.close<feel.far);assert.equal(feel.directional,true);
  assert.match(feel.leaving,/BANDIT DISENGAGING.*O'CLOCK/);assert.match(feel.returning,/BANDIT TURNING IN.*O'CLOCK/);
  assert.equal(feel.urgent,'MISSILE INBOUND','Fighter intent must not replace urgent danger');
  console.log('Combat feedback checks passed.');
  const cadence=await page.evaluate(()=>scenario.fighterCadence());
  assert.deepEqual(cadence,{stayedOut:true,returned:true,endedPress:true},'Fighter must extend, return, and end sustained pursuit');
  const samCadence=await page.evaluate(()=>scenario.samCadence());
  assert.deepEqual(samCadence,{premature:0,afterCover:0,launched:1,stillMoving:true,overlap:false,quiet:true,earlyFighter:false,fighter:true,samOverlap:0,afterFighter:0,resumed:1},'Cover must restart warning; guided threats must alternate with recovery');
  const sustained=await page.evaluate(()=>scenario.sustainedPressure());
  assert.equal(sustained.maximum,1,'Extraction must never stack SAM missiles');
  assert.ok(sustained.launches>10,'Pressure must resume throughout a three-minute exposed scenario');
  assert.ok(sustained.minGap>=3.35,'Each resolved missile must leave recovery plus a fresh warning');
  console.log('Pacing checks:',JSON.stringify({cadence,samCadence,sustained}));
  const feedback=await page.evaluate(()=>scenario.feedback());
  assert.deepEqual(feedback,{hit:'HIT',danger:'MISSILE INBOUND',protectedDanger:'MISSILE INBOUND',kill:'CONTACT DESTROYED'});
  const offer=await page.evaluate(()=>scenario.earlyOffer());
  assert.deepEqual(offer,{before:false,offered:true,offer:true,clock:2.65,canFire:false,ingress:false});
  const recovery=await page.evaluate(()=>scenario.recovery());
  assert.deepEqual(recovery.before,recovery.after,'Strike must not teleport a fighter');
  assert.equal(recovery.until,22);assert.equal(recovery.freshMissiles,0);assert.equal(recovery.canFire,false);
  assert.equal(recovery.earlyEscape,false);assert.equal(recovery.escape,true);

  const desktop=await browser.newPage();desktop.on('pageerror',e=>errors.push(e.message));
  await desktop.route('**/src/level1/game.js*',instrument);
  await desktop.goto(target,{waitUntil:'load'});await desktop.waitForFunction(()=>window.scenario);
  await desktop.keyboard.down('ArrowRight');await desktop.keyboard.down('Space');
  assert.equal(await desktop.evaluate(()=>emberwing.snapshot().phase),'flight');
  const direct=await desktop.evaluate(()=>scenario.inputs());
  assert.equal(direct.keys.ArrowRight,true);assert.ok(direct.tracers>0);
  assert.equal(await desktop.locator('#briefing').isHidden(),true);
  await desktop.keyboard.up('ArrowRight');await desktop.keyboard.up('Space');
  await desktop.reload({waitUntil:'load'});await desktop.waitForFunction(()=>window.scenario);
  await desktop.waitForFunction(()=>emberwing.snapshot().phase==='flight',null,{timeout:2000});
  assert.ok((await desktop.evaluate(()=>emberwing.snapshot())).elapsed<1,'Automatic opening must not insert a long wait');
  await desktop.close();
  assert.deepEqual(errors,[]);
  console.log(`PASS: touch countdown, held-input handoff, immediate desktop flight, early target offer, feedback priority, physical post-strike recovery, mission boundary at ${exitZ}, strike authority, physical SAM cover, concealment, and replay cleanup.`);
 }finally{
  if(browser)await browser.close();
  if(local)await local.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
