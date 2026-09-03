from pathlib import Path
import re

p=Path('index.html')
s=p.read_text()

def replace_once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s.replace(old,new,1)

def sub_once(pattern,repl,label):
    global s
    s2,n=re.subn(pattern,repl,s,count=1,flags=re.S)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, found {n}')
    s=s2

replace_once(
    "playerHP=3,playerInvuln=0,hostileNearCooldown=0;const keys={},tracers=[],combatFX=[];",
    "playerHP=3,playerInvuln=0,hostileNearCooldown=0,guideX=innerWidth*.5,guideY=innerHeight*.42,guideSide=1;const keys={},tracers=[],combatFX=[];",
    'guidance state')

new_flight="""function updateFlight(dt){if(crashed||missionComplete||missionCompleteTimer>0)return;turboBurst=Math.max(0,turboBurst-dt);const pi=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0),ri=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0),ab=keys.ShiftLeft||keys.ShiftRight||turboBurst>0,range=enemyAlive?enemy.position.distanceTo(ship.position):999,closeFactor=enemyAlive?THREE.MathUtils.clamp((range-42)/115,.18,1):1;burner=THREE.MathUtils.lerp(burner,ab?1:0,1-Math.exp(-dt/(ab?.1:.2)));speed=THREE.MathUtils.lerp(speed,124+burner*56*closeFactor,1-Math.exp(-dt/.14));burnerUI.className=burner>.35?'on':'';const engineFlicker=1+Math.sin(performance.now()*.027)*.045+Math.sin(performance.now()*.061)*.018;for(const e of ship.userData.engines){e.scale.setScalar(.94+burner*.34+engineFlicker*.045);e.material.opacity=.78+burner*.2;e.material.color.setRGB(1,.47+burner*.14,.16+burner*.05)}for(const p of ship.userData.plumes){p.scale.z=(1.05+burner*1.95)*engineFlicker;p.material.opacity=.66+burner*.32}pitchRate=THREE.MathUtils.lerp(pitchRate,pi*1.08,1-Math.exp(-dt/.17));rollRate=THREE.MathUtils.lerp(rollRate,ri*2.2,1-Math.exp(-dt/.09));ship.rotateX(pitchRate*dt);ship.rotateZ(-rollRate*dt);tmpF.set(0,0,-1).applyQuaternion(ship.quaternion).normalize();const up=worldUp.clone().applyQuaternion(ship.quaternion),bank=Math.atan2(up.x,up.y),combatPull=Math.abs(pi)*THREE.MathUtils.smoothstep(Math.abs(bank),.46,.98),turnAssist=(bank*.72+ri*.18)*(1+combatPull*.3);if(combatPull>.001)ship.rotateX(pitchRate*dt*combatPull*.14);if(!ri)ship.rotateZ(bank*.62*dt);if(!pi)ship.rotateX(-tmpF.y*.3*dt);ship.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(worldUp,-turnAssist*dt));tmpF.set(0,0,-1).applyQuaternion(ship.quaternion).normalize();ship.position.addScaledVector(tmpF,speed*dt);worldTravel+=speed*dt;const floor=terrainHeight(ship.position.x,ship.position.z)+3;if(ship.position.y<floor){ship.position.y=floor;crashNow();return}checkObstacleCollision()}"""
sub_once(r"function updateFlight\(dt\)\{.*?\}\nfunction steerAroundObstacles",new_flight+"\nfunction steerAroundObstacles",'high-G flight')

replace_once(
    "turnRate=baseTurn+(enemyCounter>0?(role==='ACE'?1.35:.9):0);",
    "turnRate=baseTurn+(enemyCounter>0?(role==='ACE'?1.08:.68):0);",
    'counter turn ceiling')

new_guidance="""function updateGuidance(){if(!enemyAlive){targetUI.style.opacity='0';return}const local=enemy.position.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert()),front=local.z<0,p=enemy.position.clone().project(camera),ons=front&&Math.abs(p.x)<.86&&Math.abs(p.y)<.76,margin=62;let x,y;if(ons){x=(p.x*.5+.5)*innerWidth;y=(-p.y*.5+.5)*innerHeight;if(Math.abs(local.x)>.25)guideSide=Math.sign(local.x)}else{if(Math.abs(local.x)>.4)guideSide=Math.sign(local.x);const az=Math.atan2(local.x,-local.z),flat=Math.max(1,Math.hypot(local.x,local.z));let dx=Math.sin(az),dy=-THREE.MathUtils.clamp(local.y/flat,-.9,.9);if(!front&&Math.abs(dx)<.055)dx=guideSide*.055;const mag=Math.max(.001,Math.hypot(dx,dy));dx/=mag;dy/=mag;const sc=Math.min((innerWidth/2-margin)/Math.max(.001,Math.abs(dx)),(innerHeight/2-margin)/Math.max(.001,Math.abs(dy)));x=innerWidth/2+dx*sc;y=innerHeight/2+dy*sc}const follow=ons?.5:.22;guideX=THREE.MathUtils.lerp(guideX,x,follow);guideY=THREE.MathUtils.lerp(guideY,y,follow);targetUI.style.left=guideX+'px';targetUI.style.top=guideY+'px';targetUI.style.opacity=lockState===2?'1':lockState===1?'.78':'.62';const ft=Math.max(0,Math.round(displayRangeFeet/5)*5),closing=closureFps>18?` ↓ ${Math.round(closureFps)} FT/S`:closureFps<-18?` ↑ ${Math.round(-closureFps)} FT/S`:'';targetUI.dataset.range=`${ft} FT${closing}`;targetUI.className=!ons?'offscreen':lockState===2?'lock':lockState===1?'track':''}"""
sub_once(r"function updateGuidance\(\)\{.*?\}\nfunction updateWeapons",new_guidance+"\nfunction updateWeapons",'guidance smoothing')

# Recenter guidance memory at mission boundaries.
replace_once(
    "enemyAttackState=enemyAttackTimer=enemyBurstClock=enemyBurstShots=enemyTailTimer=enemyCounter=0;dangerCooldown=0;",
    "enemyAttackState=enemyAttackTimer=enemyBurstClock=enemyBurstShots=enemyTailTimer=enemyCounter=0;guideX=innerWidth*.5;guideY=innerHeight*.42;guideSide=1;dangerCooldown=0;",
    'alpine guidance reset')
replace_once(
    "enemyAttackState=enemyAttackTimer=enemyBurstClock=enemyBurstShots=enemyTailTimer=enemyCounter=0;setWorldTheme(false);",
    "enemyAttackState=enemyAttackTimer=enemyBurstClock=enemyBurstShots=enemyTailTimer=enemyCounter=0;guideX=innerWidth*.5;guideY=innerHeight*.42;guideSide=1;setWorldTheme(false);",
    'reset guidance reset')

p.write_text(s)
