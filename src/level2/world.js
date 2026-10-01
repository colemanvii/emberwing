// Authored two-dimensional basin. No valley axis, route gates or moving scenery.
const DESERT_SITES=Object.freeze([
 {name:'WEST / SALT WORKS',x:-1550,z:-350},
 {name:'NORTH / RELAY YARD',x:100,z:-1500},
 {name:'EAST / PUMP STATION',x:1750,z:-200}
]);
const roadHub={x:0,z:760};
function washCenter(x){return 380+Math.sin(x*.0009)*310+x*.22;}
terrainHeight=function(x,z){
 const wash=Math.exp(-Math.pow((z-washCenter(x))/82,2));
 const lowRise=34*Math.exp(-((x+2800)**2+(z+1400)**2)/1100000)+27*Math.exp(-((x-2800)**2+(z-1300)**2)/800000);
 return -32+Math.sin(x*.0008)*5+Math.cos(z*.0011)*4+noiseLand(x*.003,z*.003)*3+lowRise-wash*13;
};
for(const m of scenery)scene.remove(m);scenery.length=0;allObstacles.length=0;structureObstacles.length=0;
place=function(){};positionDistantRidges=function(){};clearSpawnCorridor=function(){};
launchSite.visible=false;rocket.visible=false;platform.visible=false;ocean.visible=farSea.visible=false;
for(const child of [...rocket.children])rocket.remove(child);
const desertWorld=new THREE.Group();scene.add(desertWorld);
const desertMat=color=>new THREE.MeshStandardMaterial({color,roughness:.96,flatShading:true});
const plaster=desertMat(0xbcb19a),roofMat=desertMat(0x817965),wallMat=desertMat(0xa99b7c),roadMat=desertMat(0x6f6450),darkMat=desertMat(0x303632),truckMat=desertMat(0x666b51),palmMat=desertMat(0x687155);
function box(parent,w,h,d,x,y,z,mat=plaster,solid=false){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);
 if(solid){m.userData.collisionR=Math.hypot(w,d)*.43;m.userData.collisionH=h*.5;allObstacles.push(m);scenery.push(m);}return m;
}
function roadPoint(site,t,offset=0){
 // One straight service branch per compound, with a public cross-basin road at the hub.
 const dx=site.x-roadHub.x,dz=site.z-roadHub.z,len=Math.hypot(dx,dz);
 const x=roadHub.x+dx*t+dz/len*offset,z=roadHub.z+dz*t-dx/len*offset;
 return new THREE.Vector3(x,terrainHeight(x,z)+2.3,z);
}
function road(a,b,width=16,material=roadMat){
 const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),verts=[],indices=[],steps=Math.ceil(len/24);
 for(let i=0;i<=steps;i++){const t=i/steps;for(const side of [-1,1]){const x=a.x+dx*t+side*dz/len*width/2,z=a.z+dz*t-side*dx/len*width/2;verts.push(x,terrainHeight(x,z)+.55,z);}if(i<steps){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.receiveShadow=true;desertWorld.add(m);
}
road({x:-4200,z:760},{x:4200,z:760},22);
road({x:0,z:3000},roadHub,20);
const compounds=[];
for(const [i,s] of DESERT_SITES.entries()){
 road(roadHub,s);const y=terrainHeight(s.x,s.z);
 // Low perimeter with a south road entrance. All major walls/buildings collide.
 box(desertWorld,246,1,200,s.x,y+.5,s.z,roofMat);
 box(desertWorld,246,7,5,s.x,y+3.5,s.z-100,wallMat,true);
 for(const dx of [-121,121])box(desertWorld,5,7,200,s.x+dx,y+3.5,s.z,wallMat,true);
 for(const dx of [-82,82])box(desertWorld,80,7,5,s.x+dx,y+3.5,s.z+100,wallMat,true);
 box(desertWorld,74,16,38,s.x-64,y+8,s.z-50,plaster,true);
 box(desertWorld,80,2,44,s.x-64,y+17,s.z-50,roofMat);
 box(desertWorld,30,10,48,s.x+70,y+5,s.z+28,plaster,true);
 const tower=new THREE.Group();tower.position.set(s.x+83,y,s.z-67);desertWorld.add(tower);
 for(const dx of [-5,5])for(const dz of [-5,5])box(tower,1.1,29,1.1,dx,14.5,dz,roofMat);
 const tank=new THREE.Mesh(new THREE.CylinderGeometry(9,9,10,8),plaster);tank.position.y=30;tower.add(tank);
 // Same silhouette at all candidates. Only the occupied yard has live radar and escorts.
 const dish=new THREE.Group();dish.position.set(s.x+20,y+18,s.z-58);desertWorld.add(dish);
 box(dish,1,28,1,0,-7,0,darkMat);box(dish,26,9,2,0,6,0,darkMat);
 const beacon=new THREE.Mesh(new THREE.SphereGeometry(1.8,6,4),new THREE.MeshBasicMaterial({color:0xe7a45d}));beacon.position.set(0,12,0);dish.add(beacon);
 compounds.push({site:s,dish,beacon});
}
// Village is immediately under the ingress; a second settlement anchors the west horizon.
function village(cx,cz,count){
 for(let i=0;i<count;i++){
  const x=cx+(i%5-2)*53+(i%2)*11,z=cz+Math.floor(i/5)*57,y=terrainHeight(x,z),h=7+(i%3)*3;
  box(desertWorld,22+(i%3)*7,h,24,x,y+h/2,z,plaster,true);
  box(desertWorld,24+(i%3)*7,1.2,26,x,y+h,z,roofMat);
  if(i%3===0){box(desertWorld,36,3,2,x,y+1.5,z+20,wallMat,true);box(desertWorld,2,3,24,x+18,y+1.5,z+9,wallMat,true);}
 }
 for(let i=0;i<6;i++){
  const x=cx-155+i*59,z=cz-25,y=terrainHeight(x,z);
  box(desertWorld,1.3,18,1.3,x,y+9,z,roofMat);
  for(let j=0;j<5;j++){const frond=box(desertWorld,2,.6,14,x+Math.sin(j*1.257)*5,y+18,z+Math.cos(j*1.257)*5,palmMat);frond.rotation.y=j*1.257;frond.rotation.x=.22;}
 }
}
village(0,1220,15);village(-2600,-800,10);
for(let i=0;i<12;i++){
 const x=-3300+i*600,z=800,y=terrainHeight(x,z);
 box(desertWorld,1.2,24,1.2,x,y+12,z,roofMat);box(desertWorld,13,1,1,x,y+23,z,roofMat);
 if(i<11){const nx=x+600,ny=terrainHeight(nx,z)+23;const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,y+23,z),new THREE.Vector3(x+300,(y+23+ny)/2-6,z),new THREE.Vector3(nx,ny,z)]);desertWorld.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x635c4e})));}
}
function makeTruck(command=false){
 const g=new THREE.Group();box(g,command?13:8,4,command?24:17,0,4,0,command?darkMat:truckMat);
 box(g,8,5,6,0,4,-9,truckMat);box(g,7,2,.2,0,5,-12.1,darkMat);
 for(const x of [-4.5,4.5])for(const z of [-7,6]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(2,2,1.8,8),darkMat);wheel.rotation.z=Math.PI/2;wheel.position.set(x,1.8,z);g.add(wheel);}
 if(command){box(g,1,21,1,3,13,5,darkMat);box(g,16,2,3,3,23,5,plaster);box(g,11,2,12,0,7,3,plaster);}
 return g;
}
const commandTruck=makeTruck(true);commandTruck.position.y=-7;rocket.add(commandTruck);rocket.scale.setScalar(1);
rocket.userData.collisionR=15;rocket.userData.collisionH=13;allObstacles.push(rocket);
const convoy=[];
for(let i=0;i<5;i++){const mesh=makeTruck();scene.add(mesh);convoy.push({mesh,t:0,index:i,smoke:0});}
const parkedEscorts=[];
for(let i=0;i<3;i++){const mesh=makeTruck();scene.add(mesh);parkedEscorts.push(mesh);}
const dustGeometry=new THREE.IcosahedronGeometry(1,0),dust=[];
for(let i=0;i<150;i++){const mesh=new THREE.Mesh(dustGeometry,new THREE.MeshBasicMaterial({color:0xe2ceb0,transparent:true,opacity:0,depthWrite:false}));mesh.visible=false;scene.add(mesh);dust.push({mesh,life:0,max:7});}
let dustCursor=0;
function emitDust(pos,age=0){const p=dust[dustCursor++%dust.length];p.life=7-age;p.mesh.visible=true;p.mesh.position.copy(pos);p.mesh.position.y+=8+age*4;p.mesh.position.x+=age*4;p.mesh.scale.set(9+age*4,6+age*3,12+age*5);p.mesh.material.opacity=.43*(p.life/7);}
const sandSurface=new THREE.MeshStandardMaterial({color:0xc8b58b,roughness:1,flatShading:true});
sandSurface.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 desertPosition;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ndesertPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
 shader.fragmentShader='varying vec3 desertPosition;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float center=380.+sin(desertPosition.x*.0009)*310.+desertPosition.x*.22;
 float wash=exp(-pow((desertPosition.z-center)/95.,2.));
 float ripple=sin(desertPosition.x*.022+sin(desertPosition.z*.012)*2.)*.025;
 diffuseColor.rgb*=1.+ripple;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.38,.31,.22),wash*.42);`);
};
ground.material=farLand.material=sandSurface;
function desertTheme(){
 worldIndex=0;tempestTerrain=alpineTerrain=false;camera.far=30000;camera.updateProjectionMatrix();
 weather.realm.value=0;weather.skyTop.value.setHex(0x507e92);weather.skyHorizon.value.setHex(0xdfd0ac);weather.sunTint.value.setHex(0xffecd1);weather.density.value=.000065;
 weather.sunDir.value.set(-.65,.55,-.45).normalize();scene.fog.color.setHex(0xd7c59f);scene.fog.density=.000065;
 hemi.color.setHex(0xd8e4e4);hemi.groundColor.setHex(0xb19b70);hemi.intensity=1.7;sun.intensity=2.8;sun.color.setHex(0xffe2b4);renderer.toneMappingExposure=1.02;
 ocean.visible=farSea.visible=platform.visible=launchSite.visible=false;ground.visible=farLand.visible=true;
}
updateWorld=function(){
 weather.time.value=missionElapsed;
 if(Math.abs(ship.position.x-tcx)>620||Math.abs(ship.position.z-tcz)>620)rebuildTerrain(Math.round(ship.position.x/620)*620,Math.round(ship.position.z/620)*620);
 sun.position.copy(ship.position).addScaledVector(weather.sunDir.value,1200);sun.target.position.copy(ship.position);sun.target.updateMatrixWorld();
 // Retain aircraft engine/audio animation, suppress all previous world spectacle.
 updateV34Spectacle();launchSite.visible=platform.visible=ocean.visible=farSea.visible=false;rocket.visible=!mission.destroyed;rocketFlame.visible=false;
 for(const g of clouds)g.visible=false;
};
function updateDesertWorld(dt){
 const active=DESERT_SITES[mission.variant];
 compounds.forEach((c,i)=>{c.beacon.visible=i===mission.variant&&!mission.destroyed;if(i===mission.variant&&!mission.destroyed)c.dish.rotation.y+=dt*1.4;});
 for(const v of convoy){
  v.t+=dt*19/Math.hypot(active.x-roadHub.x,active.z-roadHub.z);
  // Deliver, then turn around on the same road; never recycle ahead of the aircraft.
  const t=.12+Math.abs(((v.t+.88)%1.76)-.88);v.mesh.position.copy(roadPoint(active,t));
  const returning=(v.t+.88)%1.76>.88;v.mesh.rotation.y=Math.atan2(active.x,active.z-roadHub.z)+(returning?Math.PI:0);
  v.smoke-=dt;if(v.smoke<=0){emitDust(v.mesh.position);v.smoke=.30;}
 }
 for(const p of dust){if(p.life<=0)continue;p.life-=dt;p.mesh.visible=p.life>0;p.mesh.position.x+=dt*4;p.mesh.position.y+=dt*4;p.mesh.scale.addScalar(dt*3);p.mesh.material.opacity=Math.max(0,p.life/7)*.43;}
}
