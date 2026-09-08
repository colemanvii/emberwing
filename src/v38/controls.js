// One simulation for touch and keyboard. Pointer capture prevents stuck guns
// when a thumb slides off a button; cancellation and blur release every input.
const touchState={x:0,y:0,active:false};
const touchUI=document.createElement('div');touchUI.id='touchControls';
touchUI.innerHTML='<div id="stick" aria-label="Flight joystick"><span id="stickDot"></span></div><button id="touchFire" aria-label="Cannon">FIRE</button><button id="touchMissile" aria-label="Hold to lock, release to fire missile">TRACK</button><button id="touchBoost" aria-label="Afterburner">BOOST</button><button id="touchReset" aria-label="Restart">RESET</button>';
document.body.appendChild(touchUI);
const stick=document.getElementById('stick'),stickDot=document.getElementById('stickDot');let stickPointer=null;
function releaseTouch(){touchState.active=false;touchState.x=touchState.y=0;stickPointer=null;stickDot.style.transform='';for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyZ','KeyX'])keys[k]=false;if(seeker)setSeeker(false);for(const b of touchUI.querySelectorAll('button'))b.classList.remove('active');}
function moveStick(e){const r=stick.getBoundingClientRect();touchState.x=THREE.MathUtils.clamp((e.clientX-r.left-r.width/2)/45,-1,1);touchState.y=THREE.MathUtils.clamp((e.clientY-r.top-r.height/2)/45,-1,1);stickDot.style.transform=`translate(${touchState.x*35}px,${touchState.y*35}px)`;}
stick.addEventListener('pointerdown',e=>{audio();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);touchState.active=true;moveStick(e);});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)moveStick(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,()=>{touchState.active=false;touchState.x=touchState.y=0;stickPointer=null;stickDot.style.transform='';for(const k of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])keys[k]=false;});
for(const [id,code] of [['touchFire','Space'],['touchMissile','KeyX'],['touchBoost','KeyZ'],['touchReset','KeyR']]){
  const b=document.getElementById(id);let held=false;
  b.addEventListener('pointerdown',e=>{e.preventDefault();held=true;b.setPointerCapture(e.pointerId);b.classList.add('active');key({code,repeat:false,preventDefault(){}},true);});
  b.addEventListener('pointerup',()=>{if(held){held=false;key({code,repeat:false,preventDefault(){}},false);}b.classList.remove('active');});
  for(const type of ['pointercancel','lostpointercapture'])b.addEventListener(type,()=>{if(held){held=false;keys[code]=false;if(code==='KeyX'&&seeker)setSeeker(false);}b.classList.remove('active');});
}
addEventListener('blur',releaseTouch);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseTouch();});
function updateTouchFlight(){if(!touchState.active)return;keys.ArrowLeft=touchState.x<-.18;keys.ArrowRight=touchState.x>.18;keys.ArrowUp=touchState.y<-.18;keys.ArrowDown=touchState.y>.18;}
let metricsSeconds=0,metricsFrames=0,flightFps=0;
function updateFlightMetrics(dt){metricsSeconds+=dt;metricsFrames++;if(metricsSeconds>1){flightFps=metricsFrames/metricsSeconds;metricsSeconds=metricsFrames=0;}}

function updateTouchLabels(){if(!matchMedia("(pointer:coarse),(max-width:700px)").matches)return;for(const el of [coachText,coachSub])el.textContent=el.textContent.replaceAll("SPACE","FIRE").replaceAll("RELEASE X","RELEASE TRACK").replaceAll("HOLD X","HOLD TRACK").replaceAll("ARROWS","JOYSTICK");}
