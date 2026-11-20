// THE FIR'S COST MODEL (offline, no GPU; docs/CHRISTMAS.md "FIR ROUND 3"):
//
//   node tools/christmas/firCost.mjs [--raw models/christmas/christmas.raw.glb] [--out docs/christmas/fir_cost.json]
//                                    [--label new] [--cull]   (--cull: the hidden-card visibility sweep, ~1-2 min)
//
// The fir drawn by tools/christmas/firRaster.mjs (a software rasterizer: alpha-tested cards, depth buffer, 2 x 2 quads)
// from the street (eye 1.7 m, the game's 55 deg lens, 1920 x 1080) at 8 / 21 / 45 m (the near level, LOD0) and
// 45 / 60 / 100 m (the middle level, LOD1), and from the low December sun into the sun's shadow map (2.9 cm texels: the
// street-level box, viewer/lighting.js levels[0] = 60 m over 4096 px). Counted per option:
//   lanes FULL  = the fragment lanes that run the lit card shader (PBR + shadow PCF + IBL + weather + snow),
//   lanes CHEAP = lanes of a depth-only shader (position + the atlas' alpha tap + discard: a pre-pass or shadow pass),
//   layers      = card fragments over the card pixels finally seen (depth complexity),
//   vertices    = card vertices per pass.
// GPU ms = lanes x a per-lane cost CALIBRATED on the browser turn of 2026-11-17 (GREEN-ish, Place Saint-Job, 8 m: the
// needle cards +0.26 ms of which the cards' shadow +0.05-0.07: the lit pass ~0.20 ms for the 8 m lanes of the single
// alpha-tested pass); a depth-only lane costs CHEAP_RATIO of a lit lane (an assumption: one tap + a discard against
// ~ 5 PCF taps, IBL, the weather nodes; to be measured by the browser turn).
// Options ranked: P the depth PRE-PASS (twin + EQUAL-depth lit pass), S the shadow from the middle level's solid fronds,
// C hidden-card cull, X fewer crossing cards (70 -> 55 %), M a mip bias (texels per pixel: which atlas level is read).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGlb, decodePNG, alphaMask, makeSet, perspView, orthoView, rasterize } from "./firRaster.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const RAW = path.resolve(ROOT, arg("--raw", "models/christmas/christmas.raw.glb"));
const OUT = arg("--out", null), LABEL = arg("--label", "current"), CULL = process.argv.includes("--cull");
const ATLAS = path.join(ROOT, "data/raw/textures/christmas/fir_needles_atlas.png");
const W = 1920, H = 1080, FOV = 55, EYE = 1.7;
const CAL = { ms: 0.20, at: 8 }, CHEAP_RATIO = 0.2;
// (the measured shadow share, +0.05-0.07 ms at 8 m with the card shadows: per redraw of the sun's static cache)
const SHADOW_MEASURED = 0.06;

const M = readGlb(RAW);
const A = alphaMask(decodePNG(ATLAS));
const t0 = performance.now();
/** the shipped card order (tools/christmas_pack.mjs outerFirst: triangles far from the trunk first) */
function outerFirst(m) {
  const n = m.I.length / 3, r = new Float32Array(n), ord = Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < n; t++) { let x = 0, z = 0; for (let q = 0; q < 3; q++) { const v = m.I[t * 3 + q]; x += m.P[v * 3]; z += m.P[v * 3 + 2]; } r[t] = Math.hypot(x, z) / 3; }
  ord.sort((a, b) => r[b] - r[a]);
  const I = new Uint32Array(m.I.length); ord.forEach((t, i) => { I[i * 3] = m.I[t * 3]; I[i * 3 + 1] = m.I[t * 3 + 1]; I[i * 3 + 2] = m.I[t * 3 + 2]; });
  return { ...m, I };
}
const levelSets = (node, { drop = 0, keep = null } = {}) => {
  const prims = M[node];
  if (!prims) return null;
  const opaque = prims.filter((p) => p.slot !== "fir_cards").map((p) => makeSet(p));
  const cp0 = prims.find((p) => p.slot === "fir_cards"), cp = cp0 && outerFirst(cp0);
  let cards = cp ? makeSet(cp, { cards: true }) : null;
  if (cards && (drop || keep)) {
    // (X: a seeded share of the cards removed; C: only the cards in `keep`)
    let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const off = new Uint8Array(cards.ncards); for (let i = 0; i < off.length; i++) off[i] = keep ? (keep[i] ? 0 : 1) : rnd() < drop ? 1 : 0;
    const triCard = cards.card;
    cards = makeSet(cp, { cards: true, keepTri: (t) => !off[triCard[t]] });
  }
  return { opaque, cards };
};
/** the tree from the street at distance d */
function street(L, d) {
  const v = perspView([0, EYE, d], [0, Math.min(5.2, 1.7 + 0.35 * d), 0], FOV, W, H);
  const r = rasterize(v, [...L.opaque, ...(L.cards ? [L.cards] : [])], { alpha: A });
  const c = L.cards ? r.sets.at(-1) : null;
  return { covered: r.covered, cards: c && { tris: c.tris, verts: c.verts, fragAll: c.fragAll, fragZ: c.fragZ, quadAll: c.quadAll, quadZ: c.quadZ, quadEq: c.quadEq, vis: c.vis, layers: +(c.fragZ / Math.max(1, c.vis)).toFixed(2), layersAll: +(c.fragAll / Math.max(1, c.vis)).toFixed(2) } };
}
/** the tree into the sun's shadow map (sun from the south-south-west, `elev` deg; 2.9 cm texels) */
function sunPass(sets, elev = 15) {
  const e = (elev * Math.PI) / 180, az = (200 * Math.PI) / 180;
  const dir = [Math.sin(az) * Math.cos(e), Math.sin(e), Math.cos(az) * Math.cos(e)];
  const v = orthoView(dir, [0, 5, 0], 8, Math.round(16 / 0.0293));
  const r = rasterize(v, sets, { alpha: A });
  const sum = (k) => r.sets.reduce((s, x) => s + x[k], 0);
  return { texels: r.covered, lanes: sum("quadZ"), fragAll: sum("fragAll"), cardLanes: r.sets.filter((_, i) => sets[i].cards).reduce((s, x) => s + x.quadZ, 0) };
}
/** the mip level read at distance d (the card's atlas cell: 512 px across ~0.3 m of a spray at the near level) */
const mipAt = (d, cardWidthM = 0.17, cellPx = 512) => { const px = (cardWidthM / d) * (H / 2) / Math.tan((FOV * Math.PI) / 360); return +Math.max(0, Math.log2(cellPx / px)).toFixed(1); };

const L0 = levelSets("tree"), L1 = levelSets("tree__lod1");
const res = { label: LABEL, raw: path.relative(ROOT, RAW).replace(/\\/g, "/"), screen: [W, H], fovY: FOV, eye: EYE, calibration: { ...CAL, cheapRatio: CHEAP_RATIO, shadowMeasured: SHADOW_MEASURED },
  near: {}, middle: {}, shadow: {}, options: {}, cards: { lod0: L0.cards?.ncards ?? 0, lod1: L1?.cards?.ncards ?? 0, tris0: L0.cards ? L0.cards.I.length / 3 : 0, tris1: L1?.cards ? L1.cards.I.length / 3 : 0 } };
for (const d of [8, 21, 45]) res.near[d] = street(L0, d);
for (const d of [45, 60, 100]) res.middle[d] = L1 ? street(L1, d) : null;
const kFull = CAL.ms / res.near[CAL.at].cards.quadZ;            // ms per lit lane (from the single alpha-tested pass at 8 m)
const ms = (full, cheap = 0) => +(full * kFull + cheap * kFull * CHEAP_RATIO).toFixed(3);
// ---- the shadow pass: the casters of viewer/christmas/xmasCity.js SHADOW_SLOTS (the tree: fir_cards, fir_needles,
// fir_bark): the near level's (cards + twigs + the inner cone, as before) vs the middle level's solid fronds + trunk
const CAST = new Set(["fir_cards", "fir_needles", "fir_bark"]);
const shCards = sunPass([...L0.opaque.filter((s) => CAST.has(s.slot)), L0.cards]);
// (the far level's solid fronds + trunk: what the shadow-only copies draw for every level since fir round 3)
const L2 = levelSets("tree__lod2");
const shProxy = L2 ? sunPass(L2.opaque.filter((s) => CAST.has(s.slot))) : null;
res.shadow = { sunElevDeg: 15, texelCm: 2.93, cards: shCards, proxy: shProxy };
const shScale = SHADOW_MEASURED / shCards.lanes;               // ms per shadow lane as measured (the cache's redraw rate folded in)
// ---- the options per distance
for (const d of [8, 21, 45]) {
  const c = res.near[d].cards;
  res.options[d] = {
    single_pass: { full: c.quadZ, cheap: 0, ms: ms(c.quadZ) },
    P_prepass: { full: c.quadEq, cheap: c.quadZ, ms: ms(c.quadEq, c.quadZ) },
    M_mip: { mipLevel: mipAt(d), note: "the atlas level read; a bias only matters closer than ~1 m (level < 1)" },
  };
}
res.options.S_shadow = { cards_lanes: shCards.lanes, proxy_lanes: shProxy?.lanes ?? null, ms_cards: SHADOW_MEASURED, ms_proxy: shProxy ? +(shProxy.lanes * shScale * 0.6).toFixed(3) : null,
  note: "proxy lanes are opaque (no discard: early depth, no alpha tap): x 0.6 of an alpha-tested shadow lane (assumption)" };
// X: fewer crossing cards (70 -> 55 %: ~ 1 card in 8 fewer at the side branchlets)
{
  const LX = levelSets("tree", { drop: 0.12 });
  const x = {}; for (const d of [8, 21]) { const c = street(LX, d).cards; x[d] = { full: c.quadZ, quadEq: c.quadEq, ms_single: ms(c.quadZ), ms_prepass: ms(c.quadEq, c.quadZ) }; }
  res.options.X_fewer_crossing = { cards: LX.cards.ncards, ...x };
}
// C: the hidden-card cull (every card no sampled eye round the tree sees: rings at 2-40 m, 1.7-14 m high, 10 px / deg)
if (CULL) {
  const maxV = new Uint32Array(L0.cards.ncards); let views = 0;
  const shoot = (eye, tgt, fov) => { const n = Math.round(fov * 10); const r = rasterize(perspView(eye, tgt, fov, n, n), [...L0.opaque, L0.cards], { alpha: A, perCard: true }); const pc = r.sets.at(-1).perCard; for (let i = 0; i < pc.length; i++) if (pc[i] > maxV[i]) maxV[i] = pc[i]; views++; };
  for (const [d, h, n] of [[2.0, 1.7, 36], [3.5, 1.7, 36], [6, 1.7, 36], [6, 6, 24], [10, 1.7, 24], [10, 6, 24], [10, 12, 24], [20, 1.7, 24], [20, 10, 16], [40, 1.7, 16], [4, 14, 12]]) for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n, eye = [Math.sin(a) * d, h, Math.cos(a) * d];
    if (d < 5 && h < 5) { shoot(eye, [0, 1.2, 0], 80); shoot(eye, [0, 9, 0], 80); }
    else shoot(eye, [0, 4.8, 0], Math.min(100, Math.max(12, (2 * Math.atan(7 / d) * 180) / Math.PI)));
  }
  const keep = Array.from(maxV, (v) => v > 0);
  const LC = levelSets("tree", { keep });
  const x = {}; for (const d of [8, 21]) { const c = street(LC, d).cards; x[d] = { full: c.quadZ, ms_single: ms(c.quadZ), ms_prepass: ms(c.quadEq, c.quadZ) }; }
  res.options.C_cull_hidden = { views, hidden: keep.filter((k) => !k).length, of: keep.length, ...x };
}
// the SHIPPED configuration's estimate: the pre-pass (cards) + the far level's shadow; per level and distance
const shMs = res.options.S_shadow.ms_proxy ?? SHADOW_MEASURED;
res.shipped = { note: "lit pass + pre-pass (model) + the shadow share (measured 0.06 ms for the cards' shadow, scaled by lanes); vertex work not modelled (the 21 m measurement: ~0)", near: {}, middle: {} };
for (const d of [8, 21, 45]) res.shipped.near[d] = { before: +(res.options[d].single_pass.ms + SHADOW_MEASURED).toFixed(3), after: +(res.options[d].P_prepass.ms + shMs).toFixed(3) };
for (const d of [45, 60, 100]) { const c = res.middle[d]?.cards; if (c) res.shipped.middle[d] = { single: ms(c.quadZ), prepass: ms(c.quadEq, c.quadZ) }; }
res.seconds = +((performance.now() - t0) / 1000).toFixed(1);

// ---- print
const f = (n) => (n / 1e6).toFixed(2) + " M";
console.log(`fir cost model (${LABEL}: ${res.raw}), ${W} x ${H}, ${FOV} deg, eye ${EYE} m; lit lanes ${(kFull * 1e6).toFixed(3)} ms per million (calibrated: ${CAL.ms} ms at ${CAL.at} m), depth-only lane x ${CHEAP_RATIO}`);
console.log(`cards: LOD0 ${res.cards.lod0} (${res.cards.tris0} tris), LOD1 ${res.cards.lod1} (${res.cards.tris1} tris)`);
for (const [lv, R] of [["near (LOD0)", res.near], ["middle (LOD1)", res.middle]]) for (const [d, r] of Object.entries(R)) {
  if (!r?.cards) { console.log(`${lv} ${d} m: no cards (tree pixels ${r?.covered ?? 0})`); continue; }
  const c = r.cards;
  console.log(`${lv} ${String(d).padStart(3)} m: tree px ${r.covered}, card px seen ${c.vis}, card frags ${f(c.fragAll)} (${c.layersAll} layers), pass depth test ${f(c.fragZ)} (${c.layers} layers); lanes single-pass ${f(c.quadZ)}, pre-pass ${f(c.quadZ)} cheap + ${f(c.quadEq)} lit -> ${ms(c.quadZ)} vs ${ms(c.quadEq, c.quadZ)} ms`);
}
console.log(`shadow (sun 15 deg, 2.9 cm): cards + twigs + cone ${f(shCards.lanes)} lanes (${shCards.texels} texels) ${shProxy ? `vs the far level's solid fronds + trunk ${f(shProxy.lanes)} lanes` : ""}`);
for (const d of [8, 21, 45]) { const o = res.options[d]; console.log(`${d} m: P ${o.single_pass.ms} -> ${o.P_prepass.ms} ms; mip level read ${o.M_mip.mipLevel}`); }
console.log(`X fewer crossing (-12 % cards): ${JSON.stringify(res.options.X_fewer_crossing)}`);
if (res.options.C_cull_hidden) console.log(`C hidden cull: ${JSON.stringify(res.options.C_cull_hidden)}`);
console.log(`(${res.seconds} s)`);
console.log(`shipped estimate: ${JSON.stringify(res.shipped.near)}; middle level cards ${JSON.stringify(res.shipped.middle)}`);
if (OUT) {
  const file = path.resolve(ROOT, OUT), prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  prev[LABEL] = res; fs.writeFileSync(file, JSON.stringify(prev, null, 1));
  console.log(`wrote ${OUT} [${LABEL}]`);
}
