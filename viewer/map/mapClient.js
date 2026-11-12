// The main thread's handle on viewer/map/mapWorker.js: request(msg) -> Promise of the answer with the same id.
export class MapClient {
  constructor(base = new URL('../../data/map/', import.meta.url)) {
    this.worker = new Worker(new URL('./mapWorker.js', import.meta.url), { type: 'module' });
    this.seq = 0;
    this.wait = new Map();
    this.worker.onmessage = (e) => {
      const m = e.data, f = this.wait.get(m.id);
      if (f) { this.wait.delete(m.id); f(m); }
    };
    this.worker.onerror = (e) => console.error('map worker:', e.message || e);
    this.ready = this.request({ type: 'init', base: String(base) }).then((r) => {
      if (r.error) throw new Error(r.error);
      Object.assign(this, { landmarks: r.landmarks, stops: r.stops, extent: r.extent, boundary: r.boundary, info: r });
      return r;
    });
  }
  request(msg) {
    const id = ++this.seq;
    return new Promise((res) => { this.wait.set(id, res); this.worker.postMessage({ ...msg, id }); });
  }
  post(msg) { this.worker.postMessage(msg); }
}
