// THE SNOW SCHEDULE (claude/snowseason, owner 2026-11-27: chose snow for Christmas, "why no snow"; rule snow-schedule):
// the weather the city STARTS with in the Christmas season, three-free (cityWeather.js reads it at boot;
// quick mode (?quick=1) keeps the weather off unless asked for: &with=weather, ?wx=).
//
//   1 - 14 Dec     dry: the winter look only (bare trees, a December sun: seasonMode.js)
//   15 - 26 Dec    SNOW COVER all day (roofs, cars, ground, the chalets: the weather's existing "snow cover" layer), and
//                  LIGHT SNOWFALL at night, 18:00 - 08:00 Brussels clock (the weather's existing snowfall path, snow2)
//   27 Dec - 6 Jan dry again
//
// Seeded by the day of the year (no Math.random, no clock but the date / hour): the same date and hour give the same
// weather (tours, gates). Each snow day has its own depth (10 - 17 cm), each night its own light snowfall (0.4 - 0.9 cm/h)
// and wind; the numbers fade nowhere: they are the start state, the weather simulation goes on from there.
// Which date / hour:
//   - the real date (no ?day=): the Brussels date and the Brussels clock hour of `now` (a visitor anywhere sees the
//     weather of Uccle's calendar, as the season itself: xmasDate.js); ?time= / ?hour= pin the scene's hour instead
//   - ?day= (a simulated day, the dev panel's slider, the tours): that day, and the SCENE's hour: ?time=night = night,
//     the other presets (golden by default) = day, ?hour= (solar) ~ +0.7 h on the clock. Deterministic, no wall clock.
//   - ?xmas=1 / ?season=winter outside the real season (the forced 21 Dec winter look): dry, as before (the Christmas
//     tour, tools/tour/views_xmas.json, keeps its baseline); give ?day=350 to see the snow
// Off: any ?wx= (clear, live, a preset: the URL's weather wins), ?season=summer, ?xmas=0, ?snowsched=old (no automatic
// snow: the behaviour before), ?weather=old (no weather system at all).
import { seasonMode, yearDay } from "./seasonMode.js";
import { brusselsDate, XMAS_TZ } from "../christmas/xmasDate.js";

export const SNOW_FIRST = yearDay({ month: 11, day: 15 });    // 349
export const SNOW_LAST = yearDay({ month: 11, day: 26 });     // 360 (Boxing Day)
export const NIGHT_FROM = 18, NIGHT_TO = 8;                    // Brussels clock hours: snowfall from 18:00 to 08:00

let hfmt = null;
/** the Brussels clock hour (0-23.99) of `now` */
export function brusselsHour(now = new Date()) {
  try {
    hfmt ??= new Intl.DateTimeFormat("en-GB", { timeZone: XMAS_TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" });
    const p = Object.fromEntries(hfmt.formatToParts(now).map((x) => [x.type, x.value]));
    const h = +p.hour, m = +p.minute;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return h + m / 60;
  } catch { /* (no time-zone data: the local clock) */ }
  return now.getHours() + now.getMinutes() / 60;
}

// a small integer hash -> 0..1 (the schedule's seed: the day, a salt)
const rnd = (day, salt) => {
  let h = (day * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const r2 = (x) => Math.round(x * 100) / 100;

/** the scene's clock hour from ?time= / ?hour= (null: not pinned). Presets: night = 23.4 solar (lighting.js FIRM_TIMES),
 *  twilight = just after a December sunset (~17:10), the others are daytime */
function sceneHour(params) {
  if (params.has("hour") && isFinite(+params.get("hour"))) return (((+params.get("hour") + 0.7) % 24) + 24) % 24;
  const t = params.get("time");
  if (!t) return null;
  return t === "night" ? 23.4 + 0.7 - 24 : t === "twilight" ? 17.2 : 12.5;
}

/**
 * The start weather of the snow schedule.
 * @returns {{ on: boolean, preset: string|null, input?: object, state?: object, day: number|null, hour: number|null, why: string }}
 *   preset null = no automatic weather (the city's own start: ?wx= or clear); else "snow cover" or "snowfall" with the
 *   day's seeded inputs / state to put over that preset's
 */
export function snowSchedule(params = new URLSearchParams(typeof location !== "undefined" ? location.search : ""), now = new Date()) {
  const off = (why, day = null, hour = null) => ({ on: false, preset: null, day, hour, why });
  if (params.get("snowsched") === "old") return off("?snowsched=old (no automatic snow)");
  if (params.has("wx")) return off(`?wx=${params.get("wx")} wins`);
  if (params.get("weather") === "old") return off("?weather=old (no weather)");
  const S = seasonMode(params, now);
  if (!S.winter) return off(`not winter (${S.why})`);
  const pinnedDay = params.has("day") && isFinite(+params.get("day"));
  const realDay = yearDay(brusselsDate(now));
  const realSeason = realDay >= 335 || realDay <= 6;
  if (!pinnedDay && !realSeason) return off("the forced winter look (?xmas=1 / ?season=winter outside the season): dry");
  const day = S.day;
  const hour = sceneHour(params) ?? (pinnedDay ? 12.5 : brusselsHour(now));     // a pinned day without a time: golden = day
  if (day < SNOW_FIRST || day > SNOW_LAST) return off(`day ${day}: dry (snow ${SNOW_FIRST}-${SNOW_LAST}, 15-26 Dec)`, day, hour);
  const depth = r2(0.10 + 0.07 * rnd(day, 1));
  const night = hour >= NIGHT_FROM || hour < NIGHT_TO;
  if (!night) {
    return { on: true, preset: "snow cover", day, hour, why: `day ${day} ${hour.toFixed(1)} h: snow cover`,
      input: { cloud: r2(0.2 + 0.5 * rnd(day, 2)), wind: r2(0.5 + 1.5 * rnd(day, 3)) },
      state: { depth, icicle: r2(0.4 + 0.3 * rnd(day, 4)) } };
  }
  // the night's snowfall belongs to the evening it started (a 02:00 snow is the night before's)
  const eve = hour < NIGHT_TO ? day - 1 : day;
  return { on: true, preset: "snowfall", day, hour, why: `day ${day} ${hour.toFixed(1)} h: snow cover + light snowfall`,
    input: { snow: r2(0.4 + 0.5 * rnd(eve, 5)), temp: r2(-0.8 - 1.6 * rnd(eve, 6)), wind: r2(1 + 2 * rnd(eve, 7)), windDir: Math.round(30 + 60 * rnd(eve, 8)),
      cloud: 1, vis: Math.round(3000 + 2500 * rnd(eve, 9)) },
    state: { depth, wet: 0.05, icicle: r2(0.3 + 0.3 * rnd(day, 4)) } };
}
