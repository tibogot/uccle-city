// MISSIONS (docs/GAMEKIT.md "Writing a mission"): a mission is DATA: a plain object with steps; the runner below is a
// small state machine that plays it. No mission code lives in the kit: games add missions as objects (or factories
// that return one, for random calls).
//
//   {
//     id: "demo-rush", title: "Rush to Place Saint-Job", giver: { name: "Dispatch", icon: "radio" },
//     brief: "Shown on the radio when the mission starts.",
//     start: { at: "observatory" | [x, z], mode: "drive" | "walk" | "third" | "fly" | "moto" | ..., face: [x, z] },  (optional spawn)
//     timeLimit: 300,                       (optional, s, the whole mission)
//     reward: { score: 100, money: 50, rep: 1 }, timeBonus: { under: 60, score: 50 },   (optional)
//     steps: [ { type: "reach", target: "stjob", radius: 25, time: 90, text: "Drive to {target}" }, ... ],
//   }
//
// Step types (OBJECTIVES below), common fields:
//   type, text ("{target}" = the target's name, "{entity}" = the entity's label), time (s: fail when it runs out),
//   radio: { from, text, urgent } (said when the step starts), marker (default true), route (default true for places),
//   target: a place spec (gamePlaces.js resolve: "stjob", "shop:osm:n123", [x, z], (kit) => spec) or "@<entity id>",
//   entity: { id, kind: "trafficCar", min, max } (created when the step starts; the mission keeps it till the end),
//   onStart(ctx), onDone(ctx), failIf(ctx) -> reason | false
//   reach     radius, maxSpeed (km/h, optional: arrive slowly)
//   stay      radius, seconds, maxSpeed (km/h, optional): stay inside N s (leaving resets / pauses: reset: true | false)
//   follow    target "@id", near (m, default 60), lose (m, default 140), loseTime (s, 8), seconds | distance | until: "arrive"
//   catch     target "@id", radius (m, 7), hold (s, 1.5): stay that close for `hold` seconds
//   interact  radius (m, 6), prompt ("talk to the owner"): E within the radius
//   wait      seconds (a pause in the story: radio chatter)
//   custom    check(ctx, dt) -> true (done) | false | "fail: reason" ; status(ctx) -> { line, progress }
// ctx = { kit, mission, step, vars, entities, player, dt, t (mission s), stepT (step s), say(from, text), fail(reason) }
const fmtTarget = (s, ctx) => s.replace(/\{target\}/g, ctx.target?.name || "the marker").replace(/\{entity\}/g, ctx.entity?.label || "the target");
const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);
const metres = (d) => (d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d / 5) * 5} m`);

export const OBJECTIVES = {
  reach: {
    tick(c) {
      const d = dist(c.player, c.target);
      c.line = metres(d);
      if (d > (c.step.radius ?? 20)) return false;
      if (c.step.maxSpeed != null && c.player.speed * 3.6 > c.step.maxSpeed) { c.line = `slow down (under ${c.step.maxSpeed} km/h)`; return false; }
      return true;
    },
  },
  stay: {
    tick(c, dt) {
      const s = c.step, d = dist(c.player, c.target), inside = d <= (s.radius ?? 15) && (s.maxSpeed == null || c.player.speed * 3.6 <= s.maxSpeed);
      c.vars._held = inside ? (c.vars._held || 0) + dt : s.reset === false ? c.vars._held || 0 : 0;
      c.progress = Math.min(1, c.vars._held / (s.seconds || 5));
      c.line = inside ? `hold ${Math.ceil((s.seconds || 5) - c.vars._held)} s` : d > (s.radius ?? 15) ? metres(d) : `slow down (under ${s.maxSpeed} km/h)`;
      return c.progress >= 1;
    },
  },
  follow: {
    tick(c, dt) {
      const s = c.step, e = c.entity;
      if (!e) return "fail: the target is gone";
      if (!e.alive) return e.arrived ? true : "fail: you lost the target";   // parked at its destination = done
      const d = dist(c.player, e), near = s.near ?? 60, lose = s.lose ?? 140;
      c.vars._far = d > lose ? (c.vars._far || 0) + dt : 0;
      if (c.vars._far > (s.loseTime ?? 8)) return "fail: you lost the target";
      c.warn = d > near;
      c.vars._kept = (c.vars._kept || 0) + (d <= lose ? dt : 0);
      const goal = s.seconds ? c.vars._kept / s.seconds : s.distance ? e.travelled / s.distance : null;
      c.progress = goal == null ? null : Math.min(1, goal);
      c.line = d > lose ? `losing it! ${Math.ceil((s.loseTime ?? 8) - c.vars._far)} s` : d > near ? `${metres(d)}: too far, close in` : `${metres(d)} behind`;
      if (d < (s.tooClose ?? 0)) { c.line = "too close: they will spot you"; c.warn = true; }
      return goal != null && goal >= 1;
    },
  },
  catch: {
    tick(c, dt) {
      const s = c.step, e = c.entity;
      if (!e || !e.alive) return "fail: the target got away";
      const d = dist(c.player, e);
      c.vars._held = d <= (s.radius ?? 7) ? (c.vars._held || 0) + dt : 0;
      c.progress = Math.min(1, c.vars._held / (s.hold ?? 1.5));
      c.line = d <= (s.radius ?? 7) ? "stay on it…" : metres(d);
      if (s.lose && d > s.lose) return "fail: the target got away";
      return c.progress >= 1;
    },
  },
  interact: {
    tick(c) {
      const d = dist(c.player, c.target), inside = d <= (c.step.radius ?? 6);
      c.line = inside ? "" : metres(d);
      c.prompt = inside ? c.step.prompt || "interact" : null;
      if (inside && c.kit.consumeUse()) return true;
      return false;
    },
  },
  wait: { tick(c) { c.progress = Math.min(1, c.stepT / (c.step.seconds || 3)); c.line = ""; return c.stepT >= (c.step.seconds || 3); } },
  custom: {
    tick(c, dt) { const r = c.step.check ? c.step.check(c, dt) : false; const st = c.step.status?.(c); if (st) { c.line = st.line ?? c.line; c.progress = st.progress ?? c.progress; } return r; },
  },
};

/** plays one mission: start() -> tick(dt) at the kit's logic rate -> "success" | "fail" */
export class MissionRunner {
  constructor(kit, def, { gameId }) {
    this.kit = kit; this.def = def; this.gameId = gameId;
    this.state = "idle"; this.i = -1; this.t = 0; this.stepT = 0;
    this.entities = {}; this.vars = {};
    this.ctx = { kit, mission: this, step: null, vars: this.vars, entities: this.entities, player: null, dt: 0, t: 0, stepT: 0,
      target: null, entity: null, line: "", progress: null, warn: false, prompt: null,
      say: (from, text, o) => kit.radio(from, text, o), fail: (why) => this.finish(false, why) };
    this.result = null;
  }
  get step() { return this.def.steps[this.i]; }
  async start() {
    this.state = "running"; this.t = 0;
    if (this.def.start) await this.kit.spawnPlayer(this.def.start);
    if (this.def.brief) this.kit.radio(this.def.giver?.name || "Radio", this.def.brief, { icon: this.def.giver?.icon });
    this.kit.emit("mission:start", this);
    this.enter(0);
  }
  enter(i) {
    if (this.state !== "running") return;
    this.i = i; this.stepT = 0;
    const s = this.step, c = this.ctx;
    if (!s) return this.finish(true);
    Object.assign(c, { step: s, line: "", progress: null, warn: false, prompt: null, target: null, entity: null });
    for (const k of Object.keys(this.vars)) if (k.startsWith("_")) delete this.vars[k];
    // entity first (a target "@id" may be the one this step creates)
    if (s.entity && !this.entities[s.entity.id]) {
      const e = this.kit.spawnEntity(s.entity, c);
      if (!e) return this.finish(false, s.entity.missing || "no target found nearby: try again on a busier street");
      this.entities[s.entity.id] = e;
    }
    const ref = typeof s.target === "string" && s.target.startsWith("@") ? s.target.slice(1) : null;
    if (ref) c.entity = this.entities[ref] || null;
    else { const t = this.kit.places.resolve(s.target, this.kit); c.target = t ? { ...t, radius: s.radius ?? 20 } : null; }   // (a copy: the kit may move it onto the road)
    if (!ref && s.target != null && !c.target) return this.finish(false, `unknown place ${s.target}`);
    if (s.radio) this.kit.radio(s.radio.from || this.def.giver?.name || "Radio", fmtTarget(s.radio.text, c), s.radio);
    s.onStart?.(c);
    this.kit.readPlayer(0);
    c.player = this.kit.player;
    this.kit.setWaypoint(s.marker === false ? null : c.entity ? { entity: c.entity, radius: s.radius ?? 7 } : c.target,
      { route: s.route ?? (!!c.target && !c.entity), snap: s.snap ?? true });
    this.kit.emit("mission:step", this);
  }
  tick(dt) {
    if (this.state !== "running" || !this.step) return;
    this.t += dt; this.stepT += dt;
    const s = this.step, c = this.ctx;
    c.player = this.kit.player; c.dt = dt; c.t = this.t; c.stepT = this.stepT;
    c.warn = false; c.prompt = null;
    for (const e of Object.values(this.entities)) e.update?.();
    if (this.def.timeLimit && this.t > this.def.timeLimit) return this.finish(false, "out of time");
    if (s.time && this.stepT > s.time) return this.finish(false, s.timeFail || "out of time");
    const why = s.failIf?.(c);
    if (why) return this.finish(false, why);
    const obj = OBJECTIVES[s.type];
    if (!obj) return this.finish(false, `unknown step type ${s.type}`);
    const r = obj.tick(c, dt);
    if (typeof r === "string" && r.startsWith("fail")) return this.finish(false, r.replace(/^fail:?\s*/, ""));
    if (r === true) { s.onDone?.(c); this.kit.emit("mission:stepDone", this); this.kit.audio.click(); this.enter(this.i + 1); }
  }
  /** what the HUD shows */
  objective() {
    const s = this.step, c = this.ctx;
    if (!s) return null;
    const left = s.time ? s.time - this.stepT : this.def.timeLimit ? this.def.timeLimit - this.t : null;
    return { title: this.def.title, text: fmtTarget(typeof s.text === "function" ? s.text(c) : s.text || "", c), line: c.line, progress: c.progress, warn: c.warn,
      prompt: c.prompt, timeLeft: left, step: this.i + 1, steps: this.def.steps.length };
  }
  finish(ok, why = "") {
    if (this.state !== "running") return;
    this.state = ok ? "success" : "fail";
    for (const e of Object.values(this.entities)) e.release?.();
    const r = this.def.reward || {};
    const bonus = ok && this.def.timeBonus && this.t <= this.def.timeBonus.under ? this.def.timeBonus.score || 0 : 0;
    this.result = ok ? { ok, why, time: this.t, score: (r.score || 0) + bonus, money: r.money || 0, rep: r.rep || 0, bonus }
      : { ok, why, time: this.t, score: 0, money: 0, rep: -(this.def.failRep ?? 0) };
    this.kit.missionDone(this);
  }
  abort() { if (this.state === "running") { this.state = "aborted"; for (const e of Object.values(this.entities)) e.release?.(); } }
}
