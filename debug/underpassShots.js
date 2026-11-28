// THE UNDERPASS'S LOOK SHOTS (claude/underpass1 round 2): both street ends, the kiosks close, the corridor both ways, the
// mural, the signs, both stairs, saved through the tour server (node tools/tour/serve.mjs ... --out <dir>: <dir>/<run>/).
//   open /viewer/index.html?quick=1&at=-1202.0,839.4,1.7&look=-1196.9,852.0,1.2&radius=250&quality=native&rscale=1&dynres=0
//        &still=1&xmas=0&time=golden (or night)&panel=0   in a FRONT tab, sound off; then
//   await (await import('/debug/underpassShots.js')).run('underpass2-after', 'day_')
const SHOTS = {
  east: [-1202.0, 54.6, 839.4, -1196.9, 54.1, 852.0], west: [-1219.5, 52.7, 883.5, -1212.4, 52.6, 875.2],
  eastClose: [-1202.6, 54.5, 845.6, -1197.6, 54.2, 851.8], westClose: [-1214.5, 52.6, 881.6, -1211.6, 52.5, 877.6],
};
const INSIDE = {     // (u, w, h) in the model's frame (models/underpass/calevoet.json frame)
  insideE: [20, -0.26, 50.0, -3, -0.26, 49.9], insideW: [0, -0.26, 50.0, 23, -0.26, 49.9], mural: [12, -1.0, 49.9, 12, 1.039, 49.6],
  signs: [10.2, -1.2, 50.1, 10.2, 1.039, 50.45], stairE: [-1.96, 9.8, 53.9, -1.96, 1.0, 49.5], stairW: [22.49, -7.6, 52.4, 22.49, -1.0, 49.4],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function run(runName, prefix = "day_", { only = null, waitMs = 2800 } = {}) {
  for (let i = 0; i < 40 && !(window.__quickReady && window.__underpass?.inside?.state?.cell); i++) await sleep(2000);
  const v = window.viewer, U = window.__underpass, F = U.notes.frame;
  U.inside.force = true;
  const uw = (u, w) => [F.origin_city[0] + F.u[0] * u + F.w[0] * w, F.origin_city[1] + F.u[1] * u + F.w[1] * w];
  const cam = (x, y, z, tx, ty, tz) => { v.camera.position.set(x, y, z); v.controls.target.set(tx, ty, tz); v.controls.update?.(); v.camera.lookAt(tx, ty, tz); };
  const snap = async (name) => {
    const c = v.renderer.domElement, out = new OffscreenCanvas(1280, 720), g = out.getContext("2d");
    g.imageSmoothingQuality = "high"; v.renderFrame(); g.drawImage(c, 0, 0, 1280, 720);
    const r = await fetch(`/__tour/save?run=${runName}&name=${name}`, { method: "POST", body: await out.convertToBlob({ type: "image/png" }) });
    return r.status;
  };
  const res = {};
  for (const [k, a] of Object.entries(SHOTS)) { if (only && !only.includes(k)) continue; cam(...a); await sleep(waitMs); res[k] = await snap(`${prefix}${k}.png`); }
  for (const [k, a] of Object.entries(INSIDE)) {
    if (only && !only.includes(k)) continue;
    const [x, z] = uw(a[0], a[1]), [tx, tz] = uw(a[3], a[4]); cam(x, a[2], z, tx, a[5], tz); await sleep(waitMs); res[k] = await snap(`${prefix}${k}.png`);
  }
  return res;
}
