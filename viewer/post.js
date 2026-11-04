// Render pipeline: scene pass (MRT) -> ambient occlusion + screen-space reflections -> bloom -> grade.
//
// SSR setup, bloom and the colour grade are adapted from mrdoob/slop-newyork js/main.js and
// js/post-processing.js (MIT, © 2026 Mr.doob). Added here: GTAO ambient occlusion (contact
// darkening at wall feet, kerbs, narrow streets), applied to the scene colour before reflections.
import * as THREE from "three/webgpu";
import {
  Fn, pass, mrt, output, normalView, positionView, metalness, roughness, uniform, float, vec2, vec3, vec4, dot, mix,
  min, max, pow, smoothstep, length, screenUV, screenSize,
} from "three/tsl";
import { ssr } from "three/addons/tsl/display/SSRNode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

const LOOKS = {
  golden: { exposure: 1.04, contrast: 1.12, saturation: 1.08, balance: [1.045, 1.0, 0.955], bloom: 0.24, threshold: 1.2 },
  midday: { exposure: 1.0, contrast: 1.1, saturation: 1.06, balance: [1.015, 1.0, 0.985], bloom: 0.18, threshold: 1.35 },
  overcast: { exposure: 1.08, contrast: 1.06, saturation: 0.96, balance: [0.99, 1.0, 1.02], bloom: 0.12, threshold: 1.5 },
  twilight: { exposure: 1.06, contrast: 1.1, saturation: 1.08, balance: [1.025, 0.995, 1.015], bloom: 0.28, threshold: 1.05 },
  night: { exposure: 1.04, contrast: 1.08, saturation: 1.06, balance: [0.985, 1.0, 1.035], bloom: 0.3, threshold: 1.0 },
};

export function createPipeline(renderer, scene, camera, { aoOn = true, ssrOn = true } = {}) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scenePass = pass(scene, camera);
  const ssrFade = smoothstep(360.0, 180.0, positionView.z.negate());
  const maxRough = 0.75;
  const sceneMRT = mrt({
    output,
    normal: normalView,
    metalRough: vec2(roughness.lessThan(maxRough).select(metalness.mul(ssrFade), 0), roughness),
  });
  sceneMRT.setBlendMode("normal", new THREE.BlendMode(THREE.MaterialBlending));
  sceneMRT.setBlendMode("metalRough", new THREE.BlendMode(THREE.MaterialBlending));
  scenePass.setMRT(sceneMRT);
  const color = scenePass.getTextureNode("output");
  const depth = scenePass.getTextureNode("depth");
  const normal = scenePass.getTextureNode("normal");
  const mr = scenePass.getTextureNode("metalRough");

  let lit = color.rgb;
  let aoPass = null;
  if (aoOn) {
    aoPass = ao(depth, normal, camera);
    aoPass.resolutionScale = 0.5;
    aoPass.radius.value = 1.2;
    aoPass.thickness.value = 1.0;
    lit = lit.mul(mix(float(1), aoPass.getTextureNode().r, 0.85));
  }
  let refl = vec3(0);
  if (ssrOn) {
    const ssrPass = ssr(color, depth, normal, { metalnessNode: mr.r, roughnessNode: mr.g, camera });
    ssrPass.resolutionScale = 0.5;
    ssrPass.blurQuality = 1;
    ssrPass.maxDistance.value = 42;
    ssrPass.thickness.value = 0.85;
    ssrPass.quality.value = 0.25;
    ssrPass.binaryRefine = true;
    ssrPass.intensity.value = 0.5;
    ssrPass.screenEdgeFadeBlack = true;
    const mask = mr.r.greaterThan(0).select(smoothstep(maxRough, 0.55, mr.g), 0);
    refl = ssrPass.rgb.mul(mask);
  }

  const exposure = uniform(1.0), contrast = uniform(1.0), saturation = uniform(1.0), balance = uniform(new THREE.Vector3(1, 1, 1));
  const exposed = max(lit.add(refl), vec3(0)).mul(exposure).mul(balance);
  const peak = max(max(exposed.r, exposed.g), exposed.b);
  const bloomPass = bloom(vec4(exposed.mul(float(8.0).div(max(peak, 8.0))), 1.0), 0.24, 0.4, 1.2);
  bloomPass.smoothWidth.value = 0.3;
  bloomPass.setResolutionScale(0.5);

  const outputNode = Fn(() => {
    const c = exposed.add(bloomPass.rgb).toVar();
    const luma = dot(c, vec3(0.2126, 0.7152, 0.0722)).toVar();
    const shadows = mix(vec3(0.965, 1.005, 1.045), vec3(1), smoothstep(0.02, 0.6, luma));
    const highs = mix(vec3(1), vec3(1.035, 1.005, 0.965), smoothstep(0.6, 3.0, luma));
    c.mulAssign(shadows.mul(highs));
    c.mulAssign(pow(max(luma, 0.0001).div(0.18), contrast.sub(1.0)));
    const gray = dot(c, vec3(0.2126, 0.7152, 0.0722));
    const hi = max(max(c.r, c.g), c.b), chroma = hi.sub(min(min(c.r, c.g), c.b));
    const vibrance = float(0.1).mul(float(1).sub(chroma.div(max(hi, 0.0001))));
    c.assign(max(mix(vec3(gray), c, saturation.add(vibrance)), vec3(0)));
    const aspect = screenSize.x.div(screenSize.y);
    const r = length(screenUV.sub(0.5).mul(vec2(aspect, 1))).div(length(vec2(aspect, 1).mul(0.5)));
    return vec4(c.mul(float(1).sub(smoothstep(0.35, 1.0, r).mul(0.12))), 1.0);
  })();

  const pipeline = new THREE.RenderPipeline(renderer, outputNode);
  return {
    pipeline,
    render: () => pipeline.render(),
    /** k x every look's exposure (Firmament's light is in Tidewater's units: k = 0.55) */
    setExposureScale(k) { this.exposureScale = k; this.look(this.lookId || "golden"); },
    /** the sky's eye adaptation, each frame (x on top of the look and the scale) */
    setExposureFactor(f) { this.exposureFactor = f; exposure.value = (LOOKS[this.lookId] || LOOKS.golden).exposure * (this.exposureScale || 1) * f; },
    /** the linear HDR scene target (the sky meters it for its eye adaptation) */
    sceneTarget: scenePass.renderTarget,
    look(id) {
      const l = LOOKS[id] || LOOKS.golden;
      this.lookId = id;
      exposure.value = l.exposure * (this.exposureScale || 1) * (this.exposureFactor || 1); contrast.value = l.contrast; saturation.value = l.saturation;
      balance.value.set(...l.balance);
      bloomPass.strength.value = l.bloom; bloomPass.threshold.value = l.threshold;
    },
  };
}
