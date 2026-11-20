// THE RULE AND CENSUS INDEXES (claude/speed1, docs/SPEED_PLAN.md job 2, docs/WORKFLOW.md).
//   node tools/docs/rulesIndex.mjs            regenerate docs/QUALITY_RULES.md (from docs/rules/*.md) and docs/CENSUS.md
//                                             (from docs/census/*.md)
//   node tools/docs/rulesIndex.mjs --check    exit 1 when either index is not what the files make (the `meta` gate row)
// WHY: QUALITY_RULES.md and CENSUS.md were one file each that every job edited: 21 and 15 of the last 40 merges had
// both sides change them, and rules were renumbered 5 times. Now one file per rule / class, named by slug; the indexes
// are generated, never edited by hand.
//
// A rule file docs/rules/<slug>.md:
//   ---
//   number: 7                 (rules 1-48 only: the old number, kept for history ("rule 7" in docs and code); a NEW rule
//                              has NO number: it is named by its slug)
//   status: provisional       (optional)
//   added: 2026-11-20         (new rules: the index lists unnumbered rules by this date, then slug)
//   check: `meta` (tools/audit/metaGate.mjs)     (the gate row(s) / check that enforce it)
//   ---
//   **Rule.** what must hold (one paragraph)
//
//   **Why.** what went wrong (one paragraph)
//
//   (anything after: notes, kept in the file only)
// A census class file docs/census/<class>.md (lower case: a.md, b.md ...):
//   ---
//   class: A
//   title: Open meshes / missing walls
//   row: | A. Open meshes ... | `openMeshes.mjs` | ... |     (0 or more: its summary-table rows, verbatim)
//   ---
//   markdown body (its sections), copied into the index under "## Class <class>: <title>"
// docs/census/_head.md and _tail.md are the index's fixed top and bottom.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RULES_DIR = "docs/rules", CENSUS_DIR = "docs/census";
const RULES_OUT = "docs/QUALITY_RULES.md", CENSUS_OUT = "docs/CENSUS.md";
const nl = (s) => s.replace(/\r\n/g, "\n");

/** frontmatter (key: value lines, a key may repeat) + body */
export function parseDoc(src) {
  const s = nl(src);
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(s);
  const meta = {}, multi = {};
  if (m) for (const l of m[1].split("\n")) {
    const k = /^([a-z][\w-]*):\s?(.*)$/.exec(l);
    if (!k) continue;
    (multi[k[1]] ??= []).push(k[2]);
    meta[k[1]] = k[2];
  }
  return { meta, multi, body: m ? s.slice(m[0].length) : s };
}
const para = (body, label) => {
  const i = body.indexOf(`**${label}.**`);
  if (i < 0) return "";
  const rest = body.slice(i + label.length + 5);
  const end = rest.search(/\n\s*\n/);
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s*\n\s*/g, " ").trim();
};

/** every rule file, index order: numbered by number, then the new ones by added date, then slug */
export function loadRules(root = ROOT) {
  const dir = path.join(root, RULES_DIR);
  if (!existsSync(dir)) return [];
  const rules = readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_")).map((f) => {
    const { meta, body } = parseDoc(readFileSync(path.join(dir, f), "utf8"));
    return { slug: f.slice(0, -3), number: meta.number ? +meta.number : null, status: meta.status || "", added: meta.added || "", check: meta.check || "", rule: para(body, "Rule"), why: para(body, "Why"), file: `${RULES_DIR}/${f}` };
  });
  return rules.sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9) || (a.added < b.added ? -1 : a.added > b.added ? 1 : 0) || (a.slug < b.slug ? -1 : 1));
}
export const ruleSource = (r) => [
  "---", ...(r.number != null ? [`number: ${r.number}`] : []), ...(r.status ? [`status: ${r.status}`] : []), ...(r.added ? [`added: ${r.added}`] : []), `check: ${r.check}`, "---",
  `**Rule.** ${r.rule}`, "", `**Why.** ${r.why}`, "",
].join("\n");

/** the rows of the OLD single-file table (`| 7 | rule | why | check |`, before claude/speed1), for convertBranch.mjs */
export function parseLegacyRules(md) {
  const out = [];
  for (const l of nl(md).split("\n")) {
    const m = /^\| (\d+)( \(provisional\))? \| (.*) \|\s*$/.exec(l);
    if (!m) continue;
    const parts = m[3].split(" | ");
    if (parts.length < 3) continue;
    const check = parts.pop(), why = parts.pop(), rule = parts.join(" | ");
    out.push({ number: +m[1], status: m[2] ? "provisional" : "", rule: rule.trim(), why: why.trim(), check: check.trim() });
  }
  return out;
}
/** a slug from a rule's text: its first words that matter */
export function slugOf(text, taken = new Set()) {
  const stop = new Set("a an the of to and or is are be by in on at for from with its it as never every any no not one that this what where when which who".split(" "));
  const w = text.replace(/`[^`]*`/g, " ").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((x) => x && !stop.has(x));
  let s = w.slice(0, 4).join("-") || "rule", i = 2;
  const base = s;
  while (taken.has(s)) s = `${base}-${i++}`;
  return s;
}

const cell = (s) => s.replace(/\|/g, "\\|");
export function rulesIndex(root = ROOT) {
  const rules = loadRules(root);
  const head = existsSync(path.join(root, RULES_DIR, "_head.md")) ? nl(readFileSync(path.join(root, RULES_DIR, "_head.md"), "utf8")).trimEnd() : "# Quality rules";
  const rows = rules.map((r) => `| [${r.slug}](rules/${r.slug}.md) | ${r.number ?? ""}${r.status ? ` (${r.status})` : ""} | ${cell(r.rule)} | ${cell(r.why)} | ${cell(r.check)} |`);
  return `<!-- GENERATED by tools/docs/rulesIndex.mjs from docs/rules/*.md: do not edit here (docs/WORKFLOW.md) -->\n${head}\n\n| rule | # | rule | why (what went wrong) | check |\n|---|---|---|---|---|\n${rows.join("\n")}\n`;
}

/** every census class file, by class */
export function loadCensus(root = ROOT) {
  const dir = path.join(root, CENSUS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_")).map((f) => {
    const { meta, multi, body } = parseDoc(readFileSync(path.join(dir, f), "utf8"));
    return { id: f.slice(0, -3), cls: meta.class || f.slice(0, -3).toUpperCase(), title: meta.title || "", rows: multi.row || [], body: body.trim(), file: `${CENSUS_DIR}/${f}` };
  }).sort((a, b) => (a.cls < b.cls ? -1 : a.cls > b.cls ? 1 : 0));
}
export function censusIndex(root = ROOT) {
  const C = loadCensus(root);
  const part = (n) => (existsSync(path.join(root, CENSUS_DIR, n)) ? nl(readFileSync(path.join(root, CENSUS_DIR, n), "utf8")).trim() : "");
  const rows = C.flatMap((c) => c.rows);
  const out = [
    `<!-- GENERATED by tools/docs/rulesIndex.mjs from docs/census/*.md: do not edit here (docs/WORKFLOW.md) -->`,
    part("_head.md"), "",
    "## Summary", "",
    "| class | detector | count (city-wide, 120 tiles) | owner spot flagged? | generator | root-cause guess |",
    "|---|---|---|---|---|---|",
    ...rows, "",
    ...C.flatMap((c) => [`## Class ${c.cls}: ${c.title} ([${c.id}.md](census/${c.id}.md))`, "", c.body, ""]),
    part("_tail.md"), "",
  ];
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const [out, make] of [[RULES_OUT, rulesIndex], [CENSUS_OUT, censusIndex]]) {
    const want = make(ROOT), f = path.join(ROOT, out);
    const have = existsSync(f) ? nl(readFileSync(f, "utf8")) : "";
    if (have === want) { console.log(`ok   ${out} is current`); continue; }
    if (check) { stale++; console.log(`FAIL ${out} is not what its files make: run node tools/docs/rulesIndex.mjs (never edit the index by hand)`); }
    else { writeFileSync(f, want); console.log(`wrote ${out}`); }
  }
  process.exit(stale ? 1 : 0);
}
