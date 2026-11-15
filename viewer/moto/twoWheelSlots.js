// THE TWO-WHEELERS' MATERIAL SLOTS (motorbike round 2, docs/MOTO.md): one table for the motorbike, the scooter and the
// rideable Villo bike, so a whole bike can be ONE mesh per rig node (round 1: 41 meshes, one per node x slot) and the
// city's parked / traffic two-wheelers ONE instanced draw per kind and LOD. Pure JS (the pack tool reads it in node).
//   tools/moto/pack.mjs writes each vertex's slot as a float attribute "_slot" = index + 0.01 + 0.97 x the baked AO
//   (the 0.01 keeps the index whole through the GLB's 12-bit exponential filter)
//   viewer/moto/twoWheelMats.js turns the table into node materials (uniform arrays indexed by the slot)
// Entry: [kind/slot, linear rgb, roughness, metalness, clearcoat, emissive role]. Roles: 0 none, 1 head lamp (DRL by day,
// full at night), 2 tail lamp (night + brake), 3 reflector (a faint glow at night), 4 the paint (colour from a uniform /
// the instance), 5 the visor / glass (a sharp dark specular).
// Colours: linear (the previews' sRGB picks converted by eye), no brand colours.

export const SLOT_TABLE = [
  // ---- the motorbike (tools/blender/motorbike.py)
  ["moto/Paint", [0.27, 0.005, 0.006], 0.3, 0.35, 1, 4],
  ["moto/Frame", [0.008, 0.009, 0.011], 0.42, 0.6, 0, 0],
  ["moto/Metal", [0.32, 0.34, 0.36], 0.32, 1, 0, 0],
  ["moto/Engine", [0.012, 0.013, 0.015], 0.48, 0.7, 0, 0],
  ["moto/Chrome", [0.69, 0.69, 0.7], 0.14, 1, 0, 0],
  ["moto/Anodized", [0.58, 0.25, 0.012], 0.3, 1, 0, 0],
  ["moto/Rubber", [0.006, 0.006, 0.006], 0.88, 0, 0, 0],
  ["moto/Plastic", [0.005, 0.005, 0.006], 0.55, 0, 0, 0],
  ["moto/Seat", [0.006, 0.006, 0.007], 0.78, 0, 0, 0],
  ["moto/Rim", [0.007, 0.007, 0.009], 0.35, 0.75, 0, 0],
  ["moto/Disc", [0.26, 0.27, 0.28], 0.38, 1, 0, 0],
  ["moto/Glass", [0.002, 0.003, 0.004], 0.05, 0.2, 0, 5],
  ["moto/HeadLight", [0.57, 0.6, 0.65], 0.12, 0.9, 0, 1],
  ["moto/TailLight", [0.04, 0.001, 0.001], 0.2, 0, 0, 2],
  ["moto/Plate", [0.8, 0.8, 0.78], 0.5, 0, 0, 0],
  ["moto/Jacket", [0.007, 0.007, 0.009], 0.6, 0.05, 0, 0],
  ["moto/Trousers", [0.012, 0.012, 0.014], 0.7, 0.02, 0, 0],
  ["moto/Glove", [0.006, 0.006, 0.006], 0.65, 0, 0, 0],
  ["moto/Boot", [0.005, 0.005, 0.005], 0.5, 0, 0, 0],
  ["moto/Helmet", [0.8, 0.8, 0.79], 0.25, 0.1, 1, 0],
  ["moto/Visor", [0.0015, 0.002, 0.0022], 0.04, 0.4, 0, 5],
  // ---- the scooter (tools/blender/scooter.py)
  ["scooter/Paint", [0.36, 0.55, 0.5], 0.28, 0.15, 1, 4],
  ["scooter/Frame", [0.02, 0.021, 0.023], 0.5, 0.5, 0, 0],
  ["scooter/Metal", [0.36, 0.37, 0.38], 0.32, 1, 0, 0],
  ["scooter/Engine", [0.11, 0.11, 0.11], 0.5, 0.8, 0, 0],
  ["scooter/Chrome", [0.7, 0.7, 0.71], 0.12, 1, 0, 0],
  ["scooter/Rubber", [0.008, 0.008, 0.008], 0.88, 0, 0, 0],
  ["scooter/Plastic", [0.012, 0.012, 0.013], 0.55, 0, 0, 0],
  ["scooter/Seat", [0.11, 0.065, 0.035], 0.62, 0, 0, 0],
  ["scooter/Rim", [0.42, 0.43, 0.44], 0.3, 1, 0, 0],
  ["scooter/Disc", [0.26, 0.27, 0.28], 0.38, 1, 0, 0],
  ["scooter/Glass", [0.002, 0.003, 0.004], 0.05, 0.2, 0, 5],
  ["scooter/HeadLight", [0.6, 0.62, 0.66], 0.1, 0.9, 0, 1],
  ["scooter/TailLight", [0.05, 0.002, 0.001], 0.2, 0, 0, 2],
  ["scooter/Plate", [0.8, 0.8, 0.78], 0.5, 0, 0, 0],
  ["scooter/Jacket", [0.035, 0.05, 0.085], 0.72, 0, 0, 0],
  ["scooter/Trousers", [0.03, 0.045, 0.09], 0.8, 0, 0, 0],
  ["scooter/Glove", [0.025, 0.014, 0.008], 0.6, 0, 0, 0],
  ["scooter/Boot", [0.05, 0.03, 0.017], 0.6, 0, 0, 0],
  ["scooter/Skin", [0.5, 0.31, 0.22], 0.6, 0, 0, 0],
  ["scooter/Helmet", [0.7, 0.68, 0.62], 0.25, 0.05, 1, 0],
  ["scooter/Visor", [0.05, 0.05, 0.05], 0.05, 0.3, 0, 5],
  // ---- the rideable Villo (tools/blender/villo_ride.py: the street kit's bike + the cyclist; the street kit's slot colours)
  ["villo/bike_frame", [0.46, 0.47, 0.48], 0.3, 0.7, 0, 0],
  ["villo/bike_black", [0.015, 0.015, 0.016], 0.72, 0, 0, 0],
  ["villo/bike_chrome", [0.6, 0.6, 0.6], 0.2, 1, 0, 0],
  ["villo/reflector", [0.75, 0.2, 0.01], 0.3, 0, 0, 3],
  ["villo/villo_ochre", [0.66, 0.38, 0.012], 0.45, 0, 0, 0],
  ["villo/Jacket", [0.09, 0.1, 0.06], 0.75, 0, 0, 0],
  ["villo/Trousers", [0.03, 0.05, 0.11], 0.8, 0, 0, 0],
  ["villo/Boot", [0.6, 0.6, 0.58], 0.7, 0, 0, 0],
  ["villo/Skin", [0.5, 0.31, 0.22], 0.6, 0, 0, 0],
  ["villo/Helmet", [0.1, 0.25, 0.45], 0.35, 0.05, 1, 0],
  ["villo/Plastic", [0.01, 0.01, 0.011], 0.55, 0, 0, 0],
  ["villo/Rubber", [0.01, 0.01, 0.01], 0.85, 0, 0, 0],
];
export const SLOT_INDEX = Object.fromEntries(SLOT_TABLE.map((s, i) => [s[0], i]));
/** "_slot" value of a vertex: slot index + 0.01 + 0.97 x AO (0..1); unpackSlot(v) -> [index, ao] */
export const packSlot = (i, ao) => i + 0.01 + 0.97 * Math.min(1, Math.max(0, ao));
export const unpackSlot = (v) => { const i = Math.floor(v + 0.002); return [i, Math.min(1, Math.max(0, (v - i - 0.01) / 0.97))]; };

/** the kinds: files, rig nodes, how the city draws them */
export const KINDS = {
  moto: { dir: "moto", nodes: ["Body", "Steer", "Wheel_F", "Wheel_R", "RiderLegs", "RiderTorso", "ArmU_L", "ArmU_R", "ArmF_L", "ArmF_R"],
    torsoRest: 0.05, parkLean: 0.13, parkSteer: 0.42 },
  scooter: { dir: "scooter", nodes: ["Body", "Steer", "Wheel_F", "Wheel_R", "RiderLegs", "RiderTorso", "ArmU_L", "ArmU_R", "ArmF_L", "ArmF_R"],
    torsoRest: 0.0, parkLean: 0, parkSteer: 0 },          // (on its centre stand)
  villo: { dir: "villo", nodes: ["Body", "Steer", "Wheel_F", "Wheel_R", "Cranks", "Pedal_L", "Pedal_R", "RiderTorso", "Thigh_L", "Thigh_R", "Shin_L", "Shin_R", "ArmU_L", "ArmU_R", "ArmF_L", "ArmF_R"],
    torsoRest: 0.0, parkLean: 0, parkSteer: 0 },
};

/** paints for the city's two-wheelers (sRGB hex): black, greys, white, some red / blue; scooters also pastel and cream */
export const CITY_PAINTS = {
  moto: [0x101113, 0x101113, 0x1a1c1f, 0x34383d, 0x8f959c, 0xe6e6e2, 0x8c0a0c, 0x1a3f8f, 0x6f9a12, 0xd0560c],
  scooter: [0x8fc0b4, 0xe9e2cf, 0xe6e6e2, 0x101113, 0x6d0f12, 0x9fb9d4, 0x34383d, 0xc9b78f, 0x2e5a8a, 0xb3c99a],
};
