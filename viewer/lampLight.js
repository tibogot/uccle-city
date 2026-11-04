// STREET-LAMP LIGHT for every lamp, with no light objects: a world-space light map (one R8 texture over the
// whole map, 2 m per texel) where each lamp paints its pool when its tile loads. Materials near the ground
// (terrain, roads, sidewalks, setts, the foot of the walls) read it and add  albedo x pool x warm x night  as
// light. One texture lookup, the same shader for every tile (no rebuilds while streaming).
//
// game-engine-v1's modularRoadCityStreets.js lampPool is the model (analytic pools, inverse square with a smooth
// cut-off, Lambert on the road); it assumes lamps on a street grid, ours stand along real roads, so the pools
// are painted instead of computed. Lamps: viewer/lamps.js. ?lamppools=0 turns it off.
import * as THREE from "three/webgpu";
import { texture, uniform, vec2, vec3, float, positionWorld, color, smoothstep } from "three/tsl";
import { env } from "./lighting.js";

export const lampPoolsOn = !/[?&]lamppools=0/.test(location.search);
const X0 = -2000, Z0 = -1000, W = 4000, H = 2000, TEXEL = 2;     // the manifest's whole grid (A1..H4)
const NX = W / TEXEL, NZ = H / TEXEL;
const RANGE = 15;                                                  // m: the pool's reach
const HEAD = 5.9;                                                  // m: lamp head above the ground (the Blender lamp's globe)

const data = new Uint8Array(NX * NZ);
const acc = new Float32Array(NX * NZ);                             // the sum (clamped into data)
const tex = new THREE.DataTexture(data, NX, NZ, THREE.RedFormat, THREE.UnsignedByteType);
tex.magFilter = tex.minFilter = THREE.LinearFilter;
tex.generateMipmaps = false;
tex.needsUpdate = true;
const painted = new Set();

/** Paint a tile's lamps (x, z of each head on the ground plan). name: tile id, painted once. */
export function addLamps(name, heads) {
  if (!lampPoolsOn || painted.has(name)) return;
  painted.add(name);
  const r = Math.ceil(RANGE / TEXEL);
  for (const { x, z } of heads) {
    const cx = (x - X0) / TEXEL, cz = (z - Z0) / TEXEL;
    for (let j = Math.floor(cz - r); j <= Math.ceil(cz + r); j++) {
      if (j < 0 || j >= NZ) continue;
      for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
        if (i < 0 || i >= NX) continue;
        const dx = (i + 0.5 - cx) * TEXEL, dz = (j + 0.5 - cz) * TEXEL, d2 = dx * dx + dz * dz + HEAD * HEAD, d = Math.sqrt(d2);
        // inverse square x Lambert on the ground, 1 under the head, a smooth cut-off at RANGE
        const cut = Math.max(0, Math.min(1, (RANGE - Math.sqrt(dx * dx + dz * dz)) / (RANGE * 0.55)));
        acc[j * NX + i] += (HEAD / d) * (HEAD * HEAD / d2) * cut * cut * (3 - 2 * cut);
      }
    }
  }
  for (let k = 0; k < acc.length; k++) if (acc[k]) data[k] = Math.min(255, Math.round(acc[k] * 160));   // 1.6 = full white
  tex.needsUpdate = true;
}

const uOrigin = uniform(new THREE.Vector2(X0, Z0)), uInvSize = uniform(new THREE.Vector2(1 / W, 1 / H));
export const uLampPower = uniform(1.5);                            // tuned on screen with Firmament night look (+1.6 EV)
const WARM = color(0xffc27a);
/** The lamp light at this point (irradiance, before albedo): 0 by day. heightAbove: m above the ground (optional,
 *  for walls: the pool fades up the wall). */
export function lampLight(heightAbove = null) {
  if (!lampPoolsOn) return vec3(0);
  const uv = vec2(positionWorld.x, positionWorld.z).sub(uOrigin).mul(uInvSize);
  let k = texture(tex, uv).r.mul(1.6).mul(uLampPower).mul(env.uNight);
  if (heightAbove) k = k.mul(smoothstep(float(7.0), float(1.0), heightAbove));
  return WARM.mul(k);
}

/** Add the lamp light to a material: emissive += colour x lamp light. */
export function addLampLight(m, heightAbove = null) {
  if (!lampPoolsOn || !m.colorNode) return m;
  const add = m.colorNode.rgb ? m.colorNode.rgb.mul(lampLight(heightAbove)) : m.colorNode.mul(lampLight(heightAbove));
  m.emissiveNode = m.emissiveNode ? m.emissiveNode.add(add) : add;
  return m;
}
