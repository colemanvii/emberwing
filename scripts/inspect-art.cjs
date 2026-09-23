// Visual review checkpoints only; not a substitute for the keyboard flight pilot.
const {chromium}=require('playwright');
const {startStaticServer}=require('./static-server.cjs');
const fs=require('node:fs');
(async()=>{
 const server=await startStaticServer();let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;sessionStorage.setItem('emberwingEntryRun','0');});
 await page.route('**/src/level1/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`
window.artReview=(stage)=>{
 reset();briefing.hidden=true;
 const points={opening:[2300,0,180],ridge:[1050,-160,95],throat:[-1900,0,85],shoulder:[-4350,-480,65],basin:[-5330,-460,100],breakout:[-7220,90,85]};
 const [z,side,alt]=points[stage];ship.position.set(valleyCenter(z)+side,terrainHeight(valleyCenter(z)+side,z)+alt,z);
 ship.quaternion.identity();if(stage==='basin')ship.quaternion.setFromAxisAngle(worldUp,-.65);speed=CRUISE_SPEED;burner=0;
 camera.position.copy(ship.position).add(new THREE.Vector3(0,5,16));resetCameraFrame();
 updateWorld();
 const behind=new THREE.Vector3(0,0,1).applyQuaternion(ship.quaternion);
 // Match the chase offset under cruise (including its physical translation lag).
 for(let i=0;i<90;i++){camera.position.copy(ship.position).addScaledVector(behind,29).addScaledVector(worldUp,5);updateCamera(1/60);}
 renderer.render(scene,camera);return {stage,position:ship.position.toArray(),draws:renderer.info.render.calls,triangles:renderer.info.render.triangles};
};`});});
 await page.goto(server.url+'/play.html');await page.waitForFunction(()=>window.artReview,null,{polling:100});
 fs.mkdirSync('.artifacts/art',{recursive:true});const results=[];
 for(const stage of ['opening','ridge','throat','shoulder','basin','breakout']){
 results.push(await page.evaluate(stage=>artReview(stage),stage));await page.screenshot({path:'.artifacts/art/'+stage+'.png'});
 }
 fs.writeFileSync('.artifacts/art/report.json',JSON.stringify({errors,results},null,2));
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify(results));
 }finally{await browser?.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
