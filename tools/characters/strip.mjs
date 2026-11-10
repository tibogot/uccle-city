// FRAME STRIP DRIVER (Character Lab): node tools/characters/strip.mjs '{"scen":"stairs 15 up+down walk","from":1,"frames":48,"every":2,"cams":["feet side","body side"]}' out.jpg
// Needs a Chrome started with --remote-debugging-port=9333 on labs/capsule-lab.html and playwright-core (PLAYWRIGHT env:
// the node_modules folder that has it). Each view is a real screenshot of the presented frame (labs/frameStrip.js).
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(process.env.PLAYWRIGHT || process.cwd() + "/node_modules/");
const { chromium } = require("playwright-core");
const [opts, out] = process.argv.slice(2);
const br = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = br.contexts()[0].pages()[0];
const info = await page.evaluate((o) => { const s = window.lab.stripSession(o); return { cams: s.cams.length, region: s.region() }; }, JSON.parse(opts));
const R = info.region;
while (await page.evaluate(() => window.lab._strip.next())) {
  for (let ci = 0; ci < info.cams; ci++) {
    await page.evaluate((ci) => new Promise((res) => { window.lab._strip.view(ci); requestAnimationFrame(() => requestAnimationFrame(res)); }), ci);
    const png = await page.screenshot({ clip: { x: R.x, y: R.y, width: R.width, height: R.height }, type: "jpeg", quality: 85 });
    await page.evaluate(([ci, u]) => window.lab._strip.add(ci, u), [ci, "data:image/jpeg;base64," + png.toString("base64")]);
  }
}
const r = await page.evaluate(() => { const r = window.lab._strip.finish(); window.lab.goStation(window.lab.S.station); return r; });
fs.writeFileSync(out, Buffer.from(r.url.split(",")[1], "base64"));
console.log(`${out}: ${r.frames} frames checked; counts ${JSON.stringify(r.counts)}; worst ${JSON.stringify(Object.fromEntries(Object.entries(r.worst).map(([k, v]) => [k, +v.toFixed(3)])))}`);
for (const f of r.flagged.slice(0, 14)) console.log("  " + f);
process.exit(0);
