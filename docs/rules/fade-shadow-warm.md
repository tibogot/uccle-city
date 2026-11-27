---
status: provisional
added: 2026-11-27
check: `fadeshadow` (tools/audit/fadeShadowCheck.mjs: an existing shared fading copy still gets a casting shadow stand-in, once per geometry layout, the kit walls' cut and far copies too, none for a non-caster, none under ?fadeshadowwarm=old; main.js warms them in preCompile and on the play loader's tiles) + browser numbers in docs/perf/QUIET_2026-11-27.md (debug/perf5Run.js buildClusters: no "walls:fade" shadow build while driving)
---
**Rule.** Every fading copy (viewer/lodFade.js fadeVariant) that casts a shadow gets its shadow pass warmed once per geometry layout, before any tile fades with it, whether the copy is new or was made earlier under a cover. Warm the shadow pass by tracking the pass itself (lodFade.js fadeShadowProxies), not by whether the material is new.

**Why.** A fading copy has a maskNode, so it keeps its own shader in the sun's shadow pass (warmup.js shareShadowNodes shares one shadow material only for materials without a mask). Its shadow pass was warmed only through fadeProxies(), which makes a stand-in only for a copy that does not exist yet, and the play loader's tiles (main.js holdFast) compiled their copies for the scene pass only. The shared walls' copy is made under the boot cover by the held fade, so its shadow pass was never built: the first tile fade while driving built "walls:fade" in the sun's pass in that frame (29-38 ms, every police drive of 2026-11-26, docs/perf/QUIET_2026-11-26.md round 3). perf6 had patched the kit walls alone (?kitshadowwarm); this is the general case.
