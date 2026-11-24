// THE CHRISTMAS KIT: the model (tools/blender/christmasKit.py -> tools/christmas_pack.mjs -> models/christmas/christmas.glb)
// and its materials (docs/CHRISTMAS.md). Loaded by viewer/christmas/xmasCity.js.
//
// The GLB carries geometry only: nodes "<piece>_lod<k>", one primitive per NAMED slot. COLOR_0 = (r: a random per
// element: LED phase / frond tint, g: variant: bauble colour 0 red / 0.5 gold / 1 champagne, LED 1 = a flash bulb, needle
// shade; b: Cycles AO). LOD0 has TEXCOORD_0 in metres (u along a frond: the needle pattern), LOD1 / LOD2 none.
//
// Materials are ours, by slot (TSL, no texture): ONE material per slot for every piece and level of detail (instanced:
// the per-instance attribute "xlod" = (band start, band end, id hash, 0) gives each instance its distance band; the
// dithered cross-fade between levels is per pixel, so the materials are shared and compiled once). Lights are EMISSIVE
// only (the fixed light count: docs/NIGHT_HOOKUP.md), twinkling in the shader (sin of time + a per-bulb phase, ~14 %
// flash bulbs), strong at night (env.uNight), faint by day (LEDs are on by day too). The greenery, wood, metal and
// ribbon take the weather (wxMat: snow on the up-facing needles, wet sheen).
//
// THE FIR'S NEAR LEVEL (tree LOD0, slot "fir_cards"): alpha-TESTED needle cards (never blended: no sorting, depth kept)
// mapping the modelled Nordmann sprays of models/christmas/fir_needles.ktx2 (tools/blender/firNeedles.py: top views in
// v 0 .. 0.5, the same sprays from below in v 0.5 .. 1: the back face samples there: the silvery undersides), shaded
// with the CANOPY normals the kit baked into NORMAL for both faces (normalViewGeometry: not flipped on the back face;
// a card lit by its own plane reads as a flat leaf), the canopy AO in COLOR_0.b. FIR ROUND 3: the MIDDLE level (LOD1)
// is a shell of big cards of the same atlas round a thin dark solid core (the same material: no colour step at 45 m);
// the FAR level (LOD2) keeps the solid fronds and casts the shadow of all three (FIR.shadow below).
import * as THREE from "three/webgpu";
import {
  attribute, uv, vec2, vec3, vec4, float, mix, smoothstep, clamp, max, fract, sin, abs, pow, time, select, positionWorld, uniform, Fn, normalWorld,
  texture, frontFacing, normalViewGeometry, normalView, positionView, context,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { keepBand, rampTo, lodEye, ditherNoise } from "../lodFade.js";
import { wxMat } from "../weather/cityWeatherize.js";
import { env } from "../lighting.js";
import { ktxLoader } from "../materials/scans.js";
import { foliageLights } from "../foliage/vertexLight.js";

// FIR ROUND 3 (docs/CHRISTMAS.md, rule 19): the needle cards' cost at 8 m (+0.26 ms against a 0.1 ms budget) was the lit,
// alpha-tested shader running on ~7.5 layers of cards per visible pixel (tools/christmas/firCost.mjs) and the cards'
// alpha-tested shadow. Switches (URL, read once; the browser turn A/Bs them):
//   ?firprepass=0   the cards in ONE alpha-tested lit pass (before). Default: a depth PRE-PASS twin (the atlas' alpha
//                   tap + discard, no colour) drawn first, then the lit pass with depth EQUAL and no discard: the lit
//                   shader once per visible pixel (as the city's leaves and impostors, viewer/treesStylized.js)
//   ?firshadow=cards  every level casts its own shadow, the cards alpha-tested (before). Default "far": the FAR level's
//                   solid fronds + trunk cast the shadow of all three levels (shadow-only copies on XMAS_SHADOW_LAYER):
//                   no alpha-tested cards in the sun's map (noisy, ~3 x the lanes), no shadow change at either switch
const QS = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
export const FIR = { prepass: QS.get("firprepass") !== "0", shadow: QS.get("firshadow") === "cards" ? "cards" : "far" };
// FIR ROUND 4 (claude/xmas3, docs/CHRISTMAS.md 7.3): the fir's cost at 8 m at night was the CARDS' LIGHTING: the lit
// pass ran the night's whole light set over every visible card pixel (the cluster loop of the pooled lamp lights + the
// two shadowed lamp spots with their shadow maps). Measured live (debug/xmasPerf.js, the cards' material swapped): the
// sun + sky only -0.14 ms at 8 m; the cluster loop alone or the spots alone ~-0.03 (only both gone frees the shader);
// the lamps' light on the crown is not seen (Place Saint-Job at night, 6 m from the fir: mean brightness 17.77 vs 17.78
// of 255). Switch (URL, read once; live for the A/B: window.xmas.setLight):
//   ?firlight=old   the needle cards lit by every scene light (before). Default: the sun / moon + the sky only
//                   (foliage/vertexLight.js foliageLights, as the city's grass, plants and ivy): the moon's shadow, the
//                   canopy normals, the sky light and the snow are unchanged; by day the lamps are off (no change)
export const XMAS_LIGHT = { cards: QS.get("firlight") !== "old" };
/** the light path above on a slot's material (returns it) */
function applyLight(m, slot, light) {
  if (light.cards && slot === "fir_cards") { const L = foliageLights(); if (L) m.lightsNode = L; m.userData.foliageLights = true; }
  return m;
}
/** the sun's shadow camera draws this layer too (viewer/christmas/xmasCity.js): the tree's shadow-only casters */
export const XMAS_SHADOW_LAYER = 25;

/** live look controls (dev panel / console: window.xmas.look) */
export const xmasLook = {
  night: uniform(9.0),          // LED emission at night (x the colour; bloom makes the halo)
  day: uniform(1.1),            // ... by day (lit bulbs in daylight: small, warm)
  twinkle: uniform(1.0),        // 0 = steady
  flash: uniform(1.0),          // the flash bulbs' sparkle
  rope: uniform(0.75),          // LED rope (motifs) vs bulbs
  star: uniform(0.7),
  cards: uniform(0.78),         // the needle cards' albedo gain: 0.78 matches the far fronds' green at the 45 m switch (browser, 2026-11-17)
  under: uniform(0.55),         // the cards' back faces (the silvery undersides seen from below; 0.55: the switch)
};

/** the needle atlas: a 1 x 1 opaque stand-in until loaded (node tests: no renderer) */
const NEEDLES = { tex: new THREE.DataTexture(new Uint8Array([40, 70, 45, 255]), 1, 1), loaded: false };
NEEDLES.tex.colorSpace = THREE.SRGBColorSpace; NEEDLES.tex.needsUpdate = true;
async function loadNeedles(renderer, info) {
  if (!renderer || !info.needles) return;
  // (fetched here at LOW priority, then parsed: the shared KTX2 loader keeps its own priority for the ground's textures)
  const buf = await fetch(BASE + info.needles.file, XMAS_FETCH).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); });
  const t = await new Promise((res, rej) => ktxLoader(renderer).parse(buf, res, rej));
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.generateMipmaps = false;
  t.name = "xmas fir needles";
  NEEDLES.tex = t; NEEDLES.loaded = true;
}

const BASE = new URL("../../models/christmas/", import.meta.url).href;
/** BOOT PRIORITY (plan job 3, docs/CHRISTMAS.md "Boot with the layer on"): from 1 December every visitor downloads the
 *  layer (6 MB GLB + 0.8 MB atlas + JSON). Every Christmas fetch is a LOW-priority request (fetch priority hint, r187
 *  Loader.setPriority) so it never competes with the start tile and the boot's own files on a cold visit
 *  (PERF_RESEARCH idea 8). Rule xmas-low-priority: gate row `xmas` checks every fetch / loader under viewer/christmas/. */
export const XMAS_FETCH = { priority: "low" };
let promise = null;
export function loadXmasKit(renderer = null) {
  return (promise ??= (async () => {
    const t0 = performance.now();
    if (typeof Worker !== "undefined") MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setPriority(XMAS_FETCH.priority);
    const [gltf, info] = await Promise.all([loader.loadAsync(BASE + "christmas.glb"), fetch(BASE + "christmas.json", XMAS_FETCH).then((r) => r.json())]);
    // (the needle atlas before any material is made: the cards' texture node takes it as built)
    await loadNeedles(renderer, info).catch((e) => console.warn(`[christmas] needle atlas failed (${e.message}): the fir's near cards show flat`));
    const pieces = {};
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      let m = null;
      for (let q = o; q && !m; q = q.parent) m = /^(.*)_lod(\d)$/.exec(q.name);
      if (!m) return;
      const [, piece, k] = m;
      o.geometry.computeBoundingSphere();
      o.geometry.userData.shared = true;
      (pieces[piece] ??= { name: piece, lods: [] });
      (pieces[piece].lods[+k] ??= []).push({ slot: o.material.name, geometry: o.geometry });
    });
    for (const p of Object.values(pieces)) {
      p.range = info.lods?.[p.name]?.range ?? [30, 90, 300];
      p.tris = p.lods.map((l) => l.reduce((s, x) => s + x.geometry.index.count / 3, 0));
    }
    const mats = {};
    // mask: the dithered band (instances near a level switch); without: solid (no discard, early depth kept)
    // pass (the needle cards only): "depth" = the pre-pass twin, "colour" = the lit EQUAL-depth pass, null = one pass
    // light: XMAS_LIGHT (the URL's) or another { cards } (the live A/B: both variants side by side, own cache keys)
    const slotMaterial = (slot, { uvs = false, instanced = true, mask = true, pass = null, light = XMAS_LIGHT } = {}) => (mats[`${slot}|${uvs ? "u" : "-"}|${instanced ? "i" : "s"}|${instanced && mask ? "m" : "-"}|${slot === "fir_cards" && pass ? pass : ""}${light === XMAS_LIGHT ? "" : `|L${+!!light.cards}`}`] ??= applyLight(make(slot, uvs, instanced, instanced && mask, slot === "fir_cards" ? pass : null), slot, slot === "fir_cards" && pass === "depth" ? {} : light));
    return { pieces, info, slotMaterial, mats, needles: NEEDLES, loadMs: performance.now() - t0, bytes: (info.glb_bytes ?? 0) + (NEEDLES.loaded ? info.needles?.ktx2_bytes ?? 0 : 0) };
  })());
}

// ------------------------------------------------------------------------------------------------ shared nodes
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };     // (sRGB hex -> linear)
const COL = () => attribute("color", "vec4");
/** the per-pixel level-of-detail band: keep when this pixel's distance is inside [start, end) of the instance's level,
 *  dithered over the last 12 % of each end (the next level keeps the complement: no pop, no double draw) */
export const LOD_FADE = 0.12;      // (the dithered cross-fade: the last 12 % of each band; the fir's 45 m switch over 39.6-45 m)
function bandMask(xlod) {
  const d = positionWorld.sub(lodEye).length();
  const lo = xlod.x, hi = xlod.y;
  const fOut = rampTo(d, hi, hi.mul(LOD_FADE));                // 0 -> 1 toward the band's end
  const fIn = select(lo.greaterThan(0.5), rampTo(d, lo, lo.mul(LOD_FADE)), float(1));   // the previous level's fade
  return keepBand(fOut, fIn, ditherNoise());
}
/** the light level: faint by day, strong at night */
const level = () => mix(xmasLook.day, xmasLook.night, env.uNight);
/** a per-element phase in [0, 1): the element's own random (COLOR_0.r) + the instance's id hash */
const phaseOf = (instanced) => (instanced ? fract(COL().x.add(attribute("xlod", "vec4").z)) : COL().x);

function make(slot, uvs, instanced, mask = instanced, pass = null) {
  const c = COL();
  const ao = mix(float(0.35), float(1), c.z);                  // the baked AO (0.35 floor: AO is not shadow)
  let m;
  const std = (o) => { m = new THREE.MeshStandardNodeMaterial(o); };
  switch (slot) {
    case "fir_needles": {
      std({ roughness: 0.62, metalness: 0 });
      // Nordmann fir: deep glossy green, a silvery-blue cast on some sprays (the needles' undersides), tint per frond (r),
      // shade toward the inside (g); LOD0: the needle strokes across each spray (u along it, v round it) as colour + rough
      let col = mix(lin(0x16301e), lin(0x24452b), c.x).mul(mix(float(0.45), float(1), c.y));
      col = mix(col, lin(0x3c5a52), smoothstep(0.82, 1.0, c.x).mul(0.35));
      if (uvs) {
        const t = uv();
        const s = fract(t.x.mul(38.0).add(t.y.mul(6.0)));              // needles: fine diagonal strokes along the spray
        const stroke = smoothstep(0.0, 0.25, s).mul(smoothstep(1.0, 0.6, s));
        col = col.mul(mix(float(0.72), float(1.12), stroke));
        m.roughnessNode = mix(float(0.75), float(0.5), stroke);
      }
      // the Nordmann's two-tone needles: dark glossy green above, silvery blue-green below (the faces turned down)
      col = mix(col, lin(0x6d8a80).mul(mix(float(0.55), float(0.9), c.y)), smoothstep(0.1, -0.5, normalWorld.y).mul(0.6));
      m.colorNode = col.mul(ao);
      wxMat(m, { porosity: 0.35 });
      break;
    }
    case "fir_cards": {
      // the needle sprays: the atlas' albedo (front: the top views; back: the bottom views, v + 0.5), the per-card tint
      // (r), the canopy AO (b); glossy above, matt silvery below; alpha TESTED at 0.5 (coverage-preserving mips)
      const t = uv();
      const tx = texture(NEEDLES.tex, select(frontFacing, t, t.add(vec2(0, 0.5))));
      const cut = tx.a.greaterThanEqual(0.5);
      const keep = mask ? cut.and(bandMask(attribute("xlod", "vec4"))) : cut;
      const tag = `${instanced ? (mask ? " (fade)" : "") : " (static)"}`;
      if (pass === "depth") {
        // FIR ROUND 3: the depth pre-pass twin: the atlas' alpha + the band, no colour; the same @invariant position as
        // the lit pass (its depth must come out bit-equal for the EQUAL test)
        m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
        m.maskNode = keep; m.colorWrite = false; m.contextNode = context({ invariant: true });
        m.name = `xmas fir_cards depth${tag}`; m.userData.shared = true; m.userData.cards = true; m.userData.depthPrepass = true;
        return m;
      }
      m = new THREE.MeshStandardNodeMaterial({ roughness: 0.5, metalness: 0, side: THREE.DoubleSide });
      const tint = mix(float(0.86), float(1.12), c.x).mul(select(frontFacing, float(1), xmasLook.under));
      m.colorNode = tx.rgb.mul(tint).mul(xmasLook.cards).mul(mix(float(0.3), float(1), c.z));
      m.roughnessNode = select(frontFacing, float(0.46), float(0.72));
      m.normalNode = normalViewGeometry;          // (the canopy normal on BOTH faces: DoubleSide would flip the back's)
      m.maskNode = keep; m.maskShadowNode = keep;
      m.alphaTest = 0; m.transparent = false;
      if (pass === "colour") {
        // the lit pass after the twin: no discard (early depth works), only where the twin's depth is (EQUAL)
        m.maskNode = null; m.depthFunc = THREE.EqualDepth; m.depthWrite = false; m.contextNode = context({ invariant: true });
      }
      wxMat(m, { porosity: 0.35, snowMask: select(frontFacing, float(1), float(0.2)) });   // (snow on the sprays' tops, hardly under)
      m.name = `xmas fir_cards${pass === "colour" ? " lit" : ""}${tag}`;
      m.userData.shared = true; m.userData.cards = true;
      return m;
    }
    case "fir_bark": std({ roughness: 0.9 }); m.colorNode = lin(0x3a2c22).mul(ao); wxMat(m, { porosity: 0.6 }); break;
    case "wood_planks": {
      std({ roughness: 0.75 });
      // pine boards, each its own tone (r), a stained edge band (g)
      m.colorNode = mix(lin(0x7b5a3a), lin(0x9a7650), c.x).mul(mix(float(0.75), float(1), c.y)).mul(ao);
      wxMat(m, { porosity: 0.5 });
      break;
    }
    case "mulch": std({ roughness: 1 }); m.colorNode = lin(0x2a1d14).mul(ao); wxMat(m, { porosity: 0.9 }); break;
    case "bauble": {
      // mirrored glass baubles: red, gold, champagne (g), lacquer-glossy
      std({ roughness: 0.16, metalness: 0.85 });
      const red = lin(0x9c0f14), gold = lin(0xd6a24a), champ = lin(0xe6d6b8);
      m.colorNode = mix(mix(red, gold, smoothstep(0.25, 0.3, c.y)), champ, smoothstep(0.75, 0.8, c.y)).mul(ao);
      m.metalnessNode = mix(float(0.55), float(0.9), smoothstep(0.25, 0.3, c.y));
      wxMat(m, { porosity: 0.0 });
      break;
    }
    case "gold_metal": std({ roughness: 0.3, metalness: 1 }); m.colorNode = lin(0xc89a48).mul(ao); wxMat(m, { porosity: 0 }); break;
    case "metal_frame": std({ roughness: 0.35, metalness: 1 }); m.colorNode = lin(0xb9bcc0).mul(ao); wxMat(m, { porosity: 0 }); break;
    case "ribbon_red": std({ roughness: 0.55, metalness: 0 }); m.colorNode = lin(0x7a0a10).mul(ao); wxMat(m, { porosity: 0.7 }); break;
    case "star_glow": {
      std({ roughness: 0.25, metalness: 1 });
      m.colorNode = lin(0xe0b35a);
      m.emissiveNode = lin(0xffc66b).mul(level()).mul(xmasLook.star).mul(sin(time.mul(0.7)).mul(0.08).add(0.92));
      break;
    }
    case "bulb_warm":
    case "led_rope": {
      // warm-white LEDs (2700 K): a slow shimmer per bulb, ~14 % flash bulbs (COLOR_0.g) with a short cold sparkle
      m = new THREE.MeshStandardNodeMaterial({ roughness: 0.3, metalness: 0 });
      const ph = phaseOf(instanced);
      const warm = lin(0xffc27e), cold = lin(0xfff1dc);
      const shimmer = sin(time.mul(ph.mul(1.7).add(1.1)).add(ph.mul(43.0))).mul(0.16).mul(xmasLook.twinkle).add(0.86);
      const spark = pow(clamp(sin(time.mul(1.9).add(ph.mul(91.0))), 0, 1), float(48)).mul(4.0).mul(xmasLook.flash).mul(smoothstep(0.5, 0.6, c.y));
      const k = slot === "led_rope" ? xmasLook.rope : float(1);
      m.colorNode = lin(0xfff0d8).mul(0.6);
      // a bulb (not the rope): brightest where it faces the eye, dimmer toward its rim: the small faceted bead reads as a
      // ROUND glowing bulb close up (no flat hexagon) and as a point at distance (xmasfir browser turn)
      const facing = clamp(normalView.dot(positionView.normalize().negate()), 0, 1);
      const round = slot === "bulb_warm" ? mix(float(0.22), float(1), pow(facing, float(1.6))) : float(1);
      m.emissiveNode = warm.mul(shimmer).add(cold.mul(spark)).mul(level()).mul(k).mul(round);
      if (slot === "bulb_warm") m.colorNode = lin(0xfff0d8).mul(mix(float(0.25), float(0.6), facing));
      break;
    }
    case "wire_dark": std({ roughness: 0.5 }); m.colorNode = lin(0x14181a); break;
    // (claude/xmas4) the Christmas poles of the pole garlands (xmasCity.js buildPoleGeometry): the tram poles' painted
    // steel (viewer/tram.js: 0x3b4044, roughness 0.5, metalness 0.7), wet / snow by the weather
    case "pole_steel": std({ roughness: 0.5, metalness: 0.7 }); m.colorNode = lin(0x3b4044).mul(ao); wxMat(m, { porosity: 0 }); break;
    // ---- the market chalets: stained boards (the instance's tone in xlod.w: dark walnut .. natural pine; each board its
    // own shade, COLOR_0.r), dark trim, green felt roof, fake snow, the warm-lit inside, the cream sign board
    case "chalet_wood": {
      std({ roughness: 0.78 });
      const tone = instanced ? attribute("xlod", "vec4").w : float(0.5);
      const stain = mix(lin(0x3b2416), lin(0x8a6440), tone);
      m.colorNode = stain.mul(mix(float(0.78), float(1.08), c.x)).mul(ao);
      wxMat(m, { porosity: 0.5 });
      break;
    }
    case "chalet_trim": std({ roughness: 0.7 }); m.colorNode = lin(0x231610).mul(ao); wxMat(m, { porosity: 0.4 }); break;
    case "roof_felt": std({ roughness: 0.92 }); m.colorNode = lin(0x1f2a20).mul(ao); wxMat(m, { porosity: 0.3 }); break;
    case "snow_fake": std({ roughness: 0.85 }); m.colorNode = lin(0xe8ecf0).mul(ao); break;
    case "sign_board": std({ roughness: 0.65 }); m.colorNode = lin(0xd9cdb0).mul(ao); wxMat(m, { porosity: 0.2 }); break;
    case "chalet_interior": {
      // the inside (seen through the hatch): goods in many colours (r: hue pick, g: brightness), lit warm at night
      std({ roughness: 0.75 });
      const goods = mix(mix(lin(0x8a3a24), lin(0xc9a24a), c.x), lin(0x5a7a48), smoothstep(0.66, 0.7, c.x)).mul(mix(float(0.6), float(1), c.y));
      m.colorNode = goods.mul(ao);
      m.emissiveNode = goods.mul(lin(0xffc58a)).mul(env.uNight.mul(0.9)).mul(ao);
      break;
    }
    default: std({ roughness: 0.8 }); m.colorNode = vec3(0.5).mul(ao);
  }
  if (mask) m.maskNode = bandMask(attribute("xlod", "vec4"));
  m.name = `xmas ${slot}${uvs ? "" : " (far)"}${instanced ? (mask ? " (fade)" : "") : " (static)"}`;
  m.userData.shared = true;
  return m;
}

/** the span material for the procedural garlands (wire + bulbs drawn as one merged mesh each): faded out with distance */
export function spanMaterial(slot, kit, fadeEnd = 650, light = XMAS_LIGHT) {
  const m = kit.slotMaterial(slot, { uvs: false, instanced: false, light });
  if (!m.userData.spanFade) {
    const d = positionWorld.sub(lodEye).length();
    m.maskNode = ditherNoise().greaterThanEqual(rampTo(d, float(fadeEnd), float(fadeEnd * 0.15)));
    m.userData.spanFade = true;
  }
  return m;
}
