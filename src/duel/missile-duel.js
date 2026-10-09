// ─────────────────────────────────────────────────────────────────────────────
// MISSILE DUEL — prototype layer appended after the canonical Level 1 sources.
// Built only into md.html. Level 1 (index.html / play.html / game.js) is untouched.
//
// One launcher, one readable missile at a time:
//   SEE the launch → READ the approach → BREAK late → it overshoots → COUNTER the launcher.
//
// The miss is physical, not a hidden dice roll. The missile flies augmented proportional
// navigation (it leads your measured acceleration). About a second from impact it commits to
// the path your current inputs would fly, computed with the real flight model. The HUD ring closes at that moment and the
// warning tone goes solid. Break after it and it cannot pull hard enough, soon enough: it
// overshoots. Break well before it and it re-aims. Break too late and you have not moved far
// enough. Terrain between you and the missile also breaks its track.
// ─────────────────────────────────────────────────────────────────────────────
const DUEL = Object.freeze({
  start: { x: -640, z: 1680, agl: 52, aimX: -560, aimZ: 200 },
  site: { x: -250, z: 0 },
  firstLaunch: 1.0, // seconds of flight before the first launch
  reload: 4.2, // seconds after a missile resolves before the next one
  exposedFor: 6.5, // counter window after a defeat
  boost: 0.32, // seconds of near-vertical boost before guidance
  speed: 455, // missile cruise speed (player cruise is 195)
  nav: 4, // proportional navigation constant
  predictTau: 0.12, // smoothing of the seeker's estimate of your acceleration (s)
  maxAccel: 1400, // lateral acceleration before commit, units/s² (the jet manages ~265)
  terminalBand: 60, // after commit, how much it may correct off the committed path (units/s²)
  autopilotLag: 0.08, // fin/autopilot response lag (s)
  commit: 1.1, // time-to-impact at which it commits to its intercept (the ring closes here)
  fuze: 9.5, // proximity fuze radius while tracking
  maskTime: 0.12, // continuous terrain masking that breaks track
  nearMiss: 120, // closest approach that earns the slow-motion near-miss beat
  counterRange: 1500,
  lockCone: 0.25, // radians off the nose that still lock the launcher (~14°)
  minLaunchRange: 650, // no point-blank shots: inside this it holds fire
  ringRate: 46, // HUD ring pixels per second of time-to-impact
});
const md = {
  active: true,
  phase: "warn",
  t: 0,
  nextLaunch: DUEL.firstLaunch,
  site: null,
  m: null,
  exposedUntil: -99,
  launches: 0,
  defeats: 0,
  hits: 0,
  bestMiss: Infinity,
  breakAt: -99,
  maneuvering: false,
  won: false,
  wonAt: 0,
  resultShown: false,
  siteHP: 3,
  lastSalvo: -1,
  radarClock: 0,
  started: false,
};
let duelFrameDt = 1 / 60;
let duelBest = (() => {
  try {
    const v = Number(localStorage.getItem("emberwingDuelBest"));
    return v > 0 ? v : Infinity;
  } catch {
    return Infinity;
  }
})();

// ── HUD ─────────────────────────────────────────────────────────────────────
const duelHud = document.createElement("div");
duelHud.id = "duelHud";
duelHud.innerHTML =
  '<div id="duelSite" hidden><i></i><span>SAM</span></div>' +
  '<div id="duelMissile" hidden><b></b><em></em></div>' +
  '<div id="duelEdge" hidden></div>' +
  '<div id="duelMsg" hidden></div>' +
  '<div id="duelResult" hidden></div>' +
  '<div id="duelHint"><p class="lead">MISSILE DUEL</p>' +
  '<p class="how desktop">WATCH THE LAUNCH · <b>BREAK HARD</b> (BANK + ↓ PULL) <b>WHEN THE RING CLOSES</b> · HOLD <b>X</b> ON THE LAUNCHER, RELEASE TO FIRE</p>' +
  '<p class="how mobile">BREAK HARD WHEN THE RING CLOSES · HOLD TRACK ON THE LAUNCHER, RELEASE TO FIRE</p>' +
  '<p class="go desktop">PRESS ANY ARROW TO FLY</p><p class="go mobile">TOUCH TO FLY</p></div>';
document.body.appendChild(duelHud);
const duelSiteUI = document.getElementById("duelSite"),
  duelSiteLabel = duelSiteUI.querySelector("span"),
  duelMissileUI = document.getElementById("duelMissile"),
  duelRingUI = duelMissileUI.querySelector("em"),
  duelEdgeUI = document.getElementById("duelEdge"),
  duelMsgUI = document.getElementById("duelMsg"),
  duelResultUI = document.getElementById("duelResult"),
  duelHintUI = document.getElementById("duelHint");
let duelMsgUntil = 0;
function duelSay(text, tone = "threat", hold = 1.6) {
  duelMsgUI.textContent = text;
  duelMsgUI.dataset.tone = tone;
  duelMsgUI.hidden = false;
  duelMsgUI.classList.remove("pop");
  void duelMsgUI.offsetWidth;
  duelMsgUI.classList.add("pop");
  duelMsgUntil = performance.now() + hold * 1000;
}
const duelProj = new THREE.Vector3();
function duelScreen(pos) {
  duelProj.copy(pos).project(camera);
  return {
    x: (duelProj.x * 0.5 + 0.5) * innerWidth,
    y: (-duelProj.y * 0.5 + 0.5) * innerHeight,
    front: duelProj.z < 1,
    on:
      duelProj.z < 1 &&
      Math.abs(duelProj.x) < 0.96 &&
      Math.abs(duelProj.y) < 0.94,
  };
}

// ── Audio ───────────────────────────────────────────────────────────────────
let duelNoise = null;
function duelNoiseBuffer() {
  if (duelNoise || !audioCtx) return duelNoise;
  duelNoise = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
  const d = duelNoise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return duelNoise;
}
// Filtered noise sweep: whoosh, roar, blast. All synthesized; no assets.
function duelSweep(f0, f1, dur, gain, q = 1.2, delay = 0, type = "bandpass") {
  if (!audioCtx || audioCtx.state !== "running") return;
  const src = audioCtx.createBufferSource(),
    filter = audioCtx.createBiquadFilter(),
    g = audioCtx.createGain(),
    t = audioCtx.currentTime + delay;
  src.buffer = duelNoiseBuffer();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f0, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + Math.min(0.05, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(audioCtx.destination);
  src.start(t);
  src.stop(t + dur + 0.05);
}
function duelTone(f0, f1, dur, gain, type = "sine", delay = 0) {
  if (!audioCtx || audioCtx.state !== "running") return;
  const o = audioCtx.createOscillator(),
    g = audioCtx.createGain(),
    t = audioCtx.currentTime + delay;
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}
const duelBlastSound = (big = 1) => {
  duelTone(70, 28, 0.7 * big, 0.12 * big, "sine");
  duelSweep(900, 60, 1.1 * big, 0.18 * big, 0.6, 0, "lowpass");
};

// ── Visual effects (pooled, run on their own clock so they keep living after a crash) ──
const duelGlowTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d"),
    grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,245,1)");
  grad.addColorStop(0.18, "rgba(255,215,150,.95)");
  grad.addColorStop(0.45, "rgba(255,110,50,.4)");
  grad.addColorStop(1, "rgba(255,80,30,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function duelGlow(color = 0xffffff, size = 6) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: duelGlowTex,
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  s.scale.setScalar(size);
  return s;
}
const duelPuffGeo = new THREE.IcosahedronGeometry(1, 1);
const duelFx = [];
function duelPuff(pos, vel, o) {
  const mat = new THREE.MeshBasicMaterial({
      color: o.color ?? 0xe8e2d6,
      transparent: true,
      opacity: o.opacity ?? 0.6,
      depthWrite: false,
      fog: o.fog ?? false,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
    mesh = new THREE.Mesh(duelPuffGeo, mat);
  mesh.position.copy(pos);
  mesh.scale.setScalar(o.size0 ?? 2);
  scene.add(mesh);
  duelFx.push({
    mesh,
    v: vel.clone(),
    life: o.life ?? 2,
    max: o.life ?? 2,
    s0: o.size0 ?? 2,
    s1: o.size1 ?? 8,
    a0: o.opacity ?? 0.6,
    drag: o.drag ?? 1.2,
    rise: o.rise ?? 4,
  });
}
function duelFlashLight(pos, intensity = 80, range = 600, life = 0.5) {
  const l = new THREE.PointLight(0xffa860, intensity, range, 1.6);
  l.position.copy(pos);
  scene.add(l);
  duelFx.push({ light: l, life, max: life, i0: intensity });
}
function duelExplosion(pos, scale = 1, ground = false) {
  duelFlashLight(pos, 140 * scale, 900 * scale, 0.7);
  for (let i = 0; i < 14 * scale; i++) {
    const v = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * (ground ? 0.9 : 0.5) - (ground ? 0 : 0.25),
      Math.random() - 0.5,
    )
      .normalize()
      .multiplyScalar((20 + Math.random() * 40) * scale);
    duelPuff(pos, v, {
      color: i % 3 ? 0xff8a3a : 0xffe2a0,
      additive: true,
      opacity: 0.95,
      size0: 3 * scale,
      size1: (14 + Math.random() * 10) * scale,
      life: 0.45 + Math.random() * 0.35,
      drag: 3,
      rise: 6,
    });
  }
  for (let i = 0; i < 12 * scale; i++) {
    const v = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * 0.8 + (ground ? 0.4 : 0),
      Math.random() - 0.5,
    )
      .normalize()
      .multiplyScalar((10 + Math.random() * 22) * scale);
    duelPuff(pos, v, {
      color: ground ? 0x6d5a48 : 0x3b3530,
      opacity: 0.75,
      fog: true,
      size0: 5 * scale,
      size1: (26 + Math.random() * 18) * scale,
      life: 2.6 + Math.random() * 1.6,
      drag: 1.1,
      rise: 9,
    });
  }
  for (let i = 0; i < 3; i++) hostileMissileBurst(pos.clone());
}
function updateDuelFx(dt) {
  for (let i = duelFx.length - 1; i >= 0; i--) {
    const f = duelFx[i];
    f.life -= dt;
    const k = Math.max(0, f.life / f.max);
    if (f.light) {
      f.light.intensity = f.i0 * k * k;
    } else {
      f.v.multiplyScalar(Math.exp(-dt * f.drag));
      f.v.y += f.rise * dt;
      f.mesh.position.addScaledVector(f.v, dt);
      f.mesh.scale.setScalar(THREE.MathUtils.lerp(f.s1, f.s0, k));
      f.mesh.material.opacity = f.a0 * Math.min(1, k * 1.6);
    }
    if (f.life <= 0) {
      if (f.light) scene.remove(f.light);
      else {
        scene.remove(f.mesh);
        f.mesh.material.dispose();
      }
      duelFx.splice(i, 1);
    }
  }
}
function clearDuelFx() {
  for (const f of duelFx) {
    if (f.light) scene.remove(f.light);
    else {
      scene.remove(f.mesh);
      f.mesh.material.dispose();
    }
  }
  duelFx.length = 0;
}

// ── The launcher ────────────────────────────────────────────────────────────
let duelBeacon = null;
function setupDuelSite() {
  clearSamNetwork();
  const x = DUEL.site.x,
    z = DUEL.site.z;
  const site = makeSamSite(
    x - launchSite.position.x,
    z - launchSite.position.z,
    0,
  );
  // Face the valley so the rack visibly points at the approach.
  site.group.rotation.y = Math.atan2(-(DUEL.start.x - x), -(DUEL.start.z - z)) + Math.PI;
  site.range = 2600;
  sam.sites = [site];
  duelBeacon = duelGlow(0xff4a2a, 16);
  duelBeacon.position.copy(site.position).addScaledVector(worldUp, 9);
  scene.add(duelBeacon);
  md.site = site;
  md.siteHP = 3;
  md.lastSalvo = -1;
}

// ── The missile ─────────────────────────────────────────────────────────────
const duelTmp = new THREE.Vector3(),
  duelTmp2 = new THREE.Vector3(),
  duelLos = new THREE.Vector3(),
  duelRel = new THREE.Vector3(),
  duelOmega = new THREE.Vector3(),
  duelAcc = new THREE.Vector3(),
  duelShipVel = new THREE.Vector3(),
  duelShipAcc = new THREE.Vector3(),
  duelAcc2 = new THREE.Vector3(),
  duelG0 = new THREE.Vector3(),
  duelG1 = new THREE.Vector3(),
  duelG2 = new THREE.Vector3(),
  duelPrevVel = new THREE.Vector3(),
  duelLastShip = new THREE.Vector3(),
  duelForward = new THREE.Vector3(),
  duelLastForward = new THREE.Vector3(0, 0, -1);
// Augmented proportional navigation toward a target at tPos/tVel/tAcc.
function duelApn(mPos, mVel, tPos, tVel, tAcc, out) {
  const los = duelG0.copy(tPos).sub(mPos),
    R2 = Math.max(1, los.lengthSq());
  const rel = duelG1.copy(tVel).sub(mVel);
  const omega = duelG2.crossVectors(los, rel).multiplyScalar(1 / R2);
  out.crossVectors(omega, mVel).multiplyScalar(DUEL.nav);
  los.normalize();
  out.addScaledVector(tAcc, DUEL.nav * 0.5).addScaledVector(los, -tAcc.dot(los) * DUEL.nav * 0.5);
  return out;
}
// Your future path if your inputs stay exactly as they are: the real updateFlight, run on a
// snapshot that is restored afterwards. Nothing is drawn and nothing can crash while it runs.
function duelGhostPath(seconds) {
  const save = {
    pos: ship.position.clone(),
    q: ship.quaternion.clone(),
    speed, burner, pitchRate, rollRate, turboBurst, worldTravel, touchPitchInput, touchRollInput,
  };
  // "Keep doing what you are doing" = hold your current bank and keep your current pull.
  const heldKeys = { ArrowLeft: keys.ArrowLeft, ArrowRight: keys.ArrowRight },
    heldTouchX = touchState.x;
  keys.ArrowLeft = keys.ArrowRight = false;
  touchState.x = 0;
  rollRate = 0;
  const path = [ship.position.clone()];
  md.simulating = true;
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    duelFlightStep(1 / 60);
    path.push(ship.position.clone());
  }
  md.simulating = false;
  Object.assign(keys, heldKeys);
  touchState.x = heldTouchX;
  ship.position.copy(save.pos);
  ship.quaternion.copy(save.q);
  ({ speed, burner, pitchRate, rollRate, turboBurst, worldTravel, touchPitchInput, touchRollInput } = save);
  return path;
}
const duelGhostOut = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), acc: new THREE.Vector3() };
function duelGhostSample(path, t) {
  const at = (u) => {
    const f = THREE.MathUtils.clamp(u * 60, 0, path.length - 1.001),
      i = Math.floor(f);
    return path[i].clone().lerp(path[i + 1], f - i);
  };
  const h = 1 / 30,
    a = at(t - h),
    b = at(t),
    c = at(t + h);
  duelGhostOut.pos.copy(b);
  duelGhostOut.vel.copy(c).sub(a).multiplyScalar(1 / (2 * h));
  duelGhostOut.acc.copy(c).add(a).addScaledVector(b, -2).multiplyScalar(1 / (h * h));
  return duelGhostOut;
}
function makeDuelMissile() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.5, 6.4, 10),
    new THREE.MeshStandardMaterial({ color: 0xe9e5da, metalness: 0.3, roughness: 0.4 }),
  );
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1.5, 10),
    new THREE.MeshBasicMaterial({ color: 0xff4a2a }),
  );
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.9;
  g.add(nose);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.4, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x8b8a84 }),
    );
    fin.position.z = 2.6;
    fin.rotation.z = (i * Math.PI) / 2;
    fin.translateY(0.8);
    g.add(fin);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 4.2, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffb066,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = 5.3;
  g.add(flame);
  const glow = duelGlow(0xfff0d0, 8);
  glow.position.z = 3.6;
  g.add(glow);
  return { group: g, flame, glow };
}
function duelLaunch() {
  const site = md.site;
  if (!site || site.disabled) return;
  const start = site.position.clone().addScaledVector(worldUp, 5);
  const parts = makeDuelMissile();
  parts.group.position.copy(start);
  duelTmp.copy(ship.position).sub(start).setY(0).normalize();
  // Shallow boost: it comes at you down the sightline from the launcher, so it stays on screen.
  const v = duelTmp.clone().addScaledVector(worldUp, 0.42).normalize().multiplyScalar(130);
  parts.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), v.clone().normalize());
  scene.add(parts.group);
  md.m = {
    ...parts,
    v,
    age: 0,
    state: "boost", // boost → track → lost → gone
    masked: 0,
    closest: Infinity,
    closestAt: 0,
    passed: false,
    trail: 0,
    beep: 0,
    lostReason: "",
    detonateAt: Infinity,
    tti: 9,
    prev: new THREE.Vector3(),
    acc: new THREE.Vector3(),
    vTrack: duelShipVel.clone(),
    aTrack: new THREE.Vector3(),
    ghost: null,
    ghostT: 0,
    committed: false,
  };
  md.launches++;
  md.phase = "missile";
  md.breakAt = -99;
  samLaunchBurst(site);
  duelFlashLight(start, 160, 1400, 0.9);
  for (let i = 0; i < 26; i++)
    duelPuff(
      start.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 4, (Math.random() - 0.5) * 8)),
      new THREE.Vector3((Math.random() - 0.5) * 40, 6 + Math.random() * 14, (Math.random() - 0.5) * 40),
      { color: 0xd9d1c3, opacity: 0.7, size0: 4, size1: 22 + Math.random() * 14, life: 3.5, drag: 1.4, rise: 3, fog: true },
    );
  // Launch: a thump you feel, then the motor roar.
  duelTone(55, 30, 0.45, 0.13, "sine");
  duelSweep(300, 2400, 0.6, 0.09, 0.8);
  duelTone(1150, 1150, 0.09, 0.05, "square", 0.05);
  duelTone(1150, 1150, 0.09, 0.05, "square", 0.2);
  flashScreen(0.12);
  if (md.launches === 1) duelSay("MISSILE LAUNCH", "threat", 1.2);
  else duelSay("LAUNCH", "threat", 0.9);
}
function duelRemoveMissile() {
  const m = md.m;
  if (!m) return;
  scene.remove(m.group);
  m.group.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  md.m = null;
}
function duelResolve(kind, detail = {}) {
  // kind: "hit" | "defeat" | "masked"
  duelRemoveMissile();
  const now = missionElapsed;
  md.nextLaunch = now + DUEL.reload;
  if (kind === "hit") {
    md.hits++;
    md.phase = "reload";
    const early = md.breakAt > 0 && detail.t - md.breakAt > 1.15;
    duelSay(
      md.breakAt < 0 ? "HIT · BREAK WHEN THE RING CLOSES" : early ? "HIT · TOO EARLY, IT CORRECTED" : "HIT · BREAK SOONER",
      "threat",
      2.2,
    );
    return;
  }
  md.defeats++;
  md.phase = "exposed";
  md.exposedUntil = now + DUEL.exposedFor;
  md.site.hotUntil = md.exposedUntil;
  md.site.stage = 2;
  md.nextLaunch = Math.max(md.nextLaunch, md.exposedUntil);
  const feet = Math.round(detail.miss * FEET_PER_UNIT);
  if (kind === "masked") duelSay("TERRAIN MASK · COUNTER NOW", "status", 2.2);
  else duelSay(`DEFEATED · ${feet} FT · COUNTER NOW`, "status", 2.2);
}

function updateDuelMissile(dt) {
  const m = md.m;
  if (!m) return;
  m.age += dt;
  const p = m.group.position;
  const prev = m.prev.copy(p);

  if (m.state === "boost") {
    const k = Math.min(1, m.age / DUEL.boost);
    // Pitch over toward the target while accelerating.
    duelTmp.copy(ship.position).sub(p).normalize();
    m.v.lerp(duelTmp.multiplyScalar(m.v.length()), 1 - Math.exp(-dt * 2.2 * k));
    m.v.setLength(THREE.MathUtils.lerp(130, DUEL.speed * 0.8, k));
    if (m.age >= DUEL.boost) m.state = "track";
  } else if (m.state === "track") {
    duelLos.copy(ship.position).sub(p);
    const R = duelLos.length();
    m.aTrack.lerp(duelShipAcc, 1 - Math.exp(-dt / DUEL.predictTau));
    // Terminal phase: about a second out it commits to where you are going if you keep doing
    // exactly what you are doing now (your real flight model, run forward with your current
    // inputs). Change nothing, or keep holding a turn you had already started, and you fly
    // into it. Change your inputs after the ring closes and you leave that path faster than
    // its narrow correction band can follow.
    if (!m.committed && m.tti <= DUEL.commit) {
      m.committed = true;
      m.ghostT = 0;
      m.ghost = duelGhostPath(Math.min(2.6, m.tti * 1.6 + 0.4));
      duelTone(1650, 1650, 0.5, 0.05, "square");
    }
    duelApn(p, m.v, ship.position, duelShipVel, m.aTrack, duelAcc);
    if (m.committed) {
      m.ghostT += dt;
      const g = duelGhostSample(m.ghost, m.ghostT);
      duelApn(p, m.v, g.pos, g.vel, g.acc, duelAcc2);
      duelTmp.copy(duelAcc).sub(duelAcc2);
      if (duelTmp.length() > DUEL.terminalBand) duelTmp.setLength(DUEL.terminalBand);
      duelAcc.copy(duelAcc2).add(duelTmp);
    }
    const vd = duelTmp2.copy(m.v).normalize();
    duelAcc.addScaledVector(vd, -duelAcc.dot(vd));
    if (duelAcc.length() > DUEL.maxAccel) duelAcc.setLength(DUEL.maxAccel);
    m.acc.lerp(duelAcc, 1 - Math.exp(-dt / DUEL.autopilotLag));
    // Terrain between missile and aircraft breaks the track.
    m.masked = lineClear(p, ship.position, 0) ? 0 : m.masked + dt;
    if (m.masked >= DUEL.maskTime) {
      m.state = "lost";
      m.lostReason = "masked";
    } else if (R < 140 && vd.angleTo(duelLos) > 1.2) {
      // You are now outside what it can turn to reach: it has overshot.
      m.state = "lost";
      m.lostReason = "break";
    } else {
      m.v.addScaledVector(m.acc, dt);
      m.v.setLength(THREE.MathUtils.lerp(m.v.length(), DUEL.speed, 1 - Math.exp(-dt * 3)));
    }
    if (m.state === "lost") {
      m.flame.material.color.setHex(0xff7a3a);
      duelTone(900, 420, 0.25, 0.05, "square");
    }
  } else {
    // Lost: ballistic, slight drop.
    m.v.y -= 22 * dt;
  }
  p.addScaledVector(m.v, dt);
  m.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), duelTmp.copy(m.v).normalize());

  // Closest approach along this step (catches high-speed passes).
  const seg = duelTmp.copy(p).sub(prev),
    len2 = Math.max(1e-6, seg.lengthSq()),
    u = THREE.MathUtils.clamp(duelLos.copy(ship.position).sub(prev).dot(seg) / len2, 0, 1),
    closest = prev.clone().addScaledVector(seg, u).distanceTo(ship.position),
    R = p.distanceTo(ship.position);
  const closing = Math.max(60, -duelRel.copy(duelShipVel).sub(m.v).dot(duelLos.copy(ship.position).sub(p).normalize()));
  m.tti = R / closing;

  if (closest < m.closest) {
    m.closest = closest;
    m.closestAt = missionElapsed;
  }
  if (m.state === "track" && closest < DUEL.fuze) {
    const at = ship.position.clone();
    duelExplosion(at.addScaledVector(m.v.clone().normalize(), -4), 1.1);
    duelBlastSound(1);
    hitKick = Math.max(hitKick, 1.4);
    flashScreen(0.5);
    killSlow = Math.max(killSlow, 0.32);
    hitPlayer(1);
    duelResolve("hit", { t: missionElapsed });
    return;
  }
  // The pass: the missile is now opening on us after its closest point.
  if (!m.passed && m.closest < 400 && R > m.closest + 6 && missionElapsed - m.closestAt > 0) {
    m.passed = true;
    if (m.state === "lost" || m.state === "track") {
      const near = m.closest < DUEL.nearMiss;
      if (near) {
        killSlow = Math.max(killSlow, 0.55);
        hitKick = Math.max(hitKick, 1.05);
        flashScreen(0.09);
        duelSweep(4200, 260, 0.75, 0.22, 2.2); // doppler whoosh
        duelTone(1700, 380, 0.5, 0.04, "sawtooth");
      } else duelSweep(2600, 420, 0.6, 0.1, 1.6);
      m.detonateAt = missionElapsed + (near ? 0.38 : 0.5);
      md.bestMiss = Math.min(md.bestMiss, m.closest);
      m.passMiss = m.closest;
    }
  }
  // Terrain impact or self-destruct after the pass.
  const ground = terrainHeight(p.x, p.z);
  if (p.y <= ground + 1.5 || missionElapsed >= m.detonateAt || m.age > 7) {
    const onGround = p.y <= ground + 1.5;
    if (onGround) p.y = ground + 2;
    const dist = p.distanceTo(ship.position);
    duelExplosion(p.clone(), onGround ? 1.5 : 1.15, onGround);
    duelBlastSound(dist < 400 ? 1 : 0.6);
    hitKick = Math.max(hitKick, dist < 250 ? 0.8 : 0.35);
    if (m.state === "track" && !onGround && !m.passed) {
      duelResolve("defeat", { miss: m.closest }); // timed out while still chasing: count as a defeat
    } else if (m.state === "track" && onGround) {
      duelResolve("masked", { miss: m.closest });
    } else if (m.lostReason === "masked") {
      duelResolve("masked", { miss: m.passMiss ?? m.closest });
    } else duelResolve("defeat", { miss: m.passMiss ?? m.closest });
    return;
  }

  // Motor, smoke, warning.
  const dist = p.distanceTo(camera.position);
  m.glow.scale.setScalar(Math.max(8, dist * 0.032) * (0.85 + Math.random() * 0.3));
  m.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
  m.trail -= dt;
  if (m.trail <= 0 && m.state !== "gone") {
    m.trail = 0.014;
    const back = p.clone().addScaledVector(duelTmp.copy(m.v).normalize(), -5);
    duelPuff(back, duelTmp.multiplyScalar(-10).add(new THREE.Vector3((Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3)), {
      color: 0xf2eee6,
      opacity: m.state === "track" ? 0.62 : 0.45,
      size0: 1.6,
      size1: 7 + Math.random() * 4,
      life: 3.2,
      drag: 0.8,
      rise: 1.5,
    });
  }
  if (m.state === "track" && !m.committed) {
    m.beep -= dt;
    if (m.beep <= 0) {
      const urgency = THREE.MathUtils.clamp(1 - m.tti / 3, 0, 1);
      duelTone(980 + urgency * 760, 980 + urgency * 760, 0.05, 0.035 + urgency * 0.03, "square");
      m.beep = THREE.MathUtils.lerp(0.32, 0.055, urgency);
    }
  }
}

// ── Director ────────────────────────────────────────────────────────────────
function updateDuel(dt) {
  if (!md.active || crashed) return;
  md.t = missionElapsed;
  // Ship velocity from motion (what the missile's seeker actually sees).
  if (dt > 0) duelShipVel.copy(ship.position).sub(duelLastShip).multiplyScalar(1 / dt);
  duelLastShip.copy(ship.position);
  if (duelShipVel.length() > 600) duelShipVel.setLength(speed);
  if (dt > 0) duelShipAcc.copy(duelShipVel).sub(duelPrevVel).multiplyScalar(1 / dt);
  if (duelShipAcc.length() > 900) duelShipAcc.setLength(900);
  duelPrevVel.copy(duelShipVel);
  // Track when a hard maneuver began (feedback only; the miss itself is physical).
  duelForward.set(0, 0, -1).applyQuaternion(ship.quaternion);
  const turnRate = duelForward.angleTo(duelLastForward) / Math.max(dt, 1e-4);
  duelLastForward.copy(duelForward);
  const hard = turnRate > 0.75;
  if (hard && !md.maneuvering && md.m?.state === "track") md.breakAt = missionElapsed;
  md.maneuvering = hard;

  const site = md.site;
  if (site && !site.disabled) {
    // Beacon: slow pulse while hunting, hard strobe when exposed.
    const exposed = missionElapsed < md.exposedUntil;
    const pulse = exposed
      ? 0.6 + 0.6 * (Math.sin(missionElapsed * 22) > 0 ? 1 : 0)
      : 0.75 + 0.25 * Math.sin(missionElapsed * 5.5);
    duelBeacon.visible = true;
    duelBeacon.scale.setScalar(Math.max(16, site.position.distanceTo(camera.position) * (exposed ? 0.04 : 0.026)) * pulse);
    // Radar warble before the first launch: you hear it before you see it.
    if (!md.launches) {
      md.radarClock -= dt;
      if (md.radarClock <= 0) {
        duelTone(620, 640, 0.07, 0.03, "square");
        md.radarClock = 0.42;
      }
    }
    if (!md.m && missionElapsed >= md.nextLaunch && !md.won) {
      const range = site.position.distanceTo(ship.position);
      if (range < 2400 && range > DUEL.minLaunchRange && samLineClear(site)) duelLaunch();
      else md.nextLaunch = missionElapsed + 0.4;
    }
  }
  updateDuelMissile(dt);
  if (md.phase === "exposed" && missionElapsed >= md.exposedUntil) md.phase = "reload";
  if (md.won && !md.resultShown && missionElapsed - md.wonAt > 1.3) showDuelResult();
}
function duelWin() {
  if (md.won) return;
  md.won = true;
  md.wonAt = missionElapsed;
  md.phase = "won";
  const t = missionElapsed;
  md.finalTime = t;
  const pos = md.site.position.clone();
  duelExplosion(pos, 2.4, true);
  setTimeout(() => duelExplosion(pos.clone().add(new THREE.Vector3(10, 4, -6)), 1.4, true), 160);
  setTimeout(() => duelExplosion(pos.clone().add(new THREE.Vector3(-8, 8, 6)), 1.2, true), 380);
  v44MakeFire(pos.clone(), 0.9, 0.8);
  duelBlastSound(1.6);
  duelTone(48, 26, 1.4, 0.16, "sine", 0.12);
  killSlow = Math.max(killSlow, 0.7);
  hitKick = Math.max(hitKick, 0.7);
  flashScreen(0.22);
  duelBeacon.visible = false;
  duelRemoveMissile();
  duelSay("LAUNCHER DESTROYED", "status", 2);
}
function showDuelResult() {
  md.resultShown = true;
  const t = md.finalTime,
    isBest = t < duelBest;
  if (isBest) {
    duelBest = t;
    try {
      localStorage.setItem("emberwingDuelBest", String(t));
    } catch {}
  }
  const miss = Number.isFinite(md.bestMiss) ? `${Math.round(md.bestMiss * FEET_PER_UNIT)} FT` : "—";
  const grade =
    md.hits === 0 && md.bestMiss < 40 ? "RAZOR" : md.hits === 0 ? "CLEAN" : md.hits === 1 ? "SCRAPED THROUGH" : "SURVIVED";
  duelResultUI.innerHTML =
    `<small>MISSILE DUEL</small><h2>${grade}</h2>` +
    `<div class="time">${formatTime(t)}</div>` +
    `<p class="${isBest ? "best new" : "best"}">${isBest ? "NEW BEST" : "BEST " + formatTime(duelBest)}</p>` +
    `<dl><div><dt>CLOSEST MISS</dt><dd>${miss}</dd></div><div><dt>MISSILES BEATEN</dt><dd>${md.defeats}/${md.launches}</dd></div><div><dt>HITS TAKEN</dt><dd>${md.hits}</dd></div></dl>` +
    `<p class="again desktop">R · AGAIN</p><button class="again mobile" id="duelAgain">AGAIN</button>`;
  duelResultUI.hidden = false;
  document.getElementById("duelAgain")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    reset();
  });
}

// ── Counterattack: the launcher is the only target; exposed means a fast lock ──
geometry = function () {
  const site = md.site;
  if (!site || site.disabled || md.won)
    return { state: 0, hard: false, d: 99999, onscreen: false };
  if (mission.selected !== "sam:0") {
    lockState = lockTimer = lastLock = 0;
    mission.selected = "sam:0";
  }
  // Lock by where the nose points, not by screen position: the chase camera looks below the
  // nose, so a launcher dead ahead of the nose sits high on screen.
  const g = projectedGeometry(site.position, DUEL.counterRange);
  if (!g.onscreen) return g;
  const bore = duelTmp
    .set(0, 0, -1)
    .applyQuaternion(ship.quaternion)
    .angleTo(duelTmp2.copy(site.position).sub(ship.position));
  g.state = bore < DUEL.lockCone ? 1 : 0;
  g.hard = bore < DUEL.lockCone * 0.6;
  return g;
};
const duelDisableSam = disableSam;
disableSam = function (site) {
  duelDisableSam(site);
  if (md.active && site === md.site) duelWin();
};
// Cannon also works on the launcher: three salvos.
const duelWeapons = updateWeapons;
updateWeapons = function (dt) {
  duelWeapons(dt);
  const site = md.site;
  if (!md.active || !site || site.disabled) return;
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    if (t.friendly === false) continue;
    const end = t.mesh.position.clone().addScaledVector(t.velocity, dt);
    if (segmentDistance(t.mesh.position, end, site.position) < 16) {
      scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
      tracers.splice(i, 1);
      if (t.salvo !== md.lastSalvo) {
        md.lastSalvo = t.salvo;
        md.siteHP--;
        spawnImpactFX(site.position.clone(), false);
        if (md.siteHP <= 0) disableSam(site);
      }
    }
  }
};

// ── Replace the Level 1 mission and SAM network for this prototype ──────────
updateSamNetwork = function () {};
updateMission = function () {};
// The ship still flies through the original updateFlight; only terrain contact changes:
// a shallow touch is a scrape that costs hull, a steep impact is still fatal.
const duelCrash = crashNow;
crashNow = function (reason) {
  if (md.simulating) return;
  if (md.active && !reason && !crashed) {
    const floor = terrainHeight(ship.position.x, ship.position.z) + 3;
    const f = duelForward.set(0, 0, -1).applyQuaternion(ship.quaternion);
    const intoTerrain = ship.position.y <= floor + 0.05;
    if (intoTerrain && f.y > -0.5) {
      ship.position.y = floor + 5;
      const right = duelTmp.set(1, 0, 0).applyQuaternion(ship.quaternion);
      const lift = Math.asin(0.16) - Math.asin(THREE.MathUtils.clamp(f.y, -1, 1));
      if (lift > 0) ship.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(right, lift)).normalize();
      pitchRate = Math.max(0, pitchRate);
      speed *= 0.86;
      for (let i = 0; i < 10; i++)
        duelPuff(
          ship.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, -3, (Math.random() - 0.5) * 6)),
          new THREE.Vector3((Math.random() - 0.5) * 30, 8 + Math.random() * 10, (Math.random() - 0.5) * 30),
          { color: 0x8a7258, opacity: 0.7, size0: 3, size1: 16, life: 1.6, fog: true },
        );
      hostileMissileBurst(ship.position.clone().addScaledVector(worldUp, -2));
      duelSweep(500, 90, 0.45, 0.16, 0.7, 0, "lowpass");
      if (playerInvuln <= 0) {
        hitPlayer(1);
        if (!crashed) duelSay("TERRAIN · PULL UP", "threat", 1.1);
      } else hitKick = Math.max(hitKick, 0.6);
      return;
    }
  }
  if (crashed) return;
  // Fatal: give it a real explosion and let the sound ring before the silence.
  duelExplosion(ship.position.clone(), 1.6, !reason);
  duelBlastSound(1.4);
  duelRemoveMissile();
  duelCrash(reason);
  ship.visible = false;
  if (audioCtx) {
    audioCtx.resume();
    setTimeout(() => crashed && audioCtx.suspend(), 1400);
  }
  crashUI.innerHTML = `${reason === "SHOT DOWN" ? "SHOT DOWN" : "IMPACT"}<small>R · AGAIN</small>`;
};

// ── Start, restart ──────────────────────────────────────────────────────────
const duelBaseReset = reset;
reset = function () {
  duelRemoveMissile();
  clearDuelFx();
  if (duelBeacon) {
    scene.remove(duelBeacon);
    duelBeacon = null;
  }
  duelBaseReset();
  ship.visible = true;
  enemyAlive = false;
  enemy.visible = false;
  Object.assign(mission, { bandit: true, escapeBandit: true, introUntil: 0 });
  briefing.hidden = true;
  setupDuelSite();
  const s = DUEL.start;
  const y = terrainHeight(s.x, s.z) + s.agl,
    aimY = terrainHeight(s.aimX, s.aimZ) + s.agl;
  ship.position.set(s.x, y, s.z);
  const fwd = new THREE.Vector3(s.aimX - s.x, aimY - y, s.aimZ - s.z).normalize();
  ship.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), fwd);
  speed = CRUISE_SPEED;
  duelLastShip.copy(ship.position);
  duelLastForward.copy(fwd);
  duelShipVel.copy(fwd).multiplyScalar(speed);
  duelPrevVel.copy(duelShipVel);
  duelShipAcc.set(0, 0, 0);
  rebuildTerrain(0, Math.round(s.z / 620) * 620);
  positionDistantRidges(0, Math.round(s.z / 620) * 620);
  for (const m of scenery) place(m, true, false);
  clearSpawnCorridor();
  camera.position.copy(ship.position).addScaledVector(fwd, -16).addScaledVector(worldUp, 6.4);
  resetCameraFrame();
  camera.lookAt(look.copy(ship.position).addScaledVector(fwd, 42).addScaledVector(worldUp, -10));
  viewRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  Object.assign(md, {
    phase: "warn",
    nextLaunch: DUEL.firstLaunch,
    exposedUntil: -99,
    launches: 0,
    defeats: 0,
    hits: 0,
    bestMiss: Infinity,
    breakAt: -99,
    maneuvering: false,
    won: false,
    resultShown: false,
    radarClock: 0,
  });
  duelResultUI.hidden = true;
  duelMsgUI.hidden = true;
  updateWorld();
  for (let i = 0; i < 40; i++) updateCamera(1 / 60);
  renderer.render(scene, camera);
  updateDuelHud();
  // A restart is a key press, so audio is allowed: fly immediately.
  if (md.started) {
    audio();
    clock.getDelta();
  }
};

// First load only: hold on the live frame until the first flight input (browsers need a
// gesture before audio can play, and the launch is a sound as much as a sight).
firstFlightReleased = false;
function duelRelease() {
  if (md.started) return;
  md.started = true;
  firstFlightReleased = true;
  duelHintUI.classList.add("gone");
  audio();
  clock.getDelta();
  renderer.domElement.focus();
}
addEventListener(
  "keydown",
  (e) => {
    if (!md.started && /^Arrow|^Shift|^Space|^Enter|^KeyX|^KeyZ/.test(e.code)) duelRelease();
    if (md.resultShown && (e.code === "Enter" || e.code === "Space") && !e.repeat) {
      e.preventDefault();
      reset();
    }
  },
  { capture: true },
);
addEventListener("pointerdown", () => !md.started && duelRelease(), { capture: true });

// ── Per-frame hooks ─────────────────────────────────────────────────────────
const duelInstruments = updateInstruments;
updateInstruments = function () {
  duelInstruments();
  updateDuel(duelFrameDt);
  updateDuelHud();
};
const duelFlightStep = updateFlight;
updateFlight = function (dt) {
  duelFrameDt = dt;
  duelFlightStep(dt);
};
function updateDuelHud() {
  const site = md.site;
  // Launcher bracket: always findable, loud when exposed.
  if (site && !site.disabled && !md.won) {
    const s = duelScreen(site.position);
    duelSiteUI.hidden = !s.on;
    if (s.on) {
      duelSiteUI.style.transform = `translate(${s.x}px,${s.y}px)`;
      const exposed = missionElapsed < md.exposedUntil;
      duelSiteUI.dataset.state = exposed ? (lockState === 2 ? "lock" : "exposed") : lockState === 2 ? "lock" : "idle";
      duelSiteLabel.textContent = lockState === 2 ? "RELEASE" : exposed ? (seeker ? "LOCKING" : "EXPOSED · HOLD X") : "SAM";
    }
  } else duelSiteUI.hidden = true;
  // Missile: diamond + closing ring, or an edge arrow when it's off-screen.
  const m = md.m;
  if (m && m.state !== "gone") {
    const s = duelScreen(m.group.position);
    if (s.on) {
      duelMissileUI.hidden = false;
      duelEdgeUI.hidden = true;
      duelMissileUI.style.transform = `translate(${s.x}px,${s.y}px)`;
      duelMissileUI.dataset.state = m.state;
      const r = m.state === "track" ? 13 + Math.max(0, m.tti - DUEL.commit) * DUEL.ringRate : 0;
      duelRingUI.style.width = duelRingUI.style.height = r * 2 + "px";
      duelRingUI.dataset.break = m.committed ? "true" : "false";
    } else {
      duelMissileUI.hidden = true;
      if (m.state === "track") {
        // Clamp the direction to the screen edge.
        let dx = s.x - innerWidth / 2,
          dy = s.y - innerHeight / 2;
        if (!s.front) {
          dx = -dx;
          dy = -dy;
        }
        const k = Math.min((innerWidth / 2 - 34) / Math.max(1, Math.abs(dx)), (innerHeight / 2 - 34) / Math.max(1, Math.abs(dy)));
        duelEdgeUI.hidden = false;
        duelEdgeUI.style.transform = `translate(${innerWidth / 2 + dx * k}px,${innerHeight / 2 + dy * k}px) rotate(${Math.atan2(dy, dx)}rad)`;
      } else duelEdgeUI.hidden = true;
    }
  } else {
    duelMissileUI.hidden = true;
    duelEdgeUI.hidden = true;
  }
  if (!duelMsgUI.hidden && performance.now() > duelMsgUntil) duelMsgUI.hidden = true;
}
// Effects keep animating even when the simulation stops (crash), on a real-time clock.
let duelFxLast = performance.now();
(function duelFxLoop() {
  requestAnimationFrame(duelFxLoop);
  const now = performance.now(),
    dt = Math.min(0.05, (now - duelFxLast) / 1000);
  duelFxLast = now;
  updateDuelFx(dt * (killSlow > 0 ? 0.42 : 1));
})();

// Level 1's own startup already ran its reset; replace that state with the md opening.
reset();
