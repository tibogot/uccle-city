// TRAM ON RAMPS: moving frame strips of a tram 92 passing a place, side view and chase view (docs/fixes1/README.md).
// The tram clock is set per frame (tramLine.setClock), so the tram moves exactly `speed` x real time per rendered frame
// whatever the GPU does; the animation loop is paused while the strip renders.
//   const m = await import("/debug/tramStrip.js");
//   const r = await m.strip({ clock: 29465, seconds: 14, view: "side", at: [900, 529], side: 34, title: "..." });
//   r.dataURL -> save (evaluate_script filePath), r.labels
// view "side": a fixed camera `side` m off the track at `at`, looking at the tram; "chase": behind and above the tram.
// Also: m.profile(trip, d0, d1) = the rail-top heights the tram stands on along a trip (for the vertical-curve check).
import { frameStrip } from "/labs/frameStrip.js";

const tram = () => viewer.tram();

/** the running tram nearest (x, z) at clock secs */
function nearest(secs, x, z, trip = null) {
  tram().setClock(secs);
  let best = null;
  for (const p of tram().positions()) {
    if (trip && p.trip !== trip) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (!best || d < best.dist) best = { ...p, dist: d };
  }
  return best;
}

export async function strip({ cam = null, look = null, clock, seconds = 12, view = "side", at, side = 30, height = 4, back = 26, up = 7, shots = 8, cols = 4, cellW = 480, title = "", fps = 12 }) {
  const T = tram();
  const first = nearest(clock, at[0], at[1]);
  const trip = first?.trip;
  viewer.pause(true);
  const canvas = viewer.renderer.domElement, camera = viewer.camera;
  const W = viewer.world;
  const yAt = (x, z) => W.surface(x, z);
  // the chase camera rides at the tram's own height (its rail top: on the bridge, not down in the cutting)
  const tyAt = (q) => (T.yAlong ? T.yAlong(q.trip, q.d - 30) : null) ?? yAt(q.x, q.z);
  let p = first;
  // side view: perpendicular to the track at `at`, on the side given by the sign of `side`
  const h = first.yaw, tx = Math.cos(h), tz = -Math.sin(h), nx = -tz, nz = tx;
  const r = await frameStrip({
    renderFrame: () => viewer.renderFrame(), canvas, camera, controls: viewer.controls, seconds, fps, shots, cols, cellW, warm: 6,
    title: `${title} (trip ${trip}, ${view})`,
    path: (t) => ({
      before: () => { T.setClock(clock + t * seconds); p = nearest(clock + t * seconds, at[0], at[1], trip) || p; },
      get pos() {
        if (cam) return cam;
        if (view === "side") { const cx = at[0] + nx * side, cz = at[1] + nz * side; return [cx, yAt(at[0], at[1]) + height, cz]; }
        const dx = Math.cos(p.yaw), dz = -Math.sin(p.yaw), sx = -dz, sz = dx;
        const cx = p.x - dx * back + sx * side * 0.25, cz = p.z - dz * back + sz * side * 0.25;
        return [cx, tyAt(p) + up, cz];
      },
      get target() {
        if (look) return look;
        if (view === "side") return [at[0], yAt(at[0], at[1]) + 1.6, at[1]];
        const dx = Math.cos(p.yaw), dz = -Math.sin(p.yaw);
        return [p.x + dx * 8, tyAt(p) + 1.5, p.z + dz * 8];
      },
    }),
    label: () => `d ${p ? p.d.toFixed(0) : "-"} m`,
  });
  viewer.pause(false);
  const blob = await (await fetch(r.url)).blob();
  const dataURL = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  return { dataURL, labels: r.labels, trip };
}

/** where the tram's pieces stand vs the rails at clock secs: per piece the gap between its bogie / ends and the rail
 *  (for the joint check: the ends of neighbouring sections must meet in 3D) */
export function poseCheck(secs, x, z) {
  const p = nearest(secs, x, z);
  return p;
}

/** THE JOINT CHECK: a tram of line 92 posed every `step` m along trip `trip` from d0 to d1, the OLD way (each piece
 *  pitched from the road under its own ends, viewer/tram2Model.js HALF) and the NEW way (tramPose with the track
 *  profile): per articulation the vertical mismatch between the two sections' ends (m), per bogie its height off the
 *  drawn rail (m; where rails are drawn: on an OSM track), and the largest pitch change between two poses 0.5 m apart (deg: the "kink" rate). */
export async function jointCheck(trip, d0, d1, step = 0.5) {
  const { tramPose } = await import("/viewer/tramModel.js");
  const T = tram(), W = viewer.world, model = T.model, L = model.layout, M = L.modules;
  const HALF = { Cab: 4.4125, Susp: 2.8, Centre: 1.5, Bellows: 1.2, Bogie: 0.9, Panto: 0 };
  const oldTop = (x, z) => W.surface(x, z) + 0.12 + 0.02;
  // the rails as main.js draws them: max(road, railTop) (+ the 2 cm lift both carry)
  const railDrawn = (x, z, h) => Math.max(W.surface(x, z) + 0.12 + 0.02, T.railY(x, z, h));
  const at = (s) => T.trackAt(trip, s);
  const res = { old: { joint: [], bogie: [], kink: 0 }, new: { joint: [], bogie: [], kink: 0 } };
  let prev = { old: null, new: null };
  const pose = [];
  const TL = "ABCDEFGHIJKLMNO", tileOf = (x, z) => TL[Math.floor((x + 3000) / 500)] + (Math.floor(z / 500) + 5);
  const loaded = (s) => { const [x, z] = at(s); return W.at(x, z)?.name === tileOf(x, z); };
  res.skipped = 0;
  for (let d = d0; d <= d1; d += step) {
    if (!loaded(d) || !loaded(d - 32)) { res.skipped++; prev = { old: null, new: null }; continue; }
    for (const mode of ["old", "new"]) {
      tramPose(L, at, d, pose, false, mode === "new" ? (q) => T.yAlong(trip, q) : null);
      const pieces = [];
      for (const p of pose) {
        let y, pitch;
        if (mode === "new") { y = p.y; pitch = p.pitch; }
        else { const h = HALF[p.piece] || 0, dx = Math.cos(p.yaw) * h, dz = -Math.sin(p.yaw) * h; const yf = oldTop(p.x + dx, p.z + dz), yr = oldTop(p.x - dx, p.z - dz); y = h ? (yf + yr) / 2 : oldTop(p.x, p.z); pitch = h ? Math.atan2(yf - yr, 2 * h) : 0; }
        pieces.push({ ...p, y, pitch });
      }
      // sections in order (not bogies / bellows / panto): their ends along the travel direction
      const secs = pieces.filter((p) => ["Cab", "Susp", "Centre"].includes(p.piece));
      for (let i = 0; i < secs.length - 1; i++) {
        const a = secs[i], b = secs[i + 1], La = M[i].length, Lb = M[i + 1].length;
        const pa = a.flip ? -a.pitch : a.pitch, pb = b.flip ? -b.pitch : b.pitch;      // pitch in the travel direction
        const rearA = a.y - Math.sin(pa) * La / 2, frontB = b.y + Math.sin(pb) * Lb / 2;
        res[mode].joint.push(Math.abs(rearA - frontB));
      }
      for (const b of pieces.filter((p) => p.piece === "Bogie" && (!T.prof || T.prof.y(p.x, p.z, 1.5) != null))) res[mode].bogie.push(Math.abs(b.y - (mode === "new" ? railDrawn(b.x, b.z, b.yaw) : oldTop(b.x, b.z))));
      const pit = secs.map((p) => (p.flip ? -p.pitch : p.pitch));
      if (prev[mode]) for (let i = 0; i < pit.length; i++) res[mode].kink = Math.max(res[mode].kink, Math.abs(pit[i] - prev[mode][i]) * 180 / Math.PI / step * 0.5);
      prev[mode] = pit;
    }
  }
  const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return +s[Math.floor(f * (s.length - 1))].toFixed(3); };
  const sum = (r) => ({ jointP50: q(r.joint, 0.5), jointP99: q(r.joint, 0.99), jointMax: q(r.joint, 1), bogieP99: q(r.bogie, 0.99), bogieMax: q(r.bogie, 1), kinkDegPer05m: +r.kink.toFixed(2) });
  return { trip, d0, d1, step, skipped: res.skipped, old: sum(res.old), new: sum(res.new) };
}
