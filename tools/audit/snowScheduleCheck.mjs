// THE CHRISTMAS SNOW SCHEDULE (claude/snowseason, owner 2026-11-27 "why no snow"): gate row `snowsched`, rule snow-schedule.
// Node only (no browser): the resolver viewer/seasons/snowSchedule.js gives the start weather for sample instants in
// Brussels (UTC instants round the local midnights and the 18:00 / 08:00 edges), the URL overrides, the seed
// (same date = same weather), and the wiring (cityWeather.js starts the existing presets from it; quick.js brings the
// weather system on a snow day; nothing new per frame).
//   node tools/audit/snowScheduleCheck.mjs [--quiet]
globalThis.location ??= { search: "", href: "http://localhost/viewer/index.html" };
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const out = (ok, msg) => { if (!ok) fails++; if (!ok || !QUIET) console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };

const { snowSchedule, brusselsHour, SNOW_FIRST, SNOW_LAST } = await import("../../viewer/seasons/snowSchedule.js");
const P = (s) => new URLSearchParams(s), U = (y, mo, d, h, mi = 0) => new Date(Date.UTC(y, mo, d, h, mi));
const W = (q, t) => snowSchedule(P(q), t);
const is = (r, preset) => (preset == null ? !r.on && r.preset == null : r.on && r.preset === preset);

// ---- the calendar (Brussels = UTC + 1 in December)
out(SNOW_FIRST === 349 && SNOW_LAST === 360, `schedule: snow days ${SNOW_FIRST}-${SNOW_LAST} (15-26 Dec)`);
out(Math.abs(brusselsHour(U(2026, 11, 15, 21)) - 22) < 1e-9 && Math.abs(brusselsHour(U(2026, 6, 1, 12)) - 14) < 1e-9, "clock: the Brussels hour (CET UTC+1 in winter, CEST UTC+2 in summer)");
{
  const a = W("", U(2026, 11, 14, 11)), b = W("", U(2026, 11, 14, 22, 30));       // 14 Dec 12:00 / 23:30 Brussels
  out(is(a, null) && is(b, null), `dry: 14 Dec noon and 23:30 Brussels (${a.why} / ${b.why})`);
  const c = W("", U(2026, 11, 14, 23, 30));                                         // 15 Dec 00:30 Brussels (UTC still the 14th)
  out(is(c, "snowfall") && c.day === 349, `edge: 15 Dec 00:30 Brussels (23:30 UTC on the 14th) = the first snow night (${c.why})`);
  const d = W("", U(2026, 11, 15, 9)), e = W("", U(2026, 11, 15, 21));              // 15 Dec 10:00 / 22:00 Brussels
  out(is(d, "snow cover") && is(e, "snowfall"), `15 Dec 10:00 = snow cover only (${d.why}); 22:00 = cover + light snowfall (${e.why})`);
  const f = W("", U(2026, 11, 15, 16, 59)), g = W("", U(2026, 11, 15, 17, 0));      // 17:59 / 18:00 Brussels
  const h = W("", U(2026, 11, 16, 6, 59)), i = W("", U(2026, 11, 16, 7, 0));        // 07:59 / 08:00 Brussels
  out(is(f, "snow cover") && is(g, "snowfall") && is(h, "snowfall") && is(i, "snow cover"), "edges: snowfall from 18:00 to 08:00 Brussels clock, cover only in between");
  const j = W("", U(2026, 11, 26, 21)), k = W("", U(2026, 11, 26, 23, 30)), l = W("", U(2026, 11, 27, 11));
  out(is(j, "snowfall") && is(k, null) && is(l, null), `Boxing Day 22:00 snowfall; 27 Dec 00:30 Brussels (23:30 UTC on the 26th) and noon dry (${l.why})`);
  const m = W("", U(2027, 0, 3, 12)), n = W("", U(2026, 11, 1, 12)), o = W("", U(2026, 6, 15, 23));
  out(is(m, null) && is(n, null) && is(o, null), "dry: 3 Jan, 1 Dec, and outside the season (July)");
  // the visitor's own time zone does not matter: the instant decides (Montreal / Tokyo see Uccle's weather)
  out(is(W("", U(2026, 11, 15, 17, 30)), "snowfall") && is(W("", U(2026, 11, 15, 7, 30)), "snow cover"), "instant: 15 Dec 18:30 Brussels = snowfall, 08:30 Brussels (morning) = cover, whatever the visitor's clock");
}
// ---- a pinned day (the tours, the dev panel): the scene's hour, no wall clock
{
  const at = [U(2026, 6, 1, 3), U(2026, 10, 27, 20), U(2026, 11, 20, 23)];
  const same = (q) => { const r = at.map((t) => W(q, t)); return r.every((x) => x.preset === r[0].preset && JSON.stringify(x.input) === JSON.stringify(r[0].input)) ? r[0] : null; };
  const a = same("day=340"), b = same("day=350"), c = same("day=350&time=night"), d = same("day=350&time=golden"), e = same("day=350&hour=20"), f = same("day=362&time=night");
  out(a && is(a, null), "?day=340 (6 Dec): dry, whatever the wall clock");
  out(b && is(b, "snow cover") && d && is(d, "snow cover"), "?day=350 (16 Dec): snow cover (no time = the golden default = day), with ?time=golden too");
  out(c && is(c, "snowfall") && e && is(e, "snowfall"), "?day=350&time=night / &hour=20: cover + light snowfall");
  out(f && is(f, null), "?day=362&time=night (28 Dec): dry");
  out(is(W("time=night", U(2026, 11, 16, 11)), "snowfall") && is(W("time=golden", U(2026, 11, 16, 21)), "snow cover"), "real date: ?time= pins the scene's hour (night = snowfall at noon, golden = cover at 22:00)");
}
// ---- overrides
{
  const t = U(2026, 11, 18, 21);                                                     // 18 Dec 22:00 Brussels: a snow night
  out(is(W("", t), "snowfall"), "control: 18 Dec 22:00 snows");
  out(["wx=clear", "wx=live", "wx=rain", "wx=snow_cover"].every((q) => is(W(q, t), null)), "?wx= (clear, live, rain, snow_cover) wins: the schedule stays out");
  out(is(W("season=summer", t), null) && is(W("xmas=0", t), null) && is(W("snowsched=old", t), null) && is(W("weather=old", t), null), "?season=summer / ?xmas=0 / ?snowsched=old / ?weather=old: no automatic snow");
  out(is(W("xmas=1", U(2026, 6, 1, 21)), null) && is(W("season=winter", U(2026, 6, 1, 21)), null), "?xmas=1 / ?season=winter outside the season (the forced 21 Dec look, the Christmas tour): dry");
  out(is(W("xmas=1", t), "snowfall") && is(W("xmas=1&day=350", U(2026, 6, 1, 12)), "snow cover"), "?xmas=1 in the real season / with a ?day= in the snow days: the schedule");
}
// ---- the seed: same date = same weather; days differ; light snow
{
  const days = []; for (let d = SNOW_FIRST; d <= SNOW_LAST; d++) days.push(d);
  const night = days.map((d) => W(`day=${d}&time=night`, U(2026, 0, 1, 0))), dayR = days.map((d) => W(`day=${d}`, U(2026, 0, 1, 0)));
  const again = days.map((d) => W(`day=${d}&time=night`, U(2027, 5, 9, 9)));
  out(JSON.stringify(night) === JSON.stringify(again), "seed: the same date gives the same weather (any wall clock)");
  out(new Set(night.map((r) => r.input.snow)).size >= 4 && new Set(dayR.map((r) => r.state.depth)).size >= 4, "seed: the nights' snowfall and the days' depth vary from day to day");
  out(night.every((r) => r.input.snow >= 0.4 && r.input.snow <= 0.9 && r.input.temp < 0 && r.state.depth >= 0.1 && r.state.depth <= 0.17),
    "light snowfall: 0.4-0.9 cm/h below 0 C, cover 10-17 cm (the 'snowfall' preset itself is 1.5 cm/h)");
  out(dayR.every((r) => r.state.depth === night[dayR.indexOf(r)].state.depth), "a day's cover depth is the same by day and by night");
}
// ---- the tours: every view of tools/tour/views*.json is a quick boot (?quick=1): quick.js sets ?weather=old unless the
// view asks for the weather (&with=weather / ?wx=), so the schedule stays out of every tour on every date, snow days too
{
  const dir = path.join(ROOT, "tools/tour"), bad = [];
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((x) => /^views.*\.json$/.test(x))) {
    const V = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const v of V.views ?? []) {
      const q = new URLSearchParams({ ...(V.common ?? {}), ...(v.q ?? {}) });
      const asks = q.get("quick") !== "1" || q.has("wx") || (q.get("with") || "").split(",").includes("weather");
      if (q.get("quick") === "1" && !asks) q.set("weather", "old");         // (quick.js SYSTEMS.weather)
      for (const t of [U(2026, 11, 20, 11), U(2026, 11, 20, 21)]) { n++; const r = snowSchedule(q, t); if (r.on && !asks) bad.push(`${f}:${v.id}`); }
    }
  }
  out(n > 0 && bad.length === 0, `tours: ${n / 2} views x 20 Dec noon / 22:00: no view gets the schedule's weather (${bad.join(", ") || "none"})`);
}
// ---- wiring
{
  const C = src("viewer/weather/cityWeather.js"), Q = src("viewer/quick.js"), S = src("viewer/seasons/snowSchedule.js").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/[^\n]*/g, "$1");
  out(/const sched = this\.schedule = snowSchedule\(qp\)/.test(C) && /else if \(sched\.on\) \{\s*this\.setPreset\(sched\.preset, 0\)/.test(C),
    "cityWeather.js: the start weather from the schedule, through the existing presets (snow cover / snowfall: their layer, the snow2 path)");
  out(/want === "live"\) this\.goLive\(\);\s*else if \(sched\.on\)/.test(C), "cityWeather.js: ?wx=live before the schedule (and the schedule itself is off under any ?wx=)");
  const upd = C.slice(C.indexOf("  update(camPos, cam) {"), C.indexOf("  night() {"));
  out(upd.length > 100 && !/sched|snowSchedule/.test(upd), "per frame: nothing new (update() does not read the schedule)");
  // (merge blocked 2026-11-27, tour snow1127: quick.js is main.js's FIRST import and must import nothing but the places
  // table: its body rewrites the URL before any other module reads it; the schedule's import evaluated seasonMode.js's
  // SEASON before that rewrite. Quick mode keeps its rule instead: optional systems only when asked (&with=weather / ?wx=))
  out(!/snowSchedule|seasons\//.test(Q) && [...Q.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]).join() === "./places.js",
    "quick.js: imports the places table only (no schedule: quick mode's weather only with &with=weather / ?wx=)");
  out(!/from "three|Math\.random|Date\.now/.test(S), "snowSchedule.js: three-free, no random, no Date.now (the instant is a parameter)");
}
if (fails) { console.log(`snowsched: ${fails} FAIL`); process.exit(1); }
console.log("snowsched: all PASS");
