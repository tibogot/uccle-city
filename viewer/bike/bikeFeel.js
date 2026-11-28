// THE BIKE'S FEEL PRESETS (bike lab 2, round 2, 2026-11-28): the lab's switch "feel: new / old" (?feel=old). The physics
// defaults (viewer/bike/bikePhysics.js BIKE) stay the old feel - the city, the tests and the other labs keep it; the lab
// applies "new" over them:
//   - a higher bunny hop (owner: "the jump is too low"): hold Space to crouch (charge), release to pop; a full charge
//     lifts the wheels ~55 cm (a real kid 30-50 cm; a bit more for the game), a tap ~25 cm
//   - THE BMX SKID DRIFT: the rear brake (S / Down) held while steering locks the rear at once, the tail slides out, the
//     bike power-slides round keeping its speed; looser on dirt / gravel (the drift pad), tighter on asphalt
//   - steering a touch quicker, the lean quicker, a softer landing (the legs absorb more)
import { BIKE } from "./bikePhysics.js";

export const FEEL = {
  new: {
    popVel: 1.75, popPreload: 1.85, preloadTime: 0.24, popPitch: 1.6,
    skidSteerLock: 1, skidLat: 0.32, skidLoose: 0.45, skidBrake: 0.4, slideOut: 1.5, skidYaw: 2.1, skidCarry: 1.6,
    yawResponse: 15, leanRate: 9, absorb: 1.9,
  },
};
const OLD = Object.fromEntries(Object.keys(FEEL.new).map((k) => [k, BIKE[k]]));
FEEL.old = OLD;
/** set the feel on a constants object (BIKE by default): "new" | "old" */
export function applyFeel(name = "new", B = BIKE) { Object.assign(B, OLD, FEEL[name] || {}); return B; }
