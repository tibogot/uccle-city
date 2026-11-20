// gate row `heap` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "heap",
  script: "tools/audit/heapGate.mjs",
  args: [],
  guards: "CPU copies dropped after the GPU upload have no unlisted reader; loadTile keeps no build result; heapDrop logic; the compile queue / flush never draw a disposed geometry (claude/heap, docs/HEAP.md)",
  meta: {
    features: ["heapdrop", "tiledrop", "litedrop", "ktxdrop"].map((key) => ({ key, type: "old" })),
    text: [
      // every module that reads a tile's dropped CPU layers is a known reader (docs/HEAP.md "Readers", rule 13)
      { file: "viewer/main.js", what: "readers: no new reader of a dropped tile layer (list it in docs/HEAP.md + KNOWN in tools/audit/gate.d/heap.mjs)", test: (main, { rd, files }) => {
        const KNOWN = {
          "viewer/main.js": "builds the tiles, registers the drops (loadTile end), groundAB swaps materials only",
          "viewer/character/cityHook.js": "roads group position + index (KEPT: keep list) and tram platforms (features: not dropped)",
          "viewer/heros/herosGround.js": "park tiles' terrain position / normal / index: HELD until the lawn is built (herosCity.js hold/release)",
          "viewer/wolvendaelCity.js": "terrain / trees into the pond reflection: GPU only",
          "viewer/liteShown.js": "a far tile's group by name (is it shown?): no geometry",
          "viewer/contactAudit.js": "dev audit: needCpu() throws on a dropped array (run with ?heapdrop=old)",
          "viewer/drive/collisionTest.js": "dev audit: needCpu() throws on a dropped array (run with ?heapdrop=old)",
        };
        const PAT = /-(terrain|roads|buildings|lite)`|\.name === "terrain"|layers\.(terrain|roads|buildings)\b|"far-lod"|"far-buildings"/;
        const unknown = files("viewer").filter((f) => f.endsWith(".js") && !f.endsWith("tileWorker.bundle.js") && PAT.test(rd(f)) && !KNOWN[f]);
        return { ok: !unknown.length, why: `new reader(s) of a dropped tile layer: ${unknown.join(", ")}` };
      } },
      { file: "viewer/main.js", what: "loadTile's dispose keeps no build result (no d.* read; d let go)", test: (main) => {
        const lt = main.slice(main.indexOf("async function loadTile("), main.indexOf("// ------------------------------------------------------------------ main"));
        const disp = lt.slice(lt.indexOf("const dispose = () => {"), lt.indexOf("\n  };", lt.indexOf("const dispose = () => {")));
        return { ok: disp.length > 0 && !/\bd\./.test(disp) && /d = null;/.test(lt), why: /\bd\./.test(disp) ? "loadTile's dispose reads d.*: the whole build result stays alive with the tile" : "" };
      } },
    ],
  },
};
