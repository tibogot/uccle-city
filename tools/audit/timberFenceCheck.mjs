// TIMBER FENCES (claude/reality1 round 3; rule timber-fence). The OSM wooden post-and-rail fences (data/fences/timber.json,
// tools/fences/build_timber.py) drawn by viewer/fences/timberFence.js. This keeps them placed per the data and joined
// to the ground:
//
//   node tools/audit/timberFenceCheck.mjs [--quiet]
//
// D  every OSM wooden fence of the source (fence_type wood / split_rail / post_and_rail / pole / rail, or material wood)
//    has its run; every run >= 2 posts, posts <= 2.45 m apart, each post in a built tile
// B  no post inside a building footprint (> 0.3 m in) of its tile
// G  on the terrain (data/tiles/<T>/terrain.u16, what the drawn ground follows): every post's 0.45 m footing reaches
//    below the ground at its four corners; the low rail clears the ground by >= 0.1 m at every 0.25 m along each span
//    (a hump between posts would bury it); the top rail stays under 1.6 m over the ground (no rail flying over a dip)
// I  the viewer: one shared material and box, instanced, no DynamicDrawUsage, the alpha-hashed far fade, the colliders
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const fail = (m) => { fails++; if (fails < 40) console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const doc = json("data/fences/timber.json"), src = json("data/fences/src/osm_fences.json").rows;
const TIMBER = new Set(["wood", "split_rail", "post_and_rail", "pole", "rail"]);

// ---- D
const want = src.filter((r) => { const ft = r.tags.fence_type || "", m = r.tags.material || ""; return (TIMBER.has(ft) || (m === "wood" && !ft)) && r.geom.length >= 2; });
const have = new Set([...doc.runs.map((r) => r.id), ...(doc.outside || [])]);   // (outside: wholly past the built tiles)
for (const r of want) if (!have.has(`osm:w${r.id}`)) fail(`D OSM way ${r.id}: a wooden fence with no run`);
for (const r of doc.runs) {
  if (r.posts.length < 2) fail(`D ${r.id}: ${r.posts.length} post`);
  for (let i = 1; i < r.posts.length; i++) { const d = Math.hypot(r.posts[i][0] - r.posts[i - 1][0], r.posts[i][1] - r.posts[i - 1][1]); if (d > 2.45) fail(`D ${r.id}: posts ${d.toFixed(2)} m apart`); }
  for (const p of r.posts) if (p[2] && !existsSync(join(ROOT, `data/tiles/${p[2]}/terrain.json`))) fail(`D ${r.id}: a post at (${p[0]}, ${p[1]}) in an unbuilt tile`);
}
say(`ok   D ${doc.runs.length} runs (+ ${(doc.outside || []).length} past the tiles) for ${want.length} OSM wooden fences, ${doc.runs.reduce((a, r) => a + r.posts.length, 0)} posts`);

// ---- terrain + footprints per tile
const terr = new Map(), feet = new Map();
const T_ = (T) => {
  if (!terr.has(T)) {
    const t = json(`data/tiles/${T}/terrain.json`), b = readFileSync(join(ROOT, `data/tiles/${T}/terrain.u16`));
    const v = new Uint16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    terr.set(T, { t, v });
    feet.set(T, existsSync(join(ROOT, `data/tiles/${T}/buildings.json`)) ? json(`data/tiles/${T}/buildings.json`).buildings.map((q) => q.footprint[0]) : []);
  }
  return terr.get(T);
};
const ground = (T, x, z) => {
  const { t, v } = T_(T), fx = (x - t.x0) / t.step, fz = (z - t.z0) / t.step, i = Math.max(0, Math.min(t.cols - 2, Math.floor(fx))), j = Math.max(0, Math.min(t.rows - 2, Math.floor(fz)));
  const ax = fx - i, az = fz - j, h = (r, c) => { const q = v[r * t.cols + c]; return q === t.nodata ? NaN : q / 100; };
  return (h(j, i) * (1 - ax) + h(j, i + 1) * ax) * (1 - az) + (h(j + 1, i) * (1 - ax) + h(j + 1, i + 1) * ax) * az;
};
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); return Math.hypot(x - ax - t * dx, z - az - t * dz); };

// ---- B, G
const [pw, foot] = doc.post, [r0, r1] = doc.rail;
let spans = 0, inB = 0;
for (const r of doc.runs) {
  const H = r.h || 1;
  for (let i = 0; i < r.posts.length; i++) {
    const [x, z, T] = r.posts[i];
    if (!T) continue;
    T_(T);
    const ring = feet.get(T).find((q) => inRing(q, x, z));
    if (ring) { let d = Infinity; for (let k = 0; k < ring.length; k++) d = Math.min(d, segDist(x, z, ring[k], ring[(k + 1) % ring.length])); if (d > 0.3) { inB++; fail(`B ${r.id}: a post ${d.toFixed(2)} m inside a building at (${x}, ${z})`); } }
    const y = ground(T, x, z);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (ground(T, x + (dx * pw) / 2, z + (dz * pw) / 2) < y - foot + 0.02) fail(`G ${r.id}: post footing above the ground at (${x}, ${z})`);
    if (i + 1 >= r.posts.length || !r.posts[i + 1][2]) continue;
    const [bx, bz] = r.posts[i + 1], by = ground(T, bx, bz), L = Math.hypot(bx - x, bz - z), n = Math.max(1, Math.ceil(L / 0.25));
    spans++;
    for (let k = 1; k < n; k++) {
      const f = k / n, px = x + (bx - x) * f, pz = z + (bz - z) * f, rail = y + (by - y) * f, gy = ground(T, px, pz);
      if (rail + r0 * H - 0.05 - gy < 0.1) { fail(`G ${r.id}: the low rail ${(rail + r0 * H - 0.05 - gy).toFixed(2)} m over the ground at (${px.toFixed(1)}, ${pz.toFixed(1)})`); break; }
      if (rail + r1 * H + 0.05 - gy > 1.6) { fail(`G ${r.id}: the top rail ${(rail + r1 * H - gy).toFixed(2)} m over a dip at (${px.toFixed(1)}, ${pz.toFixed(1)})`); break; }
    }
  }
}
say(`ok   B/G ${spans} spans checked, ${inB} posts in buildings`);

// ---- I
const v = readFileSync(join(ROOT, "viewer/fences/timberFence.js"), "utf8");
for (const [what, re] of [["one shared material", /function material\(\)[\s\S]*?if \(mat\) return mat/], ["one shared box", /if \(geo\) return geo/], ["instanced", /new THREE\.InstancedMesh\(box\(\), material\(\)/], ["the hashed far fade", /alphaHash = true[\s\S]*smoothstep\(float\(FAR1\), float\(FAR0\)/], ["the collider roots", /userData\.collider = true/]])
  if (!re.test(v)) fail(`I viewer/fences/timberFence.js: ${what} missing`);
if (/DynamicDrawUsage/.test(v)) fail("I viewer/fences/timberFence.js: DynamicDrawUsage");
console.log(fails ? `TIMBERFENCE: FAIL (${fails})` : `TIMBERFENCE: PASS (${doc.runs.length} runs, ${spans} spans on the ground)`);
process.exit(fails ? 1 : 0);
