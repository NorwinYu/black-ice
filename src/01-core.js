/* =========================================================================
   BLACK ICE — 01 core: math, deterministic RNG, minimal scene graph
   Everything is written for this project. No third-party code.
   ========================================================================= */
'use strict';

const TAU = Math.PI * 2, PI = Math.PI, DEG = PI / 180;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => (v - a) / (b - a || 1e-9);
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0 || 1e-9), 0, 1); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const dist2 = (x, z, a, b) => Math.hypot(x - a, z - b);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = (() => {
  const q = new URLSearchParams(location.search);
  const n = parseInt(q.get('seed') || '7', 10);
  return Number.isFinite(n) ? n : 7;
})();
const rng = mulberry32(SEED * 9173 + 11);
const rnd = (a = 1, b = 0) => b + rng() * (a - b);
const rndi = (n) => Math.floor(rng() * n);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

/* ---------- colors: sRGB hex -> linear float triplet ---------- */
function srgbToLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function C(hex) {
  const n = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}
function jitterColor(c, amt) {
  const k = 1 + (rng() * 2 - 1) * amt;
  return [c[0] * k, c[1] * k, c[2] * k];
}

/* ---------- vec3 ---------- */
class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  setFromMatrixPosition(m) { this.x = m[12]; this.y = m[13]; this.z = m[14]; return this; }
  setFromMatrixScale(m) {
    this.x = Math.hypot(m[0], m[1], m[2]);
    this.y = Math.hypot(m[4], m[5], m[6]);
    this.z = Math.hypot(m[8], m[9], m[10]);
    return this;
  }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
}

/* ---------- mat4 (column-major, WebGL order) ---------- */
const M4 = {
  create() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  identity(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  copy(o, a) { o.set(a); return o; },
  mul(o, a, b) {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let rI = 0; rI < 4; rI++) {
      r[c * 4 + rI] = a[rI] * b[c * 4] + a[4 + rI] * b[c * 4 + 1] + a[8 + rI] * b[c * 4 + 2] + a[12 + rI] * b[c * 4 + 3];
    }
    o.set(r); return o;
  },
  perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o.fill(0); o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf;
    return o;
  },
  ortho(o, l, r, b, t, n, f) {
    o.fill(0);
    o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
    o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1;
    return o;
  },
  lookAt(o, eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    o[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    o[15] = 1;
    return o;
  },
  invert(o, a) {
    const m = a;
    const b00 = m[0] * m[5] - m[1] * m[4], b01 = m[0] * m[6] - m[2] * m[4], b02 = m[0] * m[7] - m[3] * m[4];
    const b03 = m[1] * m[6] - m[2] * m[5], b04 = m[1] * m[7] - m[3] * m[5], b05 = m[2] * m[7] - m[3] * m[6];
    const b06 = m[8] * m[13] - m[9] * m[12], b07 = m[8] * m[14] - m[10] * m[12], b08 = m[8] * m[15] - m[11] * m[12];
    const b09 = m[9] * m[14] - m[10] * m[13], b10 = m[9] * m[15] - m[11] * m[13], b11 = m[10] * m[15] - m[11] * m[14];
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return M4.identity(o);
    det = 1 / det;
    o[0] = (m[5] * b11 - m[6] * b10 + m[7] * b09) * det;
    o[1] = (m[2] * b10 - m[1] * b11 - m[3] * b09) * det;
    o[2] = (m[13] * b05 - m[14] * b04 + m[15] * b03) * det;
    o[3] = (m[10] * b04 - m[9] * b05 - m[11] * b03) * det;
    o[4] = (m[6] * b08 - m[4] * b11 - m[7] * b07) * det;
    o[5] = (m[0] * b11 - m[2] * b08 + m[3] * b07) * det;
    o[6] = (m[14] * b02 - m[12] * b05 - m[15] * b01) * det;
    o[7] = (m[8] * b05 - m[10] * b02 + m[11] * b01) * det;
    o[8] = (m[4] * b10 - m[5] * b08 + m[7] * b06) * det;
    o[9] = (m[1] * b08 - m[0] * b10 - m[3] * b06) * det;
    o[10] = (m[12] * b04 - m[13] * b02 + m[15] * b00) * det;
    o[11] = (m[9] * b02 - m[8] * b04 - m[11] * b00) * det;
    o[12] = (m[5] * b07 - m[4] * b09 - m[6] * b06) * det;
    o[13] = (m[0] * b09 - m[1] * b07 + m[2] * b06) * det;
    o[14] = (m[13] * b01 - m[12] * b03 - m[14] * b00) * det;
    o[15] = (m[8] * b03 - m[9] * b01 + m[10] * b00) * det;
    return o;
  },
  compose(o, x, y, z, ry, sx = 1, sy = 1, sz = 1) {
    const c = Math.cos(ry), s = Math.sin(ry);
    o[0] = c * sx; o[1] = 0; o[2] = -s * sx; o[3] = 0;
    o[4] = 0; o[5] = sy; o[6] = 0; o[7] = 0;
    o[8] = s * sz; o[9] = 0; o[10] = c * sz; o[11] = 0;
    o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
    return o;
  },
  trs(o, tx, ty, tz, rx, ry, rz, sx = 1, sy = 1, sz = 1) {
    // rotation order Y * X * Z (yaw, pitch, roll) with non-uniform scale
    const cx = Math.cos(rx), sxr = Math.sin(rx), cy = Math.cos(ry), syr = Math.sin(ry), cz = Math.cos(rz), szr = Math.sin(rz);
    o[0] = (cy * cz + syr * sxr * szr) * sx;
    o[1] = (cx * szr) * sx;
    o[2] = (-syr * cz + cy * sxr * szr) * sx;
    o[3] = 0;
    o[4] = (-cy * szr + syr * sxr * cz) * sy;
    o[5] = (cx * cz) * sy;
    o[6] = (syr * szr + cy * sxr * cz) * sy;
    o[7] = 0;
    o[8] = (syr * cx) * sz;
    o[9] = (-sxr) * sz;
    o[10] = (cy * cx) * sz;
    o[11] = 0;
    o[12] = tx; o[13] = ty; o[14] = tz; o[15] = 1;
    return o;
  },
  transformPoint(o, m, x, y, z) {
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    o[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    o[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    o[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return o;
  },
  transformDir(o, m, x, y, z) {
    o[0] = m[0] * x + m[4] * y + m[8] * z;
    o[1] = m[1] * x + m[5] * y + m[9] * z;
    o[2] = m[2] * x + m[6] * y + m[10] * z;
    return o;
  }
};

/* ---------- minimal three-like scene graph (the gate contract) ---------- */
const _tmpV = new Vec3();

class Node {
  constructor(name = '') {
    this.name = name;
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.userData = {};
    this.position = new Vec3();
    this.scale = new Vec3(1, 1, 1);
    this.quaternion = { x: 0, y: 0, z: 0, w: 1 };
    this.matrix = M4.create();
    this.matrixWorld = M4.create();
    this.isNode = true;
  }
  add(...objs) {
    for (const o of objs) {
      if (!o) continue;
      if (o.parent) o.parent.remove(o);
      o.parent = this; this.children.push(o); o._dirty = true;
    }
    return this;
  }
  remove(o) {
    const i = this.children.indexOf(o);
    if (i >= 0) { this.children.splice(i, 1); o.parent = null; }
    return this;
  }
  setMatrix(m) { this.matrix.set(m); this._dirty = true; return this; }
  setTRS(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
    this.position.set(x, y, z); this.scale.set(sx, sy, sz);
    M4.compose(this.matrix, x, y, z, ry, sx, sy, sz);
    this.updateMatrixWorld();
    return this;
  }
  updateMatrixWorld(force = true) {
    if (this.parent) M4.mul(this.matrixWorld, this.parent.matrixWorld, this.matrix);
    else this.matrixWorld.set(this.matrix);
    for (const c of this.children) c.updateMatrixWorld(force);
  }
  updateWorldMatrix(updateParents, updateChildren) {
    if (updateParents && this.parent) this.parent.updateWorldMatrix(true, false);
    if (this.parent) M4.mul(this.matrixWorld, this.parent.matrixWorld, this.matrix);
    else this.matrixWorld.set(this.matrix);
    if (updateChildren) for (const c of this.children) c.updateWorldMatrix(false, true);
  }
  getWorldPosition(v) { v.setFromMatrixPosition(this.matrixWorld); return v; }
  getWorldScale(v) { v.setFromMatrixScale(this.matrixWorld); return v; }
  traverse(cb) { cb(this); for (const c of this.children) c.traverse(cb); }
}

function emptyGeometry(type = 'BufferGeometry') {
  return {
    type,
    attributes: { position: { count: 0, array: new Float32Array(0) } },
    index: null,
    parameters: {},
    boundingBox: null,
    computeBoundingBox() {
      if (this._bb) { this.boundingBox = this._bb; return; }
      const a = this.attributes.position.array;
      const bb = { min: new Vec3(1e9, 1e9, 1e9), max: new Vec3(-1e9, -1e9, -1e9) };
      for (let i = 0; i < a.length; i += 3) {
        bb.min.x = Math.min(bb.min.x, a[i]); bb.min.y = Math.min(bb.min.y, a[i + 1]); bb.min.z = Math.min(bb.min.z, a[i + 2]);
        bb.max.x = Math.max(bb.max.x, a[i]); bb.max.y = Math.max(bb.max.y, a[i + 1]); bb.max.z = Math.max(bb.max.z, a[i + 2]);
      }
      if (a.length === 0) { bb.min.set(0, 0, 0); bb.max.set(0, 0, 0); }
      this._bb = bb; this.boundingBox = bb;
    },
    computeBoundingSphere() {
      if (this._bs) { this.boundingSphere = this._bs; return; }
      if (!this.boundingBox) this.computeBoundingBox();
      const bb = this.boundingBox;
      const c = [(bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2];
      const r = Math.hypot(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) / 2;
      this._bs = { center: new Vec3(c[0], c[1], c[2]), radius: r };
      this.boundingSphere = this._bs;
    }
  };
}

function makeMeshNode(name, geometry, material) {
  const n = new Node(name);
  n.isMesh = true;
  n.geometry = geometry;
  n.material = material || { name: 'procedural' };
  n.userData.surfaceProcedural = true;
  return n;
}

function makeLight(type, color, intensity, distance = 0) {
  const l = new Node(type);
  l.isLight = true;
  l.type = type;
  l.color = color;
  l.intensity = intensity;
  l.distance = distance;
  return l;
}

function makePointsNode(name, count) {
  const n = new Node(name);
  n.isPoints = true;
  n.count = count;
  return n;
}
