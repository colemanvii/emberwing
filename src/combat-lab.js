import * as THREE from '../vendor/three.module.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9d7463);
scene.fog=new THREE.FogExp2(0x9d7463,.00032);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,7000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
document.body.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffe0c2,0x30262b,2.1));
const sun=new THREE.DirectionalLight(0xffc27d,5.8);sun.position.set(-900,900,-1200);scene.add(sun);

const sky=new THREE.Mesh(new THREE.SphereGeometry(5000,28,16),new THREE.ShaderMaterial({
 side:THREE.BackSide,depthWrite:false,
 uniforms:{top:{value:new THREE.Color(0x27394b)},mid:{value:new THREE.Color(0xc07158)},low:{value:new THREE.Color(0xe2a170)}},
 vertexShader:'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,mid,low;varying vec3 d;void main(){float h=d.y;vec3 c=mix(low,mid,smoothstep(-.2,.08,h));c=mix(c,top,smoothstep(.02,.78,h));gl_FragColor=vec4(c,1.);}'
}));scene.add(sky);

function terrainHeight(x,z){
 const r=Math.hypot(x,z);
 const floor=-34+Math.sin(x*.0032)*7+Math.cos(z*.0037)*6+Math.sin((x+z)*.0018)*5;
 const rim=Math.max(0,(r-1350)/850);
 return floor+rim*rim*520+Math.max(0,Math.sin(Math.atan2(z,x)*5+1.4))*rim*95;
}
const groundGeo=new THREE.PlaneGeometry(6200,6200,130,130);groundGeo.rotateX(-Math.PI/2);
const p=groundGeo.attributes.position;
for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(p.getX(i),p.getZ(i)));
groundGeo.computeVertexNormals();
const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({color:0x9b6248,roughness:.97,metalness:.02}));
scene.add(ground);

const rockMat=new THREE.MeshStandardMaterial({color:0x6d4338,roughness:.98});
for(let i=0;i<28;i++){
 const a=i/28*Math.PI*2+(i%3)*.07,r=1550+(i%5)*120,h=130+(i%7)*35,w=85+(i%4)*32;
 const m=new THREE.Mesh(new THREE.ConeGeometry(w,h,7,2),rockMat);
 m.position.set(Math.cos(a)*r,terrainHeight(Math.cos(a)*r,Math.sin(a)*r)+h*.45,Math.sin(a)*r);
 m.rotation.y=a*.7;m.scale.z=.7+(i%4)*.12;scene.add(m);
}
const dustMat=new THREE.MeshBasicMaterial({color:0xd9b08b,transparent:true,opacity:.18,depthWrite:false});
for(let i=0;i<55;i++){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(35+Math.random()*90,2+Math.random()*4),dustMat);
 const a=Math.random()*Math.PI*2,r=200+Math.random()*1450;
 m.position.set(Math.cos(a)*r,terrainHeight(Math.cos(a)*r,Math.sin(a)*r)+8+Math.random()*45,Math.sin(a)*r);
 m.rotation.y=Math.random()*Math.PI;scene.add(m);
}

function plate(points,t=.28){
 const n=points.length,v=[],idx=[];
 for(const y of[-t/2,t/2])for(const q of points)v.push(q[0],y,q[1]);
 for(let i=1;i<n-1;i++)idx.push(n,n+i,n+i+1,0,i+1,i);
 for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,n+j,i,n+j,n+i)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
function makeFighter(enemy=false){
 const g=new THREE.Group();
 const dark=new THREE.MeshStandardMaterial({color:enemy?0x20262b:0x3b4449,roughness:.38,metalness:.62});
 const wing=new THREE.MeshStandardMaterial({color:enemy?0x374047:0x657076,roughness:.43,metalness:.52});
 const pts=enemy?[[-.6,-3.8],[-5,-.3],[-3,2.4],[0,1.2],[3,2.4],[5,-.3],[.6,-3.8]]:[[-.8,-4.6],[-3.2,-2],[-9,.4],[-7.2,3],[-3,2.2],[0,1],[3,2.2],[7.2,3],[9,.4],[3.2,-2],[.8,-4.6]];
 const w=new THREE.Mesh(plate(pts),wing);g.add(w);
 const body=new THREE.Mesh(new THREE.CylinderGeometry(enemy?.75:1.1,enemy?1.05:1.45,enemy?8:10,10),dark);body.rotation.x=Math.PI/2;g.add(body);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(enemy?.8:1.15,enemy?3.2:4.2,10),dark);nose.rotation.x=-Math.PI/2;nose.position.z=enemy?-5.4:-7;g.add(nose);
 const canopy=new THREE.Mesh(new THREE.SphereGeometry(enemy?.7:.95,12,8),new THREE.MeshStandardMaterial({color:0x0b151b,roughness:.12,metalness:.8}));
 canopy.scale.set(.8,.4,1.55);canopy.position.set(0,.7,enemy?-2:-2.5);g.add(canopy);
 const glow=new THREE.MeshBasicMaterial({color:enemy?0xff6847:0xffb35d});
 for(const x of(enemy?[-1.6,1.6]:[-4.8,-1.6,1.6,4.8])){const e=new THREE.Mesh(new THREE.SphereGeometry(enemy?.3:.38,8,6),glow);e.position.set(x,0,enemy?3.7:4.5);g.add(e)}
 return g;
}

const ship=makeFighter(false);ship.scale.setScalar(1.25);scene.add(ship);
ship.position.set(0,105,520);ship.quaternion.identity();

const bandits=[];
const enemySpawn=[
 [-250,130,-320, 1],
 [ 300,155,-500,-1],
 [-720,190,-50, 1],
 [ 690,115,210,-1]
];
function spawnBandit(i,respawn=false){
 let e=bandits[i];
 if(!e){
  const mesh=makeFighter(true);mesh.scale.setScalar(1.9);scene.add(mesh);
  e={mesh,hp:1,alive:true,vel:new THREE.Vector3(),cool:1+i*.25,phase:i*1.7,deadFor:0};bandits[i]=e;
 }
 const seed=enemySpawn[i];
 const a=respawn?Math.random()*Math.PI*2:null;
 const r=respawn?620+Math.random()*480:0;
 e.mesh.position.set(respawn?ship.position.x+Math.cos(a)*r:seed[0],respawn?Math.max(100,ship.position.y+20+Math.random()*150):seed[1],respawn?ship.position.z+Math.sin(a)*r:seed[2]);
 const target=ship.position.clone().add(new THREE.Vector3(respawn?0:seed[3]*300,0,respawn?0:-120));
 const dir=target.sub(e.mesh.position).normalize();
 e.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),dir);
 e.vel.copy(dir).multiplyScalar(235);e.hp=1;e.alive=true;e.mesh.visible=true;e.deadFor=0;e.cool=1.5+Math.random()*1.2;
}
for(let i=0;i<4;i++)spawnBandit(i,false);

const targetMat=new THREE.MeshStandardMaterial({color:0x454440,roughness:.78,metalness:.32});
const targetHot=new THREE.MeshBasicMaterial({color:0xff873d});
const groundTargets=[];
function makeGroundTarget(x,z,i){
 const g=new THREE.Group();
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(28,34,4,16),new THREE.MeshStandardMaterial({color:0x55504a,roughness:.92}));pad.position.y=2;g.add(pad);
 const tower=new THREE.Mesh(new THREE.CylinderGeometry(5,8,34,10),targetMat);tower.position.y=20;g.add(tower);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(14,16,10,0,Math.PI*2,0,Math.PI/2),targetMat);dish.rotation.x=Math.PI/2;dish.position.set(0,41,0);g.add(dish);
 const light=new THREE.Mesh(new THREE.SphereGeometry(2,8,6),targetHot);light.position.set(0,55,0);g.add(light);
 const y=terrainHeight(x,z);g.position.set(x,y,z);scene.add(g);
 groundTargets.push({mesh:g,pos:new THREE.Vector3(x,y+28,z),hp:2,alive:true,index:i});
}
[[760,-620],[-820,-720],[880,520],[-720,650]].forEach((q,i)=>makeGroundTarget(q[0],q[1],i));

const bullets=[],enemyBullets=[],missiles=[],fx=[];
const bulletGeo=new THREE.SphereGeometry(1.4,6,4);
const playerBulletMat=new THREE.MeshBasicMaterial({color:0xffe1a0});
const enemyBulletMat=new THREE.MeshBasicMaterial({color:0xff5a3f});
const missileMat=new THREE.MeshStandardMaterial({color:0xd7d3c5,roughness:.4,metalness:.45});
const fireMat=new THREE.MeshBasicMaterial({color:0xff9a48,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});

const keys={};let speed=260,pitchRate=0,rollRate=0,elapsed=0,kills=0,hull=5,invuln=0,gunClock=0,lockTimer=0,lockTarget=null,xWas=false,dead=false,flashAmt=0,msgClock=0;
const worldUp=new THREE.Vector3(0,1,0),forward=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3();
const stats=document.getElementById('stats'),damage=document.getElementById('damage'),status=document.getElementById('status'),lockUI=document.getElementById('lock'),flash=document.getElementById('flash'),brief=document.getElementById('brief'),centerMsg=document.getElementById('centerMsg');

function fighterForward(mesh,out=new THREE.Vector3()){return out.set(0,0,-1).applyQuaternion(mesh.quaternion).normalize()}
function targetCandidates(){
 const arr=[];
 for(const e of bandits)if(e.alive)arr.push({kind:'air',obj:e,pos:e.mesh.position,r:18});
 for(const t of groundTargets)if(t.alive)arr.push({kind:'ground',obj:t,pos:t.pos,r:34});
 return arr;
}
function nearestAim(maxAngle=.48,maxRange=1500){
 const f=fighterForward(ship,new THREE.Vector3()),origin=ship.position,best=null,bestScore=1e9;
 for(const t of targetCandidates()){
  const v=t.pos.clone().sub(origin),range=v.length();if(range>maxRange)continue;
  const ang=f.angleTo(v.normalize());if(ang>maxAngle)continue;
  const score=ang*900+range*.12;if(score<bestScore){bestScore=score;best={...t,range,angle:ang}}
 }
 return best;
}
function flashScreen(v){flashAmt=Math.max(flashAmt,v)}
function announce(s){centerMsg.textContent=s;centerMsg.style.opacity='1';msgClock=1.2}
function explode(pos,big=false){
 const light=new THREE.PointLight(0xff8c46,big?120:65,big?650:320,1.8);light.position.copy(pos);scene.add(light);fx.push({mesh:light,life:.35,max:.35,light:true});
 for(let i=0;i<(big?28:14);i++){
  const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),fireMat.clone());m.position.copy(pos);m.scale.setScalar((big?4:2)+Math.random()*(big?7:4));scene.add(m);
  const d=new THREE.Vector3(Math.random()-.5,.25+Math.random()*.8,Math.random()-.5).normalize().multiplyScalar((big?70:45)+Math.random()*80);
  fx.push({mesh:m,v:d,life:.6+Math.random()*.7,max:1.3});
 }
 flashScreen(big?.24:.12);
}
function hitTarget(t,damageAmt=1){
 if(t.kind==='air'){
  const e=t.obj;if(!e.alive)return;e.hp-=damageAmt;if(e.hp<=0){e.alive=false;e.mesh.visible=false;e.deadFor=2.0;kills++;explode(e.mesh.position,true);announce('BANDIT SPLASH');}
 }else{
  const g=t.obj;if(!g.alive)return;g.hp-=damageAmt;if(g.hp<=0){g.alive=false;g.mesh.visible=false;explode(g.pos,true);announce('GROUND TARGET DESTROYED');}
 }
}
function spawnBullet(enemy=false,origin=null,dir=null){
 const m=new THREE.Mesh(bulletGeo,enemy?enemyBulletMat:playerBulletMat);scene.add(m);
 if(enemy){m.position.copy(origin);enemyBullets.push({mesh:m,v:dir.clone().multiplyScalar(620),life:2.4});return}
 const aim=nearestAim(.32,950),f=fighterForward(ship,new THREE.Vector3()),r=new THREE.Vector3(1,0,0).applyQuaternion(ship.quaternion);
 let d=f.clone();
 if(aim){const lead=aim.pos.clone();if(aim.kind==='air')lead.addScaledVector(aim.obj.vel,.12);const desired=lead.sub(ship.position).normalize();d.lerp(desired,.30).normalize()}
 for(const side of[-1,1]){
  const b=side===-1?m:m.clone();if(side===1)scene.add(b);
  b.position.copy(ship.position).addScaledVector(r,side*5).addScaledVector(f,2);
  bullets.push({mesh:b,v:d.clone().multiplyScalar(950).addScaledVector(f,speed),life:1.5});
 }
}
function fireMissile(target){
 if(!target)return;
 const m=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.24,.3,4,8),missileMat),flame=new THREE.Mesh(new THREE.ConeGeometry(.28,2.4,8),fireMat.clone());
 body.rotation.x=Math.PI/2;flame.rotation.x=-Math.PI/2;flame.position.z=2.7;m.add(body,flame);m.position.copy(ship.position).addScaledVector(fighterForward(ship,new THREE.Vector3()),4);scene.add(m);
 missiles.push({mesh:m,target,vel:fighterForward(ship,new THREE.Vector3()).multiplyScalar(speed+180),life:6});announce('FOX TWO');
}
function damagePlayer(){
 if(invuln>0||dead)return;hull--;invuln=1;flashScreen(.34);announce('HIT');
 if(hull<=0){dead=true;announce('SHOT DOWN · PRESS R');}
}
function reset(){
 ship.position.set(0,105,520);ship.quaternion.identity();speed=260;pitchRate=rollRate=0;elapsed=0;kills=0;hull=5;invuln=0;lockTimer=0;lockTarget=null;dead=false;
 for(let i=0;i<4;i++)spawnBandit(i,false);
 for(const t of groundTargets){t.alive=true;t.hp=2;t.mesh.visible=true}
 for(const arr of[bullets,enemyBullets,missiles]){for(const q of arr)scene.remove(q.mesh);arr.length=0}
 announce('FIGHT THE SKY');
}
addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='KeyR')reset()});
addEventListener('keyup',e=>{keys[e.code]=false});

function updateFlight(dt){
 if(dead)return;
 const pi=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0),ri=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0),boost=keys.ShiftLeft||keys.ShiftRight;
 const targetSpeed=boost?340:260;speed=THREE.MathUtils.lerp(speed,targetSpeed,1-Math.exp(-dt/.16));
 pitchRate=THREE.MathUtils.lerp(pitchRate,pi*2.0,1-Math.exp(-dt/.07));rollRate=THREE.MathUtils.lerp(rollRate,ri*3.8,1-Math.exp(-dt/.05));
 ship.rotateX(pitchRate*dt);ship.rotateZ(-rollRate*dt);
 up.set(0,1,0).applyQuaternion(ship.quaternion);right.set(1,0,0).applyQuaternion(ship.quaternion);
 const bank=Math.atan2(-right.y,up.y);
 const yaw=(bank*1.18+ri*.34)*(1+Math.abs(pi)*.35);
 ship.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(worldUp,-yaw*dt));
 if(!ri)ship.rotateZ(bank*.24*dt);
 forward.set(0,0,-1).applyQuaternion(ship.quaternion).normalize();ship.position.addScaledVector(forward,speed*dt);
 const floor=terrainHeight(ship.position.x,ship.position.z)+8;
 if(ship.position.y<floor){ship.position.y=floor+12;damagePlayer();ship.rotateX(-.18)}
 const r=Math.hypot(ship.position.x,ship.position.z);
 if(r>2050){const inward=new THREE.Vector3(-ship.position.x,0,-ship.position.z).normalize();ship.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(worldUp,THREE.MathUtils.clamp(forward.clone().cross(inward).y,-1,1)*dt*.9));}
}
function updateBandits(dt){
 for(let i=0;i<bandits.length;i++){
  const e=bandits[i];
  if(!e.alive){e.deadFor-=dt;if(e.deadFor<=0)spawnBandit(i,true);continue}
  e.phase+=dt;
  const toShip=ship.position.clone().sub(e.mesh.position),range=toShip.length(),playerF=fighterForward(ship,new THREE.Vector3()),playerR=new THREE.Vector3(1,0,0).applyQuaternion(ship.quaternion);
  const passSide=((i%2)*2-1)*(120+55*Math.sin(e.phase*.7+i));
  const lead=ship.position.clone().addScaledVector(playerF,range>500?180:40).addScaledVector(playerR,passSide);
  lead.y=Math.max(terrainHeight(lead.x,lead.z)+85,ship.position.y+25*Math.sin(e.phase+i));
  const desired=lead.sub(e.mesh.position).normalize(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),desired);
  e.mesh.quaternion.rotateTowards(q,(range<400?1.35:.85)*dt);
  const f=fighterForward(e.mesh,new THREE.Vector3());e.vel.lerp(f.multiplyScalar(range<350?255:235),1-Math.exp(-dt*2.5));e.mesh.position.addScaledVector(e.vel,dt);
  e.mesh.position.y=Math.max(e.mesh.position.y,terrainHeight(e.mesh.position.x,e.mesh.position.z)+45);
  e.cool-=dt;
  if(elapsed>6&&e.cool<=0&&range<850){
   const aim=ship.position.clone().addScaledVector(fighterForward(ship,new THREE.Vector3()),speed*.12).sub(e.mesh.position).normalize();
   if(fighterForward(e.mesh,new THREE.Vector3()).dot(aim)>.91){spawnBullet(true,e.mesh.position.clone(),aim);e.cool=.75+Math.random()*.8;}
  }
 }
}
function updateWeapons(dt){
 gunClock-=dt;
 if(keys.Space&&gunClock<=0&&!dead){gunClock=.065;spawnBullet(false)}
 const x=!!keys.KeyX;
 if(x&&!dead){
  const candidate=nearestAim(.56,1550);
  if(candidate&&(lockTarget?.obj===candidate.obj||!lockTarget)){lockTarget=candidate;lockTimer=Math.min(.65,lockTimer+dt)}
  else if(candidate){lockTarget=candidate;lockTimer=Math.max(0,lockTimer-dt*2)}
  else{lockTimer=Math.max(0,lockTimer-dt*2.4);if(lockTimer<=0)lockTarget=null}
 }else if(xWas&&!x&&!dead){
  if(lockTarget&&lockTimer>=.28)fireMissile(lockTarget);lockTimer=0;lockTarget=null;
 }else if(!x){lockTimer=Math.max(0,lockTimer-dt*3);if(lockTimer<=0)lockTarget=null}
 xWas=x;
}
function updateProjectiles(dt){
 for(let i=bullets.length-1;i>=0;i--){
  const b=bullets[i];b.life-=dt;b.mesh.position.addScaledVector(b.v,dt);let hit=null;
  for(const t of targetCandidates()){if(b.mesh.position.distanceToSquared(t.pos)<t.r*t.r){hit=t;break}}
  if(hit){hitTarget(hit,1);scene.remove(b.mesh);bullets.splice(i,1);continue}
  if(b.life<=0){scene.remove(b.mesh);bullets.splice(i,1)}
 }
 for(let i=enemyBullets.length-1;i>=0;i--){
  const b=enemyBullets[i];b.life-=dt;b.mesh.position.addScaledVector(b.v,dt);
  if(b.mesh.position.distanceToSquared(ship.position)<95){damagePlayer();scene.remove(b.mesh);enemyBullets.splice(i,1);continue}
  if(b.life<=0){scene.remove(b.mesh);enemyBullets.splice(i,1)}
 }
 for(let i=missiles.length-1;i>=0;i--){
  const m=missiles[i];m.life-=dt;if(!m.target.obj.alive){scene.remove(m.mesh);missiles.splice(i,1);continue}
  const pos=m.target.pos.clone();const desired=pos.sub(m.mesh.position).normalize().multiplyScalar(430);m.vel.lerp(desired,1-Math.exp(-dt*4.5));m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),m.vel.clone().normalize());m.mesh.position.addScaledVector(m.vel,dt);
  if(m.mesh.position.distanceToSquared(m.target.pos)<(m.target.r+8)*(m.target.r+8)){hitTarget(m.target,4);explode(m.mesh.position,false);scene.remove(m.mesh);missiles.splice(i,1);continue}
  if(m.life<=0){scene.remove(m.mesh);missiles.splice(i,1)}
 }
}
function updateFX(dt){
 for(let i=fx.length-1;i>=0;i--){const q=fx[i];q.life-=dt;if(q.light){q.mesh.intensity*=Math.exp(-dt*7)}else{q.mesh.position.addScaledVector(q.v,dt);q.v.y-=70*dt;q.mesh.scale.multiplyScalar(1+dt*1.2);q.mesh.material.opacity=Math.max(0,q.life/q.max)}
  if(q.life<=0){scene.remove(q.mesh);if(q.mesh.material)q.mesh.material.dispose?.();fx.splice(i,1)}
 }
}
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3();
function updateCamera(dt){
 const f=fighterForward(ship,new THREE.Vector3()),r=new THREE.Vector3(1,0,0).applyQuaternion(ship.quaternion),u=new THREE.Vector3(0,1,0).applyQuaternion(ship.quaternion);
 const bank=Math.atan2(-r.y,u.y),boost=keys.ShiftLeft||keys.ShiftRight;
 camPos.copy(ship.position).addScaledVector(f,-(22+(boost?7:0))).addScaledVector(worldUp,8).addScaledVector(r,-Math.sin(bank)*6);
 camera.position.lerp(camPos,1-Math.exp(-dt*8));
 camLook.copy(ship.position).addScaledVector(f,82).addScaledVector(worldUp,-5);
 camera.lookAt(camLook);
 camera.rotateZ(-Math.sin(bank)*.16);
 camera.fov=THREE.MathUtils.lerp(camera.fov,boost?91:74,1-Math.exp(-dt*5));camera.updateProjectionMatrix();sky.position.copy(camera.position);
}
function updateHUD(dt){
 const remain=groundTargets.filter(t=>t.alive).length,mins=Math.floor(elapsed/60),secs=elapsed-mins*60;
 stats.textContent=String(mins).padStart(2,'0')+':'+secs.toFixed(1).padStart(4,'0')+' · KILLS '+kills+' · TARGETS '+remain;
 damage.textContent='HULL '+('█'.repeat(Math.max(0,hull)))+('░'.repeat(Math.max(0,5-hull)));
 if(elapsed>2.2)brief.style.opacity=Math.max(0,1-(elapsed-2.2)*1.5);
 if(lockTarget&&keys.KeyX){
  const q=lockTarget.pos.clone().project(camera);
  if(q.z>-1&&q.z<1){lockUI.style.left=((q.x*.5+.5)*innerWidth)+'px';lockUI.style.top=((-q.y*.5+.5)*innerHeight)+'px';lockUI.classList.add('on')}
  else lockUI.classList.remove('on');
  status.textContent=lockTimer>=.28?'MISSILE LOCK':'TRACKING';
 }else{lockUI.classList.remove('on');status.textContent=dead?'AIRCRAFT LOST':'FREE FLIGHT'}
 invuln=Math.max(0,invuln-dt);msgClock=Math.max(0,msgClock-dt);if(msgClock<=0)centerMsg.style.opacity='0';
 flashAmt*=Math.exp(-dt*10);flash.style.opacity=String(Math.min(.8,flashAmt));
}
const clock=new THREE.Clock();
function loop(){
 requestAnimationFrame(loop);const dt=Math.min(.033,clock.getDelta());if(!dead)elapsed+=dt;
 updateFlight(dt);updateBandits(dt);updateWeapons(dt);updateProjectiles(dt);updateFX(dt);updateCamera(dt);updateHUD(dt);renderer.render(scene,camera);
}
window.combatLab=Object.freeze({snapshot:()=>({position:ship.position.toArray(),speed,elapsed,kills,hull,bandits:bandits.filter(e=>e.alive).length,targets:groundTargets.filter(t=>t.alive).length,dead})});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
announce('FIGHT THE SKY');updateCamera(1/60);requestAnimationFrame(loop);
