// test: (s) => s.includes("furniture-garden(wall|gate|hedge)") },
      { file: "viewer/gardens/gardenHedge.js", what: "adds the hit shake to the hedge's lean", test: (s) => /shakeAt\(p, f\)/.test(s) },
      { file: "viewer/gardens/cityGardens.js", what: "steps the shake pool each frame", test: (s) => /updateShake\(\)/.test(s) },
      { file: "viewer/character/cityHook.js", what: "the walker is blocked by the hedge stand-ins", test: (s) => /garden(wall|gate|hedge)/.test(s)\|gate\|hedge/.test(s) },
    ],
  },
};
