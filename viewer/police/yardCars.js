// THE TWO PATROL CARS IN THE YARD (claude/policeyard, owner 2026-11-28; docs/POLICE_GAME.md "Choosing the car"). Pure JS
// (no three: node-tested by tools/audit/policeYard.mjs, gate row `policeyard`).
// The shift starts seated in one car at the yard spot (today's start: site frame u 18, w -6, facing the gate); the
// other one stands in a free bay of the north row (u 22.75, w 0.85, nose to the street, between the yard's parked estate
// and SUV). Stopped in the yard, E gets the player out on the driver's side (third person); E next to either car gets
// in: the car taken is the patrol car. Default: seated in the unmarked dark estate, the marked one in the bay;
// ?policecar=marked (the dev shortcut) the other way round. ?policeyard=old: one car, no swap (as before).
export const YARD_OLD = typeof location !== "undefined" && /[?&]policeyard=old(&|$)/.test(location.search);
export const KINDS = ["unmarked", "marked"];

// the station's site frame (models/police_rouge/site.json frame: origin, rotation): u toward Rue Rouge, w along it
export const FRM = { o: [-514.182, -340.015], r: -0.586023 };
export const toCity = (u, w) => [FRM.o[0] + u * Math.cos(FRM.r) - w * Math.sin(FRM.r), FRM.o[1] + u * Math.sin(FRM.r) + w * Math.cos(FRM.r)];
/** the city heading (forward = (sin h, cos h)) of a nose along the frame's u+ / u- / w+ / w- */
export const noseHeading = (nose) => {
  const ca = Math.cos(FRM.r), sa = Math.sin(FRM.r), d = nose[0] === "u" ? [ca, sa] : [-sa, ca], s = nose[1] === "+" ? 1 : -1;
  return Math.atan2(d[0] * s, d[1] * s);
};
export const SPOTS = {
  start: { u: 18, w: -6, nose: "w+" },     // the shift's start (the old YARD), toward the vehicle gate
  bay: { u: 22.75, w: 0.85, nose: "u+" },   // the north row's free bay (bays at w -9.15 -6.65 [-4.15] -1.65 [0.85] 3.35)
};
export const SWAP = {
  yardR: 34,        // m from the yard spot: where E gets you out (the yard and its gate mouth)
  outSpeed: 0.8,    // m/s: slower than this
  reach: 1.3,       // m from a car's box: E gets in
  side: 0.75,       // m out from the driver's side: where the character stands after getting out
};

/** the two cars at the start: [{ kind, x, z, heading, seated }] (the seated one first) */
export function yardCars(first = "unmarked") {
  const other = first === "marked" ? "unmarked" : "marked";
  const at = (s) => { const [x, z] = toCity(s.u, s.w); return { x, z, heading: noseHeading(s.nose) }; };
  return [{ kind: first, ...at(SPOTS.start), seated: true }, { kind: other, ...at(SPOTS.bay), seated: false }];
}
export const START = (() => { const [x, z] = toCity(SPOTS.start.u, SPOTS.start.w); return { x, z, heading: noseHeading(SPOTS.start.nose) }; })();

/** a point in a car's frame: along (forward +), across (left +) */
export function carLocal(px, pz, c, out = { along: 0, across: 0 }) {
  const dx = px - c.x, dz = pz - c.z, s = Math.sin(c.heading), k = Math.cos(c.heading);
  out.along = dx * s + dz * k; out.across = dx * k - dz * s;
  return out;
}
const _l = { along: 0, across: 0 };
/** the distance from (px, pz) to a car's plan box (half width hw, half length hl), 0 inside */
export function boxDist(px, pz, c, hw, hl) {
  carLocal(px, pz, c, _l);
  const a = Math.max(0, Math.abs(_l.along) - hl), b = Math.max(0, Math.abs(_l.across) - hw);
  return Math.hypot(a, b);
}
/** the 4 plan corners of a car's box (+ a margin) */
export function boxRing(c, hw, hl, m = 0) {
  const s = Math.sin(c.heading), k = Math.cos(c.heading), W = hw + m, L = hl + m;
  return [[L, W], [L, -W], [-L, -W], [-L, W]].map(([a, b]) => [c.x + a * s + b * k, c.z + a * k - b * s]);
}
/** where the character stands after getting out: beside the driver's door (a left-hand-drive car: its left), else the
 *  first free one of the right side, the back, the front (blocked(x, z): another car / a wall there); facing forward;
 *  bearing = radians clockwise from north (main.js thirdPerson's) */
export function exitSpot(c, hw, blocked = null, side = SWAP.side, hl = 2.4) {
  const s = Math.sin(c.heading), k = Math.cos(c.heading);
  const at = (along, across) => ({ x: c.x + s * along + k * across, z: c.z + k * along - s * across, bearing: Math.PI - c.heading });
  const tries = [at(-0.25, hw + side), at(-0.25, -(hw + side)), at(-(hl + side), 0), at(hl + side, 0)];   // (left = +across)
  return tries.find((p) => !blocked?.(p.x, p.z)) ?? tries[0];
}
/** may the driver get out here: stopped, in the yard */
export function canGetOut(x, z, speed) {
  return Math.abs(speed) < SWAP.outSpeed && Math.hypot(x - START.x, z - START.z) < SWAP.yardR;
}
/** the parked car within reach of the character (the nearest), or null; cars: [{ kind, x, z, heading, hw, hl }] */
export function carInReach(px, pz, cars, reach = SWAP.reach) {
  let best = null, bd = reach;
  for (const c of cars) { const d = boxDist(px, pz, c, c.hw, c.hl); if (d <= bd) { bd = d; best = c; } }
  return best;
}
/** the rail-mover boxes of the parked cars [{ x, y, z, heading, hw, hl, ht }] (viewer/drive/movers.js: 7 floats x, z,
 *  yaw, hw, hl, y0, h; yaw = the car's heading: the box's long axis forward) within r of (x, z) into out from float
 *  offset off; returns how many */
export function parkedBodies(cars, x, z, r, out, off) {
  let n = 0;
  for (const c of cars) {
    if (Math.abs(c.x - x) > r + c.hl || Math.abs(c.z - z) > r + c.hl) continue;
    if (off + (n + 1) * 7 > out.length) break;
    const q = off + n * 7;
    out[q] = c.x; out[q + 1] = c.z; out[q + 2] = c.heading; out[q + 3] = c.hw; out[q + 4] = c.hl; out[q + 5] = (c.y ?? 0) - 0.1; out[q + 6] = c.ht + 0.1;
    n++;
  }
  return n;
}
