// THE BIKE'S FEEL PRESETS (bike lab 2, round 2, 2026-11-28): the lab's switch "feel: new / old" (?feel=old). The physics
// defaults (viewer/bike/bikePhysics.js BIKE) stay the old feel - the city, the tests and the other labs keep it; the lab
// applies "new" over them:
//   - a higher bunny hop (owner: "the jump is too low"): hold Space to crouch (charge), release to pop; a full charge
//     lifts the wheels ~55 cm (a real kid 30-50 cm; a bit more for the game), a tap ~25 cm
//   - THE BMX SKID DRIFT: the rear brake (S / Down) held while steering locks the rear at once, the tail slides out, the
//     bike power-slides round keeping its speed; looser on dirt / gravel (the drift pad), tighter on asphalt
//   - steering a touch quicker, the lean quicker, a softer landing (the legs absorb more)
// ROUND 3 (2026-11-28, BIKE_FLOW: its keys go to that object, the rest to BIKE):
//   - LANDINGS: a clean landing on a down slope keeps its speed and gains transGain x slope; a flat one from flatH loses
//     flatLoss and wobbles; nose-heavy (noseBail 0.85 rad, 49 deg) or very sideways (yawBail 0.75) bails
//   - PUMPING: C held on the back side of a roller / bump pushes the bike down it (pumpPush), held on the face it costs
//     (pumpFace): press on the back sides, let go on the faces; a short Space tap on a back slope is still a pump
//   - THE DRIFT: in a skid the steer asks a slide angle (driftAngle at full lock: a tap a small slide, held the full one), let go
//     and the bike straightens; a clean exit after driftMinT of sliding gives driftBoost
//   - THE HOP on ramps: a charged release (preload > chargedPop) pops on a back slope too (not a pump)
import { BIKE, BIKE_FLOW } from "./bikePhysics.js";

export const FEEL = {
  new: {
    popVel: 1.75, popPreload: 1.85, preloadTime: 0.24, popPitch: 1.6,
    skidSteerLock: 1, skidLat: 0.32, skidLoose: 0.45, skidBrake: 0.4, slideOut: 1.5, skidYaw: 2.1, skidCarry: 1.6,
    yawResponse: 15, leanRate: 9, absorb: 1.9,
    // round 3 (BIKE)
    noseBail: 0.85, yawBail: 0.75,
    // round 3 (BIKE_FLOW)
    transGain: 2.0, flatLoss: 0.12, flatH: 0.5, flatWobble: 0.45, chargedPop: 0.35,
    pumpPush: 7, pumpFace: 0.35, pumpVmax: 9,
    driftAngle: 0.8, driftLean: 0, driftBoost: 1.3, driftMinT: 0.45,
  },
};
const isFlow = (k) => k in BIKE_FLOW;
const OLD = Object.fromEntries(Object.keys(FEEL.new).map((k) => [k, isFlow(k) ? BIKE_FLOW[k] : BIKE[k]]));
FEEL.old = OLD;
/** set the feel on the constants objects (BIKE and BIKE_FLOW by default): "new" | "old" */
export function applyFeel(name = "new", B = BIKE, F = BIKE_FLOW) {
  for (const src of [OLD, FEEL[name] || {}]) for (const [k, v] of Object.entries(src)) (isFlow(k) ? F : B)[k] = v;
  return B;
}
