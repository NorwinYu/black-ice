/* =========================================================================
   BLACK ICE — 06 site
   The outpost: 3 relay towers, two huts, a garage, fuel depot, snowcat,
   perimeter berms, the far ridge, and every collider used by movement.
   Layout is data; geometry and colliders come from the same placement table.
   ========================================================================= */

const SITE = {
  bounds: { x0: -33, x1: 33, z0: -31, z1: 26, playerRadius: 0.42 },
  spawn: { x: 0, z: 21, yaw: 0 },
  promptRadius: 3.0,
  markerRange: 140,
  eyeHeight: 1.7
};

const WORLD = {
  scene: new Node('scene'),
  colliders: [],
  draws: [],
  lights: [],
  gfxLights: [],
  relays: [],
  supplies: [],
  enemySpawns: [],
  markers: [],
  beams: [],
  bounds: SITE.bounds,
  kits: null,
  meshCache: new Map(),
  built: false,
  pointLights: [],
  cameras: {
    title: { pos: [-12.7, 2.3, 20.6], target: [2.4, 3.0, -11.0], fov: 56 },
    hero: { pos: [-12.5, 2.1, 20.3], target: [2.2, 3.0, -11.5], fov: 56 },
    close: { pos: [-10.9, 1.42, 18.5], target: [-8.4, 1.45, 16.55], fov: 50 },
    wide: { pos: [26.5, 4.0, 31.0], target: [-2.0, 16.0, -12.0], fov: 50 }
  }
};

/* ----------------------------- collision ------------------------------- */
const CGRID = { cell: 4, map: new Map() };
function gridKey(cx, cz) { return cx * 1000 + cz; }
function addCollider(c) {
  const R = SITE.bounds.playerRadius;
  const id = WORLD.colliders.length;
  WORLD.colliders.push(c);
  const cx0 = Math.floor((c.x0 - R) / CGRID.cell), cx1 = Math.floor((c.x1 + R) / CGRID.cell);
  const cz0 = Math.floor((c.z0 - R) / CGRID.cell), cz1 = Math.floor((c.z1 + R) / CGRID.cell);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    const k = gridKey(cx, cz);
    let arr = CGRID.map.get(k);
    if (!arr) { arr = []; CGRID.map.set(k, arr); }
    arr.push(id);
  }
}
const _hitStamp = new Int32Array(4096);
let _hitGeneration = 0;
function collides(x, z) {
  const R = SITE.bounds.playerRadius;
  const cx = Math.floor(x / CGRID.cell), cz = Math.floor(z / CGRID.cell);
  _hitGeneration++;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const arr = CGRID.map.get(gridKey(cx + i, cz + j));
    if (!arr) continue;
    for (const idx of arr) {
      if (_hitStamp[idx] === _hitGeneration) continue;
      _hitStamp[idx] = _hitGeneration;
      const c = WORLD.colliders[idx];
      if (c.y0 > 1.75 || c.y1 < 0.12) continue;
      if (x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R) return true;
    }
  }
  return false;
}
function moveClamped(x, z, dx, dz) {
  const B = SITE.bounds;
  let nx = clamp(x + dx, B.x0 + 0.01, B.x1 - 0.01);
  if (!collides(nx, z)) x = nx;
  let nz = clamp(z + dz, B.z0 + 0.01, B.z1 - 0.01);
  if (!collides(x, nz)) z = nz;
  return [x, z];
}
WORLD.collides = collides;
WORLD.move = moveClamped;

/* ------------------------------ placement ------------------------------ */
function matFor(kit, x, y, z, o) {
  const sx = o.sx ?? 1, sy = o.sy ?? 1, sz = o.sz ?? 1;
  const ry = o.ry ?? 0, rx = o.rx ?? 0, rz = o.rz ?? 0;
  const m = M4.create();
  M4.trs(m, x, y, z, rx, ry, rz, sx, sy, sz);
  return m;
}
let FIXTURE_GEO = null;
function fixtureGeometry() {
  if (FIXTURE_GEO) return FIXTURE_GEO;
  const b = new Builder();
  b.part('lamp');
  b.sphere(0, 0, 0, 0.06, 0.06, 0.06, 8, 5, [2, 1, 0.4], MAT.EMIT_W);
  FIXTURE_GEO = b.finish('light-fixture', [{ name: 'lamp', extents: [0.12, 0.12, 0.12] }]);
  return FIXTURE_GEO;
}
function addLightNode(name, pos, color, intensity, range) {
  const l = makeLight('PointLight', color, intensity, range);
  l.position.set(pos[0], pos[1], pos[2]);
  l.setTRS(pos[0], pos[1], pos[2], 0);
  WORLD.scene.add(l);
  if (name !== 'muzzle-light') {
    const fg = fixtureGeometry();
    const fn = makeMeshNode('fixture-' + name, fg.geo, { name: 'lamp' });
    fn.visible = false;
    fn.setTRS(pos[0], pos[1], pos[2], 0);
    fn.position.set(pos[0], pos[1], pos[2]);
    fn.userData.identity = fg.identity;
    fn.userData.parts = fg.parts;
    WORLD.scene.add(fn);
  }
  const entry = { name, pos, color: [color[0] * intensity, color[1] * intensity, color[2] * intensity], range, intensity, node: l };
  WORLD.pointLights.push(entry);
  return entry;
}
function placeKit(kitName, name, x, z, o = {}) {
  const reg = WORLD.kits[kitName];
  if (!reg) throw new Error('unknown kit ' + kitName);
  const kit = Array.isArray(reg) ? reg[(o.variant || 0) % reg.length] : reg;
  const y = o.y ?? 0;
  const m = matFor(kit, x, y, z, o);
  const node = makeMeshNode(name, kit.geo, { name: kitName });
  node.setMatrix(m);
  node.position.set(m[12], m[13], m[14]);
  node.userData.identity = kit.identity;
  node.userData.parts = kit.parts;
  node.userData.kit = kitName;
  node.userData.solid = o.solid !== false;
  WORLD.scene.add(node);
  const draw = { kitName, kit, geo: kit.geo, node, model: m, castShadow: o.castShadow !== false, visible: true, mesh: null };
  WORLD.draws.push(draw);
  // collider: explicit local box or geometry AABB, transformed by the placement
  if (o.solid !== false) {
    let bb;
    if (o.col) {
      const [w, d, ox, oz, y0, y1] = o.col;
      bb = { min: [ox - w / 2, y0, oz - d / 2], max: [ox + w / 2, y1, oz + d / 2] };
    } else {
      const g = kit.geo.boundingBox;
      bb = { min: [g.min.x, g.min.y, g.min.z], max: [g.max.x, g.max.y, g.max.z] };
    }
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, yy0 = 1e9, yy1 = -1e9;
    for (const cx of [bb.min[0], bb.max[0]]) for (const cy of [bb.min[1], bb.max[1]]) for (const cz of [bb.min[2], bb.max[2]]) {
      const p = M4.transformPoint([0, 0, 0], m, cx, cy, cz);
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
      yy0 = Math.min(yy0, p[1]); yy1 = Math.max(yy1, p[1]);
      z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]);
    }
    // slightly shrink so faceted AABBs do not create phantom walls
    const pad = o.pad === undefined ? 0.0 : o.pad;
    const col = { x0: x0 + pad, x1: x1 - pad, z0: z0 + pad, z1: z1 - pad, y0: yy0, y1: yy1, name };
    addCollider(col);
    draw.collider = col;
  }
  if (kit.lights) {
    for (const Lp of kit.lights) {
      const p = M4.transformPoint([0, 0, 0], m, Lp.pos[0], Lp.pos[1], Lp.pos[2]);
      if (o.noLight) continue;
      const entry = addLightNode(name + '-light', p, Lp.color, Lp.intensity, Lp.distance);
      entry.kind = Lp.kind;
      if (WORLD.gfxLights.length < 10) WORLD.gfxLights.push({ pos: p, color: entry.color, range: Lp.distance });
    }
  }
  return { node, draw, kit };
}

/* ------------------------------- layout -------------------------------- */
function buildSite() {
  WORLD.kits = buildKit();
  const S = WORLD.scene;
  // lights that the renderer will actually use are capped by order of placement
  const lightCap = 8;

  /* --------- perimeter snow berms: colliders are the geometry AABB --------- */
  function berm(x, z, len, height, ry) {
    const kit = buildDrift(90 + Math.round(x * 7 + z * 3), 2.5, height, len / 2);
    // buildDrift is not in KIT; make an ad-hoc kit entry
    const nm = 'berm-' + Math.round(x) + '-' + Math.round(z);
    const entry = placeKitAdhoc(kit, nm, x, z, { ry, sx: 1, sy: 1, sz: 1, solid: true, castShadow: true });
    return entry;
  }
  function placeKitAdhoc(kit, name, x, z, o = {}) {
    const y = o.y ?? 0;
    const m = matFor(kit, x, y, z, o);
    const node = makeMeshNode(name, kit.geo, { name: 'drift' });
    node.setMatrix(m);
    node.position.set(m[12], m[13], m[14]);
    node.userData.identity = kit.identity;
    node.userData.parts = kit.parts;
    node.userData.solid = o.solid !== false;
    WORLD.scene.add(node);
    const draw = { kitName: 'drift', kit, geo: kit.geo, node, model: m, castShadow: true, visible: true, mesh: null };
    WORLD.draws.push(draw);
    const g = kit.geo.boundingBox;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const cx of [g.min.x, g.max.x]) for (const cz of [g.min.z, g.max.z]) {
      const p = M4.transformPoint([0, 0, 0], m, cx, 0, cz);
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]);
    }
    if (o.solid !== false) {
      const inset = o.colInset || 0;
      const col = { x0: x0 + inset, x1: x1 - inset, z0: z0 + inset, z1: z1 - inset, y0: -0.4, y1: Math.min(1.55, (g.max.y - g.min.y) * 0.8), name };
      addCollider(col);
      draw.collider = col;
    }
    return { node, draw };
  }
  // west / east / north / south ridges (nodes sit outside bounds; faces reach in 0.2m)
  berm(-35.6, -2.5, 62, 1.55, 0);
  berm(35.6, -2.5, 62, 1.5, 0);
  berm(0, -33.6, 72, 1.6, PI / 2);
  berm(0, 28.4, 72, 1.45, PI / 2);
  // a few taller drifts just inside the berms, all solid
  const ds = [[-31, -27, 3.6, 1.1, 2.2, 2], [30, 23, 3.2, 1.0, 2.0, 3], [28, -26, 4.0, 1.2, 2.4, 5],
              [-29, 21, 2.8, 0.8, 1.7, 4], [1, -29.5, 2.4, 0.7, 1.5, 2], [13, 23.5, 2.8, 0.9, 1.8, 3]];
  for (const [x, z, rx, ry, rz, s] of ds) {
    const kit = buildDrift(s * 13, rx, ry, rz);
    placeKitAdhoc(kit, 'drift-' + s + '-' + Math.round(x), x, z, { ry: s * 0.4, solid: true });
  }

  /* ------------------------------ relays -------------------------------- */
  const relayDefs = [
    { id: 'relay-a', label: 'ALPHA', x: -18, z: -7, ry: 0.5 },
    { id: 'relay-b', label: 'BRAVO', x: 15.5, z: -6, ry: -2.4 },
    { id: 'relay-c', label: 'CHARLIE', x: -3, z: -24, ry: 0.1 }
  ];
  for (const r of relayDefs) {
    const placed = placeKit('relay', r.id, r.x, r.z, { ry: r.ry, solid: true, col: [3.6, 3.6, 0, 0, 0, 2.2] });
    // switchable uplink beacon (visible consequence of activating the relay)
    const bk = buildBeaconRing();
    const bnode = makeMeshNode(r.id + '-beacon', bk.geo, { name: 'uplink' });
    bnode.setTRS(r.x, 1.62, r.z, r.ry);
    bnode.position.set(r.x, 1.62, r.z);
    bnode.userData.identity = [{ name: 'lamp', extents: [0.7, 0.5, 0.7] }];
    bnode.userData.parts = bk.parts;
    bnode.visible = false;
    bnode.name = r.id + '-beacon';
    WORLD.scene.add(bnode);
    const bdraw = { kitName: 'beacon', kit: bk, geo: bk.geo, node: bnode, model: bnode.matrix, castShadow: false, visible: true, mesh: null };
    WORLD.draws.push(bdraw);
    const light = WORLD.pointLights.find(l => l.name === r.id + '-light');
    WORLD.relays.push({ id: r.id, label: r.label, x: r.x, z: r.z, on: false, beacon: bnode, bdraw, light, channel: 0 });
  }

  /* ------------------------------ buildings ----------------------------- */
  placeKit('hut', 'hut-hab', -17.5, 9.0, { variant: 0, ry: 0.13, solid: true, pad: 0.05 });
  placeKit('hut', 'hut-lab', 16.5, 9.8, { variant: 1, sx: 0.96, sy: 0.95, sz: 1, ry: -0.24, solid: true, pad: 0.05 });
  placeKit('garage', 'garage', 17.0, -16.0, { ry: 0.12, solid: true, pad: 0.05 });

  /* ------------------------------ vehicles ------------------------------ */
  placeKit('snowcat', 'snowcat', -8.1, 16.7, { ry: -0.79, solid: true, pad: 0.06 });

  /* ------------------------------- props -------------------------------- */
  // crates (stacked, several sizes / two material families)
  const crateSpots = [
    [-13.1, 4.4, 0, 0], [-13.1, 4.4, 2, 0.95], [-11.8, 5.2, 1, 0], [-22.2, 12.4, 1, 0],
    [12.2, 5.2, 0, 0], [12.2, 5.2, 1, 0.95], [13.4, 6.1, 2, 0], [10.5, -10.5, 2, 0],
    [10.5, -10.5, 0, 1.55], [11.6, -9.6, 1, 0], [0.9, -20.2, 1, 0], [13.6, 19.8, 2, 0],
    [7.6, -21.3, 0, 0], [-25.2, -12.6, 2, 0], [-15.2, 13.8, 1, 0],
    [9.6, 6.8, 2, 0], [10.8, 7.8, 0, 0], [-7.4, 5.2, 0, 0], [-9.7, 8.1, 1, 0]
  ];
  for (let i = 0; i < crateSpots.length; i++) {
    const [x, z, v, y] = crateSpots[i];
    placeKit('crate', 'crate-' + i, x, z, { variant: v, ry: rnd(0.6, -0.6), solid: y < 0.5, y: y || 0 });
  }
  // drums
  const drums = [
    [-12.0, 1.6, 0, 0], [-12.9, 2.2, 1, 0], [-12.3, 3.0, 2, 0], [-14.2, 2.3, 3, 1],
    [4.6, 9.6, 1, 0], [5.4, 10.2, 2, 0], [19.8, -4.2, 3, 0], [20.6, -5.4, 0, 1],
    [13.2, -19.2, 0, 0], [14.1, -19.7, 2, 0], [-22.4, 6.4, 1, 0], [-23.1, 7.0, 3, 1],
    [19.2, -6.4, 1, 0], [-14.2, 10.4, 1, 0], [-15.0, 11.0, 2, 0]
  ];
  for (let i = 0; i < drums.length; i++) {
    const [x, z, v, lying] = drums[i];
    if (lying) {
      placeKit('drumLying', 'drum-' + i, x, z, { variant: v % 2, ry: rnd(2.2, -2.2), y: 0.29, solid: true, col: [0.62, 0.94, 0, 0, 0, 0.6] });
    } else {
      placeKit('drum', 'drum-' + i, x, z, { variant: v % 4, ry: rnd(0.5, -0.5), y: 0, solid: true, col: [0.62, 0.62, 0, 0, 0, 0.92] });
    }
  }
  // pallets
  placeKit('pallet', 'pallet-1', -20.3, 5.2, { ry: 0.2, solid: true, col: [1.2, 1.1, 0, 0, 0, 1.0] });
  placeKit('pallet', 'pallet-2', 11.6, -10.6, { ry: -0.35, solid: true, col: [1.2, 1.1, 0, 0, 0, 1.0] });
  placeKit('pallet', 'pallet-3', -4.9, -18.0, { ry: 0.9, solid: true, col: [1.2, 1.1, 0, 0, 0, 1.0] });
  // generators
  placeKit('generator', 'generator-a', -10.4, -1.4, { ry: 0.5, solid: true });
  placeKit('generator', 'generator-b', 22.6, -10.2, { ry: -0.4, solid: true });
  // fuel tank + depot
  placeKit('fueltank', 'fueltank', 22.4, -7.0, { ry: PI / 2 - 0.12, solid: true, pad: 0.1 });
  // dishes
  placeKit('dish', 'dish-west', -27.7, 2.2, { ry: 0.35, sx: 0.95, sy: 0.95, sz: 0.95, solid: true, col: [1.8, 1.8, 0, 0, 0, 1.0] });
  placeKit('dish', 'dish-east', 26.0, -26.4, { ry: -2.2, solid: true, col: [1.8, 1.8, 0, 0, 0, 1.0] });
  // light masts (two with real point lights)
  placeKit('lightmast', 'mast-west', -21.2, 1.0, { ry: 0.7, solid: true, col: [0.5, 0.5, 0, 0, 0, 0.6] });
  placeKit('lightmast', 'mast-east', 25.4, 14.6, { ry: 2.9, solid: true, col: [0.5, 0.5, 0, 0, 0, 0.6] });
  // comms mast (the landmark)
  placeKit('comms', 'comms-mast', 2.5, -28.2, { ry: 0.2, solid: true, col: [3.2, 3.2, 0, 0, 0, 1.2] });
  // fences (short runs, solid)
  placeKit('fence', 'fence-1', -14.5, 23.0, { ry: 0.02, solid: true, col: [4.2, 0.5, 0, 0, 0, 1.5] });
  placeKit('fence', 'fence-2', 25.0, 1.6, { ry: PI / 2 + 0.1, solid: true, col: [4.2, 0.5, 0, 0, 0, 1.5] });
  placeKit('fence', 'fence-3', -27.5, -21.0, { ry: 0.9, solid: true, col: [4.2, 0.5, 0, 0, 0, 1.5] });
  placeKit('fence', 'fence-4', 18.0, 23.2, { ry: -0.12, solid: true, col: [4.2, 0.5, 0, 0, 0, 1.5] });
  // supply caches
  const supplySpots = [[1.3, 15.0, 0.1], [6.2, -19.4, -0.3]];
  for (let i = 0; i < supplySpots.length; i++) {
    const [x, z, ry] = supplySpots[i];
    const p = placeKit('supply', 'supply-' + (i + 1), x, z, { ry, solid: true, col: [1.15, 0.8, 0, 0, 0, 0.95] });
    p.node.userData.supply = true;
    WORLD.supplies.push({ id: 'supply-' + (i + 1), x, z, used: false, cooldown: 0, node: p.node });
  }
  // rocks (solid)
  const rocks = [[-30.2, -13.2, 1.7, 0.3], [28.6, 7.4, 1.15, -0.4], [-26.4, -25.2, 2.2, 0.9],
                 [29.4, 22.4, 1.0, 1.6], [-31.2, 23.0, 1.45, -1.1], [20.8, -27.8, 1.1, 0.4],
                 [24.8, 20.4, 0.9, 2.2], [-6.4, -28.4, 1.0, -0.8]];
  for (let i = 0; i < rocks.length; i++) {
    const [x, z, s, ry] = rocks[i];
    placeKit('rock', 'rock-' + i, x, z, { variant: i % 5, sx: s, sy: s, sz: s, y: -0.1, ry, solid: true, pad: 0.25 });
  }
  // interior drifts (visual + collision)
  const driftSpots = [[-26.8, 15.6, 3.4, 0.9, 2.2, 3.1], [27.0, -2.2, 2.6, 0.7, 1.9, 1.2],
                      [-13.4, -25.6, 3.2, 0.85, 2.1, 4.0], [9.8, 21.6, 2.4, 0.6, 1.7, 2.2],
                      [22.2, 21.6, 2.9, 0.75, 1.9, 5.3], [-2.0, -12.6, 2.0, 0.5, 1.5, 6.2],
                      [11.4, -25.0, 2.6, 0.6, 1.8, 2.7], [-7.4, 6.8, 1.7, 0.35, 1.2, 7.4]];
  for (let i = 0; i < driftSpots.length; i++) {
    const [x, z, rx, ry, rz, s] = driftSpots[i];
    const k = buildDrift(s * 23 + i * 7, rx, ry, rz);
    const m = M4.trs(M4.create(), x, -0.1, z, 0, s * 0.7, 0, 1, 1, 1);
    const node = makeMeshNode('drift-i-' + i, k.geo, { name: 'drift' });
    node.setMatrix(m); node.position.set(x, -0.1, z);
    node.userData.identity = k.identity; node.userData.parts = k.parts; node.userData.solid = true;
    WORLD.scene.add(node);
    const draw = { kitName: 'drift', kit: k, geo: k.geo, node, model: m, castShadow: true, visible: true, mesh: null };
    WORLD.draws.push(draw);
    const col = { x0: x - rx * 0.72, x1: x + rx * 0.72, z0: z - rz * 0.72, z1: z + rz * 0.72, y0: -0.2, y1: Math.min(1.3, ry * 0.85), name: 'drift-i-' + i };
    addCollider(col); draw.collider = col;
  }

  /* -------------------------- set dressing ------------------------------ */
  placeKit('rock', 'rock-wide-fg', 20.0, 25.5, { variant: 2, sx: 1.35, sy: 1.25, sz: 1.35, ry: 0.35, solid: true, pad: 0.2 });
  placeKit('drift', 'drift-wide-fg', 15.8, 27.6, { variant: 0, ry: 1.2, y: -0.1, solid: false, pad: 0.0 });
  placeKit('signpost', 'signpost', -10.6, 12.6, { ry: 0.18, solid: true, col: [0.34, 0.3, 0, 0, 0, 2.1] });
  placeKit('reel', 'cable-reel', -6.0, 10.6, { ry: 1.0, solid: true, col: [1.7, 1.2, 0, 0, 0, 1.2] });
  placeKit('radome', 'radome', 5.2, -13.5, { ry: 0.3, solid: true, col: [4.5, 4.5, 0, 0, 0, 1.4] });
  placeKit('pallet', 'pallet-4', -14.6, 16.4, { ry: 0.3, solid: true, col: [1.2, 1.1, 0, 0, 0, 1.0] });
  placeKit('crate', 'crate-near', -15.6, 17.2, { variant: 1, ry: 0.4, solid: true });
  placeKit('crate', 'crate-mid', 9.2, 14.8, { variant: 2, ry: -0.3, solid: true });
  placeKit('crate', 'crate-mid2', 10.2, 13.9, { variant: 0, ry: 0.2, solid: true });
  placeKit('pallet', 'pallet-5', -3.4, 5.4, { ry: 0.6, solid: true, col: [1.2, 1.1, 0, 0, 0, 1.0] });
  // sastrugi: low wind ridges that break the open snow into scales
  const sastrugi = [
    [-9.5, 18.8, 0.75, 0.13, 2.7, 41, 0.5], [-4.5, 16.6, 0.55, 0.11, 2.1, 42, 0.7], [1.0, 15.0, 0.65, 0.12, 2.5, 43, 0.4],
    [6.5, 13.0, 0.55, 0.10, 2.1, 44, 0.9], [-13.8, 13.0, 0.65, 0.12, 2.7, 45, 0.3], [-2.0, 7.0, 0.55, 0.10, 3.0, 46, 0.6],
    [9.0, 8.0, 0.65, 0.11, 2.5, 47, 1.0], [-6.0, 4.0, 0.55, 0.10, 2.3, 48, 0.2], [12.5, 6.0, 0.6, 0.11, 2.1, 49, 0.8]
  ];
  for (const [x, z, rx, ry, rz, sd, ang] of sastrugi) {
    const k = buildDrift(sd * 9 + 2, rx, ry, rz);
    placeKitAdhoc(k, 'sastrugi-' + sd, x, z, { y: -0.05, ry: ang, solid: false, castShadow: true });
  }
  const softDrifts = [
    [-14.4, 15.8, 2.0, 0.32, 1.2, 11], [-4.6, 18.4, 1.6, 0.28, 1.0, 12], [5.4, 17.2, 2.0, 0.3, 1.3, 13],
    [-16.8, 12.4, 2.5, 0.38, 1.7, 14], [-9.8, 6.9, 1.8, 0.28, 1.2, 15], [3.4, 10.2, 1.4, 0.24, 0.9, 16],
    [8.2, 3.2, 2.0, 0.3, 1.2, 17], [-12.7, 8.4, 1.3, 0.34, 2.6, 18], [-20.8, 17.0, 2.8, 0.36, 1.6, 19],
    [12.8, 16.0, 2.2, 0.3, 1.3, 20], [-2.0, 1.2, 1.6, 0.24, 1.0, 21], [17.6, 2.2, 2.1, 0.3, 1.3, 22]
  ];
  for (const [x, z, rx, ry, rz, sd] of softDrifts) {
    const k = buildDrift(sd * 7 + 3, rx, ry, rz);
    const tall = (k.geo.boundingBox.max.y - k.geo.boundingBox.min.y) >= 0.45;
    placeKitAdhoc(k, 'soft-drift-' + sd, x, z, { y: -0.08, ry: sd * 0.37, solid: tall, colInset: 0.65, castShadow: true });
  }

  /* --------------------------- flat surfaces ---------------------------- */
  buildGroundAndPads();
  buildRidges();

  /* ------------------------------- lights ------------------------------- */
  // cap static point lights for the shader at 8, keeping the relay lamps
  WORLD.gfxLights = WORLD.gfxLights.slice(0, 10);
  // sun + sky stand-ins so the light audit sees an anchored environment
  const sun = makeLight('DirectionalLight', ENV.sunColor, 1, 0);
  sun.position.set(-40, 30, -60);
  sun.setTRS(-40, 30, -60, 0);
  WORLD.scene.add(sun);
  const hemi = makeLight('HemisphereLight', [0.4, 0.5, 0.7], 0.4, 0);
  hemi.position.set(0, 30, 0); hemi.setTRS(0, 30, 0, 0);
  WORLD.scene.add(hemi);

  // muzzle light fixture: invisible sphere anchored exactly at the muzzle light
  const mg = new Builder();
  mg.part('lamp');
  mg.sphere(0, 0, 0, 0.06, 0.06, 0.06, 8, 5, [1, 0.5, 0.2], MAT.EMIT_W);
  const muzzleGeo = mg.finish('muzzle-fixture', [{ name: 'lamp', extents: [0.12, 0.12, 0.12] }]);
  const mnode = makeMeshNode('muzzle-fixture', muzzleGeo.geo, { name: 'muzzle' });
  mnode.visible = false;
  mnode.position.set(0, 1.6, 0); mnode.setTRS(0, 1.6, 0, 0);
  mnode.userData.identity = muzzleGeo.identity; mnode.userData.parts = muzzleGeo.parts;
  WORLD.scene.add(mnode);
  WORLD.muzzleFixture = mnode;
  const muzzleLight = addLightNode('muzzle-light', [0, 1.6, 0], [1, 0.55, 0.22], 0, 9);
  WORLD.muzzleLight = muzzleLight;
  // remove it from the static renderer list; the game appends it dynamically
  WORLD.gfxLights = WORLD.gfxLights.filter(l => l.pos !== muzzleLight.pos);

  /* --------------------------- enemy approach --------------------------- */
  const spawnTries = [[-25, 1], [24, 0], [-20, -19], [18, -23], [2, -27.5], [27, -11], [-28, -26.5],
                      [25, 19], [-27, 20.5], [8, -25.5], [-12, -22], [22, -21], [-23, 12], [29, 4]];
  for (const [x, z] of spawnTries) {
    if (!collides(x, z)) WORLD.enemySpawns.push([x, z]);
  }

  /* ------------------------------- cams -------------------------------- */
  S.updateMatrixWorld();
  WORLD.built = true;
  return WORLD;
}

/* --------------------------- beacon geometry --------------------------- */
function buildBeaconRing() {
  const b = new Builder();
  b.part('lamp');
  b.sphere(0, 0.52, 0, 0.13, 0.15, 0.13, 18, 10, PAL.cyan, MAT.EMIT_C);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    b.at(Math.cos(a) * 0.5, 0.05, Math.sin(a) * 0.5, -a);
    b.box(0, 0, 0, 0.22, 0.025, 0.05, PAL.cyan, MAT.EMIT_C, 0.003);
    b.done();
  }
  b.cyl(0, 0.08, 0, 0.06, 0.09, 0.18, 12, PAL.steelD, MAT.STEEL);
  return b.finish('beacon-ring', [{ name: 'lamp', extents: [1.1, 0.1, 1.1] }]);
}

/* ------------------------------ ground -------------------------------- */
const PATH_SEGS = [];
function buildGroundAndPads() {
  const R = mulberry32(4242);
  const B = SITE.bounds;
  // trodden routes
  const paths = [
    [[0, 24.5], [0, 17], [-0.6, 11.5], [0, 8]],
    [[0, 8], [-7, 4], [-13, 0], [-18, -6.2]],
    [[0, 8], [6, 3.5], [12, 0], [15.5, -5.0]],
    [[0, 8], [-1, -4], [-2.4, -12], [-3, -23.2]],
    [[0, 11], [-9, 10], [-15, 9.2]],
    [[0, 11], [9, 11], [15, 10]],
    [[0, 8], [0, 2], [6, -6], [12, -14], [16.6, -16]]
  ];
  for (const p of paths) for (let i = 0; i < p.length - 1; i++) PATH_SEGS.push([p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]]);
  function distPath(x, z) {
    let best = 1e9;
    for (const s of PATH_SEGS) {
      const vx = s[2] - s[0], vz = s[3] - s[1];
      const wx = x - s[0], wz = z - s[1];
      const t = clamp((wx * vx + wz * vz) / (vx * vx + vz * vz || 1), 0, 1);
      const dx = x - (s[0] + vx * t), dz = z - (s[1] + vz * t);
      best = Math.min(best, Math.hypot(dx, dz));
    }
    return best;
  }
  // contact occlusion from every collider on the near field
  const cols = WORLD.colliders.filter(c => c.x1 > -40 && c.x0 < 40 && c.z1 > -40 && c.z0 < 40);
  function contactAO(x, z) {
    let ao = 1.0;
    for (const c of cols) {
      const dx = Math.max(c.x0 - x, 0, x - c.x1);
      const dz = Math.max(c.z0 - z, 0, z - c.z1);
      const d = Math.hypot(dx, dz);
      if (d < 1.6) ao *= 1.0 - 0.42 * smoothstep(1.6, 0.0, d);
    }
    return ao;
  }
  // near-field snow: a height field with sastrugi-scale relief
  function groundH(x, z) {
    const n = vnoise2(x * 0.21 + 4.0, z * 0.21);
    return 0.030 * Math.sin(x * 0.24 + z * 0.19)
      + 0.020 * Math.sin(x * 0.06 - z * 0.31)
      + 0.019 * (vnoise2(x * 0.35, z * 0.35) - 0.5)
      + 0.050 * Math.sin(x * 0.95 + z * 0.34 + n * 5.0) * (0.55 + 0.45 * n)
      + 0.026 * Math.sin(x * 2.15 - z * 0.62 + n * 3.0)
      + 0.012 * Math.sin(x * 1.12 + z * 0.47) * (0.4 + 0.6 * vnoise2(x * 0.2, z * 0.2));
  }
  const x0 = -44, x1 = 44, z0 = -44, z1 = 38, step = 0.8;
  const nx = Math.floor((x1 - x0) / step), nz = Math.floor((z1 - z0) / step);
  const pos = [], nrm = [], col = [], mat = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * step, z = z0 + j * step;
    const und = groundH(x, z);
    pos.push(x, und, z);
    const e = 0.55;
    const hx = groundH(x + e, z) - groundH(x - e, z);
    const hz = groundH(x, z + e) - groundH(x, z - e);
    const nl = Math.hypot(hx, 2 * e, hz);
    nrm.push(-hx / nl, 2 * e / nl, -hz / nl);
    let c = PAL.snow.slice();
    const n = vnoise2(x * 0.18, z * 0.18);
    const n2 = vnoise2(x * 0.055 + 3.1, z * 0.055 + 7.7);
    c = [c[0] * (0.88 + 0.16 * n + 0.05 * n2), c[1] * (0.90 + 0.14 * n + 0.04 * n2), c[2] * (0.93 + 0.11 * n + 0.03 * n2)];
    // wind-scoured grey crust in streaks
    const scour = smoothstep(0.62, 0.85, vnoise2(x * 0.23 + 9.0, z * 0.09));
    c = [lerp(c[0], 0.42, scour * 0.35), lerp(c[1], 0.47, scour * 0.35), lerp(c[2], 0.54, scour * 0.35)];
    const dp = distPath(x, z);
    const trail = smoothstep(2.3, 0.25, dp) * (0.75 + 0.25 * vnoise2(x * 2.1, z * 2.1));
    c = [lerp(c[0], 0.25, trail * 0.22), lerp(c[1], 0.27, trail * 0.22), lerp(c[2], 0.30, trail * 0.22)];
    const ao = contactAO(x, z);
    const tint = 0.94 + 0.08 * vnoise2(x * 1.7, z * 1.7);
    col.push(c[0] * ao * tint, c[1] * ao * tint * 0.985, c[2] * ao * tint);
    mat.push(MAT.SNOW);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const groundGeo = emptyGeometry('PlaneGeometry');
  groundGeo.attributes.position = { count: pos.length / 3, array: new Float32Array(pos) };
  groundGeo.attributes.normal = { count: nrm.length / 3, array: new Float32Array(nrm) };
  groundGeo.attributes.color = { count: col.length / 3, array: new Float32Array(col) };
  groundGeo.attributes.material = { count: mat.length / 3, array: new Float32Array(mat) };
  groundGeo.index = { count: idx.length, array: new Uint32Array(idx) };
  groundGeo.computeBoundingBox();
  const gnode = makeMeshNode('ground-near', groundGeo, { name: 'snow' });
  gnode.setTRS(0, 0, 0, 0);
  gnode.userData.passable = true; gnode.userData.colliderSource = 'none';
  WORLD.scene.add(gnode);
  WORLD.groundNode = gnode;
  WORLD.draws.push({ kitName: 'ground', kit: null, geo: groundGeo, node: gnode, model: gnode.matrix, castShadow: false, visible: true, mesh: null });

  // far snow
  const fpos = [-700, -0.18, -700, 700, -0.18, -700, 700, -0.18, 700, -700, -0.18, 700];
  const fgeo = emptyGeometry('PlaneGeometry');
  fgeo.attributes.position = { count: 4, array: new Float32Array(fpos) };
  fgeo.attributes.normal = { count: 4, array: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]) };
  fgeo.attributes.color = { count: 4, array: new Float32Array(Array.from({ length: 12 }, (_, i) => [0.66, 0.685, 0.72][i % 3])) };
  fgeo.attributes.material = { count: 4, array: new Float32Array([MAT.SNOW, MAT.SNOW, MAT.SNOW, MAT.SNOW]) };
  fgeo.index = { count: 6, array: new Uint32Array([0, 2, 1, 0, 3, 2]) };
  fgeo.computeBoundingBox();
  const fnode = makeMeshNode('ground-far', fgeo, { name: 'snow' });
  fnode.userData.passable = true;
  WORLD.scene.add(fnode);
  WORLD.draws.push({ kitName: 'ground-far', kit: null, geo: fgeo, node: fnode, model: fnode.matrix, castShadow: false, visible: true, mesh: null });

  // concrete aprons, packed paths and ice: one flat detail mesh
  const dpos = [], dnrm = [], dcol = [], dmat = [], didx = [];
  function flatQuad(cx, cz, w, d, y, ry, c, matId, jitter = 0.05) {
    const ca = Math.cos(ry), sa = Math.sin(ry);
    const base = dpos.length / 3;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = sx * w / 2, lz = sz * d / 2;
      const x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
      dpos.push(x, y, z); dnrm.push(0, 1, 0);
      const j = 1 + (R() - 0.5) * jitter;
      dcol.push(c[0] * j, c[1] * j, c[2] * j);
      dmat.push(matId);
    }
    didx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  function polyIce(cx, cz, r, y) {
    const base = dpos.length / 3, n = 14;
    dpos.push(cx, y, cz); dnrm.push(0, 1, 0);
    dcol.push(PAL.ice[0] * 0.55, PAL.ice[1] * 0.62, PAL.ice[2] * 0.7); dmat.push(MAT.ICE);
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU;
      const rr = r * (0.7 + 0.35 * vnoise2(Math.cos(a) * 2 + cx, Math.sin(a) * 2 + cz));
      dpos.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr * 0.7); dnrm.push(0, 1, 0);
      dcol.push(PAL.ice[0] * 0.35, PAL.ice[1] * 0.42, PAL.ice[2] * 0.48); dmat.push(MAT.ICE);
    }
    for (let i = 1; i <= n; i++) didx.push(base, base + i, base + i + 1);
  }
  flatQuad(-17.5, 9.0, 8.8, 6.0, 0.145, 0.13, PAL.concrete, MAT.CONCRETE, 0.09);
  flatQuad(16.5, 9.8, 8.6, 5.8, 0.145, -0.24, PAL.concreteD, MAT.CONCRETE, 0.09);
  flatQuad(17.0, -16.0, 11.0, 7.4, 0.145, 0.12, PAL.concrete, MAT.CONCRETE, 0.09);
  flatQuad(22.4, -7.0, 6.8, 4.4, 0.145, -0.1, PAL.concreteWet, MAT.CONCRETE, 0.12);
  flatQuad(0, 8.6, 7.0, 5.0, 0.125, 0, PAL.concreteD, MAT.CONCRETE, 0.1);
  flatQuad(-12.2, 2.2, 3.4, 3.2, 0.125, 0.4, PAL.concreteD, MAT.CONCRETE, 0.12);
  polyIce(-9.2, 13.6, 2.8, 0.135);
  polyIce(2.2, 12.0, 2.2, 0.135);
  polyIce(-20.5, -2.5, 1.8, 0.135);
  // boots on the routes: readable dark pits, alternating left/right
  const footRng = mulberry32(771);
  function bootTrail(points, spread, step, dark) {
    let acc = 0, side = 1;
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k], b = points[k + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      const ux = dx / len, uz = dz / len;
      const px = -uz, pz = ux;
      for (let t = acc; t < len; t += step) {
        const x = a[0] + ux * t + px * spread * side + (footRng() - 0.5) * 0.12;
        const z = a[1] + uz * t + pz * spread * side + (footRng() - 0.5) * 0.12;
        const ang = Math.atan2(uz, ux) + (footRng() - 0.5) * 0.16;
        const yy = groundH(x, z) + 0.045;
        flatQuad(x, z, 0.235, 0.115, yy, ang, [dark[0], dark[1], dark[2]], MAT.SNOW, 0.03);
        side *= -1;
      }
      acc = 0;
    }
  }
  const boot = [0.155, 0.175, 0.205];
  bootTrail([[0, 23.5], [0, 17], [-0.6, 11.5], [0, 8], [-7, 4], [-13, 0], [-18, -6.2]], 0.16, 0.62, boot);
  bootTrail([[0, 8], [6, 3.5], [12, 0], [15.5, -5.0]], 0.16, 0.62, boot);
  bootTrail([[0, 8], [-1, -4], [-2.4, -12], [-3, -23.2]], 0.16, 0.62, boot);
  bootTrail([[-8.3, 18.8], [-11.5, 18.3], [-14.2, 17.2]], 0.13, 0.62, boot);
  bootTrail([[0, 11], [-9, 10], [-15, 9.2]], 0.15, 0.62, boot);
  // vehicle ruts: two dark strips with a packed crown between them
  function ruts(points, half, color) {
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k], b = points[k + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      const ux = dx / len, uz = dz / len;
      const px = -uz, pz = ux;
      const ang = Math.atan2(uz, ux);
      for (let t = 0; t < len; t += 1.0) {
        const cx = a[0] + ux * (t + 0.5), cz = a[1] + uz * (t + 0.5);
        for (const s of [-1, 1]) {
          const x = cx + px * half * s, z = cz + pz * half * s;
          flatQuad(x, z, 0.95, 0.24, groundH(x, z) + 0.05, ang, color, MAT.SNOW, 0.10);
        }
      }
    }
  }
  ruts([[-7.6, 18.2], [-5.0, 15.4], [-1.6, 12.6], [2.4, 9.6]], 0.85, [0.165, 0.185, 0.215]);
  ruts([[-8.8, 14.2], [-7.0, 10.6], [-6.0, 7.4]], 0.85, [0.17, 0.19, 0.22]);
  // a broad drifted tire scar near the depot
  flatQuad(18.8, -2.8, 5.2, 2.2, 0.125, -0.35, [0.17, 0.19, 0.22], MAT.SNOW, 0.14);
  const dgeo = emptyGeometry('PlaneGeometry');
  dgeo.attributes.position = { count: dpos.length / 3, array: new Float32Array(dpos) };
  dgeo.attributes.normal = { count: dnrm.length / 3, array: new Float32Array(dnrm) };
  dgeo.attributes.color = { count: dcol.length / 3, array: new Float32Array(dcol) };
  dgeo.attributes.material = { count: dmat.length / 3, array: new Float32Array(dmat) };
  dgeo.index = { count: didx.length, array: new Uint32Array(didx) };
  dgeo.computeBoundingBox();
  const dnode = makeMeshNode('ground-detail', dgeo, { name: 'apron' });
  dnode.userData.passable = true;
  WORLD.scene.add(dnode);
  WORLD.draws.push({ kitName: 'detail', kit: null, geo: dgeo, node: dnode, model: dnode.matrix, castShadow: false, visible: true, mesh: null });
}

/* ------------------------------- ridge --------------------------------- */
function buildRidges() {
  const makeRing = (radius, baseH, peakH, segs, seed, tint) => {
    const R = mulberry32(seed);
    for (let s = 0; s < segs; s++) {
      const a0 = s / segs * TAU, a1 = (s + 1) / segs * TAU;
      const ac = (a0 + a1) / 2;
      const cx = Math.cos(ac) * radius, cz = Math.sin(ac) * radius;
      const b = new Builder();
      b.part('ridge');
      const steps = 26;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const a = lerp(a0, a1, i / steps);
        const envelope = 0.35 + 0.65 * vnoise2(Math.cos(a) * 2.2 + seed, Math.sin(a) * 2.2 - seed);
        const jag = Math.pow(Math.abs(Math.sin(a * 13.7 + seed)), 2.2) * 0.55
          + Math.pow(Math.abs(Math.sin(a * 31.1 - seed * 2)), 3.0) * 0.25
          + Math.pow(Math.abs(Math.sin(a * 5.3 + seed * 0.7)), 1.5) * 0.45;
        const h = baseH + peakH * (envelope * 0.65 + jag * 0.55);
        const lx = Math.cos(a) * radius - cx, lz = Math.sin(a) * radius - cz;
        pts.push([lx, h, lz]);
      }
      for (let i = 0; i < steps; i++) {
        const a = lerp(a0, a1, (i + 0.5) / steps);
        const inward = [-Math.cos(a), 0, -Math.sin(a)];
        const p0 = [pts[i][0], -6, pts[i][2]], p1 = [pts[i][1][0] !== undefined ? pts[i][1][0] : pts[i][0], 0, 0];
        const q0 = [pts[i][0], -6, pts[i][2]];
        const q1 = [pts[i + 1][0], -6, pts[i + 1][2]];
        const q2 = [pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]];
        const q3 = [pts[i][0], pts[i][1], pts[i][2]];
        const lowC = [PAL.rockD[0] * 0.85, PAL.rockD[1] * 0.85, PAL.rockD[2] * 0.85];
        const midC = [PAL.rock[0] * 0.55, PAL.rock[1] * 0.57, PAL.rock[2] * 0.60];
        const snowC = [PAL.snow[0] * 0.46, PAL.snow[1] * 0.50, PAL.snow[2] * 0.57];
        const peak = Math.min(pts[i][1], pts[i + 1][1]);
        const upperMix = smoothstep(baseH * 0.4, baseH + peakH * 0.75, peak);
        const topC = [lerp(midC[0], snowC[0], upperMix), lerp(midC[1], snowC[1], upperMix), lerp(midC[2], snowC[2], upperMix)];
        // lower band (rock)
        b.quad(q0, q1, [q1[0], pts[i + 1][1] * 0.58, q1[2]], [q0[0], pts[i][1] * 0.58, q0[2]], inward, lowC, MAT.ROCK);
        // upper band (rock with snow on the high shoulders)
        b.quad([q0[0], pts[i][1] * 0.58, q0[2]], [q1[0], pts[i + 1][1] * 0.58, q1[2]], q2, q3, inward, topC, MAT.SNOW);
      }
      const geo = b.finish('ridge-seg', [{ name: 'ridge', extents: [radius * 0.4, peakH, 2] }]);
      const node = makeMeshNode('ridge-' + seed + '-' + s, geo.geo, { name: 'ridge' });
      node.setTRS(cx, 0, cz, 0);
      node.position.set(cx, 0, cz);
      node.userData.passable = true;
      WORLD.scene.add(node);
      WORLD.draws.push({ kitName: 'ridge', kit: null, geo: geo.geo, node, model: node.matrix, castShadow: false, visible: true, mesh: null });
    }
  };
  makeRing(118, 3.5, 15, 9, 53, 0.7);
  makeRing(225, 9, 36, 11, 31, 0.55);
  makeRing(355, 17, 58, 12, 77, 0.42);
}

/* --------------------------- upload + expose --------------------------- */
function uploadWorld() {
  for (const d of WORLD.draws) {
    if (d.mesh || !d.geo) continue;
    let m = WORLD.meshCache.get(d.geo);
    if (!m) { m = GFX.upload(d.geo, false); WORLD.meshCache.set(d.geo, m); }
    d.mesh = m;
    d.model = d.node.matrixWorld;
  }
  GFX.setWorld(WORLD.draws);
  GFX.setLights(WORLD.gfxLights);
  GFX.bakeStaticShadow(WORLD.draws);
  // contract
  window.__SCENE = WORLD.scene;
  window.__COLLIDERS = WORLD.colliders;
  window.__BOUNDS = SITE.bounds;
  window.__TESTMOVE = (x, z, dx, dz) => moveClamped(x, z, dx, dz);
  window.__WORLD = WORLD;
  window.__CAM_POS = { x: 0, z: 0 };
  WORLD.scene.updateMatrixWorld();
}

/* ---------------------------- world animation -------------------------- */
function updateWorld(dt, time) {
  for (const r of WORLD.relays) {
    if (r.beacon) r.beacon.visible = !!r.on;
  }
  return false;
}

/* marker helpers used by the game / HUD */
function relayObjectivePos(r) { return [r.x, 2.6, r.z]; }
WORLD.relayObjectivePos = relayObjectivePos;
