// V58 entry portal: a single clear action and a short, tactile handoff into flight.
if(typeof missionBrief!=='undefined'&&missionBrief){
 missionBrief.innerHTML=`<main class="portalShell" aria-labelledby="portalTitle">
  <header class="portalTop">
   <div class="portalBrand"><span class="portalMark"></span>EMBERWING</div>
   <div class="portalStatus">SCENARIO READY</div>
  </header>
  <div class="portalEyebrow">OPERATION DISTANT THUNDER</div>
  <h1 class="portalTitle" id="portalTitle">Enter the valley.<br>Stop the launch.</h1>
  <p class="portalMission">Cross the ridge, stay below the radar, and destroy the hostile launch vehicle. <strong>Get out through the northern pass.</strong></p>
  <div class="portalRoute" aria-label="Mission route: South Ridge to launch site to North Pass">
   <span class="routeNode">SOUTH RIDGE</span><span class="routeLine"></span><span class="routeNode hot">LAUNCH SITE</span><span class="routeLine"></span><span class="routeNode">NORTH PASS</span>
  </div>
  <button class="portalEnter" id="briefDeploy" type="button" aria-label="Enter scenario">
   <span class="enterAction"><span class="enterGlyph">→</span>ENTER SCENARIO</span><span class="enterKey">PRESS ENTER</span>
  </button>
  <footer class="portalFoot"><span>EW-01 / CLEARED HOT</span><span>FLIGHT ARTICLE 058</span></footer>
 </main>`;
 const portalButton=missionBrief.querySelector('#briefDeploy');
 const enterPortal=()=>{
  if(!missionBriefActive||missionBrief.classList.contains('ignite'))return;
  missionBrief.classList.add('ignite');
  const status=missionBrief.querySelector('.portalStatus');
  if(status)status.textContent='LAUNCH AUTHORIZED';
  setTimeout(()=>dismissMissionBrief(),420);
 };
 portalButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();enterPortal();});
 // Replace the inherited immediate Enter behavior with the portal handoff.
 const portalKeyBase=key;
 key=function(e,down){
  if(missionBriefActive&&down&&(e.code==='Enter'||e.code==='Space')){
   e.preventDefault();enterPortal();return;
  }
  portalKeyBase(e,down);
 };
}
