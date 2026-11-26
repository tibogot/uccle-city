// GARAGE DRIVES (claude/reality2, 2026-11-26; rule garage-has-drive, class C5 of docs/REALITY_ROUND_2026-11-26.md).
// Avenue De Fré: garage doors opened onto the front lawn. tools/gardens/build_gardens.py now opens the boundary in front
// of every garage door the painted facade draws (tools/gardens/faces.mjs garageAt) and writes a paved drive ring from the
// door to the line (data/gardens/<T>.json drives, drawn by viewer/grounds.js through main.js). This keeps it so:
//
//   node tools/audit/garageDriveCheck.mjs [--quiet]
//
// G  every garage door of every tile has a drive, or no garden run stands in front of it (noRun: the house on the
//    sidewalk line, the sidewalk is its drive)
// R  every drive ring is a sane quad (1-140 m2: a shallow forecourt to a long drive up a deep garden) and no garden piece stands in it: no wall / railing segment crosses it,
//    no pier or gate post inside it, no hedge point inside it (0.1 m in from its edge): the car drives in, the walker
//    walks in, the colliders (made from the same pieces) agree
// V  the viewer draws them (main.js garageDrives into buildGrounds, ?garagedrive=old none)
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const fail = (m) => { fails++; if (fails < 40) console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const area = (r) => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
// the ring shrunk 0.1 m towards its centroid (a piece on the edge is not in it)
const shrink = (r, d = 0.1) => { const cx = r.reduce((a, p) => a + p[0], 0) / r.length, cz = r.reduce((a, p) => a + p[1], 0) / r.length; return r.map(([x, z]) => { const L = Math.hypot(x - cx, z - cz) || 1; return [x - ((x - cx) / L) * d, z - ((z - cz) / L) * d]; }); };

let doors = 0, drives = 0, noRun = 0;
for (const f of readdirSync(join(ROOT, "data/gardens")).filter((n) => /^[A-O]\d+\.json$/.test(n))) {
  const g = json(`data/gardens/${f}`);
  for (const d of g.garageDoors || []) { doors++; if (d.drive) drives++; else if (d.noRun) noRun++; else fail(`G ${f} garage door at (${d.x}, ${d.z}): no drive and a garden run in front`); }
  for (const dr of g.drives || []) {
    const a = area(dr.ring);
    if (dr.ring.length !== 4 || a < 1 || a > 140) { fail(`R ${f} drive of ${dr.bu}: ring ${dr.ring.length} points, ${a.toFixed(1)} m2`); continue; }
    const r = shrink(dr.ring);
    for (const s of g.segs) { for (const t of [0.25, 0.5, 0.75]) if (inRing(r, s[0] + (s[3] - s[0]) * t, s[2] + (s[5] - s[2]) * t)) { fail(`R ${f} drive of ${dr.bu}: a wall / railing in it at (${s[0]}, ${s[2]})`); break; } }
    for (const p of g.pillars) if (inRing(r, p[0], p[2])) fail(`R ${f} drive of ${dr.bu}: a pier in it at (${p[0]}, ${p[2]})`);
    for (const h of g.hedges) if ((h.points || []).some(([x, z]) => inRing(r, x, z))) { fail(`R ${f} drive of ${dr.bu}: a hedge in it`); }
  }
}
console.log(`G ${doors} garage doors: ${drives} with a drive, ${noRun} on the sidewalk line (no garden run)`);
const m = readFileSync(join(ROOT, "viewer/main.js"), "utf8");
if (!/garageDrives = params\.get\("garagedrive"\) === "old" \? \[\]/.test(m) || !/\.\.\.garageDrives\], bounds/.test(m)) fail("V viewer/main.js does not draw the garage drives");
console.log(fails ? `GARAGEDRIVE: FAIL (${fails})` : `GARAGEDRIVE: PASS (${drives} drives, every garage door served)`);
process.exit(fails ? 1 : 0);
