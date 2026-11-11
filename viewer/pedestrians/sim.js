// Pedestrian simulation for the Pedestrian Lab (docs/PEDESTRIANS.md): people walk a graph of walking lines (sidewalk
// lines, crossings, square nodes, park path, tram platform), steering at a "carrot" ~0.8 m ahead on their line (so
// corners are rounded and nothing turns in one frame), queue at kerbs, cross on WALK (a local signal clock) or on a
// zebra (pedestrian priority, a short glance left / right first), wander and pause in the square, gather on the tram
// platform and board / alight with dithered fades. Ideas from Mr.doob's pedestrian-system.js (kerb queues, reaction
// delay before stepping off, pauses, conversations: his js/pedestrian-system.js:384-578, MIT), written anew for a
// graph. Deterministic: a seeded random stream (no Math.random). The P2/P3 city version builds the graph from data.
const TAU = Math.PI * 2;
const wrap = (a) => a - Math.round(a / TAU) * TAU;

/** Mulberry32: a small seeded stream. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Normal sample (Box-Muller) from a stream. */
const gauss = (r) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(TAU * r());
// style bits (personMaterial.js STYLE)
const ST = { HAT: 1, SCARF: 2, COAT: 4, SKIRT: 8, BAG: 16, BACKPACK: 32, UMBRELLA: 64, CANE: 128, CHILD: 256, OLD: 512, CAP: 1024 };

export class Graph {
  constructor() { this.nodes = []; this.edges = []; }
  node(x, z, kind = "walk", extra = {}) { const n = { id: this.nodes.length, x, z, kind, edges: [], ...extra }; this.nodes.push(n); return n; }
  edge(a, b, kind = "walk", extra = {}) {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    const e = { id: this.edges.length, a, b, kind, len, ux: dx / len, uz: dz / len, width: 1, signal: null, ...extra };
    this.edges.push(e); a.edges.push(e); b.edges.push(e);
    return e;
  }
  /** A chain of nodes along points: returns the nodes. */
  chain(pts, kind = "walk", extra = {}, nodeKind = "walk") {
    const ns = pts.map(([x, z]) => this.node(x, z, nodeKind));
    for (let i = 0; i < ns.length - 1; i++) this.edge(ns[i], ns[i + 1], kind, extra);
    return ns;
  }
  join(a, b, kind = "walk", extra = {}) { return this.edge(a, b, kind, extra); }
  nearest(x, z, filter = () => true) {
    let best = null, bd = Infinity;
    for (const n of this.nodes) { if (!filter(n)) continue; const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; best = n; } }
    return best;
  }
}

/**
 * world: { graph, ground(x, z), signal: { walk(signalId, t) -> "walk" | "flash" | "red" }, carsNear(edge, node) ->
 *          { canGo, closest } for zebras and red runners, inView(x, y, z) -> bool, cam: Vector3, tram }
 */
export class PedSim {
  constructor(world, { max = 640, seed = 1 } = {}) {
    this.w = world; this.max = max; this.r = rng(seed);
    this.people = [];
    this.t = 0;
    this.target = 0;
    this.counters = { spawnHidden: 0, spawnFaded: 0, spawnInViewUnfaded: 0, removedHidden: 0, removedFaded: 0, removedInViewUnfaded: 0, redCrossings: 0, redRunners: 0, boarded: 0, alighted: 0 };
    this.redRunnerShare = 0.02;
    this.leaves = world.graph.nodes.filter((n) => n.kind === "door" || n.kind === "end");
    this.grid = new Map();
    this.season = 0.75;      // 0 summer .. 1 winter (November ~0.75)
    this.rain = 0;           // 0 dry .. 1 rain (the weather lab's hook: setWeather)
    this.groupShare = 0.25;  // spawns that bring a companion (a couple, a parent and a child)
  }
  setWeather({ season, rain } = {}) { if (season != null) this.season = season; if (rain != null) this.rain = rain; }

  /** Who this person is today (P4): age, family of clips (pram, umbrella, phone, old, cane), clothes, a dog. Drawn
   *  from the seeded stream at each placement, weighted by season and rain. */
  dress(p, kind = null) {
    const r = this.r, w = this.season, rain = this.rain;
    const u = r();
    const age = kind || (u < 0.12 ? "child" : u > 0.86 ? "old" : "adult");
    let style = 0, family = "base";
    p.age = age; p.pram = false; p.dog = false; p.childK = 0;
    if (age === "toddler") {
      // a toddler (~0.8 m), held by the hand (the companion code sets the families)
      p.scale = 0.5 + r() * 0.06; p.childK = 0.72; p.vPref = 0.9; style |= ST.CHILD;
      if (r() < 0.7 * w) style |= ST.HAT;
      family = "reachR";
    } else if (age === "child") {
      // child proportions (round 3): shorter legs and arms (crowd childify), a bigger head (the material)
      p.scale = 0.62 + r() * 0.18; p.childK = 0.8 + r() * 0.06; p.vPref = 1.15 + r() * 0.25; style |= ST.CHILD;
      if (r() < 0.55) style |= ST.BACKPACK;
      if (r() < 0.6 * w) style |= ST.HAT; else if (r() < 0.3 * (1 - w)) style |= ST.CAP;
      if (r() < 0.45 * w) style |= ST.SCARF;
      if (p.sex && r() < 0.3 * (1 - w)) style |= ST.SKIRT;
    } else {
      p.scale = (p.sex ? 0.92 : 0.98) + gauss(r) * 0.035;
      if (age === "old") {
        style |= ST.OLD; p.vPref = 0.8 + r() * 0.3;
        family = r() < 0.35 ? "cane" : "old";
        if (family === "cane") style |= ST.CANE;
      } else {
        p.vPref = Math.min(1.75, Math.max(0.85, 1.3 + gauss(r) * 0.16));
        const f = r();
        if (rain > 0.4 && f < 0.6) { family = "umbrella"; style |= ST.UMBRELLA; }
        else if (f < 0.66 && f > 0.62) { family = "pram"; p.pram = true; p.vPref = Math.min(p.vPref, 1.15); }
        else if (f > 0.93) family = "phone";
        if (r() < 0.05 && family === "base") { p.dog = true; p.vPref = Math.min(p.vPref, 1.2); }
      }
      if (r() < 0.55 * w) style |= ST.HAT; else if (r() < 0.12 * (1 - w)) style |= ST.CAP;
      if (r() < 0.5 * w) style |= ST.SCARF;
      if (r() < 0.4 * w) style |= ST.COAT;
      else if (p.sex && r() < 0.18 + 0.25 * (1 - w)) style |= ST.SKIRT;
      if (r() < 0.25 && family !== "pram") style |= ST.BAG;
      else if (r() < 0.12) style |= ST.BACKPACK;
    }
    p.style = style; p.family = family;
  }

  // ------------------------------------------------------------------------------------- people
  _newPerson() {
    const r = this.r, id = this.people.length;
    const sex = r() < 0.5 ? 1 : 0;
    const age = r();                                         // (P4: children / older people); P1: adults
    const hairRoll = r();
    return {
      id, alive: false, sex, seed: id * 1.6180339 + 0.13 + r(),
      scale: (sex ? 0.92 : 0.98) + gauss(r) * 0.035,
      girth: 0.92 + r() * 0.22,
      hair: sex ? (hairRoll < 0.6 ? 1 : 0.3 + hairRoll * 0.25) : hairRoll < 0.08 ? 1 : hairRoll * 0.35,
      armSwing: 0.8 + r() * 0.4, strideK: 0.95 + r() * 0.1,
      vPref: Math.min(1.75, Math.max(0.85, 1.3 + gauss(r) * 0.16)), age: age < 2 ? "adult" : "adult",
      x: 0, y: 0, z: 0, yaw: 0, speed: 0, turnRate: 0, look: 0, fade: 1, fadeDir: 0,
      // navigation: the carrot on the graph
      edge: null, dir: 1, s: 0, lane: 0, laneT: 0, state: "walk", timer: 0, hold: false, face: null, leaving: false,
      v: 0, kerb: null, spot: null, delay: 0, goal: null,
      // every field any module sets later, declared here: the people keep ONE hidden class (a person object that grows
      // property by property falls into V8's slow dictionary mode; measured: the crowd's per-frame CPU drops with this)
      gen: 0, onCrossing: null, holding: false, tramWait: false, boarding: false, spotUntil: 0, glance: 0, dodge: 0, gy: 0,
      redRunner: false, backed: 0, talkT: 0, standUntil: 0, action: null, seat: null, seatNode: null, leader: null, companion: null,
      side: 0, handHeld: false, keepDress: false, dive: null, diveTime: -1, style: 0, family: "base", childK: 0, pram: false, dog: false,
      _paused: null, _pram: null, after: null,
      // set by the crowd each frame
      anim: null, dist: 0, inView: false, drawn: false, lodMix: null, shadowMix: 0,
    };
  }
  /** Place a person on a random edge (initial fill: anywhere; respawn: at a leaf). */
  _place(p, at = null) {
    const g = this.w.graph, r = this.r;
    let e, s, dir;
    if (at) {
      e = at.edges[0]; dir = e.a === at ? 1 : -1; s = dir > 0 ? 0.01 : e.len - 0.01;
    } else {
      const walkable = this._walkable ||= g.edges.filter((x) => x.kind !== "cross" && x.kind !== "zebra" && x.kind !== "door");
      // weight by length
      const tot = this._walkLen ||= walkable.reduce((a, x) => a + x.len, 0);
      let k = r() * tot; e = walkable[0];
      for (const x of walkable) { k -= x.len; if (k <= 0) { e = x; break; } }
      s = r() * e.len; dir = r() < 0.5 ? 1 : -1;
    }
    p.gen = (p.gen || 0) + 1;
    if (!p.keepDress) this.dress(p); p.keepDress = false;
    p.leader = null; p.action = null; p.talkT = 0; p.standUntil = 0; p.dive = null; p.diveTime = -1; p.backed = 0; p.seatNode = null; p.handHeld = false; p.seat = null;
    Object.assign(p, { alive: true, edge: e, dir, s, onCrossing: null, holding: false, tramWait: false, boarding: false, spotUntil: 0, glance: 0, fadeDir: 0, face: null, lane: (r() - 0.5) * Math.min(0.9, e.width * 0.5), state: "walk", hold: false, timer: 0, kerb: null, spot: null, leaving: false, v: p.vPref * 0.8, look: 0 });
    const c = this._carrot(p, _c);
    p.x = c.x - (dir * e.ux) * 0.5; p.z = c.z - (dir * e.uz) * 0.5;
    p.yaw = Math.atan2(dir * e.ux, dir * e.uz);
    p.y = this.w.ground(p.x, p.z); p.gy = p.y;
  }
  _carrot(p, out) {
    const e = p.edge, s = p.s;
    const nx = -e.uz, nz = e.ux;              // left of the edge's a -> b direction
    const half = Math.max(0, e.width * 0.5 - 0.3);
    const lane = Math.max(-half, Math.min(half, p.lane + (p.dodge || 0))) * p.dir;   // lane: + to the walker's left
    out.x = e.a.x + e.ux * s + nx * lane; out.z = e.a.z + e.uz * s + nz * lane;
    return out;
  }

  fill(n) {
    while (this.people.length < this.max) this.people.push(this._newPerson());
    this.target = n;
    let alive = this.people.filter((p) => p.alive).length;
    for (const p of this.people) {
      if (alive >= n) break;
      if (!p.alive) { this._place(p); p.fade = 1; alive++; if (alive < n && p.age !== "child" && this.r() < this.groupShare) { this._companion(p, false); alive++; } }
    }
  }
  /** A companion walking with p: a partner (side by side) or a child (holding the side, smaller, keeps the pace). */
  _companion(p, faded) {
    const q = this.people.find((x) => !x.alive);
    if (!q) return;
    const child = p.age === "adult" && !p.pram && this.r() < 0.45;
    const toddler = child && this.r() < 0.45 && !p.dog;
    this.dress(q, toddler ? "toddler" : child ? "child" : p.age === "old" ? "old" : "adult"); q.keepDress = true;
    this._place(q, null);
    q.leader = p; q.side = this.r() < 0.5 ? 0.62 : -0.62; if (child) q.side = Math.sign(q.side) * 0.5;
    if (toddler) {
      // hand in hand: the parent's left hand down to the toddler's raised right hand (baked families holdL / reachR),
      // the toddler on the parent's left (+x of the skeleton), at the parent's pace
      p.family = "holdL"; p.style &= ~(64 | 16); p.vPref = Math.min(p.vPref, 1.0); q.side = 0.6 * (p.scale / 0.95);
      q.handHeld = true;
    }
    q.x = p.x + Math.cos(p.yaw) * q.side; q.z = p.z - Math.sin(p.yaw) * q.side; q.yaw = p.yaw; q.y = q.gy = this.w.ground(q.x, q.z);
    q.vPref = p.vPref; q.fade = faded ? 0 : 1; q.fadeDir = faded ? 1 / 0.5 : 0;
    p.companion = q;
  }

  // ------------------------------------------------------------------------------------- step
  step(dt) {
    const w = this.w, r = this.r;
    this.t += dt;
    // population: spawn at a leaf (a house door or a street end) when below target
    let alive = 0; for (const p of this.people) if (p.alive) alive++;
    let budget = 3;
    while (alive < this.target && budget-- > 0) {
      const p = this.people.find((q) => !q.alive);
      if (!p) break;
      const leaf = this.leaves[Math.floor(r() * this.leaves.length)];
      this._place(p, leaf);
      const seen = w.inView(p.x, p.y + 0.9, p.z);
      if (seen) { p.fade = 0; p.fadeDir = 1 / 0.5; this.counters.spawnFaded++; } else { p.fade = 1; this.counters.spawnHidden++; }
      alive++;
      if (alive < this.target && p.age !== "child" && r() < this.groupShare) { this._companion(p, seen); alive++; }
    }
    if (alive > this.target) {
      let extra = alive - this.target;
      for (const p of this.people) { if (!extra) break; if (p.alive && !p.leaving) { p.leaving = true; extra--; } }
    }
    // neighbours (2 m grid): side-step / separation
    this._buildGrid();
    for (const p of this.people) if (p.alive) this._stepPerson(p, dt);
  }

  _remove(p) {
    const seen = this.w.inView(p.x, p.y + 0.9, p.z);
    if (seen) { p.fadeDir = -1 / 0.4; this.counters.removedFaded++; }       // fades out (a door, a tram door)
    else { p.alive = false; this.counters.removedHidden++; }
  }

  _buildGrid() {
    const g = this.grid; g.clear();
    for (const p of this.people) {
      if (!p.alive) continue;
      const k = (Math.floor(p.x / 2) * 73856093) ^ (Math.floor(p.z / 2) * 19349663);
      let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(p);
    }
  }
  _neighbours(p, fn) {
    const gx = Math.floor(p.x / 2), gz = Math.floor(p.z / 2);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const l = this.grid.get(((gx + i) * 73856093) ^ ((gz + j) * 19349663));
      if (l) for (const q of l) if (q !== p) fn(q);
    }
  }

  _stepPerson(p, dt) {
    const w = this.w, r = this.r;
    if (p.spotUntil && this.t > p.spotUntil) { p.spotUntil = 0; p.spot = null; }
    if (p.fadeDir) {
      p.fade = Math.min(1, Math.max(0, p.fade + p.fadeDir * dt));
      if (p.fade >= 1 && p.fadeDir > 0) p.fadeDir = 0;
      if (p.fade <= 0 && p.fadeDir < 0) { p.fadeDir = 0; p.alive = false; p.fade = 1; return; }
      if (p.fadeDir < 0) { p.v = 0; p.speed *= 0.8; return; }       // vanishing in a doorway: stands
    }
    if (p.dive) return this._diving(p, dt);
    if (p.leader) return this._follow(p, dt);
    if (p.standUntil && this.t < p.standUntil) { p.speed *= Math.max(0, 1 - dt * 8); p.v = 0; return; }   // standing up first
    // 1. the carrot: advance along the line while the person is within the look-ahead
    const look = 0.8;
    let hold = false;
    for (let guard = 0; guard < 4; guard++) {
      const c = this._carrot(p, _c);
      const d = Math.hypot(c.x - p.x, c.z - p.z);
      // (a person held at a node, standing at a spot away from it: a kerb queue, the tram platform, a pause, keeps
      // asking the node every frame, however far the spot is from the line's end)
      const end = p.dir > 0 ? p.edge.len : 0;
      if (!p.holding) {
        if (d > look) break;
        const room = (end - p.s) * p.dir;
        const stepS = look - d + 0.05;
        if (room > stepS) { p.s += stepS * p.dir; break; }
      }
      // at a node: decide what comes next
      const node = p.dir > 0 ? p.edge.b : p.edge.a;
      const go = this._atNode(p, node, dt);
      if (!go) { p.s = end; hold = true; p.holding = true; break; }
      p.holding = false;
    }
    // 2. steer toward the carrot (or the waiting spot)
    let tx, tz;
    if (p.spot) { tx = p.spot.x; tz = p.spot.z; } else { const c = this._carrot(p, _c); tx = c.x; tz = c.z; }
    const dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz);
    const stopping = hold || !!p.spot || p.state === "pause";
    const want = stopping ? Math.min(p.vPref, Math.max(0, dist - 0.05) * 1.6) : p.vPref * (p.leaving ? 1.05 : 1);
    p.v += (want - p.v) * Math.min(1, dt * (want < p.v ? 3.5 : 1.8));
    // separation: people within 0.65 m push apart (sideways mostly), passing slower ones on the left
    let sx = 0, sz = 0;
    this._neighbours(p, (q) => {
      const ex = p.x - q.x, ez = p.z - q.z, dd = ex * ex + ez * ez;
      if (dd < 0.42 && dd > 1e-6) { const k = (0.65 - Math.sqrt(dd)) / 0.65; sx += ex * k; sz += ez * k; }
    });
    // keep right for oncoming people (Mr.doob's side-step idea, his pedestrian-system.js:503-506): someone ahead within
    // 3.5 m, coming the other way, less than 0.7 m across -> drift 0.45 m to the right, then back
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    let oncoming = false;
    if (p.v > 0.3 && !p.spot) this._neighbours(p, (q) => {
      const ex = q.x - p.x, ez = q.z - p.z, ahead = ex * fx + ez * fz, across = Math.abs(ex * fz - ez * fx);
      if (ahead > 0 && ahead < 3.5 && across < 0.7 && Math.sin(q.yaw) * fx + Math.cos(q.yaw) * fz < -0.3) oncoming = true;
    });
    const dodgeT = oncoming ? -0.45 : 0;
    p.dodge = (p.dodge || 0) + Math.max(-0.35 * dt, Math.min(0.35 * dt, dodgeT - (p.dodge || 0)));
    let mx = 0, mz = 0;
    if (dist > 1e-3) { mx = (dx / dist) * Math.min(p.v * dt, dist); mz = (dz / dist) * Math.min(p.v * dt, dist); }
    mx += sx * dt * 0.8; mz += sz * dt * 0.8;
    const ox = p.x, oz = p.z;
    p.x += mx; p.z += mz;
    // 3. heading: where the body goes (smoothed: no person turns in one frame); standing: the face target
    const moving = Math.hypot(mx, mz) / Math.max(dt, 1e-4);
    let hdg = p.yaw;
    if (moving > 0.15 && dist > 0.12) hdg = Math.atan2(dx, dz);
    else if (p.face != null) hdg = p.face;
    const maxTurn = (moving > 0.3 ? 4.5 : 2.2) * dt;
    const dy = Math.max(-maxTurn, Math.min(maxTurn, wrap(hdg - p.yaw)));
    p.yaw = wrap(p.yaw + dy);
    p.turnRate += (dy / Math.max(dt, 1e-4) - p.turnRate) * Math.min(1, dt * 8);
    // speed along the ground (the clip phase advances by it), smoothed a little
    const sp = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-4);
    p.speed += (sp - p.speed) * Math.min(1, dt * 12);
    // ground: eased over kerbs for the baked people (the live rig steps them itself)
    const gy = w.ground(p.x, p.z);
    p.gy = gy; p.y += (gy - p.y) * Math.min(1, dt / 0.12);
    // glance (zebras): a short look left then right
    if (p.glance > 0) {
      p.glance -= dt;
      const t = 1.6 - p.glance;
      p.look = t < 0.6 ? 0.75 * Math.sin((t / 0.6) * Math.PI * 0.5) : t < 1.2 ? 0.75 * Math.cos(((t - 0.6) / 0.6) * Math.PI) : -0.75 * (1 - (t - 1.2) / 0.4);
      if (p.glance <= 0) p.look = 0;
    } else p.look *= Math.max(0, 1 - dt * 6);
    if (p.state === "pause") {
      p.timer -= dt;
      if (p.seat && !p.action && Math.hypot(p.x - p.spot.x, p.z - p.spot.z) < 0.12) p.action = p.seat;   // at the seat: sit
      if (p.timer <= 0) { p.state = "walk"; p.spot = null; p.face = null; if (p.action) { p.action = null; p.standUntil = this.t + 0.75; } p.seat = null; }
    }
    // conversations: a person standing still next to their companion for 1.5 s talks (Idle_Talking, UAL1); faces them
    const q = p.companion;
    if (q && q.alive && q.leader === p) {
      const still = p.speed < 0.1 && q.speed < 0.1 && !p.seat;
      p.talkT = still ? p.talkT + dt : 0;
      if (p.talkT > 1.5 && Math.hypot(q.x - p.x, q.z - p.z) < 1.6) { p.action = p.action || "talk"; p.face = Math.atan2(q.x - p.x, q.z - p.z); }
      else if (p.action === "talk") { p.action = null; if (!p.kerb && !p.spot) p.face = null; }
    }
  }

  /** A companion: walks beside (or, on a narrow line, behind) its leader, waits when the leader waits, talks to them
   *  when both stand, and leaves with them. */
  _follow(p, dt) {
    const L = p.leader;
    if (!L.alive || L.leader) { p.leader = null; this._enter(p, p.edge, p.dir > 0 ? p.edge.a : p.edge.b); return; }
    if (L.fadeDir < 0 && !p.fadeDir) { p.fadeDir = L.fadeDir; }
    const fx = Math.sin(L.yaw), fz = Math.cos(L.yaw);
    // the slot beside the leader, only if it stays on the leader's line (its width): else single file behind; a
    // held toddler always beside. A seated leader: the companion takes the free seat next to it, or stands by.
    const half = L.edge ? L.edge.width * 0.5 : 1;
    const offLine = L.edge && (L.edge.kind === "walk" || L.edge.kind === "path" || L.edge.kind === "cross" || L.edge.kind === "zebra" || L.edge.kind === "platform") && Math.abs((L.lane || 0) + p.side) > half;
    const narrow = !p.handHeld && L.speed > 0.3 && (offLine || (L.edge && L.edge.width < 1.4));
    const side = narrow ? 0 : p.side;
    let tx = L.x + fz * side - (narrow ? fx * 0.85 : 0), tz = L.z - fx * side - (narrow ? fz * 0.85 : 0);
    if (L.seat && L.spot) {
      if (!p.seatNode) {
        p.seatNode = this.w.graph.nodes.find((n) => n.sit && n !== L.seatNode && (!n.taken || !n.taken.alive || !n.taken.seat) && Math.hypot(n.x - L.spot.x, n.z - L.spot.z) < 1.6) || null;
        if (p.seatNode) p.seatNode.taken = p;
      }
      if (p.seatNode) { tx = p.seatNode.x; tz = p.seatNode.z; if (Math.hypot(tx - p.x, tz - p.z) < 0.12) { p.action = p.seatNode.sit; p.face = p.seatNode.face; } }
    } else if (p.seatNode) { p.seatNode = null; if (p.action && p.action.startsWith("sit")) { p.action = null; p.standUntil = this.t + 0.75; } }
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    const want = Math.min(2.2, L.speed + d * 1.2);
    p.v += (want - p.v) * Math.min(1, dt * 3);
    const step = Math.min(d, p.v * dt);
    const ox = p.x, oz = p.z;
    if (d > 1e-3) { p.x += (dx / d) * step; p.z += (dz / d) * step; }
    const moving = step / Math.max(dt, 1e-4) > 0.15;
    const talking = L.speed < 0.1 && p.speed < 0.15 && L.talkT > 1.5 && !p.handHeld && !p.seatNode;
    const seated = p.seatNode && p.action && p.action.startsWith("sit");
    const hdg = seated ? p.seatNode.face : talking ? Math.atan2(L.x - p.x, L.z - p.z) : moving && d > 0.15 ? Math.atan2(dx, dz) : L.yaw;
    const maxTurn = (moving ? 4.5 : 2.2) * dt, dy = Math.max(-maxTurn, Math.min(maxTurn, wrap(hdg - p.yaw)));
    p.yaw = wrap(p.yaw + dy);
    p.turnRate += (dy / Math.max(dt, 1e-4) - p.turnRate) * Math.min(1, dt * 8);
    const sp = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-4);
    p.speed += (sp - p.speed) * Math.min(1, dt * 12);
    if (!seated) p.action = talking ? "talk" : null;
    if (p.standUntil && this.t < p.standUntil) { p.x = ox; p.z = oz; }
    p.onCrossing = L.onCrossing;
    const gy = this.w.ground(p.x, p.z); p.gy = gy; p.y += (gy - p.y) * Math.min(1, dt / 0.12);
  }

  /** A dive away from a car coming fast (owner default: only at speed): 1.6 m sideways in 0.55 s, down for a moment,
   *  up again (Mr.doob's dive poses in the live band; further out, the bone table shows a quick side-step). */
  _diving(p, dt) {
    const D = p.dive, t = this.t - D.t0;
    p.diveTime = t;
    if (t < 0.55) { const k = dt / 0.55 * 1.6; p.x += D.dx * k; p.z += D.dz * k; }
    p.speed = t < 0.55 ? 2.9 : 0; p.v = 0;
    if (t > 2.6) { p.dive = null; p.diveTime = -1; }
  }
  /** Traffic asks: a car at speed is about to hit this person. */
  startDive(p, awayX, awayZ) {
    if (p.dive || !p.alive) return;
    const l = Math.hypot(awayX, awayZ) || 1;
    p.dive = { t0: this.t, dx: awayX / l, dz: awayZ / l }; p.yaw = Math.atan2(awayX, awayZ);
    this.counters.dives = (this.counters.dives || 0) + 1;
  }

  /** At a node: may the person go on? (false: wait here). Picks the next edge. */
  _atNode(p, node, dt) {
    const w = this.w, r = this.r, e0 = p.edge;
    // waiting for a crossing?
    if (p.kerb) return this._crossing(p, dt);
    if ((node.kind === "door" || node.kind === "end") && (p.leaving || r() < 0.08) && node.edges.length === 1) {
      this._remove(p); p.spot = { x: node.x, z: node.z }; return false;
    }
    if (node.kind === "pause" && p.state !== "pause" && !p._paused?.has(node.id) && r() < (node.pause ?? 0.4)) {
      if (node.taken && node.taken.alive && node.taken.seat && node.taken !== p) return this._pickNext(p, node, e0);   // seat taken
      if (node.sit && (p.pram || p.dog || p.family === "holdL")) return this._pickNext(p, node, e0);        // not with a pram / dog / toddler
      p.state = "pause"; p.timer = (node.minT ?? 3) + r() * ((node.maxT ?? 15) - (node.minT ?? 3));
      p.spot = node.sit ? { x: node.x, z: node.z } : { x: node.x + (r() - 0.5) * (node.spread ?? 1), z: node.z + (r() - 0.5) * (node.spread ?? 1) };
      if (node.sit) { p.seat = node.sit; node.taken = p; p.seatNode = node; }
      p.face = node.face ?? p.yaw;
      (p._paused ||= new Set()).add(node.id);
      return false;
    }
    if (p.state === "pause") return false;
    if (p._paused && p._paused.size > 6) p._paused.clear();
    if (node.kind === "board") return this._tram(p, node);
    return this._pickNext(p, node, e0);
  }
  _pickNext(p, node, e0) {
    const r = this.r;
    // choose the next edge: not back, weighted by kind
    const opts = node.edges.filter((e) => e !== e0);
    if (!opts.length) { this._enter(p, e0, node); return true; }               // dead end: turn round
    const wgt = opts.map((e) => (e.kind === "door" ? (p.leaving ? 6 : 0.03) : e.kind === "cross" || e.kind === "zebra" ? 0.7 : e.weight ?? 1));
    let k = r() * wgt.reduce((a, b) => a + b, 0), e = opts[0];
    for (let i = 0; i < opts.length; i++) { k -= wgt[i]; if (k <= 0) { e = opts[i]; break; } }
    if (e.kind === "cross" || e.kind === "zebra") {
      // queue at the kerb: a spot spread across the crossing's width, a little back from the kerb
      const into = e.a === node ? 1 : -1;
      const nx = -e.uz, nz = e.ux, lat = (r() - 0.5) * (e.width - 0.8), back = 0.25 + r() * 0.6;
      p.kerb = { e, node, into, t0: this.t, glanced: false };
      p.spot = { x: node.x + nx * lat - e.ux * into * back, z: node.z + nz * lat - e.uz * into * back };
      p.face = Math.atan2(e.ux * into, e.uz * into);
      p.delay = 0.2 + r() * 1.3;                               // reaction once WALK shows (his :54)
      p.redRunner = r() < this.redRunnerShare;
      return false;
    }
    this._enter(p, e, node);
    return true;
  }
  _enter(p, e, node) {
    p.edge = e; p.dir = e.a === node ? 1 : -1; p.s = p.dir > 0 ? 0 : e.len;
    p.onCrossing = e.kind === "cross" || e.kind === "zebra" ? e : null;
    if (e.kind !== "cross" && e.kind !== "zebra") p.lane = Math.max(-e.width * 0.3, Math.min(e.width * 0.3, p.lane));
  }
  _crossing(p, dt) {
    const k = p.kerb, w = this.w, e = k.e;
    const arrived = Math.hypot(p.x - p.spot.x, p.z - p.spot.z) < 0.35;
    if (!arrived) return false;
    let go = false;
    if (e.kind === "cross") {
      const s = w.signal.walk(e.signal, this.t);
      if (s === "walk") { k.walkFor = (k.walkFor || 0) + dt; go = k.walkFor > p.delay; }
      else {
        k.walkFor = 0;
        // a rare red-light runner: only with no car near on the crossed street
        if (p.redRunner && this.t - k.t0 > 2 && w.carsNear(e, k.node).clear) { go = true; this.counters.redRunners++; }
      }
      if (go && s !== "walk") this.counters.redCrossings++;
    } else {
      // zebra: pedestrian priority; a glance left and right first, then cross once the cars can stop
      if (!k.glanced) { k.glanced = true; p.glance = 1.6; return false; }
      if (p.glance > 0) return false;
      go = w.carsNear(e, k.node).canGo;
    }
    if (!go) return false;
    const lat = p.spot;
    p.kerb = null; p.spot = null; p.face = null;
    this._enter(p, e, k.node);
    // keep the queue spot's spread across the crossing as the walking lane
    const nx = -e.uz, nz = e.ux;
    p.lane = ((lat.x - k.node.x) * nx + (lat.z - k.node.z) * nz) * p.dir;
    return true;
  }
  _tram(p, node) {
    const tram = this.w.tram;
    // wait on the platform (spread out, facing the track) until the tram stands; then to a door, then fade
    if (!p.tramWait) {
      p.tramWait = true;
      p.spot = { x: node.x + (this.r() - 0.5) * (node.spreadX ?? 1.5), z: node.z + (this.r() - 0.5) * (node.spreadZ ?? 30) };
      p.face = node.face ?? 0;
      return false;
    }
    if (tram?.docked) {
      const door = tram.doors.reduce((a, d) => (Math.hypot(d.x - p.x, d.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? d : a));
      if (!p.boarding) { p.boarding = true; p.spot = { x: door.x, z: door.z }; p.face = null; }
      if (Math.hypot(p.x - door.x, p.z - door.z) < 0.4) { p.tramWait = false; p.boarding = false; this.counters.boarded++; p.fadeDir = -1 / 0.35; this.counters.removedFaded++; }
      return false;
    }
    if (p.boarding) { p.boarding = false; p.spot = { x: node.x, z: node.z }; }
    return false;
  }
  /** Alighting: a person appears at a tram door (dithered fade-in) and walks off along the platform line. */
  alight(door, toNode) {
    const p = this.people.find((q) => !q.alive);
    if (!p) return;
    this._place(p, null);
    const e = toNode.edges[0];
    p.edge = e; p.dir = e.a === toNode ? 1 : -1; p.s = p.dir > 0 ? 0 : e.len;
    p.x = door.x; p.z = door.z; p.y = p.gy = this.w.ground(p.x, p.z); p.yaw = door.face ?? 0;
    p.fade = 0; p.fadeDir = 1 / 0.35; p.spot = { x: toNode.x + (this.r() - 0.5) * 1.5, z: door.z }; p.state = "walk";
    p.spotUntil = this.t + 1.5; this.counters.alighted++; this.counters.spawnFaded++;
  }
}
const _c = { x: 0, z: 0 };
