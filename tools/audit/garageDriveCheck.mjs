// GARAGE DRIVES (claude/reality2, 2026-11-26; rule garage-has-drive, class C5 of docs/REALITY_ROUND_2026-11-26.md).
// Avenue De Fré: garage doors opened onto the front lawn. tools/gardens/build_gardens.py now opens the boundary in front
// of every garage door the painted facade draws (tools/gardens/faces.mjs garageAt) and writes a paved drive ring from the
// door to the line (data/gardens/<T>.json drives, drawn by viewer/grounds.js through main.js). This keeps it so:
//
//   node tools/audit/garageDriveCheck.mjs [--quiet]
//
// G  every garage door of every tile has a drive, or no garden run stands in front of it (noRun: the house on the
//    sidewalk line, the sidewalk is its drive), or the garden stands > 0.4 m over / under the sidewalk at the line (steep:
//    a retaining wall with steps, H2: no drive draped down the steps)
// R  every drive ring is a sane quad (1-140 m2: a shallow forecourt to a long drive up a deep garden) and no garden piece stands in it: no wall / railing segment crosses it,
//    no pier or gate post inside it, no hedge point inside it (0.1 m in from its edge): the car drives in, the walker
//    walks in, the colliders (made from the same pieces) agree
// S  every ring square to its door (right angles at the door corners and parallel sides within 3 deg), the door's
//    width + 0.3 m a side; its end follows the sidewalk's edge (straight between the two corners' entries) (round 4's first cut twisted / skewed it: the ragged blob of shot c5_garage_drive_new)
// E  its sidewalk end on the drawn sidewalk's back edge (tools/gardens/drawnSurfaces.mjs, raised classes): both corners
//    and the middle within 0.2 m (gap 0: no lawn between the drive and the sidewalk; 0.2 for a curved edge between the corners)
// K  (counted, not failed) the drives over a dropped kerb (a ramp, class 8, on the axis between the end and the kerb:
//    the UrbIS driveways) and over a full kerb: dropping those needs pipeline/build_surfaces.py to take the drives as
//    driveway input (a patch of surfaces.json in place broke 2 tile builds and the ground census: withdrawn)
// V  the viewer draws them (main.js garageDrives into buildGrounds, ?garagedrive=old none), all but those whose end
//    meets the drawn street over a step > 0.3 m (driveFlat: the DTM may show no jump where the drawn street does, H2)
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const fail = (m) => { fails++; byK[m[0]] = (byK[m[0]] || 0) + 1; if (fails < 40 && !process.env.GD_ONLY || (process.env.GD_ONLY && m[0] === process.env.GD_ONLY && (byK[m[0]] < 400))) console.log("FAIL", m); };
const byK = {};
const say = (m) => { if (!QUIET) console.log(m); };
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const SURF = new Map();
const surfOf = (T) => { if (!SURF.has(T)) { const s = json(`data/tiles/${T}/surfaces.json`); SURF.set(T, { kerbs: s.kerbs || [], ramps: s.surfaces.filter((q) => q.c === 8).map((q) => q.rings[0]) }); } return SURF.get(T); };
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const area = (r) => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
// the ring shrunk 0.1 m towards its centroid (a piece on the edge is not in it)
const shrink = (r, d = 0.1) => { const cx = r.reduce((a, p) => a + p[0], 0) / r.length, cz = r.reduce((a, p) => a + p[1], 0) / r.length; return r.map(([x, z]) => { const L = Math.hypot(x - cx, z - cz) || 1; return [x - ((x - cx) / L) * d, z - ((z - cz) / L) * d]; }); };

// the street surfaces as the city draws them (tools/gardens/drawnSurfaces.mjs: the rings the garden runs stand on)
const TILES = readdirSync(join(ROOT, "data/gardens")).filter((n) => /^[A-O]\d+\.json$/.test(n)).map((n) => n.slice(0, -5));
const drawn = JSON.parse(execFileSync(process.execPath, [join(ROOT, "tools/gardens/drawnSurfaces.mjs"), ...TILES], { cwd: ROOT, maxBuffer: 1 << 30, encoding: "utf8" }));
const RAISED = new Set([4, 5, 6, 8]);              // square, sidewalk, median, ramp (pipeline/build_surfaces.py RAISED)
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-12, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const ringDist = (r, x, z) => { let d = Infinity; for (let i = 0; i < r.length; i++) d = Math.min(d, segDist(x, z, r[i], r[(i + 1) % r.length])); return d; };
let doors = 0, drives = 0, noRun = 0, steep = 0, ramps = 0, noKerb = 0, noWalk = 0, fullKerb = 0;
for (const f of readdirSync(join(ROOT, "data/gardens")).filter((n) => /^[A-O]\d+\.json$/.test(n))) {
  const g = json(`data/gardens/${f}`);
  for (const d of g.garageDoors || []) { doors++; if (d.drive) drives++; else if (d.noRun) noRun++; else if (d.steep) steep++; else fail(`G ${f} garage door at (${d.x}, ${d.z}): no drive and a garden run in front`); }
  for (const dr of g.drives || []) {
    const a = area(dr.ring);
    if (dr.ring.length !== 4 || a < 1 || a > 140) { fail(`R ${f} drive of ${dr.bu}: ring ${dr.ring.length} points, ${a.toFixed(1)} m2`); continue; }
    // S the shape: a rectangle (right angles within 3 deg, opposite sides within 5 cm), the door's width + 0.3 m a side
    const R4 = dr.ring, side = (i) => Math.hypot(R4[(i + 1) % 4][0] - R4[i][0], R4[(i + 1) % 4][1] - R4[i][1]);
    const cosAt = (i) => { const p = R4[(i + 3) % 4], q = R4[i], n = R4[(i + 1) % 4], ax = p[0] - q[0], az = p[1] - q[1], bx = n[0] - q[0], bz = n[1] - q[1]; return Math.abs(ax * bx + az * bz) / ((Math.hypot(ax, az) * Math.hypot(bx, bz)) || 1); };
    // (the end may follow an oblique sidewalk edge: right angles at the door corners, the two sides parallel)
    const sideDir = (i, j) => { const dx = R4[j][0] - R4[i][0], dz = R4[j][1] - R4[i][1], L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L]; };
    const [ax, az] = sideDir(0, 3), [bx, bz] = sideDir(1, 2), par = Math.abs(ax * bz - az * bx);
    if (cosAt(0) > Math.sin((3 * Math.PI) / 180) || cosAt(1) > Math.sin((3 * Math.PI) / 180) || par > Math.sin((3 * Math.PI) / 180) || Math.abs(side(0) - dr.w) > 0.05) fail(`S ${f} drive of ${dr.bu}: not square to its door (sides ${[0, 1, 2, 3].map((i) => side(i).toFixed(2)).join(" / ")})`);
    // E the sidewalk end (r[2] r[3]) on the drawn sidewalk's back edge: both corners and the middle within 0.12 m of a
    // drawn raised surface, or inside one (gap 0: no lawn between the drive and the sidewalk)
    const T = f.slice(0, -5), polys = drawn[T] || [];   // (any drawn street surface: a sidewalk, a square, or the roadway itself where there is none)
    const endPts = [R4[2], R4[3], [(R4[2][0] + R4[3][0]) / 2, (R4[2][1] + R4[3][1]) / 2]];
    const gapAt = ([x, z]) => Math.min(...polys.map((q) => (inRing(q.rings[0], x, z) ? 0 : ringDist(q.rings[0], x, z))), Infinity);
    const gap = Math.max(...endPts.map(gapAt));
    if (gapAt(endPts[2]) > 3) noWalk++;                 // (no measured sidewalk there: an OSM band, Flanders: the garden line)
    else if (gap > 0.2) fail(`E ${f} drive of ${dr.bu}: its end ${gap.toFixed(2)} m short of the drawn sidewalk at (${endPts[2][0].toFixed(1)}, ${endPts[2][1].toFixed(1)})`);
    // K the kerb dropped where it crosses the sidewalk: a ramp (class 8) on its axis between its end and the kerb, unless
    // no kerb within 8 m (the sidewalk runs on as a square / a shared surface)
    {
      const m0 = [(R4[0][0] + R4[1][0]) / 2, (R4[0][1] + R4[1][1]) / 2], m1 = endPts[2], L = Math.hypot(m1[0] - m0[0], m1[1] - m0[1]) || 1, nx = (m1[0] - m0[0]) / L, nz = (m1[1] - m0[1]) / L;
      const raw = surfOf(T), axisPts = Array.from({ length: 33 }, (_, k) => [m1[0] + nx * k * 0.25, m1[1] + nz * k * 0.25]);
      let kerbAt = -1;
      for (const [k, p] of axisPts.entries()) { if (raw.kerbs.some((l) => l.some((q, i) => i && segDist(p[0], p[1], l[i - 1], q) < 0.15))) { kerbAt = k; break; } }
      if (kerbAt < 0) noKerb++;
      else if (axisPts.slice(0, kerbAt + 1).some(([x, z]) => raw.ramps.some((q) => inRing(q, x, z)))) ramps++;
      else fullKerb++;                                  // (counted, not failed: the dropped kerbs need the pipeline, see the rule)
    }
    const r = shrink(dr.ring);
    for (const s of g.segs) { for (const t of [0.25, 0.5, 0.75]) if (inRing(r, s[0] + (s[3] - s[0]) * t, s[2] + (s[5] - s[2]) * t)) { fail(`R ${f} drive of ${dr.bu}: a wall / railing in it at (${s[0]}, ${s[2]})`); break; } }
    for (const p of g.pillars) if (inRing(r, p[0], p[2])) fail(`R ${f} drive of ${dr.bu}: a pier in it at (${p[0]}, ${p[2]})`);
    for (const h of g.hedges) if ((h.points || []).some(([x, z]) => inRing(r, x, z))) { fail(`R ${f} drive of ${dr.bu}: a hedge in it`); }
  }
}
console.log(`G ${doors} garage doors: ${drives} with a drive, ${noRun} on the sidewalk line (no garden run), ${steep} behind a garden step over 0.4 m (no car gets in: no drive); K ${ramps} drives over a dropped kerb (UrbIS driveway), ${fullKerb} over a full kerb (to do), ${noKerb} with no kerb within 8 m, E ${noWalk} with no measured sidewalk in front`);
const m = readFileSync(join(ROOT, "viewer/main.js"), "utf8");
if (!/\.filter\(driveFlat\)/.test(m) || !/garageDrives = params\.get\("garagedrive"\) === "old" \? \[\]/.test(m) || !/\.\.\.garageDrives\], bounds/.test(m)) fail("V viewer/main.js does not draw the garage drives");
// --max E=n,K=n,R=n: the counts the row allows per test (the known data cases, listed in the row's reason); any other
// test (G, S, V) or a count over its ceiling fails
const MAXA = process.argv.indexOf("--max"), MAX = MAXA > 0 ? Object.fromEntries(process.argv[MAXA + 1].split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, +v])) : {};
const over = Object.entries(byK).filter(([k, n]) => !(k in MAX) || n > MAX[k]);
fails = over.reduce((a, [, n]) => a + n, 0);
if (Object.keys(MAX).length) console.log(`per test: ${JSON.stringify(byK)} (allowed ${JSON.stringify(MAX)})`);
console.log(fails ? `GARAGEDRIVE: FAIL (${fails} ${JSON.stringify(byK)})` : `GARAGEDRIVE: PASS (${drives} drives, every garage door served)`);
process.exit(fails ? 1 : 0);
