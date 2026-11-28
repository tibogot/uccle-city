// THE CHRISTMAS LAYER'S LOAD, COUNTED (claude/xmasperf4, rule xmas-pass-budget; gate row `xmasload`).
//   node --import ./tools/christmas/hook.mjs tools/christmas/xmasLoad.mjs [--root <checkout>] [--json] [--write]
// The layer's GPU cost follows what it draws: how many of each piece the site places, the triangles of each level, the
// draws (one per piece x level x slot x solid / fade set) and the passes they draw in. On 2026-11-28 the timed probe
// (debug/xmasPerf.js) read ~4x its 24 Nov numbers; the 24 Nov code itself read the same on the hot laptop, so most of
// it was the GPU's state, not code. What DID grow, silently, was content: the shopfront swags are sized to the fronts
// the shop kit draws (xmasSwag.js swagRun: frontFace / frontWidth), so shop-data rounds that widened or curated fronts
// added swag modules to the layer, and the pole garlands came in (claude/xmas4). Nothing guarded that count.
// This counts the load the way viewer/christmas/xmasCity.js builds it (the same site.json, poles.json, terraces.json,
// per-street switches and swagRun) and checks it against models/christmas/load_budget.json (ceilings, committed). A
// change that adds load must raise the ceiling in the same commit, with a re-measure (docs/CHRISTMAS.md 7.7).
// --write: write the current load as the budget (ceilings = the counts + the headroom below). Exit 1 on any overrun.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg("root", HERE));
const J = (p, d) => { const f = path.join(ROOT, p); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : d; };
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
/** headroom of a written budget: counts +5 %, triangles +5 % (a re-bake's rounding), never less than +2 */
export const HEADROOM = 0.05;

export async function load({ mutate = null } = {}) {
  const site = J("models/christmas/site.json");
  if (mutate === "fronts-twice") site.fronts = [...site.fronts, ...site.fronts];
  const kit = J("models/christmas/christmas.json"), poles = J("models/christmas/poles.json", null);
  const curated = J("data/shops/terraces.json", {}).terraces ?? {};
  const { swagRun } = await imp("viewer/christmas/xmasSwag.js");
  const { hash01 } = await imp("viewer/streetlife/layout.js");
  const on = (street, what) => site.config?.streets?.[street]?.[what] ?? true;
  let swags = 0, swagFronts = 0;
  for (const f of site.fronts ?? []) { if (!on(f.street, "swags")) continue; const n = swagRun(f, curated[f.id], hash01).modules.length; swags += n; swagFronts++; }
  const spans = (site.spans ?? []).filter((s) => on(s.street, "spans"));
  const pg = (poles?.spans ?? []).filter((s) => on(s.street, "spans"));
  const count = {
    tree: (site.trees ?? []).length,
    chalet: site.config?.chalets === false ? 0 : (site.chalets ?? []).length,
    swag: swags,
    wreath: (site.wreaths ?? []).filter((w) => on(w.street, "wreaths")).length,
    spanmotif: spans.filter((s) => s.motif && !s.tram).length + pg.filter((s) => s.motif).length,
    spans: spans.length,
    poleSpans: pg.length,
  };
  const lods = kit.lods ?? {};
  const tris0 = {}, draws = {};
  let trisLod0 = 0, drawsMax = 0;
  for (const [piece, n] of Object.entries(count)) {
    const L = lods[piece]?.lods;
    if (!L) continue;
    tris0[piece] = n * L[0].triangles; trisLod0 += tris0[piece];
    // every level x slot is a solid + a fade instanced set (xmasCity.js XmasField): its draws when all are in use
    draws[piece] = n ? L.reduce((s, l) => s + 2 * l.draws, 0) : 0; drawsMax += draws[piece];
  }
  return { root: path.relative(HERE, ROOT) || ".", count, swagFronts, tris0, trisLod0, draws, drawsMax };
}

const BUDGET = "models/christmas/load_budget.json";
const run = async () => {
  const L = await load();
  if (process.argv.includes("--json")) { console.log(JSON.stringify(L, null, 1)); return 0; }
  const ceil = (v) => Math.max(v + 2, Math.ceil(v * (1 + HEADROOM)));
  if (process.argv.includes("--write")) {
    const B = { note: "ceilings for tools/christmas/xmasLoad.mjs (gate row xmasload, rule xmas-pass-budget): raise only with a re-measure (docs/CHRISTMAS.md 7.7)", count: Object.fromEntries(Object.entries(L.count).map(([k, v]) => [k, ceil(v)])), trisLod0: ceil(L.trisLod0), drawsMax: L.drawsMax };
    fs.writeFileSync(path.join(HERE, BUDGET), JSON.stringify(B, null, 1) + "\n"); console.log(`wrote ${BUDGET}`); return 0;
  }
  const B = JSON.parse(fs.readFileSync(path.join(HERE, BUDGET), "utf8"));
  let fails = 0;
  const out = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };
  for (const [k, v] of Object.entries(L.count)) out(B.count[k] != null && v <= B.count[k], `${k}: ${v} placed (ceiling ${B.count[k] ?? "none"})`);
  out(L.trisLod0 <= B.trisLod0, `the layer's LOD0 triangles if every piece were near: ${L.trisLod0} (ceiling ${B.trisLod0})`);
  out(L.drawsMax <= B.drawsMax, `the layer's instanced sets (draws when all in use): ${L.drawsMax} (ceiling ${B.drawsMax})`);
  // mutation: every front placed twice must overrun the swag ceiling (the check sees a content growth)
  const M = await load({ mutate: "fronts-twice" });
  out(M.count.swag > B.count.swag, `mutation (every front twice: ${M.count.swag} swag modules) overruns the ceiling ${B.count.swag}`);
  return fails ? 1 : 0;
};
if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await run());
