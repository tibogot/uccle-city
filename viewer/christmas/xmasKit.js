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
import * as THREE from "three/webgpu";
import {
  attribute, uv, vec3, vec4, float, mix, smoothstep, clamp, max, fract, sin, abs, pow, time, select, positionWorld, uniform, Fn, normalWorld,
} from "three/tsl";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { keepBand, rampTo, lodEye, ditherNoise } from "../lodFade.js";
import { wxMat } from "../weather/cityWeatherize.js";
import { env } from "../lighting.js";

/** live look controls (dev panel / console: window.xmas.look) */
export const xmasLook = {
  night: uniform(9.0),          // LED emission at night (x the colour; bloom makes the halo)
  day: uniform(1.1),            // ... by day (lit bulbs in daylight: small, warm)
  twinkle: uniform(1.0),        // 0 = steady
  flash: uniform(1.0),          // the flash bulbs' sparkle
  rope: uniform(0.75),          // LED rope (motifs) vs bulbs
  star: uniform(0.7),
};

const BASE = new URL("../../models/christmas/", import.meta.url).href;
let promise = null;
export function loadXmasKit() {
  return (promise ??= (async () => {
    const t0 = performance.now();
    if (typeof Worker !== "undefined") MeshoptDecoder.useWorkers?.(2);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [gltf, info] = await Promise.all([loader.loadAsync(BASE + "christmas.glb"), fetch(BASE + "christmas.json").then((r) => r.json())]);
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
    const slotMaterial = (slot, { uvs = false, instanced = true } = {}) => (mats[`${slot}|${uvs ? "u" : "-"}|${instanced ? "i" : "s"}`] ??= make(slot, uvs, instanced));
    return { pieces, info, slotMaterial, mats, loadMs: performance.now() - t0, bytes: info.glb_bytes ?? 0 };
  })());
}

// ------------------------------------------------------------------------------------------------ shared nodes
const lin = (hex) => { const c = new THREE.Color(hex); return vec3(c.r, c.g, c.b); };     // (sRGB hex -> linear)
const COL = () => attribute("color", "vec4");
/** the per-pixel level-of-detail band: keep when this pixel's distance is inside [start, end) of the instance's level,
 *  dithered over the last 12 % of each end (the next level keeps the complement: no pop, no double draw) */
function bandMask(xlod) {
  const d = positionWorld.sub(lodEye).length();
  const lo = xlod.x, hi = xlod.y;
  const fOut = rampTo(d, hi, hi.mul(0.12));                    // 0 -> 1 toward the band's end
  const fIn = select(lo.greaterThan(0.5), rampTo(d, lo, lo.mul(0.12)), float(1));   // the previous level's fade
  return keepBand(fOut, fIn, ditherNoise());
}
/** the light level: faint by day, strong at night */
const level = () => mix(xmasLook.day, xmasLook.night, env.uNight);
/** a per-element phase in [0, 1): the element's own random (COLOR_0.r) + the instance's id hash */
const phaseOf = (instanced) => (instanced ? fract(COL().x.add(attribute("xlod", "vec4").z)) : COL().x);

function make(slot, uvs, instanced) {
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
      m.emissiveNode = warm.mul(shimmer).add(cold.mul(spark)).mul(level()).mul(k);
      break;
    }
    case "wire_dark": std({ roughness: 0.5 }); m.colorNode = lin(0x14181a); break;
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
  if (instanced) m.maskNode = bandMask(attribute("xlod", "vec4"));
  m.name = `xmas ${slot}${uvs ? "" : " (far)"}${instanced ? "" : " (static)"}`;
  m.userData.shared = true;
  return m;
}

/** the span material for the procedural garlands (wire + bulbs drawn as one merged mesh each): faded out with distance */
export function spanMaterial(slot, kit, fadeEnd = 650) {
  const m = kit.slotMaterial(slot, { uvs: false, instanced: false });
  if (!m.userData.spanFade) {
    const d = positionWorld.sub(lodEye).length();
    m.maskNode = ditherNoise().greaterThanEqual(rampTo(d, float(fadeEnd), float(fadeEnd * 0.15)));
    m.userData.spanFade = true;
  }
  return m;
}
