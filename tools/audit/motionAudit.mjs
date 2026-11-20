#!/usr/bin/env node
// MOTION + UPSCALE AUDIT (claude/sharp, 2026-11-17; docs/UPSCALE.md "Why it happened + rule"). A static check of the
// viewer's source, run by tools/audit/mergeGate.mjs (and alone: node tools/audit/motionAudit.mjs). Exit 1 on a FAIL.
//
// RULE 1  every moving mesh writes motion vectors. The TAAU reprojects each pixel's history with the camera's motion +
//         the object's own: a mesh moved by its matrix gets it automatically (upscale.js ObjectMotionMatrix), a skinned
//         mesh through last frame's bones (upscale.js needsPreviousData), but an InstancedMesh re-written every frame or
//         a vertex shader that moves geometry (wind, GPU-simulated birds) must hand its motion to the motion MRT
//         (instMotion.js InstancePrev.hook / upscale.js setMotionDelta). Without it the mover keeps the CAMERA's
//         motion: its trailing edges speckle, a followed mover shimmers. So every file that writes instance matrices
//         (setMatrixAt / instanceMatrix.needsUpdate) or deforms geometry over time (positionNode with wind / time) must
//         be listed below: MOVER (and then reference the motion hooks) or STATIC (written on load / on change: say why).
//         A new file in neither list FAILS: decide which it is.
// RULE 2  the upscaler keeps its sharpness guarantees: the history's disocclusion test knows the objects' own motion
//         (motion.z), the history fetch is Catmull-Rom, a sharpen runs after the resolve by default, the texture mip
//         bias is on, and the auto preset's soft floor is >= 0.75.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const V = join(ROOT, "viewer");
const MOTION_REF = /setMotionDelta|InstancePrev|\.hook\(|instMotion|ipBase/;

/** movers: their per-frame instance writes / time deformation reach the motion MRT */
const MOVER = {
  "traffic/trafficFleet.js": "traffic cars (InstancePrev)",
  "moto/cityTwoWheelers.js": "traffic two-wheelers (InstancePrev)",
  "tram2Model.js": "trams, the default model (InstancePrev)",
  "rail/trainModel.js": "SNCB trains (InstancePrev)",
  "falconFlight/pigeons.js": "pigeons (InstancePrev)",
  "props/cityProps.js": "knocked-over street props: the proxies (InstancePrev; the layers' materials hooked at start)",
  "birds/skyFlocks.js": "sky flocks (p - v dt in the shader)",
  "foliage/hedges.js": "hedge wind (windPrev)", "foliage/ivy.js": "ivy wind", "foliage/plants.js": "plant wind",
  "gardens/gardenHedge.js": "garden hedge wind", "gardens/gardenHedgeOld.js": "garden hedge wind (?hedges=old)", "plants/cityIvy.js": "city ivy wind", "plants/plantMaterial.js": "plant wind",
};
/** written on load / on change, or not drawn in the city by default: no per-frame motion */
const STATIC = {
  "carFleet.js": "parked cars: written when a tile comes / goes",
  "cars.js": "parked cars (old path): per tile, once",
  "facadeKit/kitField.js": "facade kit pieces: per tile",
  "fuel/cityFuel.js": "fuel stations: once", "furniture.js": "street furniture: per tile", "furniture2/cityFurniture.js": "street furniture: per tile", "tlights/cityTLights.js": "traffic light posts: per tile (collision stand-ins, never move)",
  "gardens/cityGardens.js": "gardens: per tile", "grass/grassField.js": "grass trunks: once (grass default off)",
  "impostorKit/sources/stylizedTrees.js": "impostor bake source: one identity instance", "impostors.js": "impostor bake: identity instance",
  "lamps.js": "street lamps: per tile", "nightLights/cityNight.js": "night light cards: on change", "nightLights/nightStreet.js": "night lab street: once",
  "parkKit.js": "park kit: per tile", "parkPlants.js": "park plants: per tile", "plants/cityPlants.js": "plants: per tile",
  "police/props.js": "police cones / standing cars: on job change (the cars are rigid meshes: ObjectMotionMatrix)",
  "rail/railway.js": "railway kit: once", "stops/cityStops.js": "STIB stops: per tile", "streetFit.js": "kerb fit: per tile",
  "streetkit/cityStreetKit.js": "street kit: per tile", "streetlife/streetlife.js": "shop fronts / signs: per tile",
  "trees.js": "old tree cards: per tile (no wind motion: three's time; not default)", "water/pondWater.js": "pond pads / reeds: once",
  "weather/cityWeather.js": "rain / snow particles: screen effect, no motion wanted", "weather/snowCaps.js": "snow caps: on change",
  "flags/flagField.js": "flags' cloth (KNOWN GAP: wave in the shader, no motion delta; small, slow)",
  "tramModel.js": "tram V1 (?tram=v1, not default)", "tramline.js": "box trams (?tram=box, not default)",
  "falconFlight/hints.js": "thermal hints (KNOWN GAP: gulls + dust, hidden in the city: group.visible = false)",
  "pedestrians/personMaterial.js": "pedestrians (KNOWN GAP: GPU pose buffer, no previous pose; walking 1.4 m/s = 2 cm / frame)",
  "pedestrians/props.js": "pedestrians' props (KNOWN GAP, as the pedestrians)",
  "police/policeCar.js": "player's police car: rigid meshes (ObjectMotionMatrix)",
  "drive/carPacks.js": "car pack materials: a constant per-part offset (the fleets' motion: trafficFleet InstancePrev; the player's car: rigid)",
  "facadeKit/kitMaterials.js": "kit pieces: a constant mitre offset", "impostorKit/material.js": "impostor trees: appear fade, no motion",
  "impostorKit/bake.js": "impostor bake (offline in the page)", "tram.js": "old catenary / poles: once (the wires are blended thin geometry)",
  "treesStylized.js": "street trees: windAmp 0 in the city (no sway)",
  "foliage/grass.js": "wind grass (KNOWN GAP: default off)", "grass/grass.js": "wind grass (KNOWN GAP: default off)",
  "weather/precipitation.js": "rain / snow particles: a screen effect, no motion wanted", "weather/snowExtras.js": "icicles / drips: weather effect",
};

function walk(d, out = []) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith(".js") && !n.endsWith(".bundle.js") && !n.includes("Worker")) out.push(p);
  }
  return out;
}

const fails = [], warns = [], passes = [];
const files = walk(V);
for (const f of files) {
  const rel = relative(V, f).replace(/\\/g, "/");
  const src = readFileSync(f, "utf8");
  const writesInst = /\.setMatrixAt\(|instanceMatrix\.needsUpdate\s*=\s*true/.test(src);
  const deforms = /positionNode\s*=/.test(src) && /\b(time|uTime|windAt|flutter|wind\.)\b/.test(src);
  if (!writesInst && !deforms) continue;
  if (MOVER[rel]) {
    if (MOTION_REF.test(src)) passes.push(`mover   ${rel}: ${MOVER[rel]}`);
    else fails.push(`mover   ${rel}: listed as a mover but has no motion hook (setMotionDelta / InstancePrev)`);
  } else if (STATIC[rel]) {
    (STATIC[rel].includes("KNOWN GAP") ? warns : passes).push(`static  ${rel}: ${STATIC[rel]}`);
  } else if (MOTION_REF.test(src)) {
    passes.push(`mover   ${rel}: has a motion hook (add it to MOVER in tools/audit/motionAudit.mjs)`);
  } else {
    fails.push(`unknown ${rel}: writes instance matrices / deforms over time with no motion hook: a MOVER (wire InstancePrev / setMotionDelta) or STATIC (list it with the reason)`);
  }
}
for (const rel of Object.keys(MOVER)) if (!files.some((f) => relative(V, f).replace(/\\/g, "/") === rel)) fails.push(`mover   ${rel}: listed but missing`);

// RULE 2: the upscaler's guarantees
const up = readFileSync(join(V, "upscale.js"), "utf8"), post = readFileSync(join(V, "post.js"), "utf8");
const check = (ok, msg) => (ok ? passes : fails).push(`upscale ${msg}`);
check(/export const SHARP_DEPTH = !isOld\("taadepth"\)/.test(up) && /motTap\.z/.test(up), "the disocclusion test adds the object's own view-z motion (motion.z)");
check(/export const SHARP_HIST = !isOld\("taahist"\)/.test(up) && /function catmullRom/.test(up), "history fetched with Catmull-Rom by default");
check(/sharpenResolved\(resolved/.test(post) && /export const SHARP_RCAS = !isOld\("rcas"\)/.test(up), "a sharpen (RCAS) runs after the resolve by default");
const sf = up.match(/const sharpFor = \(s\) => SHARP_RCAS \? clamp\(([\d.]+)/);
check(sf && +sf[1] > 0, `sharpen strength > 0 at scale 1 (${sf?.[1]})`);
check(/TN\.generateSnippet = function/.test(up) && /uMipBias\.value = Math\.log2\(s\)/.test(up), "texture mip bias log2(scale) on the scene pass");
const auto = up.match(/auto: \{[^}]*min: ([\d.]+)[^}]*soft: ([\d.]+)/);
check(auto && +auto[2] >= 0.75, `auto preset soft floor >= 0.75 (${auto?.[2]}; hard floor ${auto?.[1]} only on missed frames)`);
check(/function frameRule\(now\)/.test(up) && /x > 20.8/.test(up), "the dynamic resolution decides on missed frames (not raw GPU ms: the laptop clock trap)");
check(/needsPreviousData = function/.test(up) && /isSkinnedMesh === true/.test(up), "skinned meshes skin last frame's bones in the scene pass");

const out = (tag, list) => list.forEach((l) => console.log(`${tag} ${l}`));
out("PASS", passes); out("WARN", warns); out("FAIL", fails);
console.log(`motionAudit: ${passes.length} pass, ${warns.length} warn (known gaps), ${fails.length} fail`);
process.exitCode = fails.length ? 1 : 0;
