// The heroes' wire data off the main thread (viewer/heroWires.js wireGeometries): { id, jobs: [{ pos, index }] } ->
// { id, out: [{ data, strokes, wired, bent }] }
import { wireData } from "./heroWireData.js";

self.onmessage = (e) => {
  const out = e.data.jobs.map((j) => wireData(j.pos, j.index));
  self.postMessage({ id: e.data.id, out }, out.map((r) => r.data.buffer));
};
