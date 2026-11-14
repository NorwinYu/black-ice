/* =========================================================================
   BLACK ICE — 02 procedural geometry kit
   All kit parts are generated here: chamfered boxes, cylinders, ellipsoids,
   tubes. Vertex colours carry albedo + baked contact shade; the material id
   selects the GLSL surface model.
   ========================================================================= */

const MAT = {
  SNOW: 0, ROCK: 1, CONCRETE: 2, PAINT: 3, RUST: 4, STEEL: 5,
  WOOD: 6, RUBBER: 7, ICE: 8, EMIT_W: 9, EMIT_R: 10, EMIT_C: 11,
  FABRIC: 12, GLASS: 13, TAR: 14
};

const MATS = [
  { name: 'snow' }, { name: 'rock' }, { name: 'concrete' }, { name: 'paint' },
  { name: 'rust' }, { name: 'steel' }, { name: 'wood' }, { name: 'rubber' },
  { name: 'ice' }, { name: 'lamp-warm' }, { name: 'lamp-red' }, { name: 'lamp-cyan' },
  { name: 'fabric' }, { name: 'glass' }, { name: 'tar' }
];

/* ---------- transforms ---------- */
function matTranslate(x, y, z) { const m = M4.create(); m[12] = x; m[13] = y; m[14] = z; return m; }
function matRotY(a) { const m = M4.create(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
function matRotX(a) { const m = M4.create(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
function matRotZ(a) { const m = M4.create(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
function matScale(x, y, z) { const m = M4.create(); m[0] = x; m[5] = y; m[10] = z; return m; }

class Builder {
  constructor() {
    this.pos = []; this.nrm = []; this.col = []; this.mat = []; this.idx = [];
    this.partIds = []; this.parts = []; this._part = ''; this._pi = 0;
    this.M = M4.create();
    this.stack = [];
  }
  part(name) {
    this._part = name;
    let i = this.parts.indexOf(name);
    if (i < 0) { this.parts.push(name); i = this.parts.length - 1; }
    this._pi = i;
    return this;
  }
  pushM(m) { this.stack.push(new Float32Array(this.M)); M4.mul(this.M, this.M, m); return this; }
  popM() { this.M = this.stack.pop() || M4.create(); return this; }
  at(x, y, z, ry = 0, rx = 0, rz = 0) {
    this.stack.push(new Float32Array(this.M));
    const m = M4.create(); M4.trs(m, x, y, z, rx, ry, rz);
    M4.mul(this.M, this.M, m);
    return this;
  }
  done() { this.M = this.stack.pop() || M4.create(); return this; }
  P(x, y, z) {
    const m = this.M;
    return [m[0] * x + m[4] * y + m[8] * z + m[12],
            m[1] * x + m[5] * y + m[9] * z + m[13],
            m[2] * x + m[6] * y + m[10] * z + m[14]];
  }
  N(x, y, z) {
    const m = this.M;
    let nx = m[0] * x + m[4] * y + m[8] * z;
    let ny = m[1] * x + m[5] * y + m[9] * z;
    let nz = m[2] * x + m[6] * y + m[10] * z;
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  }
  vert(p, n, c, matId) {
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.col.push(c[0], c[1], c[2]);
    this.mat.push(matId);
    this.partIds.push(this._pi);
  }
  tri(a, b, c, na, nb, nc, col, matId, expect) {
    // auto-orient so the face normal points along `expect`
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (expect && cr[0] * expect[0] + cr[1] * expect[1] + cr[2] * expect[2] < 0) {
      [b, c] = [c, b]; [nb, nc] = [nc, nb];
    }
    const base = this.pos.length / 3;
    const va = this.P(...a), vb = this.P(...b), vc = this.P(...c);
    this.vert(va, na, col, matId); this.vert(vb, nb, col, matId); this.vert(vc, nc, col, matId);
    this.idx.push(base, base + 1, base + 2);
  }
  quad(a, b, c, d, n, col, matId) {
    const nl = this.N(...n);
    const c2 = [col[0] * 0.965, col[1] * 0.965, col[2] * 0.965];
    this.tri(a, b, c, nl, nl, nl, col, matId, nl);
    this.tri(a, c, d, nl, nl, nl, c2, matId, nl);
  }
  /* chamfered box centred at (x,y,z) */
  box(x, y, z, w, h, d, col, matId = MAT.PAINT, b = 0.012) {
    const hx = w / 2, hy = h / 2, hz = d / 2;
    const bb = Math.min(b, hx * 0.45, hy * 0.45, hz * 0.45);
    if (bb < 0.0015) { this.rawBox(x, y, z, w, h, d, col, matId); return; }
    const ix = hx - bb, iy = hy - bb, iz = hz - bb;
    const save = new Float32Array(this.M);
    this.M = M4.create(); M4.mul(this.M, save, matTranslate(x, y, z));
    const c = col, cA = [c[0] * 1.02, c[1] * 1.02, c[2] * 1.02];
    // six faces (flat, inset by the chamfer)
    this.quad([hx, -iy, -iz], [hx, iy, -iz], [hx, iy, iz], [hx, -iy, iz], [1, 0, 0], c, matId);
    this.quad([-hx, -iy, iz], [-hx, iy, iz], [-hx, iy, -iz], [-hx, -iy, -iz], [-1, 0, 0], c, matId);
    this.quad([-ix, hy, -iz], [ix, hy, -iz], [ix, hy, iz], [-ix, hy, iz], [0, 1, 0], cA, matId);
    this.quad([-ix, -hy, iz], [ix, -hy, iz], [ix, -hy, -iz], [-ix, -hy, -iz], [0, -1, 0], c, matId);
    this.quad([-ix, -iy, hz], [ix, -iy, hz], [ix, iy, hz], [-ix, iy, hz], [0, 0, 1], c, matId);
    this.quad([ix, -iy, -hz], [-ix, -iy, -hz], [-ix, iy, -hz], [ix, iy, -hz], [0, 0, -1], c, matId);
    const e = 0.985;
    const ce = [c[0] * e, c[1] * e, c[2] * e];
    // 12 chamfer strips
    this.quad([hx, iy, -iz], [hx, iy, iz], [ix, hy, iz], [ix, hy, -iz], [1, 1, 0], ce, matId);
    this.quad([hx, -iy, iz], [hx, -iy, -iz], [ix, -hy, -iz], [ix, -hy, iz], [1, -1, 0], ce, matId);
    this.quad([-hx, -iy, -iz], [-hx, -iy, iz], [-ix, -hy, iz], [-ix, -hy, -iz], [-1, -1, 0], ce, matId);
    this.quad([-hx, iy, iz], [-hx, iy, -iz], [-ix, hy, -iz], [-ix, hy, iz], [-1, 1, 0], ce, matId);
    this.quad([hx, -iy, iz], [hx, iy, iz], [ix, iy, hz], [ix, -iy, hz], [1, 0, 1], ce, matId);
    this.quad([hx, iy, -iz], [hx, -iy, -iz], [ix, -iy, -hz], [ix, iy, -hz], [1, 0, -1], ce, matId);
    this.quad([-hx, -iy, -iz], [-hx, iy, -iz], [-ix, iy, -hz], [-ix, -iy, -hz], [-1, 0, -1], ce, matId);
    this.quad([-hx, iy, iz], [-hx, -iy, iz], [-ix, -iy, hz], [-ix, iy, hz], [-1, 0, 1], ce, matId);
    this.quad([-ix, hy, iz], [ix, hy, iz], [ix, iy, hz], [-ix, iy, hz], [0, 1, 1], ce, matId);
    this.quad([ix, hy, -iz], [-ix, hy, -iz], [-ix, iy, -hz], [ix, iy, -hz], [0, 1, -1], ce, matId);
    this.quad([-ix, -hy, -iz], [ix, -hy, -iz], [ix, -iy, -hz], [-ix, -iy, -hz], [0, -1, -1], ce, matId);
    this.quad([ix, -hy, iz], [-ix, -hy, iz], [-ix, -iy, hz], [ix, -iy, hz], [0, -1, 1], ce, matId);
    // 8 corner triangles
    const cc = [c[0] * 0.94, c[1] * 0.94, c[2] * 0.94];
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      this.tri([sx * hx, sy * iy, sz * iz], [sx * ix, sy * hy, sz * iz], [sx * ix, sy * iy, sz * hz],
        this.N(sx, sy, 0), this.N(0, sy, sz), this.N(sx, 0, sz), cc, matId, this.N(sx, sy, sz));
    }
    this.M = save;
  }
  rawBox(x, y, z, w, h, d, col, matId) {
    const hx = w / 2, hy = h / 2, hz = d / 2;
    const save = new Float32Array(this.M);
    this.M = M4.create(); M4.mul(this.M, save, matTranslate(x, y, z));
    const c1 = [col[0] * 1.01, col[1] * 1.01, col[2] * 1.01];
    this.quad([-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [0, 0, 1], c1, matId);
    this.quad([hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [0, 0, -1], c1, matId);
    this.quad([hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [1, 0, 0], c1, matId);
    this.quad([-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-1, 0, 0], c1, matId);
    this.quad([-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz], [0, 1, 0], c1, matId);
    this.quad([-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], [0, -1, 0], c1, matId);
    this.M = save;
  }
  cyl(x, y, z, r0, r1, h, seg, col, matId = MAT.STEEL, caps = true, axis = 'y') {
    const save = new Float32Array(this.M);
    this.M = M4.create();
    M4.mul(this.M, save, matTranslate(x, y, z));
    if (axis === 'x') this.M = M4.mul(M4.create(), this.M, matRotZ(-PI / 2));
    else if (axis === 'z') this.M = M4.mul(M4.create(), this.M, matRotX(PI / 2));
    const c = col, cTop = [Math.min(1, c[0] * 1.08), Math.min(1, c[1] * 1.08), Math.min(1, c[2] * 1.08)];
    const y0 = -h / 2, y1 = h / 2;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const n0 = this.N(c0, 0, s0), n1 = this.N(c1, 0, s1);
      const p00 = [c0 * r0, y0, s0 * r0], p01 = [c1 * r0, y0, s1 * r0];
      const p10 = [c0 * r1, y1, s0 * r1], p11 = [c1 * r1, y1, s1 * r1];
      const shade = 0.94 + 0.06 * Math.cos(a0 * 2 + 0.7);
      const cS = [c[0] * shade, c[1] * shade, c[2] * shade];
      if (r0 < 1e-5) { this.tri(p10, [0, y0, 0], p11, n0, [0, -1, 0], n1, cS, matId, [c0, 0.2, s0]); }
      else if (r1 < 1e-5) { this.tri(p00, p01, [0, y1, 0], n0, n1, [0, 1, 0], cS, matId, [c0, 0.2, s0]); }
      else {
        this.tri(p00, p01, p10, n0, n1, n0, cS, matId, n0);
        this.tri(p01, p11, p10, n1, n1, n0, [cS[0] * .98, cS[1] * .98, cS[2] * .98], matId, n0);
      }
    }
    if (caps) {
      const cy0 = this.N(0, -1, 0), cy1 = this.N(0, 1, 0);
      for (let i = 0; i < seg; i++) {
        const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
        if (r0 > 1e-5) this.tri([0, y0, 0], [Math.cos(a1) * r0, y0, Math.sin(a1) * r0], [Math.cos(a0) * r0, y0, Math.sin(a0) * r0], cy0, cy0, cy0, [c[0] * .9, c[1] * .9, c[2] * .9], matId, cy0);
        if (r1 > 1e-5) this.tri([0, y1, 0], [Math.cos(a0) * r1, y1, Math.sin(a0) * r1], [Math.cos(a1) * r1, y1, Math.sin(a1) * r1], cy1, cy1, cy1, cTop, matId, cy1);
      }
    }
    this.M = save;
  }
  sphere(x, y, z, rx, ry, rz, seg, rings, col, matId = MAT.ROCK, deform = null, upColor = null) {
    const save = new Float32Array(this.M);
    this.M = M4.create(); M4.mul(this.M, save, matTranslate(x, y, z));
    const grid = [];
    for (let j = 0; j <= rings; j++) {
      const v = j / rings, phi = v * PI;
      const row = [];
      for (let i = 0; i <= seg; i++) {
        const u = i / seg, theta = u * TAU;
        let dx = Math.sin(phi) * Math.cos(theta), dy = Math.cos(phi), dz = Math.sin(phi) * Math.sin(theta);
        let d = deform ? deform(dx, dy, dz, u, v) : 1;
        const p = [dx * rx * d, dy * ry * d, dz * rz * d];
        const n = this.N(dx / (rx || 1), dy / (ry || 1), dz / (rz || 1));
        let cc = col;
        if (upColor && n[1] > 0.35) {
          const t = smoothstep(0.35, 0.62, n[1]);
          cc = [lerp(col[0], upColor[0], t), lerp(col[1], upColor[1], t), lerp(col[2], upColor[2], t)];
        }
        row.push([p, n, cc]);
      }
      grid.push(row);
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
      if (j > 0) this.tri(a[0], b[0], c[0], a[1], b[1], c[1], a[2], matId, a[1]);
      if (j < rings - 1) this.tri(a[0], c[0], d[0], a[1], c[1], d[1], d[2], matId, d[1]);
    }
    this.M = save;
  }
  tube(points, r, seg, col, matId = MAT.RUBBER) {
    // polyline tube with per-vertex frames (good for cables / guy wires)
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k], b = points[k + 1];
      const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const l = Math.hypot(...dir) || 1;
      const dn = [dir[0] / l, dir[1] / l, dir[2] / l];
      let up = Math.abs(dn[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      let side = [dn[1] * up[2] - dn[2] * up[1], dn[2] * up[0] - dn[0] * up[2], dn[0] * up[1] - dn[1] * up[0]];
      const sl = Math.hypot(...side) || 1; side = side.map(v => v / sl);
      const up2 = [side[1] * dn[2] - side[2] * dn[1], side[2] * dn[0] - side[0] * dn[2], side[0] * dn[1] - side[1] * dn[0]];
      for (let i = 0; i < seg; i++) {
        const t0 = i / seg * TAU, t1 = (i + 1) / seg * TAU;
        const o0 = [side[0] * Math.cos(t0) + up2[0] * Math.sin(t0), side[1] * Math.cos(t0) + up2[1] * Math.sin(t0), side[2] * Math.cos(t0) + up2[2] * Math.sin(t0)];
        const o1 = [side[0] * Math.cos(t1) + up2[0] * Math.sin(t1), side[1] * Math.cos(t1) + up2[1] * Math.sin(t1), side[2] * Math.cos(t1) + up2[2] * Math.sin(t1)];
        const p00 = [a[0] + o0[0] * r, a[1] + o0[1] * r, a[2] + o0[2] * r];
        const p01 = [a[0] + o1[0] * r, a[1] + o1[1] * r, a[2] + o1[2] * r];
        const p10 = [b[0] + o0[0] * r, b[1] + o0[1] * r, b[2] + o0[2] * r];
        const p11 = [b[0] + o1[0] * r, b[1] + o1[1] * r, b[2] + o1[2] * r];
        this.quad(p00, p01, p11, p10, o0, col, matId);
      }
    }
  }
  /* flat vertical panel with thickness (signs, doors) */
  slab(x, y, z, w, h, d, col, matId, ry = 0) {
    this.at(x, y, z, ry); this.box(0, 0, 0, w, h, d, col, matId, 0.008); this.done();
  }
  finish(name, identity) {
    const positions = new Float32Array(this.pos);
    const geo = emptyGeometry('PropGeometry');
    geo.attributes.position = { count: this.pos.length / 3, array: positions };
    geo.attributes.normal = { count: this.pos.length / 3, array: new Float32Array(this.nrm) };
    geo.attributes.color = { count: this.pos.length / 3, array: new Float32Array(this.col) };
    geo.attributes.material = { count: this.pos.length / 3, array: new Float32Array(this.mat) };
    geo.attributes.part = { count: this.pos.length / 3, array: new Float32Array(this.partIds) };
    // baked contact shade: darken low vertices, subtle cold occlusion
    const colArr = geo.attributes.color.array;
    for (let i = 0; i < colArr.length; i += 3) {
      const yv = positions[i + 1];
      const ao = 0.52 + 0.48 * smoothstep(-0.04, 0.42, yv);
      colArr[i] *= ao; colArr[i + 1] *= ao; colArr[i + 2] *= ao;
    }
    const idx = new Uint32Array(this.idx);
    geo.index = { count: idx.length, array: idx };
    geo.computeBoundingBox();
    let tris = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = positions[idx[i] * 3 + 1], b = positions[idx[i + 1] * 3 + 1], c = positions[idx[i + 2] * 3 + 1];
      if (a > 0.05 || b > 0.05 || c > 0.05) tris++;
    }
    return {
      name, geo, parts: this.parts.slice(), identity: identity || [],
      tris, verts: positions.length / 3,
      dims: {
        w: geo.boundingBox.max.x - geo.boundingBox.min.x,
        h: geo.boundingBox.max.y - geo.boundingBox.min.y,
        d: geo.boundingBox.max.z - geo.boundingBox.min.z
      }
    };
  }
}

/* small deterministic noise for CPU-side colour wear */
function vnoise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const h = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
