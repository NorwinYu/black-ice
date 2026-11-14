/* =========================================================================
   BLACK ICE — 05b first-person tools
   The rifle, its magazine, the gloved hands, and the arc coil. All built in
   camera space (x right, y up, -z forward), lit by the viewmodel program.
   ========================================================================= */

function buildRifleGeo() {
  const b = new Builder();
  const dark = [0.018, 0.019, 0.020], cut = [0.028, 0.030, 0.032], tan = PAL.paintTan, steel = PAL.steelD;
  b.part('receiver');
  b.box(0, 0, 0, 0.074, 0.088, 0.30, dark, MAT.PAINT, 0.008);
  b.box(0, 0.052, -0.01, 0.062, 0.018, 0.26, cut, MAT.STEEL, 0.004);
  for (let i = 0; i < 7; i++) b.box(0, 0.064, -0.10 + i * 0.032, 0.056, 0.008, 0.014, steel, MAT.STEEL, 0.002);
  b.box(0.04, 0.002, 0.02, 0.008, 0.04, 0.09, steel, MAT.STEEL, 0.003);
  b.box(-0.042, -0.01, 0.04, 0.008, 0.02, 0.03, PAL.red, MAT.EMIT_R, 0.001);
  b.part('handguard');
  b.box(0, -0.002, -0.31, 0.078, 0.082, 0.28, tan, MAT.PAINT, 0.012);
  for (let i = 0; i < 4; i++) {
    b.box(0.041, -0.002, -0.24 - i * 0.05, 0.004, 0.034, 0.032, dark, MAT.PAINT, 0.002);
    b.box(-0.041, -0.002, -0.24 - i * 0.05, 0.004, 0.034, 0.032, dark, MAT.PAINT, 0.002);
  }
  b.box(0, 0.043, -0.31, 0.05, 0.012, 0.26, steel, MAT.STEEL, 0.002);
  b.part('barrel');
  b.cyl(0, 0.002, -0.55, 0.0145, 0.0145, 0.28, 20, steel, MAT.STEEL, true, 'z');
  b.cyl(0, 0.002, -0.70, 0.023, 0.023, 0.075, 20, dark, MAT.PAINT, true, 'z');
  for (let i = 0; i < 3; i++) b.box(0, 0.02, -0.685 + i * 0.022, 0.05, 0.008, 0.012, PAL.rubber, MAT.RUBBER, 0.001);
  b.part('stock');
  b.box(0, -0.008, 0.215, 0.055, 0.045, 0.13, tan, MAT.PAINT, 0.008);
  b.box(0, 0.024, 0.19, 0.04, 0.02, 0.11, steel, MAT.STEEL, 0.003);
  b.box(0, -0.045, 0.24, 0.045, 0.03, 0.09, tan, MAT.PAINT, 0.006);
  b.box(0, -0.002, 0.286, 0.062, 0.10, 0.02, PAL.rubber, MAT.RUBBER, 0.005);
  b.box(0.02, 0.0, 0.13, 0.01, 0.03, 0.06, steel, MAT.STEEL, 0.002);
  b.part('grip');
  b.at(0, -0.10, 0.09, 0, 0.32, 0);
  b.box(0, 0, 0, 0.046, 0.15, 0.062, dark, MAT.PAINT, 0.01);
  b.box(0, -0.07, 0.01, 0.05, 0.02, 0.06, PAL.rubber, MAT.RUBBER, 0.005);
  b.done();
  b.part('trigger');
  b.box(0, -0.062, 0.01, 0.028, 0.008, 0.09, steel, MAT.STEEL, 0.002);
  b.box(0, -0.085, 0.048, 0.007, 0.045, 0.007, steel, MAT.STEEL, 0.001);
  b.box(0, -0.108, 0.048, 0.03, 0.008, 0.08, dark, MAT.PAINT, 0.002);
  b.part('optic');
  b.box(0, 0.083, -0.03, 0.05, 0.018, 0.10, steel, MAT.STEEL, 0.004);
  b.box(0, 0.115, -0.035, 0.052, 0.05, 0.12, dark, MAT.PAINT, 0.008);
  b.box(0, 0.117, -0.098, 0.044, 0.044, 0.008, PAL.cyan, MAT.EMIT_C, 0.002);
  b.box(0, 0.117, 0.028, 0.042, 0.042, 0.008, PAL.rubber, MAT.RUBBER, 0.002);
  b.box(0.033, 0.12, -0.035, 0.014, 0.03, 0.03, steel, MAT.STEEL, 0.003);
  b.part('sling');
  b.tube([[0.03, -0.03, 0.2], [0.06, -0.16, 0.1], [0.02, -0.18, -0.12], [-0.04, -0.06, -0.25]], 0.008, 4, PAL.paintOlive, MAT.FABRIC);
  b.part('handR');
  // right glove wrapping the grip, sleeve leaving frame to the lower right
  b.at(0.002, -0.125, 0.075, 0, 0.3, 0);
  b.box(0, 0, 0, 0.062, 0.07, 0.08, PAL.paintOlive, MAT.FABRIC, 0.012);
  for (let i = 0; i < 4; i++) b.box(-0.025, 0.018, -0.03 + i * 0.022, 0.02, 0.035, 0.016, PAL.paintOlive, MAT.FABRIC, 0.004);
  b.done();
  b.at(0.05, -0.20, 0.16, -0.35, 0.55, -0.2);
  b.box(0, 0, 0, 0.085, 0.11, 0.26, PAL.paintOlive, MAT.FABRIC, 0.018);
  b.box(0, 0, 0.15, 0.082, 0.1, 0.06, PAL.rubber, MAT.RUBBER, 0.01);
  b.done();
  b.part('handL');
  b.at(-0.005, -0.09, -0.29, 0, 0.15, 0);
  b.box(0, 0, 0, 0.07, 0.06, 0.12, PAL.paintOlive, MAT.FABRIC, 0.012);
  for (let i = 0; i < 4; i++) b.box(0.026, 0.01, -0.045 + i * 0.026, 0.022, 0.04, 0.017, PAL.paintOlive, MAT.FABRIC, 0.004);
  b.done();
  b.at(-0.09, -0.21, -0.11, 0.35, -0.45, 0.3);
  b.box(0, 0, 0, 0.085, 0.11, 0.28, PAL.paintOlive, MAT.FABRIC, 0.018);
  b.box(0, 0, -0.16, 0.082, 0.1, 0.06, PAL.rubber, MAT.RUBBER, 0.01);
  b.done();
  b.part('snowdust');
  b.box(0.01, 0.041, -0.32, 0.05, 0.006, 0.12, PAL.snow, MAT.SNOW, 0.004);
  b.box(-0.015, 0.048, 0.18, 0.03, 0.005, 0.06, PAL.snow, MAT.SNOW, 0.003);
  return b.finish('vm-rifle', []);
}

function buildMagGeo() {
  const b = new Builder();
  b.part('magazine');
  b.at(0, 0, 0, 0, 0.05, 0);
  b.box(0, 0, 0, 0.038, 0.16, 0.07, PAL.hwArmor, MAT.PAINT, 0.008);
  b.box(0, -0.085, 0, 0.042, 0.02, 0.074, PAL.rubber, MAT.RUBBER, 0.004);
  for (let i = 0; i < 3; i++) b.box(0.02, 0.04 - i * 0.045, 0, 0.004, 0.02, 0.05, PAL.steelD, MAT.STEEL, 0.002);
  b.done();
  return b.finish('vm-mag', []);
}

function buildArcGeo() {
  const b = new Builder();
  b.part('sleeve');
  b.at(0.02, -0.02, 0.10, 0, -0.12, 0);
  b.cyl(0, 0, 0, 0.062, 0.075, 0.24, 20, PAL.paintOlive, MAT.FABRIC);
  b.cyl(0, -0.02, 0.12, 0.07, 0.065, 0.05, 20, PAL.rubber, MAT.RUBBER);
  b.done();
  b.part('cuff');
  b.at(0, 0, -0.02, 0, 0);
  b.cyl(0, 0, 0, 0.082, 0.082, 0.05, 24, PAL.hwArmor, MAT.PAINT);
  b.cyl(0, 0.03, 0, 0.086, 0.086, 0.018, 24, PAL.steelD, MAT.STEEL);
  b.done();
  b.part('palm');
  b.box(0.005, -0.01, -0.10, 0.10, 0.075, 0.13, PAL.hwArmor, MAT.PAINT, 0.014);
  for (let i = 0; i < 4; i++) b.box(-0.04, 0.02, -0.16 + i * 0.024, 0.02, 0.045, 0.018, PAL.paintOlive, MAT.FABRIC, 0.004);
  b.part('prongs');
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + 0.4;
    b.tube([[Math.cos(a) * 0.07, Math.sin(a) * 0.07, -0.16], [Math.cos(a) * 0.095, Math.sin(a) * 0.095, -0.24], [Math.cos(a) * 0.045, Math.sin(a) * 0.045, -0.3]], 0.008, 4, PAL.steelD, MAT.STEEL);
    b.sphere(Math.cos(a) * 0.045, Math.sin(a) * 0.045, -0.3, 0.018, 0.018, 0.018, 10, 6, PAL.cyan, MAT.EMIT_C);
  }
  b.sphere(0, 0, -0.26, 0.035, 0.035, 0.035, 16, 10, PAL.cyan, MAT.EMIT_C);
  b.part('battery');
  b.box(0.055, 0.05, -0.02, 0.045, 0.05, 0.11, PAL.hwArmor2, MAT.PAINT, 0.01);
  b.box(0.055, 0.075, -0.02, 0.02, 0.008, 0.08, PAL.steelD, MAT.STEEL, 0.003);
  return b.finish('vm-arc', []);
}

function buildArcRingsGeo() {
  const b = new Builder();
  b.part('rings');
  for (let i = 0; i < 3; i++) {
    const z = -0.10 - i * 0.055;
    b.at(0, 0, z);
    b.cyl(0, 0, 0, 0.075 - i * 0.011, 0.075 - i * 0.011, 0.012, 24, PAL.steelD, MAT.STEEL);
    b.cyl(0, 0, 0, 0.078 - i * 0.011, 0.078 - i * 0.011, 0.006, 24, PAL.cyan, MAT.EMIT_C);
    b.done();
  }
  return b.finish('vm-arc-rings', []);
}
