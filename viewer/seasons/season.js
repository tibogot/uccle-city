// THE SEASON: one date -> the uniforms trees, grass and the weather read (docs/WEATHER.md "Seasons").
//
// Shared by the weather lab now and, later, the city's trees and the foliage lab (branch claude/foliage): import
// `season` and read its uniforms in a material; call setDate() / setDay() once when the date changes (no per-frame
// work). Brussels phenology (docs/WEATHER_RESEARCH.md §5): leaf-out mid / late April, green May - September, colour
// from late September, peak late October, leaves down through November, bare December - March.
//
//   season.uLeafColor   vec3  the crown's mean leaf colour now (linear)
//   season.uLeafAutumn  float 0 green .. 1 full autumn: a per-leaf random r < uLeafAutumn turns yellow / orange / red
//   season.uLeafDensity float 1 full crown .. 0 bare: a per-leaf random r > uLeafDensity is gone (alpha cut)
//   season.uLeafFall    float 0..1 how many leaves are falling now (autumn particles)
//   season.uLitter      float 0..1 fallen leaves on the ground
//   season.uGrass       vec3  lawn colour (linear)
//   season.uFlowers     float 0..1 spring flowers in lawns (crocus, daisies)
//   season.uSpringGreen float 0..1 fresh pale-green new leaves
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";

export const LAT = 50.8;            // Uccle (KMI/IRM station 50.80 N, 4.36 E)
const DEG = Math.PI / 180;

export const season = {
  uLeafColor: uniform(new THREE.Color(0.06, 0.12, 0.03)),
  uLeafAutumn: uniform(0),
  uLeafDensity: uniform(1),
  uLeafFall: uniform(0),
  uLitter: uniform(0),
  uGrass: uniform(new THREE.Color(0.05, 0.11, 0.025)),
  uFlowers: uniform(0),
  uSpringGreen: uniform(0),
  day: 200,
  info: {},
};

// Uccle climate normals 1991-2020 (KMI/IRM, rounded): monthly mean temperature (C), days with snow falling, precip (mm)
export const CLIMATE = {
  temp: [3.6, 4.1, 7.0, 10.3, 14.0, 16.9, 18.9, 18.6, 15.4, 11.6, 7.2, 4.2],
  snowDays: [4.5, 4.0, 2.5, 1.0, 0.1, 0, 0, 0, 0, 0.1, 1.5, 3.5],
  precip: [76, 63, 59, 47, 62, 70, 76, 80, 65, 68, 78, 86],
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mixC = (a, b, t) => new THREE.Color().copy(a).lerp(b, t);
const C = (r, g, b) => new THREE.Color(r, g, b);

/** Solar declination (rad) for a day of the year (Cooper's formula, ~0.5 deg). */
export function declination(day) { return 23.44 * DEG * Math.sin(2 * Math.PI * (284 + day) / 365); }

/** Sunrise / sunset (local SOLAR hours), day length (h) and noon elevation (deg) at Uccle. */
export function sunInfo(day, lat = LAT) {
  const d = declination(day), phi = lat * DEG;
  const h0 = -0.833 * DEG;                       // refraction + the disc's radius
  const c = (Math.sin(h0) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d));
  const H = Math.acos(Math.min(1, Math.max(-1, c))) / DEG / 15;    // hours from noon
  return { sunrise: 12 - H, sunset: 12 + H, dayLength: 2 * H, noonElevation: 90 - lat + d / DEG };
}

/** Day of the year (1..365) of a JS Date. */
export function dayOfYear(date) {
  const s = Date.UTC(date.getFullYear(), 0, 0);
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - s) / 86400000);
}

/** The phenology for a day: all the numbers, no uniforms (the city can call it in a worker). */
export function phenology(day) {
  // leaf density: bud burst ~doy 105 (15 Apr) -> full ~135 (15 May); drop ~doy 295 (22 Oct) -> bare ~335 (1 Dec)
  const leafOut = smooth(102, 135, day), leafDrop = smooth(290, 335, day);
  const density = leafOut * (1 - leafDrop);
  // autumn colour: from ~doy 265 (22 Sep), most leaves turned by ~305 (1 Nov)
  const autumn = smooth(262, 308, day);
  const fall = Math.max(0, smooth(280, 305, day) - smooth(320, 345, day));
  const litter = Math.max(smooth(285, 318, day) * (1 - smooth(345, 365, day)), 0.25 * (1 - smooth(10, 60, day)));
  const spring = Math.max(0, smooth(100, 118, day) - smooth(140, 170, day));
  const flowers = Math.max(0, smooth(55, 80, day) - smooth(125, 150, day));       // crocus Feb-Mar, daisies Apr-May
  // grass: dull olive in winter, vivid in spring, a little dry in late July / August, green again in autumn
  const gWinter = C(0.045, 0.075, 0.025), gSpring = C(0.05, 0.14, 0.022), gSummer = C(0.06, 0.12, 0.028), gDry = C(0.09, 0.105, 0.035);
  let grass = mixC(gWinter, gSpring, smooth(60, 120, day));
  grass = mixC(grass, gSummer, smooth(150, 180, day));
  grass = mixC(grass, gDry, smooth(195, 225, day) * (1 - smooth(240, 270, day)));
  grass = mixC(grass, gWinter, smooth(300, 350, day));
  const green = mixC(C(0.06, 0.12, 0.03), C(0.1, 0.19, 0.03), spring);
  const leaf = mixC(green, C(0.3, 0.13, 0.02), autumn * 0.85);
  const m = Math.min(11, Math.floor((day - 1) / 30.5));
  return { density, autumn, fall, litter, spring, flowers, grass, leaf, month: m, temp: CLIMATE.temp[m],
    snowChance: CLIMATE.snowDays[m] / 30.5, ...sunInfo(day) };
}

/** Set the season from a day of the year (1..365). */
export function setDay(day) {
  day = ((Math.round(day) - 1) % 365 + 365) % 365 + 1;
  const p = phenology(day);
  season.day = day;
  season.uLeafDensity.value = p.density;
  season.uLeafAutumn.value = p.autumn;
  season.uLeafFall.value = p.fall;
  season.uLitter.value = p.litter;
  season.uSpringGreen.value = p.spring;
  season.uFlowers.value = p.flowers;
  season.uGrass.value.copy(p.grass);
  season.uLeafColor.value.copy(p.leaf);
  season.info = p;
  return p;
}
export const setDate = (date) => setDay(dayOfYear(date));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "12 Nov" for a day of the year (non-leap). */
export function dayLabel(day) {
  const d = new Date(Date.UTC(2025, 0, day));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export const seasonName = (day) => (day < 80 || day >= 355 ? "winter" : day < 172 ? "spring" : day < 266 ? "summer" : "autumn");
setDay(200);
