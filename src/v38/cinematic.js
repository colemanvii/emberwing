// V38 presentation only: studio-like sky reflection on the existing airframes.
// A tiny static environment is filtered once, without a per-frame render pass.
const airframeSky=document.createElement('canvas');airframeSky.width=256;airframeSky.height=128;
const airframeContext=airframeSky.getContext('2d'),airframeGradient=airframeContext.createLinearGradient(0,0,0,128);
for(const [stop,color] of [[0,'#637b90'],[.38,'#b3bec1'],[.49,'#ded8c8'],[.54,'#555b5a'],[1,'#242b32']])airframeGradient.addColorStop(stop,color);
airframeContext.fillStyle=airframeGradient;airframeContext.fillRect(0,0,256,128);
const airframeMap=new THREE.CanvasTexture(airframeSky);airframeMap.mapping=THREE.EquirectangularReflectionMapping;airframeMap.colorSpace=THREE.SRGBColorSpace;
const airframePMREM=new THREE.PMREMGenerator(renderer),airframeEnvironment=airframePMREM.fromEquirectangular(airframeMap);
airframeMap.dispose();airframePMREM.dispose();
for(const plane of [ship,enemy])plane.traverse(o=>{
  if(!o.isMesh||!o.material.isMeshStandardMaterial)return;
  const m=o.material;m.envMap=airframeEnvironment.texture;m.envMapIntensity=.72;
  const glass=o.geometry.type==='SphereGeometry';
  m.roughness=glass?.13:.39;m.metalness=glass?.76:.48;
  if(plane===ship&&!glass)m.color.lerp(new THREE.Color(0x626b70),.32);
  m.needsUpdate=true;
});
// Feather the existing exhaust surface so it reads as heat, not a solid cone.
for(const plume of ship.userData.plumes){
  plume.material.color.setHex(0xffc58d);
  plume.material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 exhaustUV;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nexhaustUV=uv;');
    shader.fragmentShader='varying vec2 exhaustUV;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=pow(1.-exhaustUV.y,1.8)*.46;');
  };
  plume.material.needsUpdate=true;
}
// Keep the center of the view clear; reuse the existing streak buffer.
speedGeo.setDrawRange(0,72);speedMat.color.setHex(0xc9d7dc);
const cinematicSpeedBase=updateSpeedFX;
updateSpeedFX=function(dt){
  cinematicSpeedBase(dt);speedMat.opacity*=.24;
  for(const e of ship.userData.engines)e.material.color.setRGB(1,.68,.4);
};
// A single brief flash accompanies the existing impact particles and cleanup.
const cinematicImpactBase=spawnImpactFX;
spawnImpactFX=function(pos,lethal=false,sound=true){
  cinematicImpactBase(pos,lethal,sound);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:snow.material.map,color:0xffead1,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  mesh.position.copy(pos);mesh.quaternion.copy(camera.quaternion);mesh.scale.setScalar(lethal?13:5);scene.add(mesh);
  const life=lethal?.12:.065;combatFX.push({mesh,v:new THREE.Vector3(),life,maxLife:life,smoke:false});
};
