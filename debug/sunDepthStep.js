// SUN SHADOW DEPTH STEP CHECK (claude/renders, docs/rules/renders-per-frame.md, lighting.js DEPTH_STEP): the cache laid
// back after the light's depth step (the depth offset in the lay-back quad) must give the same shadow map as a full
// redraw at the new depth. The loop is paused, nothing moves (step(0)):
//   A = a full redraw at the light's real depth, then one lay-back frame;
//   B = a full redraw with the light SUN_QZ metres off along the sun, then the light put back: one lay-back frame with
//       the step offset;
//   C = as B with the offset forced to 0 (what the step would draw without the fix: wrong everywhere).
//   N = a second full redraw with no step: the noise floor (the trees' wind moves their leaves between frames).
// The map is sampled on a 1024 x 1024 grid. Pass: B is as close to A as N is (texels off by > 1e-5 of the depth range,
// within 0.1 % of N's share), while C is not (so the check can fail).
//   const D = await import("/debug/sunDepthStep.js"); await D.run()
export async function run({ grid = 1024 } = {}) {
  const V = window.viewer, Lg = V.lighting, sn = Lg.shadowNode;
  const THREE = await import("three/webgpu"), T = await import("three/tsl");
  const L = await import("/viewer/lighting.js");
  if (!L.DEPTH_STEP) return { skipped: "?sundepthstep=old" };
  const R = V.renderer;
  V.pause(true);
  const upd = Lg.update;
  let off = 0, forceZero = false;
  Lg.update = function (...a) { const r = upd.apply(this, a); if (off) this.sun.position.addScaledVector(this._lz, off); return r; };
  const rt = new THREE.RenderTarget(grid, grid, { type: THREE.FloatType, format: THREE.RedFormat, depthBuffer: false });
  const read = async () => {
    const map = sn.shadowMap.depthTexture, W = map.image.width;
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = T.vec4(T.float(T.textureLoad(map, T.ivec2(T.screenCoordinate.xy.mul(W / grid)))), 0, 0, 1);
    const q = new THREE.QuadMesh(m);
    const prev = R.getRenderTarget();
    R.setRenderTarget(rt); q.render(R); R.setRenderTarget(prev);
    const px = await R.readRenderTargetPixelsAsync(rt, 0, 0, grid, grid);
    m.dispose();
    return Float32Array.from(px);
  };
  const frames = async (n) => { for (let i = 0; i < n; i++) { V.step(0); await new Promise((r) => requestAnimationFrame(r)); } };
  // (the blit's dz uniform forced to 0 for C: set after renderShadow writes it, before the quad draws: wrap the blit's render)
  const B0 = sn.blitQuad(), qr = B0.quad.render.bind(B0.quad);
  B0.quad.render = (r) => { if (forceZero) B0.dz.value = 0; return qr(r); };
  try {
    off = 0; L.sunCache.dirty = true; await frames(2);
    const A = await read();
    off = -L.SUN_QZ; L.sunCache.dirty = true; await frames(1);
    off = 0; await frames(1);
    const stepped = sn.blit.dz.value;          // (the offset the lay-back used: non-zero)
    const B = await read();
    off = -L.SUN_QZ; L.sunCache.dirty = true; await frames(1);
    off = 0; forceZero = true; await frames(1); forceZero = false;
    const C = await read();
    off = 0; L.sunCache.dirty = true; await frames(2);
    const N = await read();                    // the noise floor: a second full redraw, no step (tree wind moves between frames)
    const cmp = (X) => { let bad = 0, n = 0, worst = 0; for (let i = 0; i < A.length; i++) { const a = A[i]; if (a === 0 || a === 1) continue; n++; const d = Math.abs(X[i] - a); if (d > 1e-5) bad++; if (d > worst) worst = d; } return { casterTexels: n, off: bad, share: +(bad / Math.max(1, n)).toFixed(5), worst: +worst.toExponential(2) }; };
    const b = cmp(B), c = cmp(C), n = cmp(N);
    return { dz: stepped, B: b, C: c, noise: n, pass: b.share <= n.share + 0.001 && c.share > 0.5 };
  } finally {
    Lg.update = upd; B0.quad.render = qr; L.sunCache.dirty = true; rt.dispose(); V.pause(false);
  }
}
