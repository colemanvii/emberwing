// Player-only attitude integration. No target, lock, hostile or camera state is read here.
const flightLocalRate=new THREE.Vector3(),flightStep=new THREE.Quaternion(),flightRight=new THREE.Vector3(),flightUp=new THREE.Vector3();
updateFlight=function(dt){
 if(crashed||missionComplete||missionCompleteTimer>0)return;
 turboBurst=Math.max(0,turboBurst-dt);
 const pi=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0),ri=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0),ab=keys.KeyZ||keys.ShiftLeft||keys.ShiftRight||turboBurst>0;
 burner=THREE.MathUtils.lerp(burner,ab?1:0,1-Math.exp(-dt/(ab?.1:.2)));
 speed=THREE.MathUtils.lerp(speed,124-Math.abs(pi)*10+burner*56,1-Math.exp(-dt/.14));
 burnerUI.className=burner>.35?'on':'';
 const flicker=1+Math.sin(performance.now()*.027)*.045+Math.sin(performance.now()*.061)*.018;
 for(const e of ship.userData.engines){e.scale.setScalar(.94+burner*.34+flicker*.045);e.material.opacity=.78+burner*.2;}
 for(const p of ship.userData.plumes){p.scale.z=(1.05+burner*1.95)*flicker;p.material.opacity=.66+burner*.32;}
 pitchRate=THREE.MathUtils.lerp(pitchRate,pi*1.25,1-Math.exp(-dt/.17));
 rollRate=THREE.MathUtils.lerp(rollRate,ri*2.2,1-Math.exp(-dt/.09));
 // Integrate both local axes together: no extra pitch and no world-yaw correction during a pull.
 flightLocalRate.set(pitchRate,0,-rollRate);const angularSpeed=flightLocalRate.length();
 if(angularSpeed>1e-8){flightStep.setFromAxisAngle(flightLocalRate.multiplyScalar(1/angularSpeed),angularSpeed*dt);ship.quaternion.multiply(flightStep);}
 tmpF.set(0,0,-1).applyQuaternion(ship.quaternion).normalize();
 flightRight.set(1,0,0).applyQuaternion(ship.quaternion);flightUp.set(0,1,0).applyQuaternion(ship.quaternion);
 const horizontal=Math.hypot(tmpF.x,tmpF.z),bank=Math.atan2(-flightRight.y,flightUp.y);
 // Neutral settling only. Pulling holds the chosen bank; neither correction fights held pitch/roll.
 if(!pi&&!ri){ship.rotateZ(Math.sin(bank)*.62*horizontal*dt);ship.rotateX(-tmpF.y*.3*dt);}
 if(!pi){flightStep.setFromAxisAngle(worldUp,-(Math.sin(bank)*.55+ri*.18)*horizontal*dt);ship.quaternion.premultiply(flightStep);}
 ship.quaternion.normalize();tmpF.set(0,0,-1).applyQuaternion(ship.quaternion).normalize();
 ship.position.addScaledVector(tmpF,speed*dt);worldTravel+=speed*dt;
 const floor=terrainHeight(ship.position.x,ship.position.z)+3;if(ship.position.y<floor){ship.position.y=floor;crashNow();return;}checkObstacleCollision();
};
