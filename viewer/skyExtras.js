// SKY EXTRAS (skyctl, 2026-11-17): the dev panel's sky look controls that Firmament (vendor/firmament, read-only) has no
// param for, added from our side round the built sky. Uniforms only: the node graph is composed ONCE, before the
// dome's first draw; the sliders write sky.params, read into the uniforms below after every sky.update().
//
//   sunDiscBright  the sun disc's radiance x      -> the atmosphere's own sun-disc intensity uniform (sp1.x; Firmament
//                                                    writes 1 there in its update, we overwrite it just after)
//   sunScale       the sunlight on the world x    -> sky.light().sunColor scaled in place (the key light, the volumetric
//                                                    fog read it); Firmament's own floor / shafts keep the unscaled sun
//   sunHalo / sunHaloDeg  an extra glow round the sun (0 = none): added to the dome's output, coloured by the air's
//                                                    transmittance toward the pixel, fading as the sun sets
//   skyTint        -1 cooler .. +1 warmer, luminance kept: x the dome's output, x the environment bake (a multiply-
//                  blended quad over its render target after each re-bake, before three re-runs the PMREM), x the
//                  sky irradiance and horizon colour our materials and fog read
//   moonBright     the moon disc x: (gain - 1) x Firmament's moon disc added to the dome, behind the cumulus
//                  (its view sample's transmittance), in a uniform branch (nothing evaluated at gain 1)
// Firmament's existing params do the rest (moonSizeDeg, nightHalo, nightStars, nightStarSize, cloudAlbedo, cloudAmbient,
// baseShadow).

import * as THREE from "three/webgpu";
import { Fn, uniform, vec3, vec4, float, normalize, positionWorld, cameraPosition, max, exp, acos, clamp, dot, smoothstep, If } from "three/tsl";

/** The extras' defaults: the look as before. */
export const SKY_X_DEFAULTS = { sunDiscBright: 1, sunHalo: 0, sunHaloDeg: 4, skyTint: 0, moonBright: 1 };

export function createSkyExtras(sky, renderer) {
  const P = sky.params, A = sky.atmosphere;
  for (const [k, v] of Object.entries(SKY_X_DEFAULTS)) if (P[k] === undefined) P[k] = v;
  P.sunScale ??= 1;

  const uTint = uniform(new THREE.Vector3(1, 1, 1));
  const uHalo = uniform(new THREE.Vector2(0, 1));      // ( strength x the sun's fade, 1 / size rad )
  const uMoonX = uniform(0);                            // moonBright - 1

  // ---- the dome: its own colour, composed round
  const mat = sky.mesh.material, orig = mat.colorNode;
  mat.colorNode = Fn(() => {
    const c = vec4(orig).toVar();
    const dir = normalize(positionWorld.sub(cameraPosition)).toVar();
    const skyDir = normalize(vec3(dir.x, max(dir.y, 0.0), dir.z));
    const ang = acos(clamp(dot(dir, A.uniforms.ap.xyz), -1.0, 1.0));
    const halo = A.transmittanceToSpace(skyDir).mul(uHalo.x.mul(exp(ang.mul(uHalo.y).negate()))).mul(smoothstep(-0.02, 0.0, dir.y));
    const rgb = c.rgb.mul(uTint).add(halo).toVar();
    If(uMoonX.notEqual(0.0), () => {
      const vis = sky.clouds.viewSample(dir).a;
      rgb.addAssign(A.moon(skyDir).mul(uMoonX).mul(vis));
    });
    return vec4(max(rgb, vec3(0.0)), c.a);
  })();
  mat.needsUpdate = true;

  // ---- the environment: x tint over the baked equirect, once per re-bake (pmremVersion moves when Firmament bakes)
  const tintMat = new THREE.MeshBasicNodeMaterial();
  tintMat.colorNode = vec4(uTint, float(1));
  tintMat.blending = THREE.CustomBlending;
  tintMat.blendEquation = THREE.AddEquation;
  tintMat.blendSrc = THREE.DstColorFactor; tintMat.blendDst = THREE.ZeroFactor;            // rgb = env x tint
  tintMat.blendSrcAlpha = THREE.ZeroFactor; tintMat.blendDstAlpha = THREE.OneFactor;       // alpha kept
  tintMat.depthTest = false; tintMat.depthWrite = false;
  const tintQuad = new THREE.QuadMesh(tintMat);
  let envVersion = -1;

  /** After every sky.update(): the uniforms, the in-place light tweaks, the environment's tint. */
  // a param that is not a finite number (a bad URL value, a cleared field) reads as its default: never a NaN uniform
  const num = (k, d) => (Number.isFinite(P[k]) ? P[k] : d);
  function afterUpdate() {
    const L = sky.light();
    A.uniforms.sp1.value.x = Math.max(0, num("sunDiscBright", 1));
    const t = THREE.MathUtils.clamp(num("skyTint", 0), -1, 1);
    const r = 1 + 0.3 * t, g = 1 + 0.05 * t, b = 1 - 0.35 * t, l = 0.2126 * r + 0.7152 * g + 0.0722 * b;   // Rec.709 sums to 1
    uTint.value.set(r / l, g / l, b / l);
    const fade = THREE.MathUtils.smoothstep(L.sunDir?.y ?? 1, -0.03, 0.02);
    uHalo.value.set(Math.max(0, num("sunHalo", 0)) * 2 * fade, 180 / (Math.PI * Math.max(0.05, num("sunHaloDeg", 4))));
    uMoonX.value = Math.max(0, num("moonBright", 1)) - 1;
    const ss = Math.max(0, num("sunScale", 1));
    if (ss !== 1) for (let i = 0; i < 3; i++) L.sunColor[i] *= ss;
    const T = uTint.value;
    if (L.skyIrradiance) { L.skyIrradiance[0] *= T.x; L.skyIrradiance[1] *= T.y; L.skyIrradiance[2] *= T.z; }   // a new array every update
    const h = L.horizon || [0, 0, 0];                                                                                // Firmament's own array: copy
    L.horizon = [h[0] * T.x, h[1] * T.y, h[2] * T.z];
    // the environment: always drawn on a re-bake (identity at tint 0), so its one pipeline is built at boot
    const rt = sky.env?.target;
    if (rt && rt.texture.pmremVersion !== envVersion) {
      // autoClear OFF: the quad MULTIPLIES what Firmament baked; a clear first left the environment black (every shadow
      // went black: caught by the tour 2026-11-17)
      const prev = renderer.getRenderTarget(), ac = renderer.autoClear;
      renderer.autoClear = false;
      renderer.setRenderTarget(rt);
      tintQuad.render(renderer);
      renderer.setRenderTarget(prev);
      renderer.autoClear = ac;
      envVersion = rt.texture.pmremVersion;
    }
  }

  return { afterUpdate, uniforms: { tint: uTint, halo: uHalo, moonX: uMoonX }, dispose: () => tintMat.dispose() };
}
