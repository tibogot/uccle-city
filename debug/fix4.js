// FIX BATCH 4 checks (docs/FIX4.md). The main loop paused and stepped at 1/60 s (viewer.step), as debug/motionShots.js.
//   const F = await import("/debug/fix4.js");
//   await F.follow({ type: "estate", variants: [{ label, set }], frame: 60 })  -> { url } a sheet: one row per variant
//   the same car followed in every variant (its position differs: the run goes on), camera `back` m behind, `up` m up
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const V = () => window.viewer;

function pick(type, minV = 4, near = null) {
  const s = window.__traffic.sim, T = window.__traffic.types;
  let best = -1, bd = 1e9;
  for (let i = 0; i < s.cap; i++) {
    if (!s.alive[i] || s.v[i] < minV || (type && T[s.type[i]]?.name !== type) || T[s.type[i]]?.two) continue;
    const d = near ? Math.hypot(s.x[i] - near[0], s.z[i] - near[1]) : i;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function sheet(cols, rows, w, h, title) {
  const c = new OffscreenCanvas(cols * (w + 4), 26 + rows * (h + 20));
  const g = c.getContext("2d");
  g.fillStyle = "#16181c"; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#eee"; g.font = "14px monospace"; g.fillText(title, 6, 17);
  return { c, g };
}
export async function toDataURL(blob) { return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); }

/** follow one traffic car per variant row; grab crops (w x h canvas px round the car's rear) at the `grab` frames */
export async function follow({ type = null, variants, grab = [40, 90], back = 7, up = 2.0, w = 520, h = 340, minV = 4, near = null, title = "" } = {}) {
  const v = V(), s = window.__traffic.sim, Vec = v.camera.position.constructor, cv = v.renderer.domElement, cam = v.camera;
  const i = pick(type, minV, near);
  if (i < 0) return { error: "no car" };
  const { c, g } = sheet(grab.length, variants.length, w, h, title || `${window.__traffic.types[s.type[i]].name} #${i}: camera ${back} m behind, ${up} m up`);
  const look = new Vec(), p = new Vec();
  const held = v.controls.update; v.controls.update = () => {};
  v.pause(true);
  // the same start for every row: snapshot the followed car's sim state is not possible (shared sim): rows run on
  try {
    for (let r = 0; r < variants.length; r++) {
      variants[r].set();
      const last = Math.max(...grab);
      for (let f = 0; f <= last; f++) {
        const fx = Math.sin(s.yaw[i]), fz = Math.cos(s.yaw[i]);
        cam.position.set(s.x[i] - fx * back, s.y[i] + up, s.z[i] - fz * back);
        look.set(s.x[i] + fx * 6, s.y[i] + 0.7, s.z[i] + fz * 6);
        cam.lookAt(look); cam.updateMatrixWorld(true);
        v.step(1 / 60);
        const k = grab.indexOf(f);
        if (k >= 0) {
          p.set(s.x[i] - fx * 1.5, s.y[i] + 0.8, s.z[i] - fz * 1.5).project(cam);
          const sx = (p.x * 0.5 + 0.5) * cv.width, sy = (-p.y * 0.5 + 0.5) * cv.height;
          g.drawImage(cv, sx - w / 2, sy - h / 2, w, h, k * (w + 4), 26 + r * (h + 20), w, h);
          g.fillStyle = "#ddd"; g.font = "13px monospace";
          g.fillText(`${variants[r].label} f${f}`, k * (w + 4) + 4, 26 + r * (h + 20) + h + 14);
        }
        if (f % 3 === 0) await sleep(0);
      }
    }
  } finally { v.pause(false); v.controls.update = held; }
  return { car: i, url: await toDataURL(await c.convertToBlob({ type: "image/jpeg", quality: 0.9 })) };
}

/** full canvas (or crop) of the current view after `settle` rendered frames -> jpeg data URL */
export async function frame({ settle = 20, crop = null, q = 0.9 } = {}) {
  const v = V(); v.pause(true);
  for (let k = 0; k < settle; k++) { v.step(1 / 60); if (k % 3 === 0) await sleep(0); }
  v.step(1 / 60);                      // (drawn right after a step: the canvas is cleared once the task yields)
  const cv = v.renderer.domElement, [x0, y0, x1, y1] = crop ?? [0, 0, cv.width, cv.height];
  const o = new OffscreenCanvas(x1 - x0, y1 - y0); o.getContext("2d").drawImage(cv, -x0, -y0);
  v.pause(false);
  return await toDataURL(await o.convertToBlob({ type: "image/jpeg", quality: q }));
}
