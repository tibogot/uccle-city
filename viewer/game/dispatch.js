// DISPATCH (docs/GAMEKIT.md "Dispatch"): incoming calls, one at a time on the radio card.
//   call = { id, priority: 1 urgent | 2 normal | 3 low, from, icon, text, mission (a mission object or (kit) => mission),
//            expires (s on the card before it counts as ignored, default 25), onAccept(kit), onIgnore(kit) }
//   push(call)      queue it (sorted by priority, then age); shown when no mission runs, or at once when urgent
//   accept() / ignore()   (keys Y / X, or the card's buttons)
// Random calls: setGenerator({ every: [min, max] s, make: (kit, rng) -> call | null }) while the game's "calls" option
// is on (free play: a toggle in the start menu). Templates use real places (gamePlaces.js) round the player.
export class Dispatch {
  constructor(kit) {
    this.kit = kit; this.queue = []; this.current = null; this.shownT = 0; this.seq = 0;
    this.gen = null; this.nextT = 0; this.enabled = true;
    this.stats = { offered: 0, accepted: 0, ignored: 0 };
  }
  push(call) {
    const c = { priority: 2, expires: 25, from: "Dispatch", icon: "radio", ...call, id: call.id || `call${++this.seq}`, at: this.kit.time };
    this.queue.push(c);
    this.queue.sort((a, b) => a.priority - b.priority || a.at - b.at);
    return c.id;
  }
  setGenerator(g) { this.gen = g; this.nextT = this.kit.time + (g ? this.rand(g.first ?? g.every) : 0); }
  rand([a, b]) { return a + Math.random() * (b - a); }
  clear() { this.queue.length = 0; if (this.current) this.kit.hud.call(null); this.current = null; }
  /** the kit's logic tick (10 Hz) */
  tick() {
    const k = this.kit, busy = !!k.mission;
    // random calls
    if (this.gen && this.enabled && k.time >= this.nextT) {
      this.nextT = k.time + this.rand(this.gen.every);
      if (!busy && !this.current && this.queue.length < 2) { const c = this.gen.make(k, Math.random); if (c) this.push(c); }
    }
    // the card: expire, or show the next
    if (this.current && k.time - this.shownT > this.current.expires) this.ignore(true);
    if (!this.current && this.queue.length) {
      const next = this.queue[0];
      if (!busy || next.priority === 1) {
        this.queue.shift();
        this.current = next; this.shownT = k.time; this.stats.offered++;
        k.audio.radio(next.priority === 1);
        k.hud.call(next, busy);
      }
    }
    if (this.current) k.hud.callTime(1 - (k.time - this.shownT) / this.current.expires);
  }
  accept() {
    const c = this.current;
    if (!c) return false;
    this.current = null; this.stats.accepted++;
    this.kit.hud.call(null);
    c.onAccept?.(this.kit);
    const m = typeof c.mission === "function" ? c.mission(this.kit) : c.mission;
    if (m) this.kit.startMission(m);
    return true;
  }
  ignore(timeout = false) {
    const c = this.current;
    if (!c) return false;
    this.current = null; this.stats.ignored++;
    this.kit.hud.call(null);
    c.onIgnore?.(this.kit, timeout);
    return true;
  }
}
