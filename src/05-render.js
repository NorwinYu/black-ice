/* =========================================================================
   BLACK ICE — 05 renderer
   WebGL2 forward renderer: analytic dusk sky, one sun with a baked static
   shadow map plus a live dynamic map, procedural PBR, HDR bloom, ACES,
   FXAA, grain and vignette. Also the particles / ribbons / decals / billboard
   batch pipeline used by the FX layer.
   ========================================================================= */

const ENV = {
  sunDir: (() => { const v = [-0.42, 0.265, 0.87]; const l = Math.hypot(...v); return v.map(x => x / l); })(),
  sunColor: [5.10, 3.25, 2.10],
  skyZenith: [0.005, 0.013, 0.042],
  skyHorizon: [0.305, 0.345, 0.435],
  sunGlow: [1.55, 0.66, 0.28],
  cloudLit: [0.46, 0.275, 0.185],
  groundBounce: [0.145, 0.17, 0.22],
  fogDensity: 0.0048,
  exposure: 0.84,
  bloom: 0.62
};

const GFX = (() => {
  let gl = null, canvas = null;
  const MAX_LIGHTS = 12;
  let progs = {};
  let fsVAO = null;
  let sceneBuf = null, bloom = null, ldr = null;
  let shadowS = null, shadowD = null;
  let staticDraws = [];
  let snow = null;
  let dyn = {};
  let quality = 'med';
  let stats = { calls: 0, tris: 0, fps: 60, lights: 0 };
  let W = 1, H = 1, PW = 1, PH = 1, scale = 1;
  let lights = [];
  let lightPos = new Float32Array(MAX_LIGHTS * 3);
  let lightCol = new Float32Array(MAX_LIGHTS * 3);
  let lightRange = new Float32Array(MAX_LIGHTS);
  let time = 0;
  let vmProj = new Float32Array(16);
  let cam = {
    pos: new Float32Array([0, 1.7, 16]), yaw: 0, pitch: 0, fov: 86,
    view: M4.create(), proj: M4.create(), vp: M4.create(), inv: M4.create(),
    forward: new Float32Array([0, 0, -1]), right: new Float32Array([1, 0, 0]), up: new Float32Array([0, 1, 0]),
    near: 0.1, far: 620
  };
  let shotMode = false;
  let frameNo = 0;
  let fpsAcc = 0, fpsN = 0;

  function note(msg) { console.error('Shader Error: ' + msg); window.__SHADER_ERRORS = (window.__SHADER_ERRORS || 0) + 1; }

  function compile(type, src, tag) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      note(tag + ': ' + log);
      return null;
    }
    return s;
  }
  function program(name, vsSrc, fsSrc) {
    const vs = compile(gl.VERTEX_SHADER, vsSrc, name + '.vs');
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc, name + '.fs');
    if (!vs || !fs) return { p: null, u: {}, name };
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      note(name + ' link: ' + gl.getProgramInfoLog(p));
      return { p: null, u: {}, name };
    }
    gl.deleteShader(vs); gl.deleteShader(fs);
    return { p, u: {}, name };
  }
  function U(prog, name) {
    if (!prog || !prog.p) return null;
    if (name in prog.u) return prog.u[name];
    let loc = gl.getUniformLocation(prog.p, name);
    if (loc === null && name.endsWith(']')) loc = gl.getUniformLocation(prog.p, name.replace('[0]', ''));
    prog.u[name] = loc;
    return loc;
  }
  function use(prog) { if (prog && prog.p) gl.useProgram(prog.p); }

  /* ------------------------------ targets ------------------------------ */
  function colorTex(w, h, fmt, type) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function makeFBOColor(w, h, hdr) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const tex = hdr ? colorTex(w, h, gl.RGBA16F, gl.HALF_FLOAT) : colorTex(w, h, gl.RGBA8, gl.UNSIGNED_BYTE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let depth = null;
    if (hdr) {
      depth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    }
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    if (!ok) note('FBO incomplete ' + w + 'x' + h + ' hdr=' + hdr);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, depth, w, h };
  }
  function makeShadow(size) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    if (!ok) note('shadow FBO incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, size, vp: M4.create() };
  }
  function makeTargets() {
    if (sceneBuf) { gl.deleteFramebuffer(sceneBuf.fbo); gl.deleteTexture(sceneBuf.tex); if (sceneBuf.depth) gl.deleteRenderbuffer(sceneBuf.depth); }
    if (bloom) { for (const k of ['a', 'b', 'c', 'd']) { gl.deleteFramebuffer(bloom[k].fbo); gl.deleteTexture(bloom[k].tex); } }
    if (ldr) { gl.deleteFramebuffer(ldr.fbo); gl.deleteTexture(ldr.tex); }
    sceneBuf = makeFBOColor(PW, PH, true);
    const hw = Math.max(1, Math.floor(PW / 2)), hh = Math.max(1, Math.floor(PH / 2));
    const qw = Math.max(1, Math.floor(PW / 4)), qh = Math.max(1, Math.floor(PH / 4));
    bloom = {
      a: makeFBOColor(hw, hh, true), b: makeFBOColor(hw, hh, true),
      c: makeFBOColor(qw, qh, true), d: makeFBOColor(qw, qh, true)
    };
    ldr = makeFBOColor(PW, PH, false);
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const qs = quality === 'high' ? 1.25 : quality === 'low' ? 0.68 : 1.0;
    let w = Math.max(2, Math.floor(canvas.clientWidth * dpr * qs));
    let h = Math.max(2, Math.floor(canvas.clientHeight * dpr * qs));
    const cap = 3.2e6;
    if (w * h > cap) { const k = Math.sqrt(cap / (w * h)); w = Math.floor(w * k); h = Math.floor(h * k); }
    W = Math.max(2, canvas.clientWidth); H = Math.max(2, canvas.clientHeight);
    if (w === PW && h === PH) return;
    PW = w; PH = h; scale = w / Math.max(1, W);
    canvas.width = PW; canvas.height = PH;
    makeTargets();
    M4.perspective(cam.proj, cam.fov * DEG, PW / PH, cam.near, cam.far);
  }

  /* ------------------------------ geometry ----------------------------- */
  function upload(geo, rigged = false) {
    const n = geo.attributes.position.count;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    function attr(loc, arr, size) {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return b;
    }
    attr(0, geo.attributes.position.array, 3);
    attr(1, geo.attributes.normal.array, 3);
    attr(2, geo.attributes.color.array, 3);
    attr(3, geo.attributes.material.array, 1);
    if (rigged && geo.attributes.part) attr(4, geo.attributes.part.array, 1);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.index.array, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, ibo, count: geo.index.count, tris: geo.index.count / 3, geo, rigged };
  }
  function setWorld(draws) { staticDraws = draws; }
  function bakeStaticShadow(draws) {
    const size = shadowS.size;
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowS.fbo);
    gl.drawBuffers([gl.NONE]);
    gl.viewport(0, 0, size, size);
    gl.clearDepth(1); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const sp = progs.shadow;
    use(sp);
    gl.uniformMatrix4fv(U(sp, 'uViewProj'), false, shadowS.vp);
    gl.uniform1f(U(sp, 'uRig'), 0);
    const I = M4.create();
    for (const d of draws) {
      if (!d.mesh || d.castShadow === false) continue;
      if (d.node && !d.node.visible) continue;
      gl.uniformMatrix4fv(U(sp, 'uModel'), false, d.model || I);
      gl.bindVertexArray(d.mesh.vao);
      gl.drawElements(gl.TRIANGLES, d.mesh.count, gl.UNSIGNED_INT, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function snowBuffer(count) {
    const seeds = new Float32Array(count * 7);
    const rr = mulberry32(99);
    for (let i = 0; i < count; i++) {
      seeds[i * 7] = rr() * 36 - 18;
      seeds[i * 7 + 1] = rr() * 17;
      seeds[i * 7 + 2] = rr() * 36 - 18;
      seeds[i * 7 + 3] = 0.7 + rr() * 1.7;
      seeds[i * 7 + 4] = rr() * TAU;
      seeds[i * 7 + 5] = 0.020 + rr() * 0.055;
      seeds[i * 7 + 6] = 0.26 + rr() * 0.62;
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
    gl.bindVertexArray(null);
    snow = { vao, count };
  }
  function dynBuf(defs) {
    const o = { vao: gl.createVertexArray(), max: 262144 };
    gl.bindVertexArray(o.vao);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, o.max * 4, gl.DYNAMIC_DRAW);
    for (const d of defs) {
      gl.enableVertexAttribArray(d.loc);
      gl.vertexAttribPointer(d.loc, d.size, gl.FLOAT, false, d.stride * 4, d.offset * 4);
    }
    gl.bindVertexArray(null);
    o.buf = b;
    return o;
  }
  function updateDyn(o, data) {
    if (!data || !data.length) return 0;
    if (data.length > o.max) {
      o.max = Math.ceil(data.length * 1.5);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.buf);
      gl.bufferData(gl.ARRAY_BUFFER, o.max * 4, gl.DYNAMIC_DRAW);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, o.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    return data.length;
  }
  function bindFS() { gl.bindVertexArray(fsVAO); }

  function orthoLightVP(out, center, half, dist, far) {
    const eye = [center[0] + ENV.sunDir[0] * dist, center[1] + ENV.sunDir[1] * dist, center[2] + ENV.sunDir[2] * dist];
    const v = M4.create();
    M4.lookAt(v, eye, center, [0, 1, 0]);
    const p = M4.create();
    M4.ortho(p, -half, half, -half, half, 1, far);
    M4.mul(out, p, v);
  }

  function setEnvUniforms(p) {
    gl.uniform3f(U(p, 'uSunDir'), ENV.sunDir[0], ENV.sunDir[1], ENV.sunDir[2]);
    gl.uniform3f(U(p, 'uSunColor'), ENV.sunColor[0], ENV.sunColor[1], ENV.sunColor[2]);
    gl.uniform3f(U(p, 'uSkyZenith'), ENV.skyZenith[0], ENV.skyZenith[1], ENV.skyZenith[2]);
    gl.uniform3f(U(p, 'uSkyHorizon'), ENV.skyHorizon[0], ENV.skyHorizon[1], ENV.skyHorizon[2]);
    gl.uniform3f(U(p, 'uSunGlow'), ENV.sunGlow[0], ENV.sunGlow[1], ENV.sunGlow[2]);
    gl.uniform3f(U(p, 'uCloudLit'), ENV.cloudLit[0], ENV.cloudLit[1], ENV.cloudLit[2]);
    gl.uniform3f(U(p, 'uGroundBounce'), ENV.groundBounce[0], ENV.groundBounce[1], ENV.groundBounce[2]);
    gl.uniform1f(U(p, 'uTime'), time);
    gl.uniform3f(U(p, 'uCamPos'), cam.pos[0], cam.pos[1], cam.pos[2]);
    gl.uniform1f(U(p, 'uFogDensity'), ENV.fogDensity);
    gl.uniform1i(U(p, 'uLightCount'), lights.length);
    if (lights.length) {
      gl.uniform3fv(U(p, 'uLightPos[0]'), lightPos);
      gl.uniform3fv(U(p, 'uLightColor[0]'), lightCol);
      gl.uniform1fv(U(p, 'uLightRange[0]'), lightRange);
    }
  }

  function buildCamera() {
    const f = cam.forward, r = cam.right, u = cam.up;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    f[0] = sy * cp; f[1] = sp; f[2] = -cy * cp;
    r[0] = cy; r[1] = 0; r[2] = sy;
    u[0] = r[1] * f[2] - r[2] * f[1];
    u[1] = r[2] * f[0] - r[0] * f[2];
    u[2] = r[0] * f[1] - r[1] * f[0];
    const ul = Math.hypot(u[0], u[1], u[2]) || 1;
    u[0] /= ul; u[1] /= ul; u[2] /= ul;
    M4.lookAt(cam.view, cam.pos, [cam.pos[0] + f[0], cam.pos[1] + f[1], cam.pos[2] + f[2]], [0, 1, 0]);
    M4.perspective(cam.proj, cam.fov * DEG, PW / PH, cam.near, cam.far);
    M4.mul(cam.vp, cam.proj, cam.view);
    M4.invert(cam.inv, cam.vp);
    M4.perspective(vmProj, 58 * DEG, PW / PH, 0.01, 20);
  }

  function setCamera(pos, yaw, pitch, fov) {
    cam.pos[0] = pos[0]; cam.pos[1] = pos[1]; cam.pos[2] = pos[2];
    cam.yaw = yaw; cam.pitch = pitch; cam.fov = fov;
  }

  /* ------------------------------- frame ------------------------------- */
  function drawStatic() {
    const p = progs.world;
    use(p);
    gl.uniform1f(U(p, 'uRig'), 0);
    const I = M4.create();
    for (const d of staticDraws) {
      if (d.visible === false) continue;
      if (d.node && !d.node.visible) continue;
      gl.uniformMatrix4fv(U(p, 'uModel'), false, d.model || I);
      gl.bindVertexArray(d.mesh.vao);
      gl.drawElements(gl.TRIANGLES, d.mesh.count, gl.UNSIGNED_INT, 0);
      stats.calls++; stats.tris += d.mesh.tris;
    }
  }

  function drawWorldScene(enemies, fx) {
    const p = progs.world;
    // dynamic shadow map (only rigs move)
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowD.fbo);
    gl.drawBuffers([gl.NONE]);
    gl.viewport(0, 0, shadowD.size, shadowD.size);
    gl.clearDepth(1); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    use(progs.shadow);
    gl.uniformMatrix4fv(U(progs.shadow, 'uViewProj'), false, shadowD.vp);
    gl.uniform1f(U(progs.shadow, 'uRig'), 1);
    for (const e of enemies) {
      if (!e || !e.mesh || e.visible === false) continue;
      gl.uniformMatrix4fv(U(progs.shadow, 'uModel'), false, e.model);
      gl.uniformMatrix4fv(U(progs.shadow, 'uBone[0]'), false, e.bones);
      gl.bindVertexArray(e.mesh.vao);
      gl.drawElements(gl.TRIANGLES, e.mesh.count, gl.UNSIGNED_INT, 0);
      stats.calls++;
    }

    // main scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneBuf.fbo);
    gl.viewport(0, 0, PW, PH);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // sky
    use(progs.sky);
    setEnvUniforms(progs.sky);
    gl.uniformMatrix4fv(U(progs.sky, 'uInvViewProj'), false, cam.inv);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    bindFS();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stats.calls++; stats.tris += 1;

    // world
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    use(p);
    setEnvUniforms(p);
    gl.uniformMatrix4fv(U(p, 'uViewProj'), false, cam.vp);
    gl.uniformMatrix4fv(U(p, 'uShadowVP0'), false, shadowS.vp);
    gl.uniformMatrix4fv(U(p, 'uShadowVP1'), false, shadowD.vp);
    gl.uniform1f(U(p, 'uShadowTexel0'), 1 / shadowS.size);
    gl.uniform1f(U(p, 'uShadowTexel1'), 1 / shadowD.size);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadowS.tex);
    gl.uniform1i(U(p, 'uShadow0'), 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shadowD.tex);
    gl.uniform1i(U(p, 'uShadow1'), 2);
    drawStatic();

    // rigged enemies
    gl.uniform1f(U(p, 'uRig'), 1);
    for (const e of enemies) {
      if (!e || !e.mesh || e.visible === false) continue;
      gl.uniformMatrix4fv(U(p, 'uModel'), false, e.model);
      gl.uniformMatrix4fv(U(p, 'uBone[0]'), false, e.bones);
      gl.bindVertexArray(e.mesh.vao);
      gl.drawElements(gl.TRIANGLES, e.mesh.count, gl.UNSIGNED_INT, 0);
      stats.calls++; stats.tris += e.mesh.tris;
    }
    gl.uniform1f(U(p, 'uRig'), 0);

    // snow flurry (alpha, depth tested, no write)
    if (snow && snow.count) {
      use(progs.snow);
      setEnvUniforms(progs.snow);
      gl.uniformMatrix4fv(U(progs.snow, 'uViewProj'), false, cam.vp);
      gl.uniform1f(U(progs.snow, 'uPointScale'), PH / (2 * Math.tan(cam.fov * DEG / 2)));
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.bindVertexArray(snow.vao);
      gl.drawArrays(gl.POINTS, 0, snow.count);
      stats.calls++;
      gl.depthMask(true);
    }
    gl.disable(gl.CULL_FACE);

    // effects
    if (fx) drawFX(fx);
    gl.enable(gl.CULL_FACE);
  }

  function drawFX(fx) {
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(false);
    const p = progs.ribbon;
    use(p);
    setEnvUniforms(p);
    gl.uniformMatrix4fv(U(p, 'uViewProj'), false, cam.vp);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    if (fx.ribbons && fx.ribbons.length) {
      updateDyn(dyn.ribbon, fx.ribbons);
      gl.drawArrays(gl.TRIANGLES, 0, fx.ribbons.length / 7);
      stats.calls++;
    }
    const p2 = progs.sprite;
    use(p2);
    setEnvUniforms(p2);
    gl.uniformMatrix4fv(U(p2, 'uViewProj'), false, cam.vp);
    if (fx.sprites && fx.sprites.length) {
      updateDyn(dyn.sprite, fx.sprites);
      gl.drawArrays(gl.TRIANGLES, 0, fx.sprites.length / 10);
      stats.calls++;
    }
    // sparks (additive points)
    const p3 = progs.spark;
    use(p3);
    gl.uniformMatrix4fv(U(p3, 'uViewProj'), false, cam.vp);
    gl.uniform1f(U(p3, 'uPointScale'), PH / (2 * Math.tan(cam.fov * DEG / 2)));
    if (fx.sparks && fx.sparks.length) {
      updateDyn(dyn.spark, fx.sparks);
      gl.drawArrays(gl.POINTS, 0, fx.sparks.length / 8);
      stats.calls++;
    }
    // decals (alpha blended)
    if (fx.decals && fx.decals.length) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      const p4 = progs.decal;
      use(p4);
      gl.uniformMatrix4fv(U(p4, 'uViewProj'), false, cam.vp);
      updateDyn(dyn.decal, fx.decals);
      gl.drawArrays(gl.TRIANGLES, 0, fx.decals.length / 9);
      stats.calls++;
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function drawViewmodel(vm) {
    if (!vm || !vm.body) return;
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    const p = progs.vm;
    use(p);
    gl.uniformMatrix4fv(U(p, 'uProj'), false, vmProj);
    gl.uniform3f(U(p, 'uSunView'), -0.55, 0.78, 0.42);
    gl.uniform3f(U(p, 'uSkyView'), 0.16, 0.20, 0.26);
    gl.uniform1f(U(p, 'uFlash'), vm.flash || 0);
    gl.uniformMatrix4fv(U(p, 'uModel'), false, vm.body);
    if (vm.bodyMesh) {
      gl.bindVertexArray(vm.bodyMesh.vao);
      gl.drawElements(gl.TRIANGLES, vm.bodyMesh.count, gl.UNSIGNED_INT, 0);
      stats.calls++; stats.tris += vm.bodyMesh.tris;
    }
    if (vm.mag && vm.magMesh) {
      gl.uniformMatrix4fv(U(p, 'uModel'), false, vm.mag);
      gl.bindVertexArray(vm.magMesh.vao);
      gl.drawElements(gl.TRIANGLES, vm.magMesh.count, gl.UNSIGNED_INT, 0);
      stats.calls++; stats.tris += vm.magMesh.tris;
    }
    if (vm.altMatrix && vm.altMesh) {
      gl.uniformMatrix4fv(U(p, 'uModel'), false, vm.altMatrix);
      gl.bindVertexArray(vm.altMesh.vao);
      gl.drawElements(gl.TRIANGLES, vm.altMesh.count, gl.UNSIGNED_INT, 0);
      stats.calls++; stats.tris += vm.altMesh.tris;
    }
    gl.enable(gl.CULL_FACE);
  }

  function post() {
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    // bright pass -> bloom.a (half)
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloom.a.fbo);
    gl.viewport(0, 0, bloom.a.w, bloom.a.h);
    use(progs.bright);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneBuf.tex);
    gl.uniform1i(U(progs.bright, 'uTex'), 0);
    gl.uniform2f(U(progs.bright, 'uTexel'), 1 / PW, 1 / PH);
    bindFS(); gl.drawArrays(gl.TRIANGLES, 0, 3); stats.calls++;
    // blur half: a -> b (horizontal), b -> a (vertical)
    const blur = (src, dst, dir) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
      gl.viewport(0, 0, dst.w, dst.h);
      use(progs.blur);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(U(progs.blur, 'uTex'), 0);
      gl.uniform2f(U(progs.blur, 'uTexel'), 1 / src.w, 1 / src.h);
      gl.uniform2f(U(progs.blur, 'uDir'), dir[0], dir[1]);
      bindFS(); gl.drawArrays(gl.TRIANGLES, 0, 3); stats.calls++;
    };
    blur(bloom.a, bloom.b, [1, 0]);
    blur(bloom.b, bloom.a, [0, 1]);
    // downsample to quarter, blur
    gl.bindFramebuffer(gl.FRAMEBUFFER, bloom.c.fbo);
    gl.viewport(0, 0, bloom.c.w, bloom.c.h);
    use(progs.copy);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bloom.a.tex);
    gl.uniform1i(U(progs.copy, 'uTex'), 0);
    gl.uniform2f(U(progs.copy, 'uTexel'), 1 / bloom.a.w, 1 / bloom.a.h);
    bindFS(); gl.drawArrays(gl.TRIANGLES, 0, 3); stats.calls++;
    blur(bloom.c, bloom.d, [1, 0]);
    blur(bloom.d, bloom.c, [0, 1]);
    // tonemap -> ldr
    gl.bindFramebuffer(gl.FRAMEBUFFER, ldr.fbo);
    gl.viewport(0, 0, PW, PH);
    use(progs.comp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneBuf.tex);
    gl.uniform1i(U(progs.comp, 'uScene'), 0);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, bloom.a.tex);
    gl.uniform1i(U(progs.comp, 'uBloomA'), 3);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, bloom.c.tex);
    gl.uniform1i(U(progs.comp, 'uBloomB'), 4);
    gl.uniform1f(U(progs.comp, 'uExposure'), ENV.exposure);
    gl.uniform1f(U(progs.comp, 'uBloom'), ENV.bloom);
    bindFS(); gl.drawArrays(gl.TRIANGLES, 0, 3); stats.calls++;
    // FXAA + grain + vignette -> default fb
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawBuffers([gl.BACK]);
    gl.viewport(0, 0, PW, PH);
    use(progs.fxaa);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ldr.tex);
    gl.uniform1i(U(progs.fxaa, 'uTex'), 0);
    gl.uniform2f(U(progs.fxaa, 'uTexel'), 1 / PW, 1 / PH);
    gl.uniform1f(U(progs.fxaa, 'uTime'), time);
    gl.uniform1f(U(progs.fxaa, 'uGrain'), 0.009);
    gl.uniform1f(U(progs.fxaa, 'uVignette'), 0.70);
    bindFS(); gl.drawArrays(gl.TRIANGLES, 0, 3); stats.calls++;
  }

  function renderFrame(opts) {
    const t0 = performance.now();
    if (canvas.clientWidth !== W || canvas.clientHeight !== H) resize();
    resize();
    time = opts.time;
    shotMode = !!opts.shot;
    stats.calls = 0; stats.tris = 0;
    setCamera(opts.cam.pos, opts.cam.yaw, opts.cam.pitch, opts.cam.fov);
    buildCamera();
    // dynamic shadow ortho follows the camera
    const cx = cam.pos[0] + cam.forward[0] * 4, cz = cam.pos[2] + cam.forward[2] * 4;
    orthoLightVP(shadowD.vp, [cx, 0, cz], 24, 70, 160);
    drawWorldScene(opts.enemies || [], opts.fx || null);
    if (opts.viewmodel) drawViewmodel(opts.viewmodel);
    post();
    stats.lights = lights.length + 2;
    frameNo++;
    stats.fps = Math.round(1000 / Math.max(8, performance.now() - t0));
    frameNo++;
    window.__STATS = {
      calls: stats.calls, triangles: Math.round(stats.tris), lights: stats.lights,
      fps: stats.fps,
      renderScale: +(PW / W).toFixed(2)
    };
  }
  let divCheck = 0;
  function sizeCheckDiv() {
    divCheck++;
    if (divCheck < 30) return;
    divCheck = 0;
    if (PW / W > 2.6) resize();
  }

  function init(cv) {
    canvas = cv;
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) {
      document.body.innerHTML = '<div style="color:#e8e6de;font-family:monospace;padding:40px">需要 WebGL2 支持 / WebGL2 is required.</div>';
      return false;
    }
    window.gl = gl;
    window.__SHADER_ERRORS = 0;
    const hf = gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    if (!hf) console.error('no EXT_color_buffer_float; HDR may fail');
    progs = {
      world: program('world', SHADERS.worldVS, SHADERS.worldFS),
      shadow: program('shadow', SHADERS.shadowVS, SHADERS.shadowFS),
      sky: program('sky', SHADERS.skyVS, SHADERS.skyFS),
      vm: program('vm', SHADERS.vmVS, SHADERS.vmFS),
      snow: program('snow', SHADERS.snowVS, SHADERS.snowFS),
      spark: program('spark', SHADERS.sparkVS, SHADERS.sparkFS),
      ribbon: program('ribbon', SHADERS.ribbonVS, SHADERS.ribbonFS),
      sprite: program('sprite', SHADERS.spriteVS, SHADERS.spriteFS),
      decal: program('decal', SHADERS.decalVS, SHADERS.decalFS),
      bright: program('bright', SHADERS.fullVS, SHADERS.brightFS),
      blur: program('blur', SHADERS.fullVS, SHADERS.blurFS),
      copy: program('copy', SHADERS.fullVS, SHADERS.copyFS),
      comp: program('comp', SHADERS.fullVS, SHADERS.compFS),
      fxaa: program('fxaa', SHADERS.fullVS, SHADERS.fxaaFS)
    };
    fsVAO = gl.createVertexArray();
    gl.bindVertexArray(fsVAO);
    const fb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 1);
    const q = new URLSearchParams(location.search).get('q');
    if (q && ['low', 'med', 'high'].includes(q)) quality = q;
    shadowS = makeShadow(quality === 'low' ? 1024 : 2048);
    shadowD = makeShadow(quality === 'high' ? 1536 : 1024);
    orthoLightVP(shadowS.vp, [0, 0, -2], 46, 110, 240);
    dyn.ribbon = dynBuf([{ loc: 0, size: 3, stride: 7, offset: 0 }, { loc: 1, size: 4, stride: 7, offset: 3 }]);
    dyn.sprite = dynBuf([{ loc: 0, size: 3, stride: 10, offset: 0 }, { loc: 1, size: 2, stride: 10, offset: 3 }, { loc: 2, size: 4, stride: 10, offset: 5 }, { loc: 3, size: 1, stride: 10, offset: 9 }]);
    dyn.decal = dynBuf([{ loc: 0, size: 3, stride: 9, offset: 0 }, { loc: 1, size: 2, stride: 9, offset: 3 }, { loc: 2, size: 4, stride: 9, offset: 5 }]);
    dyn.spark = dynBuf([{ loc: 0, size: 3, stride: 8, offset: 0 }, { loc: 1, size: 4, stride: 8, offset: 3 }, { loc: 2, size: 1, stride: 8, offset: 7 }]);
    snowBuffer(quality === 'high' ? 5200 : quality === 'low' ? 1800 : 3400);
    resize();
    return true;
  }

  function setLights(list) {
    lights = list.slice(0, MAX_LIGHTS);
    for (let i = 0; i < lights.length; i++) {
      lightPos[i * 3] = lights[i].pos[0]; lightPos[i * 3 + 1] = lights[i].pos[1]; lightPos[i * 3 + 2] = lights[i].pos[2];
      const c = lights[i].color;
      lightCol[i * 3] = c[0]; lightCol[i * 3 + 1] = c[1]; lightCol[i * 3 + 2] = c[2];
      lightRange[i] = lights[i].range || 12;
    }
  }
  function setQuality(q) {
    if (q === quality) return;
    quality = q;
    if (gl) {
      const s = quality === 'low' ? 1024 : 2048;
      const d = quality === 'high' ? 1536 : 1024;
      if (shadowS.size !== s) { shadowS = makeShadow(s); orthoLightVP(shadowS.vp, [0, 0, -2], 46, 110, 240); window.__REBAKE = true; }
      if (shadowD.size !== d) shadowD = makeShadow(d);
      if (snow && (quality === 'high' ? snow.count !== 4200 : quality === 'low' ? snow.count !== 1400 : snow.count !== 2600)) {
        snowBuffer(quality === 'high' ? 5200 : quality === 'low' ? 1800 : 3400);
      }
      PW = PH = 0; resize();
    }
  }
  function project(p) {
    const m = cam.vp;
    const x = p[0], y = p[1], z = p[2];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.001) return null;
    const cx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw;
    const cy = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw;
    return { x: (cx * 0.5 + 0.5) * W, y: (1 - (cy * 0.5 + 0.5)) * H, w: cw, on: Math.abs(cx) <= 1 && Math.abs(cy) <= 1 };
  }
  function muzzleWorld() {
    const f = cam.forward, r = cam.right, u = cam.up;
    return [cam.pos[0] + f[0] * 1.12 + r[0] * 0.14 - u[0] * 0.12,
            cam.pos[1] + f[1] * 1.12 + r[1] * 0.14 - u[1] * 0.12,
            cam.pos[2] + f[2] * 1.12 + r[2] * 0.14 - u[2] * 0.12];
  }
  return {
    init, resize, upload, setWorld, bakeStaticShadow, renderFrame, setLights, setQuality, project, muzzleWorld,
    camera: cam, get cameraForward() { return cam.forward; }, get cameraRight() { return cam.right; },
    get cameraUp() { return cam.up; }, get stats() { return stats; }, get quality() { return quality; },
    get width() { return PW; }, get height() { return PH; }, get gl() { return gl; }, progs
  };
})();
