// THE LOADING SCENE'S RENDERER (viewer/loader/loader.js starts it): a slow aerial flight over the REAL Uccle while the
// city prepares, drawn in this worker on its own OffscreenCanvas with its own small WebGPU device, so the main thread's
// boot work (node builds, tile landing: long tasks by design under the cover) never freezes it.
//
// Data: the horizon ring's files (data/horizon/, docs/HORIZON.md: the 20 m DTM of the region simplified to 105 k
// triangles, 1.8 MB, and the 5 m/px orthophoto mosaic of the city + 1 km, 0.87 MB), the same real data the city's
// horizon uses; nothing invented. One draw for the ground, one for the sky; no shadows, no post (a filmic curve).
// The flight orbits the start view's target and closes in on the start camera; land(pose) flies to the city's real
// first camera, so the page can cross-fade from this view to the same view in full detail (no pop).
//
// Messages in: { type: "init", canvas, w, h, base, tile, look, fov } | { type: "resize", w, h } |
//   { type: "land", pose: { p: [x, y, z], t: [x, y, z], fov } } | { type: "stop" }
// Messages out: { type: "ready", ms, tris } | { type: "landed" } | { type: "fail", error } | { type: "fps", fps }

const TILE = 500, I0 = -6, J0 = -4;           // the tile grid (pipeline/common.py; viewer/horizon.js)
const DROP = 0.6;                              // m under the DTM, as the city's horizon ring
let device = null, ctx = null, format = "bgra8unorm", canvas = null;
let W = 1, H = 1, msaaTex = null, depthTex = null;
let pipeT = null, pipeS = null, bindT = null, bindS = null, ubo = null, vbuf = null, ibuf = null, nIdx = 0;
const U = new Float32Array(64);               // the uniform block (see WGSL struct U: 16 vec4s)
let look = null, fov = 55, running = false, t0 = 0, tFirst = 0;
let centre = [1250, 100, 750];                 // the start view's target (x, y, z), from the tile name until land()
let final = null, land = null, frames = 0, fpsT = 0;
let groundAt = null;

const lin = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255].map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "init") await init(m);
    else if (m.type === "resize") { W = Math.max(1, m.w); H = Math.max(1, m.h); if (canvas) { canvas.width = W; canvas.height = H; } makeTargets(); }
    else if (m.type === "land") startLanding(m.pose);
    else if (m.type === "stop") { running = false; try { device?.destroy(); } catch { /* gone */ } self.close(); }
  } catch (err) { self.postMessage({ type: "fail", error: String(err?.message || err) }); }
};

async function init(m) {
  const tStart = performance.now();
  canvas = m.canvas; W = Math.max(1, m.w); H = Math.max(1, m.h); canvas.width = W; canvas.height = H;
  look = m.look; fov = m.fov || 55;
  // the start tile's centre (main.js: the overview looks at the start tile's centre)
  const mt = /^([A-Z])(\d+)$/.exec(m.tile || "I6");
  if (mt) centre = [(mt[1].charCodeAt(0) - 65 + I0) * TILE + TILE / 2, 100, (+mt[2] - 1 + J0) * TILE + TILE / 2];
  if (!navigator.gpu) throw new Error("no WebGPU in workers");
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) throw new Error("no adapter");
  device = await adapter.requestDevice();
  format = navigator.gpu.getPreferredCanvasFormat();
  ctx = canvas.getContext("webgpu");
  ctx.configure({ device, format, alphaMode: "opaque" });
  const base = m.base;
  const [hdr, bin, img] = await Promise.all([
    fetch(new URL("horizon/heights.json", base)).then((r) => r.json()),
    fetch(new URL("horizon/horizon.bin", base)).then((r) => { if (!r.ok) throw new Error(`horizon.bin ${r.status}`); return r.arrayBuffer(); }),
    fetch(new URL("horizon/colour_inner.jpg", base)).then((r) => r.blob()).then((b) => createImageBitmap(b)),
  ]);
  const tris = buildMesh(bin);
  const meanAlb = buildTexture(img);
  buildPipelines(hdr.inner, meanAlb);
  makeTargets();
  centre[1] = groundAt(centre[0], centre[2]);
  running = true; t0 = performance.now();
  self.postMessage({ type: "ready", ms: Math.round(performance.now() - tStart), tris });
  self.requestAnimationFrame(frame);
}

function buildMesh(bin) {
  const dv = new DataView(bin);
  if (dv.getUint32(0, true) !== 0x314e5a48) throw new Error("horizon.bin: bad magic");
  const V = dv.getUint32(4, true), T = dv.getUint32(8, true);
  const x0 = dv.getFloat32(12, true), z0 = dv.getFloat32(16, true), step = dv.getFloat32(20, true), hb = dv.getFloat32(24, true);
  const v = new Float32Array(V * 6);
  // a coarse height lookup for the camera (nearest vertex in a 100 m bucket grid)
  const B = 100, buckets = new Map();
  for (let i = 0, p = 28; i < V; i++, p += 10) {
    const x = x0 + dv.getUint16(p, true) * step, z = z0 + dv.getUint16(p + 2, true) * step, y = dv.getUint16(p + 4, true) / 100 + hb - DROP;
    const nx = dv.getInt8(p + 6) / 127, nz = dv.getInt8(p + 7) / 127;
    v.set([x, y, z, nx, Math.sqrt(Math.max(0, 1 - nx * nx - nz * nz)), nz], i * 6);
    const k = `${Math.floor(x / B)},${Math.floor(z / B)}`;
    let a = buckets.get(k); if (!a) buckets.set(k, (a = [])); a.push(i);
  }
  groundAt = (x, z) => {
    let best = 1e18, y = 100;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      for (const i of buckets.get(`${Math.floor(x / B) + di},${Math.floor(z / B) + dj}`) || []) {
        const d = (v[i * 6] - x) ** 2 + (v[i * 6 + 2] - z) ** 2;
        if (d < best) { best = d; y = v[i * 6 + 1]; }
      }
    }
    return y + DROP;
  };
  const idx = new Uint32Array(bin, 28 + V * 10, T * 3);
  vbuf = device.createBuffer({ size: v.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(vbuf, 0, v);
  ibuf = device.createBuffer({ size: idx.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(ibuf, 0, idx.slice());
  nIdx = T * 3;
  return T;
}

let tex = null, sampler = null;
/** the orthophoto with a full mip chain (each level a high-quality downscale of the photo: no shimmer from the air) */
function buildTexture(img) {
  const levels = Math.floor(Math.log2(Math.max(img.width, img.height))) + 1;
  tex = device.createTexture({ size: [img.width, img.height], format: "rgba8unorm-srgb", mipLevelCount: levels,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
  let mean = [0.2, 0.22, 0.16];
  for (let l = 0; l < levels; l++) {
    const w = Math.max(1, img.width >> l), h = Math.max(1, img.height >> l);
    if (l === 0) { device.queue.copyExternalImageToTexture({ source: img }, { texture: tex, mipLevel: 0 }, [w, h]); continue; }
    const c = new OffscreenCanvas(w, h), x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(img, 0, 0, w, h);
    device.queue.copyExternalImageToTexture({ source: c }, { texture: tex, mipLevel: l }, [w, h]);
    if (l === levels - 1) { const d = x.getImageData(0, 0, 1, 1).data; mean = lin((d[0] << 16) | (d[1] << 8) | d[2]); }
  }
  sampler = device.createSampler({ magFilter: "linear", minFilter: "linear", mipmapFilter: "linear", maxAnisotropy: 8, addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
  img.close?.();
  return mean;
}

const WGSL = /* wgsl */`
struct U {
  viewProj: mat4x4f,
  eye: vec4f,        // xyz, fog density
  sunDir: vec4f,     // xyz, exposure
  sunCol: vec4f,     // rgb x intensity / pi
  hemiSky: vec4f,    // rgb x intensity / pi
  hemiGround: vec4f,
  skyTop: vec4f,
  skyHor: vec4f,
  camR: vec4f,       // xyz, tan(fov / 2) x aspect
  camU: vec4f,       // xyz, tan(fov / 2)
  camF: vec4f,
  box: vec4f,        // the photo: x0 z0 x1 z1
  meanAlb: vec4f,    // the photo's mean colour (beyond it)
};
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var photo: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

// Narkowicz's ACES fit, then the sRGB curve (the canvas is a plain unorm format)
fn toneOut(c: vec3f) -> vec4f {
  let x = c * u.sunDir.w;
  let t = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
  let s = select(1.055 * pow(t, vec3f(1.0 / 2.4)) - 0.055, t * 12.92, t <= vec3f(0.0031308));
  return vec4f(s, 1.0);
}
fn skyColour(d: vec3f) -> vec3f {
  let y = clamp(d.y, 0.0, 1.0);
  var c = mix(u.skyHor.rgb, u.skyTop.rgb, pow(y, 0.55));
  let s = max(dot(d, normalize(u.sunDir.xyz)), 0.0);
  c += u.sunCol.rgb * (0.004 * pow(s, 600.0) + 0.012 * pow(s, 24.0));
  c += u.skyHor.rgb * 0.18 * pow(s, 6.0);
  return c;
}
fn hazeColour(d: vec3f) -> vec3f { return skyColour(normalize(vec3f(d.x, 0.04, d.z))); }

struct VOut { @builtin(position) pos: vec4f, @location(0) w: vec3f, @location(1) n: vec3f };
@vertex fn vsT(@location(0) p: vec3f, @location(1) n: vec3f) -> VOut {
  var o: VOut; o.pos = u.viewProj * vec4f(p, 1.0); o.w = p; o.n = n; return o;
}
@fragment fn fsT(i: VOut) -> @location(0) vec4f {
  let b = u.box;
  let uv = vec2f((i.w.x - b.x) / (b.z - b.x), 1.0 - (i.w.z - b.y) / (b.w - b.y));
  var alb = textureSample(photo, samp, clamp(uv, vec2f(0.0), vec2f(1.0))).rgb;
  let edge = min(min(i.w.x - b.x, b.z - i.w.x), min(i.w.z - b.y, b.w - i.w.z));
  alb = mix(u.meanAlb.rgb, alb, smoothstep(0.0, 300.0, edge));
  let n = normalize(i.n);
  let sun = max(dot(n, normalize(u.sunDir.xyz)), 0.0);
  let amb = mix(u.hemiGround.rgb, u.hemiSky.rgb, n.y * 0.5 + 0.5);
  var c = alb * (u.sunCol.rgb * sun + amb);
  let v = i.w - u.eye.xyz;
  let d = length(v);
  let f = 1.0 - exp(-d * u.eye.w);
  c = mix(c, hazeColour(v / d), f);
  return toneOut(c);
}
struct SOut { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };
@vertex fn vsS(@builtin(vertex_index) k: u32) -> SOut {
  let p = vec2f(f32((k << 1u) & 2u), f32(k & 2u)) * 2.0 - 1.0;
  var o: SOut; o.pos = vec4f(p, 1.0, 1.0); o.ndc = p; return o;
}
@fragment fn fsS(i: SOut) -> @location(0) vec4f {
  let d = normalize(u.camF.xyz + u.camR.xyz * (i.ndc.x * u.camR.w) + u.camU.xyz * (i.ndc.y * u.camU.w));
  return toneOut(skyColour(d));
}`;

function buildPipelines(inner, meanAlb) {
  ubo = device.createBuffer({ size: U.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const mod = device.createShaderModule({ code: WGSL });
  const layout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
  ] });
  const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  const ms = { count: 4 };
  pipeT = device.createRenderPipeline({ layout: pl, multisample: ms,
    vertex: { module: mod, entryPoint: "vsT", buffers: [{ arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }, { shaderLocation: 1, offset: 12, format: "float32x3" }] }] },
    fragment: { module: mod, entryPoint: "fsT", targets: [{ format }] },
    primitive: { topology: "triangle-list", cullMode: "none" },
    depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" } });
  pipeS = device.createRenderPipeline({ layout: pl, multisample: ms,
    vertex: { module: mod, entryPoint: "vsS" }, fragment: { module: mod, entryPoint: "fsS", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
    depthStencil: { format: "depth24plus", depthWriteEnabled: false, depthCompare: "less-equal" } });
  bindT = device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: tex.createView() }, { binding: 2, resource: sampler }] });
  bindS = bindT;
  // the look: the city's lighting preset (viewer/lighting.js PRESETS), the intensities as three's lights give them
  const L = look, k = 1 / Math.PI;
  const sun = L.sunDir, sc = lin(L.sunColor), hs = lin(L.hemiSky), hg = lin(L.hemiGround), st = lin(L.skyTop), sh = lin(L.skyHorizon);
  U.set([sun[0], sun[1], sun[2], L.exposure ?? 0.85], 20);
  U.set([sc[0] * L.sunIntensity * k, sc[1] * L.sunIntensity * k, sc[2] * L.sunIntensity * k, 0], 24);
  U.set([hs[0] * L.hemiIntensity * k, hs[1] * L.hemiIntensity * k, hs[2] * L.hemiIntensity * k, 0], 28);
  U.set([hg[0] * L.hemiIntensity * k, hg[1] * L.hemiIntensity * k, hg[2] * L.hemiIntensity * k, 0], 32);
  U.set([...st.map((c) => c * (L.skyGain ?? 1)), 0], 36);
  U.set([...sh.map((c) => c * (L.skyGain ?? 1)), 0], 40);
  U.set([inner.x0, inner.z0, inner.x1, inner.z1], 56);
  U.set([...meanAlb, 0], 60);
  U[19] = L.fogDensity * (L.fogGain ?? 0.35);
}

function makeTargets() {
  if (!device) return;
  msaaTex?.destroy(); depthTex?.destroy();
  msaaTex = device.createTexture({ size: [W, H], sampleCount: 4, format, usage: GPUTextureUsage.RENDER_ATTACHMENT });
  depthTex = device.createTexture({ size: [W, H], sampleCount: 4, format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
}

// ---------------------------------------------------------------- the camera: an orbit closing in, then the landing
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);

// main.js's overview camera: (cx - 330, cy + 300, cz + 400) looking at (cx, cy, cz)
const OV = [-330, 300, 400];
function orbitPose(t) {
  const azF = Math.atan2(OV[2], OV[0]), rF = Math.hypot(OV[0], OV[2]);
  const k = Math.exp(-t / 16);
  const az = azF - 0.75 * k - 0.012 * t;                 // a slow turn (~1 degree a second) that settles on the start view's bearing
  const r = rF + 1500 * k, h = OV[1] + 650 * k;
  const c = centre;
  const ground = groundAt ? groundAt(c[0] + Math.cos(az) * r, c[2] + Math.sin(az) * r) : c[1];
  const p = [c[0] + Math.cos(az) * r, Math.max(c[1] + h, ground + 120), c[2] + Math.sin(az) * r];
  return { p, t: [c[0], c[1] + 40 * k, c[2]], fov };
}
function startLanding(pose) {
  final = { p: pose.p, t: pose.t, fov: pose.fov || fov };
  centre = pose.t.slice();
  const now = performance.now();
  const from = land ? poseAt(now) : orbitPose((now - t0) / 1000);
  const dist = Math.hypot(...sub(from.p, final.p));
  land = { from, t0: now, dur: Math.min(2600, Math.max(900, dist * 1.3)), done: false };
}
function poseAt(now) {
  if (!land) return orbitPose((now - t0) / 1000);
  const a = Math.min(1, (now - land.t0) / land.dur), e = ease(a);
  if (a >= 1 && !land.done) { land.done = true; self.postMessage({ type: "landed" }); }
  // the position along a gentle arc (no straight dive through the ground), the target straight
  const p = mix3(land.from.p, final.p, e);
  p[1] += Math.sin(Math.PI * e) * 0.15 * Math.hypot(...sub(land.from.p, final.p)) * (1 - a);
  return { p, t: mix3(land.from.t, final.t, e), fov: land.from.fov + (final.fov - land.from.fov) * e };
}

function frame(now) {
  if (!running) return;
  self.requestAnimationFrame(frame);
  if (!tFirst) tFirst = now;
  const pose = poseAt(performance.now());
  const aspect = W / H, near = 2, far = 40000;
  const f = 1 / Math.tan((pose.fov * Math.PI) / 360);
  const F = norm(sub(pose.t, pose.p)), R = norm(cross(F, [0, 1, 0])), Up = cross(R, F);
  // view (column-major lookAt) x projection (WebGPU depth 0..1)
  const e = pose.p;
  const V = [R[0], Up[0], -F[0], 0, R[1], Up[1], -F[1], 0, R[2], Up[2], -F[2], 0,
    -(R[0] * e[0] + R[1] * e[1] + R[2] * e[2]), -(Up[0] * e[0] + Up[1] * e[1] + Up[2] * e[2]), F[0] * e[0] + F[1] * e[1] + F[2] * e[2], 1];
  const P = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, far / (near - far), -1, 0, 0, (near * far) / (near - far), 0];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += P[k * 4 + r] * V[c * 4 + k];
    U[c * 4 + r] = s;
  }
  U.set([e[0], e[1], e[2]], 16);
  const th = 1 / f;
  U.set([R[0], R[1], R[2], th * aspect], 44);
  U.set([Up[0], Up[1], Up[2], th], 48);
  U.set([F[0], F[1], F[2], 0], 52);
  device.queue.writeBuffer(ubo, 0, U);
  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({
    colorAttachments: [{ view: msaaTex.createView(), resolveTarget: ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "discard", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
    depthStencilAttachment: { view: depthTex.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "discard" },
  });
  pass.setPipeline(pipeT); pass.setBindGroup(0, bindT);
  pass.setVertexBuffer(0, vbuf); pass.setIndexBuffer(ibuf, "uint32");
  pass.drawIndexed(nIdx);
  pass.setPipeline(pipeS); pass.setBindGroup(0, bindS); pass.draw(3);
  pass.end();
  device.queue.submit([enc.finish()]);
  frames++;
  if (now - fpsT > 2000) { if (fpsT) self.postMessage({ type: "fps", fps: Math.round((frames * 1000) / (now - fpsT)) }); fpsT = now; frames = 0; }
}
