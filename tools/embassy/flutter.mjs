// DO THE EMBASSY FLAGS FLY? (rule embassy-flags; tools/audit/embassyFlagsCheck.mjs part 7): each flag's cloth as the
// city flies it (viewer/embassyFlags.js clothSpec: its pole or bracket, its wall, its local wind) recorded as the
// city records its loop (flagCloth.js bakeLoop) for 8 wind directions at the default speed, and per direction:
//   spread  the fly end's mean distance from the hoist line over the loop / the flag's width (1 = flat out; a limp flag
//           hanging down its pole ~0.2): >= MIN_SPREAD in every direction;
//   face    (a flag on a front) the fly end's mean offset ALONG the front / the width: the flag seen broadside from the
//           street, not edge-on (a flag streaming straight out of the wall towards the viewer reads as a limp strip):
//           >= MIN_FACE in every direction;
//   pair    (two flags of one place) the two cloths' nearest vertices over the loop: >= MIN_GAP (no flag through the
//           other: a pair of brackets flies the same way in the same wind);
//   wall    the lowest cloth vertex against its wall's half-space (>= -1 cm: no vertex in the wall).
//   node --import ./tools/christmas/hook.mjs tools/embassy/flutter.mjs [--old] [--speed 5]   (--old: ?embassywind=old)
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./geo.mjs";

globalThis.location ??= { search: "" };
const { clothSpec, poleGeometry } = await import("../../viewer/embassyFlags.js");
const { bakeLoop } = await import("../../viewer/flags/flagCloth.js");
export const MIN_GAP = 0.08, MIN_SPREAD = 0.6, MIN_FACE = 0.5, DIRS = [0, 45, 70, 90, 135, 180, 225, 270, 315];   // (70: the default)

const tg0 = (rows) => (rows[0].face == null ? null : Math.min(...rows.map((r) => r.face)));
export function flutter({ old = false, speed = 5 } = {}) {
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, "data/places/embassy_flags.json"), "utf8"));
  const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, "viewer/flags/atlas/embassy_flags.json"), "utf8"));
  const out = {}, loops = {};
  for (const p of doc.poles) {
    const aspect = atlas.cells[p.design]?.aspect ?? 1.5, rows = [];
    for (const deg of DIRS) {
      const spec = clothSpec(p, aspect, deg, speed, { old });
      const b = bakeLoop(spec.cloth, { speed: spec.speed, frames: 48, fps: 24, seed: 1.3 });
      (loops[p.place] ??= {})[deg] ??= []; loops[p.place][deg].push({ p, b, top: hoistTop(p) });
      const c = b.cloth, nx = c.nx, ny = c.ny, a = c.axis, sz = b.count * 3, W = c.width;
      let spread = 0, wall = Infinity, face = 0;
      const n = p.type === "bracket" ? p.n : p.wall?.n ?? null, tg = n ? [n[1], -n[0]] : null;
      for (let f = 0; f < b.frames; f++) {
        let s = 0;
        for (let j = 0; j < ny; j++) {
          const k = f * sz + (j * nx + nx - 1) * 3, x = b.pos[k], y = b.pos[k + 1], z = b.pos[k + 2];
          const t = x * a[0] + y * a[1] + z * a[2];
          s += Math.hypot(x - a[0] * t, y - a[1] * t, z - a[2] * t);
        }
        spread += s / ny / W;
        if (tg) { let q = 0; for (let j = 0; j < ny; j++) { const k = f * sz + (j * nx + nx - 1) * 3; q += Math.abs(b.pos[k] * tg[0] + b.pos[k + 2] * tg[1]); } face += q / ny / W; }
        for (const pl of c.planes) for (let v = 0; v < b.count; v++) { const k = f * sz + v * 3; wall = Math.min(wall, pl[0] * b.pos[k] + pl[1] * b.pos[k + 1] + pl[2] * b.pos[k + 2] - pl[3]); }
      }
      rows.push({ deg, spread: spread / b.frames, face: tg ? face / b.frames : null, wall: c.planes.length ? wall : null, speed: spec.speed });
    }
    out[p.id] = { design: p.design, type: p.type, wallPole: !!p.wall, rows, min: Math.min(...rows.map((r) => r.spread)), faceMin: tg0(rows), wallMin: rows.some((r) => r.wall != null) ? Math.min(...rows.filter((r) => r.wall != null).map((r) => r.wall)) : null };
  }
  // the pairs: the two cloths in the city frame (hoist top + sim frame), the nearest vertices over the loop
  for (const [place, byDeg] of Object.entries(loops)) {
    const first = Object.values(byDeg)[0];
    if (first.length < 2) continue;
    let gap = Infinity;
    for (const [dg, list] of Object.entries(byDeg)) for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) { const g0 = gap;
      const A = list[a], C = list[c], sz = A.b.count * 3;
      for (let f = 0; f < A.b.frames; f += 2) for (let i = 0; i < A.b.count; i++) {
        const ax = A.b.pos[f * sz + i * 3] + A.top[0], ay = A.b.pos[f * sz + i * 3 + 1] + A.top[1], az = A.b.pos[f * sz + i * 3 + 2] + A.top[2];
        for (let j = 0; j < C.b.count; j++) { const d = Math.hypot(ax - C.b.pos[f * sz + j * 3] - C.top[0], ay - C.b.pos[f * sz + j * 3 + 1] - C.top[1], az - C.b.pos[f * sz + j * 3 + 2] - C.top[2]); if (d < gap) gap = d; }
      }
    }
    for (const q of first) out[q.p.id].pairGap = gap;
  }
  return out;
}
/** a pole's hoist top on flat ground (y 0): the pair test's common frame */
function hoistTop(p) {
  const g = poleGeometry({ pos: [], nrm: [], col: [], idx: [] }, p, () => 0), [bx, by, bz] = g.base, [tx, ty, tz] = g.tip, L = Math.hypot(tx - bx, ty - by, tz - bz);
  return [tx - ((tx - bx) / L) * 0.12, ty - ((ty - by) / L) * 0.12, tz - ((tz - bz) / L) * 0.12];
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const old = process.argv.includes("--old"), si = process.argv.indexOf("--speed"), speed = si > 0 ? +process.argv[si + 1] : 5;
  const r = flutter({ old, speed });
  for (const [id, v] of Object.entries(r)) console.log(`${v.min >= MIN_SPREAD && (v.faceMin == null || v.faceMin >= MIN_FACE) && (v.wallMin == null || v.wallMin >= -0.01) ? "ok  " : "BAD "} ${v.design.padEnd(12)} ${(v.type + (v.wallPole ? "/wall" : "")).padEnd(11)} min spread ${v.min.toFixed(2)}  [${v.rows.map((q) => q.spread.toFixed(2)).join(" ")}]${v.faceMin != null ? `  face ${v.faceMin.toFixed(2)} [${v.rows.map((q) => q.face.toFixed(2)).join(" ")}]` : ""}${v.wallMin != null ? `  wall ${v.wallMin.toFixed(3)} m` : ""}${v.pairGap != null ? `  pair gap ${v.pairGap.toFixed(2)} m${v.pairGap < MIN_GAP ? " BAD" : ""}` : ""}  ${id}`);
}
