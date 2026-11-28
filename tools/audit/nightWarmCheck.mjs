// NIGHT WARM GATE (claude/nightload, rule docs/rules/night-warm-at-night.md).
//   node tools/audit/nightWarmCheck.mjs [--quiet]          exit 1 on a failure
// WHY: the lamp shadows' warm-up (viewer/nightLights/cityNight.js warmShadows) points both shadow lamps at the city from
// 350 m up for a frame, so it may only run while the lamps are dark: it was called from the by-day branch only. A game
// started at night (?game=police&time=night) never ran it: warmPending() never fell, the play loader sat at its 70 s
// limit (~750 casters queued) and every caster's lamp pass was built on screen as the lamps came near (2026-11-28).
// RULE: at night the casters' lamp passes are warmed IN PLACE, without moving or adding a light: one zero-scale stand-in
// per (material, geometry layout) - the node build and pipeline are shared by every mesh with that key - on the lamps'
// own layer, both maps forced to a full render that frame, kept until both passes drew it; under the play loader many
// keys a frame (the loader waits for the spawn ring's), after play one key every NIGHT_GAP frames.
// Checks (text, the code paths): the night branch calls nightStep; the stand-ins are zero-scale, frustumCulled off, on
// LAMP_SHADOW_LAYER only (never the main camera's 0), deduped by fadeLayoutKey; the in-flight batch waits for both lamp
// passes' counts; no light is created and no DynamicDrawUsage in cityNight.js beyond the fixed pool; warmPending takes
// the spawn point and main.js passes it; ?nightwarm=old keeps the old path; the features row.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const CN = read("viewer/nightLights/cityNight.js"), M = read("viewer/main.js"), F = read("viewer/features.js");

ok(/const NIGHT_WARM = qp\.get\("nightwarm"\) !== "old"/.test(CN), "cityNight.js: ?nightwarm=old switch");
ok(/if \(scale > 0\) \{[\s\S]{0,200}const nightWarmNow = NIGHT_WARM && !warming && nightStep\(\);/.test(CN), "the NIGHT branch (scale > 0) runs the night warm-up (the by-day warm never runs at night)");
const s0 = CN.indexOf("const nightStep = () =>"), s1 = CN.indexOf("nightFlight = { c: shadowLights.map(passCount), f: 0 };", s0);
const step = s0 >= 0 && s1 > s0 ? CN.slice(s0, s1 + 60) : "";
ok(step.length > 200, "nightStep found");
ok(/p\.matrix\.copy\(ZERO\); p\.matrixWorld\.copy\(ZERO\)/.test(step) && /const ZERO = new THREE\.Matrix4\(\)\.makeScale\(0, 0, 0\)/.test(CN), "stand-ins are zero-scale (no pixel written: nothing to see at night)");
ok(/p\.layers\.set\(LAMP_SHADOW_LAYER\)/.test(step) && !/layers\.enable\(0\)/.test(step) && /p\.frustumCulled = false/.test(step), "stand-ins on the lamps' layer only (never the main camera's), not culled");
ok(!/\.position\.set\(/.test(step) && !/\.intensity\s*=/.test(step), "nightStep moves no light and changes no intensity (the lamps keep lighting the street)");
ok(/const nightKey = \(o, m\) => `\$\{m\.uuid\}\|\$\{fadeLayoutKey\(o\)\}`/.test(CN) && /nightKeys\.has\(k\) && !nightPend\.has\(k\)|!nightKeys\.has\(k\) && !nightPend\.has\(k\)/.test(CN), "one stand-in per (material, geometry layout): the shared node build / pipeline");
ok(/const drawn = shadowLights\.every\(\(L, k\) => \{ const c = passCount\(L\);[\s\S]{0,80}c > nightFlight\.c\[k\]/.test(step), "the batch stays until BOTH lamp passes drew it (the loader renders one rAF in three)");
ok(/let n = hold \? NIGHT_HOLD_PER : 1;/.test(step) && /if \(!hold && frames - nightLast < NIGHT_GAP\) return false;/.test(step), "after play: one key at most every NIGHT_GAP frames");
ok(/if \(nightWarmNow\) \{[\s\S]{0,200}L\.shadow\.needsUpdate = true;[\s\S]{0,400}plan = "full"; \}\s*continue;/.test(CN), "the warm frame renders both maps in full (a valid refresh, the cache re-laid)");
// fixed light count + no DynamicDrawUsage (rules fixed-light-count, no-dynamic-draw-usage)
const lights = (CN.match(/new THREE\.(SpotLight|PointLight|DirectionalLight|RectAreaLight|HemisphereLight)\(/g) || []).length;
ok(lights <= 1, `cityNight.js creates its shadow lamps in ONE place (the fixed pool, before the warm-up): ${lights} light constructors`);
ok(!/new THREE\.\w*Light\(/.test(step), "nightStep creates no light");
ok(!/DynamicDrawUsage/.test(CN), "no DynamicDrawUsage in cityNight.js");
ok(/warmPending: \(near = null\) =>[\s\S]{0,300}NIGHT_WARM && lastScale > 0[\s\S]{0,900}near\.r/.test(CN), "warmPending at night: the stand-in keys left, only the spawn ring's when given a point");
ok(M.includes("cityNight?.warmPending?.({ x, z, r: near })"), "main.js areaReady passes the spawn point (the loader waits for the ring's keys only)");
ok(/old\("nightwarm"/.test(F), "viewer/features.js has the ?nightwarm=old row");
ok(fs.existsSync(path.join(ROOT, "docs/rules/night-warm-at-night.md")), "docs/rules/night-warm-at-night.md exists");
// (rule spawn-hold-parallel) the police yard spawn: the character's boot beside the area hold, then a short second hold
const K = read("viewer/game/kit.js");
ok(/const SPAWN_PAR = params\.get\("spawnpar"\) !== "old"/.test(M) && /if \(SPAWN_PAR && o\.mode === "third" && !third && !o\.after\) \{[\s\S]{0,200}await Promise\.all\(\[teleportNow\(o\), areaReady\(\{ x: o\.x, z: o\.z, label, near \}\)\]\)[\s\S]{0,120}r\.ready = await areaReady\(\{[\s\S]{0,90}settle: false \}\)/.test(M), "main.js teleport: a first teleport into third person boots the character BESIDE the area hold, then a short second hold (its first frames under the cover)");
ok(/mode === "third" && !this\.host\.getThird\(\) && \/\[\?&\]spawnpar=old/.test(K), "game/kit.js spawnPlayer: no character boot BEFORE the teleport (only under ?spawnpar=old)");
ok(/old\("spawnpar"/.test(F) && fs.existsSync(path.join(ROOT, "docs/rules/spawn-hold-parallel.md")), "features row ?spawnpar=old + docs/rules/spawn-hold-parallel.md");

console.log(fails ? `nightwarm: ${fails} FAIL` : "nightwarm: all ok");
process.exit(fails ? 1 : 0);
