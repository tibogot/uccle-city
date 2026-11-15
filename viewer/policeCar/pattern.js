// THE FLASH PATTERNS of the unmarked police car, as pure functions of the kit's own clock t (seconds): the same numbers
// drive the emissive lenses (uniforms) and the real lights (beaconLights.js), so what glows and what lights the street
// can never drift apart. No randomness, no Date: a frozen clock (the flicker test) freezes everything.
//
// Rules of thumb (UNECE R65, the "special warning lamps" regulation Belgium applies): blue, 2-4 flashes per second as
// seen from any direction. Two beacon kinds are on the market and in Belgian unmarked cars:
//   ROTATING  the classic magnetic beacon (halogen bulb + a parabolic mirror turned by a small motor): ONE beam sweeps
//             round; an observer sees a flash each time it passes. 150 rpm = 2.5 flashes / s.
//   LED       a ring of LED modules all flashing together in a double flash ("double burst"): two 45 ms pulses
//             75 ms apart, then dark; 0.62 s cycle = ~1.6 bursts / s = 3.2 flashes / s.
// The hidden grille flashers (two LED heads behind the grille) and the visor bar (inside the top of the windscreen)
// double-flash too, left / right in alternation, placed in the beacon's dark time so they never overlap a beacon
// flash: one moving point light can then carry all of them (beaconLights.js) and only ever jumps while it is dark.

export const PATTERN = {
  rpm: 150,             // rotating reflector speed
  cycle: 0.62,          // LED / grille cycle (s)
  pulse: 0.045,         // one LED pulse (s)
  gap: 0.075,           // between the two pulses of a double flash (s)
  rise: 0.008,          // LED attack / release (s): a few ms, so a 60 Hz frame samples a soft edge, not a hard step
  grilleAt: 0.31,       // grille double flash starts at this cycle offset (s) (beacon burst at 0)
  visorAt: 0.31,        // visor bar with the grille (the visor is inside, one light carries both)
};

const clamp01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x);
/** one soft-edged pulse starting at a, length L, edge e (smoothstep in and out) */
function pulse(t, a, L, e) {
  const u = clamp01((t - a) / e), v = clamp01((a + L - t) / e);
  const s = Math.min(u, v);
  return s * s * (3 - 2 * s);
}
/** a double flash starting at a, cycle-local time t */
export function doubleFlash(t, a = 0, P = PATTERN) {
  return Math.max(pulse(t, a, P.pulse, P.rise), pulse(t, a + P.pulse + P.gap, P.pulse, P.rise));
}

/**
 * State of every lamp at time t (seconds since the lights were switched on).
 * mode "rotating" | "led". Returns a reused object:
 *   angle    reflector azimuth (rad, car frame, 0 = forward, + = toward the car's left), rotating mode
 *   beacon   LED beacon brightness 0..1 (led mode), 0 in rotating mode
 *   grilleL, grilleR  grille flashers 0..1 (left = the driver's side)
 *   visor    visor bar 0..1
 */
const out = { angle: 0, beacon: 0, grilleL: 0, grilleR: 0, visor: 0, cyc: 0 };
export function lampState(t, mode = "rotating", P = PATTERN) {
  out.angle = (t * P.rpm / 60 % 1) * Math.PI * 2;
  const c = ((t % P.cycle) + P.cycle) % P.cycle;
  out.cyc = c;
  out.beacon = mode === "led" ? doubleFlash(c, 0, P) : 0;
  // grille: left double flash, then right in the next cycle (alternation over two cycles)
  const two = ((t % (2 * P.cycle)) + 2 * P.cycle) % (2 * P.cycle);
  const g = doubleFlash(c, P.grilleAt, P);
  out.grilleL = two < P.cycle ? g : 0;
  out.grilleR = two < P.cycle ? 0 : g;
  out.visor = doubleFlash(c, P.visorAt, P);
  return out;
}
