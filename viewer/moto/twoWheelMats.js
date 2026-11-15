// THE TWO-WHEELERS' MATERIALS (motorbike round 2): every slot of a bike in ONE material, read per vertex from the packed
// "_slot" attribute (tools/moto/pack.mjs; viewer/moto/twoWheelSlots.js: index + 0.01 + 0.97 x the baked AO): a whole
// rig node is one mesh (round 1: one mesh per node x slot). Colour / roughness / metalness / clear coat / the lamp role
// come from two uniform arrays indexed by the slot.
//   playerMaterial(kind)  the ridden vehicle: a physical material (clear coat on the paint and helmet), the paint from a
//                         uniform (dev panel colours), the lamps from twoWheelLights (head: DRL by day + night; tail: night
//                         + brake; reflectors faint at night); fixed light count: emissive only
//   cityMaterial(lod, …)  the city's parked / traffic two-wheelers (viewer/moto/cityTwoWheelers.js): standard (no clear
//                         coat: cost), the paint per instance, the LOD band + tile fade dither (viewer/lodFade.js, same
//                         noise in the shadow pass: no pop, no shadow snap), the wheels rolled in the vertex shader for
//                         the traffic (per-vertex "_wheel" + per-instance spin; r187 applies the instance matrix BEFORE
//                         positionNode, so the small wheel offset is turned into the instance's frame by hand)
import * as THREE from "three/webgpu";
import {
  attribute, uniform, uniformArray, float, vec3, int, select, color, mix, smoothstep, length, positionWorld, positionLocal, cos, sin,
} from "three/tsl";
import { SLOT_TABLE } from "./twoWheelSlots.js";
import { packLook } from "../drive/carPacks.js";
import { lodEye, keepBand, ditherNoise } from "../lodFade.js";
import { env } from "../lighting.js";
import { wxMat } from "../weather/cityWeatherize.js";

/** the ridden vehicle's lamps (0..1): head / tail (night), brake */
export const twoWheelLights = { head: uniform(0), tail: uniform(0), brake: uniform(0) };

const toLinear = (rgb) => new THREE.Vector4(...rgb, 0);
const slotA = uniformArray(SLOT_TABLE.map((s) => new THREE.Vector4(s[1][0], s[1][1], s[1][2], s[2])), "vec4");          // rgb, roughness
const slotB = uniformArray(SLOT_TABLE.map((s) => new THREE.Vector4(s[3], s[4], s[5], 0)), "vec4");                      // metal, clearcoat, role

function slotNodes() {
  const s = attribute("_slot", "float"), fi = s.add(0.002).floor(), idx = fi.toInt();
  const ao = s.sub(fi).sub(0.01).div(0.97).clamp(0, 1);
  const A = slotA.element(idx), B = slotB.element(idx);
  const role = B.z.add(0.5).floor();
  return { idx, ao, A, B, role };
}
const OLD_LAMPS = /[?&](carlights|polish1)=old(&|$)/.test(typeof location !== "undefined" ? location.search : "");

const players = new Map();
/** the player's material for a kind (one per kind: its paint uniform) */
export function playerMaterial(kind, paintHex) {
  if (players.has(kind)) return players.get(kind);
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.5, metalness: 0 });
  const { ao, A, B, role } = slotNodes();
  const paint = uniform(new THREE.Color(paintHex ?? 0x808080));
  m.colorNode = select(role.equal(4), paint, A.xyz);
  m.roughnessNode = A.w;
  m.metalnessNode = B.x;
  m.clearcoatNode = B.y;
  m.clearcoatRoughnessNode = float(0.06);
  m.aoNode = ao;
  const L = twoWheelLights;
  const head = select(role.equal(1), L.head.mul(7).add(0.6), float(0));                     // (the LED DRL always on)
  const tail = select(role.equal(2), OLD_LAMPS ? L.tail.mul(1.4).add(L.brake.mul(5)) : L.tail.mul(packLook.tailNight).add(L.brake.mul(packLook.brake)), float(0));
  const refl = select(role.equal(3), env.uNight.mul(0.25), float(0));
  m.emissiveNode = color(0xeef3ff).mul(head).add(color(0xff1408).mul(tail)).add(A.xyz.mul(refl));
  m.name = `twowheel-${kind}`;
  m.userData.shared = true; m.userData.paint = paint;
  wxMat(m, { porosity: 0.05, beads: true, frost: true });
  const out = { material: m, paint, setPaint: (hex) => paint.value.setHex(hex) };
  players.set(kind, out);
  return out;
}

/**
 * The city pools' material for one LOD (lod 0..2 of the pool = the pack's lod1..3). Instance attributes:
 *   iBand (switch 0-1, switch 1-2, end, the tile's fade slot)   iPaint (linear rgb, spin)   iPose (heading, lean, steer, 0)
 * fades: a viewer/instanceStream.js FadeSlots (parked: tile fades) or null (traffic: always whole)
 * roll: the traffic (the wheels roll with iPaint.w; iPose turns the offset into the bike's frame)
 */
export function cityMaterial(lod, { fades = null, roll = false, name = "city" } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.5, metalness: 0 });
  const { ao, A, B, role } = slotNodes();
  const iPaint = attribute("iPaint", "vec4"), iBand = attribute("iBand", "vec4");
  m.colorNode = select(role.equal(4), iPaint.xyz, A.xyz).mul(mix(float(1), ao, 0.35));
  m.roughnessNode = A.w;
  m.metalnessNode = B.x;
  m.aoNode = ao;
  // lamps: the head lamp's DRL, tail lamps at night (traffic: on; parked: off)
  const night = env.uNight;
  m.emissiveNode = roll
    ? color(0xeef3ff).mul(select(role.equal(1), night.mul(5).add(0.5), float(0))).add(color(0xff1408).mul(select(role.equal(2), night.mul(packLook.tailNight), float(0))))
    : A.xyz.mul(select(role.equal(3), night.mul(0.25), float(0)));
  // the LOD band (distance from the VIEW camera in every pass) + the tile fade
  const n = ditherNoise(), d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(iBand.x.mul(0.9), iBand.x.mul(1.1), d), t2 = smoothstep(iBand.y.mul(0.9), iBand.y.mul(1.1), d), e = smoothstep(iBand.z.mul(0.85), iBand.z, d);
  let keep = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  if (fades) {
    const f = fades.fade(iBand.w);
    keep = keep.and(select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f)));
  }
  m.maskNode = keep; m.maskShadowNode = keep;
  if (roll) {
    const W = attribute("_wheel", "vec4"), iPose = attribute("iPose", "vec4"), p0 = attribute("position", "vec3");
    const isW = W.z.greaterThan(0.5);
    const ry = p0.y.sub(W.x), rz = p0.z.sub(W.y), cs = cos(iPaint.w), sn = sin(iPaint.w);
    // local offset of the rolled vertex (about the axle: x), the front also steered (about y, small)
    const dy = ry.mul(cs).sub(rz.mul(sn)).sub(ry), dz = ry.mul(sn).add(rz.mul(cs)).sub(rz);
    const st = select(W.z.lessThan(1.5), iPose.z, float(0));
    const rz2 = dz.add(rz), cst = cos(st), sst = sin(st);
    const dx = p0.x.mul(cst.sub(1)).add(rz2.mul(sst)), dz2 = rz2.mul(cst).sub(p0.x.mul(sst)).sub(rz);
    const off = select(isW, vec3(dx, dy, dz2), vec3(0, 0, 0));
    // into the world: lean (about z), then heading (about y)
    const cl = cos(iPose.y), sl = sin(iPose.y), ch = cos(iPose.x), sh = sin(iPose.x);
    const lx = off.x.mul(cl).sub(off.y.mul(sl)), ly = off.x.mul(sl).add(off.y.mul(cl)), lz = off.z;
    m.positionNode = positionLocal.add(vec3(lx.mul(ch).add(lz.mul(sh)), ly, lz.mul(ch).sub(lx.mul(sh))));
  }
  m.name = `twowheel-${name}-lod${lod}`;
  m.userData.shared = true; m.userData.noFade = true;
  wxMat(m, { porosity: 0.05, beads: true, frost: true });
  return m;
}
export { toLinear };
