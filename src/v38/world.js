// Distant Thunder: a continuous flight landscape, not a ring of decorative rocks.
const lowPower=matchMedia('(pointer:coarse)').matches||innerWidth<700;
renderer.setPixelRatio(Math.min(devicePixelRatio,lowPower?1.15:1.25));
renderer.toneMappingExposure=.94;
camera.far=30000;camera.updateProjectionMatrix();sky.scale.setScalar(10);
renderer.shadowMap.enabled=!lowPower;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-240,right:240,top:240,bottom:-240,near:1,far:2200});
sun.shadow.bias=-.0003;sun.shadow.normalBias=1.2;scene.add(sun.target);
const landHashCache=new Map();
function hashLand(a,b){const key=a*1048576+b;let v=landHashCache.get(key);if(v!==undefined)return v;const n=Math.sin(a*127.1+b*311.7)*43758.5453123;v=n-Math.floor(n);if(landHashCache.size>32768)landHashCache.clear();landHashCache.set(key,v);return v;}
function noiseLand(x,z){
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hashLand(ix,iz),hashLand(ix+1,iz),u),THREE.MathUtils.lerp(hashLand(ix,iz+1),hashLand(ix+1,iz+1),u),v);
}
let worldSeconds=0;
function seaHeight(x,z,t=worldSeconds){return -54+Math.sin(x*.021+z*.013+.9*Math.sin(x*.0017+z*.0031)+t*.92)*2.1+Math.sin(x*-.012+z*.032+.7*Math.cos(x*.0023-z*.0019)-t*1.17)*1.2+Math.sin(x*.045+z*.023+t*1.6)*.45;}
terrainHeight=function(x,z){
  if(tempestTerrain)return seaHeight(x,z);
  const warp=(noiseLand(x*.0006,z*.0006)-.5)*520,
    cross=x-480*Math.sin(z*.00025)-warp*.25,
    basin=Math.exp(-Math.pow((z+2300)/2300,2)),west=cross<0,
    nearEdge=alpineTerrain?(west?320:480+basin*300):(west?460+basin*220:850+basin*1450),
    width=alpineTerrain?(west?1200:1550):(west?680:1800),
    walls=THREE.MathUtils.smoothstep(Math.abs(cross),nearEdge,nearEdge+width),
    ridge=1-Math.abs(noiseLand((x+warp)*.0009,z*.00065)*2-1),
    detail=noiseLand(x*.004,z*.003),fine=noiseLand(x*.018,z*.017),
    height=alpineTerrain?(west?1180:1650):(west?690:420),
    shoulder=alpineTerrain?Math.pow(ridge,2.1):THREE.MathUtils.smoothstep(ridge,.18,.86),
    mountain=walls*(180+shoulder*height),
    floor=-55+noiseLand(x*.0018,z*.0014)*30+detail*8+fine*1.4;
  // A steep western escarpment opens into a basin; the eastern shoulder is
  // lower and farther away. Alpine retains a narrower, asymmetric glacial pass.
  return floor+mountain*(.92+detail*.12);

};
// Recompose existing buildings as one grounded installation. Buildings stay
// at their world positions instead of recycling through the dogfight corridor.
for(let i=scenery.length-1;i>=0;i--){const m=scenery[i];if(!m.userData.city){scene.remove(m);scenery.splice(i,1);}}
for(const m of scenery.splice(24))scene.remove(m);
const cityPositions=scenery.map((m,i)=>{
  const hangar=i<8,row=hangar?Math.floor(i/4):Math.floor((i-8)/8),col=hangar?i%4:(i-8)%8;
  const x=hangar?-350-col*76:-340-col*38,z=hangar?180-row*130:-165-row*52;
  m.scale.set(hangar?1.65:.7,hangar?.42:.6,hangar?1.25:.75);
  m.userData.raise*=m.scale.y;m.userData.collisionH*=m.scale.y;m.userData.collisionR*=Math.max(m.scale.x,m.scale.z);
  return [x,z];
});
const placeBeforeReview=place;
place=function(m,...args){const i=scenery.indexOf(m);if(i<0||!m.userData.city)return placeBeforeReview(m,...args);const [x,z]=cityPositions[i];m.position.set(x,terrainHeight(x,z)+m.userData.raise,z);m.visible=worldIndex===0;};
for(const m of distantRidges)scene.remove(m);distantRidges.length=0;
for(const g of clouds)g.visible=false;
for(const line of contrails)line.visible=false;
leftEdge.visible=rightEdge.visible=vaporL.visible=vaporR.visible=false;
for(const ring of heatRings)ring.visible=false;
for(const plane of [ship,enemy])plane.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.isMeshStandardMaterial){o.material.roughness=.52;o.material.metalness=.36;}}});
for(const p of ship.userData.plumes){p.geometry.scale(.7,.7,.7);}
for(const m of scenery)m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
launchSite.userData.collisionR=38;launchSite.userData.collisionH=98;
platform.userData.collisionR=99;platform.userData.collisionH=85;
const structureObstacles=[launchSite,platform],allObstacles=[...scenery,...structureObstacles];
function collisionObjects(){return allObstacles;}
checkObstacleCollision=function(){for(const m of collisionObjects()){
  if(!m.visible)continue;const dx=ship.position.x-m.position.x,dz=ship.position.z-m.position.z,r=(m.userData.collisionR||0)+3;
  if(dx*dx+dz*dz<r*r&&Math.abs(ship.position.y-m.position.y)<(m.userData.collisionH||8)+2){crashNow();return;}
}};
const avoidV37=steerAroundObstacles;
steerAroundObstacles=function(pos,dir,clearance){
  const out=avoidV37(pos,dir,clearance);
  for(const m of structureObstacles){if(!m.visible)continue;const dx=m.position.x-pos.x,dz=m.position.z-pos.z,along=dx*out.x+dz*out.z;
    if(along>0&&along<320&&Math.hypot(dx-out.x*along,dz-out.z*along)<m.userData.collisionR+32&&pos.y<m.position.y+m.userData.collisionH+24){out.y+=.9;out.normalize();}}
  return out;
};
const separateV37=separateEnemyFromObstacles;
separateEnemyFromObstacles=function(){separateV37();for(const m of structureObstacles){if(!m.visible)continue;const dx=enemy.position.x-m.position.x,dz=enemy.position.z-m.position.z,r=m.userData.collisionR+8;if(dx*dx+dz*dz<r*r&&Math.abs(enemy.position.y-m.position.y)<m.userData.collisionH+8){const d=Math.hypot(dx,dz)||1;enemy.position.x=m.position.x+(dx||1)/d*r;enemy.position.z=m.position.z+dz/d*r;}}};
const weather={realm:{value:0},time:{value:0},sunDir:{value:new THREE.Vector3(-.48,.24,-.84).normalize()},
  skyTop:{value:new THREE.Color()},skyHorizon:{value:new THREE.Color()},sunTint:{value:new THREE.Color()},
  fogTint:{value:scene.fog.color},density:{value:.00018}};
const noiseGLSL=`
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=noise2(p)*a;p=mat2(.8,-.6,.6,.8)*p*2.03+17.1;a*=.5;}return n;}
`;
const atmosphereGLSL=`
uniform float realm,time,density;uniform vec3 skyTop,skyHorizon,sunTint,sunDir,fogTint;
${noiseGLSL}
float cloudField(vec2 p){float n=fbm(p);return smoothstep(realm>1.5?.36:realm>.5?.49:.56,realm>1.5?.69:.72,n);}
vec3 skyLight(vec3 ray){
  float h=ray.y,sd=max(dot(ray,sunDir),0.);
  vec3 col=mix(skyHorizon,skyTop,pow(max(h,0.),.32));
  col+=sunTint*(pow(sd,12.)*.085+pow(sd,150.)*.18+smoothstep(.99993,.99997,sd)*5.);
  if(h>.015){
    vec2 p=ray.xz/max(h,.018)*1.15+vec2(time*.002,0.);
    float cloud=cloudField(p),lit=cloudField(p+sunDir.xz*.35),thick=cloudField(p+vec2(.04,.025));
    vec3 shadow=realm>1.5?vec3(.045,.064,.081):mix(skyHorizon,vec3(.34,.38,.4),.35);
    vec3 light=realm>1.5?vec3(.36,.42,.44):vec3(.91,.89,.81);
    vec3 cl=mix(shadow,light,clamp(.28+(cloud-lit)*1.6,0.,1.));
    cl+=sunTint*pow(sd,12.)*max(cloud-thick,0.)*2.;
    col=mix(col,cl,cloud*smoothstep(.025,.16,h)*(realm>1.5?.9:.48));
  }
  return col;
}
vec3 aerial(vec3 col,vec3 p){vec3 ray=p-cameraPosition;float dist=length(ray);float air=exp(-max((p.y+cameraPosition.y)*.5,0.)/1500.);float amount=1.-exp(-dist*density*air*(.65+.5*smoothstep(400.,6500.,dist)));vec3 tint=fogTint+sunTint*pow(max(dot(normalize(ray),sunDir),0.),8.)*.09;return mix(col,tint,amount);}
`;
sky.material.dispose();sky.material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{...weather,
  // Kept for the protected theme functions; the new palette is applied afterward.
  top:{value:new THREE.Color()},hor:{value:new THREE.Color()},low:{value:new THREE.Color()},sunCol:{value:new THREE.Color()}},
  vertexShader:'varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 ray;${atmosphereGLSL}void main(){gl_FragColor=vec4(skyLight(normalize(ray)),1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
const landMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.96});
landMaterial.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,weather);
  shader.vertexShader='varying vec3 landWorld,landNormal;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nlandWorld=(modelMatrix*vec4(transformed,1.)).xyz;landNormal=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader='varying vec3 landWorld,landNormal;\n'+atmosphereGLSL+'\nfloat landFbm(vec2 p){return noise2(p)*.57+noise2(p*2.03+17.1)*.29+noise2(p*4.12+29.3)*.14;}\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float macro=landFbm(landWorld.xz*.002),grain=noise2(landWorld.xz*.065),slope=1.-max(normalize(landNormal).y,0.);
    float layers=.5+.5*sin(landWorld.y*.11+macro*13.);
    vec3 rock=mix(vec3(.16,.105,.067),vec3(.46,.32,.18),macro);
    rock*=.86+grain*.1+layers*.08;float wash=pow(noise2(landWorld.xz*.007+vec2(macro*2.,0.)),3.);rock=mix(rock,vec3(.36,.29,.2),wash*.5);
    if(realm>.5){rock=mix(vec3(.11,.15,.17),vec3(.3,.34,.34),macro);float snowline=140.+macro*210.;float snow=smoothstep(snowline,snowline+170.,landWorld.y);snow*=smoothstep(.25,.85,normalize(landNormal).y+grain*.24);rock=mix(rock,vec3(.82,.87,.86)*(.9+grain*.06),snow);}
    diffuseColor.rgb=rock;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
float surfaceNoise=noise2(landWorld.xz*.075)*.035;vec3 qx=dFdx(vViewPosition),qy=dFdy(vViewPosition);vec3 sx=cross(qy,normal),sy=cross(normal,qx);float det=dot(qx,sx);normal=normalize(abs(det)*normal-sign(det)*(dFdx(surfaceNoise)*sx+dFdy(surfaceNoise)*sy));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','gl_FragColor.rgb=aerial(gl_FragColor.rgb,landWorld);');
  // Fog belongs in linear space before output conversion.
  shader.fragmentShader=shader.fragmentShader.replace('gl_FragColor.rgb=aerial(gl_FragColor.rgb,landWorld);','').replace('#include <tonemapping_fragment>','gl_FragColor.rgb=aerial(gl_FragColor.rgb,landWorld);\n#include <tonemapping_fragment>');
};
ground.material.dispose();ground.material=landMaterial;ground.receiveShadow=true;
const farGeo=new THREE.PlaneGeometry(28000,28000,160,160);farGeo.rotateX(-Math.PI/2);
const farPos=farGeo.attributes.position,farBase=new Float32Array(farPos.array),farIndices=[];
// A coarse outer mesh shares the same height function; overlap is sunk slightly.
for(let z=0;z<160;z++)for(let x=0;x<160;x++){
  const i=z*161+x,cx=farBase[i*3]+87.5,cz=farBase[i*3+2]+87.5;
  if(Math.abs(cx)<2800&&Math.abs(cz)<2800)continue;
  farIndices.push(i,i+161,i+1,i+1,i+161,i+162);
}
farGeo.setIndex(farIndices);const farLand=new THREE.Mesh(farGeo,landMaterial);scene.add(farLand);
const rebuildV37=rebuildTerrain;
rebuildTerrain=function(cx,cz){if(tempestTerrain){tcx=cx;tcz=cz;return;}rebuildV37(cx,cz);ggeo.computeBoundingSphere();
  for(let i=0;i<farPos.count;i++){const x=farBase[i*3]+cx,z=farBase[i*3+2]+cz;farPos.setY(i,terrainHeight(x,z)-4);}
  farPos.needsUpdate=true;farGeo.computeVertexNormals();farGeo.computeBoundingSphere();farLand.position.set(cx,0,cz);
};
// World-space swells do not swim with the camera. Analytic normals carry the
// moving specular response; finer capillary waves fade out with distance.
ocean.geometry.dispose();ocean.geometry=new THREE.PlaneGeometry(6400,6400,200,200);ocean.geometry.rotateX(-Math.PI/2);
ocean.material.dispose();ocean.material=new THREE.ShaderMaterial({uniforms:weather,vertexShader:`uniform float time;varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);w.y=-54.+sin(w.x*.021+w.z*.013+.9*sin(w.x*.0017+w.z*.0031)+time*.92)*2.1+sin(w.x*-.012+w.z*.032+.7*cos(w.x*.0023-w.z*.0019)-time*1.17)*1.2+sin(w.x*.045+w.z*.023+time*1.6)*.45;wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`varying vec3 wp;${atmosphereGLSL}
void main(){
  float phaseA=wp.x*.0017+wp.z*.0031,phaseB=wp.x*.0023-wp.z*.0019;
  float a=wp.x*.021+wp.z*.013+.9*sin(phaseA)+time*.92,b=wp.x*-.012+wp.z*.032+.7*cos(phaseB)-time*1.17,c=wp.x*.045+wp.z*.023+time*1.6;
  vec3 V=normalize(cameraPosition-wp);float dist=length(cameraPosition-wp);
  float small=exp(-dist*.0015);vec2 rp=wp.xz*.06+time*.03;float ripple=(noise2(rp+vec2(.1,0.))-noise2(rp-vec2(.1,0.)))*small;
  float slopeX=cos(a)*2.1*(.021+.00153*cos(phaseA))+cos(b)*1.2*(-.012-.00161*sin(phaseB))+cos(c)*.02025;
  float slopeZ=cos(a)*2.1*(.013+.00279*cos(phaseA))+cos(b)*1.2*(.032+.00133*sin(phaseB))+cos(c)*.01035;
  // Filter unresolved wave detail before it becomes a repeated horizon stripe.
  float resolve=exp(-dist*.00065);
  vec3 N=normalize(vec3((-slopeX+ripple*.08)*resolve,1.,(-slopeZ+ripple*.045)*resolve));
  vec3 reflection=reflect(-V,N);reflection.y=abs(reflection.y);
  float fresnel=.035+.965*pow(1.-max(dot(N,V),0.),5.);
  vec3 reflected=mix(skyHorizon,skyTop,sqrt(max(reflection.y,0.)));
  reflected*=.8+.2*noise2(wp.xz*.003+time*.004);
  float rough=.16+.07*noise2(wp.xz*.003);vec3 H=normalize(V+sunDir);float ndh=max(dot(N,H),0.),alpha=rough*rough;
  float spec=alpha*alpha/(3.14159*pow(ndh*ndh*(alpha*alpha-1.)+1.,2.));
  vec3 col=mix(vec3(.008,.032,.041),reflected,fresnel*.86+.1)+sunTint*min(spec*.003,.55);
  float crest=smoothstep(-51.2,-50.5,wp.y)*smoothstep(.56,.75,noise2(wp.xz*.19+time*.14));
  col=mix(col,vec3(.24,.33,.34),crest*small*.12);
  gl_FragColor=vec4(aerial(col,wp),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`});
ocean.frustumCulled=false;
const farSea=new THREE.Mesh(farGeo.clone(),ocean.material);farSea.geometry.setIndex(farIndices);scene.add(farSea);farSea.frustumCulled=false;
const themeV37=setWorldTheme,tempestV37=setTempestTheme;
function applyDistantTheme(){
  const realm=worldIndex;weather.realm.value=realm;
  const palettes=[{top:0x243d50,horizon:0xc3b9a4,fog:0xaab0aa,sun:0xffe5c2,density:.00023},
    {top:0x243d52,horizon:0xc5cfd0,fog:0x9dabb3,sun:0xffedcf,density:.00018},
    {top:0x152431,horizon:0x8b9da4,fog:0x718893,sun:0xdde5e4,density:.00027}];
  const p=palettes[realm];weather.skyTop.value.setHex(p.top);weather.skyHorizon.value.setHex(p.horizon);weather.sunTint.value.setHex(p.sun);
  scene.fog.color.setHex(p.fog);scene.fog.density=p.density;weather.density.value=p.density;
  weather.sunDir.value.set(-.48,realm===1?.36:realm===2?.16:.24,-.84).normalize();
  hemi.color.setHex(realm===2?0xb4cad6:0xdce9ec);hemi.groundColor.setHex(realm===0?0x715441:0x435766);hemi.intensity=realm===2?1.45:realm===0?1.15:1.55;
  sun.color.setHex(p.sun);sun.intensity=realm===2?2.4:3.5;
  sandMat.color.setHex(0x9b8d75);cityDarkMat.color.setHex(0x61625c);rockMat.color.setHex(0x655849);
  ground.visible=farLand.visible=realm!==2;farSea.visible=realm===2;
  launchSite.position.y=terrainHeight(-650,-760)+92;
  rebuildTerrain(tcx,tcz);
}
setWorldTheme=function(a){themeV37(a);applyDistantTheme();};
setTempestTheme=function(){tempestV37();applyDistantTheme();};
const updateWorldDistant=updateWorld;
updateWorld=function(){
  worldSeconds=performance.now()*.001;weather.time.value=worldSeconds;
  updateWorldDistant();
  for(const g of clouds)g.visible=false;for(const line of contrails)line.visible=false;
  ground.visible=farLand.visible=worldIndex!==2;farSea.visible=worldIndex===2;farSea.position.set(ocean.position.x,0,ocean.position.z);
  // Move the shadow camera before the render pass, never from onBeforeRender.
  sun.position.copy(ship.position).addScaledVector(weather.sunDir.value,1200);sun.target.position.copy(ship.position);sun.target.updateMatrixWorld();
  ocean.position.set(Math.round(ship.position.x/140)*140,0,Math.round(ship.position.z/140)*140);
  scene.fog.density=weather.density.value;
};
applyDistantTheme();
// Exhaust geometry is built on the aircraft Z axis, so lengthening it under
// thrust cannot accidentally flatten the cone into a sideways paddle.
for(const p of ship.userData.plumes){p.geometry.dispose();p.geometry=new THREE.ConeGeometry(.24,2.5,16);p.geometry.rotateX(Math.PI/2);p.rotation.set(0,0,0);p.position.z=4.5;p.material.opacity=.4;}
const nozzleMat=new THREE.MeshStandardMaterial({color:0x313b41,roughness:.55,metalness:.65});
for(const plane of [ship,enemy]){
  const xs=plane===ship?[-5,-1.7,1.7,5]:[-1.35,1.35];
  for(const x of xs){const tube=new THREE.Mesh(new THREE.CylinderGeometry(.42,.36,1.6,16,1,true),nozzleMat);tube.rotation.x=Math.PI/2;tube.position.set(x,0,2.85);tube.castShadow=true;plane.add(tube);}
  const tail=new THREE.Mesh(new THREE.ConeGeometry(plane===ship?1.4:1,2.4,24),nozzleMat);tail.geometry.rotateX(Math.PI/2);tail.position.z=plane===ship?5.5:4.3;tail.castShadow=true;plane.add(tail);
}
const squalls=[];
for(const [x,z,w,h] of [[-1300,-2900,1800,750],[2300,-4900,2400,950]]){
  const curtain=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:weather,
    vertexShader:'varying vec2 uvRain;varying vec3 rainWorld;void main(){uvRain=uv;vec4 w=modelMatrix*vec4(position,1.);rainWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`varying vec2 uvRain;varying vec3 rainWorld;${noiseGLSL}uniform float time;void main(){float edge=sin(uvRain.x*3.14159);float veil=smoothstep(0.,.15,uvRain.y)*(1.-smoothstep(.72,1.,uvRain.y));float streak=noise2(vec2(uvRain.x*45.+uvRain.y*3.,uvRain.y*2.+time*.03));float alpha=edge*edge*veil*(.16+streak*.2);gl_FragColor=vec4(.18,.25,.29,alpha);\n#include <colorspace_fragment>}`
  }));curtain.position.set(x,-54+h*.5,z);scene.add(curtain);squalls.push(curtain);
}
const updateWeatherBase=updateWorld;
updateWorld=function(){updateWeatherBase();for(const curtain of squalls)curtain.visible=worldIndex===2;};

for(const x of [-4.8,4.8]){const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,2,12),nozzleMat);barrel.rotation.x=Math.PI/2;barrel.position.set(x,-.13,-1.5);barrel.castShadow=true;ship.add(barrel);}
// Soft precipitation avoids the square point sprites visible in the old build.
const moistureCanvas=document.createElement('canvas');moistureCanvas.width=moistureCanvas.height=32;
const moistureContext=moistureCanvas.getContext('2d'),moistureGradient=moistureContext.createRadialGradient(16,16,1,16,16,16);
moistureGradient.addColorStop(0,'rgba(255,255,255,1)');moistureGradient.addColorStop(.3,'rgba(255,255,255,.7)');moistureGradient.addColorStop(1,'rgba(255,255,255,0)');moistureContext.fillStyle=moistureGradient;moistureContext.fillRect(0,0,32,32);
snow.material.map=new THREE.CanvasTexture(moistureCanvas);snow.material.needsUpdate=true;
