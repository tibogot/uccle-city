---
status: provisional
added: 2026-11-25
check: `underpass` (tools/audit/underpassCheck.mjs section 5: the underpass AO map ships as a BC4 KTX2 with its mips, listed in viewer/aoKtx2List.js with its PNG's current hash, loaded through withAOKtx2; the mural KTX2 has mips; one meshopt worker pool) + browser row `underpass` (debug/underpassStream.js: 0 frames over 34 ms in 3 stream-in runs)
---
**Rule.** A baked AO map over 300 KB (docs/FIX3.md) ships as a BC4 KTX2 with every mip level baked
(`python tools/textures/ao_ktx2.py <name>`, then viewer/aoKtx2List.js) and is loaded through `withAOKtx2` (the PNG only
as the fallback), and any texture a streamed model brings has its mips in the file: nothing that streams in makes the
GPU build mips (or a mip pipeline) at upload. A model loaded more than once in a session makes its loader's worker
pools once (meshopt `useWorkers` ends the pool it had and starts a new one). Re-run the AO tool whenever a model's AO
is re-baked (the list carries the PNG's hash).

**Why.** The Calevoet underpass (claude/underpass1 round 1) came after fix3 and loaded its 1024 px AO as a PNG
decoded to R8 with `generateMipmaps` (GPU mip generation at upload, its own pass per level), and called
`MeshoptDecoder.useWorkers(2)` on every load (the surface at boot, the inside each time it streams back in after an
unload). These are upload costs the city's rule already covered; they were brought under it. The stream-in hitch
itself was the kiosks' first cast into the sun's static shadow pass (rule shadow-warm-static-pass); in the full city
the frames over 34 ms also came from the city's own first sight of tiles C6 / D5 / E5 (their roads and terrain node
builds, 20-30 ms each), the same with `?underpass=0`.
