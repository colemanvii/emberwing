// Transport the camera right vector through vertical flight. Never interpolate
// wrapped Euler angles: +PI and -PI are the same attitude, not a full turn apart.
const viewRight=new THREE.Vector3(1,0,0),viewForward=new THREE.Vector3(),viewUp=new THREE.Vector3(),
  horizonRight=new THREE.Vector3(),viewMatrix=new THREE.Matrix4(),viewRotation=new THREE.Quaternion(),
  shipUpCamera=new THREE.Vector3(),camSegment=new THREE.Vector3();
function updateCamera(dt){
  gunKick*=Math.exp(-dt/.065);hitKick*=Math.exp(-dt/.075);
  camF.set(0,0,-1).applyQuaternion(ship.quaternion).normalize();
  shipUpCamera.copy(worldUp).applyQuaternion(ship.quaternion);
  const cameraShipRight=new THREE.Vector3(1,0,0).applyQuaternion(ship.quaternion);
  const bank=Math.atan2(-cameraShipRight.y,shipUpCamera.y),pi=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0),
    pull=Math.abs(pi)*THREE.MathUtils.smoothstep(Math.abs(bank),.26,.78),
    alt=Math.max(0,ship.position.y-terrainHeight(ship.position.x,ship.position.z)),
    velocity=THREE.MathUtils.clamp((speed-124)/56,0,1),a=1-Math.exp(-dt/.075);
  speedFXClock+=dt*(2+velocity*8);
  camBank=THREE.MathUtils.lerp(camBank,Math.sin(bank)*.055,1-Math.exp(-dt/.19));
  camPos.copy(ship.position).addScaledVector(camF,-14-velocity*2.5-pull*1.5-Math.max(0,1/camera.aspect-1)*12).addScaledVector(worldUp,5.3+pull*.5);
  camera.position.lerp(camPos,a);
  // Keep the chase camera out of terrain and out of the aircraft during reversals.
  camSegment.copy(camera.position).sub(ship.position);
  if(camSegment.lengthSq()<100)camera.position.copy(ship.position).addScaledVector(camF,-12).addScaledVector(worldUp,5);
  camera.position.y=Math.max(camera.position.y,terrainHeight(camera.position.x,camera.position.z)+4);
  for(const m of collisionObjects()){
    if(!m.visible)continue;
    const r=(m.userData.collisionR||0)+3,dx=camera.position.x-m.position.x,dz=camera.position.z-m.position.z;
    if(dx*dx+dz*dz<r*r&&Math.abs(camera.position.y-m.position.y)<(m.userData.collisionH||8)+3)
      camera.position.y=m.position.y+(m.userData.collisionH||8)+4;
  }
  look.copy(ship.position).addScaledVector(camF,42+velocity*11+pull*5).addScaledVector(worldUp,-10+pull*2.4);
  viewForward.copy(look).sub(camera.position).normalize();
  viewRight.addScaledVector(viewForward,-viewRight.dot(viewForward));
  if(viewRight.lengthSq()<.001)viewRight.set(1,0,0).applyQuaternion(ship.quaternion);
  viewRight.normalize();
  horizonRight.crossVectors(viewForward,worldUp);
  if(horizonRight.lengthSq()>.002){
    horizonRight.normalize();
    const rollError=Math.atan2(camSegment.crossVectors(viewRight,horizonRight).dot(viewForward),viewRight.dot(horizonRight));
    viewRight.applyAxisAngle(viewForward,THREE.MathUtils.clamp(rollError,-dt*1.5,dt*1.5)*(1-Math.pow(Math.abs(viewForward.y),8))).normalize();
  }
  viewUp.crossVectors(viewRight,viewForward).normalize();
  viewMatrix.makeBasis(viewRight,viewUp,camSegment.copy(viewForward).negate());
  viewRotation.setFromRotationMatrix(viewMatrix);
  viewRotation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-camBank));
  camera.quaternion.slerp(viewRotation,1-Math.exp(-dt/.055));
  camera.fov=THREE.MathUtils.lerp(camera.fov,66+velocity*8.5+pull*2+THREE.MathUtils.clamp((80-alt)/80,0,1)*2.5+gunKick*.6+hitKick*.4,1-Math.exp(-dt/.18));
  camera.updateProjectionMatrix();sky.position.copy(camera.position);
}

function resetCameraFrame(){viewRight.set(1,0,0);camBank=0;camera.quaternion.identity();camera.fov=66;camera.lookAt(look.copy(ship.position).add(new THREE.Vector3(0,-10,-42)));}
const resetCameraBase=reset;reset=function(){resetCameraBase();resetCameraFrame();};
const alpineCameraBase=deployAlpine;deployAlpine=function(){alpineCameraBase();resetCameraFrame();};
const tempestCameraBase=deployTempest;deployTempest=function(){tempestCameraBase();resetCameraFrame();};
