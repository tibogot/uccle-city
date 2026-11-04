// Render pipeline: scene pass (MRT) -> ambient occlusion + screen-space reflections -> bloom -> grade.
//
// SSR setup, bloom and the colour grade are adapted from mrdoob/slop-newyork js/main.js and
// js/post-processing.js (MIT, © 2026 Mr.doob). Added here: GTAO ambient occlusion (contact
// darkening at wall feet, kerbs, narrow streets), applied to the scene colour before reflections.
import * as THREE from "three/webgpu";
import {
  Fn, pass, mrt, output, normalView, positionView, metalness, roughness, uniform, float, vec2, vec3, vec4, dot, mix,
  min, max, pow, smoothstep, length, screenUV, screenSize, texture, uv, rtt,
} from "three/tsl";
import { ssr } from "three/addons/tsl/display/SSRNode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

const LOOKS = {
  misty: { exposure: 1.06, contrast: 1.04, saturation: 0.94, balance: [1.01, 1.0, 0.99], bloom: 0.2, threshold: 1.3 },
  golden: { exposure: 1.04, contrast: 1.12, saturation: 1.08, balance: [1.045, 1.0, 0.955], bloom: 0.24, threshold: 1.2 },
  midday: { exposure: 1.0, contrast: 1.1, saturation: 1.06, balance: [1.015, 1.0, 0.985], bloom: 0.18, threshold: 1.35 },
  overcast: { exposure: 1.08, contrast: 1.06, saturation: 0.96, balance: [0.99, 1.0, 1.02], bloom: 0.12, threshold: 1.5 },
  twilight: { exposure: 1.06, contrast: 1.1, saturation: 1.08, balance: [1.025, 0.995, 1.015], bloom: 0.28, threshold: 1.05 },
  night: { exposure: 1.04, contrast: 1.08, saturation: 1.06, balance: [0.985, 1.0, 1.035], bloom: 0.3, threshold: 1.0 },
};

export function createPipeline(renderer, scene, camera, { aoOn = true, ssrOn = true } = {}) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  // The scene is rendered by us (what pass(scene, camera) did), into an MRT HDR target, so the sky's
  // haze + sun shafts (Firmament postProcess) and later the volumetric fog can run on the linear frame
  // BEFORE the chain (AO, SSR, bloom, grade), as game-engine-v1 splits its frame (worldEnvironment.js
  // compositeOntoLinearHDR). The haze writes back with a single-output copy, so it gets its own
  // single-target copy of the colour (hdrRT): normal / metalRough in the MRT target stay intact.
  const sceneRT = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType, samples: renderer.samples, count: 3 });
  sceneRT.textures[0].name = "output"; sceneRT.textures[1].name = "normal"; sceneRT.textures[2].name = "metalRough";
  const depthTex = new THREE.DepthTexture(1, 1);
  depthTex.isRenderTargetTexture = true;
  depthTex.name = "depth";
  sceneRT.depthTexture = depthTex;
  const hdrRT = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const copyMat = new THREE.MeshBasicNodeMaterial();
  copyMat.fragmentNode = texture(sceneRT.textures[0], uv()).level(0);
  copyMat.depthTest = false; copyMat.depthWrite = false;
  const copyQuad = new THREE.QuadMesh(copyMat);
  const ssrFade = smoothstep(360.0, 180.0, positionView.z.negate());
  const maxRough = 0.75;
  const sceneMRT = mrt({
    output,
    normal: normalView,
    // .b = how much screen-space AO this pixel takes (1; facade glass writes 0 through its mrtNode)
    metalRough: vec3(roughness.lessThan(maxRough).select(metalness.mul(ssrFade), 0), roughness, 1),
  });
  sceneMRT.setBlendMode("normal", new THREE.BlendMode(THREE.MaterialBlending));
  sceneMRT.setBlendMode("metalRough", new THREE.BlendMode(THREE.MaterialBlending));
  const color = texture(hdrRT.texture);
  const depth = texture(depthTex);
  const normal = texture(sceneRT.textures[1]);
  const mr = texture(sceneRT.textures[2]);
  const size = new THREE.Vector2();
  /** scene -> MRT target -> colour copy -> hook(hdrRT, depthTex, size) (the sky's haze, its meter) */
  const renderScene = (hook) => {
    renderer.getDrawingBufferSize(size);
    if (sceneRT.width !== size.x || sceneRT.height !== size.y) { sceneRT.setSize(size.x, size.y); hdrRT.setSize(size.x, size.y); }
    const prevRT = renderer.getRenderTarget(), prevMRT = renderer.getMRT();
    renderer.setRenderTarget(sceneRT);
    renderer.setMRT(sceneMRT);
    renderer.render(scene, camera);
    renderer.setMRT(null);
    renderer.setRenderTarget(hdrRT);
    copyQuad.render(renderer);
    renderer.setRenderTarget(prevRT);
    renderer.setMRT(prevMRT);
    hook?.(hdrRT, depthTex, size);
  };

  let lit = color.rgb;
  let aoPass = null;
  if (aoOn) {
    aoPass = ao(depth, normal, camera);
    aoPass.resolutionScale = 0.5;
    aoPass.radius.value = 0.9;
    aoPass.thickness.value = 1.0;
    // GTAO's raw output is per-pixel noise (its magic-square sampling pattern): without the depth/normal-
    // aware denoise it read as sandy grain on walls, frames and curtains (owner's window close-up,
    // 2026-11-04), and at 0.85 it blackened surfaces near the camera
    // (denoised into its own HALF-res target, like the AO itself: inline in the full-res composite it
    // cost ~1.6 ms GPU)
    const aoClean = rtt(denoise(aoPass.getTextureNode(), depth, normal, camera));
    aoClean.setResolutionScale(0.5);
    lit = lit.mul(mix(float(1), aoClean.r, mr.b.mul(0.6)));
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
    /** hook(hdrRT, depthTex, size): runs on the linear HDR frame before the chain (the sky's haze) */
    render: (hook) => { renderScene(hook); pipeline.render(); },
    /** k x every look's exposure (Firmament's light is in Tidewater's units: k = 0.55) */
    setExposureScale(k) { this.exposureScale = k; this.look(this.lookId || "golden"); },
    /** the sky's eye adaptation, each frame (x on top of the look and the scale) */
    setExposureFactor(f) { this.exposureFactor = f; exposure.value = (LOOKS[this.lookId] || LOOKS.golden).exposure * (this.exposureScale || 1) * f; },
    /** the linear HDR scene target (the sky meters it for its eye adaptation) */
    sceneTarget: hdrRT,
    look(id) {
      const l = LOOKS[id] || LOOKS.golden;
      this.lookId = id;
      exposure.value = l.exposure * (this.exposureScale || 1) * (this.exposureFactor || 1); contrast.value = l.contrast; saturation.value = l.saturation;
      balance.value.set(...l.balance);
      bloomPass.strength.value = l.bloom; bloomPass.threshold.value = l.threshold;
    },
  };
}
