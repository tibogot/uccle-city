// The footbridges' own two materials (claude/footbridge; viewer/rail/footbridge.js FOOT_SLOT): the rest of a footbridge
// is drawn with the road decks' kit (main.js deckMaterials: the library's cast concrete). Both world-mapped, no texture:
//   resin  the walking surface: a dark red resin with fine aggregate (Vivier d'Oie, Street View 2024: maroon-red decks
//          and paths), as the Verrewinkel hero footbridge's terracotta resin (rail/bridgeModel.js) but deeper
//   galv   galvanised plate girders, railings, canopies: light grey, a little metallic, blotchy weathering
import * as THREE from "three/webgpu";
import { positionWorld, color, float, mix, floor } from "three/tsl";
import { noise2D, hash2D } from "../tslkit.js";

let mats = null;
export function footMaterials() {
  if (mats) return mats;
  const p = positionWorld;
  const resin = new THREE.MeshStandardNodeMaterial({ roughness: 0.82, metalness: 0 });
  resin.colorNode = mix(color(0x5a2420), color(0x6e2f29), noise2D(p.xz.mul(0.7))).mul(mix(0.92, 1.06, hash2D(floor(p.xz.mul(140)))));
  resin.roughnessNode = float(0.82);
  const galv = new THREE.MeshStandardNodeMaterial({ roughness: 0.5, metalness: 0.45, side: THREE.DoubleSide });   // (thin plates and rails: both faces)
  galv.colorNode = mix(color(0x6f7477), color(0x80858a), noise2D(p.xz.add(p.y).mul(0.9))).mul(mix(0.95, 1.04, noise2D(p.xy.mul(3.1))));
  mats = [resin, galv];
  mats.forEach((m, i) => { m.userData.shared = true; m.name = `footbridge ${["resin", "galv"][i]}`; });
  return mats;
}
