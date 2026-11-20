// CENSUS CLASS J: THIN BARS (claude/jitter 2026-11-18; owner playtest: "gates, fences and window grilles jitter /
// shimmer when the camera moves"; docs/JITTER.md). Every thin-bar source the city draws, its strokes counted by their
// projected width at the distances the city shows them, and how they are drawn.
//
//   stroke   a connected part (welded) of a piece whose width 4V / A is under 3 cm, elongated, not a plate
//            (viewer/thinBars.js strokes(): square bar = its side, round bar = its diameter, flat bar ~ between its sides)
//   subpx    a stroke drawn AS GEOMETRY somewhere it projects under 1 internal px (PXM = 622 px/m at 1 m: 1080 x 0.6
//            rows, fov 55, the TAAU at Auto's floor) = at the far end of the colour range its LOD is drawn over
//   sources  garden ironwork (models/gardens/gardens.glb, 9 pieces x 3 LODs; instances from data/gardens), the façade kit
//            (models/facadekit/kit.{json,bin}: balconies, balconnets, grilles, glazing bars), the heroes' GLBs (report
//            only), the pre-filtered ones listed (Lycée railing, rail fences, wires, painted grilles)
//   modes    new (the default: viewer/thinBars.js ironPlan / kitPlan, what gardenKit.js / kitField.js draw) and old
//            (?jitter=old: the modelled bars over every LOD's range)
//
//   node tools/audit/census/thinBars.mjs [--old] [--heroes] [--json FILE] [--quiet]
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, imp } from "./lib_mesh.mjs";

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };

const TB = await imp("viewer/thinBars.js");
const { readGlb } = await import(pathToFileURL(join(ROOT, "tools/mesh_audit/glb.mjs")).href);

/** merge parts -> { pos, index } */
function mergeParts(parts) {
  let nv = 0, ni = 0; for (const p of parts) { nv += p.positions.length / 3; ni += p.index.length; }
  const pos = new Float32Array(nv * 3), index = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of parts) { pos.set(p.positions, v * 3); for (let k = 0; k < p.index.length; k++) index[i + k] = p.index[k] + v; v += p.positions.length / 3; i += p.index.length; }
  return { pos, index };
}
const thinOf = (pos, index, keep = null) => TB.strokes(pos, index, TB.components(pos, index), keep).filter((s) => s.thin).map((s) => s.w);
const subPx = (ws, d) => ws.filter((w) => TB.px(w, d) < 1).length;

// ------------------------------------------------------------------------------------------------ garden ironwork
export async function gardenCensus(old) {
  const g = await readGlb(join(ROOT, "models/gardens/gardens.glb"));
  const by = {};
  for (const p of g.parts) (by[p.node] ??= []).push(p);
  // instances from the data (modules of 1 m along every railed segment, gates, two leaves a driveway gate)
  const inst = {};
  const dir = join(ROOT, "data/gardens");
  for (const f of existsSync(dir) ? readdirSync(dir).filter((f) => /^[A-Z]\d+\.json$/.test(f)) : []) {
    const doc = JSON.parse(readFileSync(join(dir, f), "utf8")), styles = doc.styles || [];
    for (const s of doc.segs || []) {
      const st = styles[s[6]] || {};
      if (!(st.rail >= 0 && st.railH > 0)) continue;
      const k = `rail_${["spear", "flat", "rings"][st.rail]}`;
      inst[k] = (inst[k] || 0) + Math.max(1, Math.round(Math.hypot(s[3] - s[0], s[5] - s[2])));
    }
    for (const gt of doc.gates || []) {
      const st = styles[gt[7]] || {}, type = ["spear", "flat", "rings"][st.rail >= 0 ? st.rail : 0];
      const k = gt[5] === 0 ? `gate_${type}` : `cargate_${type}`;
      inst[k] = (inst[k] || 0) + (gt[5] === 0 ? 1 : 2);
    }
  }
  const rows = [];
  for (const piece of ["rail", "gate", "cargate"]) for (const type of ["spear", "flat", "rings"]) {
    const name = `${piece}_${type}`, plan = TB.ironPlan(piece, old);
    const lods = [0, 1, 2].map((l) => { const { pos, index } = mergeParts(by[`${name}_lod${l}`]); return thinOf(pos, index); });
    const row = { source: "garden ironwork", piece: name, instances: inst[name] || 0, strokes: lods.map((w) => w.length), minW: +Math.min(...lods.flat()).toFixed(4), drawn: [], subpx: 0 };
    for (const d of plan.geometry) {
      const n = subPx(lods[d.lod], d.colour[1]);
      row.drawn.push(`LOD${d.lod} geometry ${d.colour[0]}-${d.colour[1]} m (${n} of ${lods[d.lod].length} strokes < 1 px at ${d.colour[1]} m)`);
      row.subpx += n;
    }
    if (plan.card) row.drawn.push(`coverage card ${plan.card.colour[0]}-${plan.card.colour[1]} m (blended, box-mipped atlas)`);
    row.cityInst = row.subpx * row.instances;
    rows.push(row);
  }
  return rows;
}

// ------------------------------------------------------------------------------------------------ façade kit
export function kitGeometry() {
  const json = JSON.parse(readFileSync(join(ROOT, "models/facadekit/kit.json"), "utf8"));
  const buf = readFileSync(join(ROOT, "models/facadekit/kit.bin"));
  const bin = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const out = {};
  for (const [name, p] of Object.entries(json.pieces)) {
    out[name] = { mode: p.slice || p.kind, lods: p.lods.map((lod) => {
      const s = lod.opaque; if (!s) return null;
      const n = s.vCount; let o = s.vOff;
      const pos = new Float32Array(bin.slice(o, o + n * 12)); o += n * 12 * 2 + n * 8;
      const kv = new Uint8Array(bin.slice(o, o + n * 4)); o += n * 4;
      const kw = new Uint8Array(bin.slice(o, o + n * 4));
      const index = s.i32 ? new Uint32Array(bin.slice(s.iOff, s.iOff + s.iCount * 4)) : new Uint16Array(bin.slice(s.iOff, s.iOff + s.iCount * 2));
      return { pos, index, kv, kw };
    }) };
  }
  return { json, geo: out };
}
export function kitRangesFromSource() {
  const kitFade = readFileSync(join(ROOT, "viewer/facadeKit/kitFade.js"), "utf8");
  const num = (k) => +kitFade.match(new RegExp(k + ": uniform[(]([0-9.]+)[)]"))[1];
  return { far: num("far"), band: num("band"), lod1: num("lod1"), lodBand: num("lodBand") };
}
export function kitCensus(old, baked = null) {
  const { json, geo } = kitGeometry();
  const R = kitRangesFromSource(), plan = TB.kitPlan(R, old);
  const K = baked || TB.kitCards(geo, json);
  const rows = [];
  for (const [name, P] of Object.entries(geo)) {
    const row = { source: "façade kit", piece: name, strokes: [], carded: [], minW: Infinity, drawn: [], subpx: 0, cardedSubpx: 0 };
    P.lods.forEach((g, l) => {
      if (!g) return;
      const cc = TB.components(g.pos, g.index), S = TB.strokes(g.pos, g.index, cc);
      const F = K.flags[name]?.[l], cardedC = new Set();
      if (F && !old) for (let i = 0; i < F.length; i++) if (F[i]) cardedC.add(cc.comp[i]);
      const thin = S.map((s, i) => ({ ...s, i })).filter((s) => s.thin);
      row.strokes.push(thin.length);
      row.carded.push(thin.filter((s) => cardedC.has(s.i)).length);
      for (const s of thin) row.minW = Math.min(row.minW, s.w);
      const r = plan.lods[l];
      const end = (s) => (!cardedC.has(s.i) ? r.colour[1] : r.carded === "strokeEnd" ? TB.strokeEnd(s.w) : r.carded[1]);
      const sub = thin.filter((s) => end(s) > 0 && TB.px(s.w, end(s)) < 1);
      row.subpx += sub.length;
      row.cardedSubpx += sub.filter((s) => cardedC.has(s.i)).length;
      row.drawn.push(`LOD${l} ${r.colour[0]}-${r.colour[1]} m${cardedC.size ? ` (carded strokes to ${r.carded === "strokeEnd" ? "1.3 px (" + TB.CARD_IN[1] + TB.BAND + "-" + TB.KIT_END_MAX + " m)" : r.carded[1] + " m"}, card ${plan.card[0]}-${plan.card[1]} m)` : ""}: ${sub.length} of ${thin.length} strokes < 1 px as geometry`);
    });
    row.minW = row.minW === Infinity ? null : +row.minW.toFixed(4);
    if (row.strokes.some((n) => n)) rows.push(row);
  }
  return { rows, kept: K.stats.kept, stats: K.stats };
}

// ------------------------------------------------------------------------------------------------ heroes (report only)
async function heroCensus() {
  const { HERO_LIST, levelsOf } = await import("./openMeshes.mjs");
  const rows = [];
  for (const name of HERO_LIST) {
    const f = join(ROOT, "models", name + ".glb");
    if (!existsSync(f)) continue;
    const g = await readGlb(f);
    const L = levelsOf([...new Set(g.parts.map((p) => p.node))]);
    const per = {};
    for (const [lv, keep] of Object.entries(L)) {
      const { pos, index } = mergeParts(g.parts.filter((p) => keep(p.node)));
      const ws = thinOf(pos, index);
      per["L" + lv] = { strokes: ws.length, at20: subPx(ws, 20), at60: subPx(ws, 60) };
    }
    rows.push({ source: "hero", piece: name.split("/")[0], per });
  }
  return rows;
}

const LISTED = [
  ["Lycée Français railing + gate (viewer/lyceeFront.js)", "pre-filtered: analytic coverage card (filteredPulse), blended; modelled bars 0-6 m (claude/lycee)"],
  ["railway line fences (viewer/rail/railway.js)", "analytic coverage card (filteredPulse), alpha to coverage (the TAAU's stochastic coverage): pre-filtered"],
  ["tram / rail wires (thinWire, viewer/upscale.js)", "ribbon >= 1.2 internal px, alpha = true width, blended: pre-filtered"],
  ["painted façade bars / glazing (viewer/facades.js)", "box-filtered in the shader (filteredPulse): pre-filtered"],
  ["bridge deck railings (viewer/streets/bridgeDecks.js)", "3.5-6 cm rails + 6 cm posts every 1.5 m: no bar rows (1 px at 37-62 m); geometry"],
];

const IS_MAIN = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (IS_MAIN) {
  const OLD = flag("--old"), QUIET = flag("--quiet");
  const out = { mode: OLD ? "old" : "new", pxm: +TB.PXM.toFixed(1), garden: await gardenCensus(OLD), kit: null };
  const KC = kitCensus(OLD); out.kit = KC.rows; out.kitKept = KC.kept; out.kitBake = { ...KC.stats, kept: KC.kept.length };
  if (flag("--heroes")) out.heroes = await heroCensus();
  const gSub = out.garden.reduce((s, r) => s + r.subpx, 0), gCity = out.garden.reduce((s, r) => s + r.cityInst, 0), kSub = out.kit.reduce((s, r) => s + r.subpx, 0);
  out.totals = { gardenSubpx: gSub, gardenCityStrokes: gCity, kitSubpx: kSub, kitCardedSubpx: out.kit.reduce((s, r) => s + r.cardedSubpx, 0) };
  if (!QUIET) {
    console.log(`thin-bar census (${out.mode}), PXM ${out.pxm} px/m at 1 m; a stroke < 1 px where drawn as geometry = subpx`);
    for (const r of out.garden) console.log(`  garden ${r.piece.padEnd(15)} ${String(r.instances).padStart(6)} inst  strokes ${r.strokes.join("/")}  min ${(r.minW * 1000).toFixed(1)} mm  subpx ${r.subpx}  (x inst ${r.cityInst})\n      ${r.drawn.join("\n      ")}`);
    for (const r of out.kit) console.log(`  kit    ${r.piece.padEnd(15)} strokes ${r.strokes.join("/")} (carded ${r.carded.join("/")})  min ${r.minW === null ? "-" : (r.minW * 1000).toFixed(1)} mm  subpx ${r.subpx}\n      ${r.drawn.join("\n      ")}`);
    if (!OLD) for (const k of out.kitKept) console.log(`  kit stroke kept as geometry: ${k.piece} ${(k.w * 1000).toFixed(0)} mm at ${k.at.join(", ")} (${k.why})`);
    for (const r of out.heroes || []) console.log(`  hero   ${r.piece.padEnd(15)} ${Object.entries(r.per).map(([k, v]) => `${k} ${v.strokes} strokes (< 1 px: ${v.at20} at 20 m, ${v.at60} at 60 m)`).join("; ")}`);
    for (const [a, b] of LISTED) console.log(`  listed ${a}: ${b}`);
  }
  console.log(`totals (${out.mode}): garden subpx strokes ${gSub} per piece set, ${gCity} city-wide (x instances); kit subpx strokes ${kSub} (${out.totals.kitCardedSubpx} in carded parts)`);
  if (opt("--json", null)) writeFileSync(opt("--json"), JSON.stringify(out, null, 1));
}
