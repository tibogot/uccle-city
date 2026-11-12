// COPIED AS-IS from branch claude/stalle (labs/flickerTest.js, eebd3d6) for the Impostor Lab's jitter meter
// (labs/jitterMeter.js builds on its flip rule). Keep in sync by hand until claude/stalle is merged.
// THE FLICKER TEST (shared by the labs; the runtime half of the mesh audit, tools/mesh_audit/README.md).
// Renders N consecutive frames from a camera that is FIXED or moves very slowly (sub-pixel steps: dolly / strafe /
// orbit), with the lab's animation frozen, and diffs consecutive frames: a pixel "blinks" when its luminance jumps up
// then down (or down then up) by more than `threshold` between frames, again and again. Smooth surfaces and edges under
// a sub-pixel move change a little and in one direction; z-fighting, shadow acne, sparkle and unstable post effects
// flip back and forth. Output: the blinking pixels (count, share), the worst clusters (screen boxes), and a heat map
// (the last frame dimmed, the blink count in red) shown over the page for a screenshot.
//
//   import { flickerTest, showHeat } from "./flickerTest.js";
//   const r = await flickerTest({ renderFrame, canvas, camera, controls, frames: 24, move: "strafe", step: 0.0006 });
//   showHeat(r);    // an overlay <img> (click to close); r.heatURL is the PNG
// renderFrame(): renders ONE frame synchronously with the lab's time frozen (dt = 0).

const lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

export async function flickerTest({ renderFrame, canvas, camera, controls = null, frames = 24, move = "fixed", step = 0.0006, threshold = 0.06, minFlips = 2, settle = 3, region = null }) {
  const W = canvas.width, H = canvas.height;
  const c2 = new OffscreenCanvas(W, H), x2 = c2.getContext("2d", { willReadFrequently: true });
  const p0 = camera.position.clone(), t0 = controls ? controls.target.clone() : null, q0 = camera.quaternion.clone();
  const fwd = camera.getWorldDirection(camera.position.clone().set(0, 0, 0)).clone();
  const right = fwd.clone().cross(camera.up).normalize(), up = right.clone().cross(fwd).normalize();
  const dir = move === "dolly" ? fwd : move === "strafe" ? right : move === "rise" ? up : null;
  let prev = null, prevD = null;
  const flips = new Uint16Array(W * H), amp = new Float32Array(W * H);
  let last = null;
  const pose = (f) => {
    if (move === "orbit" && controls) {
      const a = step * f, c = Math.cos(a), s = Math.sin(a), o = p0.clone().sub(t0);
      camera.position.set(t0.x + o.x * c - o.z * s, p0.y, t0.z + o.x * s + o.z * c); camera.lookAt(t0);
    } else if (dir) { camera.position.copy(p0).addScaledVector(dir, step * f); camera.quaternion.copy(q0); }
    else { camera.position.copy(p0); camera.quaternion.copy(q0); }
    camera.updateMatrixWorld(true);
  };
  for (let f = -settle; f < frames; f++) {
    pose(Math.max(0, f));
    renderFrame();
    x2.drawImage(canvas, 0, 0);                       // same task as the render: the WebGPU canvas is still readable
    if (f < 0) { await new Promise((r) => setTimeout(r, 30)); continue; }
    const d = x2.getImageData(0, 0, W, H).data;
    const L = new Float32Array(W * H);
    for (let i = 0, j = 0; j < L.length; i += 4, j++) L[j] = lum(d, i);
    if (prev) {
      const D = new Float32Array(W * H);
      for (let j = 0; j < L.length; j++) {
        const dd = L[j] - prev[j]; D[j] = dd;
        if (prevD && Math.abs(dd) > threshold && Math.abs(prevD[j]) > threshold && Math.sign(dd) !== Math.sign(prevD[j])) { flips[j]++; amp[j] = Math.max(amp[j], Math.abs(dd)); }
      }
      prevD = D;
    }
    prev = L; last = d;
    await new Promise((r) => setTimeout(r, 0));
  }
  pose(0); if (controls && t0) controls.target.copy(t0);
  // results: blinking pixels, clusters on a 16 px grid
  let blink = 0;
  const G = 16, gw = Math.ceil(W / G), gh = Math.ceil(H / G), grid = new Uint32Array(gw * gh);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = y * W + x;
    if (region && (x < region[0] || y < region[1] || x >= region[2] || y >= region[3])) continue;
    if (flips[j] >= minFlips) { blink++; grid[Math.floor(y / G) * gw + Math.floor(x / G)]++; }
  }
  const cells = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] >= 3) cells.push({ x: (i % gw) * G, y: Math.floor(i / gw) * G, n: grid[i] });
  cells.sort((a, b) => b.n - a.n);
  // heat map
  const img = x2.createImageData(W, H);
  for (let j = 0, i = 0; j < W * H; j++, i += 4) {
    const g = lum(last, i) * 0.45 * 255, f = Math.min(1, flips[j] / Math.max(1, frames / 3));
    img.data[i] = f > 0 && flips[j] >= minFlips ? 255 : g; img.data[i + 1] = f > 0 && flips[j] >= minFlips ? g * (1 - f) : g; img.data[i + 2] = f > 0 && flips[j] >= minFlips ? g * (1 - f) : g; img.data[i + 3] = 255;
  }
  x2.putImageData(img, 0, 0);
  for (const c of cells.slice(0, 12)) { x2.strokeStyle = "#ffd400"; x2.lineWidth = 2; x2.strokeRect(c.x - 8, c.y - 8, G + 16, G + 16); }
  x2.fillStyle = "#fff"; x2.font = "16px monospace";
  x2.fillText(`flicker test: ${move} ${frames} frames, step ${step}, threshold ${threshold}: ${blink} blinking px (${(blink / (W * H) * 1e6).toFixed(0)} ppm)`, 12, H - 14);
  const blob = await c2.convertToBlob({ type: "image/png" });
  const heatURL = URL.createObjectURL(blob);
  return { move, frames, step, threshold, W, H, blink, ppm: Math.round(blink / (W * H) * 1e6), clusters: cells.slice(0, 20), heatURL };
}

/** the heat map over the page (click to close) */
export function showHeat(r) {
  let el = document.getElementById("flicker-heat");
  if (!el) { el = document.createElement("img"); el.id = "flicker-heat"; Object.assign(el.style, { position: "fixed", inset: "0", width: "100%", height: "100%", objectFit: "contain", zIndex: 50, background: "#000", cursor: "pointer" }); el.onclick = () => el.remove(); document.body.append(el); }
  el.src = r.heatURL;
  return el;
}
