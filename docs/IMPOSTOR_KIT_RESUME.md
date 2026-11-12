# Impostor kit: resume notes (updated 2026-11-11, second session)

Phases 0-2 are done in the lab; the results, defaults and "how to add a type" are in `docs/IMPOSTOR_KIT.md`; the
remaining phases (3 trees behind `?impkit=1` after the owner's tree-branch review, 4 cars, 5 props / crowds,
6 buildings, 7 KTX2) are in `docs/TODO.md` under IMPOSTOR SYSTEM.

Serve: `python C:/Users/tibog/AppData/Local/Temp/uccle_nocache_server.py 8824 <worktree>`, open
`http://localhost:8824/labs/impostor-lab.html?scene=row50|single|forest|far`. Console: `window.lab` (`meterAB(path)`,
`bench(modes)`, `treeStats(mode)`, `sideBySide(mode, crop, k)`, `stripSet(path)`, `buildScene`, `buildKitMats`,
`rebuildKitField`, `bakeKit`, `dataURL`). Images are saved with chrome-devtools `evaluate_script` + `filePath`
returning `lab.dataURL(url)`, decoded with a small base64 script (no PIL on this machine).

Next, if resumed before phase 3: the open items in `docs/IMPOSTOR_KIT.md` section 4 (telephoto resolution, far
colour per tile, a car source to exercise depth out + parallax, other-GPU check of EQUAL with depthNode).
