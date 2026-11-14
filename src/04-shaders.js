/* =========================================================================
   BLACK ICE — 04 shaders
   Procedural PBR surfaces, a directional sun with two shadow cascades,
   an analytic dusk sky used both as backdrop and as the IBL source, snow
   sparkle, fog whose colour follows the sky, and the HDR post chain.
   ========================================================================= */

const GLSL_HEAD = `#version 300 es
precision highp float;
precision highp int;
#define PI 3.141592653589793
`;

const GLSL_NOISE = `
float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x), mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x), mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x), f.y), f.z);
}
float fbm2(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(vec3(p,1.7)); p=p*2.02+vec2(1.3,7.7); a*=0.5; } return s; }
float fbm3(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=0.5; } return s; }
float ridge3(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<3;i++){ float n=1.0-abs(vnoise(p)*2.0-1.0); s+=a*n*n; p=p*2.11+7.3; a*=0.5; } return s; }
float fbm5(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=0.5; } return s; }

// Bump mapping on an unparametrised surface (Mikkelsen): no tangent space needed.
vec3 bumpNormal(vec3 N, vec3 P, float h, float amount){
  vec3 dpx = dFdx(P), dpy = dFdy(P);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, N);
  vec3 r2 = cross(N, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * N - amount * grad);
}
`;

const GLSL_SHARED = `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;
uniform vec3 uCloudLit;
uniform vec3 uGroundBounce;
uniform float uTime;
uniform vec3 uCamPos;
uniform float uFogDensity;

vec3 skyColor(vec3 d){
  float y = max(d.y, 0.0);
  vec3 col = mix(uSkyHorizon*0.92, uSkyZenith, pow(clamp(y*2.0, 0.0, 1.0), 0.36));
  vec2 dh = normalize(d.xz + vec2(1e-5));
  vec2 sh = normalize(uSunDir.xz + vec2(1e-5));
  float az = max(dot(dh, sh), 0.0);
  col += uSunGlow * pow(az, 5.0) * exp(-y*8.0) * 0.62;
  col += uSunGlow * pow(az, 2.0) * exp(-y*2.4) * 0.085;
  // anti-solar horizon: the cool pink band opposite a low sun
  float anti = max(dot(-dh, sh), 0.0);
  col += vec3(0.15, 0.075, 0.07) * pow(anti, 4.0) * exp(-y*9.0) * 0.55;
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 3000.0)*13.0 + pow(sd, 120.0)*0.18 + pow(sd, 9.0)*0.030);
  float horizonFade = smoothstep(0.015, 0.15, d.y);
  if (d.y > 0.015) {
    float t = 1500.0 / (d.y + 0.06);
    vec2 uv = (uCamPos.xz + d.xz * t) * 0.00050;
    uv += vec2(uTime*0.0007, uTime*0.00022);
    vec2 w = vec2(fbm2(uv*1.35+3.17), fbm2(uv*1.35+11.7)) - 0.5;
    float n = fbm2(uv*2.15 + w*0.85 + 4.0);
    float bank = fbm2(uv*0.52 + 8.0);
    float cover = smoothstep(0.455, 0.62, n + bank*0.14);
    float litMask = smoothstep(0.44, 0.74, n) * (0.35 + 0.65*az);
    vec3 shadowC = vec3(0.075,0.098,0.140);
    vec3 litC = mix(uCloudLit, vec3(0.72,0.60,0.52), 0.30 + 0.35*az);
    vec3 cloud = mix(shadowC, litC, litMask);
    cloud += uSunGlow * pow(az, 4.0) * smoothstep(0.40, 0.54, n) * 0.16;
    cloud *= 0.84 + 0.24*smoothstep(0.25, 0.95, 1.0-d.y);
    col = mix(col, cloud, cover*0.74*horizonFade);
    float ci = fbm2(vec2(uv.x*2.0 - uv.y*0.4, uv.y*8.5) + 9.3);
    vec3 cirrusC = mix(vec3(0.42,0.47,0.58), uCloudLit, 0.18 + 0.2*az);
    col += cirrusC * smoothstep(0.57, 0.82, ci) * 0.16 * smoothstep(0.08, 0.42, d.y);
  }
  col = mix(col, uSkyHorizon*0.98, smoothstep(0.12, -0.02, d.y) * 0.65);
  return col;
}

vec3 hazeColor(vec3 dir){
  float y = max(dir.y, 0.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(y*1.4,0.0,1.0), 0.7));
  vec2 dh = normalize(dir.xz + vec2(1e-5));
  vec2 sh = normalize(uSunDir.xz + vec2(1e-5));
  float az = max(dot(dh, sh), 0.0);
  return c + uSunGlow * pow(az, 5.0) * exp(-y*5.0) * 0.35;
}

float shadowTap(highp sampler2DShadow sm, mat4 vp, float texel, vec3 P, vec3 N){
  vec4 sp = vp * vec4(P + N*0.04, 1.0);
  vec3 sc = sp.xyz * 0.5 + 0.5;
  if (sc.x < 0.002 || sc.x > 0.998 || sc.y < 0.002 || sc.y > 0.998 || sc.z > 1.0) return 1.0;
  float ndl = clamp(dot(N, uSunDir), 0.0, 1.0);
  float bias = 0.0011 + 0.0032*(1.0-ndl);
  float s = 0.0;
  for (int y=-1; y<=1; y++) for (int x=-1; x<=1; x++) {
    s += texture(sm, vec3(sc.xy + vec2(float(x),float(y))*texel, sc.z - bias));
  }
  return s / 9.0;
}
`;

const WORLD_VS = GLSL_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aCol;
layout(location=3) in float aMat;
layout(location=4) in float aPart;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform float uRig;
uniform mat4 uBone[24];
out vec3 vWorld; out vec3 vNrm; out vec3 vCol; out float vMat;
void main(){
  mat4 M = uModel;
  if (uRig > 0.5) { M = uModel * uBone[int(aPart + 0.5)]; }
  vec4 wp = M * vec4(aPos, 1.0);
  vWorld = wp.xyz;
  vNrm = normalize(mat3(M) * aNrm);
  vCol = aCol;
  vMat = aMat;
  gl_Position = uViewProj * wp;
}`;

const WORLD_FS = GLSL_HEAD + GLSL_NOISE + GLSL_SHARED + `
uniform highp sampler2DShadow uShadow0;
uniform highp sampler2DShadow uShadow1;
uniform mat4 uShadowVP0;
uniform mat4 uShadowVP1;
uniform float uShadowTexel0;
uniform float uShadowTexel1;
uniform int uLightCount;
uniform vec3 uLightPos[12];
uniform vec3 uLightColor[12];
uniform float uLightRange[12];
in vec3 vWorld; in vec3 vNrm; in vec3 vCol; in float vMat;
out vec4 outColor;

float distFog(float d){ return clamp(1.0 - exp(-pow(d*uFogDensity, 1.45)), 0.0, 0.94); }

vec3 ggx(vec3 N, vec3 V, vec3 L, vec3 f0, float rough, float metal, vec3 albedo){
  vec3 H = normalize(V+L);
  float ndl = max(dot(N,L),0.0), ndv = max(dot(N,V),1e-3), ndh = max(dot(N,H),0.0), vdh = max(dot(V,H),0.0);
  float a = max(rough*rough, 0.0025);
  float a2 = a*a;
  float d = a2 / (PI * pow(ndh*ndh*(a2-1.0)+1.0, 2.0));
  float k = (rough+1.0)*(rough+1.0)/8.0;
  float g = (ndv/(ndv*(1.0-k)+k)) * (ndl/(ndl*(1.0-k)+k));
  vec3 F = f0 + (vec3(1.0)-f0)*pow(1.0-vdh,5.0);
  return d*g*F / max(4.0*ndv*ndl, 0.001);
}

void main(){
  vec3 P = vWorld;
  vec3 V = normalize(uCamPos - P);
  vec3 N = normalize(vNrm);
  vec3 base = vCol;
  float rough = 0.75, metal = 0.0, bumpAmt = 0.0, bumpH = 0.0;
  vec3 emissive = vec3(0.0);
  float m = vMat;

  if (m < 0.5) {                                   // wind-packed snow
    float macro = fbm3(vec3(P.xz*0.145, 1.0));
    float micro = fbm3(P*3.1);
    float sast = sin(P.x*1.25 + P.z*0.33 + macro*9.0 + vnoise(vec3(P.xz*0.5, 7.0))*4.0);
    float wind = sin(P.x*0.72 + P.z*0.42 + vnoise(vec3(P.xz*0.33,2.3))*5.5);
    float streak = fbm3(vec3(P.x*0.32, 0.8, P.z*2.6));
    float streak2 = fbm3(vec3(P.x*1.4, 1.7, P.z*0.5));
    bumpH = macro*0.72 + sast*0.10 + wind*0.085 + micro*0.06 + streak*0.10;
    N = bumpNormal(N, P, bumpH, 1.15);
    base *= (0.80 + 0.26*macro) * (0.95 + 0.08*micro);
    base *= 0.88 + 0.16*streak + 0.06*streak2;
    base.r += 0.014*macro; base.b += 0.022*macro;
    rough = 0.40 + 0.34*micro + 0.05*wind*0.5;
    // wind-scoured streaks and glitter; distance-damped so it never shimmers
    float sp = step(0.972, hash13(floor(P*150.0)));
    float glint = pow(max(dot(reflect(-V,N), uSunDir),0.0), 20.0);
    emissive += sp * glint * uSunColor * 2.6 * exp(-length(uCamPos-P)*0.07);
    // back-scatter: the sun is behind the camera in the hero frame
    base *= 1.0 + 0.34*pow(max(dot(V, -uSunDir), 0.0), 2.0);
  } else if (m < 1.5) {                             // rock
    float r = ridge3(P*0.6);
    float n = fbm3(P*2.4);
    bumpH = r*0.35 + n*0.35;
    N = bumpNormal(N, P, bumpH, 0.8);
    base *= 0.65 + 0.6*n;
    rough = 0.78 + 0.15*n;
  } else if (m < 2.5) {                             // concrete
    float n = fbm3(P*1.7);
    float crack = smoothstep(0.42, 0.48, ridge3(P*1.25));
    bumpH = n*0.5 + crack*0.25;
    N = bumpNormal(N, P, bumpH, 0.45);
    base *= 0.72 + 0.4*n;
    base *= 1.0 - 0.30*crack;
    float streak = fbm3(vec3(P.x*2.2, P.y*0.45, P.z*2.2));
    base *= 0.86 + 0.22*streak;
    rough = 0.80 + 0.15*n;
  } else if (m < 3.5) {                             // painted steel (chipped)
    float n = fbm3(P*0.9);
    float chip = fbm3(P*3.2);
    float mask = smoothstep(0.665, 0.760, chip + 0.08*vnoise(P*8.5));
    float streak = fbm3(vec3(P.x*2.6, P.y*0.40, P.z*2.6));
    float grime = smoothstep(1.3, 0.0, P.y) * (0.35 + 0.5*vnoise(P*3.4));
    bumpH = n*0.10 + chip*0.07;
    N = bumpNormal(N, P, bumpH, 0.14);
    base *= 0.90 + 0.14*n;
    base *= 0.93 + 0.10*streak;
    base = mix(base, vec3(0.090,0.036,0.018), mask*0.40);
    base = mix(base, vec3(0.055,0.052,0.045), grime*0.45);
    rough = mix(0.52, 0.90, mask) + 0.08*n;
    metal = 0.05;
  } else if (m < 4.5) {                             // rust
    float n = fbm3(P*2.6);
    float flake = fbm3(P*4.5);
    bumpH = n*0.35 + flake*0.18;
    N = bumpNormal(N, P, bumpH, 0.5);
    vec3 a = vec3(0.062,0.024,0.011), b2 = vec3(0.135,0.055,0.022);
    base = mix(a, b2, n) * (0.75 + 0.35*flake);
    rough = 0.90 + 0.08*flake;
    metal = 0.03;
  } else if (m < 5.5) {                             // bare / brushed steel
    float brush = fbm3(vec3(P.x*8.0, P.y*0.6, P.z*8.0));
    float n = fbm3(P*1.6);
    bumpH = n*0.25 + brush*0.12;
    N = bumpNormal(N, P, bumpH, 0.3);
    base *= 0.80 + 0.30*brush;
    rough = 0.30 + 0.18*n + 0.08*brush;
    metal = 0.85;
  } else if (m < 6.5) {                             // timber
    float plank = fract(P.x*2.4 + 0.5);
    float grain = vnoise(vec3(P.x*3.0, P.y*22.0, P.z*3.0));
    bumpH = grain*0.25 + plank*0.12;
    N = bumpNormal(N, P, bumpH, 0.35);
    base *= 0.78 + 0.28*grain;
    base *= 0.85 + 0.2*step(0.06, plank);
    rough = 0.78 + 0.12*grain;
  } else if (m < 7.5) {                             // rubber
    float n = fbm3(P*4.0);
    bumpH = n*0.2;
    N = bumpNormal(N, P, bumpH, 0.4);
    base *= 0.8 + 0.3*n;
    rough = 0.86;
  } else if (m < 8.5) {                             // ice
    float n = fbm3(P*1.2);
    bumpH = n*0.25;
    N = bumpNormal(N, P, bumpH, 0.25);
    base = mix(base, vec3(0.30,0.42,0.48), 0.55);
    rough = 0.06 + 0.05*n;
    metal = 0.0;
  } else if (m < 9.5) {                             // warm practical
    emissive = base * 1.25;
    base = vec3(0.02);
    rough = 0.25;
  } else if (m < 10.5) {                            // red beacon
    emissive = base * 2.3;
    base = vec3(0.02);
    rough = 0.25;
  } else if (m < 11.5) {                            // cyan readout
    emissive = base * 2.2;
    base = vec3(0.02);
    rough = 0.25;
  } else if (m < 12.5) {                            // tarpaulin / fabric
    float n = fbm3(P*3.2);
    float weave = vnoise(vec3(P.x*70.0, P.y*70.0, P.z*70.0));
    bumpH = n*0.3 + weave*0.1;
    N = bumpNormal(N, P, bumpH, 0.5);
    base *= 0.85 + 0.2*n;
    rough = 0.9;
  } else if (m < 13.5) {                            // glass
    base = vec3(0.030,0.045,0.062);
    rough = 0.045;
    metal = 0.05;
  } else {                                          // tar / wet patch
    float n = fbm3(P*2.2);
    bumpH = n*0.18;
    N = bumpNormal(N, P, bumpH, 0.3);
    base = vec3(0.028,0.030,0.032);
    rough = 0.22 + 0.12*n;
  }

  // contact/under-shadow darkening shared by every surface
  float contact = smoothstep(0.0, 0.55, P.y - 0.0);
  base *= 0.86 + 0.14*contact;

  float sh = min(shadowTap(uShadow0, uShadowVP0, uShadowTexel0, P, N),
                 shadowTap(uShadow1, uShadowVP1, uShadowTexel1, P, N));
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 f0 = mix(vec3(0.04), base, metal);
  vec3 spec = ggx(N, V, uSunDir, f0, clamp(rough,0.04,1.0), metal, base);
  vec3 sun = (base*(1.0-metal)/PI + spec) * uSunColor * ndl * sh;

  // sky IBL (analytic): diffuse hemisphere + roughness-blurred reflection
  vec3 ambDiff = mix(uGroundBounce, uSkyZenith, clamp(N.y*0.5+0.5,0.0,1.0));
  ambDiff *= base*(1.0-metal) * (0.62 + 0.38*sh);
  vec3 R = reflect(-V, N);
  vec3 env = skyColor(normalize(vec3(R.x, max(R.y, 0.02), R.z)));
  env = mix(env, uSkyZenith*0.55 + uGroundBounce*0.2, clamp(rough,0.0,1.0)*0.75);
  vec3 fw = f0 + (max(vec3(1.0-clamp(rough,0.0,1.0)), f0) - f0) * pow(1.0-max(dot(N,V),0.0), 5.0);
  vec3 specAmb = env * fw * (0.35 + 0.65*sh);

  vec3 col = sun + ambDiff + specAmb;
  if (metal > 0.4) col *= 1.0;

  // practical point lights
  for (int i=0; i<12; i++) {
    if (i >= uLightCount) break;
    vec3 Lp = uLightPos[i] - P;
    float dl = length(Lp);
    float r = uLightRange[i];
    if (dl > r) continue;
    vec3 L = Lp / max(dl, 1e-4);
    float att = pow(clamp(1.0 - dl/r, 0.0, 1.0), 2.0) / (1.0 + dl*dl*0.12);
    float nl = max(dot(N, L), 0.0);
    vec3 lc = uLightColor[i] * att;
    vec3 h = normalize(L + V);
    float sp2 = pow(max(dot(N,h),0.0), mix(180.0, 14.0, rough)) * (0.3 + 0.7*(1.0-rough));
    col += lc * (base*(1.0-metal)*nl*0.55 + vec3(sp2)*mix(vec3(1.0),f0,metal)*2.0);
  }

  col += emissive;

  float d = length(uCamPos - P);
  col = mix(col, hazeColor(normalize(P - uCamPos)), distFog(d));
  outColor = vec4(col, 1.0);
}`;

const SHADOW_VS = GLSL_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=4) in float aPart;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform float uRig;
uniform mat4 uBone[24];
void main(){
  mat4 M = uModel;
  if (uRig > 0.5) { M = uModel * uBone[int(aPart + 0.5)]; }
  gl_Position = uViewProj * M * vec4(aPos, 1.0);
}`;
const SHADOW_FS = GLSL_HEAD + `void main(){ }`;

const SKY_VS = GLSL_HEAD + `
layout(location=0) in vec2 aPos;
out vec2 vNdc;
void main(){ vNdc = aPos; gl_Position = vec4(aPos, 1.0, 1.0); }`;
const SKY_FS = GLSL_HEAD + GLSL_NOISE + GLSL_SHARED + `
uniform mat4 uInvViewProj;
in vec2 vNdc;
out vec4 outColor;
void main(){
  vec4 p = uInvViewProj * vec4(vNdc, 1.0, 1.0);
  vec3 dir = normalize(p.xyz / p.w - uCamPos);
  vec3 col = skyColor(dir);
  outColor = vec4(col, 1.0);
}`;

/* ----------------------------- view model ------------------------------ */
const VM_VS = GLSL_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aCol;
layout(location=3) in float aMat;
uniform mat4 uProj;
uniform mat4 uModel;
out vec3 vPos; out vec3 vNrm; out vec3 vCol; out float vMat;
void main(){
  vec4 p = uModel * vec4(aPos,1.0);
  vPos = p.xyz; vNrm = normalize(mat3(uModel) * aNrm); vCol = aCol; vMat = aMat;
  gl_Position = uProj * p;
}`;
const VM_FS = GLSL_HEAD + GLSL_NOISE + `
uniform vec3 uSunView;
uniform vec3 uSkyView;
uniform float uFlash;
in vec3 vPos; in vec3 vNrm; in vec3 vCol; in float vMat;
out vec4 outColor;
void main(){
  vec3 N = normalize(vNrm);
  vec3 V = normalize(-vPos);
  float m = vMat;
  vec3 base = vCol;
  float rough = 0.55, metal = 0.0;
  vec3 emit = vec3(0.0);
  if (m < 0.5) { base *= 0.9; rough = 0.5; }
  else if (m < 2.5) { base *= 0.9; rough = 0.75; }
  else if (m < 3.5) { base *= 0.9; rough = 0.35; metal = 0.2; }
  else if (m < 4.5) { base = vec3(0.08,0.028,0.012); rough = 0.85; }
  else if (m < 5.5) { base *= 0.85; rough = 0.3; metal = 0.85; }
  else if (m < 7.5) { rough = 0.85; }
  else if (m < 8.5) { base = vec3(0.22,0.34,0.4); rough = 0.07; }
  else if (m < 9.5) { emit = base * 2.2; base = vec3(0.02); rough = 0.3; }
  else if (m < 10.5) { emit = base * 2.2; base = vec3(0.02); }
  else if (m < 11.5) { emit = base * 2.2; base = vec3(0.02); }
  else { rough = 0.8; }
  // view-space key from upper-left (matches the world sun's screen direction)
  vec3 L = normalize(vec3(-0.55, 0.78, 0.42));
  float ndl = max(dot(N,L),0.0);
  vec3 H = normalize(L+V);
  float spec = pow(max(dot(N,H),0.0), mix(120.0,10.0,rough)) * (1.0-rough);
  vec3 amb = mix(vec3(0.10,0.115,0.14), uSkyView, N.y*0.5+0.5);
  vec3 col = base*(amb*0.95 + vec3(1.0,0.60,0.34)*ndl*1.25) + vec3(spec)*vec3(1.0,0.66,0.40)*(0.8+metal);
  float rim = pow(1.0 - max(dot(N,V),0.0), 3.0);
  col += vec3(0.34,0.30,0.26) * rim * 0.28;
  col += base * ndl * vec3(0.06,0.045,0.03);
  col += emit;
  // muzzle flash spill on the gun
  col += base * uFlash * vec3(2.2,1.2,0.5) * 0.7;
  outColor = vec4(col, 1.0);
}`;

/* ------------------------------- particles ----------------------------- */
const SNOW_VS = GLSL_HEAD + `
layout(location=0) in vec3 aSeed;
layout(location=1) in vec4 aParam;
uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform float uTime;
uniform float uPointScale;
out float vAlpha; out vec3 vTint;
void main(){
  vec3 p = aSeed;
  float speed = aParam.x;
  float ph = aParam.y;
  p.y = mod(p.y - uTime*speed, 17.0) - 0.6;
  p.x += sin(uTime*0.35 + ph)*1.3 + uTime*0.55;
  p.z += cos(uTime*0.28 + ph*1.7)*0.9 + uTime*0.22;
  // keep the flurry around the camera so the site is never snow-free
  p.x = uCamPos.x + mod(p.x - uCamPos.x + 18.0, 36.0) - 18.0;
  p.z = uCamPos.z + mod(p.z - uCamPos.z + 18.0, 36.0) - 18.0;
  vec4 vp = uViewProj * vec4(p,1.0);
  gl_Position = vp;
  float dist = length(p - uCamPos);
  gl_PointSize = clamp(uPointScale * aParam.z / max(dist,0.4), 1.2, 13.0);
  vAlpha = aParam.w * smoothstep(0.3,1.2,dist) * (1.0 - smoothstep(14.0,18.0,dist));
  vTint = vec3(0.86,0.92,1.0);
}`;
const SNOW_FS = GLSL_HEAD + `
in float vAlpha; in vec3 vTint;
out vec4 outColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.12, d) * vAlpha;
  outColor = vec4(vTint*0.9, a);
}`;

const SPARK_VS = GLSL_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aCol;
layout(location=2) in float aSize;
uniform mat4 uViewProj;
uniform float uPointScale;
out vec4 vCol;
void main(){
  gl_Position = uViewProj * vec4(aPos,1.0);
  gl_PointSize = clamp(uPointScale * aSize / max(gl_Position.w,0.2), 1.0, 64.0);
  vCol = aCol;
}`;
const SPARK_FS = GLSL_HEAD + `
in vec4 vCol; out vec4 outColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  outColor = vec4(vCol.rgb * a * vCol.a, a * vCol.a);
}`;

const RIBBON_VS = GLSL_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aCol;
uniform mat4 uViewProj;
out vec4 vCol;
void main(){ gl_Position = uViewProj * vec4(aPos,1.0); vCol = aCol; }`;
const RIBBON_FS = GLSL_HEAD + `
in vec4 vCol; out vec4 outColor;
void main(){ outColor = vCol; }`;

const SPRITE_VS = GLSL_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aCol;
layout(location=3) in float aKind;
uniform mat4 uViewProj;
out vec2 vUV; out vec4 vCol; out float vKind;
void main(){ gl_Position = uViewProj * vec4(aPos,1.0); vUV = aUV; vCol = aCol; vKind = aKind; }`;
const SPRITE_FS = GLSL_HEAD + GLSL_NOISE + `
in vec2 vUV; in vec4 vCol; in float vKind;
out vec4 outColor;
void main(){
  vec2 c = vUV*2.0-1.0;
  float r = length(c);
  float a = 0.0;
  if (vKind < 0.5) {                    // muzzle / glow
    a = smoothstep(1.0, 0.0, r);
    a *= a;
    float spikes = pow(max(0.0, 1.0 - abs(c.x)*4.0), 3.0) + pow(max(0.0, 1.0 - abs(c.y)*4.0), 3.0);
    a += spikes*0.5*smoothstep(1.0,0.0,r);
    a *= 0.9;
  } else if (vKind < 1.5) {             // smoke puff
    float n = fbm2(vUV*3.4 + vCol.a*13.0);
    a = smoothstep(0.5, 0.05, r) * (0.35 + 0.65*n);
  } else if (vKind < 2.5) {             // bullet hole
    float n = fbm2(vUV*6.0);
    a = smoothstep(0.55, 0.05, r) * (0.55+0.45*n);
    a *= smoothstep(0.0, 0.12, r*0.9 + 0.1);
  } else {                              // arc / energy
    a = smoothstep(1.0, 0.2, r);
  }
  outColor = vec4(vCol.rgb, a*vCol.a);
}`;

/* ------------------------------- decals -------------------------------- */
const DECAL_VS = GLSL_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aCol;
uniform mat4 uViewProj;
out vec2 vUV; out vec4 vCol;
void main(){ gl_Position = uViewProj * vec4(aPos,1.0); vUV = aUV; vCol = aCol; }`;
const DECAL_FS = GLSL_HEAD + GLSL_NOISE + `
in vec2 vUV; in vec4 vCol;
out vec4 outColor;
void main(){
  vec2 c = vUV*2.0-1.0;
  float r = length(c);
  float n = fbm2(vUV*7.0);
  float a = smoothstep(0.62, 0.18, r*1.0);
  outColor = vec4(vCol.rgb, a*vCol.a*(0.65+0.35*n));
}`;

/* --------------------------------- post -------------------------------- */
const FULL_VS = GLSL_HEAD + `
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main(){ vUV = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;

const BRIGHT_FS = GLSL_HEAD + `
uniform sampler2D uTex; uniform vec2 uTexel;
in vec2 vUV; out vec4 outColor;
void main(){
  vec3 c = texture(uTex, vUV + uTexel*vec2(-0.5,-0.5)).rgb;
  c += texture(uTex, vUV + uTexel*vec2( 0.5,-0.5)).rgb;
  c += texture(uTex, vUV + uTexel*vec2(-0.5, 0.5)).rgb;
  c += texture(uTex, vUV + uTexel*vec2( 0.5, 0.5)).rgb;
  c *= 0.25;
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  c *= smoothstep(1.05, 2.8, l);
  outColor = vec4(c, 1.0);
}`;

const BLUR_FS = GLSL_HEAD + `
uniform sampler2D uTex; uniform vec2 uDir; uniform vec2 uTexel;
in vec2 vUV; out vec4 outColor;
void main(){
  vec3 c = texture(uTex, vUV).rgb * 0.2270270270;
  c += texture(uTex, vUV + uTexel*uDir*1.3846153846).rgb * 0.3162162162;
  c += texture(uTex, vUV - uTexel*uDir*1.3846153846).rgb * 0.3162162162;
  c += texture(uTex, vUV + uTexel*uDir*3.2307692308).rgb * 0.0702702703;
  c += texture(uTex, vUV - uTexel*uDir*3.2307692308).rgb * 0.0702702703;
  outColor = vec4(c, 1.0);
}`;

const COMP_FS = GLSL_HEAD + `
uniform sampler2D uScene;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform float uExposure;
uniform float uBloom;
in vec2 vUV; out vec4 outColor;
vec3 aces(vec3 x){
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
}
void main(){
  vec3 hdr = texture(uScene, vUV).rgb;
  vec3 bloom = texture(uBloomA, vUV).rgb*0.62 + texture(uBloomB, vUV).rgb*0.38;
  hdr = hdr*uExposure + bloom*uBloom;
  vec3 t = aces(hdr);
  // gentle S-curve: keeps the mids alive but separates shadows from sunlit snow
  t = mix(t, t*t*(3.0 - 2.0*t), 0.48);
  outColor = vec4(t, 1.0);
}`;

const FXAA_FS = GLSL_HEAD + GLSL_NOISE + `
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uTime;
uniform float uGrain;
uniform float uVignette;
in vec2 vUV; out vec4 outColor;
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
void main(){
  vec3 rgbM = texture(uTex, vUV).rgb;
  vec3 rgbNW = texture(uTex, vUV + vec2(-1.0,-1.0)*uTexel).rgb;
  vec3 rgbNE = texture(uTex, vUV + vec2( 1.0,-1.0)*uTexel).rgb;
  vec3 rgbSW = texture(uTex, vUV + vec2(-1.0, 1.0)*uTexel).rgb;
  vec3 rgbSE = texture(uTex, vUV + vec2( 1.0, 1.0)*uTexel).rgb;
  float lNW=luma(rgbNW), lNE=luma(rgbNE), lSW=luma(rgbSW), lSE=luma(rgbSE), lM=luma(rgbM);
  float lMin = min(lM, min(min(lNW,lNE), min(lSW,lSE)));
  float lMax = max(lM, max(max(lNW,lNE), max(lSW,lSE)));
  float contrast = lMax - lMin;
  if (contrast > 0.055) {
    vec3 rgbN = 0.5*(texture(uTex, vUV + vec2(0.0,-1.0)*uTexel).rgb + texture(uTex, vUV + vec2(0.0,1.0)*uTexel).rgb);
    vec3 rgbS = 0.5*(texture(uTex, vUV + vec2(-1.0,0.0)*uTexel).rgb + texture(uTex, vUV + vec2(1.0,0.0)*uTexel).rgb);
    float lN=luma(rgbN), lS=luma(rgbS);
    vec3 rgbB = (lN+lS) < (lM*2.0) ? rgbN + rgbS : rgbM*2.0;
    float lB = luma(rgbB);
    float l1 = min(lM, min(lN,lS)), l2 = max(lM, max(lN,lS));
    float blend = abs((2.0*lB - lN - lS) / max(contrast, 1e-4));
    blend = clamp(blend*0.6, 0.0, 0.65);
    rgbM = mix(rgbM, rgbB*0.5, blend*step(0.03, contrast));
  }
  // grain + vignette + sRGB encode happen here, once
  float g = hash12(vUV*vec2(1733.0,977.0) + fract(uTime)*91.7) - 0.5;
  rgbM += g*uGrain;
  vec2 vc = vUV - 0.5;
  float vig = 1.0 - dot(vc,vc)*uVignette;
  rgbM *= clamp(vig, 0.0, 1.0);
  rgbM = pow(clamp(rgbM, 0.0, 1.0), vec3(1.0/2.2));
  outColor = vec4(rgbM, 1.0);
}`;


const COPY_FS = GLSL_HEAD + `
uniform sampler2D uTex; uniform vec2 uTexel;
in vec2 vUV; out vec4 outColor;
void main(){
  vec3 c = texture(uTex, vUV).rgb*0.25;
  c += texture(uTex, vUV + vec2( uTexel.x, 0.0)).rgb*0.1875;
  c += texture(uTex, vUV + vec2(-uTexel.x, 0.0)).rgb*0.1875;
  c += texture(uTex, vUV + vec2(0.0, uTexel.y)).rgb*0.1875;
  c += texture(uTex, vUV + vec2(0.0,-uTexel.y)).rgb*0.1875;
  outColor = vec4(c,1.0);
}`;

const SHADERS = {
  worldVS: WORLD_VS, worldFS: WORLD_FS,
  shadowVS: SHADOW_VS, shadowFS: SHADOW_FS,
  skyVS: SKY_VS, skyFS: SKY_FS,
  vmVS: VM_VS, vmFS: VM_FS,
  snowVS: SNOW_VS, snowFS: SNOW_FS,
  sparkVS: SPARK_VS, sparkFS: SPARK_FS,
  ribbonVS: RIBBON_VS, ribbonFS: RIBBON_FS,
  spriteVS: SPRITE_VS, spriteFS: SPRITE_FS,
  decalVS: DECAL_VS, decalFS: DECAL_FS,
  fullVS: FULL_VS, brightFS: BRIGHT_FS, blurFS: BLUR_FS, compFS: COMP_FS, fxaaFS: FXAA_FS, copyFS: COPY_FS
};
