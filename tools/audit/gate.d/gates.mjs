// gate row `gates` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
// (claude/reality2, rule garage-has-drive) the garage drives open the front boundary in front of 3,137 painted garage
// doors, each opening between two jamb piers with no leaf (a row / semi garage front: the car stands on it): piersTileMax
// 1430 -> 1535 (the worst tile, +105 jamb piers), pathUngated 1523 -> 1531 / pathGatedPm 823 -> 822 (a door beside the
// garage now walks out through the drive opening), villaDriveGatedPm 331 -> 320 (on villas whose UrbIS driveway and
// garage door stand apart, the garage opening takes the place a driveway gate stood in; a garage opening overlapping a
// driveway is not added: build_gardens.py); the drive rings count as access in this census (onDrive) like a UrbIS
// driveway: openByMistake 518 -> 288, houseOpenPm 65 -> 36 (both under their ceilings)
// (claude/reality2, round 4 after review, rule garage-has-drive: a drive never crosses a door's opening) the garage fronts
// rebuilt so every house door keeps its own gate: on a front with a garage door the car openings stop 0.55 m short of the
// door openings (871 dropped where < 2.2 m was left), a drive that would reach over a door opening is not drawn (152):
// pathUngated 1,342 (was 1,531 on foundation, 1,576 at the first cut), pathGatedPm 844; villaDriveGatedPm 320 -> 310: the
// villa car openings dropped beside a door (Street View 2024, look only: garage fronts are open paved drives, Trois Rois 16,
// Beersel 54, Floreal 110, Helianthe 17, Bosveldweg 81); gateLostToGarage 0: no door path beside a garage drive without a gate
// leaf within 8 m, outside tools/audit/gates_open_drives.json (83 places, a FROZEN list from the foundation-vs-branch census
// diff at 03d2e7a8 + the door-rule rebuild: fronts with no gate on foundation 82d295b3 either, and G4 Chemin de la Source,
// whose gate stands 2.1 m from its door); the place list of the moved gates: docs/reality/round4_gate_moves.json
export default {
  name: "gates",
  script: "tools/audit/census/gates.mjs",
  node: ["--import","./tools/road_audit/register.mjs"],
  args: ["--all","--quiet","--jobs","4","--worst","0","--max","openByMistake=320,houseOpenPm=40,pathUngated=1531,pathGatedPm>=822,villaDriveGatedPm>=310,rowDriveGatedPm=100,gateAcrossDriven=0,gatesTileMax=460,piersTileMax=1535,gateLostToGarage=0"],
  guards: "census class G, all 120 tiles, every house frontage as the city draws it (rule house-front-garden-closed, owner 2026-11-19 'most people have gates; you miss many', docs/GATES.md): villa / terraced garden fronts open with no forecourt / shop to explain it <= 320 (879 with ?gates=old), door paths meeting the line at a gate >= 82.4 % (50.4 % old), villa driveways gated >= 33.1 % (23.3 % old), row / semi garage drives gated <= 10 % (28.1 % old; Street View: 6 of 6 open), no closed driveway gate across a carriageway or a way a car uses (14 old), the per-tile budget (gate leaves <= 460, piers <= 1,430 a tile: instances, no draw call); gardenVoid 0 / gateNoSteps 0 in the ground row, gardenInLane 0 in gardenlanes (claude/places1: pathUngated 1519 -> 1520 = the garden kit's driveway gate across Brico Sint-Job's car-park entrance, Ch. de Saint-Job 594 at (880, 656), removed: the real entrance is open with a barrier pole, Street View Apr 2024; the hard grounds of data/overrides.json now count as forecourts like the OSM ones, openByMistake back to 320); pathUngated 1523 / pathGatedPm 823 since claude/walls2 (rule walls-closed-from-street, E2): the rebuilt empty UrbIS edges give 4 new house fronts with a door path (8,617 -> 8,621), each of them meeting the line inside a driveway opening (cause inDrive): D5 -1123.1, 349.9; H4 664.5, -378.1; H5 814.4, 322.2; I6 1255.5, 778 (I4 1182.4, -105.5 gated now); the 2 new open-by-mistake fronts (E8, G5) closed by rebuilding data/gardens E8 / G5 / I4",
};
