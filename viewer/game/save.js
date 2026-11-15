// GAME SAVE (docs/GAMEKIT.md "Save"): one versioned JSON in localStorage, every access in try / catch (a private window,
// blocked storage or a full quota never breaks a game: the kit then plays without saving).
//   { v: 1, settings: { volume, route, quality }, games: { <gameId>: { score, money, rep, played, missions: { <id>: { done, fails, best } }, unlocks: [] } } }
// A future format bumps VERSION and adds a step to MIGRATE (old saves are upgraded, never dropped).
const KEY = "uccle3d.game";
export const VERSION = 1;
const MIGRATE = {
  // 1: (v0 -> v1) example: (s) => ({ ...s, v: 1 }),
};
const fresh = () => ({ v: VERSION, settings: { volume: 0.7, route: true, quality: null }, games: {} });

export class GameSave {
  constructor() {
    this.ok = true;
    this.data = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        let s = JSON.parse(raw);
        while (s && (s.v ?? 0) < VERSION && MIGRATE[(s.v ?? 0) + 1]) s = MIGRATE[(s.v ?? 0) + 1](s);
        if (s && s.v === VERSION) this.data = { ...fresh(), ...s, settings: { ...fresh().settings, ...s.settings } };
      }
    } catch { this.ok = false; }
    this.timer = 0;
  }
  /** the record of one game (created on first use) */
  game(id) {
    return (this.data.games[id] ??= { score: 0, money: 0, rep: 0, played: 0, missions: {}, unlocks: [] });
  }
  mission(gameId, missionId) { return (this.game(gameId).missions[missionId] ??= { done: 0, fails: 0, best: null }); }
  get settings() { return this.data.settings; }
  /** write soon (coalesced: several changes in a frame = one write) */
  touch() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = 0; this.flush(); }, 300);
  }
  flush() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); this.ok = true; } catch { this.ok = false; }
  }
  /** wipe one game's progress (settings stay) */
  reset(gameId) { delete this.data.games[gameId]; this.touch(); }
}
