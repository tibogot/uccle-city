// Gate rows as files (docs/WORKFLOW.md, docs/SPEED_PLAN.md job 1).
//   tools/audit/gate.d/<name>.mjs          one node row:    export default { name, script, node?, args, guards, deps?, timing?, timeout?, meta? }
//   tools/audit/gate.d/browser/<name>.mjs  one browser row: export default { name, text }
// loadRows / loadBrowser read the folder in a stable order: timing rows first (they measure wall time, so they run
// while the machine is quiet), then by name. The legacy helpers parse the old single-file CHECKS / BROWSER arrays
// (tools/audit/mergeGate.mjs before claude/speed1) for tools/gate/convertBranch.mjs.
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const GATE_DIR = path.join(ROOT, "tools/audit/gate.d");
export const BROWSER_DIR = path.join(GATE_DIR, "browser");
export const DEFAULT_TIMEOUT_S = 600;
const NAME = /^[a-z0-9][a-z0-9-]*$/;

async function loadDir(dir, root) {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort();
  const out = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    const row = mod.default;
    const base = f.slice(0, -4);
    if (!row || typeof row !== "object") throw new Error(`${path.relative(root, path.join(dir, f))}: no default export`);
    if (row.name !== base) throw new Error(`${path.relative(root, path.join(dir, f))}: name "${row.name}" is not the file name "${base}"`);
    if (!NAME.test(row.name)) throw new Error(`${f}: a row name is lower case letters, digits and "-"`);
    out.push({ ...row, file: path.relative(root, path.join(dir, f)).replace(/\\/g, "/") });
  }
  return out;
}

/** every node row, in run order */
export async function loadRows(root = ROOT) {
  const rows = await loadDir(path.join(root, "tools/audit/gate.d"), root);
  for (const r of rows) {
    if (typeof r.script !== "string" || !Array.isArray(r.args ?? []) || typeof r.guards !== "string") throw new Error(`${r.file}: needs script (string), args (array), guards (string)`);
    r.args = r.args ?? [];
    r.node = r.node ?? [];
    r.timeout = r.timeout ?? DEFAULT_TIMEOUT_S;
  }
  return rows.sort((a, b) => (b.timing ? 1 : 0) - (a.timing ? 1 : 0) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** every browser row (text for the browser turn), by name */
export async function loadBrowser(root = ROOT) {
  const rows = await loadDir(path.join(root, "tools/audit/gate.d/browser"), root);
  for (const r of rows) if (typeof r.text !== "string") throw new Error(`${r.file}: needs text (string)`);
  return rows;
}

// ------------------------------------------------------------------ writing row files
const lit = (v) => JSON.stringify(v);
export function rowSource(row) {
  const keys = ["name", "script", "node", "args", "guards", "deps", "timing", "timeout"];
  const lines = [`// gate row \`${row.name}\` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)`, "export default {"];
  for (const k of keys) {
    if (row[k] === undefined || (k === "node" && !row[k].length)) continue;
    lines.push(`  ${k}: ${lit(row[k])},`);
  }
  lines.push("};", "");
  return lines.join("\n");
}
export const browserSource = (row) => `// browser gate row \`${row.name}\` (run on a browser turn; docs/WORKFLOW.md)\nexport default {\n  name: ${lit(row.name)},\n  text: ${lit(row.text)},\n};\n`;

export function writeRow(row, root = ROOT) {
  const f = path.join(root, "tools/audit/gate.d", `${row.name}.mjs`);
  writeFileSync(f, rowSource(row));
  return f;
}
export function writeBrowser(row, root = ROOT) {
  const f = path.join(root, "tools/audit/gate.d/browser", `${row.name}.mjs`);
  writeFileSync(f, browserSource(row));
  return f;
}

/** a stable name for an old BROWSER string: "MOTO FEEL (...)" -> motofeel, "debug/sharpCheck.js  stability(): ..." -> sharpcheck-stability */
export function browserName(text) {
  const dbg = /^debug\/(\w+)\.js\s+(\w+)\(/.exec(text);
  if (dbg) return `${dbg[1]}-${dbg[2]}`.toLowerCase();
  const head = /^([A-Z0-9][A-Z0-9 ]*[A-Z0-9])\b/.exec(text);
  if (head) return head[1].replace(/\s+/g, "").toLowerCase();
  return text.slice(0, 24).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ------------------------------------------------------------------ the old single-file format
/** the CHECKS and BROWSER arrays of an old tools/audit/mergeGate.mjs source (null when the source has none) */
export function parseLegacyGate(src) {
  const grab = (decl) => {
    const a = src.indexOf(decl);
    if (a < 0) return null;
    let i = src.indexOf("[", a), depth = 0, q = null;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (q) { if (c === "\\") j++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === "`") q = c;
      else if (c === "[") depth++;
      else if (c === "]" && --depth === 0) return new Function(`return ${src.slice(i, j + 1)};`)();
    }
    throw new Error(`${decl}: unbalanced array`);
  };
  const checks = grab("const CHECKS = ");
  if (!checks) return null;
  return { checks, browser: grab("const BROWSER = ") ?? [] };
}
