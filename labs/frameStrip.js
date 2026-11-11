// MOVING FRAME SEQUENCES (shared by the labs): render a camera path frame by frame at a fixed step (the lab's time runs,
// so temporal effects, LOD hand-overs, dithered fades and shadow updates behave as when moving), and put every k-th
// frame on one contact sheet (labelled) shown over the page for a screenshot. The owner's rule: check LOD / shadow
// transitions WHILE MOVING; one sheet = one move.
//
//   import { frameStrip } from "./frameStrip.js";
//   const r = await frameStrip({ renderFrame: (dt) => frame(dt), canvas, camera, controls,
//     path: (t) => ({ pos: [x, y, z], target: [x, y, z], before: () => {...} }),   // t in 0..1
//     seconds: 4, fps: 60, shots: 8, cols: 4, cellW: 480, title: "approach 300 -> 20 m" });
//   r.url: the sheet (PNG blob URL), r.labels: what each cell shows
export async function frameStrip({ renderFrame, canvas, camera, controls = null, path, seconds = 4, fps = 60, shots = 8, cols = 4, cellW = 480, title = "", label = null, warm = 20 }) {
  const n = Math.max(2, Math.round(seconds * fps)), every = (n - 1) / (shots - 1);
  const aspect = canvas.width / canvas.height, cellH = Math.round(cellW / aspect);
  const rows = Math.ceil(shots / cols), top = 28;
  const sheet = new OffscreenCanvas(cols * cellW, rows * (cellH + 18) + top), g = sheet.getContext("2d");
  g.fillStyle = "#16181c"; g.fillRect(0, 0, sheet.width, sheet.height);
  g.fillStyle = "#eee"; g.font = "16px monospace"; g.fillText(title, 8, 19);
  const pose = (t) => {
    const p = path(t);
    p.before?.();
    camera.position.set(...p.pos);
    if (controls) controls.target.set(...p.target);
    camera.lookAt(...p.target);
    camera.updateMatrixWorld(true);
    return p;
  };
  for (let i = 0; i < warm; i++) { pose(0); renderFrame(1 / fps); await new Promise((r) => setTimeout(r, 0)); }
  const labels = [];
  let next = 0, k = 0;
  for (let f = 0; f < n; f++) {
    const t = f / (n - 1), p = pose(t);
    renderFrame(1 / fps);
    if (f >= Math.round(next) && k < shots) {
      const x = (k % cols) * cellW, y = top + Math.floor(k / cols) * (cellH + 18);
      g.drawImage(canvas, x, y, cellW, cellH);
      const txt = `${k + 1}: t ${(t * seconds).toFixed(2)} s` + (label ? ` · ${label(t, p)}` : "");
      g.fillStyle = "#ddd"; g.font = "12px monospace"; g.fillText(txt, x + 4, y + cellH + 13);
      labels.push(txt); k++; next += every;
    }
    if (f % 4 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  const url = URL.createObjectURL(await sheet.convertToBlob({ type: "image/png" }));
  return { url, labels, width: sheet.width, height: sheet.height };
}

/** the sheet over the page, actual size from the top left (click to close) */
export function showSheet(r) {
  let el = document.getElementById("frame-strip");
  if (!el) {
    el = document.createElement("img"); el.id = "frame-strip";
    Object.assign(el.style, { position: "fixed", left: "0", top: "0", zIndex: 60, background: "#000", cursor: "pointer", maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" });
    el.onclick = () => el.remove(); document.body.append(el);
  }
  el.src = r.url;
  return el;
}
