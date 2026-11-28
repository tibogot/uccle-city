// THE EMBASSY FLAGS' SOURCES (rule embassy-flags): the national flags as drawn on Wikimedia Commons, downloaded once
// with their licence read from each file's page (the Commons API's extmetadata: LicenseShortName, License, Artist,
// AttributionRequired), into data/raw/flags/commons/ (untrusted downloads: their own folder, never edited in place;
// data/raw is not in git). The record (file, page, licence, author, sha1 = Commons' own, the size) goes into
// data/flags/embassy_sources.json (in git): tools/flags/build_atlas.mjs rasterises from it, the gate checks it.
//   node tools/flags/fetch_flags.mjs [--force]      (only a generic user agent and the file titles are sent)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RAW = path.join(ROOT, "data/raw/flags/commons"), OUT = path.join(ROOT, "data/flags/embassy_sources.json");
const UA = { "User-Agent": "uccle-city-pipeline/0.1" };
// design key -> the Commons file of the national flag
export const FILES = {
  eu: "Flag of Europe.svg",
  hungary: "Flag of Hungary.svg",
  bulgaria: "Flag of Bulgaria.svg",
  romania: "Flag of Romania.svg",
  ukraine: "Flag of Ukraine.svg",
  burkina_faso: "Flag of Burkina Faso.svg",
  eritrea: "Flag of Eritrea.svg",
  kenya: "Flag of Kenya.svg",
  angola: "Flag of Angola.svg",
  nicaragua: "Flag of Nicaragua.svg",
  afghanistan: "Flag of Afghanistan (2013–2021).svg",
  eswatini: "Flag of Eswatini.svg",
};
/** fetch with a polite retry on 429 / 5xx (Wikimedia rate limits) */
async function get(url) {
  for (let k = 0; ; k++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok || k >= 5 || !(r.status === 429 || r.status >= 500)) return r;
    await new Promise((res) => setTimeout(res, 15000 * (k + 1)));
  }
}
const strip = (h) => (h ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const force = process.argv.includes("--force");
fs.mkdirSync(RAW, { recursive: true }); fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = { _doc: "The embassy flags' source files (Wikimedia Commons), their licence as read from each file page; written by tools/flags/fetch_flags.mjs; the SVGs themselves in data/raw/flags/commons (not in git). Rule embassy-flags.", fetched: new Date().toISOString().slice(0, 10), flags: {} };
for (const [key, title] of Object.entries(FILES)) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|sha1|size|timestamp|extmetadata&iiextmetadatafilter=LicenseShortName|License|Artist|AttributionRequired|Copyrighted|LicenseUrl&titles=${encodeURIComponent("File:" + title)}`;
  const j = await (await get(api)).json();
  const page = Object.values(j.query.pages)[0], ii = page.imageinfo?.[0];
  if (!ii) throw new Error(`${key}: no file ${title}`);
  const m = ii.extmetadata ?? {}, file = title.replace(/ /g, "_");
  const dst = path.join(RAW, file.replace(/[^\w.()–-]/g, "_"));
  if (force || !fs.existsSync(dst)) {
    const r = await get(ii.url.split("?")[0]);
    if (!r.ok) throw new Error(`${key}: download ${r.status}`);
    fs.writeFileSync(dst, Buffer.from(await r.arrayBuffer()));
  }
  const buf = fs.readFileSync(dst), sha1 = crypto.createHash("sha1").update(buf).digest("hex");
  if (sha1 !== ii.sha1) throw new Error(`${key}: the download's sha1 ${sha1} is not Commons' ${ii.sha1}`);
  out.flags[key] = { title, page: ii.descriptionurl, file: path.relative(ROOT, dst).replace(/\\/g, "/"), sha1, bytes: buf.length,
    width: ii.width, height: ii.height, aspect: +(ii.width / ii.height).toFixed(4), revision: ii.timestamp,
    licence: strip(m.LicenseShortName?.value), licenceCode: strip(m.License?.value), licenceUrl: strip(m.LicenseUrl?.value) || null,
    author: strip(m.Artist?.value), attributionRequired: strip(m.AttributionRequired?.value) === "true" };
  console.log(`${key.padEnd(13)} ${out.flags[key].licence.padEnd(16)} ${(out.flags[key].licenceCode || "").padEnd(10)} ${ii.width}x${ii.height}  ${out.flags[key].author.slice(0, 60)}`);
  await new Promise((r) => setTimeout(r, 3000));
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`-> ${path.relative(ROOT, OUT)}`);
