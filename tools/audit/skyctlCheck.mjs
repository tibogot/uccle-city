// SKYCTL GATE (docs/QUALITY_RULES.md rule 18): the dev panel's sky look controls stay consistent and default to the
// look as it was. Offline, a second.
//   - every SKY_URL key (viewer/lighting.js) has a viewer/features.js number row, live-linked to the panel control of the
//     same label (viewer/devPanel.js SKY_CTL), with the same range, and a default equal to the sky's own default
//     (vendor/firmament FIRMAMENT_DEFAULTS, or viewer/skyExtras.js SKY_X_DEFAULTS) and inside that range
//   - every panel control is in SKY_URL; no key twice
//   - the extras' defaults are the identity (sun disc x1, no extra glow, no tint, moon x1, sunlight x1)
//   - a multiply pass into the environment draws with autoClear off (a clear first = black shadows everywhere)
//   - viewer/skyExtras.js adds no light and builds no node / material in its per-frame afterUpdate() (rule 7: fixed
//     light count; sliders are uniforms only, never a shader rebuild)
// Exit 1 on any failure.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const errs = [];
const fail = (m) => errs.push(m);

// SKY_URL
const light = read("viewer/lighting.js");
const urlBlock = light.match(/export const SKY_URL = \[([\s\S]*?)\];/);
if (!urlBlock) { console.error("skyctl: SKY_URL not found in viewer/lighting.js"); process.exit(1); }
const SKY_URL = [...urlBlock[1].matchAll(/\["(\w+)",\s*"(\w+)"\]/g)].map((m) => [m[1], m[2]]);
if (SKY_URL.length < 13) fail(`SKY_URL has ${SKY_URL.length} entries (expected 13+)`);
for (const i of [0, 1]) { const seen = new Set(); for (const e of SKY_URL) { if (seen.has(e[i])) fail(`SKY_URL: ${e[i]} twice`); seen.add(e[i]); } }

// the defaults: Firmament's (its literal block, evaluated: our own vendored file) + the extras'
const firm = read("vendor/firmament/firmamentSky.js");
const fb = firm.match(/export const FIRMAMENT_DEFAULTS = \{([\s\S]*?)\n\};/);
const FD = {};
for (const m of fb[1].matchAll(/^\s{2}(\w+):\s*([^\n]+?),\s*(?:\/\/.*)?$/gm)) {
  try { const v = Function("Math", `return (${m[2]});`)(Math); if (typeof v === "number") FD[m[1]] = v; } catch { /* not a number */ }
}
const extras = read("viewer/skyExtras.js");
const xb = extras.match(/export const SKY_X_DEFAULTS = (\{[^}]*\});/);
const XD = Function(`return (${xb[1]});`)();
const IDENTITY = { sunDiscBright: 1, sunHalo: 0, skyTint: 0, moonBright: 1 };
for (const [k, v] of Object.entries(IDENTITY)) if (XD[k] !== v) fail(`SKY_X_DEFAULTS.${k} = ${XD[k]}, the look as before needs ${v}`);
if (FD.sunScale !== 1) fail(`Firmament sunScale default ${FD.sunScale}, the look as before needs 1`);
const defOf = (k) => (k in XD ? XD[k] : FD[k]);

// the panel's controls
const panel = read("viewer/devPanel.js");
const cb = panel.match(/const SKY_CTL = \{([\s\S]*?)\n\s*\};/);
const CTL = {};
for (const m of cb[1].matchAll(/(\w+):\s*\[([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*"([^"]+)"/g)) CTL[m[1]] = { lo: +m[2], hi: +m[3], label: m[5] };
for (const k of Object.keys(CTL)) if (!SKY_URL.some(([, p]) => p === k)) fail(`panel control ${k} has no SKY_URL key`);

// the URL rows
const { FEATURES } = await import(pathToFileURL(path.join(ROOT, "viewer/features.js")).href);
for (const [key, p] of SKY_URL) {
  const f = FEATURES.find((x) => x.key === key), c = CTL[p], d = defOf(p);
  if (!f) { fail(`?${key}: no viewer/features.js row`); continue; }
  if (f.type !== "number") fail(`?${key}: row type ${f.type}, expected number`);
  if (!c) { fail(`?${key} (${p}): no panel control`); continue; }
  if (f.live !== c.label) fail(`?${key}: row live "${f.live}" != panel label "${c.label}"`);
  if (f.min !== c.lo || f.max !== c.hi) fail(`?${key}: row range ${f.min}..${f.max} != panel ${c.lo}..${c.hi}`);
  if (typeof d !== "number") { fail(`?${key} (${p}): no default in FIRMAMENT_DEFAULTS / SKY_X_DEFAULTS`); continue; }
  if (Math.abs(f.def - d) > 0.005) fail(`?${key}: row default ${f.def} != the sky's ${+d.toFixed(4)}`);
  if (d < c.lo || d > c.hi) fail(`?${key}: default ${d} outside the panel range ${c.lo}..${c.hi}`);
}

// rule 7 + uniforms only: no light, and nothing built per frame
if (/new THREE\.\w*Light\b|\.add\(\s*new THREE/.test(extras)) fail("viewer/skyExtras.js creates a light / adds to the scene (rule 7)");
const au = extras.match(/function afterUpdate\(\) \{([\s\S]*?)\n  \}/);
if (!au) fail("viewer/skyExtras.js: afterUpdate() not found");
else if (/needsUpdate|Fn\(|new THREE\.|NodeMaterial|colorNode/.test(au[1])) fail("viewer/skyExtras.js afterUpdate() rebuilds a node / material (sliders must be uniforms only)");
// a pass that MULTIPLIES into Firmament's environment must not clear it first (the black-shadows bug the tour caught)
if (au && /\.render\(renderer\)/.test(au[1]) && !/autoClear = false/.test(au[1])) fail("viewer/skyExtras.js afterUpdate() draws into a target with autoClear on (it clears the environment it multiplies)");

if (errs.length) { for (const e of errs) console.log(`FAIL ${e}`); console.log(`skyctl: ${errs.length} failure(s)`); process.exit(1); }
console.log(`skyctl: OK, ${SKY_URL.length} sky controls: rows, ranges, defaults (= the look as before), no lights, uniforms only`);
