/* =========================================================================
   BLACK ICE — 09 game core
   Run state, player, weapons, damage, objectives, waves, audio synthesis and
   persistence. UI, input and the test contract live in 10.
   ========================================================================= */

/* ------------------------------- audio --------------------------------- */
const AUDIO = (() => {
  let ctx = null, master = null, noiseBuf = null, started = false;
  let muted = false, volume = 0.7;
  const last = {};

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
      // noise buffer for wind, impacts and gunshots
      const len = Math.floor(ctx.sampleRate * 2.4);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
      }
      ambience();
      started = true;
      return true;
    } catch (e) { return false; }
  }
  function noiseSource() {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    return s;
  }
  function burst(dur, gain, freq, type = 'lowpass', q = 1, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.03);
  }
  function tone(freq, dur, type, gain, slideTo = null, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.04);
  }
  function ambience() {
    const wind = noiseSource();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 340; f.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.035;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    wind.connect(f); f.connect(g); g.connect(master);
    wind.start(); lfo.start();
    // sub drone, two detuned voices
    for (const [fr, gn, ty] of [[46, 0.02, 'sine'], [69.2, 0.012, 'triangle']]) {
      const o = ctx.createOscillator(); o.type = ty; o.frequency.value = fr;
      const og = ctx.createGain(); og.gain.value = gn;
      const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 180;
      o.connect(of); of.connect(og); og.connect(master); o.start();
    }
  }
  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : volume;
  }
  function setVolume(v) {
    volume = clamp(v, 0, 1);
    if (master) master.gain.value = muted ? 0 : volume;
  }
  function play(name) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    if (last[name] && t - last[name] < 0.02) return;
    last[name] = t;
    switch (name) {
      case 'shot':
        burst(0.07, 0.55, 2600, 'lowpass', 0.7);
        burst(0.24, 0.18, 420, 'lowpass', 0.8);
        tone(120, 0.14, 'sine', 0.35, 45);
        break;
      case 'enemyShot':
        burst(0.12, 0.12, 1300, 'bandpass', 1.2);
        tone(180, 0.12, 'square', 0.035, 90);
        break;
      case 'hit':
        tone(1750, 0.05, 'square', 0.05, 2400);
        tone(2600, 0.04, 'sine', 0.03);
        break;
      case 'kill':
        tone(140, 0.28, 'triangle', 0.16, 60);
        burst(0.18, 0.1, 2000, 'bandpass', 1.4);
        break;
      case 'head':
        tone(2400, 0.1, 'sine', 0.07, 3200);
        break;
      case 'hurt':
        tone(74, 0.32, 'sine', 0.34, 40);
        burst(0.26, 0.2, 380, 'lowpass', 1.0);
        break;
      case 'reload':
        burst(0.035, 0.13, 3200, 'bandpass', 2.2);
        burst(0.05, 0.16, 2100, 'bandpass', 2.0, 0.24);
        break;
      case 'reloadDone':
        burst(0.04, 0.15, 3800, 'bandpass', 2.0);
        tone(520, 0.05, 'square', 0.035);
        break;
      case 'empty':
        burst(0.03, 0.18, 4200, 'bandpass', 3.0);
        break;
      case 'arc':
        tone(820, 0.35, 'sawtooth', 0.11, 90);
        burst(0.32, 0.2, 3000, 'bandpass', 0.8);
        tone(60, 0.4, 'sine', 0.16, 38);
        break;
      case 'relay':
        tone(330, 0.2, 'sine', 0.09);
        tone(440, 0.35, 'sine', 0.08, null, 0.12);
        tone(660, 0.6, 'triangle', 0.06, null, 0.26);
        break;
      case 'supply':
        tone(660, 0.08, 'square', 0.05);
        tone(880, 0.12, 'square', 0.04, null, 0.09);
        break;
      case 'boss':
        tone(52, 1.4, 'sawtooth', 0.16, 38);
        tone(78, 1.1, 'square', 0.06, 60, 0.08);
        burst(1.2, 0.08, 240, 'lowpass', 0.7);
        break;
      case 'alarm':
        tone(720, 0.16, 'square', 0.045);
        tone(520, 0.2, 'square', 0.045, null, 0.18);
        break;
      case 'step':
        burst(0.06, 0.035, 700, 'lowpass', 1.0);
        break;
      case 'switch':
        burst(0.03, 0.09, 2600, 'bandpass', 2.0);
        tone(320, 0.04, 'square', 0.025);
        break;
      case 'win':
        [330, 440, 550, 660].forEach((f, i) => tone(f, 1.2, 'sine', 0.09, null, i * 0.14));
        break;
      case 'lose':
        tone(220, 1.4, 'sine', 0.11, 70);
        tone(110, 1.6, 'triangle', 0.08, 48, 0.2);
        break;
      case 'warp':
        tone(180, 0.4, 'sine', 0.05, 480);
        burst(0.3, 0.06, 1200, 'bandpass', 1.5);
        break;
    }
  }
  return { init: ensure, play, setMuted, setVolume, get ready() { return started; }, get muted() { return muted; } };
})();

/* ----------------------------- settings -------------------------------- */
const SETTINGS = {
  sens: 1.0, vol: 70, fov: 86, invert: false, quality: 'med', muted: false
};
(function loadSettings() {
  try {
    const raw = localStorage.getItem('blackice.settings');
    if (raw) Object.assign(SETTINGS, JSON.parse(raw));
  } catch (e) {}
})();
function saveSettings() {
  try { localStorage.setItem('blackice.settings', JSON.stringify(SETTINGS)); } catch (e) {}
}
function loadBest() {
  try {
    const raw = localStorage.getItem('blackice.best');
    if (raw) { const b = JSON.parse(raw); if (b && Number.isFinite(b.score)) return b; }
  } catch (e) {}
  return null;
}
let BEST = loadBest();
function saveAll() {
  const entry = { score: G.score, kills: G.kills, time: G.runTime, date: new Date().toISOString() };
  if (!BEST || entry.score > (BEST.score || 0) || G.phase === 'won') {
    BEST = { score: entry.score, kills: entry.kills, time: entry.time, date: entry.date };
  }
  try { localStorage.setItem('blackice.best', JSON.stringify(BEST)); } catch (e) {}
  saveSettings();
  refreshBest();
}

/* ------------------------------- state --------------------------------- */
const G = {
  phase: 'menu',
  time: 0,
  runTime: 0,
  player: {
    x: SITE.spawn.x, z: SITE.spawn.z, yaw: SITE.spawn.yaw, pitch: 0,
    vx: 0, vz: 0, vy: 0, y: 0, health: 100, maxHealth: 100, regenWait: 0,
    bob: 0, speed: 0, onGround: true, alive: true, eye: 1.7
  },
  weapon: {
    mode: 'rifle', ammo: 30, mag: 30, reserve: 240, reloading: false, reloadT: 0, reloadDur: 1.75,
    fireCd: 0, ads: 0, flash: 0, recoil: 0, switchT: 0, shotCount: 0
  },
  arc: { cool: 0, max: 5.0 },
  progress: 0,
  kills: 0,
  score: 0,
  prompt: null,
  near: null,
  sub: { queue: [], cur: null, t: 0 },
  timers: [],
  boss: { active: false, spawned: false, dead: false, hp: 0, maxHp: 0 },
  damage: { flash: 0, angle: 0, t: 0 },
  hitmarker: 0, hitmarkerKill: false,
  shake: 0, recoilPitch: 0, recoilYaw: 0,
  flashLight: 0, stepT: 0,
  pointerLocked: false, ignoreLock: false,
  keys: new Set(), lifting: null,
  touch: { move: { x: 0, y: 0 }, fire: false, ads: false },
  mouseDown: false, dragging: false, lastMouse: null,
  still: null, demo: 0, frozen: false,
  ui: { settingsFromMenu: false, helpFromMenu: false },
  lastCause: '', won: false,
  bobPhase: 0,
  viewmodel: null,
  smokeT: 0,
  _cache: {}
};

/* ------------------------- viewmodel geometry -------------------------- */
const VIEWMESH = {};
function uploadViewmodels() {
  const r = buildRifleGeo(), m = buildMagGeo(), a = buildArcGeo(), ar = buildArcRingsGeo();
  VIEWMESH.rifle = GFX.upload(r.geo, false);
  VIEWMESH.mag = GFX.upload(m.geo, false);
  VIEWMESH.arc = GFX.upload(a.geo, false);
  VIEWMESH.arcRings = GFX.upload(ar.geo, false);
  VIEWMESH.rifleGeo = r; VIEWMESH.magGeo = m; VIEWMESH.arcGeo = a; VIEWMESH.arcRingsGeo = ar;
}

/* ------------------------------ helpers -------------------------------- */
function dirFromAngles(yaw, pitch) {
  const cp = Math.cos(pitch);
  return [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}
function yawPitchTo(pos, target) {
  const dx = target[0] - pos[0], dy = target[1] - pos[1], dz = target[2] - pos[2];
  const len = Math.hypot(dx, dy, dz) || 1;
  return { yaw: Math.atan2(dx, -dz), pitch: Math.asin(clamp(dy / len, -1, 1)) };
}
function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function rndRange(a, b) { return b + Math.random() * (a - b); }

/* ---------------------------- player update ---------------------------- */
function updatePlayer(dt) {
  const p = G.player;
  if (!p.alive) return;
  let ix = 0, iz = 0;
  if (G.keys.has('KeyW') || G.keys.has('ArrowUp')) iz += 1;
  if (G.keys.has('KeyS') || G.keys.has('ArrowDown')) iz -= 1;
  if (G.keys.has('KeyD') || G.keys.has('ArrowRight')) ix += 1;
  if (G.keys.has('KeyA') || G.keys.has('ArrowLeft')) ix -= 1;
  ix += G.touch.move.x; iz += -G.touch.move.y;
  const len = Math.hypot(ix, iz);
  let dx = 0, dz = 0;
  if (len > 0.01) {
    const nx = ix / Math.max(1, len), nz = iz / Math.max(1, len);
    dx = Math.sin(p.yaw) * nz + Math.cos(p.yaw) * nx;
    dz = -Math.cos(p.yaw) * nz + Math.sin(p.yaw) * nx;
    const l2 = Math.hypot(dx, dz) || 1; dx /= l2; dz /= l2;
  }
  const adsPenalty = 1 - G.weapon.ads * 0.38;
  const sprint = (G.keys.has('ShiftLeft') || G.keys.has('ShiftRight')) && !G.weapon.ads && iz > 0.1;
  const targetSpeed = (sprint ? 7.6 : 4.55) * adsPenalty;
  const accel = p.onGround ? 11 : 4;
  const k = 1 - Math.exp(-accel * dt);
  p.vx = lerp(p.vx, dx * targetSpeed, k);
  p.vz = lerp(p.vz, dz * targetSpeed, k);
  const moved = WORLD.move(p.x, p.z, p.vx * dt, p.vz * dt);
  // detect if we were blocked and kill the velocity into the wall
  if (Math.abs(moved[0] - p.x) < 0.0002) p.vx *= 0.2;
  if (Math.abs(moved[1] - p.z) < 0.0002) p.vz *= 0.2;
  p.x = moved[0]; p.z = moved[1];
  p.speed = Math.hypot(p.vx, p.vz);
  p.bob += dt * (4.4 + p.speed * 1.75);
  // jump
  if (G.jumpQueued && p.onGround) {
    p.vy = 4.35; p.onGround = false; G.jumpQueued = false;
    AUDIO.play('step');
  }
  p.vy -= 15.5 * dt;
  p.y += p.vy * dt;
  if (p.y <= 0) { if (!p.onGround) AUDIO.play('step'); p.y = 0; p.vy = 0; p.onGround = true; }
  // regen
  if (p.regenWait > 0) p.regenWait -= dt;
  else if (p.health < p.maxHealth) p.health = Math.min(p.maxHealth, p.health + 11 * dt);
  // footsteps
  if (p.onGround && p.speed > 1.2) {
    G.stepT -= dt;
    if (G.stepT <= 0) { G.stepT = sprint ? 0.31 : 0.44; AUDIO.play('step'); }
  }
  // run out check is handled by hurtPlayer
}

function cameraPose(shake = true) {
  const p = G.player;
  const bobAmp = p.onGround ? clamp(0.005 + p.speed * 0.0018, 0, 0.022) : 0.0;
  const bobY = Math.sin(p.bob * 2) * bobAmp;
  const adsDrop = G.weapon.ads * 0.03;
  const sh = G.shake;
  const shx = shake ? Math.sin(G.time * 51) * 0.012 * sh + Math.sin(G.time * 23) * 0.008 * sh : 0;
  const shy = shake ? Math.cos(G.time * 47) * 0.010 * sh : 0;
  return {
    pos: [p.x, 1.7 + p.y + bobY - adsDrop, p.z],
    yaw: p.yaw + G.recoilYaw + shx,
    pitch: clamp(p.pitch + G.recoilPitch + shy, -1.45, 1.45),
    fov: SETTINGS.fov - G.weapon.ads * 15
  };
}

/* ------------------------------ weapons -------------------------------- */
function currentSpread() {
  const w = G.weapon;
  const move = clamp(G.player.speed / 8, 0, 1);
  return (0.026 - 0.0225 * w.ads) + move * 0.016 + (Math.abs(G.recoilPitch) * 0.7);
}
function tryFire() {
  const w = G.weapon;
  if (w.mode === 'arc') { fireArc(); return; }
  if (w.fireCd > 0 || w.reloading || w.switchT > 0.08) return;
  if (w.ammo <= 0) {
    if (w.reserve > 0) startReload(); else { AUDIO.play('empty'); w.fireCd = 0.35; }
    return;
  }
  w.ammo--; w.shotCount++;
  w.fireCd = 60 / 640;
  const cam = cameraPose();
  const base = dirFromAngles(cam.yaw, cam.pitch);
  const spread = currentSpread();
  const rx = rndRange(1, -1) * spread, ry = rndRange(1, -1) * spread;
  // camera basis
  const right = [Math.cos(cam.yaw), 0, Math.sin(cam.yaw)];
  const up = [
    right[1] * base[2] - right[2] * base[1],
    right[2] * base[0] - right[0] * base[2],
    right[0] * base[1] - right[1] * base[0]
  ];
  const dir = [
    base[0] + right[0] * rx + up[0] * ry,
    base[1] + right[1] * rx + up[1] * ry,
    base[2] + right[2] * rx + up[2] * ry
  ];
  const dl = Math.hypot(...dir); dir[0] /= dl; dir[1] /= dl; dir[2] /= dl;
  const origin = [cam.pos[0], cam.pos[1], cam.pos[2]];
  const eh = ENEMIES.raycast(origin, dir, 220);
  const wh = ENEMIES.raycastWorld(origin, dir, 220);
  const endT = eh && (!wh || eh.t < wh.t) ? eh.t : (wh ? wh.t : 220);
  const muzzle = GFX.muzzleWorld();
  const end = [origin[0] + dir[0] * endT, origin[1] + dir[1] * endT, origin[2] + dir[2] * endT];
  FX.muzzle(muzzle, base);
  FX.tracer([muzzle[0], muzzle[1] - 0.02, muzzle[2]], end, true, 0.012, 0.075);
  G.flashLight = 1;
  G.weapon.flash = 1;
  G.recoilPitch += 0.011 + Math.random() * 0.004;
  G.recoilYaw += rndRange(0.006, -0.006);
  G.shake = Math.min(1, G.shake + 0.16);
  AUDIO.play('shot');
  if (eh && (!wh || eh.t < wh.t)) {
    const dealt = eh.enemy.damage(22, { head: eh.head, from: origin });
    G.hitmarker = 0.16; G.hitmarkerKill = eh.enemy.dead;
    FX.hit(eh.point, false);
    AUDIO.play(eh.head ? 'head' : 'hit');
    if (eh.enemy.dead) G.score += 0;
  } else if (wh) {
    let n = [0, 1, 0];
    if (!wh.ground) {
      const c = wh.col, p = wh.point;
      const faces = [
        [Math.abs(p[0] - c.x0), [-1, 0, 0]], [Math.abs(p[0] - c.x1), [1, 0, 0]],
        [Math.abs(p[1] - c.y0), [0, -1, 0]], [Math.abs(p[1] - c.y1), [0, 1, 0]],
        [Math.abs(p[2] - c.z0), [0, 0, -1]], [Math.abs(p[2] - c.z1), [0, 0, 1]]
      ];
      faces.sort((a, b) => a[0] - b[0]);
      n = faces[0][1];
    }
    FX.impact(wh.point, n, wh.ground || n[1] > 0.6);
  }
  if (w.ammo === 0 && w.reserve > 0) startReload();
}
function startReload() {
  const w = G.weapon;
  if (w.reloading || w.mode !== 'rifle') return;
  if (w.ammo >= w.mag || w.reserve <= 0) return;
  w.reloading = true; w.reloadT = w.reloadDur;
  AUDIO.play('reload');
}
function finishReload() {
  const w = G.weapon;
  const need = w.mag - w.ammo;
  const take = Math.min(need, w.reserve);
  w.ammo += take; w.reserve -= take;
  w.reloading = false;
  AUDIO.play('reloadDone');
}
function fireArc() {
  const a = G.arc;
  if (a.cool > 0 || G.weapon.switchT > 0.08) return;
  const cam = cameraPose();
  const f = dirFromAngles(cam.yaw, cam.pitch);
  const targets = [];
  for (const e of ENEMIES.list) {
    if (e.dead || e.spawnT > 0.2) continue;
    const ex = e.x - cam.pos[0], ey = (e.type === 'prime' ? e.y : 1.15) - cam.pos[1], ez = e.z - cam.pos[2];
    const d = Math.hypot(ex, ey, ez);
    if (d > 18) continue;
    const dot = (ex * f[0] + ey * f[1] + ez * f[2]) / (d || 1);
    if (dot < 0.55) continue;
    targets.push({ e, d, point: [e.x, e.type === 'prime' ? e.y : 1.15, e.z] });
  }
  if (!targets.length) { AUDIO.play('empty'); return; }
  targets.sort((x, y) => x.d - y.d);
  const chain = targets.slice(0, 3);
  const muzzle = GFX.muzzleWorld();
  const pts = chain.map(c => c.point);
  FX.arcBolt(muzzle, pts);
  let dmg = 62;
  for (const c of chain) {
    c.e.damage(dmg, { from: [cam.pos[0], cam.pos[1], cam.pos[2]] });
    FX.hit(c.point, true);
    dmg *= 0.72;
  }
  a.cool = a.max;
  G.shake = 0.9;
  G.recoilPitch += 0.02;
  AUDIO.play('arc');
  G.hitmarker = 0.18; G.hitmarkerKill = chain.some(c => c.e.dead);
}
function switchWeapon(mode) {
  const w = G.weapon;
  if (w.mode === mode || w.switchT > 0.2) return;
  w.mode = mode; w.switchT = 0.4; w.reloading = false;
  if (mode === 'arc') w.ads = 0;
  AUDIO.play('switch');
  if (mode === 'arc' && G.arc.cool > 0) toast('ARC 线圈充能 ' + G.arc.cool.toFixed(1) + 's');
}

/* ------------------------------ damage --------------------------------- */
const CAUSES = {
  raider: ['游走者', '座狼步枪'],
  wasp: ['胡蜂', '等离子炮'],
  heavy: ['重装守卫', '霰弹炮'],
  prime: ['典狱长', '高频齐射'],
  debug: ['高强度测试火力', '测试'],
  unknown: ['未知火力', '未知武器']
};
function hurtPlayer(amount, source, fromPos) {
  const p = G.player;
  if (!p.alive || G.phase !== 'playing') return;
  if (G.godMode) return;
  p.health = Math.max(0, p.health - amount);
  p.regenWait = 7.0;
  G.damage.flash = 1; G.damage.t = 0.9;
  G.shake = Math.min(1.2, G.shake + 0.5);
  AUDIO.play('hurt');
  // direction of the hit relative to the view
  let sx = fromPos ? fromPos[0] : null, sz = fromPos ? fromPos[2] : null;
  if (sx === null && source && Number.isFinite(source.x)) { sx = source.x; sz = source.z; }
  if (sx !== null) {
    const bearing = Math.atan2(sx - p.x, -(sz - p.z));
    G.damage.angle = ((bearing - p.yaw + PI * 3) % TAU) - PI;
  }
  if (p.health <= 0) {
    p.alive = false;
    const src = source && source.type ? source.type : (source && source.role) || 'unknown';
    const c = CAUSES[src] || CAUSES.unknown;
    G.lastCause = `你被 ${c[0]} 的 ${c[1]} 击倒。`;
    endRun(false, G.lastCause);
  }
}
function updateDamage(dt) {
  G.damage.flash = Math.max(0, G.damage.flash - dt * 3.2);
  G.damage.t = Math.max(0, G.damage.t - dt);
  G.shake = Math.max(0, G.shake - dt * 2.2);
  G.recoilPitch *= Math.exp(-dt * 7.0);
  G.recoilYaw *= Math.exp(-dt * 6.0);
  G.flashLight = Math.max(0, G.flashLight - dt * 14);
  G.weapon.flash = Math.max(0, G.weapon.flash - dt * 16);
  G.hitmarker = Math.max(0, G.hitmarker - dt);
  G.weapon.recoil *= Math.exp(-dt * 8);
}

/* ---------------------------- interaction ------------------------------- */
function nearestInteract() {
  const p = G.player;
  let best = null;
  for (const r of WORLD.relays) {
    if (r.on) continue;
    const d = Math.hypot(p.x - r.x, p.z - r.z);
    if (d <= SITE.promptRadius) {
      if (!best || d < best.d) best = { type: 'relay', id: r.id, label: r.label, d, relay: r, text: '接通 ' + r.label + ' 中继' };
    }
  }
  for (const s of WORLD.supplies) {
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    if (d <= 2.8 && s.cooldown <= 0) {
      if (!best || d < best.d) best = { type: 'supply', id: s.id, label: 'SUPPLY', d, supply: s, text: '开启补给箱' };
    }
  }
  return best;
}
function interact() {
  if (G.phase !== 'playing') return null;
  const t = nearestInteract();
  if (!t) return null;
  if (t.type === 'relay') activateRelay(t.relay);
  else useSupply(t.supply);
  return t;
}
function activateRelay(r) {
  if (r.on) return;
  r.on = true;
  r.beacon.visible = true;
  G.progress++;
  G.score += 300;
  const bp = [r.x, 2.14, r.z];
  FX.warp(bp);
  FX.explosion([r.x, 1.0, r.z], 0.4);
  AUDIO.play('relay');
  toast(r.label + ' 中继上线 · ' + G.progress + ' / 3');
  if (r.label === 'ALPHA') {
    say('调度', 'ALPHA 上线。阵列醒了——它们也醒了。', 3.8);
    queueSpawns(['raider', 'raider', 'wasp', 'raider', 'wasp'], 0.7);
  } else if (r.label === 'BRAVO') {
    say('调度', 'BRAVO 上线。西侧有重装单位正在接近。', 4.0);
    queueSpawns(['raider', 'raider', 'wasp', 'heavy', 'raider', 'wasp'], 0.65);
  } else {
    say('调度', 'CHARLIE 上线……信号在爬升。撑住，主控核心被惊动了。', 4.4);
    queueSpawns(['raider', 'wasp', 'raider'], 0.7);
    G.timers.push({ at: G.runTime + 3.4, fn: spawnBoss });
  }
  if (G.progress === 3) {
    say('系统', '三座中继全部在线。上行链路建立中——', 4.1);
  }
  updateHud();
}
function useSupply(s) {
  if (s.cooldown > 0) { say('调度', '补给箱还在冷却。', 2); return; }
  s.cooldown = 45;
  const w = G.weapon;
  w.reserve = Math.min(300, w.reserve + 120);
  G.player.health = Math.min(G.player.maxHealth, G.player.health + 38);
  AUDIO.play('supply');
  toast('补给已装填 · 生命 +38 · 备弹 +120');
  FX.warp([s.x, 1.0, s.z]);
  updateHud();
}

/* ------------------------------ waves ---------------------------------- */
function pickupSpawnPoint() {
  const p = G.player;
  const cands = WORLD.enemySpawns.map(([x, z]) => ({ x, z, d: Math.hypot(x - p.x, z - p.z) }))
    .filter(s => s.d > 10);
  if (!cands.length) return WORLD.enemySpawns[0] || [0, 0];
  cands.sort((a, b) => b.d - a.d);
  const pickFrom = cands.slice(0, Math.max(1, Math.ceil(cands.length * 0.5)));
  const c = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  return [c.x, c.z];
}
function spawnEnemy(type) {
  if (G.phase !== 'playing') return;
  const alive = ENEMIES.aliveCount();
  const cap = G.boss.active ? 9 : 8;
  if (alive >= cap) return;
  const [x, z] = pickupSpawnPoint();
  ENEMIES.spawn(type, x, z);
  AUDIO.play('warp');
}
function queueSpawns(types, gap) {
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    G.timers.push({ at: G.runTime + 0.7 + i * gap, fn: () => spawnEnemy(type) });
  }
}
function spawnBoss() {
  if (G.boss.spawned || G.phase !== 'playing') return;
  G.boss.active = true; G.boss.spawned = true; G.boss.dead = false;
  // a safe clearing just west of the comms mast
  let bx = 2.5, bz = -19.5;
  for (const [x, z] of [[2.5, -19.5], [5, -18], [-1, -20], [7, -21]]) {
    if (!WORLD.collides(x, z)) { bx = x; bz = z; break; }
  }
  const e = ENEMIES.spawn('prime', bx, bz);
  if (e) { G.boss.hp = e.hp; G.boss.maxHp = e.maxHp; }
  say('系统', '检测到主控核心——「典狱长」已上线。它不会让我们把信号发出去。', 5.2);
  AUDIO.play('boss');
  toast('典狱长已上线');
  queueSpawns(['wasp', 'raider'], 1.4);
  updateHud();
}
function updateBossState() {
  const b = ENEMIES.boss();
  if (b) {
    G.boss.hp = Math.max(0, b.hp);
    G.boss.maxHp = b.maxHp;
  } else if (G.boss.active && !G.boss.dead && G.boss.spawned) {
    G.boss.dead = true;
    G.boss.hp = 0;
    G.godMode = true;
    G.timers.length = 0;
    G.timers.push({ at: G.runTime + 3.4, fn: () => endRun(true) });
    say('调度', '核心熄火了。信号出去了——冰槎，接住我们。', 5.0);
    AUDIO.play('win');
    toast('典狱长已摧毁 · 信号发射中');
  }
}

/* ----------------------------- run state ------------------------------- */
function resetRunState() {
  ENEMIES.reset();
  FX.reset();
  G.player.x = SITE.spawn.x; G.player.z = SITE.spawn.z;
  G.player.yaw = SITE.spawn.yaw; G.player.pitch = 0;
  G.player.vx = G.player.vz = G.player.vy = 0; G.player.y = 0;
  G.player.health = 100; G.player.alive = true; G.player.regenWait = 0;
  G.player.speed = 0; G.player.bob = 0; G.player.onGround = true;
  G.weapon.mode = 'rifle'; G.weapon.ammo = 30; G.weapon.reserve = 240; G.weapon.reloading = false;
  G.weapon.fireCd = 0; G.weapon.ads = 0; G.weapon.switchT = 0; G.weapon.flash = 0;
  G.arc.cool = 0;
  G.progress = 0; G.kills = 0; G.score = 0; G.runTime = 0;
  G.timers.length = 0; G.sub.queue.length = 0; G.sub.cur = null; G.sub.t = 0;
  G.damage.flash = 0; G.damage.t = 0; G.shake = 0; G.recoilPitch = 0; G.recoilYaw = 0;
  G.hitmarker = 0; G.hitmarkerKill = false; G.flashLight = 0;
  G.boss = { active: false, spawned: false, dead: false, hp: 0, maxHp: 0 };
  G.lastCause = ''; G.won = false;
  G.godMode = false;
  G.stepT = 0;
  for (const r of WORLD.relays) { r.on = false; if (r.beacon) r.beacon.visible = false; }
  for (const s of WORLD.supplies) { s.used = false; s.cooldown = 0; }
  G.prompt = null; G.near = null;
  G.mouseDown = false; G.touch.fire = false;
  G.dropped = false;
  G.arcDemo = false; G.fireDemo = false; G.tracerDemo = false; G.arcDemoT = 0; G.fireDemoT = 0; G.tracerDemoT = 0;
}

/* ----------------------------- run update ------------------------------ */
function updateRun(dt) {
  if (G.phase !== 'playing') return;
  G.runTime += dt;
  updatePlayer(dt);
  const w = G.weapon;
  w.fireCd = Math.max(0, w.fireCd - dt);
  w.switchT = Math.max(0, w.switchT - dt);
  w.ads = clamp(w.ads + (G.inputAds ? dt * 7 : -dt * 7), 0, 1);
  if (w.reloading) {
    w.reloadT -= dt;
    if (w.reloadT <= 0) finishReload();
  }
  if (G.arc.cool > 0) G.arc.cool = Math.max(0, G.arc.cool - dt);
  if (G.inputFire || G.touch.fire) tryFire();
  // interaction target
  G.near = nearestInteract();
  G.prompt = G.near;
  // supplies cooldown
  for (const s of WORLD.supplies) if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);
  // scheduled events
  for (let i = G.timers.length - 1; i >= 0; i--) {
    if (G.runTime >= G.timers[i].at) { const f = G.timers[i].fn; G.timers.splice(i, 1); try { f(); } catch (e) { console.error(e); } }
  }
  ENEMIES.setPlayer({ x: G.player.x, y: 1.7 + G.player.y, z: G.player.z, alive: G.player.alive });
  ENEMIES.update(dt);
  updateBossState();
  updateDamage(dt);
  updateSubtitles(dt);
  updateHud();
}

/* ------------------------------- run end ------------------------------- */
function endRun(won, cause) {
  if (G.phase !== 'playing') return;
  G.phase = won ? 'won' : 'lost';
  G.won = won;
  G.player.alive = won ? G.player.alive : false;
  if (won) {
    G.score += 1000;
    say('调度', '信号已发出。白夜站，回家了。', 6);
    AUDIO.play('win');
  } else {
    G.lastCause = cause || G.lastCause || '你倒在了雪里。';
    AUDIO.play('lose');
  }
  if (!G.demo) saveAll();
  if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
  showEnd(won, G.lastCause);
  updateHud();
}

/* -------------------------- subtitles / toast -------------------------- */
function say(who, text, dur) {
  G.sub.queue.push({ who, text, dur: dur || Math.max(2.6, text.length * 0.14) });
}
function updateSubtitles(dt) {
  const s = G.sub;
  if (s.cur) {
    s.t -= dt;
    if (s.t <= 0) { s.cur = null; updateSubtitleDom(); }
    return;
  }
  if (s.queue.length) {
    s.cur = s.queue.shift();
    s.t = s.cur.dur;
    updateSubtitleDom();
  }
}

/* ------------------------------ boot ----------------------------------- */
function boot() {
  const canvas = document.getElementById('gl');
  if (!GFX.init(canvas)) {
    document.getElementById('start').innerHTML = '<div style="margin:auto;color:#eee;font-family:monospace">WebGL2 不可用 / WebGL2 unavailable.</div>';
    return;
  }
  buildSite();
  uploadWorld();
  ENEMIES.init();
  uploadViewmodels();
  ENEMIES.setHooks({
    onPlayerHit: (dmg, source, from) => hurtPlayer(dmg, source, from),
    onHurt: (enemy, dmg, opts) => {},
    onKilled: (enemy) => {
      G.kills++;
      G.score += enemy.score;
      AUDIO.play('kill');
      // the boss win state is resolved by updateBossState (so the win timer is scheduled)
    },
    onEnemyShot: (enemy, big) => { AUDIO.play('enemyShot'); },
    onSpawn: (enemy) => {},
    onWave: (kind) => AUDIO.play('alarm')
  });
  ENEMIES.setPlayer({ x: G.player.x, y: 1.7, z: G.player.z, alive: true });
  loadSettingsUi();
  bindUi();
  bindInput();
  applySettings(true);
  G.phase = 'menu';
  updateTitleUi();
  parseQuery();
  refreshBest();
  updateSubtitleDom();
  requestAnimationFrame(loop);
}
