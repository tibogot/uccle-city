# Collisions + joins audit: where the work stands (resume here)

Branch `claude/audit-collide` (worktree `.claude/worktrees/audit-collide`), server `python %TEMP%/uccle_nocache_server.py 8842 <worktree>`.
`tools/worker/node_modules` is a junction to the main checkout's (git-ignored).

## Done
- JOINS: contact check `tools/mesh_audit/contact.js` (+ city runner `viewer/contactAudit.js`, `viewer.contactAudit(name)`).
- Verrewinkel: deck tongue skirts + footbridge landing seats (tools/blender/roadBridge.py), apron dropped, abutment fill
  of the ground before the roads are built (viewer/rail/railData.js abutmentFill, called in tileData.js). 16 -> 12 blocking.

## Next
- Calevoet + Saint-Job bridges, then every landmark (contact), then roads:<tile> for all 120 tiles.
- JOB 1 collisions: route test harness (drive + walk + third person) per tile.
