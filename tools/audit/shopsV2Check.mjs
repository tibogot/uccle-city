// gate row `shopsv2` (rule shop-room-layers, docs/SHOPS_V2_PLAN.md jobs 3-4, docs/assets/SHOPS.md §3b): the layered
// café / restaurant interiors stay inside their budgets and at metric scale.
//   1. VRAM / download: textures/shops/interiors_v2.ktx2 is a KTX2 2D ARRAY of V2.LAYERS layers of V2.PX, mipmapped,
//      Basis (UASTC -> BC7 / ASTC: 1 byte a texel); its GPU size (every layer, every mip, 4 x 4 blocks) <= 12 MB, the
//      file <= 4 MB (shopScale.js V2_BUDGET).
//   2. Fetches: viewer/shops/shopWindow.js nearV2 makes V2_FETCH.near texture fetches (fetchV2 calls, the cards'
//      counted through cardAt), farV2 makes V2_FETCH.far; both within V2_BUDGET (plan: ~5 near, ONE composite far);
//      the v2 code fetches only through fetchV2 (no stray texture() in the v2 part), every fetch with an explicit level.
//   3. Scale: the bake's v2 room (tools/blender/shopInteriors.py RD2, V2_PLANES, V2_SLABS, V2_PX) = shopScale.js V2; the
//      render depth = the viewer's café depth (DEPTH.cafe: depth scale 1; across: the metric layout of rule
//      shop-room-metric, every v2 window within +-10 %); each card plane inside its slab; the planes front to back.
//   4. Every v2 window has a variant the array holds (iWinT.w in 0 .. VARIANTS - 1).
//
//   node tools/audit/shopsV2Check.mjs [--quiet]
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { V2, V2_FETCH, V2_BUDGET, DEPTH, TYPES, acrossScale } from "../../viewer/shops/shopScale.js";
import { auditWindows } from "../shops/shopScaleAudit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const quiet = process.argv.includes("--quiet");
const fails = [];
const fail = (s) => fails.push(s);
const MB = 1048576;

// 1. the KTX2 header (KTX 2.0 spec: identifier 12 bytes, then u32 vkFormat, typeSize, pixelWidth, pixelHeight,
//    pixelDepth, layerCount, faceCount, levelCount, supercompressionScheme)
const file = join(ROOT, "textures/shops/interiors_v2.ktx2");
const buf = readFileSync(file);
const ID = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
if (!ID.every((b, i) => buf[i] === b)) fail("interiors_v2.ktx2: not a KTX2 file");
const u32 = (o) => buf.readUInt32LE(o);
const [vkFormat, , W, H, Dp, layers, faces, levels, scheme] = [12, 16, 20, 24, 28, 32, 36, 40, 44].map(u32);
if (layers !== V2.LAYERS) fail(`interiors_v2.ktx2: ${layers} layers, want ${V2.LAYERS} (a 2D array: ${V2.VARIANTS.length} variants x ${V2.LIGHTS.length} lights x 4)`);
if (W !== V2.PX[0] || H !== V2.PX[1]) fail(`interiors_v2.ktx2: ${W} x ${H}, want ${V2.PX.join(" x ")}`);
if (Dp !== 0 || faces !== 1) fail(`interiors_v2.ktx2: depth ${Dp} faces ${faces} (want a plain 2D array)`);
if (vkFormat !== 0) fail(`interiors_v2.ktx2: vkFormat ${vkFormat} (want 0: Basis, transcoded to BC7 / ASTC)`);
const fullMips = Math.floor(Math.log2(Math.max(W, H))) + 1;
if (levels !== fullMips) fail(`interiors_v2.ktx2: ${levels} mip levels, want ${fullMips} (the far views need the mips)`);
let gpu = 0;
for (let l = 0; l < Math.max(levels, 1); l++) {
  const w = Math.max(1, W >> l), h = Math.max(1, H >> l);
  gpu += Math.ceil(w / 4) * Math.ceil(h / 4) * 16 * Math.max(layers, 1);     // BC7: 16 bytes a 4 x 4 block
}
const fileBytes = statSync(file).size;
if (gpu > V2_BUDGET.gpuMB * MB) fail(`interiors_v2.ktx2: ${(gpu / MB).toFixed(2)} MB on the GPU > ${V2_BUDGET.gpuMB} MB`);
if (fileBytes > V2_BUDGET.fileMB * MB) fail(`interiors_v2.ktx2: ${(fileBytes / MB).toFixed(2)} MB download > ${V2_BUDGET.fileMB} MB`);

// 2. the fetches, from the shader's source
const src = readFileSync(join(ROOT, "viewer/shops/shopWindow.js"), "utf8");
const body = (name) => {
  const i = src.indexOf(`const ${name} = `);
  if (i < 0) { fail(`shopWindow.js: no ${name}`); return ""; }
  const j = src.indexOf("\n    const ", i + 10);
  return src.slice(i, j < 0 ? undefined : j);
};
const count = (s, re) => (s.match(re) || []).length;
const fetchDef = body("fetchV2"), card = body("cardAt"), near = body("nearV2"), far = body("farV2");
if (!/\.depth\(layer\)\.level\(lod2\)/.test(fetchDef)) fail("shopWindow.js fetchV2: not an array fetch at an explicit level (texture(..).depth(layer).level(lod2))");
const perCard = count(card, /fetchV2\(/g);
const nNear = count(near, /fetchV2\(/g) + count(near, /cardAt\(/g) * perCard;
const nFar = count(far, /fetchV2\(/g) + count(far, /cardAt\(/g) * perCard;
if (nNear !== V2_FETCH.near) fail(`shopWindow.js nearV2: ${nNear} fetches, shopScale.js V2_FETCH.near says ${V2_FETCH.near}`);
if (nFar !== V2_FETCH.far) fail(`shopWindow.js farV2: ${nFar} fetches, shopScale.js V2_FETCH.far says ${V2_FETCH.far}`);
if (nNear > V2_BUDGET.fetchNear) fail(`v2 near: ${nNear} fetches > ${V2_BUDGET.fetchNear}`);
if (nFar > V2_BUDGET.fetchFar) fail(`v2 far: ${nFar} fetches > ${V2_BUDGET.fetchFar} (one composite fetch beyond V2.FAR)`);
const v2part = src.slice(src.indexOf("// ---- v2 (rule shop-room-layers)"), src.indexOf("// the glass: a street-side mirror"));
if (!v2part) fail("shopWindow.js: no v2 part");
if (count(v2part, /\btexture\(/g) !== 1) fail(`shopWindow.js v2 part: ${count(v2part, /\btexture\(/g)} texture() calls (want the one inside fetchV2)`);
if (!/If\(wFar\.lessThanEqual\(0\)/.test(v2part) || !/ElseIf\(night\.lessThanEqual/.test(v2part)) fail("shopWindow.js v2: the near / far and day / night choices are not branches (both sides would always be fetched)");

// 3. the scale: the bake's v2 room = shopScale.js V2
const py = readFileSync(join(ROOT, "tools/blender/shopInteriors.py"), "utf8");
const num = (re, what) => { const m = py.match(re); if (!m) { fail(`shopInteriors.py: no ${what}`); return null; } return m[1]; };
const rd2 = +num(/^RD2\s*=\s*([\d.]+)/m, "RD2");
const planes = JSON.parse((num(/^V2_PLANES\s*=\s*(\[[^\]]*\])/m, "V2_PLANES") ?? "[]"));
const slabs = JSON.parse((num(/^V2_SLABS\s*=\s*(\[.*\])\s*#/m, "V2_SLABS") ?? "[]").replace(/\(/g, "[").replace(/\)/g, "]"));
const px = JSON.parse((num(/^V2_PX\s*=\s*(\([^)]*\))/m, "V2_PX") ?? "[]").replace("(", "[").replace(")", "]"));
if (rd2 !== V2.RD) fail(`v2 room depth: bake RD2 ${rd2} != shopScale.js V2.RD ${V2.RD}`);
if (JSON.stringify(planes) !== JSON.stringify(V2.PLANES)) fail(`card planes: bake ${JSON.stringify(planes)} != shopScale.js ${JSON.stringify(V2.PLANES)}`);
if (JSON.stringify(slabs) !== JSON.stringify(V2.SLABS)) fail(`slabs: bake ${JSON.stringify(slabs)} != shopScale.js ${JSON.stringify(V2.SLABS)}`);
if (JSON.stringify(px) !== JSON.stringify(V2.PX)) fail(`layer size: bake ${JSON.stringify(px)} != shopScale.js ${JSON.stringify(V2.PX)}`);
for (const t of V2.TYPES) if (Math.abs(DEPTH[t] - V2.RD) > 1e-6) fail(`${t}: the viewer's room depth ${DEPTH[t]} m != the v2 render's ${V2.RD} m (depth not metric)`);
V2.PLANES.forEach((p, i) => { const [a, b] = V2.SLABS[i]; if (!(p >= a && p <= b)) fail(`card L${i + 1} plane ${p} m outside its slab ${a}-${b} m`); });
if (!V2.PLANES.every((p, i) => i === 0 || p < V2.PLANES[i - 1])) fail("card planes not back to front (L1 > L2 > L3)");
if (!/V2\s*=\s*any\(a == "--v2"/.test(py) || !/visible_camera = k in visible/.test(py)) fail("shopInteriors.py: the v2 bake does not hide the other layers from the camera (L0 shadows from invisible furniture)");

// 4. the windows
const Wn = auditWindows();
const v2types = V2.TYPES.map((t) => TYPES.indexOf(t));
const v2w = Wn.filter((a) => v2types.includes(a.type));
let bad = 0;
for (const a of v2w) {
  const why = [];
  if (Math.abs(acrossScale(a.w) - 1) > 0.1) why.push(`across scale ${acrossScale(a.w).toFixed(2)}`);
  if (!(a.variant >= 0 && a.variant < V2.VARIANTS.length && Number.isInteger(a.variant))) why.push(`variant ${a.variant}`);
  if (why.length && ++bad <= 10) fail(`${a.tile} (${a.x.toFixed(0)}, ${a.z.toFixed(0)}) w ${a.w.toFixed(2)}: ${why.join("; ")}`);
}
if (bad > 10) fail(`... ${bad - 10} more v2 windows`);
const nVar = V2.VARIANTS.map((_, i) => v2w.filter((a) => a.variant === i).length);
const closed = v2w.filter((a) => a.lit < 0.5).length;

const head = `shopsv2: interiors_v2.ktx2 ${layers} layers ${W} x ${H}, ${levels} mips: ${(gpu / MB).toFixed(2)} MB GPU (<= ${V2_BUDGET.gpuMB}), ${(fileBytes / MB).toFixed(2)} MB file (<= ${V2_BUDGET.fileMB}); fetches near ${nNear} / far ${nFar} per pixel (dusk / the ${V2.FAR - V2.BAND}-${V2.FAR + V2.BAND} m band: x2); ${v2w.length} v2 windows (${V2.VARIANTS.map((v, i) => `${v} ${nVar[i]}`).join(", ")}; closed at night ${closed}); room ${V2.RD} m deep = DEPTH.cafe, planes ${V2.PLANES.join(" / ")} m`;
if (fails.length) { console.log(`${head}\nFAIL (rule shop-room-layers):`); for (const f of fails) console.log("  " + f); process.exit(1); }
console.log(`${head}\nPASS`);
if (!quiet) console.log("(supercompression scheme " + scheme + ")");
