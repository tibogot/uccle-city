// THE POP METER of docs/SMOOTH_LOD.md, in the city page (evaluate it; window.__popArgs = { from, to, steps, view, target }
// optional): the VIEW stays put, the LOD eye (viewer.stateAt: every LOD, fade and the kit's re-bucket) walks from
// `from` to `to` in `steps` steps; after each step one frame is rendered and read back; the score of a step is the
// share of pixels whose largest channel changed by more than 40/255. A pop = a step much larger than its neighbours.
// Returns { scores, maxJump (max of score - mean of its two neighbours), over15 (steps with a jump > 1.5 %) }.
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (!window.viewer) await sleep(250);
  const v = window.viewer;
  await v.loading; await sleep(3000);
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
  const a = Object.assign({ from: [1222, 82, 860], to: [1222, 82, 660], steps: 50, view: [1219, 88, 735], target: [1225, 83, 650] }, window.__popArgs || {});
  v.camera.position.set(...a.view); v.controls.target.set(...a.target); v.controls.update();
  await sleep(1500);
  v.freeze(true);
  const cv = v.renderer.domElement, W = 480, H = Math.round(480 * cv.height / cv.width);
  const c2 = new OffscreenCanvas(W, H), x2 = c2.getContext("2d", { willReadFrequently: true });
  const P = new (v.camera.position.constructor)();
  let prev = null;
  const scores = [];
  for (let i = 0; i <= a.steps; i++) {
    const t = i / a.steps;
    P.set(a.from[0] + (a.to[0] - a.from[0]) * t, a.from[1] + (a.to[1] - a.from[1]) * t, a.from[2] + (a.to[2] - a.from[2]) * t);
    for (let k = 0; k < 3; k++) { v.stateAt(P); v.renderFrame(); await new Promise((r) => requestAnimationFrame(r)); }   // fades settle (tile code, rebucket)
    v.stateAt(P); v.renderFrame();
    x2.drawImage(cv, 0, 0, W, H);
    const d = x2.getImageData(0, 0, W, H).data;
    if (prev) {
      let n = 0;
      for (let p = 0; p < d.length; p += 4) if (Math.max(Math.abs(d[p] - prev[p]), Math.abs(d[p + 1] - prev[p + 1]), Math.abs(d[p + 2] - prev[p + 2])) > 40) n++;
      scores.push(+(100 * n / (W * H)).toFixed(3));
    }
    prev = d;
  }
  v.freeze(false);
  let maxJump = 0, over15 = 0;
  for (let i = 0; i < scores.length; i++) {
    const nb = [scores[i - 1], scores[i + 1]].filter((q) => q !== undefined);
    const j = scores[i] - nb.reduce((s, q) => s + q, 0) / nb.length;
    maxJump = Math.max(maxJump, j); if (j > 1.5) over15++;
  }
  return { maxJump: +maxJump.toFixed(3), over15, mean: +(scores.reduce((s, q) => s + q, 0) / scores.length).toFixed(3), scores };
}
