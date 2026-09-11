const v56={choice:null};
function v56Gate(z){return (1-THREE.MathUtils.smoothstep(z,1180,1480))*THREE.MathUtils.smoothstep(z,-720,-420);}
function v56LeftX(z){const t=THREE.MathUtils.clamp((1120-z)/1750,0,1);return THREE.MathUtils.lerp(-360,-585,THREE.MathUtils.smoothstep(t,0,.28))+THREE.MathUtils.lerp(0,430,THREE.MathUtils.smoothstep(t,.48,1));}
function v56RightX(z){const t=THREE.MathUtils.clamp((1120-z)/1750,0,1);return THREE.MathUtils.lerp(300,430,THREE.MathUtils.smoothstep(t,0,.3))-THREE.MathUtils.lerp(0,330,THREE.MathUtils.smoothstep(t,.52,1));}
const v56TerrainBase=terrainHeight;
terrainHeight=function(x,z){
 const base=v56TerrainBase(x,z);
 if(worldIndex!==0||alpineTerrain||tempestTerrain)return base;
 const g=v56Gate(z);if(g<=.001)return base;
 const massif=315*g*Math.exp(-Math.pow((z-560)/610,4))*Math.exp(-Math.pow((x+35)/300,4));
 const lx=v56LeftX(z),rx=v56RightX(z),ld=Math.abs(x-lx),rd=Math.abs(x-rx);
 const leftCut=360*g*(1-THREE.MathUtils.smoothstep(ld,105,235));
 const rightCut=305*g*(1-THREE.MathUtils.smoothstep(rd,125,255));
 const leftFloor=68*g*(1-THREE.MathUtils.smoothstep(ld,0,165));
 const rightLift=38*g*Math.exp(-Math.pow((x-rx)/210,2))*Math.exp(-Math.pow((z-430)/620,2));
 return base+massif-leftCut-rightCut-leftFloor+rightLift;
};
v42Corridor.radar.set(500,0,-360);
v42Corridor.launch.set(80,0,-1280);
const v56ObjBase=v42MissionObjective;
v42MissionObjective=function(){if(worldIndex===0&&!v53.revealed)return v45.entryPoint;return v56ObjBase();};
const v56LabelBase=v43ObjectiveLabel;
v43ObjectiveLabel=function(){if(worldIndex===0&&!v53.revealed)return 'FORK';return v56LabelBase();};
