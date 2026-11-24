// DECEMBER WINDOWS (claude/xmas4, plan job 7, docs/CHRISTMAS.md 7.5, rule xmas-pole-garlands' sibling: the layer's
// extras). With the Christmas layer on, more house windows glow warm at night: a strand of warm LED fairy lights across
// the window head (two shallow swags of 11 beads) in
//   - XMAS_WIN.share of the rooms that are NOT lit (s3 just under the lit share: a December string in a dark room, its
//     faint warm glow on the curtains): the extra warm windows;
//   - XMAS_WIN.litShare of the lit rooms (a string in a lit window).
// The lit rooms themselves (which, their colour) are NOT changed: viewer/nightLights/litHash.js is the shader's CPU
// copy (the night's window light sources come from it), and a string is a decoration, not a room light (no source).
// Emissive only (no light, rule 7), no buffer at all (a uniform). Compiled into the facade shader ONLY when the layer
// is on at boot (xmasDate.js xmasActive, the same switch as the layer; ?xmaswin=0: never): outside the layer the
// facade shader is exactly as before, and turning the layer on never rebuilds a shader (the switch is read before the
// first facade material is made). Inside, the strings sit behind `If(xmasWin > 0.5)`: window.xmas.extras.windows (the
// live A/B of debug/xmasPerf.js) flips the uniform, and the branch skips the work when 0.
import { uniform } from "three/tsl";
import { xmasActive } from "./xmasDate.js";

const QS = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
/** the December windows are compiled in: the layer is on (its date switch) and not ?xmaswin=0 */
export const xmasWinOn = (params = QS, now = new Date()) => params.get("xmaswin") !== "0" && xmasActive(params, now);
export const XMAS_WIN = {
  on: xmasWinOn(),      // compiled in (read once, at boot)
  share: 0.12,          // of all rooms: unlit ones with a string (the lit share is 0.341: litHash.js LIT_PROB)
  litShare: 0.38,       // of the lit rooms
  beads: 11,            // per window (two swags)
  glow: 0.16,           // a string room's faint warm glow (x a lit room's emission)
};
/** 1 = the December strings shown (set by xmasCity.js when the layer starts; 0 until then and with ?xmaswin=0) */
export const xmasWin = uniform(0);
