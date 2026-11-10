// THE PRE-PACK HOOK every hero pack calls (tools/<hero>_pack.mjs), see README.md:
//
//   import { auditBeforePack } from "./mesh_audit/hook.mjs";
//   await auditBeforePack(src, { name: "stalle", nodes: [...], range: {...}, ignoreBelow, offset, allow, reportDir });
//
// It audits the RAW GLB Blender wrote (before quantization), writes <reportDir>/<name>.audit.{json,md}, and STOPS the
// pack (process.exit(1)) while blocking items remain, unless the command line has --force-audit (then it warns; a
// report is still written). After packing, call auditAfterPack(dst, ...) to check the packed file too (quantized
// positions can merge nearly coincident faces): its report goes to <name>.packed.audit.*.
import fs from "fs";
import path from "path";
import { auditGlb } from "./cli.mjs";

const FORCE = process.argv.includes("--force-audit");

/** LOD GROUPS: only nodes that are drawn TOGETHER can fight. `groups: [{ name: "lod0", nodes: [...] }, ...]` audits each
 *  group on its own (reports <name>.<group>.audit.*); LODs that are never shown together (a dithered cross-fade draws
 *  complementary pixels) are not compared. Exits once after all groups when any has blocking items. */
export async function auditGroups(file, opts, after = false) {
  let blocking = 0; const out = {};
  for (const g of opts.groups) {
    const r = await (after ? auditAfterPack : auditBeforePack)(file, { ...opts, groups: undefined, name: `${opts.name}.${g.name}`, nodes: g.nodes, noExit: true });
    blocking += r.summary.blocking; out[g.name] = r.summary;
  }
  if (!after && blocking && !FORCE) {
    console.error(`[mesh audit] ${opts.name}: ${blocking} blocking item(s) over ${opts.groups.length} LOD groups: pack STOPPED (--force-audit to pack anyway)`);
    process.exit(1);
  }
  return out;
}

export async function auditBeforePack(file, { name, nodes = null, noExit = false, range = {}, ignoreBelow, offset = [0, 0, 0], allow = [], allowFile = null, reportDir = "docs/audit", skip = [] } = {}) {
  if (allowFile && fs.existsSync(allowFile)) allow = [...allow, ...JSON.parse(fs.readFileSync(allowFile))];
  const set = ignoreBelow != null ? { ignoreBelow } : {};
  const r = await auditGlb(file, { nodes, range, allow, skip, offset, set, out: reportDir, title: `Mesh audit (before pack): ${name}` });
  rename(reportDir, file, `${name}.audit`);
  if (r.summary.blocking && !FORCE && !noExit) {
    console.error(`[mesh audit] ${name}: ${r.summary.blocking} blocking item(s): pack STOPPED (see ${reportDir}/${name}.audit.md; --force-audit to pack anyway)`);
    process.exit(1);
  }
  if (r.summary.blocking && !noExit) console.warn(`[mesh audit] ${name}: ${r.summary.blocking} blocking item(s) IGNORED (--force-audit)`);
  return r;
}

export async function auditAfterPack(file, { name, nodes = null, noExit = false, range = {}, ignoreBelow, offset = [0, 0, 0], allow = [], allowFile = null, reportDir = "docs/audit", skip = [] } = {}) {
  if (allowFile && fs.existsSync(allowFile)) allow = [...allow, ...JSON.parse(fs.readFileSync(allowFile))];
  const set = ignoreBelow != null ? { ignoreBelow } : {};
  const r = await auditGlb(file, { nodes, range, allow, skip, offset, set, out: reportDir, title: `Mesh audit (packed): ${name}` });
  rename(reportDir, file, `${name}.packed.audit`);
  if (r.summary.blocking) console.warn(`[mesh audit] ${name} (packed): ${r.summary.blocking} blocking item(s) after quantization: see ${reportDir}/${name}.packed.audit.md`);
  return r;
}

function rename(dir, file, to) {
  const base = path.join(dir, path.basename(file).replace(/\.glb$/i, ""));
  for (const ext of [".audit.json", ".audit.md"]) {
    if (fs.existsSync(base + ext)) fs.renameSync(base + ext, path.join(dir, to + ext.replace(".audit", "")));
  }
}
