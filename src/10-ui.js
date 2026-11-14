/* =========================================================================
   BLACK ICE — 10 UI, input, test contract and main loop
   ========================================================================= */

let shotMode = false;
G.inputFire = false;
G.inputAds = false;
G.jumpQueued = false;
G.godMode = false;
G.toastUntil = 0;

const D = {};
function cacheDom() {
  const id = (s) => document.getElementById(s);
  D.canvas = id('gl');
  D.start = id('start'); D.hud = id('hud'); D.pause = id('pause'); D.settings = id('settings');
  D.help = id('help'); D.end = id('end'); D.touch = id('touch');
  D.objPhase = id('obj-phase'); D.objTitle = id('obj-title'); D.objStep = id('obj-step');
  D.objPips = id('obj-pips'); D.objCount = id('obj-count');
  D.threat = id('threat'); D.kills = id('kills'); D.score = id('score'); D.clock = id('clock');
  D.compass = id('compass'); D.markers = id('markers'); D.crosshair = id('crosshair');
  D.hitmarker = id('hitmarker'); D.reloadbar = id('reloadbar'); D.prompt = id('prompt');
  D.ability = id('ability'); D.abilityFill = D.ability ? D.ability.querySelector('i') : null;
  D.hpnum = id('hpnum'); D.hpbar = id('hpbar'); D.armorline = id('armorline'); D.regenline = id('regenline');
  D.wpnname = id('wpnname'); D.ammo = id('ammo'); D.wpnstate = id('wpnstate'); D.arcstat = id('arcstat');
  D.subtitle = id('subtitle'); D.subWho = id('sub-who'); D.subLine = id('sub-line');
  D.bossbar = id('bossbar'); D.bossHp = id('boss-hp'); D.bossFill = id('boss-fill');
  D.damageflash = id('damageflash'); D.lowhealth = id('lowhealth'); D.dmgdir = id('dmgdir'); D.dmgArrow = D.dmgdir ? D.dmgdir.querySelector('i') : null;
  D.toast = id('toast'); D.locknote = id('locknote');
  D.bestline = id('bestline');
  D.pObj = id('p-obj'); D.pRelay = id('p-relay'); D.pKills = id('p-kills'); D.pTime = id('p-time'); D.pScore = id('p-score');
  D.endKicker = id('end-kicker'); D.endTitle = id('end-title'); D.endCause = id('end-cause');
  D.eRelay = id('e-relay'); D.eKills = id('e-kills'); D.eTime = id('e-time'); D.eScore = id('e-score'); D.eBest = id('e-best');
  D.sSens = id('s-sens'); D.vSens = id('v-sens'); D.sVol = id('s-vol'); D.vVol = id('v-vol');
  D.sFov = id('s-fov'); D.vFov = id('v-fov'); D.sQuality = id('s-quality');
  D.sInvert = id('s-invert'); D.sMute = id('s-mute');
  D.stick = id('stick'); D.knob = id('knob'); D.lookzone = id('lookzone');
  D.tFire = id('t-fire'); D.tAim = id('t-aim'); D.tInter = id('t-inter'); D.tJump = id('t-jump');
  D.tReload = id('t-reload'); D.tSwap = id('t-swap');
  D.markerRefs = [];
  D.last = {};
}

/* ------------------------------ settings UI ----------------------------- */
function loadSettingsUi() {
  if (!D.canvas) cacheDom();
  if (!D.sSens) return;
  D.sSens.value = Math.round(SETTINGS.sens * 100);
  D.sVol.value = SETTINGS.vol;
  D.sFov.value = SETTINGS.fov;
  syncSettingsLabels();
}
function syncSettingsLabels() {
  if (!D.sSens) return;
  if (D.vSens) D.vSens.textContent = SETTINGS.sens.toFixed(2);
  if (D.vVol) D.vVol.textContent = String(Math.round(SETTINGS.vol));
  if (D.vFov) D.vFov.textContent = SETTINGS.fov + '°';
  if (D.sSens) D.sSens.value = Math.round(SETTINGS.sens * 100);
  if (D.sVol) D.sVol.value = SETTINGS.vol;
  if (D.sFov) D.sFov.value = SETTINGS.fov;
  if (D.sQuality) for (const b of D.sQuality.querySelectorAll('button')) b.classList.toggle('on', b.dataset.q === SETTINGS.quality);
  if (D.sInvert) { D.sInvert.textContent = SETTINGS.invert ? 'ON' : 'OFF'; D.sInvert.classList.toggle('on', SETTINGS.invert); }
  if (D.sMute) { D.sMute.textContent = SETTINGS.muted ? 'ON' : 'OFF'; D.sMute.classList.toggle('on', SETTINGS.muted); }
}
function applySettings(initial) {
  AUDIO.setVolume(SETTINGS.vol / 100);
  AUDIO.setMuted(!!SETTINGS.muted);
  if (GFX.quality !== SETTINGS.quality) GFX.setQuality(SETTINGS.quality);
  if (window.__REBAKE) {
    try { GFX.bakeStaticShadow(WORLD.draws); } catch (e) {}
    window.__REBAKE = false;
  }
  syncSettingsLabels();
  saveSettings();
}

/* ------------------------------- screens -------------------------------- */
function hideScreens() {
  for (const el of [D.start, D.pause, D.settings, D.help, D.end]) if (el) el.hidden = true;
}
function revealHud() {
  if (D.hud) D.hud.classList.remove('hidden');
}
function hideHud() { if (D.hud) D.hud.classList.add('hidden'); }

function startGame(opts = {}) {
  AUDIO.init();
  resetRunState();
  G.phase = 'playing';
  G.frozen = false;
  G.still = null;
  G.demo = 0;
  hideScreens();
  revealHud();
  D.end.hidden = true;
  G.inputFire = false; G.inputAds = false; G.jumpQueued = false;
  G.weapon.ads = 0;
  say('调度', '白夜站，听得见吗？信标阵列还在睡。先去 ALPHA 中继，按 E 接入。', 5.4);
  G.timers.push({ at: 8.5, fn: () => { if (G.phase === 'playing') { say('调度', '接触——两只胡蜂从北面过来了。保持移动。', 3.8); queueSpawns(['wasp', 'wasp'], 1.5); } } });
  if (!opts.test) requestLock();
  refreshPrompt();
  updateObjectiveDom();
  updateHud();
  updateSubtitleDom();
}
function pauseGame() {
  if (G.phase !== 'playing') return;
  G.phase = 'paused';
  G.inputFire = false; G.inputAds = false; G.touch.fire = false; G.touch.ads = false;
  G.keys.clear();
  updatePauseStats();
  D.pause.hidden = false;
  G.ignoreLock = true;
  if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
  setTimeout(() => { G.ignoreLock = false; }, 450);
}
function resumeGame() {
  if (G.phase !== 'paused' && G.phase !== 'settings') return;
  D.pause.hidden = true;
  D.settings.hidden = true;
  G.phase = 'playing';
  requestLock();
}
function requestLock() {
  if (shotMode) return;
  try {
    if (document.pointerLockElement === D.canvas) return;
    const p = D.canvas.requestPointerLock && D.canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
    G.ignoreLock = true;
    setTimeout(() => { G.ignoreLock = false; }, 600);
  } catch (e) {}
}
function openSettingsFrom(where) {
  G.ui.settingsFromMenu = where === 'menu';
  if (where === 'playing') pauseGame();
  if (where === 'menu') D.start.hidden = true;
  D.settings.hidden = false;
}
function closeSettings() {
  D.settings.hidden = true;
  if (G.ui.settingsFromMenu) {
    D.start.hidden = false;
    G.phase = 'menu';
    G.ui.settingsFromMenu = false;
    updateTitleUi();
  } else if (G.phase === 'paused') {
    D.pause.hidden = false;
  }
  saveSettings();
}
function openHelp() {
  G.ui.helpFromMenu = G.phase === 'menu';
  if (G.ui.helpFromMenu) D.start.hidden = true;
  D.help.hidden = false;
}
function closeHelp() {
  D.help.hidden = true;
  if (G.ui.helpFromMenu) { D.start.hidden = false; G.phase = 'menu'; }
}
function toMenu() {
  if (G.phase === 'playing' && document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) {} }
  G.phase = 'menu';
  G.still = null; G.frozen = false; G.demo = 0;
  resetRunState();
  G.weapon.ads = 0;
  FX.reset();
  hideScreens();
  hideHud();
  D.start.hidden = false;
  D.end.hidden = true;
  G.ignoreLock = true;
  setTimeout(() => { G.ignoreLock = false; }, 450);
  updateTitleUi();
  refreshBest();
}
function updateTitleUi() {
  if (!D.start) return;
  if (G.still) return;
  hideHud();
  D.start.hidden = false;
  D.pause.hidden = true; D.settings.hidden = true; D.help.hidden = true; D.end.hidden = true;
  refreshBest();
}
function updatePauseStats() {
  if (!D.pObj) return;
  const o = objectiveState();
  D.pObj.textContent = o.title;
  D.pRelay.textContent = G.progress + ' / 3';
  D.pKills.textContent = String(G.kills);
  D.pTime.textContent = fmtTime(G.runTime);
  D.pScore.textContent = String(Math.round(G.score));
}
function showEnd(won, cause) {
  D.end.hidden = false;
  D.endKicker.textContent = won ? 'SIGNAL SENT · 信号已发出' : 'SIGNAL LOST · 信号中断';
  D.endTitle.textContent = won ? '白夜站听见了我们' : '行动失败';
  D.endCause.textContent = won
    ? '三座中继、一条上行链路，还有你活着走出来的这条路。'
    : (cause || G.lastCause || '你倒在了雪里。');
  D.eRelay.textContent = G.progress + ' / 3';
  D.eKills.textContent = String(G.kills);
  D.eTime.textContent = fmtTime(G.runTime);
  D.eScore.textContent = String(Math.round(G.score));
  refreshBest();
  updateHud();
}
function refreshBest() {
  const txt = BEST
    ? `最佳记录 ${BEST.score} · ${BEST.kills || 0} 击杀 · ${fmtTime(BEST.time || 0)}`
    : '最佳记录 —';
  if (D.bestline) D.bestline.innerHTML = '最佳记录 <b>' + (BEST ? `${BEST.score} · ${BEST.kills || 0} 击杀 · ${fmtTime(BEST.time || 0)}` : '—') + '</b>';
  if (D.bestline && !BEST) D.bestline.innerHTML = '最佳记录 <b>—</b>';
  if (D.eBest) D.eBest.textContent = BEST ? String(BEST.score) : '0';
}

/* -------------------------------- toast -------------------------------- */
function toast(msg, ms = 2600) {
  if (!D.toast) return;
  D.toast.textContent = msg;
  D.toast.classList.add('show');
  G.toastUntil = G.time + ms / 1000;
}

/* ------------------------------ HUD ------------------------------------ */
function objectiveState() {
  if (G.progress >= 3 && G.boss.active && !G.boss.dead) {
    return { phase: 'PHASE 04 / 04', title: '击毁 典狱长', step: `主控核心 · ${Math.max(0, Math.round(G.boss.hp))} / ${Math.round(G.boss.maxHp)} HP`, pips: 3, count: '3/4' };
  }
  if (G.progress >= 3) {
    return { phase: 'PHASE 04 / 04', title: '击毁 典狱长', step: '上行链路建立中 · 主控核心正在苏醒', pips: 3, count: '3/4' };
  }
  const next = WORLD.relays.find(r => !r.on) || WORLD.relays[0];
  return {
    phase: 'PHASE 0' + (G.progress + 1) + ' / 04', title: '唤醒信标阵列',
    step: '前往 ' + next.label + ' 中继 · ' + G.progress + ' / 3 在线', pips: G.progress, count: G.progress + '/4'
  };
}
function setText(el, s) { if (el && el.textContent !== s) el.textContent = s; }
function setHtml(el, s) { if (el && el.innerHTML !== s) el.innerHTML = s; }

function updateObjectiveDom() {
  const o = objectiveState();
  setText(D.objPhase, o.phase);
  setText(D.objTitle, o.title);
  setText(D.objStep, o.step);
  setText(D.objCount, o.count);
  if (D.objPips) {
    const pips = D.objPips.querySelectorAll('i');
    for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('on', i < o.pips);
  }
}

function updateHud() {
  if (!D.hud || !D.hpnum) return;
  const p = G.player, w = G.weapon;
  // objective
  updateObjectiveDom();
  // survival
  setText(D.hpnum, String(Math.max(0, Math.round(p.health))));
  if (D.hpbar) {
    const pc = clamp(p.health / p.maxHealth, 0, 1) * 100;
    D.hpbar.style.width = pc.toFixed(1) + '%';
    D.hpbar.classList.toggle('low', p.health < 35);
    D.hpnum.classList.toggle('low', p.health < 35);
  }
  if (D.armorline) D.armorline.textContent = p.health < 35 ? '严重失血 · 寻找补给' : '护甲完整';
  if (D.regenline) D.regenline.textContent = p.regenWait > 0 ? '恢复抑制' : (p.health < 100 ? '再生中' : '—');
  // weapon
  setText(D.threat, G.boss.active && !G.boss.dead ? '典狱长 · 交战中' : (ENEMIES.aliveCount() ? '接触 · ' + ENEMIES.aliveCount() : '无接触'));
  if (D.threat) D.threat.classList.toggle('live', ENEMIES.aliveCount() > 0 || (G.boss.active && !G.boss.dead));
  setText(D.kills, String(G.kills));
  setText(D.score, String(Math.round(G.score)));
  setText(D.clock, fmtTime(G.runTime));
  setText(D.wpnname, w.mode === 'arc' ? 'ARC-9 COIL' : 'AR-9 HAMMER');
  if (D.ammo) {
    if (w.mode === 'arc') {
      D.ammo.innerHTML = (G.arc.cool > 0 ? G.arc.cool.toFixed(1) : 'RDY') + '<em> / COIL</em>';
    } else {
      D.ammo.innerHTML = w.ammo + '<em> / ' + w.reserve + '</em>';
    }
    D.ammo.classList.toggle('low', w.mode === 'rifle' && w.ammo <= 7);
  }
  setText(D.wpnstate, w.mode === 'arc' ? '连锁 · 最多 3 目标' : (w.reloading ? '装填中' : '全自动 · 640 RPM'));
  setText(D.arcstat, w.mode === 'arc'
    ? (G.arc.cool > 0 ? 'ARC 充能 ' + G.arc.cool.toFixed(1) + 's' : 'ARC 就绪')
    : (G.arc.cool > 0 ? 'ARC 充能 ' + G.arc.cool.toFixed(1) + 's' : 'ARC 就绪'));
  // arc ability dial
  if (D.abilityFill) {
    const ratio = w.mode === 'arc' ? clamp(1 - G.arc.cool / G.arc.max, 0, 1) : clamp(1 - G.arc.cool / G.arc.max, 0, 1);
    D.abilityFill.style.height = (ratio * 100).toFixed(0) + '%';
    D.ability.style.borderColor = ratio >= 1 ? 'rgba(143,224,194,.6)' : 'rgba(169,211,226,.3)';
  }
  // prompt
  if (D.prompt) {
    if (G.prompt && G.phase === 'playing') {
      D.prompt.style.display = 'block';
      const html = '<b>E ·</b> ' + G.prompt.text;
      setHtml(D.prompt, html);
    } else {
      D.prompt.style.display = 'none';
      if (D.prompt.textContent) D.prompt.textContent = '';
    }
  }
  // hit marker
  if (D.hitmarker) {
    D.hitmarker.classList.toggle('on', G.hitmarker > 0);
    D.hitmarker.classList.toggle('kill', G.hitmarkerKill && G.hitmarker > 0);
  }
  // crosshair
  if (D.crosshair) {
    const sp = currentSpread();
    const sc = clamp(0.8 + sp * 12 + (G.player.speed > 3 ? 0.15 : 0), 0.8, 2.0);
    D.crosshair.style.transform = 'translate(-50%,-50%) scale(' + sc.toFixed(2) + ')';
    D.crosshair.style.opacity = (w.mode === 'arc' ? 0.45 : (w.ads > 0.6 ? 0.35 : 0.92)).toFixed(2);
  }
  // reload
  if (D.reloadbar) {
    D.reloadbar.classList.toggle('show', w.reloading);
    if (w.reloading) D.reloadbar.firstElementChild.style.width = ((1 - w.reloadT / w.reloadDur) * 100).toFixed(1) + '%';
  }
  // damage
  if (D.damageflash) D.damageflash.style.opacity = (G.damage.flash * 0.9).toFixed(2);
  if (D.lowhealth) D.lowhealth.style.opacity = (p.health < 35 ? 0.35 + 0.25 * Math.sin(G.time * 4) : 0).toFixed(2);
  if (D.dmgdir) {
    D.dmgdir.style.opacity = (G.damage.t > 0 ? Math.min(1, G.damage.t * 2) : 0).toFixed(2);
    if (D.dmgArrow) D.dmgArrow.style.transform = 'rotate(' + (G.damage.angle - PI / 2) + 'rad)';
  }
  // boss
  if (D.bossbar) {
    const on = G.boss.active && !G.boss.dead;
    D.bossbar.classList.toggle('on', on);
    if (on) {
      setText(D.bossHp, String(Math.round(G.boss.hp)));
      D.bossFill.style.width = (clamp(G.boss.hp / Math.max(1, G.boss.maxHp), 0, 1) * 100).toFixed(1) + '%';
    }
  }
  // toast
  if (D.toast && G.toastUntil && G.time > G.toastUntil) D.toast.classList.remove('show');
  // lock hint
  if (D.locknote) {
    const needLock = !shotMode && !isTouch && G.phase === 'playing' && !G.pointerLocked;
    D.locknote.style.display = needLock ? 'block' : 'none';
  }
  updateMarkers();
  drawCompass();
}
function updateSubtitleDom() {
  if (!D.subtitle) return;
  const c = G.sub.cur;
  if (!c) { D.subtitle.classList.remove('show'); return; }
  D.subWho.textContent = c.who;
  D.subLine.textContent = c.text;
  D.subLine.classList.toggle('urgent', c.who === '系统');
  D.subtitle.classList.add('show');
}

/* ------------------------------ markers -------------------------------- */
function ensureMarkers() {
  if (!D.markers || D.markerRefs.length) return;
  const defs = [];
  for (const r of WORLD.relays) defs.push({ kind: 'relay', id: r.id, label: r.label + ' 中继' });
  defs.push({ kind: 'boss', id: 'boss', label: '典狱长' });
  for (const s of WORLD.supplies) defs.push({ kind: 'supply', id: s.id, label: '补给' });
  for (const def of defs) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.innerHTML = '<div class="dm"></div><div class="md"></div>';
    D.markers.appendChild(el);
    D.markerRefs.push({ ...def, el, md: el.querySelector('.md') });
  }
}
function updateMarkers() {
  ensureMarkers();
  if (!D.markerRefs.length) return;
  const p = G.player;
  const showHud = G.phase !== 'menu' && !G.still;
  for (const m of D.markerRefs) {
    let world = null, dist = 0;
    if (m.kind === 'relay') {
      const r = WORLD.relays.find(x => x.id === m.id);
      if (r && !r.on) { world = [r.x, 2.6, r.z]; dist = Math.hypot(r.x - p.x, r.z - p.z); }
    } else if (m.kind === 'boss') {
      const b = ENEMIES.boss();
      if (b) { world = [b.x, b.y + 1.0, b.z]; dist = Math.hypot(b.x - p.x, b.z - p.z); }
    } else if (m.kind === 'supply') {
      if (G.prompt && G.prompt.type === 'supply' && G.prompt.id === m.id) { m.el.style.display = 'none'; continue; }
      const s = WORLD.supplies.find(x => x.id === m.id);
      const low = G.player.health < 55 || G.weapon.reserve < 60;
      if (s && low && s.cooldown <= 0) { world = [s.x, 1.2, s.z]; dist = Math.hypot(s.x - p.x, s.z - p.z); }
    }
    if (!world || !showHud || dist > SITE.markerRange) { m.el.style.display = 'none'; continue; }
    const pr = GFX.project(world);
    if (!pr || !pr.on) { m.el.style.display = 'none'; continue; }
    m.el.style.display = 'flex';
    m.el.style.left = pr.x.toFixed(0) + 'px';
    m.el.style.top = pr.y.toFixed(0) + 'px';
    m.el.classList.toggle('off', false);
    m.md.textContent = m.label + ' · ' + Math.round(dist) + 'm';
  }
}

/* ------------------------------ compass -------------------------------- */
function drawCompass() {
  const cv = D.compass;
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const w = cv.width, h = cv.height;
  ctx.clearRect(0, 0, w, h);
  const heading = ((G.player.yaw * 180 / PI) % 360 + 360) % 360;
  const span = 62, cx = w / 2, half = w / 2 - 20;
  // baseline
  ctx.strokeStyle = 'rgba(232,230,222,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(20, h * 0.62); ctx.lineTo(w - 20, h * 0.62); ctx.stroke();
  const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
  for (let a = 0; a < 360; a += 15) {
    let rel = ((a - heading + 540) % 360) - 180;
    if (Math.abs(rel) > span) continue;
    const x = cx + rel / span * half;
    const major = a % 90 === 0;
    const mid = a % 45 === 0;
    ctx.strokeStyle = major ? 'rgba(242,239,230,0.9)' : mid ? 'rgba(232,230,222,0.5)' : 'rgba(232,230,222,0.24)';
    ctx.beginPath(); ctx.moveTo(x, h * 0.62); ctx.lineTo(x, h * 0.62 - (major ? 18 : mid ? 12 : 7)); ctx.stroke();
    if (major) {
      ctx.fillStyle = 'rgba(242,239,230,0.95)';
      ctx.font = '600 20px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(names[a], x, h * 0.30);
    } else if (a % 45 === 0) {
      ctx.fillStyle = 'rgba(200,208,205,0.55)';
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(a).padStart(3, '0'), x, h * 0.36);
    }
  }
  // objective bearings
  const marks = [];
  for (const r of WORLD.relays) if (!r.on) marks.push({ x: r.x, z: r.z, c: '#ffb15e', t: r.label[0] });
  const b = ENEMIES.boss();
  if (b) marks.push({ x: b.x, z: b.z, c: '#ff5b3d', t: 'P' });
  for (const m of marks) {
    const bearing = ((Math.atan2(m.x - G.player.x, -(m.z - G.player.z)) * 180 / PI) % 360 + 360) % 360;
    const rel = ((bearing - heading + 540) % 360) - 180;
    if (Math.abs(rel) > span) continue;
    const x = cx + rel / span * half;
    ctx.fillStyle = m.c;
    ctx.save();
    ctx.translate(x, h * 0.62 + 15);
    ctx.rotate(PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
    ctx.fillStyle = m.c;
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(m.t, x, h * 0.62 + 40);
  }
  // centre marker
  ctx.fillStyle = 'rgba(255,177,94,0.95)';
  ctx.beginPath(); ctx.moveTo(cx, h * 0.60); ctx.lineTo(cx - 5, h * 0.75); ctx.lineTo(cx + 5, h * 0.75); ctx.closePath(); ctx.fill();
  // heading number
  ctx.fillStyle = 'rgba(232,230,222,0.55)';
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(heading)).padStart(3, '0') + '°', cx, h * 0.94);
}

/* ------------------------------ viewmodel ------------------------------ */
function buildViewModelState() {
  if (G.phase === 'menu' || G.still) return null;
  const w = G.weapon, p = G.player;
  const ads = clamp(w.ads, 0, 1);
  const switchT = w.switchT;
  const switchK = switchT > 0 ? Math.sin((1 - switchT / 0.4) * PI) : 0;
  const reloadK = w.reloading ? Math.sin((1 - w.reloadT / w.reloadDur) * PI) : 0;
  const t = G.time;
  const S = 0.74;
  let px = lerp(0.235, 0.0, ads);
  let py = lerp(-0.178, -0.094, ads);
  let pz = lerp(-0.70, -0.57, ads);
  let rx = 0.026 + Math.sin(p.bob) * 0.008 * clamp(p.speed / 5, 0, 1);
  let ry = lerp(0.05, 0.0, ads);
  let rz = lerp(-0.02, 0.0, ads);
  const breathe = Math.sin(t * 1.3) * 0.0035 * (1 - ads);
  py += breathe;
  const bobX = Math.sin(p.bob * 2) * 0.008 * clamp(p.speed / 6, 0, 1) * (1 - ads * 0.8);
  const bobY = Math.sin(p.bob * 2 + 0.6) * 0.006 * clamp(p.speed / 6, 0, 1) * (1 - ads * 0.8);
  px += bobX; py += bobY;
  // recoil + reload + switch dips
  py -= reloadK * 0.13; rx += reloadK * 0.55; rz += reloadK * 0.2;
  py -= switchK * 0.18; rz += switchK * 0.5;
  let bodyM = M4.trs(M4.create(), px, py, pz, rx, ry, rz, S, S, S);
  if (w.mode === 'arc') {
    py = -0.18 - reloadK * 0.1; pz = -0.52; px = 0.21 + bobX * 0.6;
    rx = 0.03; ry = 0.06; rz = 0.0;
    py -= switchK * 0.18; rz += switchK * 0.5;
    bodyM = M4.trs(M4.create(), px, py, pz, rx, ry, rz, 0.8, 0.8, 0.8);
    const ringRot = M4.trs(M4.create(), 0, 0, -0.02, 0, 0, t * 2.4);
    const alt = M4.mul(M4.create(), bodyM, ringRot);
    return {
      body: bodyM, bodyMesh: VIEWMESH.arc,
      altMatrix: alt, altMesh: VIEWMESH.arcRings,
      flash: G.weapon.flash, mode: 'arc'
    };
  }
  const magLocal = M4.compose(M4.create(), 0, -0.105 - reloadK * 0.22, 0.045 + reloadK * 0.05, 0);
  const mag = M4.mul(M4.create(), bodyM, magLocal);
  return { body: bodyM, bodyMesh: VIEWMESH.rifle, mag, magMesh: VIEWMESH.mag, flash: G.weapon.flash, mode: 'rifle' };
}

/* ------------------------------- camera -------------------------------- */
function titlePose() {
  const c = WORLD.cameras.title;
  const t = G.time * 0.05;
  const pos = [c.pos[0] + Math.sin(t) * 0.9, c.pos[1] + Math.sin(t * 0.7) * 0.1, c.pos[2] + Math.cos(t * 0.8) * 0.6];
  const ang = yawPitchTo(pos, c.target);
  return { pos, yaw: ang.yaw + Math.sin(t * 0.5) * 0.012, pitch: ang.pitch + Math.sin(t * 0.4) * 0.004, fov: c.fov };
}
function stillFromConfig(cfg) {
  const ang = yawPitchTo(cfg.pos, cfg.target);
  return { pos: cfg.pos.slice(), yaw: ang.yaw, pitch: ang.pitch, fov: cfg.fov || 55 };
}
function stillFromQuery(str) {
  const a = str.split(',').map(Number);
  if (a.length < 6 || a.some(v => !Number.isFinite(v))) return null;
  const ang = yawPitchTo([a[0], a[1], a[2]], [a[3], a[4], a[5]]);
  return { pos: [a[0], a[1], a[2]], yaw: ang.yaw, pitch: ang.pitch, fov: 55 };
}

/* ------------------------------- ambient -------------------------------- */
const AMBIENT = { lastT: 0 };
function updateAmbient(dt) {
  // practical glow sprites: the only "bloom sources" that are not in the kit
  for (const r of WORLD.relays) {
    if (r.on) FX.glow([r.x, 2.14, r.z], 1.0, [0.35, 2.0, 2.5, 0.42], 0.02);
    FX.glow([r.x, 10.7, r.z], 1.3, [2.6, 0.18, 0.06, 0.4], 0.02);
  }
  FX.glow([2.5, 18.3, -28.2], 1.6, [2.8, 0.22, 0.08, 0.35], 0.02);
  for (const l of WORLD.pointLights) {
    if (l.kind === 'relay') FX.glow(l.pos, 0.9, [2.2, 1.0, 0.3, 0.2], 0.02);
    else if (l.kind === 'flood') FX.glow(l.pos, 2.6, [2.2, 1.15, 0.42, 0.22], 0.02);
    else if (l.kind === 'door') FX.glow(l.pos, 1.2, [2.0, 0.9, 0.28, 0.2], 0.02);
  }
  // hostile visor lights read at range without adding a real light
  for (const e of ENEMIES.list) {
    if (e.dead || e.spawnT > 0.2) continue;
    if (e.type === 'wasp') {
      FX.glow([e.x, e.y - 0.02, e.z], 0.42, [3.0, 0.18, 0.06, 0.30], 0.02);
    } else if (e.type === 'prime') {
      FX.glow([e.x, e.y + 0.3, e.z], 2.4, [3.0, 0.20, 0.07, 0.22], 0.02);
      FX.glow([e.x, e.y - 0.9, e.z], 1.1, [0.35, 1.8, 2.2, 0.16], 0.02);
    } else {
      FX.glow([e.x, e.type === 'heavy' ? 1.62 : 1.66, e.z], 0.36, [3.0, 0.18, 0.06, 0.30], 0.02);
      FX.glow([e.x, e.type === 'heavy' ? 1.22 : 1.27, e.z], 0.25, [0.32, 1.7, 2.0, 0.18], 0.02);
    }
  }
  if (G.arcDemo) {
    G.arcDemoT -= dt;
    if (G.arcDemoT <= 0) {
      G.arcDemoT = 0.045;
      const m = GFX.muzzleWorld();
      const pts = ENEMIES.list.filter(e => !e.dead).slice(0, 3).map(e => [e.x, e.type === 'wasp' ? e.y : 1.15, e.z]);
      if (pts.length) FX.arcBolt(m, pts);
    }
  }
  if (G.tracerDemo) {
    G.tracerDemoT -= dt;
    if (G.tracerDemoT <= 0) {
      G.tracerDemoT = 0.05;
      const m = GFX.muzzleWorld();
      const e = ENEMIES.list.find(x => !x.dead);
      if (e) FX.tracer([m[0] - 0.03, m[1] - 0.02, m[2]], [e.x, 1.18, e.z], true, 0.012, 0.08);
    }
  }
  if (G.fireDemo) {
    G.fireDemoT -= dt;
    if (G.fireDemoT <= 0) {
      G.fireDemoT = 0.05;
      const m = GFX.muzzleWorld();
      const cam = cameraPose();
      const dir = dirFromAngles(cam.yaw, cam.pitch);
      FX.muzzle(m, dir);
      const e = ENEMIES.list.find(x => !x.dead);
      if (e) {
        const p = [e.x, 1.18, e.z];
        FX.tracer([m[0] - 0.03, m[1] - 0.02, m[2]], p, true, 0.012, 0.08);
        FX.hit(p, false);
      }
      G.weapon.flash = 1; G.flashLight = 1; G.hitmarker = 1.0;
    }
  }
  // steam / vent wisps from the fuel depot
  G.smokeT -= dt;
  if (G.smokeT <= 0) {
    G.smokeT = 0.45;
    FX.smoke([7.8 + (Math.random() - 0.5) * 1.2, 3.0, 11.6 + (Math.random() - 0.5) * 0.8], 0.7, 2.8, [0.10, 0.11, 0.12, 0.12]);
  }
}

/* -------------------------------- input --------------------------------- */
let isTouch = false;
function bindInput() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (!D.settings.hidden) { closeSettings(); return; }
      if (!D.help.hidden) { closeHelp(); return; }
      if (G.phase === 'playing') { pauseGame(); return; }
      if (G.phase === 'paused') { resumeGame(); return; }
      return;
    }
    if (e.code === 'KeyM') {
      SETTINGS.muted = !SETTINGS.muted;
      AUDIO.setMuted(SETTINGS.muted);
      syncSettingsLabels(); saveSettings();
      return;
    }
    if (G.phase === 'menu' && e.code === 'Enter') { startGame(); return; }
    if (G.phase !== 'playing') return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) G.keys.add(e.code);
    if (e.code === 'Space' && !e.repeat) { G.jumpQueued = true; }
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyQ') switchWeapon(G.weapon.mode === 'rifle' ? 'arc' : 'rifle');
    if (e.code === 'Digit1') switchWeapon('rifle');
    if (e.code === 'Digit2') switchWeapon('arc');
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyF') G.inputFire = true;
  });
  window.addEventListener('keyup', (e) => {
    G.keys.delete(e.code);
    if (e.code === 'KeyF') G.inputFire = false;
  });
  window.addEventListener('blur', () => { G.keys.clear(); G.inputFire = false; G.inputAds = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.phase === 'playing') pauseGame();
  });

  const cv = D.canvas;
  cv.addEventListener('mousedown', (e) => {
    AUDIO.init();
    if (G.phase !== 'playing') return;
    if (!G.pointerLocked) requestLock();
    G.mouseDown = true;
    G.lastMouse = { x: e.clientX, y: e.clientY };
    G.dragging = true;
    if (e.button === 0) G.inputFire = true;
    if (e.button === 2) G.inputAds = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) G.inputFire = false;
    if (e.button === 2) G.inputAds = false;
    G.mouseDown = false; G.dragging = false;
  });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', (e) => {
    if (G.phase !== 'playing') return;
    if (G.frozen) return;
    if (document.pointerLockElement === cv) {
      look(e.movementX || 0, e.movementY || 0);
    } else if (G.dragging) {
      const lx = G.lastMouse ? G.lastMouse.x : e.clientX;
      const ly = G.lastMouse ? G.lastMouse.y : e.clientY;
      look((e.clientX - lx) * 1.2, (e.clientY - ly) * 1.2);
      G.lastMouse = { x: e.clientX, y: e.clientY };
    }
  });
  document.addEventListener('pointerlockchange', () => {
    G.pointerLocked = document.pointerLockElement === cv;
    if (D.locknote) D.locknote.style.display = 'none';
    if (!G.pointerLocked && G.phase === 'playing' && !G.ignoreLock) pauseGame();
  });
  setupTouch();
}
let touchLookId = null;
function setupTouch() {
  isTouch = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia('(pointer: coarse)').matches;
  const q = new URLSearchParams(location.search);
  if (q.get('touch') === '1') isTouch = true;
  if (isTouch) document.body.classList.add('touch');
  if (!D.stick) return;
  let stickId = null;
  const rectOf = (el) => el.getBoundingClientRect();
  const stickMove = (e) => {
    const r = rectOf(D.stick);
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const max = r.width * 0.38;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    G.touch.move.x = dx / max;
    G.touch.move.y = -dy / max;
    if (D.knob) D.knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
  };
  D.stick.addEventListener('pointerdown', (e) => {
    AUDIO.init();
    stickId = e.pointerId; D.stick.setPointerCapture(e.pointerId);
    stickMove(e); e.preventDefault();
  });
  D.stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
  const stickEnd = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null; G.touch.move.x = 0; G.touch.move.y = 0;
    if (D.knob) D.knob.style.transform = '';
  };
  D.stick.addEventListener('pointerup', stickEnd);
  D.stick.addEventListener('pointercancel', stickEnd);
  if (D.lookzone) {
    let lookId = null, lx = 0, ly = 0;
    D.lookzone.addEventListener('pointerdown', (e) => {
      AUDIO.init(); lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
      D.lookzone.setPointerCapture(e.pointerId);
    });
    D.lookzone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      if (G.phase === 'playing' && !G.frozen) look(dx * 2.1, dy * 2.1);
    });
    const lookEnd = (e) => { if (e.pointerId === lookId) lookId = null; };
    D.lookzone.addEventListener('pointerup', lookEnd);
    D.lookzone.addEventListener('pointercancel', lookEnd);
  }
  const hold = (el, down, up) => {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => { AUDIO.init(); e.preventDefault(); down(); });
    if (up) { el.addEventListener('pointerup', (e) => { e.preventDefault(); up(); }); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up); }
  };
  hold(D.tFire, () => { G.touch.fire = true; G.inputFire = true; }, () => { G.touch.fire = false; G.inputFire = false; });
  hold(D.tAim, () => { G.touch.ads = !G.touch.ads; G.inputAds = G.touch.ads; if (D.tAim) D.tAim.classList.toggle('on', G.touch.ads); });
  hold(D.tJump, () => { G.jumpQueued = true; });
  hold(D.tInter, () => { interact(); });
  hold(D.tReload, () => { startReload(); });
  hold(D.tSwap, () => { switchWeapon(G.weapon.mode === 'rifle' ? 'arc' : 'rifle'); });
}
function look(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
  const sens = 0.0021 * SETTINGS.sens * (1 - G.weapon.ads * 0.34);
  G.player.yaw += dx * sens;
  G.player.pitch = clamp(G.player.pitch + dy * sens * (SETTINGS.invert ? 1 : -1), -1.45, 1.45);
}

/* --------------------------------- boot --------------------------------- */
function parseQuery() {
  const q = new URLSearchParams(location.search);
  const quality = q.get('q');
  if (quality && ['low', 'med', 'high'].includes(quality)) {
    SETTINGS.quality = quality;
    applySettings(false);
    syncSettingsLabels();
  }
  const camStr = q.get('cam');
  const demo = parseInt(q.get('demo') || '0', 10) || 0;
  shotMode = q.get('shot') === '1' || !!camStr || demo > 0;
  const hudInShot = q.get('hud') === '1';
  if (demo > 0) {
    setupDemo(demo);
    return;
  }
  if (camStr) {
    const st = stillFromQuery(camStr) || stillFromConfig(WORLD.cameras.hero);
    G.still = st; G.frozen = true; G.time = 9.0;
    if (!hudInShot) document.body.classList.add('hide-ui');
    return;
  }
  if (q.get('shot') === '1') {
    G.still = stillFromConfig(WORLD.cameras.hero);
    G.frozen = true; G.time = 9.0;
    if (!hudInShot) document.body.classList.add('hide-ui');
  }
}

function setupDemo(n) {
  resetRunState();
  G.phase = 'playing';
  G.frozen = true;
  G.demo = n;
  G.time = 11.3;
  G.runTime = 84;
  G.still = null;
  G.inputFire = false; G.inputAds = false;
  hideScreens();
  revealHud();
  document.body.classList.remove('hide-ui');
  const visual = (n === 2 || n === 6) ? 2 : (n === 3 ? 3 : 1);
  if (visual === 1) {
    G.player.x = 0.0; G.player.z = 15.6; G.player.yaw = 0.03; G.player.pitch = 0.0;
    G.player.health = 72; G.weapon.ammo = 17; G.weapon.reserve = 210;
    G.weapon.ads = 0.35;
    G.progress = 1; G.score = 1450; G.kills = 7; G.runTime = 96;
    const a = WORLD.relays.find(r => r.id === 'relay-a'); if (a) { a.on = true; a.beacon.visible = true; }
    ENEMIES.spawn('raider', 2.4, 9.4); ENEMIES.spawn('raider', 8.0, -1.5); ENEMIES.spawn('raider', -7.5, 1.5); ENEMIES.spawn('raider', -1.0, -2.5);
    ENEMIES.spawn('wasp', 5.5, 7.0); ENEMIES.spawn('wasp', -9.0, 6.0);
    say('调度', 'BRAVO 在东北侧。它们已经知道你来了。', 5);
  } else if (visual === 2) {
    G.player.x = 0.0; G.player.z = 8.0; G.player.yaw = 0.14; G.player.pitch = 0.10;
    G.player.health = 46; G.weapon.ammo = 8; G.weapon.reserve = 72; G.weapon.ads = 0.0;
    G.progress = 3; G.score = 6200; G.kills = 24; G.runTime = 341;
    for (const r of WORLD.relays) { r.on = true; r.beacon.visible = true; }
    G.boss.active = true; G.boss.spawned = true;
    const boss = ENEMIES.spawn('prime', 3.0, -6.0);
    if (boss) { G.boss.hp = boss.hp; G.boss.maxHp = boss.maxHp; }
    ENEMIES.spawn('wasp', 9.5, 0.0); ENEMIES.spawn('wasp', -7.0, -2.0);
    ENEMIES.spawn('raider', 6.5, 3.0);
    say('系统', '典狱长：核心暴露。执行处决协议。', 5.2);
  } else {
    G.player.x = -13.6; G.player.z = -3.1; G.player.yaw = -0.86; G.player.pitch = 0.03;
    G.player.health = 88; G.weapon.ammo = 26; G.weapon.reserve = 180; G.weapon.ads = 0.0;
    G.progress = 1; G.score = 2100; G.kills = 10; G.runTime = 148;
    const a = WORLD.relays.find(r => r.id === 'relay-a'); if (a) { a.on = true; a.beacon.visible = true; }
    ENEMIES.spawn('raider', -8.0, -8.5); ENEMIES.spawn('wasp', -5.0, -6.0);
    say('调度', 'ALPHA 的链路很干净。剩下两座在等你。', 4.6);
  }
  if (n >= 9) {
    ENEMIES.reset();
    G.sub.cur = null; G.sub.queue.length = 0;
    G.arcDemo = false; G.fireDemo = false;
    G.weapon.ads = 0.35;
    const setDemoRelays = (count) => {
      WORLD.relays.forEach((r, i) => { r.on = i < count; if (r.beacon) r.beacon.visible = i < count; });
    };
    if (n === 9) {
      G.player.x = -1.5; G.player.z = 12.5; G.player.yaw = 0.10; G.player.pitch = 0.02;
      G.player.health = 74; G.weapon.mode = 'arc'; G.arc.cool = 2.4;
      G.progress = 2; G.score = 3800; G.kills = 16; G.runTime = 212;
      setDemoRelays(2);
      ENEMIES.spawn('raider', 1.6, 7.0); ENEMIES.spawn('raider', -3.2, 7.6); ENEMIES.spawn('wasp', 4.4, 5.2);
      G.arcDemo = true;
      say('调度', 'ARC-9 的线圈会把电流分给最近的三个目标。', 4.4);
    } else if (n === 10) {
      G.player.x = -2.0; G.player.z = 12.5; G.player.yaw = 0.06; G.player.pitch = 0.03;
      G.player.health = 100; G.weapon.mode = 'rifle'; G.weapon.ammo = 30;
      G.progress = 0; G.score = 0; G.kills = 0; G.runTime = 36;
      setDemoRelays(0);
      ENEMIES.spawn('heavy', -2.4, 7.0); ENEMIES.spawn('raider', 2.0, 8.2);
      ENEMIES.spawn('wasp', 3.0, 4.6); ENEMIES.spawn('raider', -6.4, 8.6);
      say('调度', '重装守卫带着盾。侧翼，或者用电弧。', 4.2);
    } else if (n === 11) {
      G.player.x = 2.0; G.player.z = 16.2; G.player.yaw = -0.62; G.player.pitch = -0.10;
      G.player.health = 27; G.weapon.mode = 'rifle'; G.weapon.ammo = 6; G.weapon.reserve = 18;
      G.progress = 1; G.score = 1850; G.kills = 9; G.runTime = 142;
      setDemoRelays(1);
      G.damage.flash = 0.9; G.damage.t = 1.3; G.damage.angle = 1.1; G.shake = 0;
      say('调度', '你伤得很重。补给箱能重装弹药并回复生命。', 4.4);
    } else if (n === 12 || n === 13 || n === 14) {
      G.player.x = -1.0; G.player.z = 13.0; G.player.yaw = 0.10; G.player.pitch = 0.01;
      G.player.health = 62; G.weapon.mode = 'rifle'; G.weapon.ammo = 24; G.weapon.reserve = 180; G.weapon.ads = 0.55;
      G.progress = 1; G.score = 2680; G.kills = 13; G.runTime = 174;
      setDemoRelays(1);
      ENEMIES.spawn('raider', 1.8, 8.2); ENEMIES.spawn('raider', -2.6, 9.0);
      ENEMIES.spawn('raider', 4.6, 6.6); ENEMIES.spawn('wasp', 5.8, 9.6);
      if (n === 12) {
        G.fireDemo = true; G.hitmarker = 1.0; G.weapon.flash = 1; G.flashLight = 1;
      } else if (n === 14) {
        G.tracerDemo = true; G.weapon.flash = 0.5; G.flashLight = 0.5;
      }
      say('调度', '保持压制。三座中继还在等你。', 3.8);
    }
  }
  for (const e of ENEMIES.list) {
    e.spawnT = 0; e.cool = 999; e.burst = 0;
    e.yaw = Math.atan2(G.player.x - e.x, G.player.z - e.z);
    if (e.type === 'wasp') e.y = 3.1;
    if (e.type === 'prime') e.y = 6.2;
  }
  ENEMIES.update(0, G.time);
  G.timers.length = 0;
  refreshPrompt();
  updateObjectiveDom();
  updateHud();
  updateSubtitleDom();
  if (n === 5) {
    G.phase = 'playing';
    G.player.health = 0; G.player.alive = false;
    endRun(false, '你被 游走者 的 座狼步枪 击倒。');
  } else if (n === 6) {
    G.phase = 'playing';
    G.progress = 3;
    for (const r of WORLD.relays) { r.on = true; if (r.beacon) r.beacon.visible = true; }
    G.score = 8420; G.kills = 31; G.runTime = 412;
    endRun(true);
  } else if (n === 7) {
    G.phase = 'playing';
    pauseGame();
  } else if (n === 8) {
    G.phase = 'playing';
    pauseGame();
    openSettingsFrom('paused');
  }
}

/* -------------------------------- loop ---------------------------------- */
let frames = 0, lastFrame = 0;
function loop(now) {
  const raw = lastFrame ? (now - lastFrame) / 1000 : 0.016;
  lastFrame = now;
  const dt = Math.min(0.05, Math.max(0, raw));
  if (!G.frozen) {
    G.time += dt;
    if (G.phase === 'playing') {
      updateRun(dt);
    } else {
      updateDamage(dt);
      updateSubtitles(dt);
    }
  }
  updateWorld(dt, G.time);
  updateAmbient(G.frozen ? dt : dt);
  FX.update(dt, G.time);
  // camera
  let cam;
  if (G.still) cam = G.still;
  else if (G.phase === 'menu') cam = titlePose();
  else cam = cameraPose();
  // viewmodel
  G.viewmodel = buildViewModelState();
  // muzzle light: position, fixture and the 9th light slot
  const ml = G.flashLight;
  const mp = GFX.muzzleWorld();
  if (WORLD.muzzleLight) {
    const ln = WORLD.muzzleLight.node;
    ln.position.set(mp[0], mp[1], mp[2]);
    ln.setTRS(mp[0], mp[1], mp[2], 0);
    ln.matrixWorld.set(ln.matrix);
  }
  if (WORLD.muzzleFixture) {
    WORLD.muzzleFixture.position.set(mp[0], mp[1], mp[2]);
    WORLD.muzzleFixture.setTRS(mp[0], mp[1], mp[2], 0);
    WORLD.muzzleFixture.matrixWorld.set(WORLD.muzzleFixture.matrix);
  }
  const lights = WORLD.gfxLights.slice(0, 11);
  lights.push({ pos: mp, color: [ml * 22, ml * 11, ml * 4.2], range: 12 });
  GFX.setLights(lights);
  // camera basis for billboards
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const fwd = [Math.sin(cam.yaw) * cp, sp, -Math.cos(cam.yaw) * cp];
  const right = [Math.cos(cam.yaw), 0, Math.sin(cam.yaw)];
  const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
  const ul = Math.hypot(up[0], up[1], up[2]) || 1; up[0] /= ul; up[1] /= ul; up[2] /= ul;
  const fx = FX.build(cam.pos, right, up, fwd);
  const enemies = (G.phase === 'menu') ? [] : ENEMIES.list;
  GFX.renderFrame({ time: G.time, cam, enemies, fx, viewmodel: G.viewmodel, shot: shotMode, prevFrame: lastFrame });
  window.__CAM_POS = { x: cam.pos[0], z: cam.pos[2] };
  if (G.phase !== 'menu') updateHud();
  frames++;
  if (frames >= 3) window.__READY = true;
  requestAnimationFrame(loop);
}

/* ---------------------------- test contract ----------------------------- */
function snapshot() {
  const w = G.weapon;
  const o = objectiveState();
  return {
    phase: G.phase,
    health: +G.player.health.toFixed(2),
    maxHealth: G.player.maxHealth,
    alive: G.player.alive,
    progress: G.progress,
    relays: WORLD.relays.map(r => !!r.on),
    prompt: G.prompt ? G.prompt.text : null,
    inRange: G.prompt ? G.prompt.id : null,
    done: G.phase === 'won',
    failed: G.phase === 'lost',
    cause: G.lastCause,
    kills: G.kills,
    score: Math.round(G.score),
    time: +G.runTime.toFixed(2),
    ammo: w.ammo,
    reserve: w.reserve,
    weapon: w.mode,
    reloading: w.reloading,
    boss: { active: G.boss.active, hp: Math.round(G.boss.hp), maxHp: Math.round(G.boss.maxHp), dead: G.boss.dead },
    enemies: ENEMIES.aliveCount(),
    objective: o.title,
    objectiveStep: o.step,
    x: +G.player.x.toFixed(2), z: +G.player.z.toFixed(2)
  };
}
function planData() {
  const approach = { 'relay-a': [-16.05, -5.55], 'relay-b': [13.6, -4.3], 'relay-c': [-2.75, -21.55] };
  return {
    key: 'E',
    required: 3,
    radius: SITE.promptRadius,
    farPoint: [21, 22],
    targets: WORLD.relays.map(r => ({ id: r.id, pos: approach[r.id] || [r.x, r.z], label: r.label + ' 中继', radius: SITE.promptRadius })),
    goal: { type: 'relays', count: 3 }
  };
}
function resetForTest() {
  resetRunState();
  G.phase = 'playing';
  hideScreens();
  revealHud();
  G.inputFire = false; G.inputAds = false;
  G.weapon.ads = 0;
  updateObjectiveDom();
  updateHud();
  updateSubtitleDom();
  return snapshot();
}
function refreshPrompt() {
  G.near = nearestInteract();
  G.prompt = G.near;
  updateHud();
}
window.__TEST = function (action, arg) {
  try {
    switch (action) {
      case 'start': startGame({ test: true }); return snapshot();
      case 'pause': pauseGame(); return snapshot();
      case 'resume': resumeGame(); return snapshot();
      case 'openSettings': openSettingsFrom(G.phase === 'menu' ? 'menu' : 'paused'); return snapshot();
      case 'closeSettings': closeSettings(); return snapshot();
      case 'save': saveAll(); return snapshot();
      case 'state': return snapshot();
      case 'reset': return resetForTest();
      case 'plan': return planData();
      case 'goto': {
        const p = Array.isArray(arg) ? arg : [0, 0];
        G.player.x = clamp(+p[0] || 0, SITE.bounds.x0 + 0.6, SITE.bounds.x1 - 0.6);
        G.player.z = clamp(+p[1] || 0, SITE.bounds.z0 + 0.6, SITE.bounds.z1 - 0.6);
        G.player.vx = 0; G.player.vz = 0;
        refreshPrompt();
        return snapshot();
      }
      case 'step': {
        const dt = Math.min(0.1, Math.max(0.001, +(arg || 1 / 60)));
        if (G.phase === 'playing') updateRun(dt);
        return snapshot();
      }
      case 'tick': {
        const secs = Math.min(30, Math.max(0, +(arg || 1)));
        const n = Math.ceil(secs / 0.05);
        for (let i = 0; i < n && G.phase === 'playing'; i++) updateRun(0.05);
        return snapshot();
      }
      case 'interact': {
        interact();
        refreshPrompt();
        return snapshot();
      }
      case 'hurt': {
        hurtPlayer(+(arg || 10), { type: 'debug' }, [G.player.x - 1, 1.4, G.player.z]);
        updateHud();
        return snapshot();
      }
      case 'visual': {
        return {
          beacons: WORLD.relays.map(r => ({ id: r.id, on: !!r.on, visible: !!(r.beacon && r.beacon.visible) })),
          count: WORLD.relays.filter(r => r.on).length,
          bossVisible: !!ENEMIES.boss(),
          endShown: !D.end.hidden,
          hudShown: !D.hud.classList.contains('hidden')
        };
      }
      case 'spawn': {
        ENEMIES.spawn(arg && arg.type ? arg.type : 'raider', arg && arg.x != null ? arg.x : G.player.x + 6, arg && arg.z != null ? arg.z : G.player.z - 6);
        return snapshot();
      }
      case 'boss': spawnBoss(); return snapshot();
      case 'aim': {
        if (Array.isArray(arg)) { G.player.yaw = +arg[0] || 0; G.player.pitch = clamp(+arg[1] || 0, -1.4, 1.4); }
        return snapshot();
      }
      case 'fire': {
        const n = Math.min(30, Math.max(1, +(arg || 1)));
        for (let i = 0; i < n; i++) { G.weapon.fireCd = 0; G.weapon.ammo = Math.max(G.weapon.ammo, 1); tryFire(); }
        return snapshot();
      }
      case 'combat': {
        resetForTest();
        G.player.x = 0; G.player.z = 10; G.player.yaw = 0; G.player.pitch = -0.09;
        G.recoilPitch = 0; G.recoilYaw = 0;
        const e = ENEMIES.spawn('raider', 0, 4);
        if (!e) return { error: 'spawn failed' };
        e.spawnT = 0; e.cool = 999; e.layout();
        ENEMIES.update(0, G.time);
        const hp0 = e.hp;
        for (let i = 0; i < 7 && !e.dead; i++) {
          G.weapon.fireCd = 0; G.weapon.ammo = 30; G.recoilPitch = 0; tryFire();
        }
        const out = snapshot();
        out.targetHp = Math.max(0, Math.round(e.hp)); out.targetDead = e.dead;
        out.targetHp0 = hp0; out.targetKills = G.kills;
        return out;
      }
      case 'threat': {
        resetForTest();
        G.player.x = 0; G.player.z = 10; G.player.yaw = 0; G.player.pitch = 0;
        const e = ENEMIES.spawn('raider', 0, 4);
        if (!e) return { error: 'spawn failed' };
        e.spawnT = 0; e.cool = 0.2; e.layout();
        const h0 = G.player.health;
        for (let i = 0; i < 120 && G.phase === 'playing' && G.player.health >= h0 - 1; i++) updateRun(0.05);
        const out = snapshot();
        out.h0 = h0; out.tookDamage = G.player.health < h0;
        return out;
      }
      case 'bossfight': {
        resetForTest();
        G.player.x = 0; G.player.z = 10; G.player.yaw = 0; G.player.pitch = 0.05;
        spawnBoss();
        const b = ENEMIES.boss();
        if (!b) return { error: 'boss did not spawn' };
        b.spawnT = 0; b.layout();
        b.damage(99999, { from: [0, 1.7, 10] });
        updateBossState();
        for (let i = 0; i < 10; i++) updateRun(0.05);
        for (let i = 0; i < 80; i++) { G.runTime += 0.05; if (G.phase !== 'playing') break; for (let k = G.timers.length - 1; k >= 0; k--) { if (G.runTime >= G.timers[k].at) { const f = G.timers[k].fn; G.timers.splice(k, 1); try { f(); } catch (err) {} } } }
        return { ...snapshot(), bossDead: !!G.boss.dead };
      }
      case 'clearEnemies': ENEMIES.reset(); return snapshot();
      case 'giveHealth': G.player.health = Math.min(G.player.maxHealth, G.player.health + (+arg || 0)); return snapshot();
      default: return snapshot();
    }
  } catch (e) {
    console.error('__TEST failed ' + action + ': ' + (e && e.message));
    return { error: String(e && e.message), action };
  }
};
window.__HURT = (n) => { hurtPlayer(n || 10, { type: 'debug' }, [G.player.x + 1, 1.4, G.player.z]); return snapshot(); };
window.__GAME = {
  get state() { return snapshot(); },
  reset: resetForTest,
  actions: window.__TEST,
  plan: planData
};
window.__PRODUCT = (() => {
  const cam = (c) => [c.pos[0], c.pos[1], c.pos[2], c.target[0], c.target[1], c.target[2]];
  return {
    title: { name: 'BLACK ICE · 白夜站', start: '#start', hud: '#hud', hudHiddenOnTitle: true },
    screens: ['menu', 'playing', 'paused', 'settings', 'lost', 'won'],
    ui: { start: '#start', hud: '#hud', pause: '#pause', settings: '#settings', end: '#end', touch: '#touch' },
    settings: ['sensitivity', 'volume', 'fov', 'invertY', 'quality'],
    persistence: ['blackice.best', 'blackice.settings'],
    input: { keyboard: true, mouse: true, touch: true },
    content: {
      objectives: [{ id: 'relay-grid', title: '唤醒信标阵列', steps: 4 }],
      roles: ['raider', 'wasp', 'heavy', 'prime', 'supply'],
      tools: ['ar-9', 'arc-coil'],
      beats: ['intro', 'contact', 'relay-alpha', 'relay-bravo', 'relay-charlie', 'climax', 'extraction']
    },
    hud: ['objective', 'compass', 'health', 'ammo', 'prompt', 'subtitles', 'boss'],
    audio: { events: 17, mute: true },
    perf: { maxCalls: 340, maxTris: 900000, maxLights: 14 },
    cameras: [
      { name: 'hero', cam: cam(WORLD.cameras.hero) },
      { name: 'close', cam: cam(WORLD.cameras.close) },
      { name: 'wide', cam: cam(WORLD.cameras.wide) }
    ],
    test: { start: 'start', pause: 'pause', resume: 'resume', settings: 'openSettings', save: 'save', reset: 'reset', plan: 'plan' }
  };
})();
window.__AUDIT = [];

/* ------------------------------- bind UI -------------------------------- */
function bindUi() {
  if (!D.canvas) cacheDom();
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', (e) => { e.preventDefault(); AUDIO.init(); fn(); }); };
  on('btn-start', () => startGame());
  on('btn-settings', () => { AUDIO.init(); openSettingsFrom('menu'); });
  on('btn-controls', () => { AUDIO.init(); openHelp(); });
  on('btn-hclose', closeHelp);
  on('btn-resume', resumeGame);
  on('btn-psettings', () => openSettingsFrom('paused'));
  on('btn-restart', () => startGame());
  on('btn-menu', toMenu);
  on('btn-sclose', closeSettings);
  on('btn-smenu', () => { closeSettings(); toMenu(); });
  on('btn-again', () => startGame());
  on('btn-emenu', toMenu);
  // settings inputs
  if (D.sSens) D.sSens.addEventListener('input', () => { SETTINGS.sens = clamp(+D.sSens.value / 100, 0.2, 2.6); syncSettingsLabels(); saveSettings(); });
  if (D.sVol) D.sVol.addEventListener('input', () => { SETTINGS.vol = +D.sVol.value; AUDIO.setVolume(SETTINGS.vol / 100); syncSettingsLabels(); saveSettings(); });
  if (D.sFov) D.sFov.addEventListener('input', () => { SETTINGS.fov = clamp(+D.sFov.value, 70, 104); syncSettingsLabels(); saveSettings(); });
  if (D.sQuality) {
    for (const b of D.sQuality.querySelectorAll('button')) b.addEventListener('click', () => {
      SETTINGS.quality = b.dataset.q;
      applySettings(false);
      syncSettingsLabels();
    });
  }
  if (D.sInvert) D.sInvert.addEventListener('click', () => { SETTINGS.invert = !SETTINGS.invert; syncSettingsLabels(); saveSettings(); });
  if (D.sMute) D.sMute.addEventListener('click', () => {
    SETTINGS.muted = !SETTINGS.muted;
    AUDIO.setMuted(SETTINGS.muted);
    syncSettingsLabels(); saveSettings();
  });
  window.addEventListener('beforeunload', () => { try { saveSettings(); } catch (e) {} });
}

/* ------------------------------- error ---------------------------------- */
window.addEventListener('error', (e) => { console.error('PAGEERROR: ' + (e.message || 'unknown')); });
window.addEventListener('unhandledrejection', (e) => { console.error('PAGEERROR: ' + (e.reason && e.reason.message || e.reason)); });

/* -------------------------------- start --------------------------------- */
try {
  boot();
} catch (e) {
  console.error('BOOT FAILED: ' + (e && e.stack || e));
  const el = document.getElementById('start');
  if (el) el.innerHTML = '<div style="margin:auto;padding:30px;color:#eee;font-family:monospace">启动失败 / boot failed<br>' + (e && e.message) + '</div>';
}
