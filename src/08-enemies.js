/* =========================================================================
   BLACK ICE — 08 hostiles
   Rigid-part rigs (one draw per unit), three roles and a boss. AI: approach,
   hold range, line-of-sight, telegraphed fire, dodgeable projectiles.
   ========================================================================= */

const ENEMIES = (() => {
  const list = [];
  const bolts = [];
  let kits = null;
  let meshes = {};
  let hooks = {};
  let player = { x: 0, y: 1.7, z: 21, alive: true };
  let time = 0;

  function setPlayer(p) { player = p; }
  function setHooks(h) { hooks = h; }

  function buildAll() {
    kits = {
      raider: buildRaider(),
      wasp: buildWasp(),
      heavy: buildHeavy(),
      prime: buildPrime()
    };
  }
  function init() {
    if (!kits) buildAll();
    for (const k in kits) {
      meshes[k] = GFX.upload(kits[k].geo, true);
      // audit node: invisible at load, but declares identity so the census can see it
      const node = makeMeshNode('rig-' + k, kits[k].geo, { name: k });
      node.visible = false;
      node.userData.identity = identityFor(k, kits[k]);
      node.userData.parts = kits[k].parts;
      node.userData.enemyRig = true;
      node.position.set(0, 0, 0);
      window.__SCENE && window.__SCENE.add(node);
    }
  }
  function identityFor(k, kit) {
    if (k === 'raider') return [
      { name: 'torso', extents: [0.52, 0.62, 0.34] }, { name: 'head', extents: [0.26, 0.28, 0.27] },
      { name: 'rifle', extents: [0.72, 0.1, 0.06] }, { name: 'legL', extents: [0.19, 0.5, 0.23] },
      { name: 'pack', extents: [0.36, 0.42, 0.2] }
    ];
    if (k === 'wasp') return [
      { name: 'body', extents: [0.44, 0.2, 0.5] }, { name: 'eye', extents: [0.15, 0.15, 0.15] },
      { name: 'arms', extents: [0.9, 0.06, 0.7] }, { name: 'blade0', extents: [0.5, 0.01, 0.5] }
    ];
    if (k === 'heavy') return [
      { name: 'torso', extents: [0.8, 0.75, 0.46] }, { name: 'shield', extents: [0.9, 1.35, 0.09] },
      { name: 'cannon', extents: [0.8, 0.22, 0.22] }, { name: 'legL', extents: [0.26, 0.7, 0.28] }
    ];
    return [
      { name: 'core', extents: [2.4, 2.0, 2.4] }, { name: 'plates', extents: [0.9, 0.7, 0.16] },
      { name: 'ring', extents: [0.34, 0.16, 0.12] }, { name: 'cores', extents: [0.36, 0.36, 0.36] }
    ];
  }

  function pivotBone(px, py, pz, rx = 0, ry = 0, rz = 0) {
    const t1 = M4.compose(M4.create(), px, py, pz, 0);
    const r = M4.trs(M4.create(), 0, 0, 0, rx, ry, rz);
    const t2 = M4.compose(M4.create(), -px, -py, -pz, 0);
    const m = M4.create();
    M4.mul(m, t1, r);
    M4.mul(m, m, t2);
    return m;
  }
  function identBone() { return M4.create(); }

  class Hostile {
    constructor(type, x, z, opts = {}) {
      this.type = type;
      this.kit = kits[type];
      this.mesh = meshes[type];
      this.pidx = {};
      for (let i = 0; i < this.kit.parts.length; i++) this.pidx[this.kit.parts[i]] = i;
      this.bones = new Float32Array(16 * 24);
      for (let i = 0; i < 24; i++) this.bones.set(M4.create(), i * 16);
      this.model = M4.create();
      this.x = x; this.z = z;
      this.y = type === 'wasp' ? 2.7 : type === 'prime' ? 6.2 : 0;
      this.baseY = this.y;
      this.yaw = opts.yaw ?? Math.atan2(-x, -z);
      this.walk = Math.random() * TAU;
      this.spawnT = 0.75;
      this.hitFlash = 0;
      this.dead = false;
      this.deathT = 0;
      this.removed = false;
      this.dist = 99;
      this.los = false;
      this.cool = 1.2 + Math.random() * 1.5;
      this.burst = 0; this.bt = 0; this.pending = 0;
      this.flash = 0;
      this.heading = 0;
      this.strafeDir = Math.random() < 0.5 ? 1 : -1;
      this.strafeT = 0;
      this.bobT = Math.random() * 10;
      if (type === 'raider') { this.hp = this.maxHp = 72; this.radius = 0.44; this.height = 1.8; this.score = 100; }
      else if (type === 'wasp') { this.hp = this.maxHp = 36; this.radius = 0.5; this.height = 0.6; this.score = 130; }
      else if (type === 'heavy') { this.hp = this.maxHp = 210; this.radius = 0.62; this.height = 1.9; this.score = 320; }
      else { this.hp = this.maxHp = 1150; this.radius = 1.7; this.height = 3.0; this.score = 2500; }
      this.role = type;
      if (hooks.onSpawn) hooks.onSpawn(this);
      FX.warp([x, 0.15, z]);
    }
    part(name) { const i = this.pidx[name]; return i === undefined ? -1 : i; }
    writeBone(name, m) {
      const i = this.part(name);
      if (i >= 0) this.bones.set(m, i * 16);
    }
    muzzle() {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      if (this.type === 'wasp') return [this.x + fx * 0.5, this.y - 0.05, this.z + fz * 0.5];
      if (this.type === 'prime') return [this.x + fx * 1.3, this.y + 0.2, this.z + fz * 1.3];
      if (this.type === 'heavy') return [this.x + rx * -0.42 + fx * 0.9, 1.25, this.z + rz * -0.42 + fz * 0.9];
      return [this.x + rx * 0.24 + fx * 0.8, 1.15, this.z + rz * 0.24 + fz * 0.8];
    }
    damage(amount, opts = {}) {
      if (this.dead) return 0;
      let dmg = amount;
      if (this.type === 'heavy' && opts.from) {
        const ang = Math.abs(((Math.atan2(opts.from[0] - this.x, opts.from[2] - this.z) - this.yaw + PI * 3) % TAU) - PI);
        if (ang > 2.0) dmg *= 0.55; // shield covers the front
      }
      if (opts.head) dmg *= 1.9;
      this.hp -= dmg;
      this.hitFlash = 0.09;
      if (hooks.onHurt) hooks.onHurt(this, dmg, opts);
      if (this.hp <= 0) this.kill(opts);
      return dmg;
    }
    kill(opts = {}) {
      if (this.dead) return;
      this.dead = true; this.deathT = 0;
      const p = [this.x, this.type === 'prime' ? this.y : 1.1, this.z];
      FX.explosion(p, this.type === 'prime' ? 2.2 : this.type === 'heavy' ? 1.1 : 0.7);
      for (let i = 0; i < 6; i++) FX.smoke([p[0] + rand(-0.6, 0.6), p[1] + rand(0, 0.8), p[2] + rand(-0.6, 0.6)], 0.7, 1.4, [0.2, 0.19, 0.18, 0.22]);
      if (hooks.onKilled) hooks.onKilled(this);
    }
    update(dt) {
      time += 0; // time passed from game
      this.bobT += dt;
      if (this.dead) {
        this.deathT += dt;
        const t = Math.min(1, this.deathT / 2.4);
        if (this.type === 'prime') {
          this.y = Math.max(0.2, this.baseY * (1 - t * 0.85));
        } else if (this.type === 'wasp') {
          this.y = Math.max(0.12, this.y - dt * (2 + t * 8));
        }
        this.yaw += dt * 0.8;
        const sc = 1 - t * 0.35;
        M4.trs(this.model, this.x, this.y, this.z, 0, this.yaw, 0, sc, Math.max(0.25, 1 - t * 0.7), sc);
        this.rigDeath(dt, t);
        if (this.deathT > 2.6) this.removed = true;
        return;
      }
      if (this.spawnT > 0) this.spawnT -= dt;
      const dx = player.x - this.x, dz = player.z - this.z;
      this.dist = Math.hypot(dx, dz);
      this.heading = Math.atan2(dx, dz);
      const losNow = losClear(this.x, this.z, player.x, player.z);
      this.los = losNow;
      const moveSpeed = this.type === 'wasp' ? 3.4 : this.type === 'prime' ? 1.25 : this.type === 'heavy' ? 1.25 : 2.65;
      const turnRate = 4.0;
      let da = ((this.heading - this.yaw + PI * 3) % TAU) - PI;
      this.yaw += clamp(da, -turnRate * dt, turnRate * dt);

      // ---- movement ----
      if (this.spawnT <= 0) {
        let mvx = 0, mvz = 0;
        const preferred = this.type === 'wasp' ? 9 : this.type === 'prime' ? 12 : this.type === 'heavy' ? 8 : 9.5;
        const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
        const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
        if (this.dist > preferred + 2) { mvx += fx; mvz += fz; }
        else if (this.dist < preferred - 3) { mvx -= fx; mvz -= fz; }
        else {
          this.strafeT -= dt;
          if (this.strafeT <= 0) { this.strafeT = rand(2.8, 1.2); this.strafeDir *= -1; }
          mvx += rx * this.strafeDir * 0.8; mvz += rz * this.strafeDir * 0.8;
        }
        if (this.dist < 2.4 && (this.type === 'raider' || this.type === 'heavy')) { mvx -= fx * 0.8; mvz -= fz * 0.8; }
        const ml = Math.hypot(mvx, mvz) || 1;
        const step = moveSpeed * dt;
        let tx = this.x + mvx / ml * step, tz = this.z + mvz / ml * step;
        const B = SITE.bounds;
        tx = clamp(tx, B.x0 + 0.8, B.x1 - 0.8); tz = clamp(tz, B.z0 + 0.8, B.z1 - 0.8);
        if (!WORLD.collides(tx, tz)) { this.x = tx; this.z = tz; this.walk += step * 2.2; }
        else {
          // slide around the obstruction
          const side = (this.walk % 2 < 1 ? 1 : -1) * this.strafeDir;
          const ax = this.x + rx * side * step, az = this.z + rz * side * step;
          if (!WORLD.collides(ax, az)) { this.x = ax; this.z = az; this.walk += step * 2.2; }
        }
        this.y = this.type === 'wasp' ? 2.55 + Math.sin(this.bobT * 1.7) * 0.45
          : this.type === 'prime' ? 6.1 + Math.sin(this.bobT * 0.9) * 0.35 : 0;
      }

      // ---- combat ----
      if (this.spawnT <= 0) {
        this.cool -= dt;
        if (this.pending > 0) {
          this.pending -= dt;
          if (this.pending <= 0) { this.burst = this.type === 'heavy' ? 5 : 3; this.bt = 0; }
        }
        if (this.burst > 0) {
          this.bt -= dt;
          if (this.bt <= 0) {
            this.bt = this.type === 'heavy' ? 0.16 : 0.125;
            this.burst--;
            this.shoot();
          }
        } else if (this.cool <= 0 && this.dist < 30 && this.los) {
          this.pending = this.type === 'prime' ? 0.6 : this.type === 'heavy' ? 0.55 : 0.38;
          this.cool = this.type === 'prime' ? 3.6 : this.type === 'heavy' ? 3.6 : 2.5 + Math.random() * 1.0;
          if (this.type === 'prime') { this.pending = 0; this.burst = 0; this.primeAttack(); this.cool = 3.4; }
        }
        if (this.type === 'prime') this.bossTick(dt);
        if (this.type === 'wasp') this.waspTick(dt);
      }
      this.flash = Math.max(0, this.flash - dt);
      this.layout();
    }
    waspTick(dt) {
      this.cool -= dt;
      if (this.cool <= 0 && this.dist < 26 && this.los) {
        this.cool = 2.4 + Math.random() * 1.4;
        this.fireBolt(this.muzzle(), [player.x, 1.2, player.z], 8, 0.9);
        FX.muzzle(this.muzzle(), [Math.sin(this.yaw), 0, Math.cos(this.yaw)]);
        if (hooks.onEnemyShot) hooks.onEnemyShot(this);
      }
    }
    primeAttack() {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + time * 0.2;
        const ox = this.x + Math.cos(a) * 1.2, oz = this.z + Math.sin(a) * 1.2;
        this.fireBolt([ox, this.y - 0.2, oz], [player.x, 1.0, player.z], 11, 2.0, a);
      }
      FX.explosion([this.x, this.y, this.z], 0.9);
      if (hooks.onEnemyShot) hooks.onEnemyShot(this, true);
    }
    bossTick(dt) {
      this.summonT = (this.summonT || 6) - dt;
      if (this.summonT <= 0) {
        this.summonT = 11;
        const alive = list.filter(e => !e.dead && e.type === 'wasp').length;
        if (alive < 3) {
          for (let i = 0; i < 2; i++) {
            const a = Math.random() * TAU;
            const sx = clamp(this.x + Math.cos(a) * 4, SITE.bounds.x0 + 3, SITE.bounds.x1 - 3);
            const sz = clamp(this.z + Math.sin(a) * 4, SITE.bounds.z0 + 3, SITE.bounds.z1 - 3);
            spawn('wasp', sx, sz);
          }
          if (hooks.onWave) hooks.onWave('prime-summon');
        }
      }
    }
    shoot() {
      const from = this.muzzle();
      const dir = [Math.sin(this.yaw), 0, Math.cos(this.yaw)];
      FX.muzzle(from, dir);
      this.flash = 0.07;
      const muzzleWorld = from;
      const target = [player.x + rand(0.55, -0.55), rand(1.45, 0.9), player.z + rand(0.55, -0.55)];
      // accuracy falls with range
      const acc = this.type === 'heavy' ? 0.52 : 0.62;
      const hitChance = clamp(acc * (1 - this.dist / 45), 0.16, 0.8);
      const doesHit = this.los && Math.random() < hitChance;
      const end = doesHit ? target : [target[0] + rand(1.4, -1.4), target[1] + rand(0.9, -0.9), target[2] + rand(1.4, -1.4)];
      FX.tracer(from, end, true, 0.014, 0.06);
      if (doesHit && hooks.onPlayerHit) {
        hooks.onPlayerHit(this.type === 'heavy' ? 9 : 6, this, from);
      }
      if (hooks.onEnemyShot) hooks.onEnemyShot(this);
    }
    fireBolt(from, target, dmg, speed, spread = null) {
      const dx = target[0] - from[0], dy = target[1] - from[1], dz = target[2] - from[2];
      const l = Math.hypot(dx, dy, dz) || 1;
      let vx = dx / l * speed, vy = dy / l * speed, vz = dz / l * speed;
      if (spread !== null) { vx = Math.cos(spread + this.yaw) * speed * 0.65; vz = Math.sin(spread + this.yaw) * speed * 0.65; vy = -1.0; }
      bolts.push({ x: from[0], y: from[1], z: from[2], vx, vy, vz, life: 4.2, dmg, owner: this.type, cyan: this.type === 'wasp' || this.type === 'prime' });
    }
    layout() {
      const bob = (this.type === 'wasp' || this.type === 'prime') ? Math.sin(this.bobT * 1.9) * 0.08 : Math.sin(this.walk * 2) * 0.025;
      if (this.type === 'prime') {
        M4.trs(this.model, this.x, this.y, this.z, Math.sin(this.bobT * 0.6) * 0.06, this.yaw, 0);
        const base = M4.compose(M4.create(), 0, 0, 0, 0);
        for (const p of ['core', 'plates', 'cores', 'eyes', 'spikes', 'under']) this.writeBone(p, base);
        this.writeBone('ring', pivotBone(0, -0.2, 0, 0, this.bobT * 0.55, 0));
      } else if (this.type === 'wasp') {
        M4.trs(this.model, this.x, this.y, this.z, Math.sin(this.bobT * 2.3) * 0.12, this.yaw, Math.sin(this.bobT * 1.1) * 0.06);
        const base = M4.compose(M4.create(), 0, bob, 0, 0);
        for (const p of ['body', 'eye', 'arms', 'antenna', 'light', 'gun', 'legs', 'snow']) this.writeBone(p, base);
        const hubs = [[0.48, 0.38], [-0.48, 0.38], [0.48, -0.38], [-0.48, -0.38]];
        for (let i = 0; i < 4; i++) {
          const m = M4.mul(M4.create(), base, pivotBone(hubs[i][0], 0.09, hubs[i][1], 0, this.bobT * 38 + i, 0));
          this.writeBone('blade' + i, m);
        }
      } else {
        M4.compose(this.model, this.x, this.y, this.z, this.yaw);
        const base = M4.compose(M4.create(), 0, bob, 0, 0);
        for (const p of ['torso', 'head', 'shoulders', 'pack', 'rifle', 'shield', 'cannon']) this.writeBone(p, base);
        const swing = Math.sin(this.walk * 2);
        const swing2 = Math.sin(this.walk * 2 + PI);
        const hipY = this.type === 'heavy' ? 0.86 : 0.94;
        this.writeBone('legL', M4.mul(M4.create(), base, pivotBone(-0.15, hipY, 0.05, swing * 0.42, 0, 0)));
        this.writeBone('legR', M4.mul(M4.create(), base, pivotBone(0.15, hipY, 0.05, swing2 * 0.42, 0, 0)));
        const aim = Math.sin(this.bobT * 1.1) * 0.03;
        this.writeBone('head', M4.mul(M4.create(), base, pivotBone(0, 1.52, 0, aim, 0, 0)));
        if (this.torsoTwist === undefined) this.torsoTwist = 0;
      }
      // muzzle flash point light replacement: a glow sprite on every shot is spawned by shoot()
    }
    rigDeath(dt, t) {
      const base = M4.compose(M4.create(), 0, -t * 0.25, 0, 0);
      for (const p of this.kit.parts) this.writeBone(p, base);
      if (this.type !== 'prime' && this.type !== 'wasp') {
        this.writeBone('legL', M4.mul(M4.create(), base, pivotBone(-0.15, 0.9, 0, t * 1.3, 0, 0.2)));
        this.writeBone('legR', M4.mul(M4.create(), base, pivotBone(0.15, 0.9, 0, t * 1.0, 0, -0.2)));
      }
    }
  }

  function rand(a = 1, b = 0) { return b + Math.random() * (a - b); }
  function losClear(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const d = Math.hypot(dx, dz);
    const n = Math.ceil(d / 0.8);
    for (let i = 1; i < n; i++) {
      const x = ax + dx * i / n, z = az + dz * i / n;
      for (const c of WORLD.colliders) {
        if (c.y1 < 1.15) continue;
        if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return false;
      }
    }
    return true;
  }
  function pointBlocked(x, z, y) {
    for (const c of WORLD.colliders) {
      if (y > c.y1 || y < c.y0) continue;
      if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true;
    }
    return false;
  }

  function spawn(type, x, z, opts = {}) {
    if (list.filter(e => !e.dead).length >= 10) return null;
    const e = new Hostile(type, x, z, opts);
    list.push(e);
    return e;
  }
  function reset() {
    list.length = 0; bolts.length = 0;
  }
  function update(dt, simTime) {
    time = simTime;
    for (const e of list) e.update(dt);
    // projectiles
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.vy -= 1.2 * dt;
      FX.glow([b.x, b.y, b.z], 0.42, b.cyan ? [0.4, 2.2, 2.8, 0.9] : [2.8, 0.6, 0.25, 0.9], 0.045);
      if (Math.random() < 0.5) FX.glow([b.x - b.vx * 0.03, b.y - b.vy * 0.03, b.z - b.vz * 0.03], 0.24, b.cyan ? [0.25, 1.3, 1.7, 0.4] : [1.6, 0.35, 0.15, 0.4], 0.03);
      let die = b.life <= 0 || b.y < 0.05;
      if (!die && pointBlocked(b.x, b.z, b.y)) { die = true; FX.impact([b.x, b.y, b.z], [0, 0.8, 0], false); }
      if (!die && player.alive) {
        const pd = Math.hypot(b.x - player.x, b.y - (player.y - 0.35), b.z - player.z);
        if (pd < 0.72) {
          die = true;
          FX.impact([b.x, b.y, b.z], [0, 0.5, 0], false);
          if (hooks.onPlayerHit) hooks.onPlayerHit(b.dmg, { type: b.owner, x: b.x, z: b.z }, [b.x, b.y, b.z]);
        }
      }
      if (die) bolts.splice(i, 1);
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].removed) list.splice(i, 1);
  }

  function raycast(origin, dir, maxDist) {
    // segment vs hit spheres; head sphere gives a bonus
    let best = null;
    for (const e of list) {
      if (e.dead || e.spawnT > 0.3) continue;
      let spheres;
      if (e.type === 'prime') spheres = [[e.x, e.y, e.z, 1.7, false]];
      else if (e.type === 'wasp') spheres = [[e.x, e.y, e.z, 0.55, false]];
      else {
        const sy = e.type === 'heavy' ? 1.15 : 1.05;
        const hh = e.type === 'heavy' ? 1.62 : 1.66;
        spheres = [[e.x, sy, e.z, e.type === 'heavy' ? 0.62 : 0.44, false], [e.x, hh, e.z, e.type === 'heavy' ? 0.3 : 0.24, true]];
      }
      for (const [sx, sy, sz, sr, head] of spheres) {
        const ox = sx - origin[0], oy = sy - origin[1], oz = sz - origin[2];
        const t = ox * dir[0] + oy * dir[1] + oz * dir[2];
        if (t < 0 || t > maxDist) continue;
        const px = origin[0] + dir[0] * t, py = origin[1] + dir[1] * t, pz = origin[2] + dir[2] * t;
        const dd = Math.hypot(px - sx, py - sy, pz - sz);
        if (dd <= sr) {
          if (!best || t < best.t) best = { enemy: e, t, point: [px, py, pz], head, radius: sr };
        }
      }
    }
    return best;
  }
  function raycastWorld(origin, dir, maxDist) {
    for (const c of WORLD.colliders) {
      // ray vs AABB (slab)
      let tmin = 0, tmax = maxDist;
      for (let a = 0; a < 3; a++) {
        const o = a === 0 ? origin[0] : a === 1 ? origin[1] : origin[2];
        const d = a === 0 ? dir[0] : a === 1 ? dir[1] : dir[2];
        const lo = a === 0 ? c.x0 : a === 1 ? c.y0 : c.z0;
        const hi = a === 0 ? c.x1 : a === 1 ? c.y1 : c.z1;
        if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { tmin = 1e9; break; } continue; }
        let t1 = (lo - o) / d, t2 = (hi - o) / d;
        if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) { tmin = 1e9; break; }
      }
      if (tmin < 1e8 && tmin >= 0) {
        return { t: tmin, point: [origin[0] + dir[0] * tmin, origin[1] + dir[1] * tmin, origin[2] + dir[2] * tmin], col: c };
      }
    }
    // ground
    if (dir[1] < -1e-4) {
      const t = (0 - origin[1]) / dir[1];
      if (t > 0 && t < maxDist) return { t, point: [origin[0] + dir[0] * t, 0, origin[2] + dir[2] * t], ground: true };
    }
    return null;
  }
  function aliveCount() { return list.filter(e => !e.dead).length; }
  function clearBoss() { list.filter(e => e.type === 'prime').forEach(e => e.kill({})); }
  function boss() { return list.find(e => e.type === 'prime' && !e.dead) || null; }

  return { init, spawn, reset, update, raycast, raycastWorld, setPlayer, setHooks, aliveCount,
    get list() { return list; }, get bolts() { return bolts; }, clearBoss, boss };
})();
