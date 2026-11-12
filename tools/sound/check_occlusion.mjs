import { SoundEngine } from "../../viewer/audio/engine.js";
const e = Object.create(SoundEngine.prototype); e.occluders = [{ minX: 2, maxX: 40, minZ: -40, maxZ: -6, maxY: 14 }]; e.occlusionOn = true;
const out = [];
for (let t = 0; t <= 12; t += 1) { const L = { x: 14 - t * 1.33, y: 1.7, z: -2 }; out.push(t + ":" + e.obstruction({ x: -1, y: 0.5, z: -30 }, L).toFixed(2)); }
console.log(out.join(" "));
