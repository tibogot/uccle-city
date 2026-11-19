// WALL LOOK (claude/sidewalk round 5): the retaining walls' brick and coursed stone must READ as brick / stone at the
// distances they are seen from, never as one flat slab of the base colour (rule 31; docs/SIDEWALK.md round 5).
//
// WHY: round 3's brick faded to the bare base colour (tone 1, no mortar) once a course was under ~3 px: from 6-12 m
// every wall (about 1 km a tile) was a flat orange slab. The face math is now viewer/streets/wallPattern.js, written
// against an ops table: the shader runs it on TSL nodes, this check runs the SAME code on plain numbers.
//
// The check: a wall seen head on by the game camera (fov 55, 720 px high), at 4 / 8 / 12 / 20 / 40 m. Every pixel of a
// 2.4 x 1.2 m patch is shaded like the shader does (base x tone, mortar mixed in by its share); per distance:
//   contrast  std / mean of the pixels' luminance: >= 0.08 up to 12 m (bond / courses / patches readable)
//   drift     the patch mean vs the 4 m mean: within 8 % at every distance (the far face keeps the near face's average,
//             no jump to the bare brick colour)
// It also rebuilds round 3's brick from the same pieces (tone -> 1, mortar -> 0 past ~3 px) and requires the check to
// FAIL it (the check can see the defect), and checks the wiring: roadPaint.js draws the walls with brickFace /
// stoneFace inside its Fn (the TSL If needs one).
//   node tools/audit/wallLook.mjs [--quiet]       exit 1 on a failure
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brickFace, stoneFace, NUM } from "../../viewer/streets/wallPattern.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const fails = [];
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const mixc = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const FOV = 55, H = 720, DIST = [4, 8, 12, 20, 40];
const LOOKS = {
  // (roadPaint.js: the orange-red brick (gardenKit BRICK[2]) and its mortar; the coursed stone and its joints)
  brick: { fn: brickFace, base: [0.28, 0.095, 0.05], mortar: [0.24, 0.23, 0.21], k: 0.9 },
  stone: { fn: stoneFace, base: [0.27, 0.26, 0.235], mortar: [0.17, 0.165, 0.155], k: 0.85 },
};

function patch(look, d, legacy) {
  const px = (d * 2 * Math.tan((FOV / 2) * Math.PI / 180)) / H, L = [];
  for (let v = 0.31; v < 1.51; v += px) for (let u = 0.013; u < 2.413; u += px) {
    const f = look.fn(NUM, u, v, px, px);
    let tone = f.tone, mortar = f.mortar;
    if (legacy) {   // round 3: past ~3 px the bare base (tone 1, mortar 0)
      const far3 = NUM.smoothstep(0.12, 0.35, px / (look.fn === brickFace ? 0.0655 : 0.24));
      tone = NUM.mix(f.tv, 1, far3); mortar = f.joint * (1 - far3);
    }
    L.push(lum(mixc(look.base.map((x) => x * tone), look.mortar, mortar * look.k)));
  }
  const m = L.reduce((a, b) => a + b, 0) / L.length, sd = Math.sqrt(L.reduce((a, b) => a + (b - m) ** 2, 0) / L.length);
  return { mean: m, contrast: sd / m, n: L.length };
}
function judge(name, look, legacy) {
  const rows = DIST.map((d) => ({ d, ...patch(look, d, legacy) })), m0 = rows[0].mean, bad = [];
  for (const r of rows) {
    r.drift = r.mean / m0 - 1;
    if (r.d <= 12 && r.contrast < 0.08) bad.push(`${name} at ${r.d} m: contrast ${r.contrast.toFixed(3)} < 0.08 (a flat face)`);
    if (Math.abs(r.drift) > 0.08) bad.push(`${name} at ${r.d} m: mean ${(r.drift * 100).toFixed(1)} % off the near face (> 8 %)`);
  }
  return { rows, bad };
}
const out = [];
for (const [name, look] of Object.entries(LOOKS)) {
  const now = judge(name, look, false), old = judge(name + " (round 3)", look, true);
  out.push(`${name}: ` + now.rows.map((r) => `${r.d} m c ${r.contrast.toFixed(2)} d ${(r.drift * 100).toFixed(0)}%`).join(" | "));
  out.push(`${name} round 3: ` + old.rows.map((r) => `${r.d} m c ${r.contrast.toFixed(2)} d ${(r.drift * 100).toFixed(0)}%`).join(" | "));
  fails.push(...now.bad);
  // (round 3's brick was the flat one; its coursed stone kept its joints to ~25 m and passes either way)
  if (name === "brick" && !old.bad.length) fails.push(`${name}: the check does not see round 3's flat face (it must fail it)`);
}
// the wiring: the walls drawn with this math, inside an Fn (a TSL If outside one breaks the page's boot)
const paint = readFileSync(join(ROOT, "viewer/roadPaint.js"), "utf8");
if (!/import\s*\{[^}]*brickFace[^}]*stoneFace[^}]*\}\s*from\s*"\.\/streets\/wallPattern\.js"/.test(paint)) fails.push("roadPaint.js does not import brickFace / stoneFace from streets/wallPattern.js");
const blk = paint.slice(paint.indexOf("const wallLook = Fn("), paint.indexOf("const wallCol = wallLook.xyz"));
if (!blk || !/brickFace\(O,/.test(blk) || !/stoneFace\(O,/.test(blk) || !/If\(isWall/.test(blk)) fails.push("roadPaint.js: the wall colour is not brickFace / stoneFace inside the Fn's If(isWall)");
if (!/wallLook\.w, isWall\)/.test(paint)) fails.push("roadPaint.js: the walls' roughness is not the pattern's (mortar rougher)");

if (!quiet || fails.length) for (const l of out) console.log("  " + l);
for (const f of fails) console.log("FAIL " + f);
console.log(fails.length ? `wallLook: ${fails.length} FAIL` : "wallLook: ok");
process.exit(fails.length ? 1 : 0);
