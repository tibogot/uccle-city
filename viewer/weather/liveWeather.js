// LIVE WEATHER: Uccle's weather now from Open-Meteo (free, no key; data CC BY 4.0, "Weather data by Open-Meteo.com",
// https://open-meteo.com/en/docs), mapped to the weather inputs (viewer/weather/weatherState.js `input`).
// No city wiring yet: the lab has a "use live weather" toggle. Fetched at most every 15 min (the model's interval).
export const UCCLE = { lat: 50.8, lon: 4.33 };
const FIELDS = ["temperature_2m", "precipitation", "rain", "showers", "snowfall", "snow_depth", "cloud_cover", "visibility",
  "wind_speed_10m", "wind_direction_10m", "weather_code", "is_day", "relative_humidity_2m"];
export const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${UCCLE.lat}&longitude=${UCCLE.lon}` +
  `&current=${FIELDS.join(",")}&wind_speed_unit=ms&timezone=Europe%2FBrussels`;

/** WMO weather codes (Open-Meteo) -> words */
export const WMO = { 0: "clear", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "rime fog", 51: "light drizzle",
  53: "drizzle", 55: "dense drizzle", 56: "freezing drizzle", 57: "freezing drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
  66: "freezing rain", 67: "freezing rain", 71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains", 80: "rain showers",
  81: "rain showers", 82: "violent showers", 85: "snow showers", 86: "heavy snow showers", 95: "thunderstorm", 96: "thunderstorm, hail", 99: "thunderstorm, hail" };

let cache = null;
/** The current conditions (cached 15 min). Throws on network errors (the caller shows it; no made-up fallback). */
export async function fetchLive({ force = false } = {}) {
  if (!force && cache && performance.now() - cache.at < 15 * 60e3) return cache.data;
  const r = await fetch(OPEN_METEO_URL);
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const j = await r.json();
  cache = { at: performance.now(), data: j };
  return j;
}

/** Open-Meteo `current` -> weather inputs + the surface state it implies (snow depth on the ground, wet if it rains). */
export function mapLive(j) {
  const c = j.current;
  const code = c.weather_code;
  const rain = (c.rain ?? 0) + (c.showers ?? 0);                     // mm in the last 15 min .. hour: read as mm/h
  const drizzleFloor = [51, 53, 55, 56, 57].includes(code) ? 0.3 : 0;
  const input = {
    rain: Math.max(rain, drizzleFloor, (c.precipitation ?? 0) - (c.snowfall ?? 0) * 0.7),
    snow: c.snowfall ?? 0,                                            // cm/h
    temp: c.temperature_2m,
    wind: c.wind_speed_10m,
    windDir: c.wind_direction_10m,
    cloud: (c.cloud_cover ?? 0) / 100,
    vis: [45, 48].includes(code) ? Math.min(c.visibility ?? 400, 400) : (c.visibility ?? 20000),
  };
  return {
    input,
    state: { depth: Math.min(0.35, c.snow_depth ?? 0), wetHint: rain > 0 || c.relative_humidity_2m > 95 ? 0.7 : null },
    label: `${WMO[code] ?? `code ${code}`}, ${c.temperature_2m.toFixed(1)} C, wind ${c.wind_speed_10m.toFixed(1)} m/s from ${Math.round(c.wind_direction_10m)} deg, ` +
      `cloud ${c.cloud_cover} %, visibility ${((c.visibility ?? 0) / 1000).toFixed(1)} km` + (c.snow_depth ? `, snow on ground ${(c.snow_depth * 100).toFixed(0)} cm` : ""),
    time: c.time, isDay: !!c.is_day,
  };
}
