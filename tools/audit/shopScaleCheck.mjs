// gate row `shopscale` (rule shop-room-metric, docs/SHOPS_V2_PLAN.md jobs 1-2): every interior-mapped shop window
// shows its room at metric scale across the glass (within +-10 %), with a depth in 3.5-6 m, the glass inside its room
// (or rooms with partitions inside the glass), and the shader's render constants equal to the bake's
// (tools/blender/shopInteriors.py RW RD RH F CARD_Y; the bake on the OptiX GPU). REPORT-ONLY while the shader has no
// metric mapping (viewer/shops/shopWindow.js does not import shopScale.js): it prints the old stretch and passes.
//
//   node tools/audit/shopScaleCheck.mjs [--quiet]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RW, RD, RH, F, CARD_Y, DEPTH_BY_INDEX, TYPES, roomLayout, acrossScale, STRETCH_MAX } from "../../viewer/shops/shopScale.js";
import { auditWindows, summary } from "../shops/shopScaleAudit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const quiet = process.argv.includes("--quiet");
const fails = [];
const fail = (s) => fails.push(s);

// 1. the bake's room = the shader's (a re-bake at another size must move shopScale.js with it)
const py = readFileSync(join(ROOT, "tools/blender/shopInteriors.py"), "utf8");
const mm = py.match(/^RW, RD, RH, F, CARD_Y\s*=\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/m);
if (!mm) fail("shopInteriors.py: no `RW, RD, RH, F, CARD_Y = ...` line");
else {
  const bake = mm.slice(1).map(Number), ours = [RW, RD, RH, F, CARD_Y];
  if (bake.some((v, i) => Math.abs(v - ours[i]) > 1e-6)) fail(`render room: bake ${bake.join(", ")} != shopScale.js ${ours.join(", ")} (RW, RD, RH, F, CARD_Y)`);
}
// the bake on the GPU (memory rule blender-gpu-optix): no hard-coded CPU device
if (/cycles\.device\s*=\s*"CPU"\s*;\s*s\.cycles\.samples/.test(py) || !/compute_device_type\s*=\s*kind/.test(py) || !/"OPTIX"/.test(py)) fail("shopInteriors.py: Cycles is not switched to OptiX (gpu_setup)");

// 2. the depth table: 3.5-6 m, one per type
if (DEPTH_BY_INDEX.length !== TYPES.length || DEPTH_BY_INDEX.some((d) => !(d >= 3.5 && d <= 6))) fail(`depth table ${DEPTH_BY_INDEX.join(", ")}: every type 3.5-6 m`);

// 3. every window
const W = auditWindows(), S = summary(W);
const metric = /from\s+"\.\/shopScale\.js"/.test(readFileSync(join(ROOT, "viewer/shops/shopWindow.js"), "utf8"));
let bad = 0;
for (const a of W) {
  const why = [];
  const s = acrossScale(a.w);
  if (Math.abs(s - 1) > 0.1) why.push(`across scale ${s.toFixed(2)}`);
  const R = roomLayout(a.w, a.seed);
  if (R.rooms === 1 && (R.o < -1e-6 || R.o + a.w > R.roomW + 1e-6)) why.push(`glass ${R.o.toFixed(2)}..${(R.o + a.w).toFixed(2)} outside its ${R.roomW.toFixed(2)} m room`);
  if (R.rooms > 1 && R.partitions.some((x) => x <= 0.3 || x >= a.w - 0.3)) why.push(`partition at ${R.partitions.map((x) => x.toFixed(2))} not inside the glass`);
  if (R.rooms > 1 && R.roomW !== RW) why.push("side-by-side rooms not RW wide");
  if (!(a.depth >= 3.5 && a.depth <= 6)) why.push(`depth ${a.depth}`);
  if (why.length) { bad++; if (bad <= 12) fail(`${a.tile} (${a.x.toFixed(0)}, ${a.z.toFixed(0)}) ${a.typeName} w ${a.w.toFixed(2)}: ${why.join("; ")}`); }
}
if (bad > 12) fail(`... ${bad - 12} more windows`);

const head = `shopscale: ${S.windows} shop windows in ${S.tiles} tiles; glass ${S.width.min.toFixed(2)}-${S.width.max.toFixed(2)} m (median ${S.width.median.toFixed(2)}); old stretch within +-10 %: ${S.stretchOld.within10}, new: ${S.stretchNew.within10}; rooms side by side (> ${(RW * STRETCH_MAX).toFixed(1)} m): ${S.wide}; same-type twins within 12 m: ${S.twinWindows}`;
if (!metric) {
  console.log(`${head}\nREPORT-ONLY: viewer/shops/shopWindow.js has no metric mapping yet (rule shop-room-metric); ${fails.length} finding(s)`);
  if (!quiet) for (const f of fails) console.log("  " + f);
  process.exit(0);
}
if (fails.length) { console.log(`${head}\nFAIL (rule shop-room-metric):`); for (const f of fails) console.log("  " + f); process.exit(1); }
console.log(`${head}\nPASS`);
