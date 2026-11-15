// boot3 (docs/BOOT.md section 5): an AO map (a grey PNG) decoded OFF THE MAIN THREAD to its red channel: a small
// worker fetches it, createImageBitmap decodes it, an OffscreenCanvas reads it back. The bridges' loadAO decoded on the
// main thread (Image + canvas getImageData + a 4 M px loop: 0.38 s of the boot's main thread for the rail bridges).
// The same bytes (no colour conversion, no premultiplication: an opaque grey PNG), the same R8 texture after.
// One worker, reused; ?aodecode=old: the callers' main-thread path.
export const AO_DECODE_OLD = new URLSearchParams(location.search).get("aodecode") === "old";
let worker = null, seq = 0;
const waiting = new Map();
function getWorker() {
  if (worker) return worker;
  const src = `self.onmessage = async (e) => {
    const { id, url } = e.data;
    try {
      const bmp = await createImageBitmap(await (await fetch(url)).blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
      const c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(bmp, 0, 0);
      const d = x.getImageData(0, 0, bmp.width, bmp.height).data, r = new Uint8Array(bmp.width * bmp.height);
      for (let i = 0; i < r.length; i++) r[i] = d[i * 4];
      postMessage({ id, w: bmp.width, h: bmp.height, r }, [r.buffer]);
    } catch (err) { postMessage({ id, error: String(err && err.message || err) }); }
  };`;
  worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  worker.onmessage = ({ data }) => { const p = waiting.get(data.id); waiting.delete(data.id); if (!p) return; if (data.error) p.rej(new Error(data.error)); else p.res(data); };
  worker.onerror = (e) => { for (const p of waiting.values()) p.rej(new Error(e.message || "AO worker failed")); waiting.clear(); worker = null; };
  return worker;
}
/** { w, h, r: Uint8Array } of the PNG at url (its red channel) */
export function decodeAO(url) {
  return new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); getWorker().postMessage({ id, url: new URL(url, location.href).href }); });
}
