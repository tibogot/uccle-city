// viewer/cellCull.js's triangle sort, off the main thread: { id, P, src, cell } -> { id, I, rec, boxes, n }
import { cellSort } from "./cellSort.js";

self.onmessage = (e) => {
  const { id, P, src, cell } = e.data;
  const r = cellSort(P, src, cell);
  self.postMessage({ id, ...r }, [r.I.buffer, r.rec.buffer, r.boxes.buffer]);
};
