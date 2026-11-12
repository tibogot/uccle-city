// Records the flag loops off the main thread (flagCloth.js bakeLoop): { id, cloth, levels: [{ speed, seed }],
// frames, fps } -> { id, bakes: [{ frames, fps, count, pos, nrm, prevOfFirst }] } (buffers transferred).
import { bakeLoop } from "./flagCloth.js";
self.onmessage = (e) => {
  const { id, cloth, levels, frames, fps } = e.data;
  const bakes = levels.map((l) => { const b = bakeLoop(cloth, { speed: l.speed, seed: l.seed, frames, fps }); delete b.cloth; return b; });
  self.postMessage({ id, bakes }, bakes.flatMap((b) => [b.pos.buffer, b.nrm.buffer, b.prevOfFirst.buffer]));
};
