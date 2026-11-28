// THE BIKE'S EMPTIES the rider reaches for (claude/kid). One list of names shared by the lab's placeholder bike
// (viewer/bike/bikeModel.js) and the BMX asset (models/bike/bmx.glb, branch claude/bmx: Blender empties exported as
// glTF nodes with the same names):
//   grip_L / grip_R      the hands (centre of each grip; they turn with the bars)
//   pedal_L / pedal_R    the feet (the pedal's centre on its axle; they turn with the cranks)
//   seat                 the top of the saddle (the hips sit on / over it)
//   bb                   the crank axle (the legs' reach is fitted to its circle)
//   peg_FL / FR / RL / RR  the pegs (stand on them: later)
//   frame                the bike's CoM frame (heading + lean + pitch, NOT moved by the rider's legs): the rider's body
//                        hangs in it. +x = the bike's left, +y up, +z forward.
//
// HOOK FOR THE BMX (when claude/bmx lands): load models/bike/bmx.glb, put its scene under the placeholder's bike group
// (createBikeModel's bikeG / frontG / crank: the frame under bikeG, the fork + bars under frontG, the cranks under crank),
// hide the placeholder meshes, then   findBikeEmpties(bmxScene, placeholder.empties.frame)   gives the rider the BMX's own
// empties. Nothing else in the rider changes (viewer/kid/riderIK.js reads only these).
export const EMPTY_NAMES = ["grip_L", "grip_R", "pedal_L", "pedal_R", "seat", "bb", "peg_FL", "peg_FR", "peg_RL", "peg_RR"];
export const RIDER_NEEDS = ["grip_L", "grip_R", "pedal_L", "pedal_R", "seat", "bb", "frame"];

/** the empties under obj by name (+ the frame); throws if one the rider needs is missing */
export function findBikeEmpties(obj, frame) {
  const out = { frame };
  for (const n of EMPTY_NAMES) { const o = obj.getObjectByName(n); if (o) out[n] = o; }
  const miss = RIDER_NEEDS.filter((n) => !out[n]);
  if (miss.length) throw new Error(`bike: missing empties ${miss.join(", ")}`);
  return out;
}
