---
number: 4
check: in `motion` (upscale guarantees)
---
**Rule.** Dynamic resolution decides on **missed frames**, never on "the GPU looks idle".

**Why.** the laptop driver holds a low GPU clock while the work looks light: resolution was stuck at 0.6 (blur)
