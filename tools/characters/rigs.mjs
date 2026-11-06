// THE ONE HUMANOID SKELETON: the Mixamo layout is the interchange. Every rig the project reads or writes maps its
// bones onto these canonical names; a clip goes source rig -> canonical -> target rig (tools/characters/retarget.mjs).
//
// Per canonical bone: `child` = the canonical (or rig-specific, see `ends`) bone whose direction defines the bone's
// axis, `frame` = how its semantic frame is built (labs: "up" = world up + the body's left, "dir" = towards the child
// + a hint axis, "fwd" = the body's forward, levelled, + up: feet, so a flat foot in the reference pose stays flat).
export const CANON = {
  Hips: { frame: "up" },
  Spine: { child: "Spine1", frame: "dir", hint: "left" }, Spine1: { child: "Spine2", frame: "dir", hint: "left" }, Spine2: { child: "Neck", frame: "dir", hint: "left" },
  Neck: { child: "Head", frame: "dir", hint: "left" }, Head: { frame: "up" },
  LeftShoulder: { child: "LeftArm", frame: "dir", hint: "up" }, LeftArm: { child: "LeftForeArm", frame: "dir", hint: "fwd" },
  LeftForeArm: { child: "LeftHand", frame: "dir", hint: "fwd" }, LeftHand: { child: "LeftHandEnd", frame: "dir", hint: "fwd" },
  RightShoulder: { child: "RightArm", frame: "dir", hint: "up" }, RightArm: { child: "RightForeArm", frame: "dir", hint: "fwd" },
  RightForeArm: { child: "RightHand", frame: "dir", hint: "fwd" }, RightHand: { child: "RightHandEnd", frame: "dir", hint: "fwd" },
  LeftUpLeg: { child: "LeftLeg", frame: "dir", hint: "fwd" }, LeftLeg: { child: "LeftFoot", frame: "dir", hint: "fwd" }, LeftFoot: { frame: "fwd" },
  RightUpLeg: { child: "RightLeg", frame: "dir", hint: "fwd" }, RightLeg: { child: "RightFoot", frame: "dir", hint: "fwd" }, RightFoot: { frame: "fwd" },
};

/**
 * Rig maps: canonical name -> the rig's node name. `ends`: helper points (a hand's direction, a foot's toe), `feetIK`:
 * the feet are IK-style bones under the root (positioned, not rotated by the leg chain), `extra`: rig bones between
 * mapped ones that keep their rest rotation. `strip`: a name prefix to drop (Mixamo's "mixamorig:", "mixamorig1:").
 */
export const RIGS = {
  // Quaternius "Ultimate Modular Men" (our character: Hoodie, Casual). Body is the pelvis (it carries the legs);
  // Hips / Abdomen / Torso / Chest the spine.
  quaternius: {
    map: {
      Hips: "Body", Spine: "Abdomen", Spine1: "Torso", Spine2: "Chest", Neck: "Neck", Head: "Head",
      LeftShoulder: "Shoulder.L", LeftArm: "UpperArm.L", LeftForeArm: "LowerArm.L", LeftHand: "Wrist.L",
      RightShoulder: "Shoulder.R", RightArm: "UpperArm.R", RightForeArm: "LowerArm.R", RightHand: "Wrist.R",
      LeftUpLeg: "UpperLeg.L", LeftLeg: "LowerLeg.L", LeftFoot: "Foot.L", RightUpLeg: "UpperLeg.R", RightLeg: "LowerLeg.R", RightFoot: "Foot.R",
    },
    ends: { LeftHandEnd: "Middle1.L", RightHandEnd: "Middle1.R", LeftAnkle: "LowerLeg.L_end", RightAnkle: "LowerLeg.R_end", LeftToe: "Foot.L_end", RightToe: "Foot.R_end" },
    feetIK: true, extra: ["Hips"],
  },
  // Quaternius Universal Animation Library 1 / 2 (CC0, Unreal mannequin layout)
  ual: {
    map: {
      Hips: "pelvis", Spine: "spine_01", Spine1: "spine_02", Spine2: "spine_03", Neck: "neck_01", Head: "Head",
      LeftShoulder: "clavicle_l", LeftArm: "upperarm_l", LeftForeArm: "lowerarm_l", LeftHand: "hand_l",
      RightShoulder: "clavicle_r", RightArm: "upperarm_r", RightForeArm: "lowerarm_r", RightHand: "hand_r",
      LeftUpLeg: "thigh_l", LeftLeg: "calf_l", LeftFoot: "foot_l", RightUpLeg: "thigh_r", RightLeg: "calf_r", RightFoot: "foot_r",
    },
    ends: { LeftHandEnd: "middle_01_l", RightHandEnd: "middle_01_r", LeftAnkle: "foot_l", RightAnkle: "foot_r", LeftToe: "ball_l", RightToe: "ball_r" },
  },
  // Mixamo (FBX "Without Skin", converted to GLB by tools/blender/fbx2glb.py): the canonical names themselves
  mixamo: {
    strip: /^mixamorig\d*[:_]/,
    map: Object.fromEntries(["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
      "RightShoulder", "RightArm", "RightForeArm", "RightHand", "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"].map((n) => [n, n])),
    ends: { LeftHandEnd: "LeftHandMiddle1", RightHandEnd: "RightHandMiddle1", LeftAnkle: "LeftFoot", RightAnkle: "RightFoot", LeftToe: "LeftToeBase", RightToe: "RightToeBase" },
  },
};

/** Resolve a rig's names against a loaded GLB: canonical / end name -> node index (Mixamo prefixes stripped). */
export function bindRig(g, rigName) {
  const rig = RIGS[rigName];
  const idx = new Map();
  for (const n of g.nodes) {
    const nm = rig.strip ? n.name.replace(rig.strip, "") : n.name;
    if (!idx.has(nm)) idx.set(nm, n.i);
  }
  const out = {}, missing = [];
  for (const [c, nm] of Object.entries({ ...rig.map, ...rig.ends })) { if (idx.has(nm)) out[c] = idx.get(nm); else missing.push(`${c}=${nm}`); }
  if (missing.length) throw new Error(`${rigName}: bones not found in ${g.file}: ${missing.join(", ")}`);
  return { rig, rigName, bone: out };
}
