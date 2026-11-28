// NO CALL TO A NAME THE MODULE NEVER HAS (claude/tramfix, rule no-undefined-refs): a cheap static scan, no parser
// dependency. A refactor that moved tramline.js's finish() into tramSched.js as finishShape (claude/missions) left one
// `finish(t)` behind: the module parsed and linked (meta row 3), the gate's tram rows ran their own copy of the snap, and
// the city threw `ReferenceError: finish is not defined` on every tram tile for a day (the trams on the raw GTFS line).
//   node tools/audit/undefRefs.mjs [files...]        default: every viewer/ debug/ tools/ .js / .mjs module; exit 1 on a finding
// What it flags: a bare call `name(` (not `.name(`, not a keyword) where `name` appears NOWHERE else in the module:
// not declared (function / const / let / var / class / a parameter / destructuring), not imported, not a method
// definition `name(...) {`, and not a global (globalThis of node, plus the browser / worker globals below). It is
// deliberately weak (a stale name that happens to be mentioned elsewhere in the file passes) but never needs a
// parser, and it would have caught `finish(t)`. Comments, strings and template text are blanked first.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const KEYWORDS = new Set("if for while switch catch function return typeof new await async yield do else case delete void in of instanceof super this import export class extends with throw try finally var let const static get set".split(" "));
// browser / worker globals (and gc: node --expose-gc) node's globalThis does not have
const BROWSER = new Set(("window document navigator location requestAnimationFrame cancelAnimationFrame requestIdleCallback cancelIdleCallback " +
  "getComputedStyle matchMedia alert confirm prompt open close postMessage importScripts addEventListener removeEventListener dispatchEvent " +
  "createImageBitmap Image ImageData ImageBitmap OffscreenCanvas HTMLCanvasElement Worker SharedWorker Audio AudioContext OfflineAudioContext " +
  "IntersectionObserver ResizeObserver MutationObserver PerformanceObserver GPUBufferUsage GPUTextureUsage GPUShaderStage GPUMapMode " +
  "Path2D Option FileReader KeyboardEvent MouseEvent PointerEvent WheelEvent FocusEvent TouchEvent DOMParser XMLSerializer HTMLElement VideoFrame VideoDecoder VideoEncoder MediaRecorder DecompressionStream CompressionStream showSaveFilePicker scrollTo scrollBy gc").split(" "));

/** s with comments, string and template text blanked (newlines kept); ${...} inside templates kept as code */
export function blank(s) {
  let out = "", i = 0;
  const n = s.length, stack = [];                     // stack of "`" (in template text) / "{" (in a ${ } or a block inside one)
  let prev = "";                                     // last significant code char (regex literal guess)
  while (i < n) {
    const c = s[i], d = s[i + 1];
    const inTpl = stack[stack.length - 1] === "`";
    if (inTpl) {
      if (c === "\\") { out += "  "; i += 2; continue; }
      if (c === "`") { stack.pop(); out += c; i++; prev = "`"; continue; }
      if (c === "$" && d === "{") { stack.push("{"); out += "${"; i += 2; prev = "{"; continue; }
      out += c === "\n" ? "\n" : " "; i++; continue;
    }
    if (c === "/" && d === "/") { while (i < n && s[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") { const e = s.indexOf("*/", i + 2), j = e < 0 ? n : e + 2; out += s.slice(i, j).replace(/[^\n]/g, " "); i = j; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1; while (j < n && s[j] !== c && s[j] !== "\n") j += s[j] === "\\" ? 2 : 1;
      out += c + " ".repeat(Math.max(0, Math.min(j, n) - i - 1)) + c; i = j + 1; prev = c; continue;
    }
    if (c === "`") { stack.push("`"); out += c; i++; continue; }
    // a regex literal: "/" where an operand is expected (after an operator / opening bracket / keyword-ish char)
    if (c === "/" && (prev === "" || "(,=:[!&|?{};+-*%<>~^".includes(prev))) {
      let j = i + 1, cls = false;
      while (j < n && s[j] !== "\n") { if (s[j] === "\\") { j += 2; continue; } if (s[j] === "[") cls = true; else if (s[j] === "]") cls = false; else if (s[j] === "/" && !cls) break; j++; }
      if (j < n && s[j] === "/") { out += "/" + " ".repeat(j - i - 1) + "/"; i = j + 1; while (i < n && /[a-z]/.test(s[i])) { out += " "; i++; } prev = "/"; continue; }
    }
    if (c === "{") stack.push("{");
    else if (c === "}" && stack.length) { stack.pop(); if (stack[stack.length - 1] === "`") { out += c; i++; continue; } }
    if (!/\s/.test(c)) prev = /[\w$)\]]/.test(c) ? "a" : c;
    if (/[\w$]/.test(c)) { let j = i; while (j < n && /[\w$]/.test(s[j])) j++; const w = s.slice(i, j); if (KEYWORDS.has(w) && w !== "this" && w !== "super") prev = "("; out += w; i = j; continue; }
    out += c; i++;
  }
  return out;
}

/** the calls in a module's source to a name the module never otherwise mentions: [{ name, line }] */
export function undefinedCalls(src, globals = new Set([...Object.getOwnPropertyNames(globalThis), ...BROWSER])) {
  const code = blank(src);
  const calls = new Map(), other = new Set();
  const re = /(?<![\w$.#])([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(code))) {
    const name = m[1], at = m.index + m[0].length;
    let b = m.index - 1; while (b >= 0 && /s/.test(code[b])) b--;
    if (b >= 0 && code[b] === ".") continue;                     // a member (a.b, a?.b, a chain broken over lines)
    let j = at; while (j < code.length && (code[j] === " " || code[j] === "\t")) j++;
    const call = code[j] === "(" || (code[j] === "?" && code[j + 1] === "." && code[j + 2] === "(");
    if (!call) { other.add(name); continue; }
    if (KEYWORDS.has(name)) continue;
    // a definition `name(...) {` (method shorthand, function declaration after `function`)
    let k = j, depth = 0;
    for (; k < code.length; k++) { if (code[k] === "(") depth++; else if (code[k] === ")" && --depth === 0) break; }
    let q = k + 1; while (q < code.length && /\s/.test(code[q])) q++;
    if (code[q] === "{") { other.add(name); continue; }
    const before = code.slice(Math.max(0, m.index - 12), m.index);
    if (/\b(function\*?|get|set|static|async)\s*$/.test(before)) { other.add(name); continue; }
    if (!calls.has(name)) calls.set(name, code.slice(0, m.index).split("\n").length);
  }
  return [...calls].filter(([n]) => !other.has(n) && !globals.has(n)).map(([name, line]) => ({ name, line }));
}

const walk = (d, out = []) => {
  if (!existsSync(d)) return out;
  for (const n of readdirSync(d)) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = path.join(d, n), st = statSync(p);
    if (st.isDirectory()) walk(p, out); else if (/\.m?js$/.test(n) && !/\.bundle\.js$/.test(n)) out.push(p);
  }
  return out;
};
/** every viewer/ debug/ tools/ module (generated bundles skipped): [{ file, name, line }] */
export function scan(root = ROOT, files = ["viewer", "debug", "tools"].flatMap((d) => walk(path.join(root, d)))) {
  const out = [];
  for (const f of files) for (const r of undefinedCalls(readFileSync(f, "utf8"))) out.push({ file: path.relative(root, f).replace(/\\/g, "/"), ...r });
  return { files: files.length, found: out };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const { files, found } = args.length ? scan(ROOT, args.map((a) => path.resolve(a))) : scan();
  for (const r of found) console.log(`FAIL ${r.file}:${r.line}: ${r.name}() is called but never declared, imported or a global`);
  console.log(found.length ? `${found.length} undefined call(s) in ${files} modules` : `no undefined calls in ${files} modules`);
  process.exit(found.length ? 1 : 0);
}
