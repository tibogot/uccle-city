// SAFE WORKTREE REMOVAL (rule worktree-remove-safe). The ONLY way to remove a job worktree by hand:
//   node tools/worktreeRemove.mjs <worktree path> [--repo <main checkout>]
// A job worktree holds junctions into the main checkout (data/raw, tools/*/node_modules). `git worktree remove --force`
// (and any recursive delete) FOLLOWS a junction on Windows and deletes the target's contents: on 2026-11-23 the
// coordinator's by-hand removal of a temp worktree emptied the main checkout's data/raw (3,129 git-ignored files) because
// the junction unlink had failed on a path-quoting error and the remove ran anyway.
// This tool:
//   1. lists every junction / symlink inside the worktree (lstat, never descending into one);
//   2. removes each AS A LINK ONLY (fs.rmdirSync / unlinkSync on the link itself, which never touches the target);
//   3. scans AGAIN and REFUSES to go on if any link is left;
//   4. counts the files of every link TARGET before and after, and refuses on any change;
//   5. only then runs `git worktree remove --force`.
import { readdirSync, lstatSync, readlinkSync, rmdirSync, unlinkSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

export function findLinks(root) {
  const links = [];
  const scan = (d) => {
    let ents;
    try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      let st; try { st = lstatSync(p); } catch { continue; }
      if (st.isSymbolicLink()) links.push(p);         // junctions report as symbolic links to lstat on Windows
      else if (st.isDirectory() && e.name !== ".git") scan(p);
    }
  };
  scan(root);
  return links;
}

const countFiles = (d) => { let n = 0; const w = (x) => { let ents; try { ents = readdirSync(x, { withFileTypes: true }); } catch { return; } for (const e of ents) { const p = path.join(x, e.name); let st; try { st = lstatSync(p); } catch { continue; } if (st.isSymbolicLink()) continue; if (st.isDirectory()) w(p); else n++; } }; if (existsSync(d)) w(d); return n; };

/** unlink every link inside wt (as a link), verify, count targets; returns { ok, log, targets } without removing wt */
export function unlinkAll(wt) {
  const log = [];
  const links = findLinks(wt);
  const targets = links.map((l) => { let t = null; try { t = path.resolve(path.dirname(l), readlinkSync(l)); } catch {} return { link: l, target: t, before: t ? countFiles(t) : 0 }; });
  for (const { link } of targets) {
    try { rmdirSync(link); log.push(`unlinked ${link}`); }
    catch { try { unlinkSync(link); log.push(`unlinked ${link}`); } catch (e) { log.push(`FAILED to unlink ${link}: ${e.message}`); } }
  }
  const left = findLinks(wt);
  for (const t of targets) t.after = t.target ? countFiles(t.target) : 0;
  const changed = targets.filter((t) => t.after < t.before);   // (fewer files = deleted through the link; more = someone writing there meanwhile, e.g. a fetch)
  const ok = left.length === 0 && changed.length === 0;
  if (left.length) log.push(`REFUSED: ${left.length} link(s) still inside: ${left.join(", ")}`);
  for (const t of changed) log.push(`REFUSED: link target ${t.target} had ${t.before} files, now ${t.after}`);
  return { ok, log, targets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const wt = process.argv[2] ? path.resolve(process.argv[2]) : null;
  const ri = process.argv.indexOf("--repo");
  const repo = ri > 0 ? path.resolve(process.argv[ri + 1]) : process.cwd();
  if (!wt || !existsSync(wt)) { console.error("usage: node tools/worktreeRemove.mjs <worktree path> [--repo <main checkout>]"); process.exit(2); }
  if (path.resolve(wt) === path.resolve(repo)) { console.error("REFUSED: that is the main checkout"); process.exit(2); }
  const r = unlinkAll(wt);
  for (const l of r.log) console.log(l);
  if (!r.ok) { console.error("worktree KEPT: fix the above by hand (cmd /c rmdir <link>), then run this again"); process.exit(1); }
  const rm = spawnSync("git", ["worktree", "remove", "--force", wt], { cwd: repo, encoding: "utf8" });
  process.stdout.write(rm.stdout + rm.stderr);
  if (rm.status !== 0) { console.error(`git worktree remove failed (links are already gone, so a plain delete of ${wt} is now safe)`); process.exit(1); }
  for (const t of r.targets) if (t.target) { const n = countFiles(t.target); if (n < t.before) { console.error(`AFTER REMOVE: ${t.target} had ${t.before} files, now ${n}: STOP`); process.exit(1); } }
  console.log(`removed ${wt}; every link target unchanged (${r.targets.map((t) => `${path.basename(t.target || "?")} ${t.before}`).join(", ")})`);
}
