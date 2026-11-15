// FOLIAGE LIGHTING, PER VERTEX (perf pass 3, docs/perf/AUDIT.md step 13): the sun's BRDF of thin foliage (grass blades,
// ivy cards, shrub leaves) evaluated in the VERTEX stage; the shadow, the albedo, the environment and the sky stay per
// fragment. Measured (debug/groupBench.js, isolated, 1600 x 828): unlit ivy cards cost 0.05 ms, lit 0.9 ms: on cards
// layered 4-6 deep (alpha to coverage: no early depth kill) the per-fragment GGX + the six pooled lamp lights (0 by day)
// were the whole cost. A blade / card / leaf is small and flat: its normal is already a per-vertex value, and the view
// and sun directions change little across it, so the sun term interpolates with no visible difference.
//   vertexLit(material, { normal, roughness })   normal: the WORLD normal node (vertex stage), roughness: a node / number
//   foliageLights(list)                          the lights foliage takes: the sun + the hemisphere (no lamp point lights:
//                                                the lamp light map lights foliage at night, as the grass already did)
// ?vlight=old: the materials keep three's per-fragment PhysicalLightingModel (A/B); ?foliagelamps=old: foliage keeps the
// scene's lights (the pooled lamp point lights too).
import * as THREE from "three/webgpu";
import {
  uniform, varying, vec3, float, normalize, dot, clamp, positionWorld, cameraPosition, lights, diffuseContribution,
  BRDF_GGX, F_Schlick, cameraViewMatrix, vec4, vec2,
} from "three/tsl";

const qs = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
export const VERTEX_LIGHT = qs.get("vlight") !== "old";
export const FOLIAGE_LAMPS_OLD = qs.get("foliagelamps") === "old";

// the sun's direction (world, toward the sun), from the light itself every frame (as three's DirectionalLightNode)
let SUN = null;
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const uSunW = uniform(new THREE.Vector3(0, 1, 0)).onFrameUpdate(() => {
  if (!SUN) return;
  SUN.updateMatrixWorld(); SUN.target.updateMatrixWorld();
  _a.setFromMatrixPosition(SUN.matrixWorld); _b.setFromMatrixPosition(SUN.target.matrixWorld);
  uSunW.value.copy(_a.sub(_b)).normalize();
});

let LIGHTS = null, LIST = null;
/** the scene's sun + hemisphere (main.js passes the Lighting object before the foliage materials are made) */
export function setFoliageLights(lighting) {
  if (!lighting) return;
  SUN = lighting.sun || null;
  LIST = [lighting.sun, lighting.hemi].filter(Boolean);
  LIGHTS = null;
}
/** the lights node foliage takes (null: the scene's, i.e. ?foliagelamps=old or no Lighting known) */
export function foliageLights() {
  if (FOLIAGE_LAMPS_OLD || !LIST) return null;
  return (LIGHTS ||= lights(LIST));
}

/** the sun's direct term with its BRDF from the vertex stage: diffuse (1 - F) / pi and GGX specular, x N.L */
class VertexSunModel extends THREE.PhysicalLightingModel {
  constructor(D, S) { super(); this.vD = D; this.vS = S; }
  direct({ lightColor, reflectedLight }) {
    reflectedLight.directDiffuse.addAssign(lightColor.mul(this.vD).mul(diffuseContribution));
    reflectedLight.directSpecular.addAssign(lightColor.mul(this.vS).mul(this.multiScatteringCompensation));
  }
}

/** a foliage material lit per vertex: `normal` = its world normal (a vertex-stage node), `roughness` as its
 *  roughnessNode (a vertex-stage value: the per-fragment geometric roughness widening is not applied); the
 *  material's lights become foliageLights() (sun + hemisphere). Returns the material. */
export function vertexLit(m, { normal, roughness = 0.8, lightsOnly = false } = {}) {
  const L = foliageLights();
  if (L) m.lightsNode = L;
  if (!VERTEX_LIGHT || lightsOnly || !SUN) return m;
  const N = normalize(normal), Ls = uSunW, V = normalize(cameraPosition.sub(positionWorld));
  const H = normalize(Ls.add(V));
  const dotNL = clamp(dot(N, Ls), 0, 1), dotVH = clamp(dot(V, H), 0, 1);
  const R = typeof roughness === "number" ? float(roughness) : float(roughness);
  // (f0 is grey: F, the diffuse and the specular factors are scalars: ONE vec2 varying)
  const F = F_Schlick({ f0: vec3(0.04), f90: float(1), dotVH }).x;
  const spec = BRDF_GGX({ lightDirection: Ls, f0: vec3(0.04), f90: float(1), roughness: R, normalView: N, viewDirection: V }).x;
  const DS = varying(vec2(float(1).sub(F).mul(dotNL.mul(1 / Math.PI)), spec.mul(dotNL)), "v_vlDS");
  m.setupLightingModel = () => new VertexSunModel(DS.x, DS.y);
  m.userData.vertexLit = true;
  void cameraViewMatrix; void vec4;
  return m;
}
