// Player presentation only. Flight transform, collision and weapon origins stay pinned.
// Replace the old assembly with a continuous, low-profile experimental airframe.
for(const child of [...ship.children]){ship.remove(child);child.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
ship.userData.engines=[];ship.userData.plumes=[];
const airframeControls=[];
const prototypeHull=new THREE.MeshStandardMaterial({color:0x343d42,roughness:.56,metalness:.42});
const prototypeWing=new THREE.MeshStandardMaterial({color:0x414b51,roughness:.61,metalness:.34});
const prototypeEdge=new THREE.MeshStandardMaterial({color:0x687176,roughness:.48,metalness:.55});
const prototypeControl=new THREE.MeshStandardMaterial({color:0x39444b,roughness:.53,metalness:.4});
const prototypeHot=new THREE.MeshStandardMaterial({color:0x292e32,roughness:.57,metalness:.66});
const prototypeGlass=new THREE.MeshStandardMaterial({color:0x101a21,roughness:.17,metalness:.72});
for(const m of [prototypeHull,prototypeWing,prototypeEdge,prototypeHot,prototypeGlass,prototypeControl])m.userData.prototype=true;
// Broad composite bays and a narrow leading-edge treatment, with no textures or extra draws.
for(const material of [prototypeHull,prototypeWing,prototypeControl]){
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 airframePoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nairframePoint=position;');
  shader.fragmentShader='varying vec3 airframePoint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float panelBay=smoothstep(-3.9,-3.84,airframePoint.z)*(1.-smoothstep(.75,.81,airframePoint.z));
   float shoulder=smoothstep(.8,1.5,abs(airframePoint.x));
   roughnessFactor=clamp(roughnessFactor+panelBay*.035-shoulder*.025,.3,.75);
  `).replace('#include <color_fragment>',`#include <color_fragment>
   float panelTone=smoothstep(-3.9,-3.84,airframePoint.z)*(1.-smoothstep(.75,.81,airframePoint.z));
   diffuseColor.rgb*=1.-panelTone*.045;
   float leadingZ=abs(airframePoint.x)<2.?1.72131*abs(airframePoint.x)-8.14262:.91150*abs(airframePoint.x)-6.523;
   float edgeBand=(1.-smoothstep(.035,.10,abs(airframePoint.z-leadingZ)))*smoothstep(1.8,2.2,abs(airframePoint.x));
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.18,edgeBand);
  `);
 };
 material.customProgramCacheKey=()=> 'emberwing-composite-v1';
}
function airframeMesh(geometry,material,name){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=material.isMeshStandardMaterial===true;m.receiveShadow=material.isMeshStandardMaterial===true;ship.add(m);return m;}
// Eight-point sections carry a crisp chine from the needle nose into the wing roots.
function airframeLoft(stations,material,name){
  const v=[],idx=[];
  for(const [z,w,top,bottom] of stations){
    for(const [x,y] of [[0,top],[w*.58,top*.83],[w,top*.14],[w*.88,bottom*.68],[0,bottom],[-w*.88,bottom*.68],[-w,top*.14],[-w*.58,top*.83]])v.push(x,y,z);
  }
  for(let j=0;j<stations.length-1;j++)for(let i=0;i<8;i++){const a=j*8+i,b=j*8+(i+1)%8,c=a+8,d=b+8;idx.push(a,c,b,b,c,d);}
  for(let i=1;i<7;i++){idx.push(0,i,i+1);const b=(stations.length-1)*8;idx.push(b,b+i+1,b+i);}
  const g=new THREE.BufferGeometry();
  if(material===prototypeHull){
    // Separate the longitudinal panels at the chines while smoothing along the nose.
    const panels=[],faces=[];
    for(let side=0;side<8;side++){const base=panels.length/3;for(let j=0;j<stations.length;j++)for(const k of [side,(side+1)%8])panels.push(...v.slice((j*8+k)*3,(j*8+k)*3+3));for(let j=0;j<stations.length-1;j++){const a=base+j*2;faces.push(a,a+2,a+1,a+1,a+2,a+3);}}
    // Keep both ends closed with independent normals.
    for(const end of [0,stations.length-1]){const base=panels.length/3;panels.push(...v.slice(end*24,end*24+24));for(let i=1;i<7;i++)faces.push(...(end?[base,base+i+1,base+i]:[base,base+i,base+i+1]));}
    g.setAttribute('position',new THREE.Float32BufferAttribute(panels,3));g.setIndex(faces);
  }else{g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);}
  g.computeVertexNormals();return airframeMesh(g,material,name);
}
airframeLoft([[-10.8,.025,.015,-.015],[-8.5,.46,.16,-.13],[-6.4,.92,.36,-.29],[-4.4,1.42,.65,-.43],[-2,2.08,.78,-.48],[.6,2.48,.64,-.44],[2.8,2.22,.42,-.29],[4.5,1.84,.17,-.16]],prototypeHull,'Blended chine fuselage');
// Closed, tapered lifting surfaces: broad planes with thin intentional edges.
function airframeSurface(points,thickness,material,name){
 const v=[],idx=[],n=points.length;
 for(const side of [-1,1])for(let i=0;i<n;i++){const p=points[i];v.push(p[0],p[1]+side*thickness[i]/2,p[2]);}
 const outline=points.map(p=>new THREE.Vector2(p[0],p[2]));
 for(const t of THREE.ShapeUtils.triangulateShape(outline,[])){const [a,b,c]=t.map(i=>points[i]);if((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])<0)t.reverse();idx.push(...[...t].reverse(),...t.map(i=>i+n));}
 const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%n];return sum+p[0]*q[2]-q[0]*p[2];},0);
 for(let i=0;i<n;i++){const j=(i+1)%n,wall=[i,i+n,j,j,i+n,j+n];if(area<0)wall.reverse();idx.push(...wall);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);const crisp=g.toNonIndexed();g.dispose();crisp.computeVertexNormals();
 // Average only faces on the same skin; never round the knife edges into the underside.
 const pos=crisp.attributes.position,norm=crisp.attributes.normal,skinVertices=new Map();
 const skinCount=THREE.ShapeUtils.triangulateShape(outline,[]).length*6;
 for(let i=0;i<skinCount;i++){const key=[pos.getX(i),pos.getY(i),pos.getZ(i),norm.getY(i)>0?1:-1].join(',');if(!skinVertices.has(key))skinVertices.set(key,[]);skinVertices.get(key).push(i);}
 for(const ids of skinVertices.values()){const avg=new THREE.Vector3();for(const i of ids)avg.add(new THREE.Vector3().fromBufferAttribute(norm,i));avg.normalize();for(const i of ids)norm.setXYZ(i,avg.x,avg.y,avg.z);}
 crisp.computeBoundingSphere();return airframeMesh(crisp,material,name);
}
function hingeSurface(mesh,start,end,side,kind){
 const pivot=new THREE.Group();pivot.name=kind+' hinge';pivot.position.copy(start);
 ship.remove(mesh);mesh.position.sub(start);pivot.add(mesh);ship.add(pivot);
 const axis=end.clone().sub(start).normalize();if(axis.x<0)axis.negate();
 airframeControls.push({pivot,axis,side,kind,angle:0});
}
for(const s of [-1,1]){
 // Cut the elevon out of the wing: moving surfaces have real clearance, not an overlay.
 airframeSurface([[s*.78,.16,-6.8],[s*2.0,.15,-4.7],[s*7.65,-.08,.45],[s*7.25,-.05,1.28],[s*6.88,-.031,1.456],[s*6.88,.005,.955],[s*2.975,.22,2.675],[s*2.975,.17,3.30],[s*1.18,.3,2.5]], [.15,.35,.035,.035,.045,.045,.10,.21,.42],prototypeWing,'Swept diamond wing');
 const elevon=airframeSurface([[s*3.025,.22,2.72],[s*6.85,.005,.995],[s*6.85,-.03,1.47],[s*3.025,.17,3.288]],[.095,.04,.035,.075],prototypeControl,'Flush elevon');
 hingeSurface(elevon,new THREE.Vector3(s*3.025,.22,2.72),new THREE.Vector3(s*6.85,.005,.995),s,'elevon');
 const tail=airframeSurface([[s*1.62,.38,.4],[s*3.05,1.75,2.55],[s*3.18,1.77,3.3],[s*2.05,.3,4.48]],[.14,.055,.035,.13],prototypeWing,'Canted ruddervator');
 hingeSurface(tail,new THREE.Vector3(s*1.835,.34,2.44),new THREE.Vector3(s*3.115,1.76,2.925),s,'tail');
 // A recessed dark inlet blends beneath each shoulder, without external pods.
 airframeLoft([[-3.45,.42,.24,-.24],[-2.85,.55,.31,-.32],[1.7,.6,.31,-.3],[4.1,.5,.22,-.22]],prototypeHot,'Engine channel').position.set(s*1.48,-.2,0);
 const nozzle=airframeMesh(new THREE.CylinderGeometry(.47,.53,.7,12,1,true),prototypeHot,'Titanium nozzle');nozzle.rotation.x=Math.PI/2;nozzle.position.set(s*1.48,-.17,4.22);nozzle.scale.z=.7;
 const rim=airframeMesh(new THREE.TorusGeometry(.455,.035,4,16),prototypeEdge,'Nozzle lip');rim.position.set(s*1.48,-.17,4.58);rim.scale.y=.7;
 const recess=airframeMesh(new THREE.CircleGeometry(.425,20),new THREE.MeshBasicMaterial({color:0x090c0e}),'Dark exhaust throat');recess.position.set(s*1.48,-.17,4.40);recess.scale.y=.7;
 const glow=airframeMesh(new THREE.CircleGeometry(.34,20),new THREE.MeshBasicMaterial({color:0xffbd80,transparent:true,opacity:.20,blending:THREE.AdditiveBlending,depthWrite:false}),'Recessed engine heat');glow.position.set(s*1.48,-.17,4.42);glow.scale.y=.7;ship.userData.engines.push(glow);
 const pg=new THREE.ConeGeometry(.32,2.5,16,1,true);pg.rotateX(Math.PI/2);pg.translate(0,0,1.25);
 const plume=airframeMesh(pg,new THREE.MeshBasicMaterial({color:0xffc58d,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}),'Tapered exhaust');plume.position.set(s*1.48,-.17,4.6);ship.userData.plumes.push(plume);
 const barrel=airframeMesh(new THREE.CylinderGeometry(.10,.14,1.05,10),prototypeHot,'Recessed cannon');barrel.rotation.x=Math.PI/2;barrel.position.set(s*4.8,-.13,-1.975);
}
const cockpit=airframeLoft([[-6.7,.025,.39,.31],[-5.55,.46,.91,.33],[-4.25,.58,1.13,.44],[-2.9,.47,1.04,.52],[-1.75,.025,.79,.55]],prototypeGlass,'Smoked teardrop canopy');
const prototypeSpeedBase=updateSpeedFX;
updateSpeedFX=function(dt){
 prototypeSpeedBase(dt);
 const response=1-Math.exp(-Math.max(0,dt)/.115);
 for(const surface of airframeControls){
  const demand=surface.kind==='elevon'?pitchRate*.12-rollRate*surface.side*.065:pitchRate*.075-rollRate*surface.side*.025;
  const target=crashed||missionComplete?0:THREE.MathUtils.clamp(demand,-.18,.18);
  surface.angle=THREE.MathUtils.lerp(surface.angle,target,response);
  surface.pivot.quaternion.setFromAxisAngle(surface.axis,surface.angle);
 }
 for(const e of ship.userData.engines){e.scale.set(1,.7,1);e.material.opacity=.20+burner*.64;}
 for(const p of ship.userData.plumes){p.material.opacity=.21+burner*.66;p.scale.x=p.scale.y=.78+burner*.22;}
};

const resetAirframeBase=reset;
reset=function(){resetAirframeBase();for(const s of airframeControls){s.angle=0;s.pivot.quaternion.identity();}};
