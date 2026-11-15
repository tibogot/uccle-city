// THE LOADING SCREEN'S STILLS (docs/BOOT.md): renders a view of the city itself at high quality (supersampled) and
// hands back a PNG blob, for viewer/loader/stills/ (tools/loader_stills.py then resizes + encodes AVIF / JPG).
// Boot the city on the view's tile with the far ring, let it stream, then in the console:
//   const S = await import("/debug/loaderShots.js");
//   const blob = await S.shot(S.VIEWS[0]);            // or { p: [x, h, z], t: [x, h, z], fov } (h over the ground)
//   await S.save(blob, "http://127.0.0.1:8887/stjob.png")   // a local receiver (POST body -> file), or S.download(blob, name)
// The views (city metres, x east / z south; heights over the drawn ground), golden hour (?time=golden, the default):
export const VIEWS = [
  // Place Saint-Job and the church from the south-east, low sun behind the camera: the loader's first image
  { id: "stjob", tile: "I6", p: [1262, 62, 700], t: [1180, 8, 556], fov: 50 },
  // the Royal Observatory's domes over the trees
  { id: "observatory", tile: "H5", p: [520, 85, 245], t: [650, 8, 80], fov: 48 },
  // the town hall (Place Jean Vander Elst) from the south-east
  { id: "townhall", tile: "D3", p: [-1050, 55, -395], t: [-1150, 12, -505], fov: 50 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** frames the view, waits for streaming to settle (no tile pending, the far LOD done), renders at `scale` x the
 *  window's pixels and returns a PNG blob of `w` x `h` (the centre crop of the render, downsampled: supersampling) */
export async function shot(v, { w = 2400, h = 1350, settleMs = 12000, scale = null } = {}) {
  const V = window.viewer, cam = V.camera, c = V.controls;
  document.querySelectorAll("body > div").forEach((d) => { if (!d.querySelector("canvas")) d.style.visibility = "hidden"; });
  document.querySelectorAll(".upanel, .umap-mini, .umap-toggle, .ukeys, #credits").forEach((d) => { d.style.visibility = "hidden"; });
  const g = (x, z) => { try { return V.world.surface(x, z); } catch { return 0; } };
  const place = () => {
    c.target.set(v.t[0], g(v.t[0], v.t[2]) + v.t[1], v.t[2]);
    cam.position.set(v.p[0], g(v.p[0], v.p[2]) + v.p[1], v.p[2]);
    if (v.fov) { cam.fov = v.fov; cam.updateProjectionMatrix(); }
    c.update(); cam.lookAt(c.target); cam.updateMatrixWorld(true);
  };
  place();
  // streaming follows the camera: wait, re-placing (ground heights change as full tiles replace far ones)
  for (let t = 0; t < settleMs; t += 1000) { await sleep(1000); place(); }
  const pr0 = V.renderer.getPixelRatio();
  const k = scale ?? Math.max(1, (w * 1.6) / innerWidth);            // ~1.6x supersampling of the output width
  V.renderer.setPixelRatio(k);
  dispatchEvent(new Event("resize"));
  V.pause(true);
  try {
    for (let i = 0; i < 40; i++) { V.renderFrame(); await sleep(20); }  // LOD fades, shadows, auto exposure settle
    V.renderFrame();
    const src = V.renderer.domElement;
    const c2 = new OffscreenCanvas(w, h), x2 = c2.getContext("2d");
    x2.imageSmoothingEnabled = true; x2.imageSmoothingQuality = "high";
    // centre crop at the output aspect
    const a = w / h, sw = Math.min(src.width, src.height * a), sh = sw / a;
    x2.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h);
    return await c2.convertToBlob({ type: "image/png" });
  } finally {
    V.renderer.setPixelRatio(pr0);
    dispatchEvent(new Event("resize"));
    V.pause(false);
  }
}

export async function save(blob, url) { const r = await fetch(url, { method: "POST", body: blob }); return r.ok; }
export function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
