// browser gate row `trafmix` (run on a browser turn; docs/WORKFLOW.md)
export default {
  name: "trafmix",
  text: "TRAFMIX (claude/trafmix, docs/TRAFMIX.md, rule traffic-mix): ?quick=1&with=traffic&weekday=1 at &hour=8 / 13 / 18 on Ch. de Saint-Job (&place=stjob-street), Ch. d'Alsemberg (&place=alsemberg), Ch. de Waterloo (&at=1700,815): the mix (vans, SUVs, a taxi now and then, a patrol), a STIB / De Lijn bus at a stop (D6 Alsemberg: dwell, door at the pole, left indicator out), an ambulance pass with traffic pulling over (window.__traffic sim: setRole on a car + ctl 4; the siren with the speaker button on), a patrol near Rue Rouge (&at=-514,-340), bin lorries on a weekday morning; ?trafmix=old alternated for the A/B; trafficFleet stats.draws / tris and the sim's stats.stepMs with / without",
};
