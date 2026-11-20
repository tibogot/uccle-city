// Sky, image-based lighting, sun with cascaded shadows, aerial fog and time-of-day presets.
//
// Adapted from mrdoob/slop-newyork js/lighting.js (MIT, Â© 2026 Mr.doob): the Preetham SkyMesh with
// clouds baked into a PMREM environment map, the two-cascade SunLight, the canyon-bounce hemisphere
// light and the sky-matched aerial-perspective fog. Changes for Uccle: sun directions in our axes
// (+x east, +z south), heights are absolute metres TAW (40-130 m) so the haze layer starts at the
// valley floor, and the shared uniforms (`env`) feed our own faÃ§ade and road materials.
import * as THREE from "three/webgpu";
import { shadow, Fn, float, vec3, vec4, uniform, mix, fog, pmremTexture, positionWorld, cameraPosition, length, normalize, max, exp, abs, select, smoothstep, textureLoad, screenCoordinate, ivec2, int } from "three/tsl";
import { ShadowNode } from "three/webgpu";
import { damp, ditherNoise } from "./lodFade.js";
import { texture, reference, vec2, add, vogelDiskSample, renderGroup } from "three/tsl";
import { SkyMesh } from "three/addons/objects/SkyMesh.js";
import { SunLight } from "three/addons/lights/SunLight.js";
import { SunLightNode } from "three/addons/lights/SunLightNode.js";
import { createFirmamentSky } from "../vendor/firmament/firmamentSky.js";
import { createSkyExtras } from "./skyExtras.js";
const SHADOW_FAR = typeof location === "undefined" || new URLSearchParams(location.search).get("shadowfar") !== "old";   // perfgame round 2
const RAYS_WARM = typeof location === "undefined" || new URLSearchParams(location.search).get("rayswarm") !== "old";   // perfgame
import { sunDirection } from "../vendor/firmament/firmamentCelestial.js";
import { createVolumetricFog } from "../vendor/volumetric-fog/volumetricFog.js";
import { NTE, NTE_SKY, NTE_FOG_BLUE } from "./lookNte.js";

// FIRMAMENT (default; ?sky=old = the Preetham SkyMesh below): the owner's engine sky (vendor/firmament):
// physical atmosphere, cumulus + cirrus, the real sun (and moon) for Brussels, the sky's own
// environment light, cloud shadows on the ground. Wired as the engine's lab does (firmament-lab/
// lab.js + labScene.js): a DirectionalLight at intensity 1 whose colour is the sky's key light x the
// cumulus shadow at the point, scene.environment = the sky's environment, exposure 0.55 (Tidewater's
// units). The presets are TIMES OF DAY on a real sun path (FIRM_TIMES). Not yet: the sky's haze /
// sun-shaft pass and its eye adaptation (they run on the linear HDR frame inside our post chain).
export const useFirmament = !/[?&]sky=old/.test(location.search);
export const FIRMAMENT_EXPOSURE = 0.55;
const BRUSSELS_LAT = 50.8;
const qp = new URLSearchParams(location.search);
const DAY = +(qp.get("day") ?? 200);                 // day of the year (200 = mid July: long golden evenings)
// skyctl: the dev panel's sky look sliders as URL params (?sunbright=2 ...): [URL key, sky param (Firmament's own, or
// viewer/skyExtras.js's)]. Absent = the defaults (the look as before); the panel mirrors a moved slider into its key (viewer/features.js rows)
export const SKY_URL = [
  ["sunbright", "sunDiscBright"], ["sunpower", "sunScale"], ["sunhalo", "sunHalo"], ["sunhalosize", "sunHaloDeg"],
  ["skytint", "skyTint"], ["moonsize", "moonSizeDeg"], ["moonbright", "moonBright"], ["moonglow", "nightHalo"],
  ["stars", "nightStars"], ["starsize", "nightStarSize"], ["cloudbright", "cloudAlbedo"], ["cloudshade", "cloudAmbient"], ["clouddark", "baseShadow"],
];
const skyUrlParams = () => Object.fromEntries(SKY_URL.filter(([k]) => qp.get(k) != null && isFinite(+qp.get(k))).map(([k, p]) => [p, +qp.get(k)]));
// ?still=1 (docs/TOUR.md, the visual regression tour): the sky held still, so two runs of the same code give the same
// picture: no cloud / cirrus drift or evolution (Firmament's windSpeed 0 from the first frame: the drift integrates the
// boot's length otherwise, a different sky and different cloud shadows each run) and no volumetric fog drift.
export const STILL = qp.get("still") === "1";
// local SOLAR time (12 = the sun due south); ?hour= overrides the preset
const FIRM_TIMES = {
  golden: { hours: 18.7, coverage: 0.42, cloudType: 0.5 },
  midday: { hours: 13.0, coverage: 0.38, cloudType: 0.5 },
  overcast: { hours: 13.0, coverage: 0.95, cloudType: 0.08 },
  twilight: { hours: 20.45, coverage: 0.4, cloudType: 0.5 },
  night: { hours: 23.4, coverage: 0.3, cloudType: 0.5 },
  misty: { hours: 7.6, coverage: 0.55, cloudType: 0.15, vfog: true },
};
// volumetric valley fog (vendor/volumetric-fog): on with the "misty" preset or ?vfog=1. Fitted to Uccle: the
// valley floor is ~40 m TAW, Place de Saint-Job ~70 m, the plateaus 100-130 m: the layer tops out at 72 m and
// thins above, so it pools in the low streets and the hills stand out of it.
// (tuned on screen 2026-11-04: top 72 m left Place Saint-Job, 70.8 m, at the very edge of the layer)
const VFOG = { top: 82, falloff: 18, topBreakup: 9, density: 0.014, noiseFreq: 1 / 160, noiseAmount: 0.7, coverage: 0.7,
  haze: 0.0006, maxDist: 1500, anisotropy: 0.6, windSpeed: STILL ? 0 : 2 };

// ------------------------------------------------------------------ smooth shadows (docs/SMOOTH_LOD.md)
// The sun's one shadow map follows the camera. Three things made shadows pop or crawl:
//  1. the box was snapped to texels in WORLD x/y/z while the map's texels lie across the SUN's view: a
//     sub-texel slide every frame, shadow edges crawled as the camera moved. Now snapped in the light's frame.
//  2. the box size followed the view distance (resized when it drifted 10 %): every resize changed the texel
//     size (all edges jumped) and moved the box's edge, where shadows stopped dead. Now the box takes a few
//     fixed sizes (x1.5 apart, with hysteresis) and the shadows FADE OUT toward a radius that moves smoothly
//     (damped) inside the box, so shadows never end at a hard line nor appear in a block.
//  3. r187's ShadowNode returns "lit" just outside its frustum: FadedShadowNode blends to lit over a band
//     before that edge (uFade: the fade radius as a share of the box's half size).
const SMOOTH_SHADOWS = !/[?&]smooth=0/.test(location.search);
export const shadowFade = {
  uRadius: uniform(0.9),       // fade radius / box half size (light-space square distance from the box centre)
  uBand: uniform(0.22),        // the fade's width, as a share of the radius
  levels: [60, 90, 135, 200, 300, 400],   // box half sizes (m): 4096 px -> 2.9 .. 19.5 cm texels (the old box went to 380)
  tau: 0.35,                    // seconds: how fast the fade radius follows the view
};
class FadedShadowNode extends ShadowNode {
  setupShadowFilter(builder, inputs) {
    const lit = super.setupShadowFilter(builder, inputs);
    const c = inputs.shadowCoord;
    const e = max(abs(c.x.sub(0.5)), abs(c.y.sub(0.5))).mul(2);               // 0 at the centre, 1 at the edge
    const r = shadowFade.uRadius;
    const f = smoothstep(r.mul(float(1).sub(shadowFade.uBand)), r, e);
    return mix(lit, float(1), f);
  }
}

// ------------------------------------------------------------------ the sun's STATIC SHADOW CACHE (perfgame round 3)
// ?sunshadowcache=old: every caster drawn into the sun's map every frame (~150 draws, ~20 % of the frame's CPU).
// The map is split by what moves: the STATIC casters (tiles, landmarks, trees, the instance pools) are drawn into it only
// now and then and kept in a cache; every frame the cache is laid back into the map and only the MOVERS (the player's
// vehicle, traffic, trams, trains, two-wheelers, birds, falcons, flags, people, the police props) are drawn on top.
// Driving, the box follows the player (texel-snapped across the sun's view, lighting.update): the cache is laid back
// SHIFTED by the whole texels the box moved (a depth-writing quad: WebGPU copies depth only whole), which is exact
// because the light's position ALONG the sun is quantised (SUN_QZ m steps: the static depths do not change while the
// box slides). The strip entering at the box's edge has no static depth yet: it lies in the shadow fade's outer band
// (FadedShadowNode: fully lit there), and the cache is redrawn before the shift reaches past that band. Redrawn also
// when the box size, the sun direction or the light's depth step changes, a tile fades in / out, every SUN_REFRESH
// frames (tree wind, LOD hand-overs, the pools: at most ~0.5 s stale standing still), and on markSunShadowDirty().
const QS = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
export const SUN_CACHE = SMOOTH_SHADOWS && QS.get("sunshadowcache") !== "old";
export const SUN_QZ = 25;
const SUN_REFRESH = Math.max(0, +(QS.get("sunshadowrefresh") ?? 30));
const MOVER_TOP = /^(car|traffic|trains?|tram|twowheel|falcon|player-falcon|pigeons|sky-birds|bird|flag|People|character|police-props|waypoint)/;
export const sunCache = { dirty: true, fader: null, stats: { full: 0, shifted: 0, frames: 0 } };
/** something static changed in the sun's view (a tile, a landmark swap): the cache is redrawn next frame */
export function markSunShadowDirty() { sunCache.dirty = true; }
// falconstutter (docs/perf/FALCON_STUTTER.md; ?warmmover=old: as before): the SHADOW-pass warm groups ("<name>-warm" of the
// landmarks / bridges, warmup.js warmShadows' "boot3-late-warm") draw their stand-ins for a frame or two far under the
// city so the shadow pass builds their shaders off screen; with the cache they were static casters, drawn only when the
// cache was redrawn (~1 frame in 9): most stand-ins were never drawn in the shadow pass, and the real meshes built those
// shaders on the frame they first cast (the landmarks' LOD fading copies: 4-5 sync builds, 44-52 ms frames, measured)
const WARM_MOVER = QS.get("warmmover") !== "old";
const isMover = (o) => o.userData?.sunMover === true || MOVER_TOP.test(o.name || "") || (WARM_MOVER && /-warm$/.test(o.name || ""));
class CachedSunShadowNode extends FadedShadowNode {
  constructor(light, sh) { super(light, sh); this.cache = null; this.key = null; this.cx0 = 0; this.cy0 = 0; this.age = 0; this.hid = []; this.blit = null; }
  setupRenderTarget(sh, builder) {
    const r = super.setupRenderTarget(sh, builder);
    r.depthTexture.type = THREE.FloatType;                 // depth32float: copyable (depth24plus is not)
    this.cache = new THREE.DepthTexture(sh.mapSize.width, sh.mapSize.height, THREE.FloatType);
    this.cache.name = "SunShadowStaticCache";
    return r;
  }
  blitQuad() {
    if (this.blit) return this.blit;
    const off = uniform(new THREE.Vector2(0, 0)), size = uniform(new THREE.Vector2(1, 1));
    const m = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: true, colorWrite: false });
    const cache = this.cache;
    {
      const c = ivec2(screenCoordinate.xy).add(ivec2(off));
      const inside = c.x.greaterThanEqual(int(0)).and(c.y.greaterThanEqual(int(0))).and(c.x.lessThan(int(size.x))).and(c.y.lessThan(int(size.y)));
      m.depthNode = select(inside, float(textureLoad(cache, c.clamp(ivec2(0), ivec2(size).sub(1)))), float(1));
    }
    m.name = "sun shadow cache blit";
    this.blit = { quad: new THREE.QuadMesh(m), off, size };
    return this.blit;
  }
  renderShadow(frame) {
    if (!this.cache) return super.renderShadow(frame);
    const { renderer, scene } = frame, sh = this.shadow, cam = sh.camera, map = this.shadowMap;
    sh.updateMatrices(this.light);
    map.setSize(sh.mapSize.width, sh.mapSize.height, map.depth);
    const W = sh.mapSize.width, texel = (cam.right - cam.left) / W;
    // the light camera's position across its view, in its own x / y / z axes (the matrixWorld's columns)
    const e = cam.matrixWorld.elements;
    const px = e[12] * e[0] + e[13] * e[1] + e[14] * e[2], py = e[12] * e[4] + e[13] * e[5] + e[14] * e[6], pz = e[12] * e[8] + e[13] * e[9] + e[14] * e[10];
    const key = `${cam.right}|${cam.far}|${e[8].toFixed(6)},${e[9].toFixed(6)},${e[10].toFixed(6)}|${Math.round(pz / SUN_QZ)}`;
    const mx = Math.round((px - this.cx0) / texel), my = Math.round((py - this.cy0) / texel);
    // the strip shifted in must stay inside the fade's fully-lit outer band
    const lim = Math.max(8, Math.floor((1 - shadowFade.uRadius.value) * W / 2) - 4);
    this.age++;
    const why = sunCache.dirty ? "dirty" : key !== this.key ? "key" : Math.abs(mx) > lim || Math.abs(my) > lim ? "shift" : sunCache.fader?.busy && this.age >= 3 ? "fade" : SUN_REFRESH > 0 && this.age >= SUN_REFRESH ? "refresh" : null;
    const full = !!why;
    if (why) sunCache.stats[why] = (sunCache.stats[why] || 0) + 1;
    const name = scene.name;
    scene.name = `Shadow Map [ ${this.light.name || "sun"} ]`;
    const hid = this.hid; hid.length = 0;
    const ac = renderer.autoClear;
    if (full) {
      for (const c of scene.children) if (c.visible && !c.isLight && isMover(c)) { c.visible = false; hid.push(c); }
      renderer.render(scene, cam);                           // (clears: the static casters alone)
      for (const c of hid) c.visible = true;
      hid.length = 0;
      renderer.copyTextureToTexture(map.depthTexture, this.cache);
      this.key = key; this.cx0 = px; this.cy0 = py; this.age = 0; sunCache.dirty = false; sunCache.stats.full++;
    } else {
      // the cache laid back, shifted by the box's move: current texel (c, r) <- cache (c + mx, r - my) (rows grow down)
      const B = this.blitQuad();
      B.off.value.set(mx * SHIFT_SIGN.x, my * SHIFT_SIGN.y); B.size.value.set(W, sh.mapSize.height);
      const rof = renderer.getRenderObjectFunction();
      renderer.setRenderObjectFunction(null);
      B.quad.render(renderer);
      renderer.setRenderObjectFunction(rof);
      sunCache.stats.shifted++;
    }
    // the movers on top, every frame
    for (const c of scene.children) if (c.visible && !c.isLight && !isMover(c)) { c.visible = false; hid.push(c); }
    renderer.autoClear = false;
    if (hid.length < scene.children.length) renderer.render(scene, cam);
    renderer.autoClear = ac;
    for (const c of hid) c.visible = true;
    scene.name = name;
    sunCache.stats.frames++;
  }
}
// (claude/sharp, ?shadownoise=old = three's) THE PCF'S ROTATION PER FRAME: three r187's PCF rotates its 5 Vogel taps by
// interleaved gradient noise of the SCREEN pixel, the same every frame: under the TAAU the penumbra's noise is locked to
// the screen and the shadows slide under it while driving (edges crawl / "swim"). Same filter, the noise phase moving
// each frame (lodFade.js ditherNoise: ditherFrame steps under the TAAU, (0, 0) native = three's exact pattern): the
// history averages the rotations into a smooth, still penumbra.
const SHADOWNOISE_OLD = QS.get("shadownoise") === "old";
const temporalPCF = Fn(({ depthTexture, shadowCoord, shadow: sh }) => {
  const mapSize = reference("mapSize", "vec2", sh).setGroup(renderGroup), radius = reference("radius", "float", sh).setGroup(renderGroup);
  const rs = radius.mul(vec2(1).div(mapSize));
  const phi = ditherNoise().mul(6.28318530718);
  const cmp = (k) => texture(depthTexture, shadowCoord.xy.add(vogelDiskSample(k, 5, phi).mul(rs))).compare(shadowCoord.z);
  return add(cmp(0), cmp(1), cmp(2), cmp(3), cmp(4)).mul(1 / 5);
});
/** (tuning in the browser: the shift's direction per axis, if the cached shadows slide the wrong way) */
export const SHIFT_SIGN = { x: 1, y: -1 };

// Direction TO the sun. Brussels, late afternoon from the south-west: west = -x, south = +z.
const dir = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
export const PRESETS = {
  misty: { sunDir: dir(0.6, 0.22, 0.75), sunColor: 0xffd9b0, sunIntensity: 3.0, hemiSky: 0xb8c4d0, hemiGround: 0x8a8070, hemiIntensity: 1.6,
    skyTop: 0x7f93ab, skyHorizon: 0xd8d4cc, fogDensity: 0.0006, interiorGlow: 0.5, wetness: 0.45, envIntensity: 0.6,
    turbidity: 10.0, rayleigh: 2.0, mie: 0.012, mieG: 0.85, clouds: 0.55, cloudDensity: 0.5, skyExposure: 0.13, night: 0 },
  golden: { sunDir: dir(-0.62, 0.42, 0.66), sunColor: 0xffc890, sunIntensity: 5.6, hemiSky: 0x9abbe6, hemiGround: 0xb27a56, hemiIntensity: 1.4,
    skyTop: 0x2c568c, skyHorizon: 0xebd1b5, fogDensity: 0.00035, interiorGlow: 0.45, wetness: 0.15, envIntensity: 0.55,
    turbidity: 8.0, rayleigh: 2.8, mie: 0.008, mieG: 0.88, clouds: 0.42, cloudDensity: 0.42, skyExposure: 0.148, night: 0 },
  midday: { sunDir: dir(-0.25, 0.85, 0.46), sunColor: 0xfff5e8, sunIntensity: 6.4, hemiSky: 0xaad2ff, hemiGround: 0xa08a72, hemiIntensity: 1.55,
    skyTop: 0x225ea8, skyHorizon: 0xc8dff5, fogDensity: 0.00025, interiorGlow: 0.2, wetness: 0.05, envIntensity: 0.6,
    turbidity: 6.5, rayleigh: 2.4, mie: 0.006, mieG: 0.86, clouds: 0.38, cloudDensity: 0.38, skyExposure: 0.142, night: 0 },
  overcast: { sunDir: dir(-0.3, 0.7, 0.5), sunColor: 0xe6ecf2, sunIntensity: 1.6, hemiSky: 0xc4ccd6, hemiGround: 0x7a746c, hemiIntensity: 2.1,
    skyTop: 0x8e98a6, skyHorizon: 0xc9cdd2, fogDensity: 0.0007, interiorGlow: 0.35, wetness: 0.7, envIntensity: 0.75,
    turbidity: 10.0, rayleigh: 1.2, mie: 0.02, mieG: 0.7, clouds: 0.9, cloudDensity: 0.75, skyExposure: 0.11, night: 0 },
  twilight: { sunDir: dir(-0.7, 0.12, 0.7), sunColor: 0xff9466, sunIntensity: 2.6, hemiSky: 0x4c6ca8, hemiGround: 0x6e5048, hemiIntensity: 0.85,
    skyTop: 0x102248, skyHorizon: 0xb86b6c, fogDensity: 0.0005, interiorGlow: 1.25, wetness: 0.45, envIntensity: 0.36,
    turbidity: 9.5, rayleigh: 3.4, mie: 0.01, mieG: 0.9, clouds: 0.4, cloudDensity: 0.42, skyExposure: 0.115, night: 0.28 },
  night: { sunDir: dir(0.42, 0.68, -0.6), sunColor: 0x8cb0e8, sunIntensity: 1.2, hemiSky: 0x263a62, hemiGround: 0x382e36, hemiIntensity: 0.6,
    skyTop: 0x060c1a, skyHorizon: 0x182640, fogDensity: 0.0006, interiorGlow: 1.6, wetness: 0.6, envIntensity: 0.3,
    turbidity: 4.0, rayleigh: 1.5, mie: 0.004, mieG: 0.8, clouds: 0.25, cloudDensity: 0.25, skyExposure: 0.022, night: 0.86 },
};

/** Uniforms shared with our materials (faÃ§ades, roads). */
export const env = {
  uSunColor: uniform(new THREE.Color(0xffc890)),
  uSunDir: uniform(new THREE.Vector3(0, 1, 0)),
  uSkyTop: uniform(new THREE.Color(0x2c568c)),
  uSkyHorizon: uniform(new THREE.Color(0xebd1b5)),
  uInteriorGlow: uniform(0.45),
  uWetness: uniform(0.15),
  uNight: uniform(0),
};

export class Lighting {
  /** opts.sunLight: use the cascaded SunLight (r187). Default: a DirectionalLight whose shadow box follows the
   *  camera (verified in WebGPU and the WebGL2 fallback; SunLight cast no shadows in our WebGL2 tests). */
  constructor(scene, renderer, presetId = "golden", opts = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.firmament = useFirmament;
    this.keyColor = new THREE.Color(1, 1, 1);        // the key light's colour x intensity (trees' translucency)
    this.exposureScale = this.firmament ? FIRMAMENT_EXPOSURE : 1;
    SunLight.registerNode(SunLightNode);
    if (this.firmament) {
      this.initFirmamentLights(opts);
      this.apply(presetId);
      // the fog BEFORE any material compiles (it only reads uniforms): set later, in attach(), the
      // materials built before it (the far-LOD tiles) kept a fog-less build that went wrong at night
      scene.fogNode = this.fogNode();
      return;
    }
    scene.background = null;                       // the sky dome draws the background (and keeps cascades intact)
    this.sky = new SkyMesh();
    this.sky.scale.setScalar(200000);
    this.sky.cloudScale.value = 0.00018;
    this.sky.cloudSpeed.value = 0.000015;
    this.sky.cloudElevation.value = 0.52;
    this.uSkyExposure = uniform(0.148);
    this.uNightSky = uniform(new THREE.Color(0x0b1528));
    const raw = this.sky.material.colorNode;
    this.sky.material.colorNode = Fn(() => vec4(mix(raw.rgb.mul(this.uSkyExposure), this.uNightSky, env.uNight), float(1)))();
    // With a reversed depth buffer the far plane is z = 0 (SkyMesh puts itself at z = w, i.e. the NEAR plane)
    if (renderer.reversedDepthBuffer) {
      const rawV = this.sky.material.vertexNode;
      this.sky.material.vertexNode = Fn(() => { const pos = rawV.toVar(); pos.z.assign(0.0); return pos; })();
    }
    scene.add(this.sky);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envTarget = null;

    this.cascaded = !!opts.sunLight;
    if (this.cascaded) {
      this.sun = new SunLight(0xffc890, 5.6);
      // Mr.doob's GPU-time pass (slop-newyork c8a904d): 2048 px shadow tiles everywhere (was 3072 on big GPUs) and
      // the shadow distance 300 -> 220 m
      this.sun.shadow.mapSize.set(2048, 2048);
      this.sun.shadow.camera.near = 0.5;
      this.sun.shadow.camera.far = 220;
    } else {
      this.sun = new THREE.DirectionalLight(0xffc890, 5.6);
      this.sun.shadow.mapSize.set(4096, 4096);
      Object.assign(this.sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 2000 });
      this.sun.shadow.bias = -0.0002;
      if (SMOOTH_SHADOWS) this.sun.shadow.shadowNode = SUN_CACHE ? new CachedSunShadowNode(this.sun, this.sun.shadow) : new FadedShadowNode(this.sun, this.sun.shadow);
      if (!SHADOWNOISE_OLD) this.sun.shadow.filterNode = temporalPCF;   // (claude/sharp) the PCF rotation moves per frame
      scene.add(this.sun.target);
    }
    this.sun.castShadow = true;
    this.sun.shadow.normalBias = 0.05;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    scene.add(this.sun);

    this.hemi = new THREE.HemisphereLight(0x9abbe6, 0xb27a56, 1.4);
    scene.add(this.hemi);

    this.uFogDensity = uniform(0.00035);
    this.uFogFloor = uniform(40.0);                // valley floor (m TAW): haze is densest down there
    this.uFogHeight = uniform(900.0);
    this.apply(presetId);
    scene.fogNode = this.fogNode();
  }

  initFirmamentLights() {
    const scene = this.scene;
    scene.background = null;
    this.cascaded = false;
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.shadow.mapSize.set(4096, 4096);
    Object.assign(this.sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 2000 });
    this.sun.shadow.bias = -0.0002;
    this.sun.castShadow = true;
    this.sun.shadow.normalBias = 0.05;
    // our own ShadowNode, handed to the light before its first render: r187 keeps the shadow map inside
    // the node (light.shadow.map stays null on WebGPU) and the sky's sun shafts march that map
    this.shadowNode = SMOOTH_SHADOWS ? (SUN_CACHE ? new CachedSunShadowNode(this.sun, this.sun.shadow) : new FadedShadowNode(this.sun, this.sun.shadow)) : shadow(this.sun);   // (perfgame round 3: the static cache)
    this.sun.shadow.shadowNode = this.shadowNode;
    scene.add(this.sun.target, this.sun);
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.uKey = uniform(new THREE.Vector3(0, 0, 0));
    // the hemisphere light stays (a constant light count: adding/removing lights recompiles every
    // material) but at 0: the sky's environment is the ambient
    this.hemi = new THREE.HemisphereLight(0x9abbe6, 0xb27a56, 0);
    scene.add(this.hemi);
    this.uFogDensity = uniform(0.00035);
    this.uFogFloor = uniform(40.0);
    this.uFogHeight = uniform(900.0);
    this.uFogColor = uniform(new THREE.Vector3(0.5, 0.6, 0.7));
    this.uFogBlue = uniform(0);        // ?grade=nte: the aerial fog toward a pale blue (viewer/lookNte.js)
    this.day = DAY;                    // day of the year (live: the dev panel)
    this.hourOverride = null;          // solar hour set by the dev panel (null = the preset's)
    this.urlHour = qp.get("hour") != null ? +qp.get("hour") : null;   // ?hour= (the dev panel drops it on a preset change)
    this.vfogParams = { ...VFOG };     // the volumetric fog's settings (live)
    this.firm = { hours: FIRM_TIMES.golden.hours, coverage: 0.42, cloudType: 0.5, wetness: 0.15 };
    this.lastT = performance.now();
    this._sd = new THREE.Vector3();
  }

  /** Firmament needs the camera: build the sky (async: its cloud noise loads) before the first frame. */
  async attach(camera) {
    if (!this.firmament || this.sky) return;
    this.camera = camera;
    this.sky = createFirmamentSky({ renderer: this.renderer, camera, params: { latitude: BRUSSELS_LAT, dayOfYear: DAY, autoExposure: true,
      // Firmament's night look: extra EV at full night (a readable moonlit city), moonlit clouds, stars. Was +1.6
      // (x6 with the eye adaptation's x2): the far city and the trees read far too bright at night (owner 2026-11-12)
      nightLook: true, nightEV: +(new URLSearchParams(location.search).get("nightev") ?? 0.6),
      // THE GROUND BEYOND THE CITY (owner 2026-11-13: a brown band under the horizon from the falcon at 500-650 m): below
      // the horizon the sky paints a floor in groundAlbedo (its default #54493a, brown), fading into the haze. Uccle's
      // own mean colour from above (all 120 orthophotos averaged in linear light: roofs, roads, gardens, trees) so the
      // city's edge melts into a landscape of its own colour; the sky's ground bounce takes it too. ?skyground=old: before
      ...(/[?&]skyground=old/.test(location.search) ? {} : { groundAlbedo: "#686c67" }), ...skyUrlParams() } });
    await this.sky.ready;
    // skyctl: the sky look controls Firmament has no param for (sun disc brightness, sun glow, tint, moon brightness,
    // sunlight strength), composed round the built sky before its first draw (viewer/skyExtras.js)
    // ?skyctl=old: none of it (the dome and the environment exactly as Firmament draws them; the A/B for the extras' cost)
    if (!/[?&]skyctl=old/.test(location.search)) this.skyX = createSkyExtras(this.sky, this.renderer);
    this.scene.add(this.sky.mesh);
    // the key light x the cumulus shadow over the ground (labScene.js)
    this.sun.colorNode = vec3(this.uKey).mul(this.sky.clouds.shadowAt(positionWorld.xz));
    this.scene.environment = this.sky.environment;
    this.scene.environmentIntensity = 1;
    this.sky.params.coverage = this.firm.coverage;
    this.sky.params.cloudType = this.firm.cloudType;
    if (STILL) this.sky.params.windSpeed = 0;          // ?still=1: the clouds stand still (docs/TOUR.md)
    if (NTE) { const P = this.sky.params; this.nteBase = { haze: P.haze, nightEV: P.nightEV, nightBlue: P.nightBlue }; this.nteSky(); }
    this.sky.update(0, { sunDir: this.firmSunDir() });
    this.skyX?.afterUpdate();
    this.syncFirmament();
  }

  /** The solar hour now: the dev panel's override, else ?hour=, else the preset's. */
  get hour() { return this.hourOverride ?? this.urlHour ?? this.firm.hours; }
  firmSunDir() {
    if (this.sky) this.sky.params.dayOfYear = this.day;
    return sunDirection({ hours: this.hour, dayOfYear: this.day, latitude: BRUSSELS_LAT }, this._sd);
  }

  /** On the linear HDR frame, before the post chain (post.js render hook): the sky's air haze + sun
   *  shafts (marched through the sun's shadow map), then the eye adaptation's meter, as
   *  game-engine-v1's compositeOntoLinearHDR. seaLevel: the haze's low layer sits on Uccle's valley
   *  floor (~40 m TAW), not the sea. */
  hazeHook(rt, depthTex, size) {
    if (!this.firmament || !this.sky) return;
    const shadowDepth = this.shadowNode?.shadowMap?.depthTexture ?? null;
    // perfgame (docs/PERF_GAME.md, ?rayswarm=old): the god-ray passes (mask + 3 blurs, vendor/firmament/firmamentHaze.js)
    // are only drawn while the sun is on screen and low: their 4 pipelines were built SYNCHRONOUSLY the first time the
    // player faced the sun (~17 s into every police drive, a 100-120 ms frame). Drawn once here, on the first call
    // (under the boot cover), with the key light put low in front of the camera; the next frame overwrites it all.
    if (!this._raysWarm && RAYS_WARM) {
      this._raysWarm = true;
      const L = this.sky.light().keyDir, cam = this.camera, saved = L.clone(), q = cam.quaternion.clone();
      L.set(0.85, 0.18, 0.3).normalize();
      cam.lookAt(cam.position.x + L.x, cam.position.y + L.y, cam.position.z + L.z); cam.updateMatrixWorld();
      try { this.sky.postProcess(rt, { depthTex, light: this.sun, shadowDepth, size, seaLevel: 40 }); } catch (e) { console.warn("[rays warm]", e); }
      L.copy(saved); cam.quaternion.copy(q); cam.updateMatrixWorld();
    }
    this.sky.postProcess(rt, { depthTex, light: this.sun, shadowDepth, size, seaLevel: 40 });
    // the volumetric fog over the haze, before the meter (game-engine-v1 worldEnvironment order)
    if (this.vfogOn) {
      this.vfog ??= createVolumetricFog({ renderer: this.renderer, params: this.vfogParams });
      const L = this.sky.light(), now = performance.now();
      const k = L.keyIsMoon ? [L.moonColor.x, L.moonColor.y, L.moonColor.z] : L.sunColor;
      const sc = this.sun.shadow.camera;
      this._shM ??= new THREE.Matrix4();
      this._shM.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse);
      const si = L.skyIrradiance || [0, 0, 0];
      this.vfog.composite(rt, { depthTex, camera: this.camera, size, dt: Math.min(0.1, (now - (this._vfT ?? now)) / 1000),
        sunDir: this.sunDir, sunColor: k, ambient: [si[0] / Math.PI, si[1] / Math.PI, si[2] / Math.PI],
        cascades: shadowDepth ? [{ matrix: this._shM, depthTex: shadowDepth }] : [] });
      this._vfT = now;
    }
    this.sky.meter(rt);
  }

  /** This frame's exposure factor (Firmament's eye adaptation, x0.6..x6, at most x2 at night); 1 for the old sky. */
  adapt(dt) {
    return this.firmament && this.sky ? this.sky.exposureFactor(dt) : 1;
  }

  /** Per frame (Firmament): everything our materials read from the sky. */
  syncFirmament() {
    const L = this.sky.light();
    // the sky's environment can be a NEW texture after a re-bake (the lab re-assigns it every frame);
    // assigned once at start, materials kept the first sky's light (day-lit far tiles at night)
    if (this.scene.environment !== this.sky.environment) this.scene.environment = this.sky.environment;
    const hzr = L.horizon || [0, 0, 0];
    this.uFogColor.value.set(hzr[0], hzr[1], hzr[2]);
    const k = L.keyIsMoon ? L.moonColor : { x: L.sunColor[0], y: L.sunColor[1], z: L.sunColor[2] };
    this.uKey.value.set(k.x, k.y, k.z);
    this.keyColor.setRGB(k.x, k.y, k.z);
    this.sunDir.copy(L.keyDir || L.sunDir);
    // the uniforms our facade / road / lamp materials share
    const m = Math.max(k.x, k.y, k.z, 1e-4);
    env.uSunColor.value.setRGB(k.x / m, k.y / m, k.z / m);
    env.uSunDir.value.copy(this.sunDir);
    const hz = L.horizon || [0.5, 0.6, 0.7], si = L.skyIrradiance || [0.3, 0.4, 0.6];
    const hm = Math.max(hz[0], hz[1], hz[2], 1e-4), sm = Math.max(si[0], si[1], si[2], 1e-4);
    env.uSkyHorizon.value.setRGB(hz[0] / hm, hz[1] / hm, hz[2] / hm);
    env.uSkyTop.value.setRGB(si[0] / sm, si[1] / sm, si[2] / sm);
    env.uNight.value = L.night || 0;
    env.uInteriorGlow.value = 0.3 + 1.3 * (L.night || 0);
    env.uWetness.value = this.firm.wetness;
    // ?grade=nte (docs/LOOK_NTE.md steps 2-3): the sky environment's fill (more by day, a blue hour at night) and the
    // blue far air; uniforms only (scene.environmentIntensity is a reference node), no light added
    if (NTE) {
      const n = this.nteSkyP ?? {}, night = L.night || 0, e = n.env ?? 1;
      this.scene.environmentIntensity = e + ((n.envNight ?? e) - e) * night;
      this.uFogBlue.value = n.fogBlue ?? 0;
    }
  }

  /** ?grade=nte: the time preset's sky params (Firmament's haze / night look), back to the boot's for a preset without */
  nteSky() {
    const n = this.nteSkyP = NTE_SKY[this.preset] ?? {}, P = this.sky?.params, B = this.nteBase;
    if (!P || !B) return;
    P.haze = n.haze ?? B.haze; P.nightEV = n.nightEV ?? B.nightEV; P.nightBlue = n.nightBlue ?? B.nightBlue;
  }

  fogNode() {
    const toFrag = positionWorld.sub(cameraPosition);
    const dist = length(toFrag);
    const d = toFrag.div(max(dist, 0.001));
    const horizon = normalize(vec3(d.x, max(d.y, 0.015), d.z));
    // Firmament: the fog takes the sky's own horizon radiance (sky.light().horizon, every frame). A PMREM
    // lookup of its environment kept the FIRST sky's light (the texture is re-rendered in place and the
    // PMREM never refreshed): far tiles were fogged with the golden-hour sky at midnight.
    const skyColor0 = this.firmament ? vec3(this.uFogColor) : pmremTexture(this.envTarget.texture, horizon, float(0)).rgb;
    // ?grade=nte: the far air a pale blue of the same brightness (aerial perspective: the far city in layers); built
    // only with the switch (the default shader as before)
    const skyColor = NTE ? mix(skyColor0, vec3(skyColor0.dot(vec3(0.2126, 0.7152, 0.0722))).mul(vec3(...NTE_FOG_BLUE)), this.uFogBlue) : skyColor0;
    const H = this.uFogHeight;
    const ya = max(positionWorld.y.sub(this.uFogFloor), 0), yb = max(cameraPosition.y.sub(this.uFogFloor), 0);
    const dy = yb.sub(ya), ea = exp(ya.div(H).negate()), eb = exp(yb.div(H).negate());
    const mean = select(abs(dy).greaterThan(1.0), ea.sub(eb).mul(H).div(dy), ea);
    const tau = this.uFogDensity.mul(dist).mul(mean);
    // THE WEATHER (viewer/weather/cityWeather.js, docs/WEATHER.md "City hookup"): air extinction from the visibility
    // (Koschmieder, beta = 3.912 / V, scale height 250 m over the valley floor) + a thin ground mist, the colour greyed
    // under a full cloud deck. All 0 in clear weather (the fog as before); uniforms only, no shader rebuild
    const W = (this.wxFog ??= { uBeta: uniform(0), uMist: uniform(0), uGrey: uniform(0) });
    const meanH = (Hs) => { const a = exp(ya.div(Hs).negate()), b = exp(yb.div(Hs).negate()); return select(abs(dy).greaterThan(0.05), a.sub(b).mul(Hs).div(dy), a); };
    const tauW = W.uBeta.mul(dist).mul(meanH(float(250))).add(W.uMist.mul(dist).mul(meanH(float(2.5))));
    const L = skyColor.dot(vec3(0.2126, 0.7152, 0.0722));
    const fogCol = mix(skyColor, vec3(L).mul(vec3(0.94, 0.98, 1.05)), W.uGrey);
    return fog(fogCol, float(1).sub(exp(tau.mul(tau).add(tauW).negate())));
  }

  bake() {
    this.sky.showSunDisc.value = 0;
    this.envScene.add(this.sky);
    this.envTarget = this.pmrem.fromScene(this.envScene, 0, 0.1, 100, { renderTarget: this.envTarget });
    this.scene.environment = this.envTarget.texture;
    this.sky.showSunDisc.value = 1;
    this.scene.add(this.sky);
  }

  apply(id) {
    const p = PRESETS[id] || PRESETS.golden;
    this.preset = id;
    if (this.firmament) {
      const t = FIRM_TIMES[id] || FIRM_TIMES.golden;
      Object.assign(this.firm, t, { wetness: p.wetness });
      this.vfogOn = /[?&]vfog=1/.test(location.search);   // volumetric fog: opt-in only for now (owner, 2026-11-04)
      this.uFogDensity.value = p.fogDensity;
      if (NTE) {                                         // ?grade=nte: bigger cumulus, denser far air (viewer/lookNte.js)
        const n = NTE_SKY[id] ?? {};
        if (n.coverage != null) this.firm.coverage = n.coverage;
        this.uFogDensity.value = p.fogDensity * (n.fogMul ?? 1);
        this.nteSky();
      }
      return;
    }
    this.sun.color.setHex(p.sunColor);
    this.sun.intensity = p.sunIntensity;
    this.sunDir.copy(p.sunDir);
    this.sun.position.copy(p.sunDir);
    this.sun.updateMatrixWorld();
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemiIntensity;
    this.sky.turbidity.value = p.turbidity;
    this.sky.rayleigh.value = p.rayleigh;
    this.sky.mieCoefficient.value = p.mie;
    this.sky.mieDirectionalG.value = p.mieG;
    this.sky.cloudCoverage.value = p.clouds;
    this.sky.cloudDensity.value = p.cloudDensity;
    this.sky.sunPosition.value.copy(p.sunDir);
    this.uSkyExposure.value = p.skyExposure;
    this.uFogDensity.value = p.fogDensity;
    env.uSunColor.value.setHex(p.sunColor);
    env.uSunDir.value.copy(p.sunDir);
    env.uSkyTop.value.setHex(p.skyTop);
    env.uSkyHorizon.value.setHex(p.skyHorizon);
    env.uInteriorGlow.value = p.interiorGlow;
    env.uWetness.value = p.wetness;
    env.uNight.value = p.night;
    this.scene.environmentIntensity = p.envIntensity;
    this.bake();
  }

  /** Each frame. focus = what the camera looks at; half = shadow box half-size (m). */
  update(cameraY, groundY, focus, half, dt = 1 / 60) {
    if (this.firmament && this.sky) {
      const now = performance.now(), dt = Math.min(0.1, (now - this.lastT) / 1000);
      this.lastT = now;
      this.sky.params.coverage = this.firm.coverage;
      this.sky.params.cloudType = this.firm.cloudType;
      this.sky.update(dt, { sunDir: this.firmSunDir() });
      this.skyX?.afterUpdate();
      this.syncFirmament();
    } else if (!this.firmament) {
      this.keyColor.copy(this.sun.color).multiplyScalar(this.sun.intensity);
    }
    if (this.cascaded) {
      const alt = Math.max(0, cameraY - groundY);
      this.sun.shadow.camera.far = Math.max(300, Math.min(900, 260 + alt * 1.6));
      return;
    }
    const sc = this.sun.shadow.camera;
    if (!SMOOTH_SHADOWS) {          // the old box (?smooth=0, for A/B)
      if (Math.abs(sc.right - half) > half * 0.1) {
        Object.assign(sc, { left: -half, right: half, top: half, bottom: -half });
        sc.updateProjectionMatrix();
      }
      const texel = (2 * half) / this.sun.shadow.mapSize.x;
      const f = focus.clone().divideScalar(texel).round().multiplyScalar(texel);
      this.sun.position.copy(f).addScaledVector(this.sunDir, 900);
      this.sun.target.position.copy(f);
      this.sun.target.updateMatrixWorld();
      return;
    }
    // the fade radius follows the view smoothly; the box is the smallest fixed size that holds it
    const F = shadowFade, L = F.levels;
    this.fadeHalf = this.fadeHalf == null || this.snapNext ? half : damp(this.fadeHalf, half, F.tau, dt);
    this.snapNext = false;
    const want = this.fadeHalf / 0.95;
    const fit = L.find((l) => l >= want) ?? L[L.length - 1];
    let box = this.boxHalf ?? fit;
    if (fit > box) box = fit;                                                   // grow at once
    else if (fit < box && want < L[Math.max(0, L.indexOf(box) - 1)] * 0.8) box = fit;   // shrink with hysteresis
    this.boxHalf = box;
    F.uRadius.value = Math.min(0.97, this.fadeHalf / box);
    // perfgame round 2 (?shadowfar=old: 2000 m): the depth range ends just past the deepest RECEIVER of the box (a point
    // within the box across the sun's view and +-110 m in height lies within box x 1.42 + 110 m of the focus along the
    // light): casters further away from the sun than that shadow nothing drawn, and were drawn in the shadow pass
    // (far landmarks 300-700 m behind the player: 15-25 of its ~150 objects in the police drive)
    const farWant = SHADOW_FAR ? 900 + box * 1.42 + 110 + (SUN_CACHE ? SUN_QZ : 0) : 2000;
    if (sc.right !== box || sc.far !== farWant) {
      Object.assign(sc, { left: -box, right: box, top: box, bottom: -box, far: farWant });
      sc.updateProjectionMatrix();
    }
    // snap the box's centre to whole texels ACROSS THE SUN'S VIEW (the shadow camera's x / y axes): the map
    // then samples the world at the same points from frame to frame, edges stand still as the camera moves
    const z = this._lz ??= new THREE.Vector3(), x = this._lx ??= new THREE.Vector3(), y = this._ly ??= new THREE.Vector3();
    z.copy(this.sunDir).normalize();
    x.crossVectors(sc.up, z);
    if (x.lengthSq() < 1e-8) x.set(1, 0, 0);
    x.normalize();
    y.crossVectors(z, x);
    const texel = (2 * box) / this.sun.shadow.mapSize.x;
    // THE STAIR-STEPPED SHADOW EDGES (owner, 2026-11-11; docs/fixes1/README.md): three r187's PCF is 5 Vogel taps of a
    // hardware 2x2 compare, `radius` texels wide (default 1). At street level a texel is 3.9 cm (box 80 m) and the
    // edge is clean; from the orbit / fly views the box grows to 380 m and a texel to 18.6 cm, and a 1-texel kernel
    // shows the texels as steps. The kernel grows with the texel (1 texel at <= 4 cm, 2.25 texels at >= 14 cm): a
    // wider penumbra in metres only where the steps were, eased (no jump when the box changes size). A uniform: no
    // recompile.
    const rWant = this.radiusAdapt === false ? 1 : THREE.MathUtils.clamp(1 + (texel - 0.04) / 0.08, 1, 2.25);   // (radiusAdapt = false: A/B)
    this.sun.shadow.radius = dt > 0 ? damp(this.sun.shadow.radius, rWant, 0.5, dt) : rWant;
    const px = focus.dot(x), py = focus.dot(y);
    const f = this._lf ??= new THREE.Vector3();
    f.copy(focus).addScaledVector(x, Math.round(px / texel) * texel - px).addScaledVector(y, Math.round(py / texel) * texel - py);
    // (the static shadow cache: the light's distance along the sun quantised to SUN_QZ m, so a box sliding across the
    // sun's view keeps every static depth: the cache shifts by whole texels; the far plane carries the extra step)
    if (SUN_CACHE) { const dz = f.dot(z), qz = Math.ceil((dz + 900) / SUN_QZ) * SUN_QZ; this.sun.position.copy(f).addScaledVector(z, qz - dz); }
    else this.sun.position.copy(f).addScaledVector(z, 900);
    this.sun.target.position.copy(f);
    this.sun.target.updateMatrixWorld();
  }
}
