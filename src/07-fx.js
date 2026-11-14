/* =========================================================================
   BLACK ICE — 07 effects
   Sparks, tracers, arc bolts, muzzle flashes, impacts and decals. Everything
   is pooled and written into flat attribute arrays once per frame.
   ========================================================================= */

const FX = (() => {
  const MAX_PARTS = 620, MAX_RIBBONS = 160, MAX_SPRITES = 120, MAX_DECALS = 72;
  const parts = [];
  const ribbons = [];
  const sprites = [];
  const decals = [];
  const sparkArr = new Float32Array(MAX_PARTS * 8);
  const ribbonArr = new Float32Array(MAX_RIBBONS * 6 * 7);
  const spriteArr = new Float32Array(MAX_SPRITES * 6 * 10);
  const decalArr = new Float32Array(MAX_DECALS * 6 * 9);
  let sparkCount = 0, ribbonCount = 0, spriteCount = 0, decalCount = 0;
  const tmpColor = [1, 1, 1, 1];

  function rand(a = 1, b = 0) { return b + Math.random() * (a - b); }

  function reset() {
    parts.length = 0; ribbons.length = 0; sprites.length = 0; decals.length = 0;
  }
  function addPart(x, y, z, vx, vy, vz, life, size, color, grav = 6, drag = 1.2) {
    if (parts.length >= MAX_PARTS) parts.shift();
    parts.push({ x, y, z, vx, vy, vz, life, max: life, size, color: color.slice(), grav, drag });
  }
  function addRibbon(a, b, color, width, life) {
    if (ribbons.length >= MAX_RIBBONS) ribbons.shift();
    ribbons.push({ a: a.slice(), b: b.slice(), color: color.slice(), width, life, max: life });
  }
  function addSprite(pos, size, color, kind, life, grow = 0, rot = 0) {
    if (sprites.length >= MAX_SPRITES) sprites.shift();
    sprites.push({ pos: pos.slice(), size, color: color.slice(), kind, life, max: life, grow, rot });
  }
  function addDecal(pos, normal, size, color, life) {
    if (decals.length >= MAX_DECALS) decals.shift();
    decals.push({ pos: pos.slice(), normal: normal.slice(), size, color: color.slice(), life, max: life, rot: rand(TAU) });
  }

  function tracer(a, b, warm = true, width = 0.018, life = 0.07) {
    // Sprite streak instead of a ribbon: a billboard ribbon at point-blank range
    // can blow up into screen-filling triangles. Short glows are stable.
    const c = warm ? [2.6, 1.25, 0.46, 0.9] : [1.7, 0.55, 0.2, 0.9];
    const n = 7;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      addSprite([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)], 0.14, c, 3, life, 0.02, 0);
    }
    addSprite(b, 0.22, [2.4, 0.95, 0.32, 0.6], 3, life * 1.3, 0.12, 0);
  }
  function muzzle(pos, dir) {
    // smooth, small quads: stars at point-blank range produce giant spikes
    addSprite([pos[0] + dir[0] * 0.10, pos[1] + dir[1] * 0.10, pos[2] + dir[2] * 0.10], 0.085, [3.6, 1.9, 0.62, 0.95], 3, 0.055, 0.02, 0);
    addSprite([pos[0] + dir[0] * 0.06, pos[1] + dir[1] * 0.06, pos[2] + dir[2] * 0.06], 0.045, [4.6, 3.0, 1.4, 0.9], 3, 0.040, 0.0, 0);
    for (let i = 0; i < 3; i++) {
      addPart(pos[0], pos[1], pos[2], dir[0] * rand(7, 2) + rand(1.2, -1.2), dir[1] * rand(7, 2) + rand(1.2, -1.2), dir[2] * rand(7, 2) + rand(1.2, -1.2),
        rand(0.1, 0.03), rand(0.035, 0.012), [3.0, 1.3, 0.4, 1], 1, 1.5);
    }
    addSprite([pos[0] + dir[0] * 0.2, pos[1] + dir[1] * 0.2, pos[2] + dir[2] * 0.2], 0.22, [1.4, 1.1, 0.8, 0.10], 1, 0.18, 0.12, rand(TAU));
  }
  function impact(pos, normal, snow = false) {
    const n = normal;
    if (snow) {
      addSprite(pos, 0.3, [1.15, 1.2, 1.3, 0.55], 1, 0.3, 0.8, rand(TAU));
      for (let i = 0; i < 8; i++) {
        addPart(pos[0], pos[1], pos[2],
          n[0] * rand(2.2, 0.3) + rand(1.6, -1.6), Math.abs(n[1]) * rand(2.0, 0.4) + rand(2.2, 0.2), n[2] * rand(2.2, 0.3) + rand(1.6, -1.6),
          rand(0.55, 0.18), rand(0.045, 0.012), [1.15, 1.25, 1.38, 0.75], 7.5, 1.7);
      }
      addDecal(pos, n, rand(0.15, 0.07), [0.10, 0.13, 0.16, 0.45], 26);
    } else {
      addSprite(pos, 0.22, [1.7, 0.85, 0.3, 0.7], 0, 0.08, 0.2, rand(TAU));
      for (let i = 0; i < 7; i++) {
        addPart(pos[0], pos[1], pos[2],
          n[0] * rand(3.2, 0.5) + rand(2.4, -2.4), Math.abs(n[1]) * rand(2.6, 0.2) + rand(2.8, 0.5), n[2] * rand(3.2, 0.5) + rand(2.4, -2.4),
          rand(0.4, 0.08), rand(0.03, 0.009), [3.4, 1.4, 0.35, 1], 9, 1.4);
      }
      addDecal(pos, n, rand(0.11, 0.05), [0.026, 0.024, 0.022, 0.8], 30);
      addSprite(pos, 0.32, [0.16, 0.15, 0.14, 0.28], 1, 0.55, 0.9, rand(TAU));
    }
  }
  function hit(pos, cyan = false) {
    const c = cyan ? [0.45, 2.3, 2.6, 1] : [2.6, 0.55, 0.32, 1];
    for (let i = 0; i < 7; i++) {
      addPart(pos[0], pos[1], pos[2], rand(3, -3), rand(3, -1), rand(3, -3), rand(0.28, 0.08), rand(0.03, 0.01), c, 7, 1.4);
    }
    addSprite(pos, 0.16, cyan ? [0.5, 2.6, 3.0, 0.8] : [3.0, 0.5, 0.25, 0.8], 0, 0.06, 0.1, rand(TAU));
  }
  function arcBolt(from, targets) {
    for (const t of targets) {
      const segs = 5;
      let px = from[0], py = from[1], pz = from[2];
      for (let i = 1; i <= segs; i++) {
        const f = i / segs;
        const damp = 1 - Math.abs(f - 0.5) * 1.2;
        const nx = lerp(from[0], t[0], f) + rand(0.32, -0.32) * damp;
        const ny = lerp(from[1], t[1], f) + rand(0.32, -0.32) * damp;
        const nz = lerp(from[2], t[2], f) + rand(0.32, -0.32) * damp;
        for (let k = 1; k <= 3; k++) {
          const tt = k / 4;
          addSprite([lerp(px, nx, tt), lerp(py, ny, tt), lerp(pz, nz, tt)], 0.16,
            k === 2 ? [1.2, 3.4, 4.0, 0.95] : [0.35, 2.2, 2.8, 0.85], 3, 0.10, 0.02, rand(TAU));
        }
        px = nx; py = ny; pz = nz;
      }
      addSprite(t, 0.55, [0.35, 2.4, 2.9, 0.95], 3, 0.16, 0.7, rand(TAU));
      for (let i = 0; i < 8; i++) addPart(t[0], t[1], t[2], rand(3, -3), rand(3, -1), rand(3, -3), rand(0.4, 0.1), rand(0.03, 0.01), [0.4, 2.2, 2.7, 1], 5, 1.5);
    }
    addSprite(from, 0.42, [0.4, 2.2, 2.8, 0.8], 3, 0.12, 0.2, 0);
  }
  function explosion(pos, scale = 1) {
    addSprite(pos, 1.1 * scale, [4.2, 1.6, 0.42, 0.95], 0, 0.16, 0.8, rand(TAU));
    addSprite(pos, 1.8 * scale, [1.4, 0.65, 0.3, 0.4], 1, 0.9, 1.8, rand(TAU));
    for (let i = 0; i < 22; i++) {
      addPart(pos[0], pos[1], pos[2], rand(8, -8) * scale, rand(8, 0.5) * scale, rand(8, -8) * scale,
        rand(0.8, 0.2), rand(0.06, 0.015), [3.6, 1.45, 0.35, 1], 9, 0.9);
    }
    for (let i = 0; i < 4; i++) addSprite([pos[0] + rand(1.2, -1.2), pos[1] + rand(0.8, 0.1), pos[2] + rand(1.2, -1.2)],
      0.9 * scale, [0.18, 0.16, 0.15, 0.35], 1, rand(1.6, 0.6), 1.4, rand(TAU));
  }
  function warp(pos) {
    addSprite(pos, 1.2, [0.35, 2.0, 2.6, 0.5], 3, 0.7, 1.4, rand(TAU));
    for (let i = 0; i < 18; i++) {
      const a = rand(TAU);
      addPart(pos[0] + Math.cos(a) * rand(0.9, 0.2), 0.1, pos[2] + Math.sin(a) * rand(0.9, 0.2),
        Math.cos(a) * 0.2, rand(3.2, 0.8), Math.sin(a) * 0.2, rand(0.9, 0.4), rand(0.025, 0.008), [0.35, 2.3, 2.8, 0.9], -0.5, 0.4);
    }
  }
  function glow(pos, size, color, life = 0.05) {
    addSprite(pos, size, color, 0, life, 0, 0);
  }
  function smoke(pos, size, life, color) {
    addSprite(pos, size, color, 1, life, 0.8, rand(TAU));
  }

  function update(dt, time) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy -= p.grav * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02) { p.y = 0.02; p.vy *= -0.25; p.vx *= 0.5; p.vz *= 0.5; }
    }
    for (let i = ribbons.length - 1; i >= 0; i--) { ribbons[i].life -= dt; if (ribbons[i].life <= 0) ribbons.splice(i, 1); }
    for (let i = sprites.length - 1; i >= 0; i--) {
      const s = sprites[i]; s.life -= dt;
      if (s.life <= 0) sprites.splice(i, 1); else s.size += s.grow * dt;
    }
    for (let i = decals.length - 1; i >= 0; i--) { decals[i].life -= dt; if (decals[i].life <= 0) decals.splice(i, 1); }
  }

  function build(camPos, right, up, forward) {
    // sparks
    sparkCount = 0;
    for (const p of parts) {
      const k = p.life / p.max;
      sparkArr[sparkCount * 8] = p.x; sparkArr[sparkCount * 8 + 1] = p.y; sparkArr[sparkCount * 8 + 2] = p.z;
      sparkArr[sparkCount * 8 + 3] = p.color[0] * p.color[3];
      sparkArr[sparkCount * 8 + 4] = p.color[1] * p.color[3];
      sparkArr[sparkCount * 8 + 5] = p.color[2] * p.color[3];
      sparkArr[sparkCount * 8 + 6] = p.color[3] * Math.min(1, k * 2.4);
      sparkArr[sparkCount * 8 + 7] = p.size * (0.4 + 0.6 * k);
      sparkCount++;
    }
    // ribbons (camera-billboarded quads)
    ribbonCount = 0;
    for (const r of ribbons) {
      const d = [r.b[0] - r.a[0], r.b[1] - r.a[1], r.b[2] - r.a[2]];
      const mid = [(r.a[0] + r.b[0]) / 2, (r.a[1] + r.b[1]) / 2, (r.a[2] + r.b[2]) / 2];
      const view = [camPos[0] - mid[0], camPos[1] - mid[1], camPos[2] - mid[2]];
      let sx = d[1] * view[2] - d[2] * view[1];
      let sy = d[2] * view[0] - d[0] * view[2];
      let sz = d[0] * view[1] - d[1] * view[0];
      const sl = Math.hypot(sx, sy, sz) || 1;
      const w = r.width / 2;
      sx = sx / sl * w; sy = sy / sl * w; sz = sz / sl * w;
      const a = 1 - (r.life / r.max) * 0.05;
      const al = Math.min(1, r.life / r.max * 1.6) * a;
      const c = r.color;
      const base = ribbonCount * 6 * 7;
      const verts = [
        [r.a[0] - sx, r.a[1] - sy, r.a[2] - sz], [r.a[0] + sx, r.a[1] + sy, r.a[2] + sz],
        [r.b[0] + sx, r.b[1] + sy, r.b[2] + sz], [r.a[0] - sx, r.a[1] - sy, r.a[2] - sz],
        [r.b[0] + sx, r.b[1] + sy, r.b[2] + sz], [r.b[0] - sx, r.b[1] - sy, r.b[2] - sz]
      ];
      for (let i = 0; i < 6; i++) {
        const v = verts[i], o = base + i * 7;
        ribbonArr[o] = v[0]; ribbonArr[o + 1] = v[1]; ribbonArr[o + 2] = v[2];
        ribbonArr[o + 3] = c[0]; ribbonArr[o + 4] = c[1]; ribbonArr[o + 5] = c[2]; ribbonArr[o + 6] = c[3] * al;
      }
      ribbonCount++;
    }
    // sprites
    spriteCount = 0;
    for (const s of sprites) {
      const k = s.life / s.max;
      const cr = Math.cos(s.rot), sr = Math.sin(s.rot);
      const rx = right[0] * cr + up[0] * sr, ry = right[1] * cr + up[1] * sr, rz = right[2] * cr + up[2] * sr;
      const ux = up[0] * cr - right[0] * sr, uy = up[1] * cr - right[1] * sr, uz = up[2] * cr - right[2] * sr;
      const h = s.size;
      const corners = [[-1, -1, 0, 1], [1, -1, 1, 1], [1, 1, 1, 0], [-1, -1, 0, 1], [1, 1, 1, 0], [-1, 1, 0, 0]];
      const base = spriteCount * 6 * 10;
      const col = s.color;
      for (let i = 0; i < 6; i++) {
        const c = corners[i];
        const px = s.pos[0] + rx * c[0] * h * 0.5 + ux * c[1] * h * 0.5;
        const py = s.pos[1] + ry * c[0] * h * 0.5 + uy * c[1] * h * 0.5;
        const pz = s.pos[2] + rz * c[0] * h * 0.5 + uz * c[1] * h * 0.5;
        const o = base + i * 10;
        spriteArr[o] = px; spriteArr[o + 1] = py; spriteArr[o + 2] = pz;
        spriteArr[o + 3] = c[2]; spriteArr[o + 4] = c[3];
        spriteArr[o + 5] = col[0]; spriteArr[o + 6] = col[1]; spriteArr[o + 7] = col[2];
        spriteArr[o + 8] = col[3] * Math.min(1, k * 2.2);
        spriteArr[o + 9] = s.kind;
      }
      spriteCount++;
    }
    // decals
    decalCount = 0;
    for (const d of decals) {
      const n = d.normal;
      let t1 = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      let tx = t1[1] * n[2] - t1[2] * n[1], ty = t1[2] * n[0] - t1[0] * n[2], tz = t1[0] * n[1] - t1[1] * n[0];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      const bx = n[1] * tz - n[2] * ty, by = n[2] * tx - n[0] * tz, bz = n[0] * ty - n[1] * tx;
      const h = d.size * 0.5;
      const px = d.pos[0] + n[0] * 0.012, py = d.pos[1] + n[1] * 0.012, pz = d.pos[2] + n[2] * 0.012;
      const base = decalCount * 6 * 9;
      const corners = [[-1, -1, 0, 1], [1, -1, 1, 1], [1, 1, 1, 0], [-1, -1, 0, 1], [1, 1, 1, 0], [-1, 1, 0, 0]];
      const a = d.color[3] * Math.min(1, d.life / Math.min(6, d.max));
      for (let i = 0; i < 6; i++) {
        const c = corners[i];
        const o = base + i * 9;
        decalArr[o] = px + (tx * c[0] + bx * c[1]) * h;
        decalArr[o + 1] = py + (ty * c[0] + by * c[1]) * h;
        decalArr[o + 2] = pz + (tz * c[0] + bz * c[1]) * h;
        decalArr[o + 3] = c[2]; decalArr[o + 4] = c[3];
        decalArr[o + 5] = d.color[0]; decalArr[o + 6] = d.color[1]; decalArr[o + 7] = d.color[2];
        decalArr[o + 8] = a;
      }
      decalCount++;
    }
    return {
      sparks: sparkArr.subarray(0, sparkCount * 8),
      ribbons: ribbonArr.subarray(0, ribbonCount * 6 * 7),
      sprites: spriteArr.subarray(0, spriteCount * 6 * 10),
      decals: decalArr.subarray(0, decalCount * 6 * 9)
    };
  }

  return { reset, update, build, tracer, muzzle, impact, hit, arcBolt, explosion, warp, glow, smoke,
    get partCount() { return parts.length; }, get spriteCount() { return sprites.length; } };
})();
