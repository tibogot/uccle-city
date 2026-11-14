// NAMED PLACES for the dev panel's "Go to" (viewer/devPanel.js, docs/DEVPANEL.md). City metres (x east, z south);
// p = the camera, t = the target, each [x, height over the drawn ground, z]. The positions come from the landmarks'
// placements (models/*/<name>.json "placement" / "bounds_city"), data/map/map.json (landmarks, areas, street lines) and
// the views already used in the docs (debug/herosViews.js, docs/GRASS.md, the landmark docs' boot links).
// Going there: the map's teleport (main.js) streams the tile in and keeps the current mode; in orbit the camera is
// then put at p looking at t. Street-level ones (h <= 3) are best in walk / third person too.
// tile: the manifest tile (only used for the boot link of a place: ?tile=..&view=stjob&at=..&cam=..).
//
// Add one: { id, name, group, tile, p: [x, h, z], t: [x, h, z], fov? }.
export const PLACES = [
  // Saint-Job (the start tile)
  { id: "stjob", name: "Place Saint-Job", group: "Saint-Job", tile: "I6", p: [1223, 45, 650], t: [1153, 0, 540] },
  { id: "stjob-church", name: "Saint-Job church", group: "Saint-Job", tile: "I6", p: [1172, 30, 640], t: [1216, 18, 561] },
  { id: "stjob-street", name: "Place Saint-Job, street", group: "Saint-Job", tile: "I6", p: [1102, 1.7, 542], t: [1175, 3, 540] },
  // heroes (scripted landmarks)
  { id: "heros", name: "Square des Héros", group: "Landmarks", tile: "E4", p: [-490, 55, -548], t: [-533, 0, -487], fov: 50 },
  { id: "heros-steps", name: "Héros, foot of the steps", group: "Landmarks", tile: "E4", p: [-530, 1.7, -467.2], t: [-533, 6.5, -484], fov: 55 },
  { id: "wolvendael", name: "Wolvendael château", group: "Landmarks", tile: "F4", p: [-420, 45, -300], t: [-469, 8, -366] },
  { id: "observatory", name: "Observatory", group: "Landmarks", tile: "H5", p: [560, 70, 200], t: [654, 10, 80] },
  { id: "townhall", name: "Town hall", group: "Landmarks", tile: "D3", p: [-1100, 40, -440], t: [-1148, 15, -506] },
  { id: "stpierre", name: "Saint-Pierre church", group: "Landmarks", tile: "E4", p: [-650, 45, -420], t: [-709, 15, -492] },
  { id: "russian", name: "Russian church", group: "Landmarks", tile: "F4", p: [-300, 35, -410], t: [-354, 12, -468] },
  { id: "police", name: "Police station", group: "Landmarks", tile: "E4", p: [-472, 6, -368], t: [-507, 4, -345] },
  { id: "stalle", name: "Stalle chapel", group: "Landmarks", tile: "D5", p: [-1100, 30, 110], t: [-1150, 6, 56] },
  { id: "calevoet", name: "Calevoet station", group: "Landmarks", tile: "D6", p: [-1225, 2, 831], t: [-1224, 4, 792] },
  { id: "vanbuuren", name: "Van Buuren house", group: "Landmarks", tile: "G2", p: [350, 35, -1180], t: [303, 6, -1230] },
  { id: "rosaire", name: "Notre-Dame du Rosaire", group: "Landmarks", tile: "I2", p: [1340, 45, -1190], t: [1279, 15, -1254] },
  { id: "augustin", name: "Saint-Augustin", group: "Landmarks", tile: "E1", p: [-830, 60, -1890], t: [-896, 20, -1961] },
  // streets & areas
  { id: "fortjaco", name: "Fort-Jaco (Ch. de Waterloo)", group: "Streets & parks", tile: "J7", p: [1805, 1.7, 1125], t: [1830, 3, 1220] },
  { id: "fortjaco-air", name: "Fort-Jaco, from above", group: "Streets & parks", tile: "J7", p: [1740, 90, 1060], t: [1813, 0, 1165] },
  { id: "alsemberg", name: "Chaussée d'Alsemberg", group: "Streets & parks", tile: "E4", p: [-912, 1.7, -300], t: [-909, 3, -438] },
  { id: "wolvendael-park", name: "Parc de Wolvendael", group: "Streets & parks", tile: "F4", p: [-330, 70, -10], t: [-402, 0, -90] },
  { id: "grass-g7", name: "Grass view (G7)", group: "Streets & parks", tile: "G7", p: [232, 1.7, 1062], t: [205, 1, 1095] },
  { id: "grass-g9", name: "Grass view (G9)", group: "Streets & parks", tile: "G9", p: [320, 1.7, 2035], t: [352, 1, 2070] },
];
