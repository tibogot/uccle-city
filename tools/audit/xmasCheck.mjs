// node --import ./tools/christmas/hook.mjs tools/audit/xmasCheck.mjs [--quiet]
// RULE 19 (docs/QUALITY_RULES.md): the seasonal layer (viewer/christmas/, models/christmas/site.json) stands where the
// city can hold it and adds no light:
//   - every fir and market chalet stands on paving (UrbIS square / sidewalk surface under its whole footprint, never a
//     roadway, a tram track or a parking strip), clear of tram surfaces (>= 4 m), building walls (the fir: its branches'
//     reach + 1 m; a chalet: 0.5 m), the drawn trees' trunks (1 m), shop fronts / doors (4 m: the street-life faces),
//     and of each other;
//   - street garlands hang 7-26 m wall to wall, >= 4.4 m over the street at their lowest (bulbs + the star motif), and
//     never carry a star over a tram track;
//   - the kit's mesh audit (models/christmas/christmas.json) has 0 blocking items on every piece and level;
//   - the fir's NEAR level is alpha-tested needle cards (slot fir_cards; canopy normals, alpha test: tools/christmas/
//     xmasTest.mjs on the decoded GLB), the MIDDLE level a shell of big cards round a thin solid core, the FAR level
//     none; triangles and card triangles per level within budget; the needle atlas small; every ornament clear of the
//     solid foliage and the cards' cores; the 45 m switch matched (silhouette, brightness, colour, see-through: the
//     Blender review renders, tools/christmas/fir_review.py); the cost model (tools/christmas/firCost.mjs) re-run for
//     this kit and its estimate for the shipped switches within the 0.1 ms budget at 8 m;
//   - the site fits the CURRENT city (rule xmas-fit-current-city, tools/christmas/siteFit.mjs): fronts, swags (inside the
//     drawn front: the shared frontFace / frontWidth), wreaths, spans (never on a hidden solid), lamps, park fences;
//   - NO LIGHT: no three.js light is constructed or added under viewer/christmas/ (rule 7: emissive only), no
//     DynamicDrawUsage (rule 8).
// Exit 1 on any failure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
let fails = 0;
const out = (ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };

const site = J("models/christmas/site.json"), map = J("data/map/map.json");
const tileOf = (x, z) => map.tiles.find((t) => x >= t.x0 && x < t.x0 + 500 && z >= t.z0 && z < t.z0 + 500)?.name;
const cache = {};
const tileData = (name) => (cache[name] ??= {
  surfaces: J(`data/tiles/${name}/surfaces.json`).surfaces,
  buildings: J(`data/tiles/${name}/buildings.json`).buildings,
  trees: J(`data/tiles/${name}/features.json`).trees,
});
const around = (x, z) => {
  const names = new Set();
  for (const dx of [-30, 0, 30]) for (const dz of [-30, 0, 30]) { const n = tileOf(x + dx, z + dz); if (n) names.add(n); }
  const T = [...names].map(tileData);
  return { surfaces: T.flatMap((t) => t.surfaces), buildings: T.flatMap((t) => t.buildings), trees: T.flatMap((t) => t.trees) };
};
const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [x0, z0] = r[i], [x1, z1] = r[j]; if ((z0 > z) !== (z1 > z) && x < ((x1 - x0) * (z - z0)) / (z1 - z0) + x0) c = !c; } return c; };
const edist = (x, z, r) => { let d = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, az] = r[j], [bx, bz] = r[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); d = Math.min(d, Math.hypot(ax + t * dx - x, az + t * dz - z)); } return d; };
const distTo = (x, z, r) => (pip(x, z, r) ? 0 : edist(x, z, r));
const PAVING = new Set([4, 5]), TRAM = new Set([1, 2]);           // surfaces.json classes: square, sidewalk | tramRoad, tramSite

// the street-life shop faces (doors / fronts)
const fronts = site.fronts ?? [];

/** a footprint (sample points) on paving, clear of trams / walls / trunks / fronts */
function standsWell(label, pts, { wall, tram = 4, trunk = 1, front = 4 }) {
  const [cx, cz] = pts[0], A = around(cx, cz);
  const bad = [];
  for (const [x, z] of pts) {
    const under = A.surfaces.filter((s) => pip(x, z, s.rings[0]));
    if (!under.some((s) => PAVING.has(s.c)) || under.some((s) => !PAVING.has(s.c))) { bad.push(`(${x.toFixed(1)}, ${z.toFixed(1)}) not on paving (${under.map((s) => s.c).join(",") || "none"})`); break; }
  }
  const dTram = Math.min(...A.surfaces.filter((s) => TRAM.has(s.c)).map((s) => Math.min(...pts.map(([x, z]) => distTo(x, z, s.rings[0])))), Infinity);
  if (dTram < tram) bad.push(`${dTram.toFixed(1)} m from a tram track (< ${tram})`);
  const dWall = Math.min(...A.buildings.flatMap((b) => b.footprint.map((r) => Math.min(...pts.map(([x, z]) => distTo(x, z, r))))), Infinity);
  if (dWall < wall) bad.push(`${dWall.toFixed(1)} m from a building wall (< ${wall})`);
  const dTrunk = Math.min(...A.trees.map((t) => Math.min(...pts.map(([x, z]) => Math.hypot(t.x - x, t.z - z)))), Infinity);
  if (dTrunk < trunk) bad.push(`${dTrunk.toFixed(1)} m from a tree trunk (< ${trunk})`);
  const dFront = Math.min(...fronts.map((f) => Math.min(...pts.map(([x, z]) => Math.hypot(f.x - x, f.z - z)))), Infinity);
  if (dFront < front) bad.push(`${dFront.toFixed(1)} m from a shop front (< ${front})`);
  out(!bad.length, `${label}: on paving, tram ${dTram.toFixed(1)} m, walls ${dWall.toFixed(1)} m, trunks ${dTrunk.toFixed(1)} m, shops ${dFront.toFixed(1)} m${bad.length ? " :: " + bad.join("; ") : ""}`);
}
const ring = (x, z, r, n = 12) => [[x, z], ...Array.from({ length: n }, (_, k) => [x + Math.cos((2 * Math.PI * k) / n) * r, z + Math.sin((2 * Math.PI * k) / n) * r])];
const rect = (c, hw, fr, bk) => {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), ux = fz, uz = -fx, P = [[c.x, c.z]];
  for (const a of [-1, -0.5, 0, 0.5, 1]) for (const b of [-bk, 0, fr]) P.push([c.x + ux * a * hw + fx * b, c.z + uz * a * hw + fz * b]);
  return P;
};
// the firs: the planter on paving; the branches (2.95 m x scale) + 1 m clear of walls
for (const t of site.trees) standsWell(`fir ${t.id}`, ring(t.x, t.z, 1.4 * t.scale), { wall: 2.95 * t.scale + 1, trunk: 1.5 + 1.4 * t.scale });
// the chalets: the footprint with the roof overhangs and the propped shutter
for (const [i, c] of (site.chalets ?? []).entries()) standsWell(`chalet ${i}`, rect(c, 1.8, 1.45, 1.35), { wall: 0.5 });
{
  const ch = site.chalets ?? [], fir = site.trees.find((t) => t.id === "stjob");
  const apart = ch.every((a, i) => ch.every((b, j) => i === j || Math.hypot(a.x - b.x, a.z - b.z) >= 3.0));
  const offFir = ch.every((c) => Math.min(...rect(c, 1.8, 1.45, 1.35).map(([x, z]) => Math.hypot(x - fir.x, z - fir.z))) >= 1.4 + 3.0);
  out(ch.length >= 4 && ch.length <= 8 && apart && offFir, `${ch.length} chalets (4-8), >= 3 m apart, >= 3 m off the fir's planter`);
}
// the street garlands
{
  const bad = site.spans.filter((s) => {
    const w = Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2]), H = s.tram ? 7.3 : 6.8, ground = (s.a[1] + s.b[1]) / 2 - H;
    const low = (s.a[1] + s.b[1]) / 2 - s.sag - 0.04 - (s.motif ? 0.75 * 1.76 : 0) - ground;
    return w < 6.9 || w > 26.1 || low < 4.4 || (s.tram && s.motif);
  });
  out(!bad.length, `${site.spans.length} street garlands: 7-26 m wall to wall, >= 4.4 m over the street, no star over a tram (${bad.length} bad)`);
}
// the kit's mesh audit
{
  const info = J("models/christmas/christmas.json"), A = info.audit ?? {};
  const blk = Object.entries(A).filter(([, v]) => v.blocking);
  out(Object.keys(A).length >= 15 && !blk.length, `kit mesh audit: ${Object.keys(A).length} piece levels, ${blk.length ? blk.map(([k, v]) => `${k} ${v.blocking}`).join(", ") : "0 blocking"}`);
}
// the fir's needle cards (rule 19, 2026-11-17: the fir read as flat leaves up close: solid sleeves lit by their own
// surface). The near level (LOD0) carries alpha-tested needle cards (slot fir_cards, canopy normals: checked on the
// decoded GLB by tools/christmas/xmasTest.mjs), the far levels none; the triangle budget per level; the atlas small; every
// ornament clear of the solid foliage and the cards' cores (it may nestle among a card's transparent fringe)
{
  const info = J("models/christmas/christmas.json"), L = info.lods?.tree?.lods ?? [], tp = info.pieces?.tree ?? {}, nd = info.needles;
  const BUDGET = [160000, 45000, 15000], CARDS = [[20000, 80000], [5000, 16000], [0, 0]];
  const cards = L.map((l) => l.slots.includes("fir_cards") ? l.slot_triangles[l.slots.indexOf("fir_cards")] : 0);
  const okBudget = L.length === 3 && L.every((l, k) => l.triangles <= BUDGET[k]);
  out(okBudget && cards.every((c, k) => c >= CARDS[k][0] && c <= CARDS[k][1]),
    `fir: ${L.map((l) => l.triangles).join(" / ")} triangles (budget ${BUDGET.join(" / ")}), needle-card triangles ${cards.join(" / ")} (near 20-80 k, middle shell 5-16 k, far 0)`);
  // FIR ROUND 3 (rule 19): the middle level's shell keeps clear of the ornaments by construction (shortened / left out)
  out((tp.shell_cards ?? 0) >= 1500 && (tp.shell_left_out ?? 1e9) <= 0.2 * (tp.shell_cards ?? 0),
    `fir middle-level shell: ${tp.shell_cards} cards (>= 1500), ${tp.shell_shortened} shortened and ${tp.shell_left_out} left out to clear the ornaments (<= 20 %)`);
  // the 45 m switch from the street (the review renders: near level vs middle level, same spot, same light). Why: the
  // solid fronds read as flat tiers next to the needle crown (claude/xmasfir3). Bounds: the 2026-11-17 fronds' silhouette
  // IoU 0.84 is kept; the foliage brightness within 15 %, colour within 0.05 (chromaticity), the row width within 8 %,
  // the see-through (gaps between the tiers) within 0.03 of the near level's (the fronds' 0.066 vs 0.096 read solid)
  const sw = info.fir_switch?.new;
  out(!!sw && sw.iou >= 0.82 && Math.abs(sw.luminance_ratio - 1) <= 0.15 && sw.chroma_diff <= 0.05 && sw.row_width_err <= 0.08 && Math.abs(sw.see_through_middle - sw.see_through_near) <= 0.03,
    `fir 45 m switch (review renders): silhouette IoU ${sw?.iou} (>= 0.82), foliage brightness x ${sw?.luminance_ratio} (1 +- 0.15), colour diff ${sw?.chroma_diff} (<= 0.05), row width err ${sw?.row_width_err} (<= 0.08), see-through ${sw?.see_through_middle} vs ${sw?.see_through_near} (+- 0.03)`);
  // the cost model re-run for this kit (its card triangles = the kit's) and the shipped switches' estimate at 8 m <= 0.1 ms
  const cf = fs.existsSync(path.join(ROOT, "docs/christmas/fir_cost.json")) ? J("docs/christmas/fir_cost.json").after : null;
  out(!!cf && cf.cards.tris0 === cards[0] && cf.cards.tris1 === cards[1] && cf.shipped.near[8].after <= 0.1,
    `fir cost model (docs/christmas/fir_cost.json): for this kit (${cf?.cards.tris0} / ${cf?.cards.tris1} card triangles), at 8 m ${cf?.shipped.near[8].before} -> ${cf?.shipped.near[8].after} ms (budget 0.1; the browser turn measures it)`);
  out(!!nd && fs.existsSync(path.join(ROOT, "models/christmas", nd.file ?? "-")) && nd.ktx2_bytes <= 1.5 * 1048576 && nd.gpu_bytes_bc7 <= 4 * 1048576 && nd.levels >= 10,
    `fir needle atlas: ${nd?.file} ${nd?.px?.join(" x ")} ${((nd?.ktx2_bytes ?? 0) / 1024).toFixed(0)} KB file, ${((nd?.gpu_bytes_bc7 ?? 0) / 1048576).toFixed(1)} MB on the GPU (<= 4), ${nd?.levels} mip levels`);
  out(tp.ornaments_clear_of_card_cores === (tp.baubles ?? -1) + (tp.bulbs ?? -1),
    `fir: ${tp.ornaments_clear_of_card_cores} of ${(tp.baubles ?? 0) + (tp.bulbs ?? 0)} ornaments clear of the solid foliage and the needle cards' cores`);
}
// the fir's shadow and pre-pass in the viewer (rule 19, fir round 3): the defaults and the shadow layer on the sun
{
  const kitSrc = fs.readFileSync(path.join(ROOT, "viewer/christmas/xmasKit.js"), "utf8"), citySrc = fs.readFileSync(path.join(ROOT, "viewer/christmas/xmasCity.js"), "utf8");
  const ok = /prepass: QS\.get\("firprepass"\) !== "0"/.test(kitSrc) && /shadow: QS\.get\("firshadow"\) === "cards" \? "cards" : "far"/.test(kitSrc)
    && /export const FIR_SHADOW_LEVEL = 2;/.test(citySrc) && /shadow\.camera\.layers\.enable\(XMAS_SHADOW_LAYER\)/.test(citySrc);
  out(ok, "fir: depth pre-pass on by default (?firprepass=0), the shadow from the far level's solid fronds (?firshadow=cards), its layer enabled on the sun's shadow camera");
}
// FIR ROUND 4 (claude/xmas3, docs/CHRISTMAS.md 7.3): the GPU cost at night (debug/xmasPerf.js, timed on GREEN / YELLOW).
// (1) the needle cards are lit by the sun / moon + the sky only (foliage/vertexLight.js foliageLights, as the city's
//     grass, plants and ivy): the night's lamp loop + the two shadowed lamp spots over every card pixel were the cards'
//     cost (the lamps' light on the crown is not seen); ?firlight=old = before.
// (2) the fir's shadow casters at night are NOT a per-frame cost: they are static casters of the sun's cached map (drawn
//     only on its redraws, ~1 frame in 30: 0.03 +- 0.06 ms per redraw measured, ~0.001 ms a frame) and of the lamps'
//     cached maps (never the lamps' per-frame mover layer). They stay at night: the moon casts the city's shadows. A
//     change that made them movers (the group's name matching lighting.js MOVER_TOP, a sunMover flag, the lamps' mover
//     layer 11) would draw them every frame: this row fails then.
// (3) the draws per tree level (christmas.json; + the cards' depth twin + 2 shadow-only copies drawn in the sun's map).
{
  const kitSrc = fs.readFileSync(path.join(ROOT, "viewer/christmas/xmasKit.js"), "utf8"), citySrc = fs.readFileSync(path.join(ROOT, "viewer/christmas/xmasCity.js"), "utf8");
  out(/cards: QS\.get\("firlight"\) !== "old"/.test(kitSrc) && /slot === "fir_cards"\) \{ const L = foliageLights\(\); if \(L\) m\.lightsNode = L;/.test(kitSrc),
    "fir light: the needle cards lit by the sun / moon + the sky only by default (foliageLights; ?firlight=old: every scene light)");
  const lightSrc = fs.readFileSync(path.join(ROOT, "viewer/lighting.js"), "utf8"), nightSrc = fs.readFileSync(path.join(ROOT, "viewer/nightLights/cityNight.js"), "utf8");
  const mt = /const MOVER_TOP = \/(.*)\/;/.exec(lightSrc), moverTop = mt ? new RegExp(mt[1]) : null;
  const grp = /this\.group = new THREE\.Group\(\); this\.group\.name = "(\w+)"/.exec(citySrc)?.[1];
  const dir = path.join(ROOT, "viewer/christmas"), xsrc = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
  const lampMover = /const MOVER_LAYER = (\d+);/.exec(nightSrc)?.[1];
  const staticOk = !!moverTop && !!grp && !moverTop.test(grp) && !/sunMover/.test(xsrc) && !!lampMover && !new RegExp(`layers\\.(set|enable)\\((${lampMover}|MOVER_LAYER)\\)`).test(xsrc);
  out(staticOk, `fir shadow at night: the casters are static in the sun's cache (group "${grp}" not a mover by lighting.js MOVER_TOP, no sunMover) and never on the lamps' mover layer ${lampMover}: drawn on cache redraws only, not per frame`);
  // (4) the probe's timing is not the render scale's (the first numbers moved +-0.3 ms with dynres' steps): run() and
  //     lightAB() pin the scale before timing and give it back after
  const probe = fs.readFileSync(path.join(ROOT, "debug/xmasPerf.js"), "utf8");
  const fnBody = (name) => { const i = probe.indexOf(`export async function ${name}(`); return i < 0 ? "" : probe.slice(i, probe.indexOf("\nexport ", i + 10) < 0 ? undefined : probe.indexOf("\nexport ", i + 10)); };
  out(["run", "lightAB"].every((f) => /const unpin = pinScale\(\)/.test(fnBody(f)) && /unpin\(\)/.test(fnBody(f))) && /U\.setScale\(s, \{ dynres: false \}\)/.test(probe),
    "fir perf probe: run() and lightAB() pin the render scale (dynres off) for the timing, restored after");
  const info = J("models/christmas/christmas.json"), L = info.lods?.tree?.lods ?? [], DRAWS = [9, 9, 5];
  out(L.length === 3 && L.every((l, k) => l.draws <= DRAWS[k]), `fir draws per level ${L.map((l) => l.draws).join(" / ")} (budget ${DRAWS.join(" / ")}; + the cards' depth twin on the card levels, + 2 shadow-only copies in the sun's map)`);
}
// THE SITE FITS THE CURRENT CITY (rule xmas-fit-current-city, claude/xmas1: tools/christmas/siteFit.mjs). site.json is
// baked; the data under it moves (street-life extras, scripted models hiding UrbIS solids, curated wide fronts). Fronts
// = the current street life's (complete, unmoved, on a drawn wall); every swag run inside the front the shop kit DRAWS
// (one helper: shopLayout.js frontFace / frontWidth; the Carrefour's 18 m and a synthetic 18 m front); wreaths on current
// address points of drawn house walls, >= 3 m from every shop; spans hooked on drawn walls at their height, never on a
// hidden solid or across a park fence; the firs and chalets clear of the street lamps and park fences
{
  const { siteFit } = await import(new URL("../christmas/siteFit.mjs", import.meta.url).href);
  const { rows } = await siteFit(site);
  for (const r of rows) out(r.ok, `site fit: ${r.msg}`);
}
// BOOT PRIORITY (rule xmas-low-priority, claude/xmas2, plan job 3): from 1 December every visitor downloads the layer;
// every fetch under viewer/christmas/ carries XMAS_FETCH (priority "low"), every three.js loader there is set to it (a
// loader's own fetch is High by default), the shared KTX2 loader is never asked to load (its priority is the ground's);
// main.js starts addChristmas only through bootGate.js whenXmasNeeded (after the cover unless a decorated area is in the
// boot's ring), whose areas match site.json select.areas
{
  const dir = path.join(ROOT, "viewer/christmas");
  const src = Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]));
  const kit = src["xmasKit.js"] ?? "";
  out(/export const XMAS_FETCH = \{ priority: "low" \}/.test(kit), "boot: XMAS_FETCH is { priority: \"low\" } (viewer/christmas/xmasKit.js)");
  const bad = [];
  for (const [f, t] of Object.entries(src)) {
    for (const m of t.matchAll(/\bfetch\(/g)) {
      let d = 0, i = m.index + 6;                      // the call's own argument list
      for (; i < t.length; i++) { if (t[i] === "(") d++; else if (t[i] === ")") { if (d === 0) break; d--; } }
      if (!/XMAS_FETCH/.test(t.slice(m.index, i))) bad.push(`${f}: fetch at line ${t.slice(0, m.index).split("\n").length}`);
    }
    for (const m of t.matchAll(/new (\w*Loader)\(\)[^;\n]*/g)) if (!/setPriority\(XMAS_FETCH\.priority\)/.test(m[0])) bad.push(`${f}: ${m[1]} without setPriority(XMAS_FETCH.priority)`);
    if (/ktxLoader\([^)]*\)\.load(Async)?\(/.test(t)) bad.push(`${f}: the shared KTX2 loader's load() (fetch the bytes with XMAS_FETCH, then parse)`);
  }
  out(!bad.length, `boot: every Christmas fetch / loader at low priority${bad.length ? `: ${bad.join("; ")}` : ""}`);
  const main = fs.readFileSync(path.join(ROOT, "viewer/main.js"), "utf8"), gate = fs.readFileSync(path.join(ROOT, "viewer/bootGate.js"), "utf8");
  const calls = [...main.matchAll(/addChristmas\(\{/g)].map((m) => main.slice(Math.max(0, m.index - 160), m.index));
  out(calls.length > 0 && calls.every((c) => /whenXmasNeeded\(\)\.then\(\(\) => $/.test(c)), "boot: main.js starts addChristmas only after bootGate.js whenXmasNeeded()");
  const am = /export const XMAS_AREAS = (\[\[[^;]*\]\]);/.exec(gate);
  const areas = am ? JSON.parse(am[1]) : [];
  const want = (site.select?.areas ?? []).map((a) => [a.centre[0], a.centre[1], a.radius]);
  out(want.length > 0 && JSON.stringify(areas) === JSON.stringify(want), `boot: bootGate.js XMAS_AREAS = site.json select.areas (${JSON.stringify(areas)} vs ${JSON.stringify(want)})`);
}
// (no light, no DynamicDrawUsage in viewer/christmas/: the meta row, tools/audit/gate.d/xmas.mjs)
console.log(fails ? `xmasCheck: ${fails} FAIL` : "xmasCheck: all PASS");
process.exit(fails ? 1 : 0);
