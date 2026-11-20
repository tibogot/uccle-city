// gate row `citysound` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "citysound",
  script: "tools/sound/citySoundTest.mjs",
  node: ["--expose-gc"],
  args: ["--quiet"],
  guards: "the city sound (rule 42, docs/SOUND_CITY.md): a scripted 20 s city scene renders non-silent offline (OfflineAudioContext in pure JS), every category heard, voices under the limit, main-thread cost < 0.1 ms a frame, no object per update and no graph leak, sound OFF by default, ONE button runs / suspends every AudioContext the modes make, no second switch left, ?citysound=old",
  meta: {
    features: [{ key: "citysound", type: "old" }],
    text: [
      // no second sound switch left anywhere in viewer/ (static; was citySoundTest.mjs "no 2nd switch")
      { file: "viewer/main.js", what: "no 2nd switch: no ?motosound / N key / falcon sound tick / siren option / panel toggle; every AudioContext maker imports the gate; main.js imports it first (after quick.js)", test: (main, { rd, files }) => {
        const bad = [];
        for (const r of files("viewer").filter((p) => /\.js$/.test(p) && !/bundle/.test(p))) {
          const s = rd(r);
          if (/motosound/.test(s)) bad.push(`${r}: ?motosound`);
          if (/new (window\.)?(webkit)?AudioContext\(/.test(s) && !/soundGate\.js/.test(s) && !/audio\/soundGate\.js$/.test(r)) bad.push(`${r}: makes an AudioContext without importing the gate`);
        }
        if (/"KeyN"/.test(rd("viewer/drive/input.js")) || /KeyN/.test(rd("viewer/drive/driveMode.js"))) bad.push("drive: the N sound key");
        if (/id: "sound"/.test(rd("viewer/falconGame/falconGameDef.js"))) bad.push("falcon game: the sound tick");
        if (/id: "siren"/.test(rd("viewer/police/policeGame.js"))) bad.push("police game: the siren sound option");
        if (/two-wheeler sound/.test(rd("viewer/devPanel.js"))) bad.push("dev panel: the two-wheeler sound toggle");
        const imports = main.match(/^import .*$/gm) || [], gi = imports.findIndex((l) => /audio\/soundGate\.js/.test(l));
        if (gi < 0 || imports.slice(0, gi).some((l) => !/\.\/quick\.js/.test(l)) || /AudioContext/.test(rd("viewer/quick.js"))) bad.push(`main.js: the gate is not imported first (after quick.js): import #${gi}`);
        return { ok: !bad.length, why: bad.join("; ") };
      } },
      { file: "viewer/main.js", what: "?citysound=old: main.js skips the hook", test: (m) => /params\.get\("citysound"\) !== "old"/.test(m) },
    ],
  },
};
