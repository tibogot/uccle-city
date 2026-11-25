// THE KID'S BMX: a fixed-step (120 Hz), deterministic, pure-JS bike + rider (no three.js: node-testable).
// The model and why: docs/BIKE.md. In short, an ARCADE LEAN-TARGET model on a small RIGID BODY:
//   - plan view: heading + world horizontal velocity (vx, vz). The steering input sets a LEAN TARGET (limited by speed
//     and by the tyre grip of the surface); the lean follows with a lag; the yaw rate is the coordinated turn
//     g tan(lean) / v at speed and a kinematic handlebar turn at walking pace (the two blended). The tyres remove the
//     sideways slip within a friction circle (grip budget shared with braking / pedalling): over it the bike drifts,
//     a locked rear (skid) steps the tail out, a sliding front = a crash.
//   - side view: the bike + rider as ONE rigid body (CoM height y, pitch, pitch rate) on two wheel contacts; each
//     contact is a spring-damper (tyre + the rider's legs) acting along the ground's normal, with a bottom-out limit.
//     Slope gravity, ramp launches, wheelies / manuals (the balance point is the geometry: the CoM over the rear
//     contact), stoppies / endos (the front brake's force under the CoM), landings and pumping all come out of it.
//     The rider's legs move the spring's rest point (crouch = preload / absorb, extend = pump).
//   - hop: hold to crouch (preload 0..1), release to pop (an upward impulse + a nose-up kick, front first).
//   - air: the velocity is ballistic; pitch (lean input) and yaw (steer) are the rider's, damped, with a small assist
//     toward the flight path; landing judged by the angle to the ground, the impact speed, the sideways angle and the
//     trick still held, in THREE BANDS: clean / sketchy (a wobble, speed lost, the kid saves it) / bail (a crash).
//   - forgiveness (feel round 1): the input is read per step (bikeInput.js), a coyote hop, a HOP BUFFER before a
//     kerb face (an early release is held to the right moment), a KERB CATCH (a wheel just short of a kerb's top is
//     lifted on).
//   - steps (a kerb face) in the ground: a wheel that meets a face higher than it can roll over is BLOCKED (front: the
//     bike stops or the kid goes over the bars; rear: a bonk, it climbs and loses speed). A hop clears it.
//   - colliders (walls, posts, cars): an oriented box at bike scale against the city's collider sets (bikeEnv.js);
//     a hard hit is a crash, a glancing one slides along.
//   - pushing: on a climb too steep to pedal, the kid gets off and walks the bike up.
// Units: m, s, per unit mass (forces are accelerations). Heading as the car: forward = (sin h, cos h) in x / z,
// left = (cos h, -sin h), h grows turning left; lean > 0 = leaning left; pitch > 0 = nose up.

import { edgeCell, segNearest, EDGE } from "./bikeEdges.js";

export const DT = 1 / 120;

/** surface ids returned by the ground query */
export const SURF = { asphalt: 0, setts: 1, dirt: 2, grass: 3, sand: 4, roots: 5 };
/** per surface: grip (friction coefficient), roll (rolling resistance coefficient, x g), sink (extra drag per m/s in
 *  soft ground, 1/s), buzz (vibration for the camera / telemetry: m of small bumps). Panel-tunable. */
export const SURFACES = [
  { name: "asphalt", grip: 0.95, roll: 0.010, sink: 0.00, buzz: 0.002 },
  { name: "setts", grip: 0.72, roll: 0.024, sink: 0.00, buzz: 0.014 },
  { name: "dirt", grip: 0.70, roll: 0.018, sink: 0.00, buzz: 0.008 },
  { name: "grass", grip: 0.55, roll: 0.060, sink: 0.06, buzz: 0.010 },
  { name: "sand", grip: 0.42, roll: 0.120, sink: 0.25, buzz: 0.003 },
  { name: "roots", grip: 0.50, roll: 0.045, sink: 0.03, buzz: 0.022 },
];

/** Everything tunable (panel sliders: BIKE_RANGES). A kid of ~11 (40 kg) on a 20" BMX (11 kg), one gear 44/16. */
export const BIKE = {
  gravity: 9.81,
  mass: 51,             // kg, kid + bike (power -> force)
  wheelbase: 0.95,      // m
  cgHeight: 0.95,       // m, the CoM over the contact line (seated / standing)
  wheelR: 0.254,        // m (20")
  pitchInertia: 0.30,   // m^2, I / m about the CoM (the rider dominates)
  // contacts: tyre + legs, per wheel, per unit mass
  springK: 170,         // 1/s^2 (static sag ~2.9 cm per wheel)
  springC: 8,           // 1/s
  maxComp: 0.11,        // m, bottom-out (beyond: a hard constraint)
  fnMax: 80,            // m/s^2 per wheel, cap of one contact's push (a step's spike)
  legRange: 0.12,       // m, crouch / extend range of the legs
  legRate: 9,           // 1/s, how fast the legs follow
  pumpGain: 45,         // 1/s, forward push per (extension speed x back slope), per wheel
  // pedalling (one gear: 44/16 on 20" = 4.39 m per crank turn)
  powerCruise: 130,     // W, a kid riding along
  powerSprint: 320,     // W, standing on the pedals (Shift)
  forceCruise: 1.6,     // m/s^2, the push at a standstill, seated (~330 N mean on the pedal: 4.2 x the wheel's)
  forceSprint: 2.4,     // m/s^2, standing on the pedals (~520 N)
  rollout: 4.39,        // m per crank turn
  cadenceMax: 128,      // rpm, spinning out (no more push above ~34 km/h)
  drag: 0.0055,         // 1/m, air (CdA 0.47 m^2 upright: rho CdA / 2m)
  // brakes (the lever's most; also limited by each tyre's grip)
  brakeFront: 5.2,      // m/s^2
  brakeRear: 4.6,       // m/s^2
  skidAt: 0.85,         // rear lever over this locks the rear (a skid, on purpose)
  skidMu: 0.75,         // sliding grip / static grip
  grip: 1.0,            // x every surface's grip
  // steering / lean
  maxLean: 0.65,        // rad (37 deg)
  leanRate: 7,          // 1/s
  leanV0: 1.2, leanV1: 5.0,   // m/s: no lean below v0, full lean above v1
  lowSteer: 0.75,       // rad of handlebar at walking pace
  barV0: 1.5, barV1: 4.5,     // m/s: handlebar steering blends into lean steering
  yawResponse: 12,      // 1/s
  tyreRate: 25,         // 1/s, how fast the tyres take out a sideways slip (within grip)
  skidYaw: 1.6,         // rad/s of tail-out per steer in a skid
  washSlip: 2.0,        // m/s sideways (not skidding) for washTime = the front washes out (forgiving falls: 1.6 / 0.3 s ->
  washTime: 0.45,       // 2.0 m/s / 0.45 s: a real slide, not a touch-down's scrub)
  // rider pitch
  riderPitch: 24,       // rad/s^2, pulling back / leaning forward on the ground (lifts the front at rest)
  pitchDamp: 1.6,       // 1/s on the ground
  manualAssist: 0.8,    // 0..1, a helper holding the manual near manualAngle (kid-friendly)
  manualAngle: 0.30,    // rad
  airPitch: 8,          // rad/s^2
  airPitchDamp: 1.8,    // 1/s
  airLevel: 8,          // 1/s^2, assist: pitch toward the slope of the ground ahead (forgiving falls: 4 -> 8)
  airLevelDamp: 4,      // 1/s: with no lean input the level assist is critically damped (no overshoot into a nose-down landing)
  airAlign: 7,          // 1/s^2, assist: the heading toward the flight path when the kid is not spinning (forgiving falls)
  airYaw: 9,            // rad/s^2 (a 180 in a good jump)
  airYawDamp: 2.2,      // 1/s
  // hop
  popVel: 1.35,         // m/s up at no preload
  popPreload: 1.8,      // m/s more at full preload (a full hop: wheels ~40 cm up)
  preloadTime: 0.28,    // s to full preload
  popPitch: 1.2,        // rad/s nose-up kick (front wheel first)
  coyote: 0.08,         // s after leaving the ground a pop still counts
  hopLead: 0.22,        // s: the best moment to pop before a kerb face (front axle to the face / speed)
  hopBuffer: 0.26,      // s: a release up to this much before hopLead (a face ahead) is held and pops at hopLead
  kerbCatch: 0.045,     // m: an AIRBORNE wheel short of a kerb top by up to this much more than stepRoll is lifted on
  kerbCatchLoss: 0.04,  // fraction of speed lost by a caught wheel
  // steps
  stepRoll: 0.07,       // m, a face the front wheel rolls over (a lowered kerb)
  faceSlope: 1.6,       // rise / run over 2 cm that counts as a face (a ramp is never this steep)
  faceCrash: 4.5,       // m/s: the front wheel square into a face it cannot climb (> stepClimb) faster than this = over the bars
  stepClimb: 0.19,      // m (forgiving falls): a face up to this the front wheel ROLLS UP when rolling faster than climbV
  climbV: 1.6,          // m/s
  climbLoss: 0.10,      // fraction of speed lost climbing a stepClimb face (less for lower)
  climbAngle: 1.05,     // rad (60 deg): a face met within this of square is climbed; more oblique = a glance along it
  rearClimb: 0.25,      // m, a face the rear bonks up (higher: it stops)
  rearBonk: 0.10,       // fraction of speed lost by a rear bonk at rearClimb (forgiving falls: 0.45 -> 0.10)
  // landing / crash rules: THREE BANDS (feel round 1): clean / SKETCHY (over the first number: a wobble, speed lost,
  // the kid stays on) / BAIL (over the second: a crash)
  // (forgiving falls, 2026-11-25: the bail limits where a kid really falls - nose down 55 deg, sideways 46 deg - and the
  // nose limit lowered by a hard impact: a 2 m drop onto the front wheel is over the bars at 36 deg)
  noseSketchy: 0.35, noseBail: 0.96,     // rad nose-down vs the ground at touch-down (bail = over the bars)
  noseHard: 0.38,                        // rad off both nose limits at a hard impact (vn 3 -> 7 m/s)
  tailSketchy: 0.55, tailBail: 1.05,     // rad nose-up (bail = looped out)
  leanSketchy: 0.35, leanBail: 0.85,     // rad of lean at touch-down
  yawSketchy: 0.35, yawBail: 0.80,       // rad between heading and velocity at touch-down (sideways)
  hardSketchy: 5.0, hardBail: 9.8,       // m/s into the ground (bail: a ~4.9 m flat drop)
  trickSketchy: 0.12, trickBail: 0.35,   // a trick still held at touch-down
  absorb: 1.4,          // m/s more with the legs crouched (hop held) at touch-down
  wobbleTime: 0.45,     // s of wobble after a sketchy landing (x 1..1.6 with the severity)
  wobbleGrip: 0.35,     // fraction of the side grip lost at the wobble's start
  wobbleLean: 0.14,     // rad, the lean / bar shake at the wobble's start
  sketchyLoss: 0.12,    // fraction of forward speed lost by a landing at the edge of bailing (more for worse)
  landLoss: 0.25,       // fraction of forward speed lost by a landing at hardLand into flat ground
  loopOut: 0.85,        // rad, manual past this = stepped off the back
  endo: 0.72,           // rad nose-down on the front wheel = over the bars (forgiving falls: 0.62 -> 0.72)
  autoSave: 1,          // 0..1: with no lean input the kid saves a looping wheelie / a nose-heavy front (forgiving falls)
  crashSpeed: 4.8,      // m/s into a wall (the speed INTO it) ...
  crashSquare: 0.6,     // ... and within acos(this) (53 deg) of square: a glance slides along (forgiving falls, rule 40)
  // pushing / feet
  pushGrade: 0.10,      // climbs steeper than this, crawling, = get off and push
  pushSpeed: 0.85,      // m/s: crawling
  pushDelay: 0.8,       // s of crawling before getting off
  walk: 1.3,            // m/s walking the bike
  footSpeed: 0.6,       // m/s: under this, no pedalling = a foot down
  footLean: 0.08,       // rad: the bike leans toward the foot put down (left) so it reaches the ground
  respawn: 2.2,         // s on the ground after a crash
  // grinds and stalls on the edge layer (feel round 2: bikeEdges.js; FEEL_RESEARCH.md section 2)
  snapReach: 0.45,      // m in plan from the bike's middle to the edge
  snapAbove: 0.30,      // m: the pegs (hubs) at most this far over the edge's top ...
  snapBelow: 0.05,      // m: ... or this far under it, FALLING (never while rising)
  snapAngle: 0.70,      // rad (40 deg): the velocity within this of the edge
  snapTime: 0.08,       // s: the pose blends onto the edge over this (no one-step teleport)
  pegR: 0.02,           // m, the pegs' radius over the top
  pegOut: 0.10,         // m, the pegs stick out of the hubs: on a grind the bike rides BESIDE the edge (wheels below its top)
  grindDecel: 0.9,      // m/s^2 on a ledge / wall / bench (stone, wood)
  grindDecelRail: 0.5,  // m/s^2 on a rail (steel)
  grindMinSpeed: 1.0,   // m/s: slower along the edge = a STALL (balanced, still)
  stallTime: 1.2,       // s a stall holds before the kid drops off (a hop leaves earlier)
  cornerExit: 0.785,    // rad (45 deg): a bend sharper than this = the grind leaves the edge, straight on
  cornerPop: 1.0,       // m/s up as the pegs leave a corner (clears the edge's next leg)
  grindAssist: 0.8,     // 0..1, the balance helper (kid-friendly: high)
  grindTip: 1.6,        // 1/s, how fast an unbalanced grind tips over (no assist)
  grindHold: 2.5,       // 1/s, the helper's pull back to balance (x grindAssist)
  grindSteer: 2.2,      // 1/s of balance per steer (lean against the fall)
  grindBump: 0.5,       // 1/s, the edge's unevenness pushing the balance (deterministic, along the distance)
  grindCrash: 7.0,      // m/s: falling off faster than this = a crash
};

/** the bike's box in plan (half width across the bars, half length) for the colliders */
export const BIKE_BODY = { hx: 0.32, hz: 0.74, height: 1.55 };

/** panel ranges: key -> [min, max, step, group] */
export const BIKE_RANGES = {
  mass: [30, 90, 1, "body"], wheelR: [0.2, 0.36, 0.005, "body"], wheelbase: [0.8, 1.2, 0.01, "body"], cgHeight: [0.6, 1.3, 0.01, "body"], pitchInertia: [0.1, 0.8, 0.01, "body"],
  springK: [60, 400, 5, "contacts"], springC: [2, 30, 0.5, "contacts"], maxComp: [0.04, 0.25, 0.01, "contacts"], fnMax: [20, 200, 5, "contacts"],
  legRange: [0, 0.3, 0.01, "contacts"], legRate: [2, 30, 0.5, "contacts"], pumpGain: [0, 120, 1, "contacts"],
  powerCruise: [40, 300, 5, "pedal"], powerSprint: [100, 700, 10, "pedal"], forceCruise: [1, 8, 0.1, "pedal"], forceSprint: [1, 10, 0.1, "pedal"],
  rollout: [3, 6, 0.01, "pedal"], cadenceMax: [80, 180, 1, "pedal"], drag: [0, 0.02, 0.0005, "pedal"],
  brakeFront: [1, 10, 0.1, "brakes"], brakeRear: [1, 10, 0.1, "brakes"], skidAt: [0.3, 1, 0.01, "brakes"], skidMu: [0.3, 1, 0.01, "brakes"], grip: [0.3, 1.5, 0.01, "brakes"],
  maxLean: [0.3, 1.0, 0.01, "steer"], leanRate: [1, 20, 0.5, "steer"], leanV0: [0, 4, 0.1, "steer"], leanV1: [1, 10, 0.1, "steer"],
  lowSteer: [0.2, 1.2, 0.01, "steer"], barV0: [0, 4, 0.1, "steer"], barV1: [1, 8, 0.1, "steer"], yawResponse: [2, 30, 0.5, "steer"],
  tyreRate: [5, 60, 1, "steer"], skidYaw: [0, 4, 0.1, "steer"], washSlip: [0.5, 4, 0.1, "steer"], washTime: [0.05, 1, 0.05, "steer"],
  riderPitch: [0, 30, 0.5, "pitch"], pitchDamp: [0, 8, 0.1, "pitch"], manualAssist: [0, 1, 0.05, "pitch"], manualAngle: [0.05, 0.6, 0.01, "pitch"],
  airPitch: [0, 20, 0.5, "air"], airPitchDamp: [0, 8, 0.1, "air"], airLevel: [0, 10, 0.1, "air"], airYaw: [0, 25, 0.5, "air"], airYawDamp: [0, 8, 0.1, "air"], airAlign: [0, 20, 0.5, "air"], airLevelDamp: [0, 12, 0.1, "air"],
  popVel: [0, 4, 0.05, "hop"], popPreload: [0, 4, 0.05, "hop"], preloadTime: [0.05, 1, 0.01, "hop"], popPitch: [0, 6, 0.1, "hop"], coyote: [0, 0.3, 0.01, "hop"],
  hopLead: [0.05, 0.4, 0.01, "hop"], hopBuffer: [0, 0.5, 0.01, "hop"], kerbCatch: [0, 0.1, 0.005, "hop"], kerbCatchLoss: [0, 0.3, 0.01, "hop"],
  stepRoll: [0, 0.2, 0.005, "steps"], faceSlope: [0.8, 5, 0.1, "steps"], faceCrash: [1, 10, 0.1, "steps"], rearClimb: [0.05, 0.5, 0.01, "steps"], rearBonk: [0, 1, 0.01, "steps"],
  stepClimb: [0, 0.3, 0.005, "steps"], climbV: [0, 5, 0.1, "steps"], climbLoss: [0, 0.6, 0.01, "steps"], climbAngle: [0, 1.5, 0.01, "steps"],
  noseSketchy: [0.05, 1.2, 0.01, "landing"], noseBail: [0.1, 1.4, 0.01, "landing"], tailSketchy: [0.05, 1.4, 0.01, "landing"], tailBail: [0.2, 1.4, 0.01, "landing"],
  leanSketchy: [0.05, 1.2, 0.01, "landing"], leanBail: [0.1, 1.4, 0.01, "landing"], yawSketchy: [0.05, 1.5, 0.01, "landing"], yawBail: [0.1, 1.6, 0.01, "landing"],
  hardSketchy: [2, 15, 0.1, "landing"], hardBail: [3, 20, 0.1, "landing"], trickSketchy: [0, 1, 0.01, "landing"], trickBail: [0, 1, 0.01, "landing"],
  absorb: [0, 4, 0.1, "landing"], landLoss: [0, 1, 0.01, "landing"], loopOut: [0.4, 1.4, 0.01, "landing"], endo: [0.2, 1.2, 0.01, "landing"], crashSpeed: [1, 12, 0.1, "landing"],
  noseHard: [0, 0.8, 0.01, "landing"], autoSave: [0, 1, 0.05, "landing"], crashSquare: [0, 1, 0.01, "landing"],
  wobbleTime: [0, 1.5, 0.05, "landing"], wobbleGrip: [0, 0.9, 0.01, "landing"], wobbleLean: [0, 0.4, 0.01, "landing"], sketchyLoss: [0, 0.5, 0.01, "landing"],
  pushGrade: [0.03, 0.3, 0.005, "push"], pushSpeed: [0.2, 2, 0.05, "push"], pushDelay: [0.1, 3, 0.1, "push"], walk: [0.5, 2.5, 0.05, "push"],
  footSpeed: [0.1, 1.5, 0.05, "push"], footLean: [0, 0.3, 0.01, "push"], respawn: [0.5, 6, 0.1, "push"],
  snapReach: [0.1, 1, 0.01, "grind"], snapAbove: [0.05, 0.6, 0.01, "grind"], snapBelow: [0, 0.3, 0.01, "grind"], snapAngle: [0.2, 1.2, 0.01, "grind"],
  snapTime: [0.02, 0.3, 0.01, "grind"], pegR: [0, 0.05, 0.005, "grind"], pegOut: [0, 0.3, 0.01, "grind"], grindDecel: [0, 5, 0.1, "grind"], grindDecelRail: [0, 5, 0.1, "grind"],
  grindMinSpeed: [0.2, 3, 0.05, "grind"], stallTime: [0.2, 4, 0.1, "grind"], cornerExit: [0.2, 1.5, 0.01, "grind"], cornerPop: [0, 3, 0.05, "grind"], grindAssist: [0, 1, 0.05, "grind"],
  grindTip: [0, 5, 0.1, "grind"], grindHold: [0, 8, 0.1, "grind"], grindSteer: [0, 6, 0.1, "grind"], grindBump: [0, 2, 0.05, "grind"], grindCrash: [2, 15, 0.1, "grind"],
};

/** sqrt(a^2 + b^2): not Math.hypot, which V8 does not inline: it boxes its result, an allocation a call (feel round 3) */
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** the CoM height over the ground at rest (both wheels on flat ground, legs neutral) */
export function restHeight(B = BIKE) { return B.cgHeight - B.gravity / 2 / B.springK; }

export function createBikeState(x, z, heading, groundY = 0, B = BIKE) {
  const s = {
    x, z, y: groundY + restHeight(B), heading,
    vx: 0, vz: 0, vy: 0, pitch: 0, pitchVel: 0, yawVel: 0,
    lean: 0, leanTarget: 0, steerAngle: 0, legs: 0, legVel: 0, legSpeed: 0,
    // per wheel: [front, rear]
    contact: [false, false], comp: [0, 0], wheelBot: [groundY, groundY], wheelPos: [x, z, x, z], ground: [0, 0], surf: [0, 0], slope: [0, 0], wheelY: [0, 0],
    spin: [0, 0],            // wheel rotation (rad), for the model
    crank: 0, cadence: 0, pedalling: 0, sprint: 0,
    preload: 0, hopHeld: false, hops: 0, pumps: 0, popT: 0, hopT: 9, sinceContact: 0,
    hopBuf: 0, hopBufD: 0, hopBufP: 0, buffered: 0, catches: 0, popStep: -1,
    wobble: 0, wobbleT: 0, wobbleDur: 0, wobbleNow: 0, wobbleW: 0, sketchy: 0, saveKind: 0, _catchT: 0, _bonkT: 0,
    grindSeg: -1, grindDir: 1, grindU: 0, grindV: 0, grindT: 0, grindBal: 0, grindStall: 0, grindCD: 0, grinds: 0, stalls: 0,
    grindType: -1, grindExit: "", grindExits: 0, grindDist: 0, grindSide: 1, _g0: [0, 0, 0, 0, 0], _go: [0, 0, 0, 0, 0],
    air: false, airT: 0, airMax: 0, lastLanding: null, landings: 0, spinArm: true, climbs: 0, glances: 0,
    skid: false, wheelspin: false, frontLock: false, slip: 0, slipAngle: 0, washT: 0, buzz: 0,
    manual: 0, pushing: false, pushT: 0, footDown: 1, grade: 0, walkPhase: 0, trick: 0,
    crashed: false, crashT: 0, crashCause: "", crashes: 0, rider: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
    blocked: 0, bonks: 0, hits: 0, lastHit: null, envContacts: 0,
    safe: { x, z, heading, t: 0 },
    yLow: groundY, t: 0, steps: 0, _prepX: NaN, _prepZ: NaN,
    prev: { x, y: groundY + restHeight(B), z, heading, lean: 0, pitch: 0 },
  };
  return s;
}

/** A ground query from a height function and a surface function (central differences for the normal). */
export function groundQuery(height, surface = () => SURF.asphalt, eps = 0.04) {
  // (the five samples from ONE call site in a loop: V8 inlines the height function once, not five times; and when the
  // height / surface functions carry an OBJECT form (.P(pt): reads pt.x, pt.z, writes pt.h / returns the surface id),
  // no double ever crosses a call: g.P(pt, out) is what the physics calls (groundAt) - feel round 4, the zero-garbage step)
  const H5 = new Float64Array(5), DX = [0, eps, -eps, 0, 0], DZ = [0, 0, 0, eps, -eps], HP = { x: 0.5, z: 0.5, h: 0.5 };
  const hP = height.P || null, sP = surface.P || null;
  const g = (x, z, out) => {
    if (hP) for (let k = 0; k < 5; k++) { HP.x = x + DX[k]; HP.z = z + DZ[k]; hP(HP); H5[k] = HP.h; }
    else for (let k = 0; k < 5; k++) H5[k] = height(x + DX[k], z + DZ[k]);
    const gx = (H5[1] - H5[2]) / (2 * eps), gz = (H5[3] - H5[4]) / (2 * eps), L = Math.sqrt(1 + gx * gx + gz * gz);
    out.h = H5[0]; out.nx = -gx / L; out.ny = 1 / L; out.nz = -gz / L;
    if (sP) { HP.x = x; HP.z = z; out.surf = sP(HP); } else out.surf = surface(x, z);
    return out;
  };
  g.P = (pt, out) => {
    const x = pt.x, z = pt.z;
    if (hP) for (let k = 0; k < 5; k++) { HP.x = x + DX[k]; HP.z = z + DZ[k]; hP(HP); H5[k] = HP.h; }
    else for (let k = 0; k < 5; k++) H5[k] = height(x + DX[k], z + DZ[k]);
    const gx = (H5[1] - H5[2]) / (2 * eps), gz = (H5[3] - H5[4]) / (2 * eps), L = Math.sqrt(1 + gx * gx + gz * gz);
    out.h = H5[0]; out.nx = -gx / L; out.ny = 1 / L; out.nz = -gz / L;
    if (sP) { HP.x = x; HP.z = z; out.surf = sP(HP); } else out.surf = surface(x, z);
    return out;
  };
  return g;
}

const Q = [{ h: 0, nx: 0, ny: 1, nz: 0, surf: 0 }, { h: 0, nx: 0, ny: 1, nz: 0, surf: 0 }];
const QN = [{ h: 0, nx: 0, ny: 1, nz: 0, surf: 0 }, { h: 0, nx: 0, ny: 1, nz: 0, surf: 0 }];
const QS = { h: 0, nx: 0, ny: 1, nz: 0, surf: 0 };
const RF = [0, 0], RU = [0, 0];

/** the wheel contact points (bottoms) relative to the CoM in the (forward, up) plane, into RF / RU: the hubs are fixed
 *  to the body (rotating with the pitch, moved by the legs), each contact is the wheel's radius straight under its hub */
const HU = [0, 0];
function wheelOffsets(s, B) {
  const ct = Math.cos(s.pitch), st = Math.sin(s.pitch), b = -(B.cgHeight - B.wheelR + s.legs * B.legRange);
  for (let i = 0; i < 2; i++) {
    const a = i === 0 ? B.wheelbase / 2 : -B.wheelbase / 2;
    RF[i] = a * ct - b * st; HU[i] = a * st + b * ct; RU[i] = HU[i] - B.wheelR;
  }
}

/** world positions of the two hubs and contact points: out = { f: [hx, hy, hz, cx, cy, cz], r: [...] } */
export function wheelPoints(s, B = BIKE, out = { f: [0, 0, 0, 0, 0, 0], r: [0, 0, 0, 0, 0, 0] }) {
  wheelOffsets(s, B);
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
  for (let i = 0; i < 2; i++) {
    const o = i === 0 ? out.f : out.r;
    o[0] = o[3] = s.x + fx * RF[i]; o[2] = o[5] = s.z + fz * RF[i]; o[1] = s.y + HU[i]; o[4] = s.y + RU[i];
  }
  return out;
}

/** the ground's slope along the heading from a normal (rise per metre forward), clamped */
function slopeOf(q, fx, fz) { return clamp(-(q.nx * fx + q.nz * fz) / Math.max(0.2, q.ny), -4.0, 4.0); }

/** (feel round 4, the zero-garbage step) the ground at (GP.x, GP.z) into out. The physics never calls env.ground with
 *  its doubles as arguments: a call V8 does not inline (stepBike calls the ground a dozen ways) boxes each of them; this
 *  small function is optimised on its own and inlines the ground query and its height function, and is called with
 *  objects only. Same for the face tests: their inputs in FP, their results in FP / FA. */
const GP = { x: 0.5, z: 0.5 };
function groundAt(env, out) { const gp = env.groundP; return gp ? gp(GP, out) : env.ground(GP.x, GP.z, out); }
const FP = { x: 0.5, z: 0.5, x1: 0.5, z1: 0.5, fx: 0.5, fz: 0.5, maxD: 0.5, r: 0.5 };

/** the steepest 2 cm rise of the ground from (FP.x, FP.z) to (FP.x1, FP.z1) (a face test) -> FP.r */
function faceRiseP(env, B) {
  const x0 = FP.x, z0 = FP.z, x1 = FP.x1, z1 = FP.z1;
  const d = hyp(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(d / 0.02));
  GP.x = x0; GP.z = z0;
  let prev = groundAt(env, QS).h, worst = 0;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    GP.x = x0 + (x1 - x0) * t; GP.z = z0 + (z1 - z0) * t;
    const h = groundAt(env, QS).h;
    const r = (h - prev) / Math.max(1e-4, d / n);
    if (r > worst) worst = r;
    prev = h;
  }
  FP.r = worst;
}


/** the first kerb face ahead along (fx, fz) within maxD of (x, z): a run of 2 cm rises steeper than faceSlope that
 *  climbs more than stepRoll. Fills FA { d: distance to the face's foot, top: its top height }; returns d or -1. */
const FA = { d: -1, top: 0 };
function faceAheadP(env, B) {
  const x = FP.x, z = FP.z, fx = FP.fx, fz = FP.fz, st = 0.02, n = Math.ceil(FP.maxD / st);
  GP.x = x; GP.z = z;
  let prev = groundAt(env, QS).h;
  FA.d = -1;
  for (let k = 1; k <= n; k++) {
    GP.x = x + fx * st * k; GP.z = z + fz * st * k;
    const h = groundAt(env, QS).h;
    if ((h - prev) / st > B.faceSlope) {
      // the face: climb it while it stays steep (10 cm at most)
      const base = prev; let top = h;
      for (let j = k + 1; j <= k + 5; j++) { GP.x = x + fx * st * j; GP.z = z + fz * st * j; const hj = groundAt(env, QS).h; if ((hj - top) / st > B.faceSlope) top = hj; else break; }
      if (top - base > B.stepRoll) { FA.d = st * (k - 1); FA.top = top; return; }
    }
    prev = h;
  }
}
// (call sites: set FP, call faceAheadP(env, B), read FA.d)

/** the slope a contact / a landing / a balance is judged against, from the wheel's own slope sl (over 6 cm):
 *  - gentle (|sl| < 0.6): sl;
 *  - steep and the ground over half a metre as steep the same way (>= 0.6 x): a smooth TRANSITION (a ramp's face, a
 *    quarter pipe, a bank): its slope, up to 76 deg;
 *  - steep but the half metre much gentler: a FACE (a kerb's edge): the ground over the half metre (a wheel at a kerb's
 *    lip is not "landing on a 45 deg slope", and its spring does not push back off the face: forgiving falls - every
 *    wheel on a kerb face was braked by the face's normal);
 *  - the half metre the other way: a crest (a kicker's lip with a drop behind): sl, within 45 deg (as before). */
/** (garbage-free: the inputs in JP { x, z, fx, fz, sl }, the result in JP.r; the ground called with objects only) */
const JP = { x: 0.5, z: 0.5, fx: 0.5, fz: 0.5, sl: 0.5, r: 0.5 };
function judgeSlopeP(env) {
  const sl = JP.sl;
  if (sl < 0.6 && sl > -0.6) { JP.r = sl; return; }
  GP.x = JP.x + JP.fx * 0.25; GP.z = JP.z + JP.fz * 0.25; const hA = groundAt(env, QS).h;
  GP.x = JP.x - JP.fx * 0.25; GP.z = JP.z - JP.fz * 0.25; const hB = groundAt(env, QS).h;
  const lg = (hA - hB) / 0.5, a = lg < 0 ? -lg : lg, b = sl < 0 ? -sl : sl;
  if (lg * sl <= 0) JP.r = sl > 1 ? 1 : sl < -1 ? -1 : sl;
  else if (a >= 0.6 * b) JP.r = lg > 4 ? 4 : lg < -4 ? -4 : lg;
  else JP.r = lg > 0.6 ? 0.6 : lg < -0.6 ? -0.6 : lg;
}

/** the pop (a hop): an upward impulse + a nose-up kick (front first) */
function pop(s, preload, B) {
  s.vy += B.popVel + B.popPreload * preload;
  s.pitchVel += B.popPitch * (0.5 + 0.5 * preload);
  s.hops++; s.hopT = 0; s.popStep = s.steps;
}

/** KERB CATCH: lift wheel i's bottom by `lift` m now (half the body, half the pitch about the CoM), never dropping */
/** (the lift through CL.lift: a double argument would be boxed: the zero-garbage step, feel round 4) */
const CL = { lift: 0.5, a: 0.5 };
function catchLift(s, i, B) {
  const lever = RF[i], lift = CL.lift;
  s.y += lift * 0.5; s.pitch = clamp(s.pitch + lift * 0.5 / lever, -1.45, 1.45);
  s.vy = Math.max(s.vy, 0);
  if (i === 0) s.pitchVel = Math.max(s.pitchVel, 0); else s.pitchVel = Math.min(s.pitchVel, 0);
}

/** a small wobble (a thump: a kerb rolled up, a glance off a face) - the landing's wobble, no landing */
function thump(s, B) { const a = CL.a; if (a > s.wobble * (s.wobbleT / Math.max(1e-6, s.wobbleDur || 1))) { s.wobble = Math.min(1, a); s.wobbleDur = B.wobbleTime; s.wobbleT = s.wobbleDur; } }

export function crash(s, cause) {
  if (s.crashed) return;
  s.crashed = true; s.crashT = 0; s.crashCause = cause; s.crashes++;
  s.preload = 0; s.trick = 0; s.pushing = false; s.hopBuf = 0; s.wobbleT = 0; s.wobble = 0; s.wobbleNow = 0;
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
  const over = /bars|kerb|front/.test(cause) ? 1.6 : 0.4;
  s.rider.x = s.x; s.rider.y = s.y + 0.35; s.rider.z = s.z;
  s.rider.vx = s.vx * 0.9 + fx * over; s.rider.vz = s.vz * 0.9 + fz * over; s.rider.vy = Math.max(s.vy, 0) + 1.2;
  s.crashDir = s.lean >= 0 ? 1 : -1;
}

/** Impact with a collider (n = out of the obstacle, the position already pushed). Returns the approach speed. */
export function bikeHit(s, nx, nz, kind, B = BIKE) {
  const vn = -(s.vx * nx + s.vz * nz);
  if (vn <= 0.02) return 0;
  // (forgiving falls: a crash needs the speed INTO it and a square hit, within acos(crashSquare) = 53 deg; a glance slides)
  if (vn > B.crashSpeed && vn > B.crashSquare * hyp(s.vx, s.vz) && !s.crashed) crash(s, kind === 2 || kind === 3 || kind === 4 ? "hit a post" : kind === 6 ? "hit a car" : "hit a wall");
  const e = vn > 1.5 ? 0.12 : 0;
  s.vx += nx * vn * (1 + e); s.vz += nz * vn * (1 + e);
  // the scrape along the wall
  const tx = -nz, tz = nx, vt = s.vx * tx + s.vz * tz, cut = Math.min(Math.abs(vt), 0.3 * vn);
  s.vx -= tx * cut * sgn(vt); s.vz -= tz * cut * sgn(vt);
  // turn the bike along the wall (the bars meet it)
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading), into = -(fx * nx + fz * nz);
  if (into > 0.2 && !s.crashed) s.yawVel += (fx * tz - fz * tx >= 0 ? -1 : 1) * Math.min(2, vn * 0.4) * (1 - into);
  s.hits++;
  if (vn > 1) s.lastHit = { x: s.x, z: s.z, nx, nz, speed: vn, kind, t: s.t };
  return vn;
}

function savePrev(s) { const p = s.prev; p.x = s.x; p.y = s.y; p.z = s.z; p.heading = s.heading; p.lean = s.lean; p.pitch = s.pitch; }

/**
 * Advance the bike ONE fixed step (DT).
 * input: { pedal 0..1, sprint bool, brakeF 0..1, brakeR 0..1, steer -1..1 (left +), lean -1..1 (rider: + back / nose up),
 *          hop bool (held: crouch, release: pop), pump 0..1 (extend the legs), trick bool }
 * env:   { ground(x, z, out) -> fills { h, nx, ny, nz, surf }, prepare?(s, r), collide?(s, B), insideSolid?(s) }
 */
export function stepBike(s, input, env, B = BIKE, S = SURFACES) {
  const dt = DT, g = B.gravity;
  s.t += dt; s.steps++;
  savePrev(s);
  if (!(s._prepX === s._prepX) || Math.abs(s.x - s._prepX) + Math.abs(s.z - s._prepZ) > 1) {
    env.prepare?.(s);              // (its reach from s itself: no double argument to box)
    s._prepX = s.x; s._prepZ = s.z;
  }
  if (s.crashed) { crashStep(s, env, B, S); return s; }
  // ON AN EDGE (a grind / a stall): its own step (feel round 2)
  if (s.grindSeg >= 0) { grindStep(s, input, env, B); return s; }
  s.grindCD -= DT;

  const pedal = clamp(input.pedal || 0, 0, 1), steer = clamp(input.steer || 0, -1, 1), leanIn = clamp(input.lean || 0, -1, 1);
  const bF = clamp(input.brakeF || 0, 0, 1), bR = clamp(input.brakeR || 0, 0, 1), pump = clamp(input.pump || 0, 0, 1);
  const hop = !!input.hop, trick = !!input.trick, sprint = !!input.sprint;
  let fx = Math.sin(s.heading), fz = Math.cos(s.heading);
  const lx = fz, lz = -fx;
  let vF = s.vx * fx + s.vz * fz, vL = s.vx * lx + s.vz * lz;
  const grounded = s.contact[0] || s.contact[1];
  s.sinceContact = grounded ? 0 : s.sinceContact + dt;

  // ---- the legs: crouch (hop held: preload / absorb a face), extend (on release, or pump held), neutral
  // (after a pop the kid pulls the bike up under him while rising: the wheels tuck)
  const legT = hop || s.hopBuf > 0 ? -1 : s.popT > 0 ? 1 : !grounded && s.hopT < 0.6 && s.vy > -1.5 ? -1 : pump > 0 ? pump : 0;
  s.hopT += dt; s._catchT = (s._catchT || 0) - dt; s._bonkT = (s._bonkT || 0) - dt;
  const nl = s.legs + (legT - s.legs) * (1 - Math.exp(-B.legRate * dt));
  s.legSpeed = (nl - s.legs) / dt;
  // crouching on the ground lowers the BODY (the wheels stay on the ground); extending pushes the ground (a force)
  if (grounded && nl < s.legs) { s.y += (nl - s.legs) * B.legRange * Math.cos(s.pitch); s.legVel = 0; }
  else s.legVel = s.legSpeed;
  s.legs = nl;
  // ---- hop: preload while crouched on the ground; on release the legs extend: a POP where the ground is flat or
  // rising (an upward impulse + the front first), a PUMP into a back slope (the extension pushes the bike down it)
  // (feel round 1) the release acts IN THIS STEP (the input is sampled per step: bikeInput.js sample()); a COYOTE pop
  // still counts just after leaving the ground; the HOP BUFFER: a release a little early with a kerb face coming is
  // held (the kid stays crouched) and pops at the best moment (hopLead before the face)
  if (hop && grounded && !s.pushing) s.preload = Math.min(1, s.preload + dt / B.preloadTime);
  if (hop && s.hopBuf > 0) s.hopBuf = 0;            // pressed again while held: preloading again (the preload kept)
  if (!hop && s.hopHeld) {
    if (s.sinceContact <= B.coyote && s.preload > 0.04 && !s.pushing) {
      const back = Math.min(s.slope[0], s.slope[1]) < -0.12 && grounded;
      if (back) { s.pumps++; s.popT = 0.18; }
      else {
        let wait = 0;
        if (grounded && vF > 0.5 && B.hopBuffer > 0) {
          const ox = s.x + fx * B.wheelbase / 2 * Math.cos(s.pitch), oz = s.z + fz * B.wheelbase / 2 * Math.cos(s.pitch);
          FP.x = ox; FP.z = oz; FP.fx = fx; FP.fz = fz; FP.maxD = vF * (B.hopLead + B.hopBuffer); faceAheadP(env, B);
          const d = FA.d;
          if (d >= 0) wait = d / vF - B.hopLead;
        }
        if (wait > dt * 0.5) { s.hopBuf = Math.min(wait, B.hopBuffer); s.hopBufP = s.preload; s.buffered++; }
        else pop(s, s.preload, B);
      }
    }
    if (!(s.hopBuf > 0)) s.preload = 0;
  }
  if (s.hopBuf > 0 && !hop) {
    s.hopBuf -= dt;
    if (s.hopBuf <= 1e-9) { s.hopBuf = 0; if (s.sinceContact <= B.coyote && !s.pushing) pop(s, s.hopBufP, B); s.preload = 0; }
  }
  if (!grounded && !hop && !(s.hopBuf > 0)) s.preload = 0;
  s.hopHeld = hop;
  s.popT = Math.max(0, s.popT - dt);
  // ---- trick (placeholder: a tabletop while held in the air)
  if (!grounded && trick) s.trick = Math.min(1, s.trick + dt * 3); else s.trick = Math.max(0, s.trick - dt * 4);

  // (feel round 4, the zero-garbage step: the rest of the step in four functions of their own. V8 inlines a function's
  // small helpers only up to a budget per optimised function; stepBike in one piece ran out, and every helper call past
  // it boxed its doubles: ~350 bytes of garbage a step. The step's shared values pass through W, one preallocated
  // scratch object; the phases are called with objects only)
  const w = W;
  w.vF = vF; w.vL = vL; w.fx = fx; w.fz = fz; w.lx = lx; w.lz = lz; w.steer = steer; w.pedal = pedal; w.leanIn = leanIn;
  w.bF = bF; w.bR = bR; w.sprint = sprint; w.grounded = grounded;
  if (facePhase(s, w, env, B)) return s;
  if (contactPhase(s, w, env, B, S)) return s;
  motionPhase(s, w, B);
  settlePhase(s, w, env, B, S);
  return s;
}

/** the step's shared values (doubles initialised as doubles: V8 keeps them unboxed in place) */
const W = { vF: 0.5, vL: 0.5, fx: 0.5, fz: 0.5, lx: 0.5, lz: 0.5, aF: 0.5, aY: 0.5, alpha: 0.5, retard: 0.5, brakes: 0.5, drive: 0.5, fnF: 0.5, fnR: 0.5, muF: 0.5, muR: 0.5,
  v: 0.5, steer: 0.5, pedal: 0.5, leanIn: 0.5, bF: 0.5, bR: 0.5, up: 0.5, contactNow: false, footHold: false, sprint: false, grounded: false, landCheck: false };

/** stepBike, part 1: the ground under the wheels and where they go (the face test: kerbs, the kerb catch, bonks).
 *  true = the step ended (a crash) */
function facePhase(s, w, env, B) {
  const dt = DT, g = B.gravity, fx = w.fx, fz = w.fz;
  let vF = w.vF, vL = w.vL;
  // ---- the ground under the wheels now, and where they go this step (face test)
  wheelOffsets(s, B);
  const dx = s.vx * dt, dz = s.vz * dt;
  for (let i = 0; i < 2; i++) {
    const wx = s.x + fx * RF[i], wz = s.z + fz * RF[i], wy = s.y + RU[i];
    GP.x = wx; GP.z = wz; groundAt(env, Q[i]);
    s.wheelY[i] = wy;
    GP.x = wx + dx; GP.z = wz + dz;
    const qn = groundAt(env, QN[i]);
    const rise = qn.h - Math.max(wy, Q[i].h);       // over the ground the wheel stands on (not its sag)
    const airborne = wy > Q[i].h + 0.003 && B.kerbCatch > 0;
    // KERB CATCH, ahead (feel round 1): an airborne wheel that will arrive a little short of a kerb's top (by up to
    // kerbCatch more than it rolls) gets the lift it lacks spread over the steps left (no snap)
    if (airborne && vF > 0.5 && wy - Q[i].h < 0.6 && !(s._catchT > 0)) {
      const look = Math.max(Math.abs(dx * fx + dz * fz) + 0.02, vF * 0.06);
      FP.x = wx; FP.z = wz; FP.fx = fx; FP.fz = fz; FP.maxD = look; faceAheadP(env, B);
      const d = FA.d;
      if (d >= 0 && d / vF > 3 * dt) {
        const tA = d / vF, vW = s.vy + s.pitchVel * RF[i];
        const miss = FA.top - (wy + vW * tA - 0.5 * g * tA * tA);
        if (miss > B.stepRoll * 0.6 && miss <= B.stepRoll + B.kerbCatch) {
          const dv = Math.min(1.2, (miss - B.stepRoll * 0.4) / tA);
          s.vy += dv * 0.5; s.pitchVel += dv * 0.5 / RF[i];
          const k = 1 - B.kerbCatchLoss; s.vx *= k; s.vz *= k; vF *= k; vL *= k;
          s.catches++; s._catchT = 0.25;
        }
      }
    }
    // (forgiving falls) a GROUNDED front wheel rolling at a face it can climb: the kid pulls the bars up a little before it
    // (spread over the steps left: no hitch); one cheap probe ahead first, the scan only when the ground rises there
    if (i === 0 && !airborne && vF > B.climbV && B.stepClimb > 0 && !(s._catchT > 0)) {
      const look = vF * 0.09 + 0.03;
      GP.x = wx + fx * look; GP.z = wz + fz * look;
      if (groundAt(env, QS).h - Q[0].h > B.stepRoll) {
        FP.x = wx; FP.z = wz; FP.fx = fx; FP.fz = fz; FP.maxD = look; faceAheadP(env, B);
        const up = FA.top - Q[0].h;
        if (FA.d >= 0 && up <= B.stepClimb && FA.d / vF > 2 * dt) {
          const tA = FA.d / vF, lift = up - B.stepRoll * 0.9, dv = Math.min(1.5, lift / tA + 0.5 * g * tA);
          s.pitchVel += dv * 0.75 / RF[0]; s.vy += dv * 0.25; s._catchT = 0.15; s.climbs++;
        }
      }
    }
    if (rise > B.stepRoll && (dx * fx + dz * fz) > 0 && (FP.x = wx, FP.z = wz, FP.x1 = wx + dx, FP.z1 = wz + dz, faceRiseP(env, B), FP.r > B.faceSlope)) {
      if (airborne && rise <= B.stepRoll + B.kerbCatch) {
        // KERB CATCH, now: the wheel met the face just short of its top: lifted only to where it ROLLS (0.9 x stepRoll
        // under the top: at most ~5 cm at once, no hitch), the tyre spring takes it the rest of the way (a small loss)
        CL.lift = rise - B.stepRoll * 0.9; catchLift(s, i, B);
        s.wheelBot[i] = qn.h - B.stepRoll * 0.9;
        if (!(s._catchT > 0)) { const k = 1 - B.kerbCatchLoss; s.vx *= k; s.vz *= k; vF *= k; vL *= k; s.catches++; }
        s._catchT = 0.25;
        wheelOffsets(s, B);
        continue;
      }
      if (i === 0) {
        // (forgiving falls) how square the face is met: its horizontal normal from the ground's slope straddling it
        const nh = hyp(qn.nx, qn.nz), sq = nh > 0.2 ? -(fx * qn.nx + fz * qn.nz) / nh : 1;
        if (rise <= B.stepClimb && vF > B.climbV && sq > Math.cos(B.climbAngle)) {
          // a face the front wheel ROLLS UP (a kerb ridden at speed): lifted to where it rolls (the spring takes the
          // rest, as the kerb catch), a thump: some speed lost, a small wobble. A hop over it stays the clean way.
          CL.lift = rise - B.stepRoll * 0.9; catchLift(s, 0, B);
          s.wheelBot[0] = qn.h - B.stepRoll * 0.9;
          const k = 1 - B.climbLoss * rise / B.stepClimb; s.vx *= k; s.vz *= k; vF *= k; vL *= k;
          s.climbs++; s._catchT = 0.25; CL.a = 0.2 + rise; thump(s, B);
          wheelOffsets(s, B);
          continue;
        }
        if (sq < Math.cos(B.climbAngle) && nh > 0.2) {
          // met obliquely: the wheel glances along the face (the velocity into it taken out, the bike turned along it)
          const nx = qn.nx / nh, nz = qn.nz / nh, vin = -(s.vx * nx + s.vz * nz);
          if (vin > 0) { s.vx += nx * vin; s.vz += nz * vin; }
          s.yawVel += ((fz * nx - fx * nz) >= 0 ? 1 : -1) * Math.min(2, Math.max(0, vin) * 0.8);
          vF = s.vx * fx + s.vz * fz; vL = s.vx * w.lx + s.vz * w.lz;
          s.glances++; CL.a = 0.3; thump(s, B);
          break;
        }
        // the front wheel square into a face it cannot climb: it stops the bike (or the kid goes over the bars)
        if (vF > B.faceCrash && rise > 0.1) { s.blocked++; crash(s, "front wheel hit the kerb"); s.vx *= 0.3; s.vz *= 0.3; return true; }
        s.vx -= fx * vF * 1.15; s.vz -= fz * vF * 1.15;       // a small bounce back
        s.pitchVel -= Math.min(3, vF * 0.6);
        s.blocked++;
        vF = s.vx * fx + s.vz * fz;
        break;
      } else if (rise <= B.rearClimb) {
        // the rear wheel bonks up the face (the front is already over it); once per face (it climbs over the next
        // steps: not a second bonk)
        if (s._bonkT > 0) continue;
        s._bonkT = 0.2; s._catchT = 0.25;
        const loss = B.rearBonk * rise / B.rearClimb;
        s.vx *= 1 - loss; s.vz *= 1 - loss; vF *= 1 - loss; vL *= 1 - loss;
        // (the climb's speed at the REAR contact, half lifting the body, half pitching it about the CoM: the front,
        // already up, is not thrown up with it)
        // (forgiving falls: the rear wheel ROLLS up as the front does - lifted to where it rolls, the spring and the kid's
        // legs take the rest. The old climb speed at the rear contact (sqrt(2 g rise)) threw the bike nose-down into the
        // air at speed: 7.8 m/s into the 15 cm kerb landed 3 m on, nose down 56 deg, over the bars)
        if (rise > B.stepRoll * 0.9) { CL.lift = rise - B.stepRoll * 0.9; catchLift(s, 1, B); s.wheelBot[1] = qn.h - B.stepRoll * 0.9; wheelOffsets(s, B); }
        if (vF < 2) { const want = Math.sqrt(2 * g * rise) * 0.5, have = s.vy + s.pitchVel * RF[1], def = want - have; if (def > 0) { s.vy += def * 0.5; s.pitchVel += def * 0.5 / RF[1]; } }
        s.bonks++;
      } else {
        s.vx -= fx * vF; s.vz -= fz * vF; vF = 0; s.blocked++;
      }
    }
  }

  w.vF = vF; w.vL = vL;
  return false;
}

/** stepBike, part 2: the contact forces, pushing / the foot down / the manual, the rider's pitch. true = ended */
function contactPhase(s, w, env, B, S) {
  const dt = DT, g = B.gravity, fx = w.fx, fz = w.fz, lx = w.lx, lz = w.lz, pedal = w.pedal, leanIn = w.leanIn, bF = w.bF, bR = w.bR, sprint = w.sprint;
  let vF = w.vF, vL = w.vL;
  // ---- contact forces (per unit mass): along the ground normal; tangential (drive / brake / rolling) horizontal
  let aF = 0, aY = -g, alpha = 0, retard = 0, drive = 0, brakes = 0;
  const legDr = -s.legVel * B.legRange;   // d(b)/dt: the wheel bottoms move down when the legs extend
  const ct = Math.cos(s.pitch), st = Math.sin(s.pitch);
  let nCount = 0, fnF = 0, fnR = 0, muF = 1, muR = 1, landCheck = s.air && s.airT > 0.12;
  s.skid = false; s.wheelspin = false; s.frontLock = false;
  const v = Math.abs(vF);
  for (let i = 0; i < 2; i++) {
    const q = Q[i], pen = q.h - s.wheelY[i];
    s.surf[i] = q.surf; s.ground[i] = q.h;
    let sl = slopeOf(q, fx, fz);
    if (sl >= 0.6 || sl <= -0.6) { JP.x = s.x + fx * RF[i]; JP.z = s.z + fz * RF[i]; JP.fx = fx; JP.fz = fz; JP.sl = sl; judgeSlopeP(env); sl = JP.r; }
    s.slope[i] = sl;
    if (pen <= 0) { s.comp[i] = 0; continue; }
    nCount++;
    const inv = 1 / Math.sqrt(1 + sl * sl), nF = -sl * inv, nU = inv;
    // the contact point's velocity: CoM + pitch rate x r + the legs
    const vFp = vF - s.pitchVel * HU[i] - legDr * st, vYp = s.vy + s.pitchVel * RF[i] + legDr * ct;
    const penRate = sl * vFp - vYp;
    if (landCheck) {
      landCheck = false;
      landing(s, i, sl, (penRate) * inv, vL, vF, B);
      if (s.crashed) return true;
      // (the landing's speed loss: the step goes on from the new velocity - before, it was overwritten below)
      vF = s.vx * fx + s.vz * fz; vL = s.vx * lx + s.vz * lz;
    }
    const Fn = clamp(B.springK * Math.min(pen, B.maxComp) + B.springC * penRate, 0, B.fnMax);
    const surfP = S[q.surf] || S[0], mu = surfP.grip * B.grip;
    if (i === 0) { fnF = Fn; muF = mu; } else { fnR = Fn; muR = mu; }
    s.comp[i] = Math.min(pen, B.maxComp);
    aF += Fn * nF; aY += Fn * nU;
    // PUMPING (the rider's work, which a one-body model cannot make by itself): the legs extending into a back slope
    // drive the bike down it, the legs absorbing up a face take away part of the climb's loss
    const ext = s.legSpeed * B.legRange;          // m/s, > 0 extending
    if (ext > 0 && sl < 0) aF += B.pumpGain * ext * -sl * 0.5;
    else if (ext < 0 && sl > 0) aF += B.pumpGain * -ext * sl * 0.25;
    alpha += (RF[i] * Fn * nU - RU[i] * Fn * nF);
    // rolling resistance + soft ground (sand sinks) + brakes: retarding, horizontal
    let r = surfP.roll * Fn + surfP.sink * v * (Fn / (g / 2)) * 0.5;
    let brake = 0;
    if (i === 0) {
      brake = bF * B.brakeFront;
      if (brake > mu * Fn && v > 0.5) { brake = mu * B.skidMu * Fn; s.frontLock = bF > 0.2; }
      brake = Math.min(brake, mu * Fn);
    } else {
      brake = bR * B.brakeRear;
      const lock = (bR > B.skidAt || brake > mu * Fn) && v > 1.2;
      if (lock) { brake = mu * B.skidMu * Fn; s.skid = true; }
      brake = Math.min(brake, mu * Fn);
      // pedalling: the rear wheel pushes (power over speed, a force cap, spinning out at the top cadence)
      if (pedal > 0 && !s.pushing && !lock) {
        const P = (sprint ? B.powerSprint : B.powerCruise) / B.mass, Fc = sprint ? B.forceSprint : B.forceCruise;
        const vCad = B.rollout * B.cadenceMax / 60;
        let D = pedal * Math.min(Fc, P / Math.max(0.5, vF)) * (1 - smooth(0.85 * vCad, vCad, vF));
        if (vF < -0.3) D = pedal * Fc;          // rolling back: pedalling pulls forward
        if (D > mu * Fn * 0.95) { D = mu * Fn * 0.8; s.wheelspin = true; }
        drive += D;
        alpha += -RU[i] * D;                       // the push under the CoM lifts the nose (a wheelie with Shift)
      }
    }
    retard += r + brake; brakes += brake;
    // a brake force backward under the CoM: nose down. The kid shifts back on a hard front brake (the torque arm
    // shrinks) unless leaning forward: then the front brake is an endo.
    // (scaled down under 0.3 m/s: at a stop a held brake carries no force, so no torque. Browser check 2026-11-21:
    // with sgn(vF), S held after braking to a stop flipped the full brake torque nose-UP on every tiny roll-back
    // (vF ~ -1e-6): the bike reared up and looped out at a standstill)
    let vS = sgn(vF); if (vF < 0.3 && vF > -0.3) vS = vF / 0.3;
    alpha += RU[i] * brake * vS * (i === 0 ? (leanIn < -0.2 ? 1.15 : 1 - 0.3 * bF) : 1);
  }
  alpha /= B.pitchInertia;
  const contactNow = nCount > 0;
  s.contact[0] = Q[0].h - s.wheelY[0] > 0; s.contact[1] = Q[1].h - s.wheelY[1] > 0;

  // ---- states: pushing, foot down, manual
  const up = (Q[0].h - Q[1].h) / B.wheelbase * (vF >= -0.05 ? 1 : -1);
  s.grade = up;
  if (contactNow) {
    if (!s.pushing) {
      // (crawling up, or already rolling back down it while pedalling: the heading's grade, feel round 2 - a 44 %
      // stair ramp rolled the kid back down before the push could start)
      const upH = (Q[0].h - Q[1].h) / B.wheelbase;
      if (pedal > 0 && upH > B.pushGrade && vF < B.pushSpeed && !sprint) { s.pushT += dt; if (s.pushT > B.pushDelay) { s.pushing = true; s.pushT = 0; } }
      else s.pushT = 0;
    } else if (up < B.pushGrade * 0.5) { s.pushT += dt; if (s.pushT > 0.5) { s.pushing = false; s.pushT = 0; } }
    else s.pushT = 0;
  }
  const footHold = contactNow && !s.pushing && pedal === 0 && v < B.footSpeed && (bF + bR > 0.1 || up > -0.03);
  s.footDown += ((footHold && v < 0.3 ? 1 : 0) - s.footDown) * (1 - Math.exp(-6 * dt));
  if (s.pushing || footHold) aF = 0;           // the walker / the planted foot carries the slope

  // ---- rider pitch: a pull back / push forward (torque); in a manual the assist turns the input into a held angle
  const relR = s.pitch - Math.atan(s.slope[1]);
  const manual = contactNow && s.contact[1] && !s.contact[0] && relR > 0.03;
  s.manual = manual ? s.manual + dt : 0;
  if (contactNow) {
    if (manual && B.manualAssist > 0 && leanIn > 0.05) {
      // (the helper also carries the contact torques: gravity about the rear contact is what makes a manual hard)
      const target = B.manualAngle * (0.4 + 0.6 * leanIn), A = B.manualAssist;
      alpha = (1 - A) * (alpha + leanIn * B.riderPitch) + A * ((target - relR) * 60 - s.pitchVel * 10);
    } else alpha += leanIn * B.riderPitch - B.pitchDamp * s.pitchVel;
    // (forgiving falls) a wheelie the kid did not ask for (Shift, a bump, a kerb) past the manual's angle: he puts the
    // front back down (no lean input; X held = his own manual, the old rules)
    if (manual && leanIn < 0.05 && B.autoSave > 0 && relR > B.manualAngle) alpha += B.autoSave * (-(relR - B.manualAngle) * 40 - Math.max(0, s.pitchVel) * 6);
    // ... and rolling off a drop (the rear still on the lip, the front over the edge, the nose going down): he pulls the
    // bars up to keep it level (a slow roll-off nose-dived into an endo)
    if (s.contact[1] && !s.contact[0] && relR < 0 && leanIn < 0.05 && bF < 0.3 && B.autoSave > 0) alpha += B.autoSave * (-relR * 30 - Math.min(0, s.pitchVel) * 6);
    if (s.pushing) alpha += -(s.pitch - Math.atan(up)) * 60 - s.pitchVel * 12;
    // a sketchy rear-first landing being saved: the kid throws his weight over the bars until the nose comes down
    if (s.wobbleT > 0 && s.saveKind === 1 && relR > B.manualAngle) alpha += -(relR - B.manualAngle) * 50 - Math.max(0, s.pitchVel) * 6;
    // the FRONT wheel down, the rear up (a hop or a bonk onto a kerb, a nose-first landing), no front brake, not leaning
    // forward: the kid brings the rear down onto the ground ahead (levels the bike to the front's ground) - a stoppie
    // is front brake + lean forward
    if (s.contact[0] && !s.contact[1] && bF < 0.3 && leanIn > -0.2) {
      JP.x = s.x + fx * RF[0]; JP.z = s.z + fz * RF[0]; JP.fx = fx; JP.fz = fz; JP.sl = s.slope[0]; judgeSlopeP(env); const jF = JP.r;
      alpha += -(s.pitch - Math.atan(jF)) * 30 - s.pitchVel * 7;
    }
  } else {
    // the assist levels the bike toward the ground it will land on (~0.3 s ahead): a down ramp nose down, flat level
    // (over a 1 m base: a kerb's face is not a slope to match)
    const ax = s.x + s.vx * 0.3, az = s.z + s.vz * 0.3;
    GP.x = ax + fx * 0.5; GP.z = az + fz * 0.5; const hA = groundAt(env, QS).h;
    GP.x = ax - fx * 0.5; GP.z = az - fz * 0.5; const hB = groundAt(env, QS).h;
    const target = Math.atan(clamp(hA - hB, -0.8, 0.8));
    alpha = leanIn * B.airPitch - B.airPitchDamp * s.pitchVel + B.airLevel * (target - s.pitch) * (leanIn ? 0.3 : 1) - (leanIn ? 0 : B.airLevelDamp * s.pitchVel);
    // a bunny hop: front first, then the kid levels the bike so the rear comes up too (bars forward, feet up)
    if (s.hopT < 0.6 && !leanIn) alpha += -(s.pitch - target) * 30 - s.pitchVel * 7;
  }

  w.vF = vF; w.vL = vL; w.aF = aF; w.aY = aY; w.alpha = alpha; w.retard = retard; w.brakes = brakes; w.drive = drive; w.fnF = fnF; w.fnR = fnR;
  w.muF = muF; w.muR = muR; w.v = v; w.up = up; w.contactNow = contactNow; w.footHold = footHold; w.landCheck = landCheck;
  return false;
}

/** stepBike, part 3: forward speed, the wobble, lean and yaw, the tyres' side grip */
function motionPhase(s, w, B) {
  const dt = DT, g = B.gravity;
  let vF = w.vF, vL = w.vL, fx = w.fx, fz = w.fz;
  const lx = w.lx, lz = w.lz, aF = w.aF, aY = w.aY, alpha = w.alpha, retard = w.retard, drive = w.drive, fnF = w.fnF, fnR = w.fnR, muF = w.muF, muR = w.muR;
  const v = w.v, steer = w.steer, pedal = w.pedal, up = w.up, contactNow = w.contactNow, footHold = w.footHold;
  // ---- forward speed: contact forces, pedalling, retarding (never reversing the speed), air drag
  vF += (aF + drive) * dt;
  if (s.pushing) {
    const want = pedal > 0 ? B.walk * (up > 0.16 ? 0.8 : 1) : 0;
    vF += clamp(want - vF, -2.5 * dt, 2.5 * dt);
  } else if (footHold) vF *= Math.exp(-6 * dt);
  const dv = retard * dt;
  vF = Math.abs(vF) <= dv ? 0 : vF - sgn(vF) * dv;
  const hs = hyp(vF, vL), dragK = 1 / (1 + B.drag * hs * dt);
  vF *= dragK; vL *= dragK;
  s.vy += aY * dt;
  s.pitchVel += alpha * dt;

  // ---- the WOBBLE after a sketchy landing (feel round 1): fading, ~3 Hz: the bars shake, the bike weaves, less side
  // grip; the kid stays on (no wash-out while it lasts)
  let wob = 0;
  if (s.wobbleT > 0) {
    s.wobbleT = Math.max(0, s.wobbleT - dt);
    const env1 = s.wobble * (s.wobbleT / Math.max(1e-6, s.wobbleDur));
    wob = env1;
    s.wobbleNow = env1 * Math.sin((s.wobbleDur - s.wobbleT) * Math.PI * 2 * 3.2);
    if (s.wobbleT === 0) s.wobble = 0;
  } else s.wobbleNow = 0;
  s.wobbleW = wob;
  // ---- lean and yaw
  const steerOK = !s.pushing;
  if (contactNow) {
    const muLean = Math.min(muF, muR);
    const speedLean = B.maxLean * smooth(B.leanV0, B.leanV1, v);
    const gripLean = Math.atan(muLean) * 0.95;
    s.leanTarget = steerOK ? steer * Math.min(speedLean, gripLean) : 0;
    // (the foot-down lean only while stopping / stopped: pulling away it must not steer the bike)
    s.leanTarget += B.wobbleLean * s.wobbleNow + (v < B.footSpeed ? B.footLean * Math.max(0, s.footDown - 0.3) / 0.7 : 0);
    s.lean += (s.leanTarget - s.lean) * (1 - Math.exp(-B.leanRate * dt));
    const wLean = smooth(B.barV0, B.barV1, v);
    const bar = steer * B.lowSteer * (1 - wLean);
    let yaw = (1 - wLean) * vF * Math.tan(bar) / B.wheelbase + wLean * sgn(vF) * g * Math.tan(s.lean) / Math.max(v, 2);
    // (forgiving falls) never asking more side grip than the surface has (the handlebar's turn at walking pace was not
    // limited: a full lock at 3 m/s on sand slid the bike out, "washed out"); a skid steers past it on purpose
    { const cap = muLean * g * 0.92 / (v > 0.5 ? v : 0.5); if (yaw > cap) yaw = cap; else if (yaw < -cap) yaw = -cap; }
    if (s.skid) yaw += steer * B.skidYaw * smooth(1.5, 6, v);
    if (s.contact[1] && !s.contact[0]) yaw *= 0.6;        // manual: steering by leaning only
    s.yawVel += (yaw - s.yawVel) * (1 - Math.exp(-B.yawResponse * dt));
    // (the bars as drawn: eased, and never turned faster than a kid turns them, 4 rad/s - feel round 4: a full lock at a
    // standstill swung them 0.08 rad a step, the hands with them)
    const dSt = (clamp(bar + wLean * Math.atan(B.wheelbase * s.yawVel / Math.max(v, 2)) - 0.12 * (s.leanTarget - s.lean) * wLean + 1.8 * B.wobbleLean * s.wobbleNow, -1, 1) - s.steerAngle) * (1 - Math.exp(-14 * dt));
    s.steerAngle += dSt > 4 * dt ? 4 * dt : dSt < -4 * dt ? -4 * dt : dSt;
    s.spinArm = Math.abs(steer) < 0.3;
  } else {
    // (forgiving falls) a SPIN needs the steer pressed IN the air: a key still held from the ground (a casual rider
    // turning into a hop) does not spin the bike; with no spin the heading is drawn to the flight path (airAlign)
    if (Math.abs(steer) < 0.3) s.spinArm = true;
    // (a tap - a casual rider's correction - is not a spin: the key held ~0.25 s, the keyboard ramp past 0.85)
    const spin = s.spinArm && (steer > 0.85 || steer < -0.85) ? steer : 0, hv = hyp(s.vx, s.vz);
    let ay = spin * B.airYaw - B.airYawDamp * s.yawVel;
    if (Math.abs(spin) < 0.3 && hv > 1.5) {
      let e = Math.atan2(s.vx, s.vz) - s.heading; e -= Math.round(e / (Math.PI * 2)) * Math.PI * 2;
      if (e < 1.3 && e > -1.3) ay += B.airAlign * e - 3 * s.yawVel;
    }
    s.yawVel += ay * dt;
    s.leanTarget = steer * 0.25;
    s.lean += (s.leanTarget - s.lean) * (1 - Math.exp(-3 * dt));
  }
  // momentum stays in world space; the heading turns
  s.vx = fx * vF + lx * vL; s.vz = fz * vF + lz * vL;
  s.heading += s.yawVel * dt;
  fx = Math.sin(s.heading); fz = Math.cos(s.heading);
  const nlx = fz, nlz = -fx;
  vF = s.vx * fx + s.vz * fz; vL = s.vx * nlx + s.vz * nlz;
  // the tyres take out the sideways slip within the grip left (friction circle)
  if (contactNow) {
    const load = Math.min(1, (fnF + fnR) / g);
    const mu = (muF + muR) / 2;
    // (forgiving falls: the tyre's friction circle is shared with what the TYRE does - brakes, drive - not with the
    // rolling resistance / a soft ground's sink, which are losses in the tyre and the ground: in sand they took the side
    // grip away and every turn washed out)
    const longA = Math.min(mu * g, w.brakes + drive);
    let lat = Math.sqrt(Math.max(0, (mu * g) ** 2 - longA * longA)) * load;
    if (s.skid) lat *= 0.35;
    if (s.frontLock) lat *= 0.5;
    lat *= 1 - B.wobbleGrip * wob;
    const corr = clamp(-vL * (1 - Math.exp(-B.tyreRate * dt)), -lat * dt, lat * dt);
    vL += corr;
    s.slip = vL;
    s.slipAngle = Math.atan2(vL, Math.max(0.3, Math.abs(vF)));
    // washing out: sliding sideways with no skid on purpose (too much lean for the surface, or a locked front)
    if (!(s.wobbleT > 0) && ((Math.abs(vL) > B.washSlip && !s.skid) || (s.frontLock && Math.abs(s.lean) > 0.25))) { s.washT += dt; if (s.washT > B.washTime) { crash(s, "washed out"); } }
    else s.washT = Math.max(0, s.washT - dt * 2);
    if (s.skid && Math.abs(s.slipAngle) > 1.15 && v > 4 && !(s.wobbleT > 0)) crash(s, "slid out");
  } else { s.slip = 0; s.slipAngle = 0; }
  s.vx = fx * vF + nlx * vL; s.vz = fz * vF + nlz * vL;
  w.fx = fx; w.fz = fz;
}

/** stepBike, part 4: integrate, the snap onto an edge, the bottom-out, the colliders, the crash rules, the telemetry */
function settlePhase(s, w, env, B, S) {
  const dt = DT;
  let fx = w.fx, fz = w.fz;
  const grounded = w.grounded, landCheck = w.landCheck, contactNow = w.contactNow, pedal = w.pedal, sprint = w.sprint, v = w.v;
  // ---- integrate
  s.x += s.vx * dt; s.z += s.vz * dt; s.y += s.vy * dt;
  s.pitch = clamp(s.pitch + s.pitchVel * dt, -1.45, 1.45);

  // ---- SNAP onto an edge (feel round 2): airborne and FALLING, the pegs just over a grindable edge's top, the velocity
  // within snapAngle of it: from here the bike rides the edge (grindStep); the colliders are not met
  if (!grounded && s.vy < 0 && env.edges && s.grindCD <= 0 && trySnap(s, env, B)) return;

  // ---- bottom-out: no wheel deeper than maxComp (the hard constraint; also what climbs a step)
  wheelOffsets(s, B);
  let yLow = Infinity;
  for (let i = 0; i < 2; i++) {
    let wx = s.x + fx * RF[i], wz = s.z + fz * RF[i];
    GP.x = wx; GP.z = wz;
    let q = groundAt(env, Q[i]);
    let wy = s.y + RU[i];
    let pen = q.h - wy;
    // the general face test: the contact moved (any reason: rolling, turning, sliding, pitching) onto ground that rose
    // like a face since the last step, higher than this wheel takes (the front: a step it rolls; the rear: a bonk)
    const rise = q.h - s.wheelBot[i];
    let facing = rise > (i === 0 ? B.stepRoll : B.rearClimb) && pen > 0 && (FP.x = s.wheelPos[i * 2], FP.z = s.wheelPos[i * 2 + 1], FP.x1 = wx, FP.z1 = wz, faceRiseP(env, B), FP.r > B.faceSlope);
    // (forgiving falls) the front contact carried into a face it can take by the bike's PITCHING (a pull up a kerb swings
    // the contact under the hub forward: the velocity's face test in facePhase does not see it): rolled up / caught as
    // there, not stopped (6 m/s into the 15 cm kerb after the pull: stopped dead)
    if (facing && i === 0 && (rise <= B.stepRoll + B.kerbCatch || (rise <= B.stepClimb && s.vx * fx + s.vz * fz > B.climbV))) {
      CL.lift = rise - B.stepRoll * 0.9; catchLift(s, 0, B); s.climbs++;
      wheelOffsets(s, B); wy = s.y + RU[0]; pen = q.h - wy; s.wheelBot[0] = q.h - B.stepRoll * 0.9; facing = false;
    }
    if (facing || pen - B.maxComp > B.rearClimb + 0.05) {
      // a wheel swung / slid into a ledge higher than any step it climbs (turning or sliding sideways at a wall
      // of ground, not caught by the face test along the heading): a wall. Back to where the step began, stopped.
      // (the whole pose: a pitch change alone moves a contact forward / back)
      s.x = s.prev.x; s.z = s.prev.z; s.y = s.prev.y; s.heading = s.prev.heading; s.pitch = s.prev.pitch;
      s.yawVel = 0; s.pitchVel = 0; s.vy = Math.min(0, s.vy);
      s.vx *= -0.1; s.vz *= -0.1; s.blocked++;
      fx = Math.sin(s.heading); fz = Math.cos(s.heading);
      wheelOffsets(s, B);
      wx = s.x + fx * RF[i]; wz = s.z + fz * RF[i];
      GP.x = wx; GP.z = wz; q = groundAt(env, Q[i]); wy = s.y + RU[i]; pen = q.h - wy;
      if (pen - B.maxComp > B.rearClimb + 0.05) {
        // still in the ledge (it got there some other way): never lifted onto it; moved off it, 5 cm a step, toward
        // the lower side (a front wheel hanging over a lip: forward; a wheel against a face: back)
        const back = env.ground(wx + fx * 0.06, wz + fz * 0.06, QS).h < env.ground(wx - fx * 0.06, wz - fz * 0.06, QS).h ? 0.05 : -0.05;
        s.x += fx * back; s.z += fz * back; pen = 0;
      }
    }
    if (pen > B.maxComp) {
      const corr = pen - B.maxComp;
      const lever = Math.abs(RF[i]) > 0.15 ? RF[i] : 0;
      if (lever) { s.y += corr * 0.5; s.pitch = clamp(s.pitch + clamp(corr * 0.5 / lever, -0.08, 0.08), -1.45, 1.45); }
      else s.y += corr;
      let sl = slopeOf(q, fx, fz);
      if (sl >= 0.6 || sl <= -0.6) { JP.x = wx; JP.z = wz; JP.fx = fx; JP.fz = fz; JP.sl = sl; judgeSlopeP(env); sl = JP.r > 1 ? 1 : JP.r < -1 ? -1 : JP.r; }
      const vFp = s.vx * fx + s.vz * fz - s.pitchVel * HU[i], vYp = s.vy + s.pitchVel * RF[i];
      const rate = Math.min(4, sl * vFp - vYp);
      if (rate > 0) {
        if (lever) { s.vy += rate * 0.6; s.pitchVel += clamp(rate * 0.4 / lever, -6, 6); } else s.vy += rate;
      }
      wheelOffsets(s, B);
      wy = s.y + RU[i];
      if (q.h - wy > B.maxComp) { s.y += q.h - wy - B.maxComp; wy = q.h - B.maxComp; }    // (a short lever: the rest by height)
    }
    s.wheelY[i] = wy;
    s.wheelBot[i] = Math.max(wy, q.h);             // the wheel's bottom (on the ground: the ground)
    s.wheelPos[i * 2] = wx; s.wheelPos[i * 2 + 1] = wz;
    yLow = Math.min(yLow, s.wheelBot[i]);
  }
  s.yLow = yLow;
  // ---- colliders (walls, posts, cars)
  s.envContacts = 0;
  env.collide?.(s, B);

  // ---- air bookkeeping, crash rules on the ground
  const anyContact = Q[0].h - s.wheelY[0] > -0.004 || Q[1].h - s.wheelY[1] > -0.004;
  if (!anyContact) { if (!s.air) { s.air = true; s.airT = 0; s.airMax = 0; } s.airT += dt; s.airMax = Math.max(s.airMax, s.y); }
  else if (s.air && !landCheck) { s.air = false; }
  if (s.air && s.airT <= 0.12 && anyContact) s.air = false;
  // a manual held past the balance point = stepped off the back; balanced on the front wheel past endo = over the bars
  // (judged against the ground, not a kerb face under a wheel at its lip; while a sketchy landing is being saved the
  // limits are the landing's bail limits)
  if (!s.crashed && contactNow) {
    const saving = s.wobbleT > 0;
    const loop = saving ? Math.max(B.loopOut, B.tailBail) : B.loopOut, endo = saving ? Math.max(B.endo, B.noseBail) : B.endo;
    // (judged only when the rule can fire, and the slope re-measured only on a face: stepBike is too big for V8 to
    // inline these calls, and a call with doubles boxes them: two calls a step were half the step's garbage)
    const sR = s.slope[1], sF = s.slope[0];
    if (s.manual > 0.1) {
      let jR = sR; if (!(sR > -0.6 && sR < 0.6)) { JP.x = s.x - fx * B.wheelbase / 2; JP.z = s.z - fz * B.wheelbase / 2; JP.fx = fx; JP.fz = fz; JP.sl = sR; judgeSlopeP(env); jR = JP.r; }
      if (s.pitch - Math.atan(jR) > loop) crash(s, "looped out");
    }
    if (!s.crashed && s.contact[0] && !s.contact[1]) {
      let jF = sF; if (!(sF > -0.6 && sF < 0.6)) { JP.x = s.x + fx * B.wheelbase / 2; JP.z = s.z + fz * B.wheelbase / 2; JP.fx = fx; JP.fz = fz; JP.sl = sF; judgeSlopeP(env); jF = JP.r; }
      if (s.pitch - Math.atan(jF) < -endo) crash(s, "over the bars");
    }
  }

  // ---- wheels, cranks, telemetry
  const fwd = (s.x - s.prev.x) * fx + (s.z - s.prev.z) * fz, R = B.wheelR;
  s.spin[0] = (s.spin[0] + (s.frontLock ? 0 : fwd / R)) % (Math.PI * 2);
  s.spin[1] = (s.spin[1] + (s.skid ? 0 : s.wheelspin ? fwd / R * 1.6 : fwd / R)) % (Math.PI * 2);
  const pedalling = pedal > 0 && !s.pushing && s.contact[1];
  s.pedalling += ((pedalling ? 1 : 0) - s.pedalling) * (1 - Math.exp(-8 * dt));
  s.sprint += ((sprint && pedalling ? 1 : 0) - s.sprint) * (1 - Math.exp(-5 * dt));
  if (pedalling && fwd > 0) { s.crank = (s.crank + fwd / B.rollout * Math.PI * 2) % (Math.PI * 2); s.cadence = fwd / dt / B.rollout * 60; }
  else if (pedalling) { s.crank = (s.crank + dt * 3) % (Math.PI * 2); s.cadence = 25; }
  else s.cadence *= Math.exp(-6 * dt);
  if (s.pushing) s.walkPhase = (s.walkPhase + Math.abs(fwd) / 0.7 * Math.PI) % (Math.PI * 2);
  const sp = S[s.surf[1]] || S[0];
  s.buzz = sp.buzz * Math.min(1, v / 6) * (s.contact[0] || s.contact[1] ? 1 : 0);
  // the last safe pose (upright, rolling, nothing touching)
  if (!s.crashed && !s.air && s.contact[0] && s.contact[1] && Math.abs(s.lean) < 0.25 && v > 1 && !s.envContacts && Math.abs(s.pitch) < 0.2) {
    s.safe.t += dt;
    if (s.safe.t > 0.5) { s.safe.x = s.x; s.safe.z = s.z; s.safe.heading = s.heading; s.safe.t = 0; }
  }
}

// ------------------------------------------------------------------------------------------------ GRINDS (feel round 2)
// A third contact state: the pegs on an edge of the layer (bikeEdges.js). The bike follows the polyline: its speed along
// it (slope gravity, the material's drag), the pose blended onto it over snapTime, a balance the kid keeps (lean against
// the fall: steer; a helper, grindAssist), a stall when slow. It leaves at the line's end, at a corner sharper than
// cornerExit (straight on), by a hop (Space: up + toward the steer) or by losing the balance (to that side).
const GQ = { u: 0, len: 0, d: 0, tx: 0, tz: 0, y: 0 };

/** the grind's pose targets on segment seg at u (dir: +1 along it): fills s._g0 = [x, y(top), z, heading, pitch] */
function grindTarget(s, E, seg, u, dir, B) {
  const o = seg * 6, x0 = E.seg[o], z0 = E.seg[o + 2], dx = E.seg[o + 3] - x0, dz = E.seg[o + 5] - z0, len = hyp(dx, dz) || 1e-6;
  const tx = dx / len, tz = dz / len, uc = clamp(u, 0, len), y = E.seg[o + 1] + (E.seg[o + 4] - E.seg[o + 1]) * uc / len;
  const sl = (E.seg[o + 4] - E.seg[o + 1]) / len * dir;
  // (beside the edge: half its top's width + the pegs, on the side the bike came from; (-tz, tx) = the segment's left)
  const off = s.grindSide * (E.lineW[E.segLine[seg]] / 2 + B.pegOut);
  const T = s._g0;
  T[0] = x0 + tx * uc - tz * off; T[1] = y; T[2] = z0 + tz * uc + tx * off; T[3] = Math.atan2(tx * dir, tz * dir); T[4] = Math.atan(sl);
  return len;
}
const wrapA = (a) => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;

function trySnap(s, env, B) {
  const E = env.edges, r = edgeCell(E, s.x, s.z);
  if (!r) return false;
  // (never right after a hard hit: a bike knocked into line by a bench's back is not "sucked" onto its seat)
  if (s.lastHit && s.t - s.lastHit.t < 0.15) return false;
  const hv = hyp(s.vx, s.vz), cosA = Math.cos(B.snapAngle);
  wheelOffsets(s, B);
  const hubY = s.y + (HU[0] + HU[1]) / 2;
  let best = -1, bestD = Infinity, bestU = 0, bestAlong = 0;
  for (let k = r[0]; k < r[1]; k++) {
    const seg = E.cellItems[k];
    if (!E.lineGrind[E.segLine[seg]]) continue;
    const d = segNearest(E, seg, s.x, s.z, GQ) - E.lineW[E.segLine[seg]] / 2;
    if (d > B.snapReach || d >= bestD) continue;
    if ((GQ.u < 0 && E.segPrev[seg] < 0) || (GQ.u > GQ.len && E.segNext[seg] < 0)) continue;     // past the line's ends
    const peg = hubY - B.pegR - GQ.y;
    if (peg > B.snapAbove || peg < -B.snapBelow) continue;
    const along = s.vx * GQ.tx + s.vz * GQ.tz;
    if (hv > 0.5 && Math.abs(along) < cosA * hv) continue;                                       // across it, not along
    best = seg; bestD = d; bestU = clamp(GQ.u, 0, GQ.len); bestAlong = along; s.grindSide = GQ.d >= 0 ? 1 : -1;
  }
  if (best < 0) return false;
  // the grind starts: the offsets from the edge's pose, blended away over snapTime
  const dir = hv > 0.5 ? (bestAlong >= 0 ? 1 : -1) : (Math.sin(s.heading) * GQ.tx + Math.cos(s.heading) * GQ.tz >= 0 ? 1 : -1);
  s.grindSeg = best; s.grindDir = dir; s.grindU = bestU; s.grindV = Math.abs(bestAlong); s.grindT = 0; s.grindStall = 0;
  s.grindType = E.lineType[E.segLine[best]]; s.grinds++; s.grindExit = ""; s.grindDist = 0;
  grindTarget(s, E, best, bestU, dir, B);
  const T = s._g0, lxT = Math.cos(T[3]), lzT = -Math.sin(T[3]);
  // the balance starts from the sideways speed brought onto the edge (a square entry is balanced)
  s.grindBal = clamp((s.vx * lxT + s.vz * lzT) * 0.35, -0.7, 0.7);
  const go = s._go; go[0] = s.x - T[0]; go[1] = s.y - (T[1] + B.pegR - (HU[0] + HU[1]) / 2); go[2] = s.z - T[2]; go[3] = wrapA(s.heading - T[3]); go[4] = s.pitch - T[4];
  s.preload = 0; s.hopHeld = !!s.hopHeld;
  if (s.grindV < B.grindMinSpeed) s.stalls++;
  grindPose(s, env, B, 0);
  return true;
}

/** place the bike on the edge (blend w from the snap's offsets) */
function grindPose(s, env, B, w, wy = w) {
  const E = env.edges, T = s._g0, k = 1 - w, ky = 1 - wy, go = s._go;
  s.pitch = T[4] + go[4] * k; s.pitchVel = 0;
  wheelOffsets(s, B);
  const hub = (HU[0] + HU[1]) / 2;
  s.x = T[0] + go[0] * k; s.z = T[2] + go[2] * k; s.y = T[1] + B.pegR - hub + go[1] * ky;
  s.heading = T[3] + go[3] * k;
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
  for (let i = 0; i < 2; i++) {
    s.wheelPos[i * 2] = s.x + fx * RF[i]; s.wheelPos[i * 2 + 1] = s.z + fz * RF[i];
    s.wheelY[i] = s.y + RU[i]; s.wheelBot[i] = s.wheelY[i];
  }
  s.yLow = Math.min(s.wheelBot[0], s.wheelBot[1]);
  s.contact[0] = s.contact[1] = false; s.air = false; s.airT = 0; s.sinceContact = 0;
  void E;
}

function grindStep(s, input, env, B) {
  const dt = DT, g = B.gravity, E = env.edges;
  const steer = clamp(input.steer || 0, -1, 1), hop = !!input.hop;
  s.grindT += dt;
  // speed along the edge: its slope, the material's drag; slower than grindMinSpeed it settles into a stall
  let seg = s.grindSeg;
  const o = seg * 6, len0 = hyp(E.seg[o + 3] - E.seg[o], E.seg[o + 5] - E.seg[o + 2]) || 1e-6;
  const sl = (E.seg[o + 4] - E.seg[o + 1]) / len0 * s.grindDir;
  const decel = s.grindType === EDGE.rail ? B.grindDecelRail : B.grindDecel;
  s.grindV += -g * sl / Math.sqrt(1 + sl * sl) * dt - decel * dt;
  if (s.grindV < 0) s.grindV = sl > 0.05 ? s.grindV : 0;          // (an up-slope rolls it back: a stall at worst)
  if (s.grindV < 0) { s.grindDir = -s.grindDir; s.grindV = -s.grindV; }
  if (s.grindV < 0.05) s.grindStall += dt; else s.grindStall = 0;
  // along the polyline: on into the next segment, or off at its end / a sharp corner
  s.grindU += s.grindDir * s.grindV * dt; s.grindDist += s.grindV * dt;
  for (let guard = 0; guard < 4; guard++) {
    const oo = seg * 6, len = hyp(E.seg[oo + 3] - E.seg[oo], E.seg[oo + 5] - E.seg[oo + 2]) || 1e-6;
    if (s.grindU >= 0 && s.grindU <= len) break;
    const nxt = s.grindU > len ? E.segNext[seg] : E.segPrev[seg];
    if (nxt < 0) return grindExit(s, env, B, "end", 0, 0);
    // the bend between the two segments (in plan)
    const ax = E.seg[oo + 3] - E.seg[oo], az = E.seg[oo + 5] - E.seg[oo + 2], n6 = nxt * 6;
    const bx = E.seg[n6 + 3] - E.seg[n6], bz = E.seg[n6 + 5] - E.seg[n6 + 2];
    const turn = Math.acos(clamp((ax * bx + az * bz) / ((hyp(ax, az) * hyp(bx, bz)) || 1), -1, 1));
    if (turn > B.cornerExit) return grindExit(s, env, B, "corner", 0, B.cornerPop);     // (the pegs pop off the corner)
    if (s.grindU > len) { s.grindU -= len; seg = nxt; }
    else { seg = nxt; s.grindU += hyp(bx, bz); }
  }
  s.grindSeg = seg;
  // the balance: tips over by itself (grindTip), the helper pulls it back, the kid leans against it (steer)
  const A = B.grindAssist;
  // (+ the edge's own unevenness: a deterministic wander along the distance ridden, stronger with speed)
  const bump = B.grindBump * Math.sin(s.grindDist * 2.3 + 0.8 * Math.sin(s.grindDist * 0.9)) * Math.min(1, s.grindV / 3);
  s.grindBal += (B.grindTip * (1 - A) * s.grindBal - B.grindHold * A * s.grindBal + B.grindSteer * steer + bump) * dt;
  // the legs: crouched on the pegs (Space: deeper, the preload for the hop out)
  const legT = hop ? -1 : -0.5;
  const nl = s.legs + (legT - s.legs) * (1 - Math.exp(-B.legRate * dt));
  s.legSpeed = (nl - s.legs) / dt; s.legVel = 0; s.legs = nl;
  if (hop) s.preload = Math.min(1, s.preload + dt / B.preloadTime);
  // the pedals level (BMX riders grind with the cranks horizontal)
  const lvl = Math.round((s.crank - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
  s.crank += (lvl - s.crank) * (1 - Math.exp(-10 * dt));
  // the pose on the edge (blended in over snapTime)
  grindTarget(s, E, seg, s.grindU, s.grindDir, B);
  // (the height settles over twice the plan's blend: the pegs come down onto the edge, not snapped down - feel round 4,
  // the camera's vertical follow was jerked by it)
  const w = smooth(0, B.snapTime, s.grindT), wy = smooth(0, 2 * B.snapTime, s.grindT);
  grindPose(s, env, B, w, wy);
  s.lean = s.grindBal * 0.35; s.leanTarget = s.lean; s.yawVel = 0;
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading), slN = Math.tan(s._g0[4]);
  s.vx = fx * s.grindV; s.vz = fz * s.grindV; s.vy = slN * s.grindV;
  s.spin[0] = s.spin[0]; s.cadence *= Math.exp(-6 * dt); s.pedalling = 0; s.footDown = 0; s.manual = 0; s.trick = 0;
  // leaving: a hop (released), the balance lost, a stall held too long
  if (!hop && s.hopHeld) { const p = s.preload; s.hopHeld = false; return grindExit(s, env, B, "hop", steer * 1.0, B.popVel + B.popPreload * p); }
  s.hopHeld = hop;
  if (Math.abs(s.grindBal) >= 1) {
    if (s.grindV > B.grindCrash) { grindExit(s, env, B, "fell off", sgn(s.grindBal) * 1.2, 0); crash(s, "fell off the edge"); return; }
    return grindExit(s, env, B, "fell off", sgn(s.grindBal) * 1.2, 0);
  }
  if (s.grindStall > B.stallTime) return grindExit(s, env, B, "stall", -0.8 * sgn(s.grindBal || 1), 0);
}

/** off the edge: ballistic from here (latV: m/s toward the bike's left, upV: m/s up added) */
function grindExit(s, env, B, why, latV, upV) {
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading), lx = fz, lz = -fx;
  s.vx = fx * s.grindV + lx * latV; s.vz = fz * s.grindV + lz * latV; s.vy = Math.tan(s._g0[4]) * s.grindV + upV;
  if (why === "hop") { s.hops++; s.hopT = 0; s.popStep = s.steps; }
  s.grindSeg = -1; s.grindExit = why; s.grindExits++; s.grindCD = 0.3;
  s.preload = 0; s.pitchVel = 0; s.yawVel = 0; s.grindBal = 0;
  s.air = true; s.airT = 0.13; s.airMax = s.y; s.sinceContact = 1;
  s.safe.t = 0;
}

/** touch-down after a jump / drop: THREE BANDS (feel round 1). Each limit has a sketchy and a bail threshold; the
 *  worst rule's severity (0 at its sketchy threshold, 1 at its bail threshold) picks the band: clean (under every
 *  sketchy threshold), sketchy (a wobble, speed lost, a save: the kid stays on) or bail (over a bail threshold). */
const band = (x, a, b) => (x <= a ? 0 : (x - a) / Math.max(1e-6, b - a));
function landing(s, wheel, sl, vn, vL, vF, B) {
  const ground = Math.atan(sl), rel = s.pitch - ground;
  const absorb = s.legs < -0.4 ? B.absorb : 0;
  const side = Math.atan2(vL, Math.max(0.1, Math.abs(vF))), yawOff = Math.abs(side), moving = hyp(vF, vL) > 2;
  const R = LAND_RULES;
  const kH = clamp((vn - 3) / 4, 0, 1);         // (forgiving falls: a hard impact lowers the nose limits)
  R[0][1] = band(-rel, B.noseSketchy - 0.4 * B.noseHard * kH, B.noseBail - B.noseHard * kH);
  R[1][1] = band(rel, B.tailSketchy, B.tailBail);
  R[2][1] = band(Math.abs(s.lean), B.leanSketchy, B.leanBail);
  R[3][1] = moving ? band(yawOff, B.yawSketchy, B.yawBail) : 0;
  R[4][1] = band(vn, B.hardSketchy + absorb, B.hardBail + absorb);
  R[5][1] = band(s.trick, B.trickSketchy, B.trickBail);
  let cause = "", worst = 0, why = "";
  for (const [name, sev] of R) {
    if (sev > 1 && !cause) cause = name;
    if (sev > worst) { worst = sev; why = name; }
  }
  const bandName = cause ? "bail" : worst > 0 ? "sketchy" : "clean";
  s.lastLanding = { t: s.t, wheel: wheel === 0 ? "front" : "rear", rel, vn, yaw: yawOff, air: s.airT, height: s.airMax - s.y,
    lean: s.lean, band: bandName, severity: worst, why: cause || why, cause: cause || bandName };
  s.landings++;
  s.air = false;
  // (forgiving falls) the tyres stop the air's spin at touch-down (a spinning bike set down kept turning on the ground
  // while its path did not: a slide, "washed out", after a landing judged clean)
  s.yawVel *= 0.3;
  if (cause) { crash(s, cause); return; }
  // flat landings cost forward speed (a landing on the down slope keeps it: vn is small there)
  let loss = B.landLoss * clamp((vn - 2) / Math.max(1, B.hardBail - 2), 0, 1);
  if (worst > 0) {
    // SKETCHY: the wobble (stepBike), speed lost, and the kid's save (weight thrown against what went wrong)
    s.sketchy++; s.saveKind = why === "looped out" ? 1 : 0;
    s.wobble = Math.min(1, 0.35 + 0.65 * worst); s.wobbleDur = B.wobbleTime * (1 + 0.6 * Math.min(1, worst)); s.wobbleT = s.wobbleDur;
    loss += B.sketchyLoss * (0.4 + 0.6 * Math.min(1, worst));
    if (why === "over the bars") s.pitchVel = Math.max(s.pitchVel, 0) + 1.5 * worst;            // weight back
    else if (why === "looped out") s.pitchVel = Math.min(s.pitchVel, 0) - (1.0 + 3.0 * worst);  // weight forward (+ stepBike)
    else if (why === "landed sideways") s.yawVel += side * 6;                                    // the bike swings straight
    else if (why === "landed leaning") s.lean *= 0.7;
  }
  if (loss > 0) { const k = 1 - Math.min(0.6, loss); s.vx *= k; s.vz *= k; }
}
const LAND_RULES = [["over the bars", 0], ["looped out", 0], ["landed leaning", 0], ["landed sideways", 0], ["hard landing", 0], ["trick not finished", 0]];

/** after a crash: the bike slides and falls on its side, the rider tumbles; then the kid gets up where it lies */
function crashStep(s, env, B, S) {
  const dt = DT, g = B.gravity;
  s.crashT += dt;
  const hs = hyp(s.vx, s.vz);
  if (hs > 1e-4) { const k = Math.max(0, hs - 5 * dt) / hs; s.vx *= k; s.vz *= k; }
  s.x += s.vx * dt; s.z += s.vz * dt;
  s.yawVel *= Math.exp(-3 * dt); s.heading += s.yawVel * dt;
  const q = env.ground(s.x, s.z, QS);
  s.lean += ((s.crashDir || 1) * 1.45 - s.lean) * (1 - Math.exp(-7 * dt));
  s.pitch += (Math.atan(slopeOf(q, Math.sin(s.heading), Math.cos(s.heading))) - s.pitch) * (1 - Math.exp(-6 * dt));
  s.pitchVel = 0; s.legs = 0; s.legVel = 0;
  const lying = q.h + 0.25;
  s.vy -= g * dt; s.y += s.vy * dt;
  if (s.y < lying) { s.y = lying; s.vy = Math.abs(s.vy) > 1 ? -s.vy * 0.2 : 0; }
  s.yLow = q.h; s.contact[0] = s.contact[1] = false; s.air = false;
  env.collide?.(s, B);
  // the rider: a tumbling point
  const r = s.rider;
  r.vy -= g * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
  const rq = env.ground(r.x, r.z, QS);
  if (r.y < rq.h + 0.15) {
    r.y = rq.h + 0.15; r.vy = Math.abs(r.vy) > 1 ? -r.vy * 0.25 : 0;
    const k = Math.exp(-4 * dt); r.vx *= k; r.vz *= k;
  }
  if (s.crashT > B.respawn) getUp(s, env, B);
}

/** the kid gets up: the bike upright where it lies (or at the last safe pose if that is inside something), stopped */
export function getUp(s, env, B = BIKE) {
  s.crashed = false; s.crashT = 0;
  if (env.insideSolid?.(s)) { s.x = s.safe.x; s.z = s.safe.z; s.heading = s.safe.heading; }
  // upright on the slope it lies on: the pitch of the ground under the two wheels
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading), L = B.wheelbase / 2;
  let hF = env.ground(s.x + fx * L, s.z + fz * L, QS).h, hR = env.ground(s.x - fx * L, s.z - fz * L, QS).h;
  if (Math.abs(hF - hR) > 0.4) {      // across a ledge: the last safe pose instead
    s.x = s.safe.x; s.z = s.safe.z; s.heading = s.safe.heading;
    const gx = Math.sin(s.heading), gz = Math.cos(s.heading);
    hF = env.ground(s.x + gx * L, s.z + gz * L, QS).h; hR = env.ground(s.x - gx * L, s.z - gz * L, QS).h;
  }
  if (Math.abs(hF - hR) > 0.4) { s.pitch = 0; s.y = Math.max(hF, hR) + restHeight(B) + 0.02; hF = hR = Math.max(hF, hR); }
  else { s.pitch = Math.atan((hF - hR) / B.wheelbase); s.y = (hF + hR) / 2 + restHeight(B) / Math.cos(s.pitch); }
  s.vx = s.vz = s.vy = 0; s.pitchVel = 0; s.yawVel = 0; s.lean = 0; s.leanTarget = 0;
  s.legs = 0; s.legVel = 0; s.preload = 0; s.trick = 0; s.washT = 0; s.air = false; s.airT = 0; s.manual = 0;
  s.hopBuf = 0; s.wobble = 0; s.wobbleT = 0; s.wobbleNow = 0; s.wobbleW = 0;
  s.contact[0] = s.contact[1] = true; s.sinceContact = 0;
  { const gx = Math.sin(s.heading), gz = Math.cos(s.heading);
    s.wheelPos[0] = s.x + gx * L; s.wheelPos[1] = s.z + gz * L; s.wheelPos[2] = s.x - gx * L; s.wheelPos[3] = s.z - gz * L;
    s.wheelBot[0] = hF; s.wheelBot[1] = hR; }
  s.prev.x = s.x; s.prev.y = s.y; s.prev.z = s.z; s.prev.heading = s.heading; s.prev.lean = 0; s.prev.pitch = 0;
  s.getUps = (s.getUps || 0) + 1;
}

/** Frame driver: runs as many fixed steps as the frame's time holds (max 8), s.alpha = what is left (render lerp).
 *  input: an input object (the same for every step) or a function lag => input, asked once PER STEP with how far
 *  (s) that step's end lies before the frame's time (feel round 1: bikeInput.js sample(frameMs - lag * 1000, DT)). */
export function advanceBike(s, input, frameDt, env, B = BIKE, S = SURFACES) {
  s._acc = (s._acc || 0) + Math.min(0.1, Math.max(0, frameDt));
  let n = 0;
  const per = typeof input === "function";
  while (s._acc >= DT && n < 8) { s._acc -= DT; stepBike(s, per ? input(Math.max(0, s._acc)) : input, env, B, S); n++; }
  if (n === 8) s._acc = 0;
  s.alpha = s._acc / DT;
  return n;
}

/** the interpolated pose for drawing (alpha 0..1 between the previous and the current step) */
export function bikePose(s, alpha = s.alpha ?? 1, out = {}) {
  const p = s.prev, a = clamp(alpha, 0, 1);
  let dh = s.heading - p.heading; dh -= Math.round(dh / (Math.PI * 2)) * Math.PI * 2;
  out.x = p.x + (s.x - p.x) * a; out.y = p.y + (s.y - p.y) * a; out.z = p.z + (s.z - p.z) * a;
  out.heading = p.heading + dh * a; out.lean = p.lean + (s.lean - p.lean) * a; out.pitch = p.pitch + (s.pitch - p.pitch) * a;
  return out;
}

/** forward speed (m/s, horizontal) */
export const bikeSpeed = (s) => s.vx * Math.sin(s.heading) + s.vz * Math.cos(s.heading);

/** a hash of the state for determinism checks */
export function stateHash(s) {
  const keys = ["x", "y", "z", "heading", "vx", "vy", "vz", "pitch", "pitchVel", "yawVel", "lean", "legs", "crank"];
  let h = 2166136261 >>> 0;
  const f = new Float64Array(1), u = new Uint32Array(f.buffer);
  for (const k of keys) { f[0] = s[k]; h = Math.imul(h ^ u[0], 16777619) >>> 0; h = Math.imul(h ^ u[1], 16777619) >>> 0; }
  return h.toString(16) + ":" + s.crashes + ":" + s.hops;
}
