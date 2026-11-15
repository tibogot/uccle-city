# Motorbike mode (round 1, 2026-11-15, branch claude/moto)

The first of the TWO-WHEELER MODES (docs/TODO.md): a powerful naked / streetfighter motorbike you ride in the city, built
on the car's drive base (same colliders, ground, traffic, night pool), with a fixed stylised rider.

**Start it:** the dev panel's *Modes & camera* > **Motorbike (B)**, the **Moto** button in the old HUD, the **B** key from
any mode, or the URL `?view=moto` (`&at=x,z` for a place: the nearest road there, like the car). The dev panel's Go to
places and the share link keep the mode (`view=moto`). Esc leaves it. The **Moto Lab** (`labs/moto-lab.html`) runs the
same code on a test ground (parked cars to filter between, a ramp, a kerb, a wall, a slalom; `?pose=1` freezes the
physics and poses the bike from sliders).

## Controls

| key | |
|---|---|
| W / ↑ | gas |
| Shift + W | full gas: the clutch dumped, the front lifts at low speed (wheelie); hold it to keep the wheelie |
| S / ↓ | front brake (hard = a stoppie); stopped: paddle backwards |
| Space | rear brake: the rear locks and the tail steps out (steer to slide it) |
| A / D, ← / → | lean (the bike turns by leaning; the front wheel counter-steers first) |
| C | camera: chase / far / helmet / orbit (drag to look round, wheel to zoom) |
| R | back to the start |
| N | mute the engine |
| G | the colliders (as the car) |

HUD: speed, gear, a rev bar (red over 10,000 rpm), rpm.

## Files

| file | what |
|---|---|
| `tools/blender/motorbike.py` | the model + rider, Blender 5.0 headless; `--bake` GPU AO (OptiX), `--preview <dir>` Cycles stills |
| `models/moto/moto.raw.glb`, `moto.json`, `moto_ao.png` | the pieces (LOD0), the rig numbers, the AO atlas |
| `viewer/moto/motoModel.js` | loader, our materials by slot, the LODs, the rig (lean / wheelie / steer / IK arms / crash) |
| `viewer/moto/motoLod.js` | the LODs on plain arrays (viewer + audit run the same code) |
| `viewer/moto/motoPhysics.js` | the arcade two-wheeler (pure JS) |
| `viewer/moto/motoCamera.js` | the chase camera with lean roll, FOV kick, helmet view |
| `viewer/moto/motoAudio.js` | the procedural engine, shifts, overrun crackle, wind, tyres, crash |
| `viewer/drive/driveMode.js` | the Driver: `setVehicle("moto" / "car")`, `updateMoto`, its env (narrow box, crash response) |
| `tools/moto/audit.mjs`, `tools/moto/physicsTest.mjs` | mesh audit of every LOD; headless physics numbers |
| `labs/moto-lab.html` | the lab |

Shared code touched (small, backward compatible): `carEnv.js` (vehicle dims + hit response as options), `chaseCamera.js`
(config per instance, no per-frame allocations), `input.js` (`readMoto`, N), `main.js` / `devPanel.js` / `features.js`
(the mode), `nightLights/cityNight.js` (`driver.lampRoot` / `lampModel`: the bike's lamps), `traffic/cityTraffic.js`
(the player's obstacle size: narrow on the bike), `grass/cityGrass.js` (two wheel pushers), `tools/mesh_audit/glb.mjs`
(TEXCOORD_1 in the parts).
