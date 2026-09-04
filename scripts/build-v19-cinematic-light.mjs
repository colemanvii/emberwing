import fs from 'node:fs';

let html=fs.readFileSync('v18.html','utf8');
if(!html.includes('EMBERWING V18 // ART REBUILD')) throw new Error('Expected V18 baseline');
if(/document\.write\(|cdn\.jsdelivr\.net\/gh\/colemanvii\/emberwing@/i.test(html)) throw new Error('Refusing wrapper architecture');

html=html.replace('<!-- EMBERWING V18 // ART REBUILD // protected V14 gameplay, rebuilt world composition -->','<!-- EMBERWING V19 // CINEMATIC LIGHT // protected V18 composition, zero gameplay tuning -->');
html=html.replace('<title>Emberwing V18</title>','<title>Emberwing V19</title>');

const screenStyle=`
<style id="emberwing-v19-cinematic-language">
#grade{opacity:.74!important;background:
radial-gradient(ellipse at 50% 40%,transparent 0 52%,rgba(2,5,10,.08) 72%,rgba(1,3,7,.34) 100%),
linear-gradient(180deg,rgba(8,13,21,.035),transparent 34%,rgba(95,48,20,.045) 100%)!important}
#grade:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.045;mix-blend-mode:soft-light;background-image:
repeating-linear-gradient(0deg,rgba(255,255,255,.24) 0 1px,transparent 1px 4px),
repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0 1px,transparent 1px 5px)}
#mark,#score,#readout{filter:drop-shadow(0 1px 4px rgba(0,0,0,.28))}
#objective{filter:drop-shadow(0 2px 8px rgba(0,0,0,.3))}
#coach{background:linear-gradient(90deg,transparent,rgba(3,7,12,.22),transparent)!important}
#focus{background:rgba(2,6,11,.08)!important}
</style>`;
html=html.replace('</head>',screenStyle+'\n</head>');

const anchor='const clock=new THREE.Clock();';
if(!html.includes(anchor)) throw new Error('V19 runtime anchor missing');

const v19=String.raw`
// EMBERWING V19 // CINEMATIC LIGHT
// This pass changes only rendering, atmosphere and art-direction values.

renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=true;
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.near=1;
sun.shadow.camera.far=3400;
sun.shadow.camera.left=-1450;
sun.shadow.camera.right=1450;
sun.shadow.camera.top=1200;
sun.shadow.camera.bottom=-1200;
sun.shadow.bias=-0.00035;
sun.shadow.normalBias=.035;
scene.add(sun.target);
ground.receiveShadow=true;

function v19ShadowTree(root,cast=true,receive=true){root.traverse(o=>{if(o.isMesh){o.castShadow=cast;o.receiveShadow=receive}})}
v19ShadowTree(ship,true,true);
v19ShadowTree(enemy,true,true);
v19ShadowTree(v18Gate,true,true);
v19ShadowTree(v18Spine,true,true);

// Give the distant continental silhouettes real light instead of flat fill.
const v19HorizonMats=[];
v18Horizon.children.forEach((m,i)=>{if(!m.isMesh)return;const mat=new THREE.MeshStandardMaterial({color:i%3===0?0x2e3132:i%3===1?0x393735:0x24292c,roughness:1,metalness:0,flatShading:true,fog:true});m.material=mat;m.receiveShadow=true;v19HorizonMats.push(mat)});

// Gentle warm bounce from the desert and cold bounce in alpine.
const v19Fill=new THREE.DirectionalLight(0xffc47f,.58);
v19Fill.position.set(550,220,760);
scene.add(v19Fill);
const v19Rim=new THREE.DirectionalLight(0x9fc8e8,.18);
v19Rim.position.set(-380,520,260);
scene.add(v19Rim);

function v19RadialTexture(inner,mid,outer,size=512){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),q=size*.5,gr=g.createRadialGradient(q,q,0,q,q,q);gr.addColorStop(0,inner);gr.addColorStop(.48,mid);gr.addColorStop(1,outer);g.fillStyle=gr;g.fillRect(0,0,size,size);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const v19MistTex=v19RadialTexture('rgba(255,214,154,.7)','rgba(216,151,101,.15)','rgba(216,151,101,0)');
const v19Mist=[];
for(let i=0;i<4;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:v19MistTex,color:0xffc58a,transparent:true,opacity:.07-i*.009,depthWrite:false,fog:true,blending:THREE.NormalBlending}));s.scale.set(1450+i*320,520+i*110,1);scene.add(s);v19Mist.push(s)}

// A pair of restrained light shafts make the monumental gap read as architecture, not blocks.
const v19ShaftMat=new THREE.MeshBasicMaterial({color:0xffd19b,transparent:true,opacity:.035,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:true});
const v19Shafts=new THREE.Group();
for(const x of[-115,120]){const p=new THREE.Mesh(new THREE.PlaneGeometry(250,1100),v19ShaftMat.clone());p.position.set(x,245,-150);p.rotation.x=-.18;p.rotation.y=x<0?.08:-.08;v19Shafts.add(p)}
v18Gate.add(v19Shafts);

// More material separation without adding detail geometry.
v18Basalt.color.setHex(0x11171d);
v18Basalt.roughness=.88;
v18WarmFace.color.setHex(0x715943);
v18WarmFace.roughness=.82;
v18SpineMat.roughness=.9;
v18SnowMat.roughness=.78;
ground.material.roughness=.92;
ground.material.metalness=0;

// Long, low-frequency terrain striation: scale and direction instead of visual noise.
const v19RebuildBase=rebuildTerrain;
rebuildTerrain=function(cx,cz){
  v19RebuildBase(cx,cz);
  const col=ggeo.attributes.color,pos=ggeo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i)+cx,z=pos.getZ(i)+cz;
    const broad=.88+.12*(.5+.5*Math.sin(x*.0031+z*.0011));
    const long=.92+.08*(.5+.5*Math.sin((x-z)*.0009+1.7));
    const shade=alpineTerrain?(.94+.06*(.5+.5*Math.sin(x*.0018+z*.0014))):broad*long;
    col.setXYZ(i,Math.min(1,col.getX(i)*shade),Math.min(1,col.getY(i)*shade),Math.min(1,col.getZ(i)*shade));
  }
  col.needsUpdate=true;
};

const v19ThemeBase=v18ApplyTheme;
v18ApplyTheme=function(alpine){
  v19ThemeBase(alpine);
  if(alpine){
    scene.fog.density=.00053;
    sky.material.uniforms.top.value.setHex(0x010817);
    sky.material.uniforms.hor.value.setHex(0x759bb0);
    sky.material.uniforms.low.value.setHex(0xf5f8fa);
    hemi.intensity=1.42;
    sun.intensity=6.25;
    sun.color.setHex(0xeaf7ff);
    renderer.toneMappingExposure=1.08;
    v19Fill.color.setHex(0xa9c8da);v19Fill.intensity=.34;
    v19Rim.color.setHex(0xe9fbff);v19Rim.intensity=.42;
    v19Mist.forEach(s=>s.visible=false);
    for(const p of v19Shafts.children)p.material.opacity=.015;
  }else{
    haze.setHex(0x9f7658);scene.background=haze;scene.fog.color.setHex(0xb0815f);scene.fog.density=.00054;
    sky.material.uniforms.top.value.setHex(0x06111f);
    sky.material.uniforms.hor.value.setHex(0xa25e40);
    sky.material.uniforms.low.value.setHex(0xf1c784);
    hemi.color.setHex(0xffe6c1);hemi.groundColor.setHex(0x25170f);hemi.intensity=1.34;
    sun.intensity=7.1;sun.color.setHex(0xffc879);
    renderer.toneMappingExposure=1.03;
    v19Fill.color.setHex(0xffbd77);v19Fill.intensity=.58;
    v19Rim.color.setHex(0x86afd0);v19Rim.intensity=.17;
    v19Mist.forEach(s=>s.visible=true);
    for(const p of v19Shafts.children)p.material.opacity=.035;
  }
  v19RebuildBase(tcx,tcz);
  rebuildTerrain(tcx,tcz);
};

const v19WorldBase=updateWorld;
updateWorld=function(){
  v19WorldBase();
  const f=heading().clone(),r=new THREE.Vector3().crossVectors(f,worldUp).normalize();
  sun.position.set(ship.position.x-820,ship.position.y+980,ship.position.z+620);
  sun.target.position.copy(ship.position).addScaledVector(f,260);
  v19Fill.position.set(ship.position.x+680,ship.position.y+240,ship.position.z+760);
  v19Fill.target.position.copy(ship.position);if(!v19Fill.target.parent)scene.add(v19Fill.target);
  v19Rim.position.set(ship.position.x-520,ship.position.y+620,ship.position.z-280);
  v19Rim.target.position.copy(ship.position);if(!v19Rim.target.parent)scene.add(v19Rim.target);
  if(!worldIndex){
    for(let i=0;i<v19Mist.length;i++){
      const d=1200+i*280,side=(i-1.5)*360;
      v19Mist[i].position.set(ship.position.x+f.x*d+r.x*side,ship.position.y+105+i*28,ship.position.z+f.z*d+r.z*side);
    }
  }
};

// Refine the existing V18 sun scale so it reads as a celestial source rather than a UI disc.
v18SunGlow.scale.set(760,760,1);
v18SunCore.scale.set(190,190,1);

window.__emberwingV19={snapshot:()=>({title:document.title,shadows:renderer.shadowMap.enabled,gate:v18Gate.visible,spine:v18Spine.visible,horizon:v18Horizon.visible,mist:v19Mist.filter(s=>s.visible).length,sceneryCount:scenery.length,world:worldIndex?'alpine':'desert'})};
`;

html=html.replace(anchor,v19+'\n'+anchor);
fs.writeFileSync('v19.html',html);
console.log(`Built v19.html (${html.length.toLocaleString()} bytes)`);
