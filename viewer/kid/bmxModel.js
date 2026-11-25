// THE BMX ASSET in the lab (claude/bmx: models/bike/bmx.glb + bmx.json, docs/BMX.md) on the bike physics' pose.
// The placeholder (viewer/bike/bikeModel.js) keeps doing the pose (heading, lean round the contact line, pitch round
// the CoM, the frame moved by the legs, the crash fall); the BMX hangs in its frame group and only its own parts move
// here, each as REST x delta (the nodes' rest rotations kept):
//   Steer   about local +Y (the steering axis) by s.steerAngle (+ = left)
//   Wheel_F / Wheel_R   about local +X by s.spin
//   Crank   about local +X by s.crank + PI (the LEFT pedal at the physics' crank angle, as the placeholder's)
//   Pedal_L / Pedal_R   about local +X by -(the crank's angle): level
//   Cog     about local +X by the crank x 44 / 16
//   the chain: its texture scrolled by the crank (bmx.json chain.scroll)
// LODs: one of <Node>_LOD0/1/2 shown per node (12 / 40 m, hysteresis); colourways: bmx.json (slot colours, no rebuild).
// The rider's empties (viewer/kid/bikeRig.js names): Grip_L/R -> grip_L/R, Foot_L/R (the pedals' tops) -> pedal_L/R,
// Seat -> seat, Crank -> bb, Peg_* -> peg_*.
import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const TRANSCODER = "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/libs/basis/";
const BASE = new URL("../../models/bike/", import.meta.url).href;
export const BMX_EMPTY_MAP = { Grip_L: "grip_L", Grip_R: "grip_R", Foot_L: "pedal_L", Foot_R: "pedal_R", Seat: "seat", Crank: "bb",
  Peg_FL: "peg_FL", Peg_FR: "peg_FR", Peg_RL: "peg_RL", Peg_RR: "peg_RR" };
export const BMX_LOD = [12, 40];
/** the seat post's axis in the Body frame (glTF: y up, z forward): the 71 deg seat tube, up and back. A rider's
 *  seat-post height (RIDE.seatPost, m along it: kid A rides with the post 5 cm up) moves the saddle + the Seat empty */
export const SEAT_DIR = new THREE.Vector3(0, Math.sin(71 * Math.PI / 180), -Math.cos(71 * Math.PI / 180));
const _q = new THREE.Quaternion(), _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0);

/**
 * Loads the BMX and mounts it on the placeholder model (createBikeModel's result `ph`): under its frame group
 * (ph.bikeFrame, ground at -cgHeight), the placeholder's own meshes hidden. Returns { root, empties, update(s, camDist), setColourway(name), info }.
 */
export async function loadBmx(renderer, ph, { colourway = null } = {}) {
  const ktx = new KTX2Loader().setTranscoderPath(TRANSCODER);
  if (renderer) ktx.detectSupport(renderer);
  MeshoptDecoder.useWorkers?.(1);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx);
  const [gltf, meta] = await Promise.all([loader.loadAsync(BASE + "bmx.glb"), fetch(BASE + "bmx.json").then((r) => r.json())]);
  const root = gltf.scene;
  root.name = "BMX (models/bike/bmx.glb)";
  const rig = rigBmx(root, meta, ph);
  const { empties } = rig;
  // LOD groups: per node, its _LOD0/1/2 children
  const lods = [];
  root.traverse((o) => { const m = /_LOD(\d)$/.exec(o.name); if (m) { (lods[+m[1]] ||= []).push(o); o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); } });
  let lod = -1;
  const setLod = (i) => { if (i === lod) return; lod = i; lods.forEach((list, k) => list?.forEach((o) => { o.visible = k === i; })); };
  setLod(0);
  // materials by slot name
  const mats = {};
  root.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) mats[m.name] = m; });
  const chainTex = mats.bmx_chain?.map || null;
  if (chainTex) { chainTex.wrapS = THREE.RepeatWrapping; chainTex.needsUpdate = true; rig.chainTex = chainTex; }
  const setColourway = (name) => {
    const c = meta.colourways?.[name]; if (!c) return;
    for (const [slot, key] of [["bmx_paint", "paint"], ["bmx_pad", "pad"], ["bmx_grip", "grip"], ["bmx_saddle", "saddle"]]) if (mats[slot] && c[key]) mats[slot].color.setRGB(c[key][0], c[key][1], c[key][2]);
  };
  if (colourway) setColourway(colourway);
  // the seat post: the saddle meshes + the Seat empty slide along SEAT_DIR; a chrome post piece fills the gap
  const seatNode = root.getObjectByName("Seat"), seat0 = seatNode ? seatNode.position.clone() : null;
  const saddles = [];
  root.traverse((o) => { if (o.isMesh && [].concat(o.material).some((m) => m.name === "bmx_saddle")) saddles.push({ o, p: o.position.clone() }); });
  const posts = saddles.map(({ o }) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0111, 0.0111, 1, 12, 1, true), mats.bmx_chrome || new THREE.MeshStandardNodeMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.25 }));
    m.visible = false; m.castShadow = true; o.parent.add(m); return m;
  });
  const setSeatPost = (dh) => {
    if (!seatNode) return;
    seatNode.position.copy(seat0).addScaledVector(SEAT_DIR, dh);
    saddles.forEach(({ o, p }) => o.position.copy(p).addScaledVector(SEAT_DIR, dh));
    posts.forEach((m) => {
      m.visible = dh > 0.003;
      const a = seat0.clone().addScaledVector(SEAT_DIR, -0.07), len = dh + 0.05;        // from inside the old clamp up under the saddle
      m.position.copy(a).addScaledVector(SEAT_DIR, len / 2); m.scale.set(1, len, 1);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SEAT_DIR);
    });
  };
  return {
    root, empties, meta, mats, setColourway, setLod, setSeatPost,
    get lod() { return lod; },
    info: { tris: meta.lods?.triangles, colourways: Object.keys(meta.colourways || {}) },
    update(s, camDist = 0) {
      rig.update(s);
      // LOD with hysteresis (1.5 m)
      const want = camDist < BMX_LOD[0] ? 0 : camDist < BMX_LOD[1] ? 1 : 2;
      if (want !== lod && Math.abs(camDist - BMX_LOD[Math.min(lod, want)]) > 1.5) setLod(want);
    },
  };
}

/**
 * The BMX's nodes on the placeholder's pose (shared with the node tests, which build the node tree from the GLB's JSON
 * without meshes): placed in ph.bikeFrame on the ground, the placeholder's meshes hidden, the moving parts and the
 * rider's empties. Returns { empties, update(s) }.
 */
export function rigBmx(root, meta, ph) {
  ph.bikeFrame.traverse((o) => { if (o.isMesh) o.visible = false; });
  root.position.set(0, -ph.geom.cgHeight, 0);
  ph.bikeFrame.add(root);
  const N = (n) => root.getObjectByName(n);
  const parts = {};
  for (const n of ["Steer", "Wheel_F", "Wheel_R", "Crank", "Pedal_L", "Pedal_R", "Cog"]) { const o = N(n); if (o) parts[n] = { o, rest: o.quaternion.clone() }; }
  const empties = { frame: ph.empties.frame, cg: ph.geom.cgHeight };
  for (const [src, dst] of Object.entries(BMX_EMPTY_MAP)) { const o = N(src); if (o) empties[dst] = o; }
  const ch = meta?.chain || { ringPitchRadius: 0.08901, uvPerMetre: 39.1979 };
  let lastCrank = null;
  const rot = (p, axis, a) => { if (p) p.o.quaternion.copy(p.rest).multiply(_q.setFromAxisAngle(axis, a)); };
  const rig = {
    empties, parts, chainTex: null,
    update(s) {
      rot(parts.Steer, _Y, s.steerAngle || 0);
      rot(parts.Wheel_F, _X, s.spin?.[0] || 0); rot(parts.Wheel_R, _X, s.spin?.[1] || 0);
      const c = (s.crank || 0) + Math.PI;
      rot(parts.Crank, _X, c); rot(parts.Pedal_L, _X, -c); rot(parts.Pedal_R, _X, -c);
      rot(parts.Cog, _X, (s.crank || 0) * 44 / 16);
      if (rig.chainTex && lastCrank !== null) {
        let d = (s.crank || 0) - lastCrank; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
        rig.chainTex.offset.x -= d * ch.ringPitchRadius * ch.uvPerMetre;
      }
      lastCrank = s.crank || 0;
    },
  };
  return rig;
}
