// Sky, image-based lighting, sun with cascaded shadows, aerial fog and time-of-day presets.
//
// Adapted from mrdoob/slop-newyork js/lighting.js (MIT, © 2026 Mr.doob): the Preetham SkyMesh with
// clouds baked into a PMREM environment map, the two-cascade SunLight, the canyon-bounce hemisphere
// light and the sky-matched aerial-perspective fog. Changes for Uccle: sun directions in our axes
// (+x east, +z south), heights are absolute metres TAW (40-130 m) so the haze layer starts at the
// valley floor, and the shared uniforms (`env`) feed our own façade and road materials.
import * as THREE from "three/webgpu";
import { shadow, Fn, float, vec3, vec4, uniform, mix, fog, pmremTexture, positionWorld, cameraPosition, length, normalize, max, exp, abs, select, smoothstep } from "three/tsl";
import { ShadowNode } from "three/webgpu";
import { damp } from "./lodFade.js";
import { SkyMesh } from "three/addons/objects/SkyMesh.js";
import { SunLight } from "three/addons/lights/SunLight.js";
import { SunLightNode } from "three/addons/lights/SunLightNode.js";
import { createFirmamentSky } from "../vendor/firmament/firmamentSky.js";
import { sunDirection } from "../vendor/firmament/firmamentCelestial.js";
import { createVolumetricFog } from "../vendor/volumetric-fog/volumetricFog.js";

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
  haze: 0.0006, maxDist: 1500, anisotropy: 0.6, windSpeed: 2 };

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

/** Uniforms shared with our materials (façades, roads). */
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
      if (SMOOTH_SHADOWS) this.sun.shadow.shadowNode = new FadedShadowNode(this.sun, this.sun.shadow);
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
    this.shadowNode = SMOOTH_SHADOWS ? new FadedShadowNode(this.sun, this.sun.shadow) : shadow(this.sun);
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
      nightLook: true, nightEV: +(new URLSearchParams(location.search).get("nightev") ?? 0.6) } });
    await this.sky.ready;
    this.scene.add(this.sky.mesh);
    // the key light x the cumulus shadow over the ground (labScene.js)
    this.sun.colorNode = vec3(this.uKey).mul(this.sky.clouds.shadowAt(positionWorld.xz));
    this.scene.environment = this.sky.environment;
    this.scene.environmentIntensity = 1;
    this.sky.params.coverage = this.firm.coverage;
    this.sky.params.cloudType = this.firm.cloudType;
    this.sky.update(0, { sunDir: this.firmSunDir() });
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
  }

  fogNode() {
    const toFrag = positionWorld.sub(cameraPosition);
    const dist = length(toFrag);
    const d = toFrag.div(max(dist, 0.001));
    const horizon = normalize(vec3(d.x, max(d.y, 0.015), d.z));
    // Firmament: the fog takes the sky's own horizon radiance (sky.light().horizon, every frame). A PMREM
    // lookup of its environment kept the FIRST sky's light (the texture is re-rendered in place and the
    // PMREM never refreshed): far tiles were fogged with the golden-hour sky at midnight.
    const skyColor = this.firmament ? vec3(this.uFogColor) : pmremTexture(this.envTarget.texture, horizon, float(0)).rgb;
    const H = this.uFogHeight;
    const ya = max(positionWorld.y.sub(this.uFogFloor), 0), yb = max(cameraPosition.y.sub(this.uFogFloor), 0);
    const dy = yb.sub(ya), ea = exp(ya.div(H).negate()), eb = exp(yb.div(H).negate());
    const mean = select(abs(dy).greaterThan(1.0), ea.sub(eb).mul(H).div(dy), ea);
    const tau = this.uFogDensity.mul(dist).mul(mean);
    return fog(skyColor, float(1).sub(exp(tau.mul(tau).negate())));
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
    if (sc.right !== box) {
      Object.assign(sc, { left: -box, right: box, top: box, bottom: -box });
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
    this.sun.position.copy(f).addScaledVector(z, 900);
    this.sun.target.position.copy(f);
    this.sun.target.updateMatrixWorld();
  }
}
