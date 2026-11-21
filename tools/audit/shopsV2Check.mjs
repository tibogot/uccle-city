// gate row `shopsv2` (rule shop-room-layers, docs/SHOPS_V2_PLAN.md jobs 3-6, docs/assets/SHOPS.md §3b-3c): the layered
// shop interiors (every type) and their glass dressing stay inside their budgets, at metric scale, and varied.
//   1. VRAM / download: (shops7) the four arrays of shopScale.js V2_ARRAYS (A interiors_v2.ktx2: day L0 per variant +
//      the sticker sheet, C interiors_v2c.ktx2: day L3 / composite, at V2.PX; N interiors_v2n.ktx2: day L1 + L2, M
//      interiors_v2m.ktx2: night L0-L3, at V2.PXN) are KTX2 2D ARRAYS with full mips, Basis (UASTC -> BC7 / ASTC: 1 byte
//      a texel); together <= V2_BUDGET.gpuMB on the GPU and <= V2_BUDGET.fileMB to download; shopScale.js V2_SLOT gives
//      every card one layer; <= 24 layers of 1024 px a file (the 512 px arrays: <= 96).
//   2. Fetches: viewer/shops/shopWindow.js nearV2 makes V2_FETCH.near fetches (the cards counted through cardAt), the
//      L4 sticker block V2_FETCH.dress, farV2 V2_FETCH.far; near + dress <= V2_BUDGET.fetchNear, far <= fetchFar; the v2
//      code fetches only through fetchV2 at an explicit level; near / far, day / night and the sticker zones are
//      branches; the procedural dressing (shutter, blinds, dirt) fetches nothing.
//   3. Scale: the bake's variants (tools/blender/shopInteriors.py V2_VARIANTS) = shopScale.js V2.VARIANTS, each one's
//      room depth (V2_DEPTH) = the viewer's DEPTH of its type (metric, no depth scaling), the planes / slabs / layer size
//      = shopScale.js V2; every card plane inside its slab and in front of every room's back wall.
//   4. Windows: every window has a variant of its own type; within +-10 % across; the generic share <= GENERIC_MAX.
//   5. The neighbour rule: no two windows of the same type within NEIGHBOUR_M facing the same way (in one tile, the
//      layout's unit) show the same variant when the type has more than one (types with one variant: counted, waiting).
//      (shops7) every type has VARIANTS_PER_TYPE variants, so no pair waits; each variant is used by some window.
//   6. The sticker sheet: shopScale.js STICKERS inside the 1024 x 512 layer, not overlapping; tools/shops/stickers.py.
//   7. (shops6) The gains: shopScale.js V2_GAIN has a day and a night gain for every variant, inside V2_GAIN_RANGE;
//      day gain x the variant's measured luminance (V2_LUM) within V2_DAY_TOL of V2_DAY_TARGET (every room the same
//      mean by day); shopWindow.js applies them per variant (gDay / gNight) and the closed look stays closedV2 0.1.
//
//   node tools/audit/shopsV2Check.mjs [--quiet]
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { V2, V2_FETCH, V2_BUDGET, V2_SLOT, V2_ARRAYS, DEPTH, TYPES, acrossScale, variantsOfType, NEIGHBOUR_M, STICKERS, V2_GAIN, V2_LUM, V2_GAIN_RANGE, V2_DAY_TARGET, V2_DAY_TOL, V2_NIGHT_MIN, V2_NIGHT_TARGET } from "../../viewer/shops/shopScale.js";
import { auditWindows } from "../shops/shopScaleAudit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fails = [];
const fail = (s) => fails.push(s);
const MB = 1048576;
/** the generic room's share of the interior-mapped windows (shops5: 17.9 % before the interiorType() extension, 10.0 % after) */
const GENERIC_MAX = 0.12;
/** (shops7) every interior type has two rooms (the neighbour rule's 15 waiting same-type pairs) */
const VARIANTS_PER_TYPE = 2;

// 1. the KTX2 headers (KTX 2.0 spec: identifier 12 bytes, then u32 vkFormat, typeSize, pixelWidth, pixelHeight,
//    pixelDepth, layerCount, faceCount, levelCount, supercompressionScheme)
const ID = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
function ktx(name, wantLayers, px, codec = "uastc") {
  const file = join(ROOT, "textures/shops", name);
  if (!existsSync(file)) { fail(`${name}: missing`); return { gpu: 0, bytes: 0, layers: 0, levels: 0 }; }
  const buf = readFileSync(file);
  if (!ID.every((b, i) => buf[i] === b)) fail(`${name}: not a KTX2 file`);
  const u32 = (o) => buf.readUInt32LE(o);
  const [vkFormat, , W, H, Dp, layers, faces, levels] = [12, 16, 20, 24, 28, 32, 36, 40].map(u32);
  if (layers !== wantLayers) fail(`${name}: ${layers} layers, want ${wantLayers}`);
  if (W !== px[0] || H !== px[1]) fail(`${name}: ${W} x ${H}, want ${px.join(" x ")}`);
  if (Dp !== 0 || faces !== 1) fail(`${name}: depth ${Dp} faces ${faces} (want a plain 2D array)`);
  if (vkFormat !== 0) fail(`${name}: vkFormat ${vkFormat} (want 0: Basis, transcoded to BC7 / ASTC)`);
  // (shops7) supercompressionScheme: 1 BasisLZ (ETC1S), 2 zstd (UASTC) = shopScale.js V2_ARRAYS codec
  const sc = u32(44), wantSc = codec === "etc1s" ? 1 : 2;
  if (sc !== wantSc) fail(`${name}: supercompression ${sc}, want ${wantSc} (${codec}: shopScale.js V2_ARRAYS)`);
  const fullMips = Math.floor(Math.log2(Math.max(W, H))) + 1;
  if (levels !== fullMips) fail(`${name}: ${levels} mip levels, want ${fullMips} (the far views need the mips)`);
  let gpu = 0;
  for (let l = 0; l < Math.max(levels, 1); l++) gpu += Math.ceil(Math.max(1, W >> l) / 4) * Math.ceil(Math.max(1, H >> l) / 4) * 16 * Math.max(layers, 1);
  return { gpu, bytes: statSync(file).size, layers, levels, W, H };
}
const K = Object.fromEntries(Object.entries(V2_ARRAYS).map(([a, d]) => [a, ktx(d.file, d.layers, d.px, d.codec)]));
const gpu = Object.values(K).reduce((s, k) => s + k.gpu, 0), fileBytes = Object.values(K).reduce((s, k) => s + k.bytes, 0);
// every (variant, light, card) has one slot, no two share one, the sticker sheet has its own
{
  const NV = V2.VARIANTS.length, seen = new Set([`A:${V2.STICKER_LAYER}`]), size = Object.fromEntries(Object.entries(V2_ARRAYS).map(([a, d]) => [a, d.layers]));
  for (let v = 0; v < NV; v++) for (let l = 0; l < 2; l++) for (let k = 0; k < 4; k++) {
    const [arr, layer] = V2_SLOT(v, l, k), key = `${arr}:${layer}`;
    if (seen.has(key) || !(layer >= 0 && layer < size[arr])) fail(`V2_SLOT(${v}, ${l}, ${k}) = ${key}: taken or outside array ${arr} (${size[arr]} layers)`);
    seen.add(key);
  }
  const total = Object.values(size).reduce((s, n) => s + n, 0);
  if (seen.size !== total) fail(`the arrays hold ${total} layers, V2_SLOT fills ${seen.size}`);
  for (const [a, d] of Object.entries(V2_ARRAYS)) {
    const cap = 24 * (1024 * 512) / (d.px[0] * d.px[1]);
    if (d.layers > cap) fail(`array ${a} (${d.file}): ${d.layers} layers of ${d.px.join(" x ")}: the Basis encoder (2 GB WASM heap) fails over ~${cap}`);
  }
  if (V2_SLOT(0, 0, 0)[0] !== "A" || V2_ARRAYS.A.px !== V2.PX || V2_SLOT(0, 0, 3)[0] !== "C" || V2_ARRAYS.C.px !== V2.PX) fail("V2_SLOT: the day room (L0) and the display + composite (L3) must stay in the 1024 px arrays");
}
if (gpu > V2_BUDGET.gpuMB * MB) fail(`v2 arrays: ${(gpu / MB).toFixed(2)} MB on the GPU > ${V2_BUDGET.gpuMB} MB`);
if (fileBytes > V2_BUDGET.fileMB * MB) fail(`v2 arrays: ${(fileBytes / MB).toFixed(2)} MB download > ${V2_BUDGET.fileMB} MB`);

// 2. the fetches, from the shader's source
const src = readFileSync(join(ROOT, "viewer/shops/shopWindow.js"), "utf8").replace(/\r\n/g, "\n");   // (a CRLF checkout)
const body = (name) => {
  const i = src.indexOf(`const ${name} = `);
  if (i < 0) { fail(`shopWindow.js: no ${name}`); return ""; }
  const j = src.indexOf("\n    const ", i + 10);
  return src.slice(i, j < 0 ? undefined : j);
};
const count = (s, re) => (s.match(re) || []).length;
const fetchDef = body("fetchV2"), card = body("cardAt"), near = body("nearV2"), far = body("farV2");
if (!/texture\(T, q\)\.depth\(layer\)\.level\(lv\)/.test(fetchDef)) fail("shopWindow.js fetchV2: not an array fetch at an explicit level (texture(T, q).depth(layer).level(lv))");
const perCard = count(card, /fetchV2\(/g);
const nNear = count(near, /fetchV2\(/g) + count(near, /cardAt\(/g) * perCard;
const nFar = count(far, /fetchV2\(/g) + count(far, /cardAt\(/g) * perCard;
const i4 = src.indexOf("// ---- L4, the glass dressing (shops5, rule shop-room-layers)"), j4 = src.indexOf("    return out;\n  })();", i4);
const dress = i4 >= 0 && j4 > i4 ? src.slice(i4, j4) : "";
if (!dress) fail("shopWindow.js: no L4 sticker block");
const nDress = count(dress, /fetchV2\(/g);
if (nNear !== V2_FETCH.near) fail(`shopWindow.js nearV2: ${nNear} fetches, shopScale.js V2_FETCH.near says ${V2_FETCH.near}`);
if (nDress !== V2_FETCH.dress) fail(`shopWindow.js L4 stickers: ${nDress} fetches, shopScale.js V2_FETCH.dress says ${V2_FETCH.dress}`);
if (nFar !== V2_FETCH.far) fail(`shopWindow.js farV2: ${nFar} fetches, shopScale.js V2_FETCH.far says ${V2_FETCH.far}`);
if (nNear + nDress > V2_BUDGET.fetchNear) fail(`v2 near: ${nNear} + ${nDress} fetches > ${V2_BUDGET.fetchNear}`);
if (nFar > V2_BUDGET.fetchFar) fail(`v2 far: ${nFar} fetches > ${V2_BUDGET.fetchFar} (one composite fetch beyond V2.FAR)`);
const v2part = src.slice(src.indexOf("// ---- v2 (rule shop-room-layers)"), src.indexOf("// the glass: a street-side mirror"));
if (count(v2part, /\btexture\(/g) !== 1) fail(`shopWindow.js v2 part: ${count(v2part, /\btexture\(/g)} texture() calls (want the one inside fetchV2)`);
if (!/If\(wFar\.lessThanEqual\(0\)/.test(v2part) || !/If\(night\.lessThanEqual/.test(v2part)) fail("shopWindow.js v2: the near / far and day / night choices are not branches (both sides would always be fetched)");
if (!/If\(U\.dressV2\.greaterThan\(0\)\.and\(wFar\.lessThan\(1\)\)/.test(dress) || !/If\(zH\.or\(zP\)\.or\(zR\)\.or\(zL\)/.test(dress)) fail("shopWindow.js L4: the sticker fetch is not inside the near / in-a-zone branches");
const tail = src.slice(src.indexOf("// the glass: a street-side mirror"));
if (/\btexture\(/.test(tail)) fail("shopWindow.js: the procedural glass dressing (shutter / blinds / dirt) fetches a texture");
{
  // (shops7) slot() = V2_SLOT: night J.texM layer vI * 4 + k; day [J.tex vI, J.texN vI * 2, J.texN vI * 2 + 1, J.texC vI]
  const want = [/light \? \[J\.texM, vI\.mul\(4\)\.add\(k\), lodN\]/, /\[\[J\.tex, vI, lod2\], \[J\.texN, vI\.mul\(2\), lodN\], \[J\.texN, vI\.mul\(2\)\.add\(1\), lodN\], \[J\.texC, vI, lod2\]\]\[k\]/];
  const ok = V2_SLOT(1, 1, 2).join() === "M,6" && V2_SLOT(1, 0, 0).join() === "A,1" && V2_SLOT(1, 0, 1).join() === "N,2" && V2_SLOT(1, 0, 2).join() === "N,3" && V2_SLOT(1, 0, 3).join() === "C,1";
  if (!/look\(1\)/.test(v2part) || !want.every((re) => re.test(v2part)) || !ok) fail("shopWindow.js: slot() does not read the four arrays as shopScale.js V2_SLOT lays them out");
}

// 3. the scale: the bake's v2 rooms = shopScale.js V2
const py = readFileSync(join(ROOT, "tools/blender/shopInteriors.py"), "utf8").replace(/\r\n/g, "\n");
const num = (re, what) => { const m = py.match(re); if (!m) { fail(`shopInteriors.py: no ${what}`); return null; } return m[1]; };
const pyVariants = JSON.parse(num(/^V2_VARIANTS\s*=\s*(\[[^\]]*\])/m, "V2_VARIANTS") ?? "[]");
const pyDepth = JSON.parse(num(/^V2_DEPTH\s*=\s*(\{[^}]*\})/m, "V2_DEPTH") ?? "{}");
const planes = JSON.parse((num(/^V2_PLANES\s*=\s*(\[[^\]]*\])/m, "V2_PLANES") ?? "[]"));
const slabs = JSON.parse((num(/^V2_SLABS\s*=\s*(\[.*\])\s*#/m, "V2_SLABS") ?? "[]").replace(/\(/g, "[").replace(/\)/g, "]"));
const px = JSON.parse((num(/^V2_PX\s*=\s*(\([^)]*\))/m, "V2_PX") ?? "[]").replace("(", "[").replace(")", "]"));
if (JSON.stringify(pyVariants) !== JSON.stringify(V2.VARIANTS)) fail(`variants: bake ${JSON.stringify(pyVariants)} != shopScale.js ${JSON.stringify(V2.VARIANTS)}`);
V2.VARIANTS.forEach((v, i) => {
  const t = V2.VARIANT_TYPE[i];
  if (!TYPES.includes(t)) fail(`variant ${v}: type ${t} is not an interior type`);
  if (Math.abs((pyDepth[v] ?? -1) - DEPTH[t]) > 1e-6) fail(`variant ${v}: bake depth ${pyDepth[v]} m != the viewer's ${t} room ${DEPTH[t]} m (depth not metric)`);
  if (DEPTH[t] <= V2.PLANES[0] + 0.5) fail(`variant ${v}: the ${DEPTH[t]} m room is too shallow for the L1 plane at ${V2.PLANES[0]} m`);
});
for (const t of TYPES) if (variantsOfType(TYPES.indexOf(t)).length !== VARIANTS_PER_TYPE) fail(`type ${t} has ${variantsOfType(TYPES.indexOf(t)).length} v2 variants, want ${VARIANTS_PER_TYPE}`);
if (!/def room_bounds_check\(/.test(py) || !/room_bounds_check\(variant, objs\)/.test(py)) fail("shopInteriors.py: the v2 bake does not check that every piece stays inside the room box (room_bounds_check)");
if (JSON.stringify(planes) !== JSON.stringify(V2.PLANES)) fail(`card planes: bake ${JSON.stringify(planes)} != shopScale.js ${JSON.stringify(V2.PLANES)}`);
if (JSON.stringify(slabs) !== JSON.stringify(V2.SLABS)) fail(`slabs: bake ${JSON.stringify(slabs)} != shopScale.js ${JSON.stringify(V2.SLABS)}`);
if (JSON.stringify(px) !== JSON.stringify(V2.PX)) fail(`layer size: bake ${JSON.stringify(px)} != shopScale.js ${JSON.stringify(V2.PX)}`);
if (V2.PXN[0] * 2 !== V2.PX[0] || V2.PXN[1] * 2 !== V2.PX[1]) fail(`night layers ${V2.PXN.join(" x ")} are not half the day's ${V2.PX.join(" x ")} (pack_v2.py halves them)`);
V2.PLANES.forEach((p, i) => { const [a, b] = V2.SLABS[i]; if (!(p >= a && p <= b)) fail(`card L${i + 1} plane ${p} m outside its slab ${a}-${b} m`); });
if (!V2.PLANES.every((p, i) => i === 0 || p < V2.PLANES[i - 1])) fail("card planes not back to front (L1 > L2 > L3)");
if (!/V2\s*=\s*any\(a == "--v2"/.test(py) || !/visible_camera = k in visible/.test(py)) fail("shopInteriors.py: the v2 bake does not hide the other layers from the camera (L0 shadows from invisible furniture)");

// 4. + 5. the windows
const Wn = auditWindows();
let bad = 0;
for (const a of Wn) {
  const why = [];
  if (Math.abs(acrossScale(a.w) - 1) > 0.1) why.push(`across scale ${acrossScale(a.w).toFixed(2)}`);
  if (!variantsOfType(a.type).includes(a.variant)) why.push(`variant ${a.variant} (${V2.VARIANTS[a.variant] ?? "?"}) is not a ${TYPES[a.type]} room`);
  if (why.length && ++bad <= 10) fail(`${a.tile} (${a.x.toFixed(0)}, ${a.z.toFixed(0)}) ${a.typeName} w ${a.w.toFixed(2)}: ${why.join("; ")}`);
}
if (bad > 10) fail(`... ${bad - 10} more windows`);
const generic = Wn.filter((a) => TYPES[a.type] === "shop").length / Math.max(Wn.length, 1);
if (generic > GENERIC_MAX) fail(`the generic shop room: ${(generic * 100).toFixed(1)} % of the windows > ${GENERIC_MAX * 100} % (extend interiorType() in viewer/shops/shopLayout.js)`);
let clash = 0, waiting = 0;
for (let i = 0; i < Wn.length; i++) for (let j = i + 1; j < Wn.length; j++) {
  const a = Wn[i], b = Wn[j];
  if (a.tile !== b.tile || a.type !== b.type || (a.x - b.x) ** 2 + (a.z - b.z) ** 2 >= NEIGHBOUR_M ** 2 || a.nx * b.nx + a.nz * b.nz <= 0.7) continue;
  if (variantsOfType(a.type).length < 2) { waiting++; continue; }
  if (a.variant === b.variant && ++clash <= 5) fail(`neighbour rule: ${a.tile} (${a.x.toFixed(0)}, ${a.z.toFixed(0)}) and (${b.x.toFixed(0)}, ${b.z.toFixed(0)}) both ${V2.VARIANTS[a.variant]}`);
}
if (clash > 5) fail(`... ${clash - 5} more neighbour pairs with the same variant`);
if (waiting) fail(`neighbour rule: ${waiting} same-type pairs wait for a second variant (every type has ${VARIANTS_PER_TYPE})`);
V2.VARIANTS.forEach((v, i) => { if (!Wn.some((a) => a.variant === i)) fail(`variant ${v}: no window shows it (shopScale.js v2Slot)`); });

// 6. the sticker sheet
const rects = Object.entries(STICKERS);
for (const [n, [x, y, w, h]] of rects) if (x < 0 || y < 0 || x + w > V2.PX[0] || y + h > V2.PX[1]) fail(`sticker ${n} outside the ${V2.PX.join(" x ")} layer`);
for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
  const [na, A] = rects[i], [nb, B] = rects[j];
  if (A[0] < B[0] + B[2] && B[0] < A[0] + A[2] && A[1] < B[1] + B[3] && B[1] < A[1] + A[3]) fail(`stickers ${na} and ${nb} overlap`);
}
if (!existsSync(join(ROOT, "tools/shops/stickers.py"))) fail("tools/shops/stickers.py missing (the sticker sheet is made by script)");

// 7. the per-variant gains (shops6)
const gainTxt = [];
for (const v of V2.VARIANTS) {
  for (const l of ["day", "night"]) {
    const g = V2_GAIN[l]?.[v], [lo, hi] = V2_GAIN_RANGE[l];
    if (!(typeof g === "number" && g >= lo && g <= hi)) fail(`V2_GAIN.${l}.${v} = ${g}: missing or outside [${lo}, ${hi}]`);
    if (!(V2_LUM[l]?.[v] > 0)) fail(`V2_LUM.${l}.${v} missing (measure the composite: docs/assets/SHOPS.md §3d)`);
  }
  // (shops7) no near-black night bake: the boutique / salon / shop ones were 0.008-0.02 (30-45 W spots only), so an open
  // shop read dark even at the clamped night gain
  // (shops7) the night gain is derived from the measured night luminance too (half-way in log, clamped)
  const [nlo, nhi] = V2_GAIN_RANGE.night, gn = Math.min(nhi, Math.max(nlo, 0.7 * Math.sqrt(V2_NIGHT_TARGET / (0.7 * V2_LUM.night[v]))));
  if (!(Math.abs(V2_GAIN.night[v] / gn - 1) <= V2_DAY_TOL)) fail(`${v} at night: gain ${V2_GAIN.night[v]}, the formula on lum ${V2_LUM.night[v]} gives ${gn.toFixed(3)} (re-derive V2_GAIN after a bake)`);
  if (!(V2_LUM.night[v] >= V2_NIGHT_MIN)) fail(`${v} at night: the bake's mean ${V2_LUM.night[v]} < ${V2_NIGHT_MIN} (too few / weak lamps: give the room its shop lighting in shopInteriors.py)`);
  const y = V2_GAIN.day[v] * V2_LUM.day[v];
  if (!(Math.abs(y / V2_DAY_TARGET - 1) <= V2_DAY_TOL)) fail(`${v} by day: gain ${V2_GAIN.day[v]} x lum ${V2_LUM.day[v]} = ${y.toFixed(4)}, want ${V2_DAY_TARGET} +-${V2_DAY_TOL * 100} %`);
  gainTxt.push(`${v} ${V2_GAIN.day[v]}/${V2_GAIN.night[v]}`);
}
for (const k of Object.keys(V2_GAIN.day)) if (!V2.VARIANTS.includes(k)) fail(`V2_GAIN.day.${k}: not a variant`);
if (!/c\.mul\(gNight\)/.test(src) || !/look\(0\)\.mul\(gDay\)/.test(src)) fail("shopWindow.js: the v2 day / night colour is not multiplied by the per-variant gains (gDay / gNight)");
if (!/closedV2: uniform\(0\.1\)/.test(src) || !/c\.mul\(U\.closedV2\)/.test(src)) fail("shopWindow.js: the closed look changed (want the night bake x closedV2 0.1)");

const nVar = V2.VARIANTS.map((_, i) => Wn.filter((a) => a.variant === i).length);
const closed = Wn.filter((a) => a.lit < 0.5).length;
const head = `shopsv2: arrays ${Object.entries(K).map(([a, k]) => `${a} ${k.layers} x ${k.W} x ${k.H} (${(k.bytes / MB).toFixed(2)} MB)`).join(", ")} (full mips):${(gpu / MB).toFixed(2)} MB GPU (<= ${V2_BUDGET.gpuMB}), ${(fileBytes / MB).toFixed(2)} MB download (<= ${V2_BUDGET.fileMB}); fetches near ${nNear} + ${nDress} sticker / far ${nFar} per pixel (dusk / the ${V2.FAR - V2.BAND}-${V2.FAR + V2.BAND} m band: x2); ${Wn.length} windows (${V2.VARIANTS.map((v, i) => `${v} ${nVar[i]}`).join(", ")}; closed at night ${closed}); generic ${(generic * 100).toFixed(1)} % (<= ${GENERIC_MAX * 100}); neighbour pairs: ${clash} clashes, ${waiting} same-type pairs waiting for a 2nd variant; gains day/night ${gainTxt.join(", ")}`;
if (fails.length) { console.log(`${head}\nFAIL (rule shop-room-layers):`); for (const f of fails) console.log("  " + f); process.exit(1); }
console.log(`${head}\nPASS`);
