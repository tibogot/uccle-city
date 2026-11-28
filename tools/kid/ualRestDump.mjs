#!/usr/bin/env node
// The UAL rest pose (world joint positions + rotations, glTF Y-up) read from models/characters/kid.glb (its joints are
// the UAL rig's, rest ORIENTATIONS unchanged: docs/KID.md) -> models/kid/ual_rest.json, the target of the MPFB kid's
// T-pose match (tools/blender/kidGame.py: every MPFB bone turned to the UAL bone's direction before binding).
//   node tools/kid/ualRestDump.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGLB, sampleAnim, worldPose } from "../characters/gltfAnim.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const g = readGLB(path.join(root, "models/characters/kid.glb"));
const W = worldPose(g, sampleAnim(g, null, 0));
const out = {};
g.nodes.forEach((n, i) => { out[n.name] = { p: W[i].p.map((x) => +x.toFixed(6)), q: W[i].q.map((x) => +x.toFixed(6)), parent: n.parent >= 0 ? g.nodes[n.parent].name : null }; });
fs.mkdirSync(path.join(root, "models/kid"), { recursive: true });
fs.writeFileSync(path.join(root, "models/kid/ual_rest.json"), JSON.stringify(out, null, 1));
console.log("models/kid/ual_rest.json", Object.keys(out).length, "nodes; upperarm_l", out.upperarm_l.p, "lowerarm_l", out.lowerarm_l.p);
