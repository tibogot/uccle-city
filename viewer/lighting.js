// Sky, image-based lighting, sun with cascaded shadows, aerial fog and time-of-day presets.
//
// Adapted from mrdoob/slop-newyork js/lighting.js (MIT, © 2026 Mr.doob): the Preetham SkyMesh with
// clouds baked into a PMREM environment map, the two-cascade SunLight, the canyon-bounce hemisphere
// light and the sky-matched aerial-perspective fog. Changes for Uccle: sun directions in our axes
// (+x east, +z south), heights are absolute metres TAW (40-130 m) so the haze layer starts at the
// valley floor, and the shared uniforms (`env`) feed our own façade and road materials.
import * as THREE from "three/webgpu";
import { Fn, float, vec3, vec4, uniform, mix, fog, pmremTexture, positionWorld, cameraPosition, length, normalize, max, exp, abs, select } from "three/tsl";
import { SkyMesh } from "three/addons/objects/SkyMesh.js";
import { SunLight } from "three/addons/lights/SunLight.js";
import { SunLightNode } from "three/addons/lights/SunLightNode.js";

// Direction TO the sun. Brussels, late afternoon from the south-west: west = -x, south = +z.
const dir = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
export const PRESETS = {
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
    SunLight.registerNode(SunLightNode);
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
      const maxTex = renderer.backend?.device?.limits?.maxTextureDimension2D || 4096;
      const tile = maxTex >= 6144 ? 3072 : 2048;
      this.sun.shadow.mapSize.set(tile, tile);
      this.sun.shadow.camera.near = 0.5;
      this.sun.shadow.camera.far = 300;
    } else {
      this.sun = new THREE.DirectionalLight(0xffc890, 5.6);
      this.sun.shadow.mapSize.set(4096, 4096);
      Object.assign(this.sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 2000 });
      this.sun.shadow.bias = -0.0002;
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

  fogNode() {
    const toFrag = positionWorld.sub(cameraPosition);
    const dist = length(toFrag);
    const d = toFrag.div(max(dist, 0.001));
    const horizon = normalize(vec3(d.x, max(d.y, 0.015), d.z));
    const skyColor = pmremTexture(this.envTarget.texture, horizon, float(0)).rgb;
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
  update(cameraY, groundY, focus, half) {
    if (this.cascaded) {
      const alt = Math.max(0, cameraY - groundY);
      this.sun.shadow.camera.far = Math.max(300, Math.min(900, 260 + alt * 1.6));
      return;
    }
    const sc = this.sun.shadow.camera;
    if (Math.abs(sc.right - half) > half * 0.1) {
      Object.assign(sc, { left: -half, right: half, top: half, bottom: -half });
      sc.updateProjectionMatrix();
    }
    // snap the box to shadow texels so edges don't crawl as the camera moves
    const texel = (2 * half) / this.sun.shadow.mapSize.x;
    const f = focus.clone().divideScalar(texel).round().multiplyScalar(texel);
    this.sun.position.copy(f).addScaledVector(this.sunDir, 900);
    this.sun.target.position.copy(f);
    this.sun.target.updateMatrixWorld();
  }
}
