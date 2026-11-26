// THE SEASON MODE (claude/xmasreview, owner 2026-11-26: "yes do the winter look for christmas"): ONE resolver every
// system reads at boot (three-free: lighting.js, the trees, the plants / grass through viewer/seasons/season.js).
//
//   winter  while the Christmas season is on (viewer/christmas/xmasDate.js xmasActive: the Brussels date in 1 Dec -
//           6 Jan, or ?xmas=1): the sun of a December day in Brussels (the real day of the year in Brussels; 21 Dec
//           when ?xmas=1 forces the layer outside the season), bare deciduous trees, winter lawns and shrubs
//   summer  every other day: the city as before (day 200, mid-July: long golden evenings)
//
// Overrides: ?season=summer / ?season=winter force the mode (the A/B); ?day= (the dev panel's day slider) pins the day
// of the year in either mode; ?hour= / ?time= / the sky panel pin the time of day (lighting.js), on that day.
// The time presets are TIMES OF DAY: in winter they keep their place against the day's sunrise / sunset (golden = 1.3 h
// before sunset, twilight 0.45 h after it, misty 0.8 h after sunrise), so "golden" is still a golden low sun in December.
import { xmasActive, brusselsDate } from "../christmas/xmasDate.js";

export const SUMMER_DAY = 200;
export const WINTER_FORCED_DAY = 355;           // 21 Dec: ?xmas=1 / ?season=winter outside the real season
const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
/** day of the year (1-365, no leap day) of a { month 0-11, day } */
export const yearDay = ({ month, day }) => CUM[month] + day;
const inSeason = (d) => d >= 335 || d <= 6;

/** { winter, day, why } for the URL params and the instant `now` */
export function seasonMode(params = new URLSearchParams(typeof location !== "undefined" ? location.search : ""), now = new Date()) {
  const q = params.get("season");
  const pinned = params.has("day") && isFinite(+params.get("day")) ? Math.min(365, Math.max(1, Math.round(+params.get("day")))) : null;
  let winter, why;
  if (q === "summer" || q === "winter") { winter = q === "winter"; why = `?season=${q}`; }
  else { winter = xmasActive(params, now); why = winter ? "the Christmas season (xmasActive)" : "outside the Christmas season"; }
  let day;
  if (pinned != null) day = pinned;
  else if (!winter) day = SUMMER_DAY;
  else { const b = yearDay(brusselsDate(now)); day = inSeason(b) ? b : WINTER_FORCED_DAY; }
  return { winter, day, why };
}

/** the time presets' solar hour on `day`, from the summer hour (sunrise / sunset in local solar hours: season.js sunInfo) */
export function presetHour(id, summerHour, sun, sunSummer) {
  if (id === "golden" || id === "twilight") return sun.sunset + (summerHour - sunSummer.sunset);
  if (id === "misty") return sun.sunrise + 0.8;
  if (id === "midday" || id === "overcast") return 12.5;
  return summerHour;                              // night: the same clock hour
}

/** the mode of this page (read once) */
export const SEASON = seasonMode();
