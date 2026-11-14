/* =========================================================================
   BLACK ICE — 03 kit of parts
   Each prop is an original procedural assembly with named parts (identity),
   real dimensions in metres, chamfered hard edges and baked contact shade.
   ========================================================================= */

const PAL = {
  snow: C('#e2e9ee'), snowB: C('#c8d5dd'), snowShadow: C('#a9bcc8'),
  rock: C('#565a59'), rockD: C('#313637'), rockWarm: C('#6b6157'),
  concrete: C('#8a867d'), concreteD: C('#67635b'), concreteWet: C('#5d5d59'),
  paintTan: C('#8b7c62'), paintOlive: C('#59604d'), paintBlue: C('#495d68'),
  paintRed: C('#87442f'), paintGrey: C('#707676'), paintYellow: C('#a08a44'),
  rust: C('#7b4c31'), rustD: C('#54331f'), steel: C('#90979a'), steelD: C('#3e4447'),
  wood: C('#6c5a41'), woodD: C('#4b3e2c'), ply: C('#8a7456'),
  rubber: C('#222528'), ice: C('#9ab8c3'), tarp: C('#4c5754'), tarpD: C('#3a4341'),
  hwArmor: C('#2c353c'), hwArmor2: C('#3d4a50'), hwCut: C('#525f61'),
  drone: C('#2a3238'), droneCut: C('#47545b'), dronePoly: C('#1c2227'),
  amber: [2.2, 1.05, 0.34], red: [3.0, 0.22, 0.10], cyan: [0.36, 2.1, 2.6],
  warmWin: [1.55, 0.74, 0.28], white: [1.9, 1.85, 1.7]
};

function boltRing(b, cx, cy, cz, rx, rz, n, size = 0.032, col = PAL.steelD) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    b.at(cx + Math.cos(a) * rx, cy, cz + Math.sin(a) * rz);
    b.cyl(0, 0, 0, size, size, 0.035, 6, col, MAT.STEEL);
    b.done();
  }
}
function snowSlab(b, x, y, z, w, d, thick = 0.05, ry = 0, matId = MAT.SNOW) {
  b.at(x, y, z, ry);
  b.box(0, 0, 0, w, thick, d, PAL.snow, matId, 0.022);
  b.box(-w * 0.18, thick * 0.55, d * 0.22, w * 0.36, thick * 0.7, d * 0.4, PAL.snow, matId, 0.02);
  b.done();
}
function panelSeams(b, x, y, z, w, h, d, n, col, ry = 0) {
  for (let i = 1; i < n; i++) {
    b.at(x, y, z, ry);
    b.box(-w / 2 + w * i / n, 0, d / 2 + 0.006, 0.035, h * 0.96, 0.02, col, MAT.STEEL, 0.004);
    b.done();
  }
}
function warningBand(b, x, y, z, w, h, d, ry = 0) {
  const c = PAL.paintYellow;
  b.at(x, y, z, ry);
  for (let i = 0; i < 3; i++) b.box(-w * 0.28 + i * w * 0.28, 0, d / 2 + 0.008, w * 0.14, h, 0.015, c, MAT.PAINT, 0.004);
  b.done();
}

/* ----------------------------- relay tower ----------------------------- */
function buildRelay() {
  const b = new Builder();
  b.part('pad');
  b.box(0, 0.15, 0, 3.4, 0.3, 3.4, PAL.concrete, MAT.CONCRETE, 0.03);
  b.at(0, 0.31, 0);
  b.box(0, 0, 0, 2.5, 0.05, 2.5, PAL.concreteD, MAT.CONCRETE, 0.02);
  b.done();
  boltRing(b, 0, 0.31, 0, 1.15, 1.15, 8, 0.04);
  b.part('cabinet');
  b.box(0.95, 1.08, -0.72, 1.45, 1.55, 0.92, PAL.paintBlue, MAT.PAINT, 0.03);
  b.box(0.95, 1.08, -0.25, 1.35, 1.4, 0.02, PAL.paintGrey, MAT.PAINT, 0.004);
  b.box(0.95, 1.86, -0.72, 1.55, 0.06, 1.02, PAL.snow, MAT.SNOW, 0.015);
  b.box(0.42, 1.15, -0.25, 0.05, 0.5, 0.03, PAL.steelD, MAT.STEEL, 0.004);
  b.box(1.4, 0.86, -0.25, 0.18, 0.1, 0.03, PAL.cyan, MAT.EMIT_C, 0.002);
  for (let i = 0; i < 4; i++) b.box(1.25, 0.55 + i * 0.14, -0.25, 0.34, 0.05, 0.03, PAL.steelD, MAT.STEEL, 0.003);
  b.part('mast');
  b.cyl(0, 5.15, 0, 0.16, 0.085, 9.6, 32, PAL.paintRed, MAT.PAINT);
  b.cyl(0, 0.5, 0, 0.32, 0.26, 0.32, 32, PAL.steel, MAT.STEEL);
  b.cyl(0, 9.98, 0, 0.095, 0.075, 0.5, 24, PAL.steel, MAT.STEEL);
  b.at(0, 0.45, 0);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + PI / 4;
    b.at(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42, -a);
    b.box(0.24, 0.3, 0, 0.55, 0.08, 0.26, PAL.paintRed, MAT.PAINT, 0.01);
    b.done();
  }
  b.done();
  // stiffening rings up the mast
  for (let i = 0; i < 4; i++) b.cyl(0, 1.5 + i * 2.2, 0, 0.21 - i * 0.023, 0.21 - i * 0.023, 0.09, 24, PAL.steelD, MAT.STEEL);
  b.part('ladder');
  b.cyl(-0.32, 5.1, 0.12, 0.028, 0.028, 8.9, 8, PAL.steel, MAT.STEEL);
  b.cyl(-0.05, 5.1, 0.12, 0.028, 0.028, 8.9, 8, PAL.steel, MAT.STEEL);
  for (let i = 0; i < 14; i++) {
    b.at(-0.185, 0.9 + i * 0.62, 0.12);
    b.cyl(0, 0, 0, 0.018, 0.018, 0.3, 6, PAL.steelD, MAT.STEEL, false, 'x');
    b.done();
  }
  b.part('antenna');
  for (let i = 0; i < 3; i++) {
    b.at(0, 9.7 + i * 0.42, 0);
    b.cyl(0, 0, 0, 0.02, 0.02, 2.0 - i * 0.35, 6, PAL.steel, MAT.STEEL, false, 'x');
    b.done();
  }
  b.cyl(0, 10.28, 0, 0.16, 0.13, 0.22, 24, PAL.steelD, MAT.STEEL);
  b.part('beacon');
  b.sphere(0, 10.58, 0, 0.16, 0.2, 0.16, 20, 10, PAL.red, MAT.EMIT_R);
  b.cyl(0, 10.76, 0, 0.2, 0.05, 0.08, 20, PAL.steelD, MAT.STEEL);
  b.part('lamp');
  b.at(1.75, 1.85, 0.95);
  b.cyl(0, 0.55, 0, 0.05, 0.05, 1.1, 12, PAL.steelD, MAT.STEEL);
  b.at(0, 1.12, 0);
  b.box(0, 0, 0.18, 0.3, 0.22, 0.42, PAL.steelD, MAT.STEEL, 0.015);
  b.box(0, -0.02, 0.4, 0.24, 0.16, 0.02, PAL.amber, MAT.EMIT_W, 0.004);
  b.done(); b.done();
  b.part('cable');
  const cable = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    cable.push([lerp(1.25, 0.2, t), lerp(0.9, 6.2, t) + Math.sin(t * PI) * -0.5, lerp(-0.5, 0.15, t)]);
  }
  b.tube(cable, 0.035, 5, PAL.rubber, MAT.RUBBER);
  b.part('guys');
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + 0.5;
    b.tube([[0.06 * Math.cos(a), 9.5, 0.06 * Math.sin(a)],
      [Math.cos(a) * 3.3, 5.2, Math.sin(a) * 3.3],
      [Math.cos(a) * 6.2, 0.1, Math.sin(a) * 6.2]], 0.018, 4, PAL.steelD, MAT.STEEL);
    b.cyl(Math.cos(a) * 6.2, 0.12, Math.sin(a) * 6.2, 0.16, 0.1, 0.28, 12, PAL.concreteD, MAT.CONCRETE);
  }
  const d = b.finish('relay', [
    { name: 'mast', extents: [0.3, 9.6, 0.3] },
    { name: 'cabinet', extents: [1.45, 1.55, 0.92] },
    { name: 'ladder', extents: [0.3, 8.9, 0.1] },
    { name: 'beacon', extents: [0.32, 0.4, 0.32] },
    { name: 'lamp', extents: [0.42, 0.4, 0.42] },
    { name: 'guys', extents: [6.4, 5.0, 6.4] }
  ]);
  d.lights = [{ pos: [1.75, 2.97, 1.37], color: [1.0, 0.46, 0.18], intensity: 26, distance: 13, kind: 'relay' }];
  return d;
}

/* ------------------------------- hut ----------------------------------- */
function buildHut(variant = 0) {
  const b = new Builder();
  const body = [PAL.paintTan, PAL.paintGrey, PAL.paintBlue][variant % 3];
  const trim = [PAL.paintOlive, PAL.rustD, PAL.steelD][variant % 3];
  const W = 7.4, H = 3.25, D = 4.6;
  b.part('foundation');
  b.box(0, 0.16, 0, W + 0.5, 0.32, D + 0.5, PAL.concrete, MAT.CONCRETE, 0.035);
  b.part('walls');
  b.box(0, 0.32 + H / 2, 0, W, H, D, body, MAT.PAINT, 0.05);
  // corner posts / ribs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box(sx * (W / 2 - 0.06), 0.32 + H / 2, sz * (D / 2 - 0.06), 0.14, H, 0.14, trim, MAT.STEEL, 0.012);
  }
  panelSeams(b, 0, 0.32 + H / 2, 0, W, H, D, 5, trim);
  // roof: slightly pitched steel deck with snow
  b.part('roof');
  b.at(0, 0.32 + H, 0, 0, -0.045, 0);
  b.box(0, 0.08, 0, W + 0.6, 0.18, D + 0.65, PAL.steelD, MAT.STEEL, 0.03);
  b.box(0, 0.22, 0.05, W + 0.72, 0.07, D + 0.75, PAL.snow, MAT.SNOW, 0.04);
  b.box(-W * 0.28, 0.3, 0.3, W * 0.32, 0.12, D * 0.32, PAL.snow, MAT.SNOW, 0.06);
  b.box(W * 0.26, 0.28, -0.5, W * 0.26, 0.1, D * 0.4, PAL.snow, MAT.SNOW, 0.06);
  b.done();
  // eave shadow strip
  b.box(0, 0.32 + H - 0.05, D / 2 + 0.06, W + 0.5, 0.12, 0.1, PAL.steelD, MAT.STEEL, 0.01);
  b.part('door');
  b.box(0.2, 1.45, D / 2 + 0.03, 1.1, 2.1, 0.1, trim, MAT.PAINT, 0.02);
  b.box(0.2, 1.45, D / 2 + 0.09, 1.28, 2.28, 0.06, PAL.steelD, MAT.STEEL, 0.012);
  b.box(0.2, 1.1, D / 2 + 0.13, 0.16, 0.05, 0.05, PAL.steel, MAT.STEEL, 0.006);
  b.box(0.55, 1.62, D / 2 + 0.13, 0.09, 0.28, 0.03, PAL.steelD, MAT.STEEL, 0.004);
  b.box(0.2, 2.62, D / 2 + 0.1, 1.5, 0.1, 0.5, PAL.steelD, MAT.STEEL, 0.012);
  b.part('window');
  b.box(-2.0, 2.05, D / 2 + 0.04, 1.5, 0.85, 0.1, PAL.steelD, MAT.STEEL, 0.02);
  b.box(-2.0, 2.05, D / 2 + 0.09, 1.35, 0.72, 0.03, [0.95, 0.36, 0.09], MAT.EMIT_W, 0.003);
  b.box(-2.0, 2.05, D / 2 + 0.12, 0.06, 0.75, 0.02, PAL.steelD, MAT.STEEL, 0.003);
  b.box(-2.0, 2.05, D / 2 + 0.12, 1.38, 0.05, 0.02, PAL.steelD, MAT.STEEL, 0.003);
  b.part('vent');
  b.at(2.2, 0.32 + H + 0.2, -0.9);
  b.cyl(0, 0.25, 0, 0.17, 0.17, 0.5, 20, PAL.steelD, MAT.STEEL);
  b.cyl(0, 0.53, 0, 0.3, 0.05, 0.12, 20, PAL.steelD, MAT.STEEL);
  b.done();
  b.at(-1.4, 0.32 + H + 0.16, 1.3);
  b.cyl(0, 0.28, 0, 0.22, 0.18, 0.56, 20, PAL.rust, MAT.RUST);
  b.cyl(0, 0.6, 0, 0.3, 0.08, 0.1, 16, PAL.rustD, MAT.RUST);
  b.done();
  b.part('pipe');
  b.cyl(W / 2 + 0.04, 1.8, -1.3, 0.06, 0.06, 2.6, 12, PAL.rust, MAT.RUST);
  b.at(W / 2 + 0.04, 0.6, -1.3);
  b.cyl(0, 0, 0, 0.08, 0.08, 0.9, 12, PAL.rust, MAT.RUST, true, 'x');
  b.done();
  b.part('lamp');
  b.at(0.2, 3.0, D / 2 + 0.12);
  b.cyl(0, 0.1, 0, 0.03, 0.03, 0.28, 8, PAL.steelD, MAT.STEEL);
  b.at(0, 0.1, 0.18);
  b.box(0, 0, 0, 0.42, 0.14, 0.24, PAL.steelD, MAT.STEEL, 0.012);
  b.box(0, -0.09, 0.02, 0.34, 0.02, 0.18, PAL.amber, MAT.EMIT_W, 0.002);
  b.done(); b.done();
  b.part('window2');
  b.box(W / 2 + 0.02, 2.02, -0.9, 0.1, 0.9, 1.5, PAL.steelD, MAT.STEEL, 0.02);
  b.box(W / 2 + 0.09, 2.02, -0.9, 0.03, 0.76, 1.36, [0.95, 0.36, 0.09], MAT.EMIT_W, 0.003);
  b.box(W / 2 + 0.12, 2.02, -0.9, 0.02, 0.8, 0.05, PAL.steelD, MAT.STEEL, 0.003);
  b.box(W / 2 + 0.12, 2.02, -0.9, 0.02, 0.05, 1.4, PAL.steelD, MAT.STEEL, 0.003);
  b.part('lamp2');
  b.at(W / 2 + 0.12, 2.95, 1.25);
  b.box(0, 0, 0, 0.24, 0.16, 0.34, PAL.steelD, MAT.STEEL, 0.012);
  b.box(-0.13, -0.06, 0.06, 0.02, 0.05, 0.2, PAL.amber, MAT.EMIT_W, 0.003);
  b.done();
  b.part('chimney');
  b.at(-2.2, H + 0.32, -1.2);
  b.cyl(0, 0.35, 0, 0.24, 0.22, 0.7, 20, PAL.rust, MAT.RUST);
  b.cyl(0, 0.74, 0, 0.32, 0.1, 0.1, 20, PAL.rustD, MAT.RUST);
  b.box(0, 0.82, 0, 0.5, 0.05, 0.5, PAL.snow, MAT.SNOW, 0.03);
  b.done();
  b.part('number');
  b.box(W / 2 + 0.04, 1.9, 1.0, 0.04, 0.7, 0.8, PAL.paintGrey, MAT.PAINT, 0.004);
  b.box(W / 2 + 0.07, 1.9, 1.0, 0.02, 0.1, 0.62, PAL.steelD, MAT.STEEL, 0.004);
  b.part('window3');
  b.box(2.55, 2.0, D / 2 + 0.04, 1.2, 0.85, 0.1, PAL.steelD, MAT.STEEL, 0.02);
  b.box(2.55, 2.0, D / 2 + 0.09, 1.06, 0.72, 0.03, [0.95, 0.36, 0.09], MAT.EMIT_W, 0.003);
  b.box(2.55, 2.0, D / 2 + 0.12, 0.05, 0.75, 0.02, PAL.steelD, MAT.STEEL, 0.003);
  b.part('lamp3');
  b.box(3.55, 2.95, D / 2 + 0.08, 0.22, 0.16, 0.3, PAL.steelD, MAT.STEEL, 0.012);
  b.box(3.55, 2.89, D / 2 + 0.23, 0.16, 0.05, 0.03, PAL.amber, MAT.EMIT_W, 0.003);
  b.part('number2');
  b.box(0.2, 2.42, D / 2 + 0.045, 0.34, 0.5, 0.03, PAL.paintGrey, MAT.PAINT, 0.004);
  b.box(-0.2, 2.42, D / 2 + 0.045, 0.16, 0.5, 0.03, PAL.paintGrey, MAT.PAINT, 0.004);
  b.box(0.02, 2.42, D / 2 + 0.065, 0.5, 0.06, 0.01, PAL.steelD, MAT.STEEL, 0.002);
  b.part('ladder');
  for (const lz of [-1.4, -0.7]) b.cyl(W / 2 + 0.14, 1.55, lz, 0.028, 0.028, 3.1, 6, PAL.steel, MAT.STEEL);
  for (let i = 0; i < 7; i++) b.box(W / 2 + 0.14, 0.4 + i * 0.42, -1.05, 0.04, 0.03, 0.72, PAL.steelD, MAT.STEEL, 0.004);
  b.part('sign');
  b.box(-2.1, 1.12, D / 2 + 0.05, 0.55, 0.28, 0.02, PAL.paintYellow, MAT.PAINT, 0.004);
  warningBand(b, 1.5, 1.7, D / 2 + 0.02, 0.9, 0.16, 0.04);
  b.part('snowdrift');
  b.sphere(W / 2 + 0.25, -0.2, 1.6, 1.1, 0.42, 1.8, 14, 7, PAL.snow, MAT.SNOW,
    (dx, dy, dz, u, v) => 1 + 0.1 * Math.sin(u * TAU * 3), null);
  b.sphere(-W / 2 - 0.35, -0.05, 0.5, 1.5, 0.55, 2.4, 16, 8, PAL.snow,
    MAT.SNOW, (dx, dy, dz, u, v) => 1 + 0.12 * Math.sin(u * TAU * 3 + 1) * Math.sin(v * PI), null);
  const d = b.finish('hut', [
    { name: 'walls', extents: [W, H, D] },
    { name: 'roof', extents: [W + 0.7, 0.5, D + 0.7] },
    { name: 'door', extents: [1.28, 2.28, 0.3] },
    { name: 'window', extents: [1.5, 0.85, 0.3] },
    { name: 'vent', extents: [0.6, 0.8, 0.6] },
    { name: 'lamp', extents: [0.45, 0.4, 0.3] },
    { name: 'window2', extents: [0.1, 0.9, 1.5] },
    { name: 'lamp2', extents: [0.34, 0.3, 0.4] },
    { name: 'chimney', extents: [0.5, 0.8, 0.5] },
    { name: 'number', extents: [0.1, 0.7, 0.8] },
    { name: 'window3', extents: [1.2, 0.85, 0.1] },
    { name: 'lamp3', extents: [0.3, 0.3, 0.3] },
    { name: 'ladder', extents: [0.6, 3.1, 0.1] }
  ]);
  d.lights = [{ pos: [0.2, 2.9, D / 2 + 0.3], color: [1.0, 0.5, 0.2], intensity: 24, distance: 14, kind: 'door' }];
  d.dims = { w: W, h: 3.9, d: D };
  return d;
}

/* ------------------------------ garage --------------------------------- */
function buildGarage() {
  const b = new Builder();
  const W = 9.6, H = 4.1, D = 6.0;
  b.part('foundation');
  b.box(0, 0.18, 0, W + 0.6, 0.36, D + 0.6, PAL.concrete, MAT.CONCRETE, 0.04);
  b.part('walls');
  b.box(0, 0.36 + H / 2, 0, W, H, D, PAL.paintGrey, MAT.PAINT, 0.05);
  for (let i = 0; i < 7; i++) b.box(-W / 2 + W * (i + 0.5) / 7, 0.36 + H / 2, D / 2 + 0.012, 0.03, H * 0.98, 0.02, PAL.steelD, MAT.STEEL, 0.003);
  b.part('roof');
  b.at(0, 0.36 + H, 0, 0, -0.03, 0);
  b.box(0, 0.1, 0, W + 0.7, 0.2, D + 0.7, PAL.steelD, MAT.STEEL, 0.03);
  b.box(-1.4, 0.26, 0.2, W * 0.5, 0.12, D * 0.8, PAL.snow, MAT.SNOW, 0.07);
  b.box(2.4, 0.24, -1.2, W * 0.3, 0.1, D * 0.5, PAL.snow, MAT.SNOW, 0.07);
  b.done();
  b.part('door');
  b.box(1.5, 2.05, D / 2 + 0.02, 4.4, 3.4, 0.12, PAL.paintBlue, MAT.PAINT, 0.02);
  for (let i = 0; i < 8; i++) b.box(1.5, 0.5 + i * 0.4, D / 2 + 0.10, 4.4, 0.04, 0.03, PAL.steelD, MAT.STEEL, 0.005);
  b.box(3.55, 0.9, D / 2 + 0.12, 0.3, 0.08, 0.12, PAL.steel, MAT.STEEL, 0.008);
  b.part('vent');
  for (let i = 0; i < 3; i++) {
    b.at(-2.8 + i * 2.8, 0.36 + H + 0.26, 0.3);
    b.cyl(0, 0.18, 0, 0.26, 0.2, 0.36, 20, PAL.rust, MAT.RUST);
    b.cyl(0, 0.38, 0, 0.32, 0.06, 0.08, 16, PAL.rustD, MAT.RUST);
    b.done();
  }
  b.part('lamp');
  for (const x of [-3.2, 3.2]) {
    b.at(x, 3.3, D / 2 + 0.1);
    b.box(0, 0.1, 0.1, 0.5, 0.18, 0.3, PAL.steelD, MAT.STEEL, 0.01);
    b.box(0, 0.0, 0.16, 0.42, 0.03, 0.16, PAL.amber, MAT.EMIT_W, 0.002);
    b.done();
  }
  b.part('pipe');
  b.cyl(-W / 2 - 0.05, 2.2, -1.2, 0.08, 0.08, 2.2, 12, PAL.rust, MAT.RUST);
  b.part('sign');
  b.box(-3.4, 1.4, D / 2 + 0.04, 1.4, 0.36, 0.02, PAL.paintYellow, MAT.PAINT, 0.004);
  b.box(-3.4, 1.4, D / 2 + 0.055, 1.1, 0.16, 0.01, PAL.steelD, MAT.STEEL, 0.002);
  b.part('snowdrift');
  b.sphere(-W / 2 - 0.4, -0.05, 1.9, 1.9, 0.6, 2.8, 16, 8, PAL.snow, MAT.SNOW,
    (dx, dy, dz, u, v) => 1 + 0.1 * Math.sin(u * TAU * 4), null);
  const d = b.finish('garage', [
    { name: 'walls', extents: [W, H, D] },
    { name: 'door', extents: [4.4, 3.4, 0.3] },
    { name: 'roof', extents: [W + 0.7, 0.5, D + 0.7] },
    { name: 'vent', extents: [0.6, 0.5, 0.6] },
    { name: 'lamp', extents: [0.5, 0.3, 0.4] }
  ]);
  d.lights = [{ pos: [3.2, 3.28, D / 2 + 0.4], color: [1.0, 0.5, 0.2], intensity: 26, distance: 15, kind: 'door' }];
  return d;
}

/* ------------------------------ snowcat -------------------------------- */
function buildSnowcat() {
  const b = new Builder();
  const red = PAL.paintRed, steel = PAL.steelD, yellow = PAL.paintYellow;
  // every rotated piece goes through rbox, which always balances the stack
  function rbox(x, y, z, w, h, d, c, m, bv = 0.02, ry = 0, rx = 0, rz = 0) {
    if (ry || rx || rz) { b.at(x, y, z, ry, rx, rz); b.box(0, 0, 0, w, h, d, c, m, bv); b.done(); }
    else b.box(x, y, z, w, h, d, c, m, bv);
  }
  b.part('tracks');
  for (const sz of [-1, 1]) {
    const z = sz * 0.94;
    b.box(0, 0.5, z, 3.6, 0.68, 0.62, PAL.rubber, MAT.RUBBER, 0.1);
    for (let i = 0; i < 12; i++) b.box(-1.62 + i * 0.295, 0.5, z, 0.15, 0.74, 0.7, steel, MAT.STEEL, 0.035);
    for (let i = 0; i < 5; i++) {
      const wx = -1.25 + i * 0.64, wz = z + sz * 0.35;
      b.cyl(wx, 0.55, wz, 0.23, 0.23, 0.08, 24, steel, MAT.STEEL, true, 'z');
      b.cyl(wx, 0.55, wz, 0.12, 0.12, 0.11, 18, PAL.rustD, MAT.RUST, true, 'z');
      boltRing(b, wx, 0.55, wz + sz * 0.055, 0.08, 0.08, 6, 0.012, PAL.steel);
    }
    b.box(0, 0.16, z, 3.4, 0.12, 0.72, steel, MAT.STEEL, 0.02);
  }
  b.part('hull');
  b.box(0.15, 1.0, 0, 3.15, 0.6, 1.68, red, MAT.PAINT, 0.08);
  for (let i = 0; i < 6; i++) b.box(-1.2 + i * 0.46, 1.0, 0.85, 0.02, 0.5, 0.03, PAL.rustD, MAT.RUST, 0.003);
  b.box(-1.3, 1.27, 0, 0.9, 0.12, 1.6, steel, MAT.STEEL, 0.03);
  b.part('cab');
  b.box(0.75, 1.9, 0, 1.72, 1.16, 1.66, red, MAT.PAINT, 0.09);
  rbox(1.62, 1.98, 0, 0.05, 0.62, 1.34, PAL.hwCut, MAT.GLASS, 0.012, 0, 0, 0.12);
  b.box(1.62, 1.62, 0, 0.07, 0.1, 1.42, steel, MAT.STEEL, 0.006);
  b.box(1.62, 2.36, 0, 0.07, 0.1, 1.42, steel, MAT.STEEL, 0.006);
  for (const sz of [-1, 1]) {
    b.box(0.75, 1.98, sz * 0.87, 0.78, 0.5, 0.04, PAL.hwCut, MAT.GLASS, 0.012);
    b.box(0.75, 2.26, sz * 0.87, 0.84, 0.06, 0.05, steel, MAT.STEEL, 0.006);
    b.box(0.75, 1.48, sz * 0.85, 0.5, 0.05, 0.03, steel, MAT.STEEL, 0.004);
  }
  b.box(-0.12, 1.98, 0, 0.04, 0.5, 1.32, PAL.hwCut, MAT.GLASS, 0.014);
  // doors, steps, grab handles and a service number per side
  for (const sz of [-1, 1]) {
    const zz = sz * 0.88;
    b.box(0.75, 1.22, zz, 1.28, 0.05, 0.03, steel, MAT.STEEL, 0.004);
    b.box(-0.12, 1.55, zz, 0.04, 0.62, 0.03, steel, MAT.STEEL, 0.004);
    b.box(0.75, 0.78, zz - sz * 0.13, 0.72, 0.07, 0.28, PAL.steelD, MAT.STEEL, 0.02);
    b.box(1.22, 1.72, zz, 0.16, 0.03, 0.04, steel, MAT.STEEL, 0.004);
    b.box(0.4, 1.55, zz, 0.12, 0.03, 0.035, steel, MAT.STEEL, 0.004);
    b.box(0.35, 1.05, zz + 0.01, 0.52, 0.22, 0.02, PAL.paintYellow, MAT.PAINT, 0.004);
    b.box(0.24, 1.05, zz + 0.02, 0.08, 0.14, 0.01, steel, MAT.STEEL, 0.002);
    b.box(0.46, 1.05, zz + 0.02, 0.08, 0.14, 0.01, steel, MAT.STEEL, 0.002);
    b.box(1.15, 2.2, zz, 0.14, 0.1, 0.06, steel, MAT.STEEL, 0.012);
    b.box(1.15, 2.2, zz + sz * 0.03, 0.08, 0.05, 0.02, PAL.amber, MAT.EMIT_W, 0.002);
    b.box(0.95, 1.78, zz + sz * 0.02, 0.62, 0.035, 0.012, [0.9, 0.33, 0.07], MAT.EMIT_W, 0.002);
    b.box(0.55, 1.86, zz + sz * 0.02, 0.1, 0.06, 0.01, [0.35, 1.2, 1.3], MAT.EMIT_C, 0.002);
  }
  b.box(0.75, 2.31, 0, 1.82, 0.12, 1.76, steel, MAT.STEEL, 0.035);
  b.box(0.65, 2.4, 0.1, 1.5, 0.09, 1.35, PAL.snow, MAT.SNOW, 0.05);
  // door seams/handles
  for (const sz of [-1, 1]) {
    b.box(0.75, 1.72, sz * 0.88, 0.02, 0.72, 0.02, PAL.rustD, MAT.RUST, 0.002);
    b.box(1.15, 1.72, sz * 0.88, 0.02, 0.72, 0.02, PAL.rustD, MAT.RUST, 0.002);
    b.box(1.02, 1.75, sz * 0.89, 0.16, 0.035, 0.03, steel, MAT.STEEL, 0.003);
  }
  b.part('blade');
  rbox(2.35, 0.62, 0, 0.13, 1.2, 2.9, yellow, MAT.PAINT, 0.05, 0.25, 0, -0.12);
  rbox(2.37, 1.24, 0, 0.14, 0.1, 2.9, PAL.steel, MAT.STEEL, 0.02, 0.25);
  rbox(2.3, 1.32, 0, 0.3, 0.06, 2.6, PAL.snow, MAT.SNOW, 0.04, 0.25);
  for (const sz of [-1, 1]) {
    b.tube([[1.55, 0.95, sz * 0.62], [1.95, 0.78, sz * 0.8], [2.3, 0.66, sz * 0.95]], 0.075, 6, yellow, MAT.PAINT);


  }
  b.part('headlights');
  for (const sz of [-1, 1]) {
    b.box(1.7, 1.42, sz * 0.6, 0.16, 0.26, 0.32, steel, MAT.STEEL, 0.02);
    b.box(1.79, 1.44, sz * 0.6, 0.02, 0.18, 0.22, PAL.white, MAT.EMIT_W, 0.006);
  }
  b.part('rearlights');
  for (const sz of [-1, 1]) {
    b.box(-1.75, 1.3, sz * 0.62, 0.1, 0.17, 0.2, steel, MAT.STEEL, 0.015);
    b.box(-1.81, 1.3, sz * 0.62, 0.02, 0.12, 0.13, PAL.red, MAT.EMIT_R, 0.004);
  }
  b.part('reargear');
  b.box(-1.95, 1.15, 0, 0.16, 0.85, 1.15, yellow, MAT.PAINT, 0.03);
  b.box(-2.02, 1.15, 0, 0.05, 0.6, 0.9, steel, MAT.STEEL, 0.02);
  for (let i = 0; i < 4; i++) b.box(-1.84, 0.82 + i * 0.18, 0.35, 0.14, 0.05, 0.55, PAL.steel, MAT.STEEL, 0.006);
  b.box(-2.06, 0.9, -0.55, 0.12, 0.28, 0.28, PAL.rustD, MAT.RUST, 0.01);
  b.box(-1.78, 1.72, -0.58, 0.32, 0.38, 0.18, PAL.paintOlive, MAT.PAINT, 0.02);
  b.box(-1.9, 0.38, 0.62, 0.12, 0.14, 0.12, steel, MAT.STEEL, 0.01);
  b.part('exhaust');
  b.cyl(-1.82, 1.72, 0.55, 0.055, 0.05, 0.66, 12, PAL.rust, MAT.RUST);
  b.cyl(-1.82, 2.06, 0.55, 0.08, 0.055, 0.1, 12, PAL.rustD, MAT.RUST);
  b.part('beacon');
  b.cyl(0.72, 2.44, 0, 0.1, 0.09, 0.16, 16, steel, MAT.STEEL);
  b.sphere(0.72, 2.55, 0, 0.1, 0.13, 0.1, 16, 8, PAL.red, MAT.EMIT_R);
  b.box(0.72, 2.6, 0, 0.26, 0.04, 0.12, steel, MAT.STEEL, 0.006);
  b.part('worklight');
  b.box(-0.18, 2.18, 0.8, 0.22, 0.16, 0.16, steel, MAT.STEEL, 0.014);
  b.box(-0.29, 2.18, 0.8, 0.03, 0.1, 0.12, PAL.amber, MAT.EMIT_W, 0.004);
  b.part('winch');
  b.cyl(2.05, 0.98, 0, 0.12, 0.12, 0.3, 18, steel, MAT.STEEL, true, 'z');
  b.box(2.08, 0.98, 0, 0.26, 0.18, 0.22, steel, MAT.STEEL, 0.02);
  b.part('antenna');
  b.cyl(-1.1, 2.9, -0.7, 0.012, 0.008, 1.6, 5, PAL.steel, MAT.STEEL);
  b.sphere(-1.1, 3.7, -0.7, 0.04, 0.04, 0.04, 8, 5, PAL.cyan, MAT.EMIT_C);
  b.part('mirror');
  for (const sz of [-1, 1]) {
    b.tube([[1.2, 1.9, sz * 0.92], [1.2, 2.16, sz * 1.02]], 0.025, 5, steel, MAT.STEEL);
    b.box(1.2, 2.2, sz * 1.04, 0.18, 0.24, 0.05, steel, MAT.STEEL, 0.01);
  }
  b.part('snow');
  b.box(0.15, 1.32, 0.42, 1.55, 0.04, 0.4, PAL.snowB, MAT.SNOW, 0.04);
  b.box(-1.45, 1.34, 0, 0.55, 0.06, 1.25, PAL.snow, MAT.SNOW, 0.04);
  b.box(0, 0.15, 0.9, 3.0, 0.06, 0.2, PAL.snow, MAT.SNOW, 0.03);
  b.part('plate');
  b.box(1.4, 1.1, 0.86, 0.5, 0.18, 0.02, yellow, MAT.PAINT, 0.004);
  b.box(1.4, 1.1, 0.875, 0.3, 0.06, 0.005, steel, MAT.STEEL, 0.001);
  const d = b.finish('snowcat', [
    { name: 'tracks', extents: [3.6, 0.75, 2.25] },
    { name: 'cab', extents: [1.8, 1.2, 1.7] },
    { name: 'blade', extents: [0.2, 1.2, 2.9] },
    { name: 'exhaust', extents: [0.2, 1.1, 0.2] },
    { name: 'headlights', extents: [0.2, 0.26, 0.32] },
    { name: 'beacon', extents: [0.26, 0.3, 0.2] },
    { name: 'reargear', extents: [0.2, 0.85, 1.15] }
  ]);
  d.lights = [{ pos: [-0.2, 2.18, 0.9], color: [1.0, 0.5, 0.2], intensity: 10, distance: 8, kind: 'door' }];
  d.dims = { w: 4.5, h: 2.9, d: 2.5 };
  return d;
}

/* ------------------------------- crates -------------------------------- */
function buildCrate(variant = 0) {
  const b = new Builder();
  const steelVariant = variant % 3 === 2;
  const S = [0.95, 1.25, 1.55][variant % 3];
  const col = steelVariant ? [PAL.paintOlive, PAL.paintBlue, PAL.paintGrey][variant % 3] : PAL.wood;
  b.part('body');
  if (steelVariant) {
    b.box(0, S / 2, 0, S, S, S * 0.82, col, MAT.PAINT, 0.03);
    b.box(0, S * 0.94, 0, S * 0.94, S * 0.12, S * 0.78, PAL.steelD, MAT.STEEL, 0.02);
    b.part('latches');
    for (const sx of [-1, 1]) {
      b.box(sx * S * 0.3, S * 0.75, S * 0.42, 0.16, 0.22, 0.05, PAL.steel, MAT.STEEL, 0.008);
      b.box(sx * S * 0.3, S * 0.5, S * 0.42, 0.1, 0.06, 0.045, PAL.steelD, MAT.STEEL, 0.004);
    }
    b.part('label');
    b.box(0, S * 0.55, S * 0.42, S * 0.36, S * 0.2, 0.02, PAL.paintYellow, MAT.PAINT, 0.004);
    b.box(0, S * 0.55, S * 0.432, S * 0.26, S * 0.06, 0.01, PAL.steelD, MAT.STEEL, 0.002);
  } else {
    b.box(0, S / 2, 0, S, S, S * 0.85, col, MAT.WOOD, 0.03);
    for (let i = 0; i < 3; i++) b.box(0, S * (i + 0.5) / 3, S * 0.425 + 0.005, S * 0.98, 0.045, 0.02, PAL.woodD, MAT.WOOD, 0.006);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * S * 0.44, S / 2, sz * S * 0.44, 0.16, S, 0.045, PAL.steelD, MAT.STEEL, 0.006);
    b.part('braces');
    for (const sz of [-1, 1]) b.box(0, S * 0.5, sz * (S * 0.425), S * 0.96, 0.09, 0.03, PAL.steelD, MAT.STEEL, 0.006);
    b.part('label');
    b.box(S * 0.12, S * 0.54, S * 0.43, S * 0.34, S * 0.2, 0.02, PAL.paintYellow, MAT.PAINT, 0.004);
    b.part('lid');
    b.box(0, S * 0.97, 0, S * 1.01, S * 0.07, S * 0.88, PAL.woodD, MAT.WOOD, 0.01);
  }
  b.part('snow');
  b.box(0, S * 1.005, 0, S * 0.92, 0.045, S * 0.7, PAL.snow, MAT.SNOW, 0.03);
  const d = b.finish('crate', [
    { name: 'body', extents: [S, S, S] },
    { name: 'label', extents: [S * 0.34, S * 0.2, 0.03] },
    { name: steelVariant ? 'latches' : 'braces', extents: [0.2, 0.2, 0.1] },
    { name: 'snow', extents: [S * 0.8, 0.1, S * 0.6] }
  ]);
  d.dims = { w: S, h: S, d: S * 0.9 };
  return d;
}

/* -------------------------------- drums -------------------------------- */
function buildDrum(variant = 0, lying = false) {
  const b = new Builder();
  const col = [PAL.paintBlue, PAL.rust, PAL.paintRed, PAL.paintOlive][variant % 4];
  const R = 0.29, L = 0.9;
  b.part('body');
  if (!lying) {
    b.cyl(0, L / 2, 0, R, R, L, 32, col, MAT.PAINT);
    b.cyl(0, 0.12, 0, R + 0.015, R + 0.015, 0.05, 32, PAL.steelD, MAT.STEEL);
    b.cyl(0, L - 0.12, 0, R + 0.015, R + 0.015, 0.05, 32, PAL.steelD, MAT.STEEL);
    b.cyl(0, L, 0, R * 0.92, R * 0.92, 0.06, 32, PAL.steelD, MAT.STEEL);
    b.part('valve');
    b.cyl(0.12, L + 0.06, 0, 0.055, 0.055, 0.08, 16, PAL.steel, MAT.STEEL);
    b.part('band');
    b.box(0, L * 0.5, R + 0.004, R * 1.1, 0.24, 0.02, PAL.paintYellow, MAT.PAINT, 0.004);
  } else {
    b.cyl(0, 0, 0, R, R, L, 32, col, MAT.PAINT, true, 'z');
    b.cyl(0, 0, L / 2 - 0.1, R * 0.62, R * 0.62, 0.01, 24, PAL.snow, MAT.SNOW, true, 'z');
    b.part('band');
    b.cyl(0, 0, 0, R + 0.012, R + 0.012, 0.22, 32, PAL.paintYellow, MAT.PAINT, false, 'z');
  }
  b.part('snow');
  if (!lying) snowSlab(b, 0, L + 0.02, 0, R * 1.6, R * 1.5, 0.035);
  const d = b.finish('drum', [
    { name: 'body', extents: [R * 2, L, R * 2] },
    { name: 'band', extents: [R * 1.2, 0.24, 0.03] }
  ]);
  d.dims = { w: R * 2, h: lying ? R * 2 : L, d: lying ? L : R * 2 };
  return d;
}

/* ------------------------------- generator ----------------------------- */
function buildGenerator() {
  const b = new Builder();
  const W = 2.2, H = 1.35, D = 1.25;
  b.part('skid');
  b.box(0, 0.12, 0, W + 0.2, 0.24, D + 0.2, PAL.steelD, MAT.STEEL, 0.03);
  b.part('body');
  b.box(0, H / 2 + 0.2, 0, W, H, D, PAL.paintBlue, MAT.PAINT, 0.04);
  for (let i = 0; i < 7; i++) b.box(-0.75 + i * 0.25, H * 0.56 + 0.2, D / 2 + 0.01, 0.14, 0.36, 0.03, PAL.steelD, MAT.STEEL, 0.006);
  b.box(0, H * 0.32 + 0.2, D / 2 + 0.02, W * 0.55, 0.3, 0.03, PAL.steelD, MAT.STEEL, 0.008);
  b.part('exhaust');
  b.cyl(-0.75, H + 0.42, -0.3, 0.075, 0.07, 0.8, 16, PAL.rust, MAT.RUST);
  b.cyl(-0.75, H + 0.84, -0.3, 0.13, 0.04, 0.12, 16, PAL.rustD, MAT.RUST);
  b.part('tank');
  b.cyl(0.7, H + 0.32, -0.25, 0.22, 0.22, 0.5, 24, PAL.paintRed, MAT.PAINT, true, 'x');
  b.part('cable');
  b.tube([[0.9, 0.3, 0.6], [1.5, 0.08, 0.9], [1.9, 0.06, 0.6], [2.1, 0.1, 0.2]], 0.045, 5, PAL.rubber, MAT.RUBBER);
  b.part('warning');
  warningBand(b, 0, H * 0.72 + 0.2, D / 2 + 0.02, 1.0, 0.14, 0.02);
  b.part('snow');
  b.box(0, H + 0.23, 0, W * 0.8, 0.06, D * 0.8, PAL.snow, MAT.SNOW, 0.04);
  const d = b.finish('generator', [
    { name: 'body', extents: [W, H, D] },
    { name: 'exhaust', extents: [0.16, 0.8, 0.16] },
    { name: 'tank', extents: [0.5, 0.44, 0.44] },
    { name: 'cable', extents: [1.4, 0.3, 0.4] }
  ]);
  d.dims = { w: 2.4, h: 1.9, d: 1.5 };
  return d;
}

/* ------------------------------ light mast ----------------------------- */
function buildLightMast() {
  const b = new Builder();
  b.part('base');
  b.box(0, 0.16, 0, 1.2, 0.32, 1.2, PAL.concrete, MAT.CONCRETE, 0.03);
  boltRing(b, 0, 0.33, 0, 0.45, 0.45, 6, 0.035);
  b.part('pole');
  b.cyl(0, 4.2, 0, 0.13, 0.075, 7.8, 32, PAL.steel, MAT.STEEL);
  for (let i = 0; i < 3; i++) b.cyl(0, 2.2 + i * 1.9, 0, 0.11 - i * 0.012, 0.11 - i * 0.012, 0.06, 20, PAL.steelD, MAT.STEEL);
  b.part('head');
  b.at(0, 8.0, 0);
  b.box(0, 0, 0, 1.5, 0.16, 0.4, PAL.steelD, MAT.STEEL, 0.02);
  for (const s of [-1, 1]) {
    b.at(s * 0.45, -0.18, 0.16, s * 0.16);
    b.box(0, 0, 0, 0.56, 0.24, 0.34, PAL.steelD, MAT.STEEL, 0.02);
    b.box(0, -0.13, 0.02, 0.44, 0.02, 0.26, PAL.amber, MAT.EMIT_W, 0.003);
    b.done();
  }
  b.done();
  b.part('ladder');
  for (const s of [-1, 1]) b.cyl(s * 0.16, 4.0, 0.24, 0.022, 0.022, 7.6, 6, PAL.steel, MAT.STEEL);
  for (let i = 0; i < 12; i++) {
    b.at(0, 0.8 + i * 0.6, 0.24);
    b.cyl(0, 0, 0, 0.016, 0.016, 0.32, 4, PAL.steelD, MAT.STEEL, false, 'x');
    b.done();
  }
  b.part('cable');
  b.tube([[0.1, 7.9, 0.05], [0.3, 6.0, 0.1], [0.18, 2.0, 0.16], [0.05, 0.35, 0.12]], 0.035, 5, PAL.rubber, MAT.RUBBER);
  b.part('snow');
  b.box(0, 8.1, 0, 1.2, 0.05, 0.3, PAL.snow, MAT.SNOW, 0.03);
  const d = b.finish('lightmast', [
    { name: 'pole', extents: [0.26, 7.8, 0.26] },
    { name: 'head', extents: [1.4, 0.4, 0.4] },
    { name: 'ladder', extents: [0.4, 7.6, 0.2] }
  ]);
  d.lights = [{ pos: [0.45, 7.95, 0.45], color: [1.0, 0.6, 0.3], intensity: 65, distance: 28, kind: 'flood' }];
  return d;
}

/* -------------------------------- dish --------------------------------- */
function buildDish(variant = 0) {
  const b = new Builder();
  b.part('plinth');
  b.cyl(0, 0.2, 0, 0.9, 0.7, 0.4, 24, PAL.concrete, MAT.CONCRETE);
  b.part('pole');
  b.cyl(0, 1.55, 0, 0.16, 0.11, 2.3, 24, PAL.steel, MAT.STEEL);
  b.part('dish');
  b.at(0, 2.9, 0, 0, -0.42, 0);
  const R = 1.35;
  // paraboloid shell: rings of quads
  const rings = 6, segs = 24;
  for (let j = 0; j < rings; j++) {
    const r0 = R * j / rings, r1 = R * (j + 1) / rings;
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      const y0 = -0.18 * (r0 / R) * (r0 / R), y1 = -0.18 * (r1 / R) * (r1 / R);
      const p = (r, a, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
      const c = j % 2 ? PAL.steel : PAL.steelD;
      b.quad(p(r0, a0, y0), p(r0, a1, y0), p(r1, a1, y1), p(r1, a0, y1), [0, 1, 0], c, MAT.STEEL);
    }
  }
  b.cyl(0, 0.1, 0, R, R, 0.05, 32, PAL.steelD, MAT.STEEL);
  b.done();
  b.part('feed');
  b.at(0, 2.9, 0, 0, -0.42, 0);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU;
    b.tube([[Math.cos(a) * R * 0.9, -0.12, Math.sin(a) * R * 0.9], [Math.cos(a) * 0.16, 0.55, Math.sin(a) * 0.16]], 0.022, 4, PAL.steelD, MAT.STEEL);
  }
  b.cyl(0, 0.58, 0, 0.14, 0.1, 0.24, 16, PAL.steelD, MAT.STEEL);
  b.sphere(0, 0.72, 0, 0.09, 0.09, 0.09, 12, 8, PAL.cyan, MAT.EMIT_C);
  b.done();
  b.part('cable');
  b.tube([[0.1, 2.4, 0], [0.4, 1.2, 0.2], [0.3, 0.4, 0.5]], 0.035, 5, PAL.rubber, MAT.RUBBER);
  b.part('snow');
  b.box(0, 0.42, 0, 1.2, 0.05, 1.2, PAL.snow, MAT.SNOW, 0.03);
  const d = b.finish('dish', [
    { name: 'plinth', extents: [1.8, 0.4, 1.8] },
    { name: 'pole', extents: [0.3, 2.3, 0.3] },
    { name: 'dish', extents: [2.7, 0.6, 2.7] },
    { name: 'feed', extents: [0.3, 1.0, 0.3] }
  ]);
  d.dims = { w: 2.8, h: 4.3, d: 2.8 };
  return d;
}

/* ------------------------------ fuel tank ------------------------------ */
function buildFuelTank() {
  const b = new Builder();
  b.part('saddles');
  for (const x of [-1.7, 1.7]) {
    b.box(x, 0.32, 0, 0.5, 0.64, 2.1, PAL.concrete, MAT.CONCRETE, 0.03);
    b.box(x, 0.68, 0, 0.7, 0.12, 2.2, PAL.steelD, MAT.STEEL, 0.02);
  }
  b.part('shell');
  b.cyl(0, 1.75, 0, 1.05, 1.05, 4.6, 32, PAL.paintGrey, MAT.PAINT, true, 'x');
  b.cyl(2.31, 1.75, 0, 0.9, 0.55, 0.2, 24, PAL.paintGrey, MAT.PAINT, true, 'x');
  b.cyl(-2.31, 1.75, 0, 0.9, 0.55, 0.2, 24, PAL.paintGrey, MAT.PAINT, true, 'x');
  b.part('bands');
  for (const x of [-1.2, 1.2]) {
    b.cyl(x, 1.75, 0, 1.07, 1.07, 0.12, 32, PAL.rust, MAT.RUST, true, 'x');
  }
  b.part('ladder');
  for (const z of [-0.28, 0.28]) b.cyl(1.2, 1.4, z, 0.02, 0.02, 2.2, 6, PAL.steel, MAT.STEEL);
  for (let i = 0; i < 4; i++) {
    b.at(1.2, 0.5 + i * 0.5, 0);
    b.cyl(0, 0, 0, 0.016, 0.016, 0.56, 4, PAL.steelD, MAT.STEEL, false, 'z');
    b.done();
  }
  b.part('pipe');
  b.tube([[1.2, 2.5, 0.3], [1.7, 2.9, 0.3], [2.4, 2.9, 0.3], [2.7, 1.8, 0.3]], 0.09, 8, PAL.rust, MAT.RUST);
  b.part('warning');
  warningBand(b, 0, 1.75, 1.06, 1.4, 0.36, 0.04);
  b.part('snow');
  b.at(0, 2.75, 0, 0, 0, 0);
  b.box(0, 0, 0, 3.2, 0.07, 0.8, PAL.snow, MAT.SNOW, 0.06);
  b.done();
  const d = b.finish('fueltank', [
    { name: 'shell', extents: [5.0, 2.1, 2.1] },
    { name: 'saddles', extents: [0.7, 0.7, 2.1] },
    { name: 'ladder', extents: [0.4, 2.2, 0.6] },
    { name: 'pipe', extents: [1.6, 1.0, 0.2] }
  ]);
  d.dims = { w: 5.2, h: 2.9, d: 2.3 };
  return d;
}

/* -------------------------------- fence -------------------------------- */
function buildFence() {
  const b = new Builder();
  b.part('posts');
  for (const x of [-2, 2]) {
    b.cyl(x, 0.75, 0, 0.07, 0.06, 1.5, 12, PAL.rust, MAT.RUST);
    b.cyl(x, 0.04, 0, 0.14, 0.1, 0.14, 12, PAL.rustD, MAT.RUST);
  }
  b.part('rails');
  for (let i = 0; i < 3; i++) b.box(0, 0.35 + i * 0.48, 0, 4.1, 0.055, 0.05, PAL.rust, MAT.RUST, 0.01);
  b.part('mesh');
  // coarse mesh represented by diagonal wires (reads at mid distance, 6 cm)
  for (let i = 0; i < 10; i++) {
    b.tube([[-2 + i * 0.4, 0.1, 0], [-2 + i * 0.4 + 0.6, 1.4, 0]], 0.012, 4, PAL.steelD, MAT.STEEL);
  }
  b.part('snow');
  b.sphere(0, -0.1, 0, 2.2, 0.32, 0.5, 14, 6, PAL.snow, MAT.SNOW, (dx, dy, dz, u, v) => 1 + 0.15 * Math.sin(u * TAU * 5), null);
  const d = b.finish('fence', [
    { name: 'posts', extents: [0.15, 1.5, 0.15] },
    { name: 'rails', extents: [4.1, 0.06, 0.06] },
    { name: 'mesh', extents: [4.0, 1.3, 0.1] }
  ]);
  d.dims = { w: 4.2, h: 1.5, d: 0.4 };
  return d;
}

/* ----------------------------- supply cache ---------------------------- */
function buildSupply() {
  const b = new Builder();
  b.part('case');
  b.box(0, 0.4, 0, 1.15, 0.8, 0.72, PAL.paintOlive, MAT.PAINT, 0.04);
  b.box(0, 0.84, 0, 1.18, 0.09, 0.75, PAL.paintOlive, MAT.PAINT, 0.02);
  b.part('latches');
  for (const x of [-0.36, 0.36]) b.box(x, 0.66, 0.37, 0.16, 0.12, 0.05, PAL.steel, MAT.STEEL, 0.008);
  b.part('stripe');
  b.box(0, 0.52, 0.365, 0.98, 0.06, 0.015, PAL.paintYellow, MAT.PAINT, 0.003);
  b.part('beacon');
  b.cyl(0.4, 0.9, 0.22, 0.06, 0.05, 0.16, 12, PAL.steelD, MAT.STEEL);
  b.sphere(0.4, 1.02, 0.22, 0.07, 0.09, 0.07, 14, 8, PAL.cyan, MAT.EMIT_C);
  b.part('snow');
  b.box(-0.15, 0.9, -0.1, 0.7, 0.04, 0.45, PAL.snow, MAT.SNOW, 0.03);
  b.part('handle');
  b.tube([[-0.3, 0.9, -0.1], [0.3, 0.9, -0.1]], 0.025, 4, PAL.steelD, MAT.STEEL);
  const d = b.finish('supply', [
    { name: 'case', extents: [1.18, 0.9, 0.75] },
    { name: 'beacon', extents: [0.2, 0.3, 0.2] },
    { name: 'latches', extents: [0.16, 0.12, 0.05] },
    { name: 'stripe', extents: [0.98, 0.06, 0.02] }
  ]);
  d.dims = { w: 1.2, h: 1.1, d: 0.8 };
  return d;
}

/* ------------------------------- pallet -------------------------------- */
function buildPallet() {
  const b = new Builder();
  b.part('slats');
  for (let i = 0; i < 5; i++) b.box(0, 0.15, -0.5 + i * 0.25, 1.2, 0.045, 0.16, PAL.ply, MAT.WOOD, 0.006);
  for (const z of [-0.45, 0, 0.45]) b.box(0, 0.06, z, 1.2, 0.1, 0.12, PAL.woodD, MAT.WOOD, 0.006);
  b.part('load');
  b.box(0, 0.55, 0.02, 1.05, 0.72, 1.0, PAL.tarp, MAT.FABRIC, 0.03);
  b.sphere(-0.2, 0.95, 0, 0.5, 0.16, 0.5, 14, 6, PAL.snow, MAT.SNOW, (dx, dy, dz, u, v) => 1 + 0.08 * Math.sin(u * TAU * 4), null);
  b.part('straps');
  for (const x of [-0.3, 0.3]) b.box(x, 0.92, 0, 0.06, 0.04, 1.04, PAL.steelD, MAT.STEEL, 0.004);
  b.part('snow');
  b.box(0, 0.94, -0.25, 0.7, 0.03, 0.4, PAL.snow, MAT.SNOW, 0.02);
  const d = b.finish('pallet', [
    { name: 'slats', extents: [1.2, 0.2, 1.2] },
    { name: 'load', extents: [1.05, 0.72, 1.0] },
    { name: 'straps', extents: [0.9, 0.6, 1.0] }
  ]);
  d.dims = { w: 1.25, h: 1.1, d: 1.1 };
  return d;
}

/* -------------------------------- rock --------------------------------- */
function buildRock(seed, size = 1.5) {
  const b = new Builder();
  const R = mulberry32(seed * 31 + 5);
  const ph = [R() * 9, R() * 9, R() * 9];
  b.part('stone');
  b.sphere(0, size * 0.28, 0, size, size * (0.5 + R() * 0.3), size * (0.7 + R() * 0.4), 20, 12,
    PAL.rock, MAT.ROCK, (dx, dy, dz, u, v) => {
      const wob = 0.12 * Math.sin(u * TAU * 3 + ph[0]) + 0.08 * Math.sin(v * PI * 5 + ph[1]) + 0.05 * Math.sin(u * TAU * 7 + ph[2]);
      return 1 + wob;
    }, PAL.snow);
  b.part('snowcap');
  b.sphere(0, size * 0.42, 0, size * 0.62, size * 0.2, size * 0.5, 16, 8, PAL.snow, MAT.SNOW,
    (dx, dy, dz, u, v) => 1 + 0.11 * Math.sin(u * TAU * 4 + ph[1]), null);
  const d = b.finish('rock', [{ name: 'stone', extents: [size * 2, size, size * 2] }, { name: 'snowcap', extents: [size, size * 0.4, size] }]);
  d.dims = { w: size * 2, h: size * 1.2, d: size * 1.5 };
  return d;
}

/* -------------------------------- drift -------------------------------- */
function buildDrift(seed, rx = 3, ry = 0.85, rz = 2) {
  const b = new Builder();
  const R = mulberry32(seed * 17 + 3);
  const ph = [R() * 8, R() * 8, R() * 8];
  b.part('bank');
  b.sphere(0, -0.12, 0, rx, ry, rz, 22, 12, PAL.snow, MAT.SNOW, (dx, dy, dz, u, v) => {
    const wob = 0.13 * Math.sin(u * TAU * 2 + ph[0]) + 0.07 * Math.sin(v * PI * 3 + ph[1]) + 0.045 * Math.sin(u * TAU * 5 + v * 4 + ph[2]);
    return 1 + wob * (1 - Math.abs(dy) * 0.4);
  }, null);
  b.part('crust');
  b.sphere(rx * 0.25, ry * 0.28, rz * 0.2, rx * 0.5, ry * 0.22, rz * 0.45, 14, 8, PAL.snowB, MAT.SNOW,
    (dx, dy, dz, u, v) => 1 + 0.06 * Math.sin(u * TAU * 6 + ph[2]), null);
  const d = b.finish('drift', [{ name: 'bank', extents: [rx * 2, ry, rz * 2] }, { name: 'crust', extents: [rx, ry * 0.4, rz] }]);
  d.dims = { w: rx * 2, h: ry, d: rz * 2 };
  return d;
}

/* ----------------------------- comms mast ------------------------------ */
function buildCommsMast() {
  const b = new Builder();
  const H = 15.5;
  b.part('base');
  b.box(0, 0.25, 0, 4.2, 0.5, 4.2, PAL.concrete, MAT.CONCRETE, 0.04);
  boltRing(b, 0, 0.5, 0, 1.5, 1.5, 8, 0.05);
  b.part('legs');
  const foot = 1.55, top = 0.42;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const p0 = [sx * foot, 0.4, sz * foot], p1 = [sx * top, H, sz * top];
    b.tube([p0, p1], 0.07, 6, PAL.steel, MAT.STEEL);
    b.cyl(p0[0], 0.48, p0[2], 0.18, 0.12, 0.24, 12, PAL.steelD, MAT.STEEL);
  }
  b.part('braces');
  for (let i = 0; i < 7; i++) {
    const y0 = 0.6 + i * 2.1, y1 = y0 + 2.1;
    const s0 = lerp(foot, top, y0 / H), s1 = lerp(foot, top, y1 / H);
    for (const [a, c] of [[[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]], [[-1, 1], [1, 1]]]) {
      b.tube([[a[0] * s0, y0, a[1] * s0], [c[0] * s1, y1, c[1] * s1]], 0.035, 4, PAL.steelD, MAT.STEEL);
      b.tube([[c[0] * s0, y0, c[1] * s0], [a[0] * s1, y1, a[1] * s1]], 0.03, 4, PAL.steelD, MAT.STEEL);
    }
  }
  b.part('platform');
  b.box(0, H, 0, 1.6, 0.14, 1.6, PAL.steelD, MAT.STEEL, 0.02);
  b.cyl(0, H + 0.2, 0, 0.3, 0.3, 0.35, 20, PAL.steel, MAT.STEEL);
  b.part('antenna');
  b.cyl(0, H + 1.4, 0, 0.06, 0.04, 2.4, 12, PAL.steel, MAT.STEEL);
  for (let i = 0; i < 3; i++) {
    b.at(0, H + 0.7 + i * 0.55, 0);
    b.cyl(0, 0, 0, 0.02, 0.02, 1.1 - i * 0.2, 5, PAL.steel, MAT.STEEL, false, 'x');
    b.cyl(0, 0, 0, 0.02, 0.02, 1.1 - i * 0.2, 5, PAL.steel, MAT.STEEL, false, 'z');
    b.done();
  }
  b.part('beacon');
  b.sphere(0, H + 2.75, 0, 0.15, 0.18, 0.15, 18, 9, PAL.red, MAT.EMIT_R);
  b.part('guy');
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + PI / 4;
    b.tube([[Math.cos(a) * 0.4, H - 0.4, Math.sin(a) * 0.4],
      [Math.cos(a) * 6.5, 7.5, Math.sin(a) * 6.5],
      [Math.cos(a) * 10.5, 0.2, Math.sin(a) * 10.5]], 0.017, 4, PAL.steelD, MAT.STEEL);
    b.cyl(Math.cos(a) * 10.5, 0.2, Math.sin(a) * 10.5, 0.2, 0.12, 0.36, 12, PAL.concreteD, MAT.CONCRETE);
  }
  b.part('snow');
  b.box(0, H + 0.12, 0, 1.4, 0.05, 1.4, PAL.snow, MAT.SNOW, 0.04);
  const d = b.finish('comms', [
    { name: 'legs', extents: [3.2, H, 3.2] },
    { name: 'platform', extents: [1.6, 0.4, 1.6] },
    { name: 'antenna', extents: [1.1, 2.4, 1.1] },
    { name: 'beacon', extents: [0.3, 0.36, 0.3] },
    { name: 'guy', extents: [21, 15, 21] }
  ]);
  d.dims = { w: 21, h: 19.5, d: 21 };
  return d;
}

/* ------------------------------- signpost ------------------------------ */
function buildSignpost() {
  const b = new Builder();
  b.part('post');
  b.cyl(0, 1.15, 0, 0.065, 0.055, 2.3, 12, PAL.rust, MAT.RUST);
  b.box(0, 0.06, 0, 0.34, 0.12, 0.34, PAL.concreteD, MAT.CONCRETE, 0.02);
  b.part('plate');
  b.box(0, 1.75, 0.03, 0.86, 0.5, 0.05, PAL.paintYellow, MAT.PAINT, 0.008);
  b.box(0, 1.75, 0.06, 0.8, 0.42, 0.02, PAL.paintGrey, MAT.PAINT, 0.004);
  b.box(0, 1.75, 0.075, 0.52, 0.12, 0.01, PAL.steelD, MAT.STEEL, 0.002);
  b.box(0, 1.35, 0.03, 0.7, 0.3, 0.04, PAL.paintRed, MAT.PAINT, 0.006);
  b.box(0, 1.35, 0.055, 0.62, 0.06, 0.01, PAL.snow, MAT.SNOW, 0.002);
  b.part('snow');
  b.box(0, 2.02, 0, 0.9, 0.05, 0.16, PAL.snow, MAT.SNOW, 0.03);
  b.box(-0.3, 2.26, 0, 0.2, 0.03, 0.12, PAL.snow, MAT.SNOW, 0.02);
  b.cyl(0, 2.3, 0, 0.04, 0.03, 0.1, 8, PAL.snow, MAT.SNOW);
  const d = b.finish('signpost', [
    { name: 'post', extents: [0.13, 2.3, 0.13] },
    { name: 'plate', extents: [0.86, 0.5, 0.05] }
  ]);
  d.dims = { w: 0.9, h: 2.35, d: 0.3 };
  return d;
}

/* ------------------------------- cable reel ---------------------------- */
function buildReel() {
  const b = new Builder();
  b.part('spool');
  for (const s of [-1, 1]) b.cyl(0, 0.85, s * 0.34, 0.72, 0.72, 0.06, 28, PAL.woodD, MAT.WOOD);
  b.cyl(0, 0.85, 0, 0.48, 0.48, 0.66, 28, PAL.wood, MAT.WOOD);
  for (let i = 0; i < 4; i++) {
    b.at(0, 0.85, 0);
    b.box(0, 0, 0, 0.1, 1.42, 0.1, PAL.woodD, MAT.WOOD, 0.01);
    b.done();
  }
  b.part('cable');
  for (let i = 0; i < 4; i++) b.cyl(0, 0.85, ((i % 2) * 2 - 1) * 0.1, 0.5, 0.5, 0.11, 24, PAL.rubber, MAT.RUBBER);
  b.tube([[0.4, 0.3, 0.3], [1.1, 0.08, 0.7], [1.8, 0.05, 0.4]], 0.035, 5, PAL.rubber, MAT.RUBBER);
  b.part('frame');
  for (const s of [-1, 1]) {
    b.box(0, 0.08, s * 0.5, 1.7, 0.14, 0.1, PAL.steelD, MAT.STEEL, 0.02);
    b.cyl(0, 0.85, s * 0.45, 0.07, 0.07, 0.45, 12, PAL.rust, MAT.RUST, true, 'z');
  }
  b.box(-0.7, 0.05, 0, 0.14, 0.1, 1.2, PAL.steelD, MAT.STEEL, 0.02);
  b.part('snow');
  b.sphere(-0.2, 1.45, 0.05, 0.4, 0.08, 0.3, 14, 6, PAL.snow, MAT.SNOW, null, null);
  const d = b.finish('reel', [
    { name: 'spool', extents: [1.45, 1.45, 0.75] },
    { name: 'cable', extents: [1.0, 1.0, 0.7] },
    { name: 'frame', extents: [1.7, 0.8, 1.1] }
  ]);
  d.dims = { w: 1.8, h: 1.6, d: 1.2 };
  return d;
}

/* -------------------------------- radome ------------------------------- */
function buildRadome() {
  const b = new Builder();
  const R = 2.15, baseY = 0.55;
  b.part('base');
  b.cyl(0, 0.28, 0, 2.35, 2.2, 0.56, 28, PAL.concrete, MAT.CONCRETE);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    b.box(Math.cos(a) * 2.1, 0.34, Math.sin(a) * 2.1, 0.4, 0.3, 0.4, PAL.concreteD, MAT.CONCRETE, 0.03);
  }
  b.part('dome');
  b.sphere(0, baseY + 0.55, 0, R, R * 0.92, R, 32, 18, [0.66, 0.70, 0.72], MAT.PAINT, null, null);
  b.part('ribs');
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const phi = k / 8 * PI * 0.52;
      const r = Math.cos(phi) * R * 0.99, y = baseY + 0.55 + Math.sin(phi) * R * 0.92 * 0.99;
      pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    b.tube(pts, 0.028, 4, PAL.steelD, MAT.STEEL);
  }
  for (let j = 1; j < 4; j++) {
    const phi = j / 4 * PI * 0.5;
    b.cyl(0, baseY + 0.55 + Math.sin(phi) * R * 0.92, 0, Math.cos(phi) * R * 1.002, Math.cos(phi) * R * 1.002, 0.035, 32, PAL.steelD, MAT.STEEL);
  }
  b.part('door');
  b.box(0, 1.15, R * 0.93, 0.9, 1.4, 0.08, PAL.steelD, MAT.STEEL, 0.02);
  b.box(0, 1.15, R * 0.98, 0.72, 1.22, 0.03, PAL.paintYellow, MAT.PAINT, 0.006);
  b.box(0.3, 1.1, R * 1.0, 0.1, 0.04, 0.04, PAL.steel, MAT.STEEL, 0.003);
  b.part('antenna');
  b.cyl(0, baseY + 2.5, 0, 0.04, 0.02, 1.6, 8, PAL.steel, MAT.STEEL);
  b.sphere(0, baseY + 3.35, 0, 0.07, 0.07, 0.07, 10, 6, PAL.red, MAT.EMIT_R);
  b.part('snow');
  b.box(-0.5, baseY + 1.85, 0.4, 1.3, 0.06, 0.8, PAL.snow, MAT.SNOW, 0.05);
  const d = b.finish('radome', [
    { name: 'dome', extents: [R * 2, R * 1.8, R * 2] },
    { name: 'base', extents: [4.4, 0.6, 4.4] },
    { name: 'ribs', extents: [4.2, 3.6, 4.2] },
    { name: 'door', extents: [0.9, 1.4, 0.1] }
  ]);
  d.dims = { w: 4.6, h: 4.8, d: 4.6 };
  return d;
}

/* ------------------------------ crate stack ---------------------------- */
const KIT = {};
function buildKit() {
  KIT.relay = buildRelay();
  KIT.hut = [buildHut(0), buildHut(1), buildHut(2)];
  KIT.garage = buildGarage();
  KIT.snowcat = buildSnowcat();
  KIT.crate = [buildCrate(0), buildCrate(1), buildCrate(2)];
  KIT.drum = [buildDrum(0), buildDrum(1), buildDrum(2), buildDrum(3)];
  KIT.drumLying = [buildDrum(1, true), buildDrum(3, true)];
  KIT.generator = buildGenerator();
  KIT.lightmast = buildLightMast();
  KIT.dish = [buildDish(0), buildDish(1)];
  KIT.fueltank = buildFuelTank();
  KIT.fence = buildFence();
  KIT.supply = buildSupply();
  KIT.pallet = buildPallet();
  KIT.rock = [buildRock(1, 1.7), buildRock(2, 1.1), buildRock(3, 2.4), buildRock(4, 0.9), buildRock(5, 1.4)];
  KIT.drift = [buildDrift(1, 3.4, 0.9, 2.2), buildDrift(2, 2.2, 0.7, 1.6), buildDrift(3, 5.5, 1.1, 2.8), buildDrift(4, 1.8, 0.55, 1.3)];
  KIT.comms = buildCommsMast();
  KIT.signpost = buildSignpost();
  KIT.reel = buildReel();
  KIT.radome = buildRadome();
  KIT.triangleCount = 0;
  for (const k in KIT) {
    if (KIT[k] && KIT[k].geo) KIT.triangleCount += KIT[k].tris;
    else if (Array.isArray(KIT[k])) for (const q of KIT[k]) if (q && q.geo) KIT.triangleCount += q.tris;
  }
  return KIT;
}

/* --------------------------- enemy kit meshes -------------------------- */
function buildRaider() {
  const b = new Builder();
  const armor = PAL.hwArmor;
  const armor2 = PAL.hwArmor2;
  const cut = PAL.hwCut;
  b.part('torso');
  b.box(0, 1.18, 0, 0.52, 0.62, 0.34, armor, MAT.PAINT, 0.035);
  b.box(0, 1.22, 0.16, 0.44, 0.42, 0.08, armor2, MAT.PAINT, 0.025);
  b.box(0, 1.27, 0.205, 0.12, 0.05, 0.02, PAL.cyan, MAT.EMIT_C, 0.002);
  b.box(0, 1.06, 0.19, 0.3, 0.12, 0.04, PAL.paintYellow, MAT.PAINT, 0.006);
  b.box(0, 1.42, -0.16, 0.46, 0.36, 0.18, PAL.hwArmor, MAT.PAINT, 0.03);
  b.part('head');
  b.box(0, 1.64, 0, 0.26, 0.28, 0.27, PAL.hwArmor, MAT.PAINT, 0.03);
  b.box(0, 1.64, 0.14, 0.22, 0.11, 0.05, PAL.red, MAT.EMIT_R, 0.006);
  b.box(0, 1.72, 0.15, 0.14, 0.02, 0.03, PAL.amber, MAT.EMIT_W, 0.001);
  b.box(0, 1.8, 0, 0.06, 0.08, 0.06, PAL.steelD, MAT.STEEL, 0.004);
  b.part('shoulders');
  for (const s of [-1, 1]) {
    b.box(s * 0.36, 1.38, 0, 0.22, 0.2, 0.34, PAL.hwArmor2, MAT.PAINT, 0.03);
    b.box(s * 0.38, 1.49, 0, 0.16, 0.05, 0.26, PAL.steelD, MAT.STEEL, 0.006);
    b.box(s * 0.38, 1.44, 0.16, 0.08, 0.045, 0.03, [0.3, 1.8, 2.1], MAT.EMIT_C, 0.003);
    b.box(s * 0.37, 1.24, 0.17, 0.13, 0.05, 0.03, PAL.paintYellow, MAT.PAINT, 0.003);
  }
  for (const s of [-1, 1]) {
    b.part(s < 0 ? 'armL' : 'armR');
    b.box(s * 0.36, 1.12, 0.1, 0.15, 0.42, 0.16, PAL.hwArmor, MAT.PAINT, 0.025);
    b.box(s * 0.3, 0.94, 0.24, 0.14, 0.28, 0.15, PAL.hwArmor2, MAT.PAINT, 0.02);
    b.box(s * 0.24, 0.86, 0.32, 0.1, 0.1, 0.12, PAL.rubber, MAT.RUBBER, 0.01);
  }
  for (const s of [-1, 1]) {
    b.part(s < 0 ? 'legL' : 'legR');
    b.box(s * 0.15, 0.72, 0, 0.19, 0.5, 0.23, PAL.hwArmor, MAT.PAINT, 0.03);
    b.box(s * 0.15, 0.32, 0.03, 0.17, 0.36, 0.2, PAL.hwArmor2, MAT.PAINT, 0.025);
    b.box(s * 0.15, 0.1, 0.04, 0.18, 0.14, 0.3, PAL.rubber, MAT.RUBBER, 0.02);
    b.box(s * 0.15, 0.9, 0.11, 0.16, 0.12, 0.05, PAL.steelD, MAT.STEEL, 0.006);
  }
  b.part('rifle');
  b.at(0.24, 1.05, 0.42, 0.06);
  b.box(0, 0, 0, 0.06, 0.1, 0.72, PAL.steelD, MAT.STEEL, 0.012);
  b.box(0, -0.03, 0.42, 0.04, 0.05, 0.26, PAL.steel, MAT.STEEL, 0.008);
  b.box(0, -0.1, 0.06, 0.05, 0.16, 0.12, PAL.steelD, MAT.STEEL, 0.008);
  b.box(0, 0.09, -0.1, 0.06, 0.05, 0.2, PAL.steelD, MAT.STEEL, 0.006);
  b.box(0, 0.04, 0.61, 0.05, 0.05, 0.05, PAL.red, MAT.EMIT_R, 0.002);
  b.done();
  b.part('pack');
  b.box(0, 1.2, -0.28, 0.36, 0.42, 0.2, PAL.hwArmor2, MAT.PAINT, 0.03);
  b.box(0, 1.36, -0.4, 0.08, 0.2, 0.06, PAL.steelD, MAT.STEEL, 0.005);
  const d = b.finish('raider', []);
  d.parts = b.parts;
  return d;
}

function buildWasp() {
  const b = new Builder();
  b.part('body');
  b.box(0, 0, 0, 0.44, 0.2, 0.5, PAL.drone, MAT.PAINT, 0.05);
  b.box(0, 0.11, -0.05, 0.3, 0.1, 0.32, PAL.droneCut, MAT.PAINT, 0.03);
  b.box(0, -0.07, 0.02, 0.36, 0.1, 0.42, PAL.dronePoly, MAT.PAINT, 0.04);
  b.part('eye');
  b.sphere(0, -0.02, 0.25, 0.075, 0.075, 0.075, 14, 8, PAL.red, MAT.EMIT_R);
  b.part('arms');
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    b.box(sx * 0.34, 0.04, sz * 0.3, 0.28, 0.03, 0.06, PAL.steelD, MAT.STEEL, 0.01);
    b.cyl(sx * 0.48, 0.06, sz * 0.38, 0.055, 0.055, 0.06, 14, PAL.steel, MAT.STEEL);
  }
  let ri = 0;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    b.part('blade' + (ri++));
    b.at(sx * 0.48, 0.09, sz * 0.38);
    b.box(0, 0, 0, 0.5, 0.008, 0.05, PAL.rubber, MAT.RUBBER, 0.002);
    b.box(0, 0, 0, 0.05, 0.008, 0.5, PAL.rubber, MAT.RUBBER, 0.002);
    b.done();
  }
  b.part('antenna');
  b.cyl(0, 0.2, -0.18, 0.012, 0.008, 0.4, 5, PAL.steel, MAT.STEEL);
  b.part('light');
  b.sphere(0, -0.06, 0.18, 0.05, 0.05, 0.05, 10, 6, PAL.cyan, MAT.EMIT_C);
  b.part('gun');
  b.box(0, -0.08, 0.4, 0.07, 0.07, 0.26, PAL.steelD, MAT.STEEL, 0.01);
  b.part('legs');
  for (const s of [-1, 1]) {
    b.tube([[s * 0.18, -0.08, -0.1], [s * 0.3, -0.22, -0.24], [s * 0.24, -0.32, -0.18]], 0.015, 4, PAL.steelD, MAT.STEEL);
  }
  b.part('snow');
  b.box(-0.05, 0.11, -0.12, 0.24, 0.02, 0.2, PAL.snow, MAT.SNOW, 0.02);
  const d = b.finish('wasp', []);
  return d;
}

function buildPrime() {
  const b = new Builder();
  b.part('core');
  b.sphere(0, 0, 0, 1.2, 1.0, 1.2, 28, 16, PAL.dronePoly, MAT.PAINT);
  b.sphere(0, 0, 0, 0.7, 0.55, 0.7, 20, 12, PAL.droneCut, MAT.PAINT);
  b.part('plates');
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    b.at(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15, -a + PI / 2);
    b.box(0, 0, 0, 0.9, 0.7, 0.16, PAL.hwArmor, MAT.PAINT, 0.05);
    b.box(0, 0.28, 0.1, 0.5, 0.06, 0.03, PAL.cyan, MAT.EMIT_C, 0.004);
    b.done();
  }
  b.part('ring');
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    b.at(Math.cos(a) * 1.6, -0.2, Math.sin(a) * 1.6, -a);
    b.box(0, 0, 0, 0.34, 0.16, 0.12, PAL.steelD, MAT.STEEL, 0.02);
    b.done();
  }
  b.part('cores');
  for (const [x, y, z] of [[0, 0.1, 1.14], [0.98, 0.1, -0.57], [-0.98, 0.1, -0.57]]) {
    b.sphere(x, y, z, 0.18, 0.18, 0.18, 16, 10, PAL.red, MAT.EMIT_R);
    b.cyl(x, y, z, 0.24, 0.24, 0.1, 16, PAL.steelD, MAT.STEEL);
  }
  b.part('eyes');
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + PI / 6;
    b.sphere(Math.cos(a) * 0.95, 0.42, Math.sin(a) * 0.95, 0.08, 0.08, 0.08, 12, 8, PAL.red, MAT.EMIT_R);
  }
  b.part('spikes');
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + PI / 4;
    b.tube([[Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5], [Math.cos(a) * 2.3, 0.75, Math.sin(a) * 2.3]], 0.04, 4, PAL.steelD, MAT.STEEL);
    b.sphere(Math.cos(a) * 2.3, 0.75, Math.sin(a) * 2.3, 0.1, 0.1, 0.1, 10, 6, PAL.cyan, MAT.EMIT_C);
  }
  b.part('under');
  b.cyl(0, -1.0, 0, 0.5, 0.22, 0.5, 20, PAL.drone, MAT.PAINT);
  b.sphere(0, -1.28, 0, 0.28, 0.14, 0.28, 16, 8, PAL.red, MAT.EMIT_R);
  const d = b.finish('prime', []);
  d.radius = 2.5;
  return d;
}

function buildHeavy() {
  const b = new Builder();
  // re-use raider proportions but widened: a distinct silhouette with a shield
  b.part('torso');
  b.box(0, 1.05, 0, 0.8, 0.75, 0.46, PAL.hwArmor, MAT.PAINT, 0.05);
  b.box(0, 1.12, 0.24, 0.62, 0.5, 0.08, PAL.hwArmor2, MAT.PAINT, 0.03);
  b.part('head');
  b.box(0, 1.6, 0, 0.32, 0.3, 0.32, PAL.hwArmor, MAT.PAINT, 0.03);
  b.box(0, 1.6, 0.17, 0.26, 0.08, 0.04, PAL.amber, MAT.EMIT_W, 0.004);
  b.part('shoulders');
  for (const s of [-1, 1]) {
    b.box(s * 0.52, 1.4, 0, 0.3, 0.3, 0.48, PAL.hwArmor2, MAT.PAINT, 0.04);
    b.box(s * 0.56, 1.55, 0, 0.22, 0.06, 0.36, PAL.steelD, MAT.STEEL, 0.006);
  }
  for (const s of [-1, 1]) {
    b.part(s < 0 ? 'legL' : 'legR');
    b.box(s * 0.22, 0.5, 0, 0.26, 0.7, 0.28, PAL.hwArmor, MAT.PAINT, 0.035);
    b.box(s * 0.22, 0.12, 0.04, 0.24, 0.24, 0.38, PAL.rubber, MAT.RUBBER, 0.02);
  }
  b.part('shield');
  b.at(0.68, 1.1, 0.42, -0.16);
  b.box(0, 0, 0, 0.9, 1.35, 0.09, PAL.hwArmor2, MAT.PAINT, 0.04);
  b.box(0, 0.15, 0.06, 0.6, 0.5, 0.03, PAL.hwCut, MAT.PAINT, 0.01);
  b.box(0.1, 0, -0.06, 0.9, 0.06, 0.06, PAL.steelD, MAT.STEEL, 0.006);
  b.done();
  b.part('cannon');
  b.at(-0.42, 1.15, 0.5);
  b.cyl(0, 0, 0, 0.11, 0.08, 0.8, 16, PAL.steelD, MAT.STEEL, true, 'z');
  b.cyl(0, 0, 0.3, 0.14, 0.14, 0.1, 16, PAL.steel, MAT.STEEL, true, 'z');
  b.done();
  b.part('pack');
  b.box(0, 1.25, -0.36, 0.6, 0.5, 0.24, PAL.hwArmor2, MAT.PAINT, 0.03);
  const d = b.finish('heavy', []);
  return d;
}

window.__KIT_BUILT = true;
