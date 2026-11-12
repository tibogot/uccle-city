// The overhead map's shape pass off the main thread (overheadShape.js): ~100-350 ms of loops that used to block a frame.
import { computeOverheadShape } from "./overheadShape.js";
self.onmessage = (e) => {
  const r = computeOverheadShape(e.data);
  self.postMessage(r, [r.H.buffer, r.Hs.buffer, r.shelter.buffer, r.shape.buffer, r.cliff.buffer, r.road.buffer, r.eaves.buffer]);
};
