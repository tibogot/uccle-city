// THE POLICE JOBS (docs/POLICE_GAME.md "Missions"): data missions for the game kit (viewer/game/missions.js), built by
// factories from REAL places at call time:
//   tram       a car parked on the tram 92 rails at a real stop (Place Saint-Job first): the trams of the line stop
//              behind it (viewer/tramline.js setBlock); go, stop by it, E: the driver moves it (it drives off into
//              the traffic), the trams roll again
//   speed      a speed check at a real speed-limit sign (data/game/police_spots.json: the street kit's C43 / F4a signs):
//              park, the radar reads the passing cars, one speeds: lights on, pull it over (it slows to a stop on the
//              right), E: talk to the driver (the fine)
//   accident   two damaged cars at a real junction (OSM, two named through roads): arrive, park near it with the blue
//              lights on, place 3 cones (E), hold the scene until the cars are cleared, pick the cones up
//   stolen     a stolen car in the traffic: get near, it FLEES (viewer/traffic/trafficSim.js ctl 1: faster, overtakes,
//              runs lights, turns away from you); stay on its bumper / box it in until it gives up; E: arrest.
//              Ramming costs score; 4 rams = failed.
// Each factory: (G, kit, rng) -> a dispatch call { priority, from, icon, text, mission } or null (no fitting place).
import { TrafficCarTarget } from "../game/entities.js";
import { hazard } from "./props.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const metres = (d) => (d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d / 5) * 5} m`);
const CAR_KIND = 6;                       // (viewer/traffic/cityTraffic.js: the traffic cars' collider kind)
const REP_LIGHTS = "switch the blue lights on (L)";

/** the drive time budget for d metres in town (~8.5 m/s average over the street route) + a margin */
export const driveTime = (d, k = 1) => Math.round((Math.max(200, d) * 1.45 / 8.5 + 45) * k / 5) * 5;

/** a traffic car as a mission entity, its control (flee / pull over) reset when the mission lets it go */
export function adopt(T, i) {
  const e = new TrafficCarTarget(T, i), rel = e.release.bind(e), sim = T.sim, gen = sim.gen[i];
  e.release = () => { if (sim.gen[i] === gen) { sim.ctl[i] = 0; sim.speedF[i] = 1; } rel(); };
  e.idx = i;
  return e;
}
/** a scene entity: holds a job's props / blocks and undoes them at the mission's end, whatever the end */
function sceneEntity(x, z, setup, cleanup) {
  const e = { alive: true, x, z, y: 0, speed: 0, heading: 0, travelled: 0, label: "the scene", data: {} };
  e.update = () => {};
  e.release = () => { if (!e.alive) return; e.alive = false; try { cleanup(e); } catch (err) { console.warn(err); } };
  try { setup(e); } catch (err) { console.warn(err); }
  return e;
}

// ------------------------------------------------------------------------------------------------ (a) tram line
export function tramJob(G, kit, rng) {
  const tl = G.tram();
  if (!tl) return null;
  const P = kit.player, stops = kit.places.all.filter((p) => p.group === "stop" && dist(p, P) > 250 && dist(p, P) < 2600);
  if (!stops.length) return null;
  // Place Saint-Job first (the owner's example), then any stop
  const sj = stops.filter((s) => /SAINT-JOB/i.test(s.name) && !/GARE/i.test(s.name));
  const st = (G.done.tram || 0) === 0 && sj.length ? sj[Math.floor(rng() * sj.length)] : stops[Math.floor(rng() * stops.length)];
  const tk = tl.trackNear(st.x, st.z, 30);
  if (!tk) return null;
  const at = tl.shapePoint(tk.shape, tk.d + 16) || tk;               // 16 m past the stop: the tram stands at its platform behind it
  const h = at.heading, rx = -Math.cos(h), rz = Math.sin(h);         // (right = -(cos h, -sin h))
  const car = { x: at.x + rx * 0.7, z: at.z + rz * 0.7, heading: h + 0.12 };
  const name = st.name.replace(/\s*\(tram 92\)/, "").toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
  const D = dist(car, P), T = driveTime(D);
  const types = ["hatch_s", "hatch_c", "saloon", "suv"], paints = [0x8a1414, 0xb9bcc0, 0x24483a, 0x1d3f6e, 0xd8d4c8];
  const mission = {
    id: "police-tram", title: `Car on the tram line: ${name}`, giver: { name: "Dispatch", icon: "radio" },
    brief: `A car is parked on the tram rails at ${name}. Tram 92 is stuck behind it. Go and get it moved.`,
    steps: [
      { type: "reach", target: [car.x, car.z, `${name} (the rails)`], radius: 32, time: T, text: "Drive to the blocked tram line at {target}",
        entity: { id: "scene", kind: "custom", make: () => sceneEntity(car.x, car.z, (e) => {
          e.data.car = G.props.addCar({ ...car, type: types[Math.floor(rng() * types.length)], paint: paints[Math.floor(rng() * paints.length)] });
          e.data.block = tl.setBlock({ x: car.x, z: car.z, heading: null, r: 4.6, gap: 7 });
        }, (e) => { tl.setBlock(null); if (e.data.car && G.props.cars.includes(e.data.car)) G.props.removeCar(e.data.car); }) } },
      { type: "stay", target: [car.x, car.z, "the car on the rails"], radius: 13, seconds: 2, maxSpeed: 6, time: 60, text: "Stop next to the car on the rails",
        radio: { from: "Tram 92 driver", icon: "person", text: "I've been waiting here for ages! It's that car right in front of me." } },
      { type: "interact", target: [car.x, car.z, "the car"], radius: 13, prompt: "Find the driver and get the car moved", time: 60, text: "Get the car off the rails",
        onDone: (c) => c.say("Driver", "Sorry, sorry! I was just picking up bread. I'm moving it now!", { icon: "person" }) },
      { type: "custom", text: "The car leaves the rails", marker: false,
        check: (c) => {
          const e = c.entities.scene;
          if (c.stepT > 2.5 && e?.data.car && !c.vars.gone) {
            c.vars.gone = true;
            if (G.props.driveOff(e.data.car) < 0) G.props.removeCar(e.data.car);    // (no lane found: towed off-screen? keep simple)
            e.data.car = null;
          }
          if (c.stepT > 6 && !c.vars.free) { c.vars.free = true; G.tram()?.setBlock(null); c.say("Tram 92 driver", "Merci! We're moving again.", { icon: "person" }); }
          return c.stepT > 8;
        },
        status: (c) => ({ line: c.vars.free ? "the trams roll again" : "the car pulls away…", progress: Math.min(1, c.stepT / 8) }) },
    ],
    reward: { score: 120, money: 40, rep: 2 }, timeBonus: { under: Math.round(T * 0.55), score: 40 }, failRep: 1,
  };
  return { priority: 2, from: "Dispatch", icon: "radio", text: `Tram 92 blocked at ${name}: a car parked on the rails. ${metres(D)} away. Get it moved.`, mission };
}

// ------------------------------------------------------------------------------------------------ (b) speed check
export function speedJob(G, kit, rng) {
  const P = kit.player, all = (G.spots?.speed || []).filter((s) => kit.places.inBuilt(s.x, s.z) && dist(s, P) > 250 && dist(s, P) < 2200);
  if (!all.length) return null;
  const good = all.filter((s) => s.hw !== "residential" && s.hw !== "unclassified");
  const pool = good.length ? good : all;
  const s = pool[Math.floor(rng() * pool.length)];
  const D = dist(s, P), T = driveTime(D), lim = s.limit;
  const mission = {
    id: "police-speed", title: `Speed check: ${s.street}`, giver: { name: "Dispatch", icon: "radio" },
    brief: `Residents complain about speeding in ${s.street} (limit ${lim}). Set up a speed check by the sign.`,
    steps: [
      { type: "reach", target: [s.x, s.z, `the ${lim} sign, ${s.street}`], radius: 28, time: T, text: "Drive to {target}" },
      { type: "stay", target: [s.x, s.z, `the ${lim} sign`], radius: 30, seconds: 3, maxSpeed: 2, text: `Park near the ${lim} sign and stop`, time: 90 },
      { type: "custom", text: `Radar on: check the passing cars (limit ${lim})`, marker: false, time: 150, timeFail: "no speeder came by: try another street",
        onStart: (c) => { c.vars.seen = new Map(); c.vars.n = 0; c.vars.last = null; c.vars.sp = -1; c.vars.at = { x: c.player.x, z: c.player.z }; },
        check: (c) => {
          const T = G.traffic(), sim = T?.sim;
          if (!sim) return "fail: no traffic";
          const at = c.vars.at, seen = c.vars.seen;
          if (dist(c.player, at) > 35) return "fail: you left the check point";
          // each car within 40 m: its closest approach; when it moves away again, it is measured
          for (let i = 0; i < sim.cap; i++) {
            if (!sim.alive[i] || sim.state[i] !== 0) continue;
            const d = Math.hypot(sim.x[i] - at.x, sim.z[i] - at.z), key = i * 4096 + (sim.gen[i] & 4095);
            const r = seen.get(key);
            if (d > 42) { if (r && !r.done && r.min < 22) { r.done = true; } continue; }
            if (!r) { seen.set(key, { min: d, v: sim.v[i], done: false }); continue; }
            if (r.done) continue;
            if (d < r.min) r.min = d;
            if (sim.v[i] > r.v) r.v = sim.v[i];                                // (the radar: its top speed in range)
            else if (d > r.min + 4 && r.min < 22) {
              r.done = true; c.vars.n++;
              const kmh = Math.round(r.v * 3.6); c.vars.last = kmh;
              if (i === c.vars.sp || kmh > lim + 9) {
                c.vars.flag = { i, kmh };
              }
            }
          }
          // after 2 cars (or 20 s): one driver comes too fast (a car 70-220 m away heading this way)
          if (c.vars.sp < 0 && (c.vars.n >= 2 || c.stepT > 12)) {
            let best = -1, bs = 1e9;
            for (let i = 0; i < sim.cap; i++) {
              if (!sim.alive[i] || sim.state[i] !== 0 || sim.keep[i] || sim.ctl[i] || sim.types[sim.type[i]]?.two) continue;
              const dx = at.x - sim.x[i], dz = at.z - sim.z[i], d = Math.hypot(dx, dz);
              if (d < 70 || d > 220) continue;
              const toward = (Math.sin(sim.yaw[i]) * dx + Math.cos(sim.yaw[i]) * dz) / d;
              if (toward < 0.75) continue;
              if (d < bs) { bs = d; best = i; }
            }
            if (best >= 0) { c.vars.sp = best; sim.speedF[best] = lim <= 30 ? 1.95 : 1.5; c.entities.speeder = adopt(T, best); c.entities.speeder.label = `${c.entities.speeder.colour} ${c.entities.speeder.model}`; }
          }
          if (c.vars.sp >= 0 && c.entities.speeder && !c.entities.speeder.alive) { c.vars.sp = -1; c.entities.speeder = null; }
          if (c.vars.flag && c.vars.flag.i === c.vars.sp) {
            c.vars.kmh = c.vars.flag.kmh;
            c.say("Radar", `${c.vars.kmh} km/h in a ${lim} zone! The ${c.entities.speeder.label}. Pull it over.`, { icon: "car", urgent: true });
            return true;
          }
          c.vars.flag = null;
          return false;
        },
        status: (c) => ({ line: `${c.vars.n} car${c.vars.n === 1 ? "" : "s"} checked${c.vars.last != null ? ` · last ${c.vars.last} km/h` : ""}` }) },
      { type: "custom", target: "@speeder", text: "Pull over the {entity}: blue lights on, get close behind it", time: 120,
        check: (c) => {
          const e = c.entity, sim = G.traffic()?.sim;
          if (!e || !e.alive || !sim) return "fail: the speeder got away";
          const d = dist(c.player, e);
          c.vars._far = d > 260 ? (c.vars._far || 0) + c.dt : 0;
          if (c.vars._far > 12) return "fail: you lost the speeder";
          if (sim.ctl[e.idx] === 3) return true;
          if (sim.ctl[e.idx] === 2) return false;
          const behind = (Math.sin(e.heading) * (e.x - c.player.x) + Math.cos(e.heading) * (e.z - c.player.z)) > 0;
          c.vars._hold = d < 18 && behind && G.car.lightsOn && c.stepT > 3 ? (c.vars._hold || 0) + c.dt : 0;
          if (c.vars._hold > 2) { sim.ctl[e.idx] = 2; c.say("Dispatch", "It's pulling over.", {}); }
          return false;
        },
        status: (c) => {
          const e = c.entity; if (!e) return null;
          const d = dist(c.player, e), sim = G.traffic()?.sim;
          if (sim && sim.ctl[e.idx] === 2) return { line: "it pulls over…" };
          return { line: !G.car.lightsOn ? REP_LIGHTS : d > 18 ? `${metres(d)}: close in behind it` : "stay behind it…", progress: Math.min(1, (c.vars._hold || 0) / 2) };
        } },
      { type: "custom", target: "@speeder", text: "Stop behind it and talk to the driver", time: 90,
        check: (c) => {
          const e = c.entity; if (!e || !e.alive) return "fail: the speeder got away";
          const d = dist(c.player, e);
          c.prompt = d < 13 && c.player.speed < 1.5 ? "Talk to the driver" : null;
          if (c.prompt && c.kit.consumeUse()) {
            const over = c.vars.kmh - lim, fine = over > 30 ? 0 : 53 + Math.max(0, over - 10) * 11;
            c.say("Driver", "I didn't see the sign, officer…", { icon: "person" });
            c.say("You", fine ? `${c.vars.kmh} in a ${lim}: that's a €${fine} fine. Drive carefully.` : `${c.vars.kmh} in a ${lim}: your licence goes to the prosecutor.`, { icon: "police" });
            return true;
          }
          return false;
        },
        status: (c) => { const e = c.entity; return e ? { line: dist(c.player, e) < 13 ? (c.player.speed < 1.5 ? "" : "stop the car") : metres(dist(c.player, e)) } : null; } },
    ],
    reward: { score: 160, money: 60, rep: 2 }, failRep: 1,
  };
  return { priority: 3, from: "Dispatch", icon: "radio", text: `Speed check in ${s.street} (limit ${lim}): residents complain. ${metres(D)} away.`, mission };
}

// ------------------------------------------------------------------------------------------------ (c) accident
export function accidentJob(G, kit, rng) {
  const P = kit.player;
  let all = (G.spots?.junction || []).filter((j) => kit.places.inBuilt(j.x, j.z) && dist(j, P) > 300 && dist(j, P) < 2200);
  if (!all.length) return null;
  const busy = all.filter((j) => j.main >= 2);
  if (busy.length) all = busy;
  const j = all[Math.floor(rng() * all.length)];
  const D = dist(j, P), T = driveTime(D, 0.9);
  const scene = { x: j.x, z: j.z, cones: [[j.x, j.z], [j.x, j.z], [j.x, j.z]], ready: false };
  const setup = async (e) => {
    const map = kit.host.getMap();
    // a road point and its direction (forward = (sin h, cos h)), turned to agree with `ref` when given
    const snap = async (x, z, ref = null) => {
      const r = map ? await map.client.request({ type: "snap", x, z, maxD: 30 }) : { none: true };
      if (r.none) return { x, z, h: ref ?? 0 };
      let h = Math.PI / 2 - r.yaw;
      if (ref != null && Math.cos(h - ref) < 0) h += Math.PI;
      return { x: r.x, z: r.z, h };
    };
    const J = await snap(j.x, j.z);
    if (!e.alive) return;
    const h = J.h, fx = Math.sin(h), fz = Math.cos(h);
    // car A just past the junction on the right lane, askew; car B rammed into its left side
    const A = await snap(j.x + fx * 6, j.z + fz * 6, h);
    if (!e.alive) return;
    const ha = A.h + 0.3, ra = [-Math.cos(A.h), Math.sin(A.h)];
    const ax = A.x + ra[0] * 1.5, az = A.z + ra[1] * 1.5;
    const la = [Math.cos(ha), -Math.sin(ha)];
    const types = ["hatch_c", "saloon", "estate", "hatch_s"], ta = types[Math.floor(rng() * 4)], tb = types[(types.indexOf(ta) + 1 + Math.floor(rng() * 3)) % 4];
    const bx = ax + la[0] * 3.05, bz = az + la[1] * 3.05, hb = Math.atan2(-la[0], -la[1]) + 0.32;
    e.data.a = G.props.addCar({ x: ax, z: az, heading: ha, type: ta, paint: [0xb9bcc0, 0xd8d4c8, 0x1d3f6e][Math.floor(rng() * 3)], damage: { sx: 1, sz: 1, depth: 0.18 } });
    e.data.b = G.props.addCar({ x: bx, z: bz, heading: hb, type: tb, paint: [0x8a1414, 0x24483a, 0x34383d][Math.floor(rng() * 3)], damage: { sx: 1, sz: 1, depth: 0.22 } });
    scene.x = ax; scene.z = az; e.x = ax; e.z = az;
    // the cones: on the road behind the scene (the way the traffic comes), a taper from the kerb out over its lane
    const back = await Promise.all([12, 18, 24].map((b) => snap(A.x - Math.sin(A.h) * b, A.z - Math.cos(A.h) * b, A.h)));
    if (!e.alive) return;
    scene.cones = back.map((q, k) => { const off = 2.7 - k * 0.65; return [q.x - Math.cos(q.h) * off, q.z + Math.sin(q.h) * off]; });
    scene.ready = true;
  };
  const coneStep = (k) => ({ type: "interact", target: () => [scene.cones[k][0], scene.cones[k][1], `cone spot ${k + 1}`], radius: 6, snap: false, time: 60,
    prompt: `Place cone ${k + 1} of 3`, text: `Place the cones behind the scene (${k + 1} / 3)`,
    onDone: () => G.props.setCones(scene.cones.slice(0, k + 1)) });
  const mission = {
    id: "police-accident", title: `Accident: ${j.name}`, giver: { name: "Dispatch", icon: "radio" },
    brief: `Collision at ${j.name}: two cars, nobody hurt, the junction is blocked. Lights and siren!`,
    steps: [
      { type: "reach", target: () => [scene.x, scene.z, j.name], radius: 40, time: T, text: "Drive to the accident at {target}",
        entity: { id: "scene", kind: "custom", make: () => sceneEntity(j.x, j.z, (e) => { setup(e); hazard.value = 1; G.hazard = true; },
          () => { G.hazard = false; G.props.clear(); }) } },
      { type: "custom", target: () => [scene.x, scene.z, "the scene"], text: "Park near the scene with the blue lights on", time: 60,
        check: (c, dt) => {
          const d = dist(c.player, scene), ok = d < 26 && c.player.speed < 0.6 && G.car.lightsOn;
          c.vars._p = ok ? (c.vars._p || 0) + dt : 0;
          return c.vars._p >= 2.5;
        },
        status: (c) => { const d = dist(c.player, scene); return { line: d >= 26 ? metres(d) : !G.car.lightsOn ? REP_LIGHTS : c.player.speed >= 0.6 ? "stop the car" : "parked…", progress: Math.min(1, (c.vars._p || 0) / 2.5) }; } },
      coneStep(0), coneStep(1), coneStep(2),
      { type: "custom", target: () => [scene.x, scene.z, "the scene"], text: "Secure the scene until it is cleared (blue lights on)", time: 90, marker: false,
        radio: { from: "Dispatch", text: "Tow truck and a patrol for the statements are on the way. Keep the scene safe." },
        check: (c, dt) => {
          const ok = dist(c.player, scene) < 45 && G.car.lightsOn;
          c.vars._s = (c.vars._s || 0) + (ok ? dt : 0);
          return c.vars._s >= 16;
        },
        status: (c) => ({ line: !G.car.lightsOn ? REP_LIGHTS : dist(c.player, scene) >= 45 ? "stay with the scene" : "statements, photos…", progress: Math.min(1, (c.vars._s || 0) / 16) }) },
      { type: "custom", text: "The cars are cleared", marker: false,
        onStart: (c) => c.say("Driver", "Both cars still drive. We'll sort out the paperwork. Thank you, officer!", { icon: "person" }),
        check: (c) => {
          const e = c.entities.scene;
          if (c.stepT > 1.5 && e?.data.a) { if (G.props.driveOff(e.data.a) < 0) G.props.removeCar(e.data.a); e.data.a = null; }
          if (c.stepT > 4.5 && e?.data.b) { if (G.props.driveOff(e.data.b) < 0) G.props.removeCar(e.data.b); e.data.b = null; hazard.value = 0; G.hazard = false; }
          return c.stepT > 6;
        },
        status: (c) => ({ progress: Math.min(1, c.stepT / 6) }) },
      { type: "interact", target: () => [scene.cones[1][0], scene.cones[1][1], "the cones"], radius: 9, snap: false, time: 60, prompt: "Pick up the cones", text: "Pick the cones up",
        onDone: () => G.props.setCones([]) },
    ],
    reward: { score: 200, money: 70, rep: 3 }, timeBonus: { under: Math.round(T * 0.5) + 120, score: 50 }, failRep: 2,
  };
  return { priority: 1, from: "Dispatch", icon: "radio", urgent: true, text: `Accident at ${j.name}, the junction is blocked. ${metres(D)} away. Lights and siren!`, mission };
}

// ------------------------------------------------------------------------------------------------ (d) stolen car
export function stolenJob(G, kit) {
  const mission = {
    id: "police-stolen", title: "Stolen car", giver: { name: "Dispatch", icon: "radio" },
    brief: "A car reported stolen this morning was just seen near you. Find it. When it runs: stay on it, box it in. No ramming.",
    timeLimit: 330,
    steps: [
      { type: "custom", target: "@stolen", text: "Find the stolen {entity}", time: 120,
        entity: { id: "stolen", kind: "custom", missing: "no car in sight: try again on a busier street", make: (k) => {
          const T = G.traffic(), sim = T?.sim; if (!sim) return null;
          const t = k.spawnEntity({ kind: "trafficCar", min: 90, max: 320 });
          if (!t) return null;
          t.release(); return adopt(T, t.i);
        } },
        onStart: (c) => { G.rams = 0; c.vars.hits = G.hits(); },
        check: (c) => {
          const e = c.entity; if (!e || !e.alive) return "fail: the car disappeared";
          if (dist(c.player, e) < 48) {
            const sim = G.traffic().sim; sim.ctl[e.idx] = 1;
            c.say("Dispatch", `It has seen you! The ${e.label} is running. Stay on it!`, { urgent: true });
            return true;
          }
          return false;
        },
        status: (c) => (c.entity ? { line: metres(dist(c.player, c.entity)) } : null) },
      { type: "custom", target: "@stolen", text: "Chase the {entity}: stay on its bumper or box it in", time: 220,
        onStart: (c) => { c.vars.held = 0; c.vars.far = 0; },
        check: (c, dt) => {
          const e = c.entity, sim = G.traffic()?.sim;
          if (!e || !e.alive || !sim) return "fail: you lost it";
          sim.chaser.x = c.player.x; sim.chaser.z = c.player.z;
          const d = dist(c.player, e);
          // ramming: a hit on a traffic car near the target
          const h = G.hits();
          if (h && h !== c.vars.hits && h.kind === CAR_KIND && h.speed > 3) {
            G.rams++;
            c.say("Dispatch", G.rams >= 4 ? "That's enough damage. Abort!" : "Easy! No ramming, we want the car back in one piece.", { urgent: G.rams >= 3 });
          }
          c.vars.hits = h;
          if (G.rams >= 4) return "fail: too many crashes";
          c.vars.far = d > 230 ? c.vars.far + dt : 0;
          if (c.vars.far > 10) return "fail: you lost it";
          // close behind it, or boxed in (slow, you next to it)
          const boxed = e.speed < 2.5 && d < 9;
          if (d < 12 || boxed) c.vars.held += dt * (boxed ? 1.6 : 1);
          else c.vars.held = Math.max(0, c.vars.held - dt * 0.5);
          if (c.vars.held >= 6) { sim.ctl[e.idx] = 2; c.say("Dispatch", "It's giving up. It pulls over.", {}); return true; }
          return false;
        },
        status: (c) => {
          const e = c.entity; if (!e) return null;
          const d = dist(c.player, e);
          c.warn = d > 120;
          return { line: c.vars.far > 0 ? `losing it! ${Math.ceil(10 - c.vars.far)} s` : d < 12 ? "on its bumper…" : metres(d), progress: Math.min(1, c.vars.held / 6) };
        } },
      { type: "custom", target: "@stolen", text: "Arrest the driver", time: 60,
        check: (c) => {
          const e = c.entity, sim = G.traffic()?.sim; if (!e || !e.alive) return "fail: it got away";
          const d = dist(c.player, e), stopped = sim.ctl[e.idx] === 3;
          c.prompt = stopped && d < 13 && c.player.speed < 1.5 ? "Arrest the driver" : null;
          if (c.prompt && c.kit.consumeUse()) {
            c.say("You", "Police! Hands where I can see them. You're under arrest.", { icon: "police" });
            const pen = Math.min(200, G.rams * 40);
            c.mission.def.reward = { score: Math.max(60, 280 - pen), money: 110, rep: G.rams >= 2 ? 2 : 4 };
            return true;
          }
          return false;
        },
        status: (c) => { const e = c.entity, sim = G.traffic()?.sim; if (!e || !sim) return null; return { line: sim.ctl[e.idx] !== 3 ? "it slows down…" : dist(c.player, e) >= 13 ? "get next to it" : c.player.speed >= 1.5 ? "stop the car" : "" }; } },
    ],
    reward: { score: 280, money: 110, rep: 4 }, failRep: 2,
  };
  return { priority: 1, from: "Dispatch", icon: "radio", urgent: true, text: "A stolen car was just seen near you. Find it and stop it.", mission };
}

export const JOBS = { tram: tramJob, speed: speedJob, accident: accidentJob, stolen: stolenJob };
