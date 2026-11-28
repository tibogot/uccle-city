// KERB FURNITURE (claude/reality2, 2026-11-26; rule kerb-furniture, class C8 of docs/REALITY_ROUND_2026-11-26.md).
// Street View (look only): black hairpin barriers along the kerb in front of the schools, brown timber bollards with
// a red band on the green / station edges, cast iron on the town streets. On every tile with a school front (the
// street life's school faces) + the fixture tiles, built headless through the gate tile cache (as driveCheck):
//
//   node tools/audit/kerbFurnitureCheck.mjs [--quiet] [T ...]
//
// S  every hairpin on the sidewalk (neither leg in a driven lane: main.js's carriageway test), 0.3-0.7 m behind the
//    nearest kerb and along it (<= 12 deg), >= 1.0 m from the next one, none in the door gap (front middle +- 1.6 m);
//    >= 2 at every school front whose kerb is in reach; >= BARRIER_MIN in all
// K  every timber bollard within 30 m of public green and >= 40 m from a shopfront; >= TIMBER_MIN timber on the
//    fixture tiles (the class is on); --old (?kerbbarriers=0) none of either: the check can fail
// V  viewer/kerbBarriers.js adds no light, no DynamicDrawUsage; main.js puts the hairpins' legs in drawn.bollards
//    (the car's posts, rule colliders-match-drawn) and draws the bollards by kind; features.js row kerbbarriers
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2), QUIET = argv.includes("--quiet"), CHILD = argv.includes("--child");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const FIXTURES = ["D7", "G5", "I2"];                  // tiles with green edges and surveyed bollards (the timber class is on)
const BARRIER_MIN = 60, TIMBER_MIN = 3;
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

if (CHILD) {
  // one tile: print one JSON line { tile, barriers, perSchool, timber, iron, fails: [] }
  const T = argv[argv.indexOf("--child") + 1];
  // (as driveCheck's child) file: fetches read from disk, a stand-in OffscreenCanvas
  globalThis.location ??= { search: "" };
  const { readFile } = await import("node:fs/promises");
  const nodeFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => {
    const url = new URL(String(u));
    if (url.protocol !== "file:") return nodeFetch(u, o);
    try { return new Response(await readFile(fileURLToPath(new URL(url.pathname, "file:///"))), { status: 200 }); } catch { return new Response(null, { status: 404 }); }
  };
  if (!globalThis.OffscreenCanvas) globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; }
    getContext() { return new Proxy({}, { get: (t, k) => (k === "getImageData" ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true }); } };
  const K = await imp("viewer/streets/kerbFurniture.js");
  const { tileData } = await imp("tools/gate/tileBuild.mjs");
  const { streetFit } = await imp("viewer/streets/fitCore.js");
  const { carriageway, drawnTest } = await imp("viewer/streets/carriageway.js");
  const { LEG } = K;
  const man = json("data/tiles/manifest.json"), entries = json("tools/boot3/entries.json");
  const m = man.tiles.find((t) => t.name === T);
  const entry = { ...entries.find((e) => !e.lite).entry, ...m, cache: false };
  const log = console.log; console.log = () => {};
  const d = await tileData(entry, pathToFileURL(join(ROOT, "data/tiles") + "/").href);
  console.log = log;
  const b = d.bounds, inB = (x, z) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
  const fit = d.road.surfaceData ? streetFit(d.road.surfaceData) : null;
  const drivenAt = carriageway(d.roads, { classAt: fit?.classAt, onDeck: null, drawn: drawnTest(d.hdr, d.drive?.ground?.delta) });
  const sp = join(ROOT, "data/streetlife", `${T}.json`), doc = existsSync(sp) ? JSON.parse(readFileSync(sp, "utf8")) : null;
  const face = ({ face: f }) => ({ x: f.x, z: f.z, y: f.y, nx: f.nx, nz: f.nz, w: f.w });
  const schools = (doc?.pois || []).filter((p) => p.face && p.kind === "school").map(face);
  const fronts = (doc?.pois || []).filter((p) => p.face && !["atm", "school", "civic"].includes(p.kind)).map(face);
  const fails = [], fail = (s) => fails.push(`${T} ${s}`);
  const sites = fit ? K.schoolBarriers(schools, fit.nearKerb, (x, z) => !drivenAt.inside(x, z, 0.1), inB) : [];
  for (const s of sites) {
    const legs = [-1, 1].map((k) => [s.x + Math.cos(s.yaw) * LEG * k, s.z - Math.sin(s.yaw) * LEG * k]);
    if (legs.some(([x, z]) => drivenAt.inside(x, z, 0))) fail(`S a hairpin leg in a driven lane at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
    const k = fit.nearKerb(s.x, s.z, 3);
    if (!k || k.d < 0.3 || k.d > 0.7) fail(`S a hairpin ${k ? k.d.toFixed(2) + " m" : "with no kerb within 3 m"} behind the kerb at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
    else { const a = Math.abs(Math.cos(s.yaw) * k.tx - Math.sin(s.yaw) * k.tz); if (a < Math.cos((12 * Math.PI) / 180)) fail(`S a hairpin across the kerb at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`); }
    for (const o of sites) if (o !== s && Math.hypot(o.x - s.x, o.z - s.z) < 1.0) { fail(`S two hairpins < 1 m apart at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`); break; }
    const f = schools[s.school], u = (s.x - f.x) * -f.nz + (s.z - f.z) * f.nx;
    if (Math.abs(u) < K.BARRIER_GAP / 2 - 0.5) fail(`S a hairpin in the door gap at (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
  }
  const perSchool = schools.map((f, i) => (inB(f.x, f.z) && fit && [-4, 0, 4].some((u) => K.frontKerb(f, u, fit.nearKerb)) ? sites.filter((s) => s.school === i).length : -1));
  const bx = d.road.surfaceData?.bollards || [];
  const kinds = K.bollardKinds(bx, K.greenNear(d.feats), fronts), green = K.greenNear(d.feats);
  let timber = 0;
  for (let i = 0; i < kinds.length; i++) {
    if (!kinds[i]) continue;
    timber++;
    const x = bx[i * 3], z = bx[i * 3 + 2];
    if (!green(x, z, K.TIMBER_GREEN)) fail(`K a timber bollard far from green at (${x.toFixed(1)}, ${z.toFixed(1)})`);
    if (fronts.some((f) => Math.hypot(f.x - x, f.z - z) < K.TIMBER_SHOPS)) fail(`K a timber bollard on a shop street at (${x.toFixed(1)}, ${z.toFixed(1)})`);
  }
  if (process.env.KF_DEBUG) log(JSON.stringify({ bx: Object.prototype.toString.call(bx), bxl: bx.length, sdk: Object.keys(d.road.surfaceData || {}), schools: schools.map((f) => { const k = fit?.nearKerb(f.x + f.nx * 3, f.z + f.nz * 3, 30); return k ? [k.d.toFixed(1), (k.lx * f.nx + k.lz * f.nz).toFixed(2), f.w] : null; }) }));
  log(JSON.stringify({ tile: T, barriers: sites.length, perSchool, timber, iron: kinds.length - timber, feats: !!d.feats, fails }));
  process.exit(0);
}

let fails = 0;
const fail = (m) => { fails++; if (fails < 40) console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };
const schoolTiles = readdirSync(join(ROOT, "data/streetlife")).filter((n) => /^[A-O]\d+\.json$/.test(n)).filter((n) => (json(`data/streetlife/${n}`).pois || []).some((p) => p.kind === "school" && p.face)).map((n) => n.slice(0, -5));
const named = argv.filter((a) => /^[A-O]\d+$/.test(a));
const TILES = named.length ? named : [...new Set([...schoolTiles, ...FIXTURES])];
let barriers = 0, timber = 0, iron = 0, timberFix = 0;
for (const T of TILES) {
  const r = spawnSync(process.execPath, ["--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", T], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
  const line = (r.stdout || "").trim().split(/\r?\n/).filter((l) => l.startsWith("{")).pop();
  if (!line) { fail(`${T}: the tile did not build (${(r.stderr || "").trim().split(/\r?\n/).slice(-2).join(" | ")})`); continue; }
  const o = JSON.parse(line);
  if (!o.feats) fail(`${T}: no features for the green test`);
  for (const f of o.fails) fail(f);
  o.perSchool.forEach((n, i) => { if (n >= 0 && n < 2) fail(`S ${T} school front ${i}: ${n} hairpin(s) with its kerb in reach`); });
  barriers += o.barriers; timber += o.timber; iron += o.iron; if (FIXTURES.includes(T)) timberFix += o.timber;
  say(`${T}: ${o.barriers} hairpins (${o.perSchool.join(", ")} a school), ${o.timber} timber / ${o.iron} iron bollards`);
}
if (!named.length && barriers < BARRIER_MIN) fail(`S only ${barriers} hairpins (>= ${BARRIER_MIN})`);
if (!named.length && timberFix < TIMBER_MIN) fail(`K only ${timberFix} timber bollards on the fixture tiles ${FIXTURES.join(" ")} (>= ${TIMBER_MIN})`);
const src = readFileSync(join(ROOT, "viewer/kerbBarriers.js"), "utf8").replace(/\/\/.*$/gm, "");
if (/new THREE\.\w*Light\b/.test(src)) fail("V viewer/kerbBarriers.js makes a light (rule fixed-light-count)");
if (/DynamicDrawUsage/.test(src)) fail("V viewer/kerbBarriers.js uses DynamicDrawUsage");
const main = readFileSync(join(ROOT, "viewer/main.js"), "utf8");
if (!/\.\.\.barrierLegs\(barrierSites\)/.test(main)) fail("V main.js does not give the car the hairpins' legs (drawn.bollards)");
if (!/buildBollards\(d\.road\.surfaceData\.bollards, KERB_BARRIERS \? bollardKinds\(/.test(main)) fail("V main.js does not draw the bollards by kind");
if (!/\("kerbbarriers",/.test(readFileSync(join(ROOT, "viewer/features.js"), "utf8"))) fail("V viewer/features.js has no kerbbarriers row");
console.log(`S ${barriers} school hairpins, K ${timber} timber / ${iron} cast-iron bollards on ${TILES.length} tiles`);
console.log(fails ? `KERBFURNITURE: FAIL (${fails})` : "KERBFURNITURE: PASS");
process.exit(fails ? 1 : 0);
