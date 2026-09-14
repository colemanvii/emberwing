import fs from 'node:fs';

let html = fs.readFileSync('v14.html', 'utf8');

if (!html.includes('EMBERWING V14 // standalone flatten of effective V12')) {
  throw new Error('Expected verified V14 standalone marker not found');
}
if (/document\.write\(|cdn\.jsdelivr\.net\/gh\/colemanvii\/emberwing@/i.test(html)) {
  throw new Error('V14 is not cleanly standalone; refusing to layer V15 on a wrapper build');
}

html = html.replace(
  '<!-- EMBERWING V14 // standalone flatten of effective V12 // zero gameplay changes -->',
  '<!-- EMBERWING V15 // WORLD MEMORY // monumental anchors + restrained sky memory -->'
);
html = html.replace('<title>Emberwing V11</title>', '<title>Emberwing V15</title>');

const worldLoopAnchor = "for(const m of scenery){const dx=m.position.x-ship.position.x,dz=m.position.z-ship.position.z,d2=dx*dx+dz*dz;if(m.userData.city){";
if (!html.includes(worldLoopAnchor)) throw new Error('V15 updateWorld anchor missing');
html = html.replace(
  worldLoopAnchor,
  "for(const m of scenery){if(m.userData.fixedLandmark)continue;const dx=m.position.x-ship.position.x,dz=m.position.z-ship.position.z,d2=dx*dx+dz*dz;if(m.userData.city){"
);

const clockAnchor = 'const clock=new THREE.Clock();';
if (!html.includes(clockAnchor)) throw new Error('V15 runtime anchor missing');

const v15 = String.raw`
// EMBERWING V15 // WORLD MEMORY
// One monumental anchor per biome. The sky keeps a restrained trace of the fight.
const v15TorusSegments=[];
const v15TorusIron=new THREE.MeshStandardMaterial({color:0x24272a,roughness:.94,metalness:.12});
const v15TorusRust=new THREE.MeshStandardMaterial({color:0x55382e,roughness:.98,metalness:.05});
const v15TorusRadius=620,v15TorusTube=64,v15TorusCount=32,v15TorusLean=-.48;
function v15BuildTorus(){
  const segLen=Math.PI*2*v15TorusRadius/v15TorusCount*.9;
  for(let i=0;i<v15TorusCount;i++){
    if(i===7||i===8||i===9||i===10)continue;
    const a=i/v15TorusCount*Math.PI*2,m=new THREE.Mesh(new THREE.BoxGeometry(segLen,v15TorusTube,v15TorusTube),i%6===0?v15TorusRust:v15TorusIron);
    m.userData.fixedLandmark=true;m.userData.mountain=true;m.userData.raise=0;
    scene.add(m);scenery.push(m);v15TorusSegments.push({m,a,segLen});
  }
}
function v15PlaceTorus(){
  const f=heading().clone(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize(),cx=ship.position.x+f.x*1080+r.x*260,cz=ship.position.z+f.z*1080+r.z*260,cy=terrainHeight(cx,cz)+355,cl=Math.cos(v15TorusLean),sl=Math.sin(v15TorusLean);
  for(const s of v15TorusSegments){
    const x=v15TorusRadius*Math.cos(s.a),y=v15TorusRadius*Math.sin(s.a),xr=x*cl-y*sl,yr=x*sl+y*cl,t=s.a+Math.PI/2+v15TorusLean,tx=Math.cos(t),ty=Math.sin(t),tan=r.clone().multiplyScalar(tx).addScaledVector(worldUp,ty).normalize();
    s.m.position.set(cx+r.x*xr,cy+yr,cz+r.z*xr);s.m.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),tan);
    const half=s.segLen*.5;s.m.userData.collisionR=v15TorusTube*.58+Math.abs(tx)*half*.82;s.m.userData.collisionH=v15TorusTube*.58+Math.abs(ty)*half*.82;s.m.visible=!worldIndex;
  }
}
v15BuildTorus();

const v15Spine=new THREE.Group(),v15SpineMat=new THREE.MeshStandardMaterial({color:0x171a1d,roughness:.97,metalness:.04,flatShading:true}),v15SpineEdgeMat=new THREE.MeshStandardMaterial({color:0x2c3034,roughness:.95,metalness:.03,flatShading:true});
(function(){const H=620,B=150;for(let i=0;i<5;i++){const main=i===2,h=H*(main?1:.45+i*.07),w=B*(main?.72:.34+i*.055),m=new THREE.Mesh(crag(),main?v15SpineEdgeMat:v15SpineMat);m.scale.set(w,h,w*(.42+i*.055));m.position.set((i-2)*44,(h-H)/2,(i%2?34:-28));m.rotation.y=(i-2)*.17;v15Spine.add(m)}v15Spine.userData.fixedLandmark=true;v15Spine.userData.mountain=true;v15Spine.userData.raise=H/2;v15Spine.userData.collisionR=178;v15Spine.userData.collisionH=H*.5;v15Spine.visible=false;scene.add(v15Spine);scenery.push(v15Spine)})();
let v15SpinePlaced=false,v15CloudY=0;
function v15PlaceSpine(){const f=heading().clone(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize(),cx=ship.position.x+f.x*960+r.x*-430,cz=ship.position.z+f.z*960+r.z*-430;v15Spine.position.set(cx,terrainHeight(cx,cz)+v15Spine.userData.raise-18,cz);v15Spine.rotation.y=Math.atan2(f.x,-f.z)+.22;v15SpinePlaced=true;v15CloudY=ship.position.y-58}

function v15CloudTexture(){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#cfdbe1';g.fillRect(0,0,512,512);for(let i=0;i<92;i++){const x=Math.random()*512,y=Math.random()*512,r=26+Math.random()*78,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.72)');gr.addColorStop(.52,'rgba(239,247,250,.34)');gr.addColorStop(1,'rgba(188,205,214,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(7,7);t.colorSpace=THREE.SRGBColorSpace;return t}
const v15CloudTex=v15CloudTexture(),v15CloudSea=new THREE.Mesh(new THREE.PlaneGeometry(6200,6200),new THREE.MeshBasicMaterial({map:v15CloudTex,color:0xf2f7f8,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,fog:true}));
v15CloudSea.rotation.x=-Math.PI/2;v15CloudSea.visible=false;v15CloudSea.renderOrder=-1;scene.add(v15CloudSea);

const v15TrailSegs=[];let v15TrailClock=0,v15TrailPrev=null;
function v15TrailColor(){return enemyRole==='ROOKIE'?0xaeb9bd:enemyRole==='SKIMMER'?0x72dcff:enemyRole==='CLIMBER'?0xffc48a:0xdaf8ff}
function v15DropOldestTrail(){const s=v15TrailSegs.shift();if(!s)return;scene.remove(s.line);s.line.geometry.dispose();s.line.material.dispose()}
function v15SpawnTrail(a,b){const g=new THREE.BufferGeometry().setFromPoints([a,b]),mat=new THREE.LineBasicMaterial({color:v15TrailColor(),transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending}),line=new THREE.Line(g,mat);scene.add(line);v15TrailSegs.push({line,life:5.6,maxLife:5.6});while(v15TrailSegs.length>12)v15DropOldestTrail()}
function v15UpdateTrails(dt){for(let i=v15TrailSegs.length-1;i>=0;i--){const s=v15TrailSegs[i];s.life-=dt;s.line.material.opacity=.3*Math.max(0,s.life/s.maxLife);if(s.life<=0){scene.remove(s.line);s.line.geometry.dispose();s.line.material.dispose();v15TrailSegs.splice(i,1)}}if(!enemyAlive){v15TrailPrev=null;v15TrailClock=0;return}const p=enemy.position.clone();if(!v15TrailPrev||p.distanceToSquared(v15TrailPrev)>180*180){v15TrailPrev=p;v15TrailClock=.3;return}v15TrailClock-=dt;if(v15TrailClock<=0){if(p.distanceToSquared(v15TrailPrev)>16)v15SpawnTrail(v15TrailPrev,p);v15TrailPrev=p;v15TrailClock=.34}}

function v15SmokeTexture(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,4,64,64,61);gr.addColorStop(0,'rgba(22,25,27,.92)');gr.addColorStop(.42,'rgba(28,31,33,.66)');gr.addColorStop(.76,'rgba(40,43,45,.25)');gr.addColorStop(1,'rgba(40,43,45,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
const v15SmokeTex=v15SmokeTexture(),v15KillSmoke=[];
function v15DropOldestSmoke(){const s=v15KillSmoke.shift();if(!s)return;scene.remove(s.sprite);s.sprite.material.dispose()}
function v15SpawnKillSmoke(pos){const mat=new THREE.SpriteMaterial({map:v15SmokeTex,color:0x202326,transparent:true,opacity:.58,depthWrite:false}),sprite=new THREE.Sprite(mat);sprite.position.copy(pos);sprite.scale.setScalar(24);scene.add(sprite);v15KillSmoke.push({sprite,life:8.4,maxLife:8.4,drift:new THREE.Vector3((Math.random()-.5)*1.1,.9,(Math.random()-.5)*1.1)});while(v15KillSmoke.length>5)v15DropOldestSmoke()}
function v15UpdateSmoke(dt){for(let i=v15KillSmoke.length-1;i>=0;i--){const s=v15KillSmoke[i];s.life-=dt;s.sprite.position.addScaledVector(s.drift,dt);const p=1-Math.max(0,s.life/s.maxLife),scale=24+p*42;s.sprite.scale.setScalar(scale);s.sprite.material.opacity=.58*Math.pow(Math.max(0,s.life/s.maxLife),.72);if(s.life<=0){scene.remove(s.sprite);s.sprite.material.dispose();v15KillSmoke.splice(i,1)}}}

const v15ExplodeBase=explode;explode=function(){const before=kills,p=enemy.position.clone();v15ExplodeBase();if(kills>before)v15SpawnKillSmoke(p)};
const v15EnemyBase=updateEnemy;updateEnemy=function(dt){v15EnemyBase(dt);v15UpdateTrails(dt);v15UpdateSmoke(dt)};
const v15WorldBase=updateWorld;updateWorld=function(){v15WorldBase();const alpine=!!worldIndex;for(const s of v15TorusSegments)s.m.visible=!alpine;v15Spine.visible=alpine;v15CloudSea.visible=alpine;if(alpine&&!v15SpinePlaced)v15PlaceSpine();if(!alpine)v15SpinePlaced=false;if(alpine){v15CloudSea.position.set(ship.position.x,v15CloudY,ship.position.z);const t=performance.now()*.000003;v15CloudTex.offset.set(t%1,(t*.63)%1)}};
function v15ClearMemory(){while(v15TrailSegs.length)v15DropOldestTrail();while(v15KillSmoke.length)v15DropOldestSmoke();v15TrailPrev=null;v15TrailClock=0}
const v15ResetBase=reset;reset=function(){v15ResetBase();v15ClearMemory();v15SpinePlaced=false;v15Spine.visible=false;v15CloudSea.visible=false;v15PlaceTorus()};
window.__emberwingV15={snapshot:()=>({torusSegments:v15TorusSegments.length,torusVisible:v15TorusSegments.filter(s=>s.m.visible).length,cloudReady:!!v15CloudSea,spineReady:!!v15Spine,trailCount:v15TrailSegs.length,smokeCount:v15KillSmoke.length})};
`;

html = html.replace(clockAnchor, v15 + '\n' + clockAnchor);
fs.writeFileSync('v15.html', html);
console.log(`Built v15.html (${html.length.toLocaleString()} bytes)`);
