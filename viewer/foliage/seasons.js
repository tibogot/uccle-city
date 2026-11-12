// THE SEASONS HOOK: one state every foliage material reads (The Vegetation Engine's model: a global season, each
// material reacts in its own way). Driven by the MONTH (1-12, fractional: 4.5 = mid April), interpolated with wrap
// from a table of what Brussels gardens do (docs/FOLIAGE_RESEARCH.md §4):
//   grass      fresh yellow-green in April-May, deeper in June, dry straw patches on long grass in July-August,
//              olive in autumn, dull olive-brown in winter (lawns stay green-ish: Brussels winters are mild and wet)
//   leaf       deciduous shrubs' leaf amount (hydrangea, roses): bare December-March
//   autumn     leaf colouring (green -> yellow / red / brown), October-November
//   beechHold  a clipped BEECH hedge keeps its dead brown leaves all winter (marcescence: typical of Uccle hedges)
//   bloom.*    flowers: bulbs (tulips, daffodils) Mar-Apr, roses Jun-Sep, lavender Jul-Aug, hydrangea Jun-Sep (heads
//              stay, browned, in winter), geranium (window boxes) May-Oct, wild (meadow flowers) Apr-Sep, daisies
//              (lawn) Mar-Oct
//   litter     fallen leaves on the ground, Oct-Jan
// plus `snow` (0-1) and `wet` (0-1) which the weather lab sets (not from the month): snow-ready flags on every
// material (upward faces whiten, grass shortens under it).
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";

const C = (h) => new THREE.Color(h);                 // sRGB hex -> linear (ColorManagement)
// month -> values. Mid-month keyframes; colours as sRGB hex.
const KEYS = {
  //            Jan       Feb       Mar       Apr       May       Jun       Jul       Aug       Sep       Oct       Nov       Dec
  lawnRoot: ["#29361a", "#2a381a", "#2c4019", "#2f4a19", "#2d4a18", "#2b4517", "#2d4317", "#304317", "#2d4417", "#2c4118", "#2a3a19", "#29361a"],
  lawnTip:  ["#6a7440", "#6c7840", "#7f9a3e", "#93b443", "#8cb042", "#7ea43e", "#87a046", "#909c4c", "#82a042", "#78923e", "#6e7e40", "#6a7440"],
  longRoot: ["#3a3b22", "#3a3c22", "#3a4a1e", "#3a531c", "#38551b", "#3a541c", "#45531f", "#4c5222", "#46511f", "#434a20", "#3e4222", "#3a3b22"],
  longTip:  ["#8a7f55", "#887f55", "#8f9a4a", "#a0b44c", "#a2b450", "#a2ad56", "#a8ab5c", "#b4a862", "#b4a862", "#a49a5c", "#958a58", "#8a7f55"],
  dry:      [0.55, 0.5, 0.25, 0.05, 0.0, 0.08, 0.2, 0.35, 0.3, 0.3, 0.45, 0.55],
  height:   [0.75, 0.75, 0.8, 0.9, 1.0, 1.1, 1.1, 1.05, 1.0, 0.95, 0.85, 0.78],     // long grass growth
  leaf:     [0.0, 0.0, 0.1, 0.55, 0.95, 1.0, 1.0, 1.0, 1.0, 0.85, 0.35, 0.0],
  autumn:   [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.05, 0.15, 0.6, 0.95, 1.0],
  beechHold:[1.0, 1.0, 0.9, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.9, 1.0],
  bulbs:    [0.0, 0.15, 0.8, 1.0, 0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  rose:     [0.0, 0.0, 0.0, 0.0, 0.3, 1.0, 1.0, 0.85, 0.7, 0.35, 0.05, 0.0],
  lavender: [0.0, 0.0, 0.0, 0.0, 0.0, 0.45, 1.0, 0.9, 0.35, 0.0, 0.0, 0.0],
  hydrangea:[0.0, 0.0, 0.0, 0.0, 0.1, 0.75, 1.0, 1.0, 0.85, 0.5, 0.2, 0.0],
  hydBrown: [1.0, 1.0, 1.0, 0.6, 0.0, 0.0, 0.0, 0.0, 0.1, 0.4, 0.8, 1.0],
  geranium: [0.0, 0.0, 0.0, 0.0, 0.7, 1.0, 1.0, 1.0, 0.9, 0.6, 0.0, 0.0],
  wild:     [0.0, 0.0, 0.1, 0.45, 1.0, 1.0, 0.85, 0.6, 0.35, 0.1, 0.0, 0.0],
  daisy:    [0.0, 0.05, 0.4, 0.9, 1.0, 0.7, 0.5, 0.45, 0.4, 0.2, 0.05, 0.0],
  litter:   [0.45, 0.25, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.05, 0.5, 1.0, 0.75],
};

export const SEASON_NAMES = { spring: 4.5, summer: 7.0, autumn: 10.6, winter: 1.2 };

function sample(arr, month) {
  const m = (((month - 1) % 12) + 12) % 12;          // 0 = mid January
  const i = Math.floor(m), f = m - i, a = arr[i], b = arr[(i + 1) % 12];
  if (typeof a === "number") return a + (b - a) * f;
  return C(a).lerp(C(b), f);
}

export const season = {
  month: 7.0,
  snow: 0,
  wet: 0,
  u: Object.fromEntries(Object.keys(KEYS).map((k) => [k, uniform(typeof KEYS[k][0] === "number" ? 0 : new THREE.Color())])),
  uSnow: uniform(0),
  uWet: uniform(0),
  /** call when month / snow / wet change (CPU, a few uniform writes) */
  apply() {
    for (const k of Object.keys(KEYS)) {
      const v = sample(KEYS[k], this.month);
      if (typeof v === "number") this.u[k].value = v; else this.u[k].value.copy(v);
    }
    this.uSnow.value = this.snow;
    this.uWet.value = this.wet;
  },
};
season.apply();
