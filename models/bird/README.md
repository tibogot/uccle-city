# The fly-mode bird

Put the bird here as `bird.glb` (glTF binary with its animation clips). The viewer loads it automatically in
fly mode (viewer/flight.js); without it, a placeholder bird flies. Add the source link and licence below
(CC0, or CC-BY with the credit written here and in CREDITS.md).

Clips are matched by name: one containing flap / fly / wing plays while flapping or climbing, one containing
glide / soar / idle while gliding (the first clip is used for both if none match). URL options: `?birdscale=`
(if the model is not in metres), `?birdfwd=+z|-z|+x|-x` (the model's nose axis, default -z).

Source / licence: (to fill in)

## This bird (2026-11-04)

Clips: Flap 0.63 s, Glide 0.63 s, Idle 1.25 s, Walk 0.5 s, Rest_Pose. 56 bones (head, spine_0-3, wing_1-5 / tip /
feathers L+R, tail_1-3, legs L+R). Nose along +z, wingspan 6.4 units: settings in bird.json (forward +z, scale 0.42
-> ~2.3 m, a little larger than life so it reads behind the camera).

Next (procedural, on the bones, layered over the clips): wings folded by the dive amount, inner wing low and
tail twisted into a bank, tail fanned when braking, feet tucked in flight. Takeoff / landing / perching as real
clips (scripted in Blender on this rig) if birds get to land.
