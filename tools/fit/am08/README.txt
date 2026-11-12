AM08 nose outline fitting (round 4, 2026-11-07). Photos: data/raw/refs/trains/ (git-ignored; junction to the main repo's data/raw).
cam.py      door-corner observations (red door leaves, semi-automatic red mask) + a first planar PnP per photo
sfm.py      the joint fit: both cameras (pose + focal) + the nose's centre-line features (B logo, headlights, windscreen foot,
            yellow panel foot, display, glass top) + door leaf position / heights, metric from the far cab-side outline (y = 1.43)
            and the doors -> sfm.json (rms 3.25 px). Frame: x = 0 at the B logo (= the model's tip), z = rail top.
hull.py     numpy copy of the old loft (for overlays); opt.py: the new loft (u-parametrised superellipse) rasterised from both
            cameras, coordinate search of the plan exponents / transition / upper setback scale against the traced outline
dev.py      hand-traced outline points (1.6x zoom, +-2 px) and the deviation of a Blender render's silhouette (r_<v>_<photo>.png)
render_fit.py  Blender: render a glb's EndCar from bcams.json (OpenCV -> Blender camera), workbench, transparent background
sheet.py    photo | before | after | overlay sheets -> docs/trains/compare/am08_fit_*.jpg
