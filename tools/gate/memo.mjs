// Row memo (docs/SPEED_PLAN.md job 5, docs/WORKFLOW.md "Memo and --changed").
// A row's key = sha256 of: the node version, the row's gate.d file, and every file in its last trace (its content hash)
// and every directory it listed (the names in it). After a PASS, mergeGate.mjs writes the key to
// .cache/gate/pass/<row>.json; the next run skips the row while its key is the same (`--full` ignores the memo).
// File hashes are cached by (size, mtime) in .cache/gate/hashes.json, so a check costs a stat per file.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, statSync, readdirSync, mkdirSync, existsSync, renameSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./rowFiles.mjs";
import { CACHE } from "./deps.mjs";

export const PASS_DIR = path.join(CACHE, "pass");
const HASHES = path.join(CACHE, "hashes.json");
let hashes = null, dirty = false;
const load = () => { if (hashes) return; try { hashes = JSON.parse(readFileSync(HASHES, "utf8")); } catch { hashes = {}; } };
const sha = (b) => createHash("sha1").update(b).digest("hex");

/** the content hash of a repo file ("-" when missing; a directory hashes its names) */
export function fileHash(rel) {
  load();
  const abs = path.join(ROOT, rel);
  let st;
  try { st = statSync(abs); } catch { return "-"; }
  if (st.isDirectory()) return "dir:" + dirHash(rel);
  const k = `${st.size}:${st.mtimeMs}`, h = hashes[rel];
  if (h && h[0] === k) return h[1];
  let v;
  try { v = sha(readFileSync(abs)); } catch { return "-"; }
  hashes[rel] = [k, v]; dirty = true;
  return v;
}
/** the names in a directory (recursive: every path below it) */
export function dirHash(rel, recursive = false) {
  const abs = path.join(ROOT, rel);
  try {
    const names = recursive ? readdirSync(abs, { recursive: true }).map(String) : readdirSync(abs);
    return sha(names.map((n) => n.replace(/\\/g, "/")).sort().join("\n"));
  } catch { return "-"; }
}
export function saveHashes() {
  if (!dirty) return;
  mkdirSync(CACHE, { recursive: true });
  const tmp = HASHES + `.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(hashes));
  renameSync(tmp, HASHES);
  dirty = false;
}

/** the memo key of a row for a trace ({ files, dirs, rdirs }), or null without one */
export function rowKey(row, trace) {
  if (!trace) return null;
  const h = createHash("sha256");
  h.update(`node ${process.version}\n`);
  h.update(`row ${fileHash(row.file)}\n`);
  for (const f of trace.files) h.update(`f ${f} ${fileHash(f)}\n`);
  for (const d of row.deps || []) h.update(d.endsWith("/") ? `D ${d} ${dirHash(d.slice(0, -1), true)}\n` : `f ${d} ${fileHash(d)}\n`);
  for (const d of trace.dirs) h.update(`d ${d} ${dirHash(d)}\n`);
  for (const d of trace.rdirs) h.update(`D ${d} ${dirHash(d, true)}\n`);
  return h.digest("hex");
}

export function readPass(name) {
  try { return JSON.parse(readFileSync(path.join(PASS_DIR, `${name}.json`), "utf8")); } catch { return null; }
}
export function writePass(name, key, extra = {}) {
  mkdirSync(PASS_DIR, { recursive: true });
  writeFileSync(path.join(PASS_DIR, `${name}.json`), JSON.stringify({ row: name, key, at: new Date().toISOString(), ...extra }, null, 1));
}
export const hasPass = (name) => existsSync(path.join(PASS_DIR, `${name}.json`));
