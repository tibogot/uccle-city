// DO THE EMBASSY FLAGS FLY? (rule embassy-flags; tools/audit/embassyFlagsCheck.mjs part 7): each flag's cloth as the
// city flies it (viewer/embassyFlags.js clothSpec: its pole or bracket, its wall, its local wind) recorded as the
// city records its loop (flagCloth.js bakeLoop) for 8 wind directions at the default speed, and per direction:
//   spread  the fly end's mean distance from the hoist line over the loop / the flag's width (1 = flat out; a limp flag
//           hanging down its pole ~0.2): >= MIN_SPREAD in every direction;
//   face    (a flag on a front) the fly end's mean offset ALONG the front / the width: the flag seen broadside from the
//           street, not edge-on (a flag streaming straight out of the wall towards the viewer reads as a limp strip):
//           >= MIN_FACE in every direction;
//   wall    the lowest cloth vertex against its wall's half-space (>= -1 cm: no vertex in the wall).
//   node --import ./tools/christmas/hook.mjs tools/embassy/flutter.mjs [--old] [--speed 5]   (--old: ?embassywind=old)
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./geo.mjs";

globalThis.location ??= { search: "" };
const { clothSpec } = await import("../../viewer/embassyFlags.js");
const { bakeLoop } = await import("../../viewer/flags/flagCloth.js");
export const MIN_SPREAD = 0.6, MIN_FACE = 0.5, DIRS = [0, 45, 70, 90, 135, 180, 225, 270, 315];   // (70: the default)

const tg0 = (rows) => (rows[0].face == null ? null : Math.min(...rows.map((r) => r.face)));
export function flutter({ old = false, speed = 5 } = {}) {
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, "data/places/embassy_flags.json"), "utf8"));
  const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, "viewer/flags/atlas/embassy_flags.json"), "utf8"));
  const out = {};
  for (const p of doc.poles) {
    const aspect = atlas.cells[p.design]?.aspect ?? 1.5, rows = [];
    for (const deg of DIRS) {
      const spec = clothSpec(p, aspect, deg, speed, { old });
      const b = bakeLoop(spec.cloth, { speed: spec.speed, frames: 48, fps: 24, seed: 1.3 });
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
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const old = process.argv.includes("--old"), si = process.argv.indexOf("--speed"), speed = si > 0 ? +process.argv[si + 1] : 5;
  const r = flutter({ old, speed });
  for (const [id, v] of Object.entries(r)) console.log(`${v.min >= MIN_SPREAD && (v.faceMin == null || v.faceMin >= MIN_FACE) && (v.wallMin == null || v.wallMin >= -0.01) ? "ok  " : "BAD "} ${v.design.padEnd(12)} ${(v.type + (v.wallPole ? "/wall" : "")).padEnd(11)} min spread ${v.min.toFixed(2)}  [${v.rows.map((q) => q.spread.toFixed(2)).join(" ")}]${v.faceMin != null ? `  face ${v.faceMin.toFixed(2)} [${v.rows.map((q) => q.face.toFixed(2)).join(" ")}]` : ""}${v.wallMin != null ? `  wall ${v.wallMin.toFixed(3)} m` : ""}  ${id}`);
}
