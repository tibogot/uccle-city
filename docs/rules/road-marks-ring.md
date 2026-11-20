---
number: 48
status: provisional
check: `tyremarks`: tools/tyreMarksTest.mjs
---
**Rule.** A mark laid on the road at run time (tyre marks, any decal ribbon) is ONE mesh in a fixed ring: static buffers uploaded by update ranges only (never DynamicDrawUsage), set just before the render (onBeforeRender) so a frame not rendered keeps its span; every vertex stands on the DRAWN drive surface at its own x / z + a lift + a polygon offset (never in the road's plane, never climbing a kerb); it fades by age in the shader (birth per vertex, a frame-updated time uniform), never by a CPU rewrite; it marks only for a physical reason (slip in the wheel's own frame past 0.18, the fronts only past the countersteer lock, a brake lock / wheelspin from what the pedals ask, the handbrake, a touch-down), nothing per frame allocated.

**Why.** Thunderline's tyre marks (the source of ours) used DynamicDrawUsage, which r187 re-uploads whole every pass; laid flat or by the body's slip, all four wheels drew four equal lines in a drift ("a sticker under the car"); the WebGPU backend never clears an attribute's update ranges, so ranges set at update time are lost or stale across unrendered frames
