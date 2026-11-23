---
status: provisional
added: 2026-11-23
check: `heroshell` (tools/audit/heroShell.mjs: villa L0 / L1 / L2 ceilings 0) + `villa` (tools/audit/villaCheck.mjs: LOD1 scripted, the open bay's far pane)
---
**Rule.** Every level the villa draws is closed from outside on its own, without the interior: an opening the interior
closes (the hall's open back bay) gets a far pane that shows while the interior does not (Villa_bay: outside the root,
so never a collider; hidden with the far glass); LOD1 is a scripted level built from the design numbers (villa.py
lod1: walls with their openings, reveals, panes, the recess's back wall closed, the slat screens as one plane drawn
by the shader), never meshopt of LOD0; LOD2 shows the street side's openings as flush dark panes. An allowed opening in
heroShell.allow.json may be a segment (`to`) along a front, and with `noBack` it never excuses a cluster that sees a
wall's inside.

**Why.** The heroshell probe never read the villa until 2026-11-23 (rule gate-dir-deps): 17.7 / 23.2 / 6.8 m2 open at
L0 / L1 / L2. Most of it was open air under the cantilevered upper box (rays grazing under the soffit), but the open bay
let the street see the front wall's inside between 30 and 70 m (the interior shows only within 30 m), and meshopt's LOD1
dropped the entrance recess's back wall round the door's hole (the leaf is its own node) and bent the flat faces
(packed audit 7.8k blocking items).
