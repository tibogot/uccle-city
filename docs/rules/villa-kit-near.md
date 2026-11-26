---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2f: Villa_kit <= 12k triangles, <= 4 draws, every kit piece's lowest vertex within 5 mm of the deck; the joins check includes it)
---
**Rule.** The villa's small outdoor pieces (the jointed pool coping, the ladder, loungers, the parasol, planters, the
hedge skirt) live in ONE near-only node, Villa_kit, drawn with LOD0 (< 70 m), one draw per slot (<= 4), <= 12k
triangles, outside the LOD0 shell budget (62k); each piece stands on the deck (its footprint in villa.json
kit_contact, lowest vertex within 5 mm), the skirt hedges are sunk 0.3 m (rule model-meets-ground), and the smooth
pieces are audited like the interior's soft furnishings (no streak / bentflat).

**Why.** Job 3 (2026-11-26): LOD0 was at 61.4k of 62k after the glazing gaskets; a pool kit inside it would have
broken the shell budget for pieces nobody sees beyond a few tens of metres. The terrace stood as a 0.7 m black block
in the lawn: real terraces meet the garden with planting.
