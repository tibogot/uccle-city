// node tools/falconAssistTest.mjs: the falconfix checks (no browser): the flight assist (viewer/falconFlight/flightAssist.js)
// and collisions round 3 (flightModel.js collide3) against round 2 (?falconcol=old), in still air over a small test
// town: flat ground, a 18 m block (a facade across the path), a pitched roof, a tree (a crown with a dense core, as
// viewer/falconFlight/cityStream.js column()). Prints one line per check with PASS / FAIL and the numbers.
const still = { sample: (x, y, z, t, o) => { o.x = 0; o.y = 0; o.z = 0; return o; } };
const f1 = (x, d = 1) => (+x).toFixed(d);

async function load(old) {
  globalThis.location = { search: old ? "?falconcol=old" : "" };
  const m = await import(`../viewer/falconFlight/flightModel.js?${old ? "old" : "new"}`);
  const a = await import("../viewer/falconFlight/flightAssist.js");
  return { ...m, ...a };
}

// ---- the test town (the bird flies toward -z: heading 0)
// block: x -40..40, z -80..-60, 18 m; pitched roof: x -40..40, z -140..-120, eaves 6 m, ridge 12 m at z -130;
// tree: crown centre (0, 9, -30) Rh 4 Rv 3.2 (core 60 % / 85 %), trunk r 0.35 up to the crown centre
function town({ block = true, roof = true, tree = true } = {}) {
  const o = { floor: 0, ceil: Infinity, brush: 0, tree: null };
  const base = (x, z) => {
    let h = 0;
    if (block && x > -40 && x < 40 && z > -80 && z < -60) h = 18;
    if (roof && x > -40 && x < 40 && z > -140 && z < -120) h = Math.max(h, 12 - 6 * Math.abs(z + 130) / 10);
    return h;
  };
  return {
    floor: base,
    column(x, z, y) {
      o.ceil = Infinity; o.brush = 0; o.tree = null; o.ceilTree = null;
      let h = base(x, z);
      if (tree) {
        const dx = x, dz = z + 30, d2 = dx * dx + dz * dz, Rh = 4, Rv = 3.2, cy = 9;
        if (d2 < 0.35 * 0.35 && cy > h) h = cy;
        if (d2 < Rh * Rh) {
          const a = Rh * 0.6, s2 = d2 / (a * a);
          if (s2 < 1) {
            const hv = Rv * 0.85 * Math.sqrt(1 - s2), lo = cy - hv, hi = cy + hv;
            if (y >= lo) { if (hi > h) { h = hi; o.tree = 0; } } else if (lo < o.ceil) { o.ceil = lo; o.ceilTree = 0; }
          }
        }
      }
      o.floor = h;
      return o;
    },
  };
}

function run(M, { start, intent = {}, assisted = true, avoid = true, T = 10, world = town(), script = null }) {
  const b = new M.FalconFlight(), C = new M.FlightControls(), A = new M.FlightAssist();
  A.avoid = avoid; b.assisted = assisted;
  b.launch(...start);
  const I = { turn: 0, vert: 0, climb: 0, stoop: 0, half: 0, brake: 0, aim: null, ...intent };
  const log = []; let contacts = 0, hard = 0, launch = 0, maxUpAfterContact = 0, lastContactY = null, firstContact = null, maxY = -1e9, minY = 1e9, cost = 0, pops = 0;
  for (let t = 0, k = 0; t < T; t += 1 / 60, k++) {
    if (script) script(t, I, b);
    const y0 = b.pos.y, vy0 = b.vel.y;
    const t0 = performance.now();
    if (assisted) A.apply(1 / 60, b, I, C, world);
    b.step(1 / 60, C, still, world);
    cost += performance.now() - t0;
    if (b.pos.y - y0 > 0.6 + Math.max(b.vel.y, 0) / 60 + 0.05) pops++;
    if (b.contact) {
      contacts++; if (b.contact.hard) hard++;
      launch = Math.max(launch, b.vel.y - Math.max(vy0, 0));       // the upward speed a contact added
      firstContact ??= { t, ...b.contact };
      lastContactY = b.contact.y; b.contact = null;
    }
    if (lastContactY != null) maxUpAfterContact = Math.max(maxUpAfterContact, b.pos.y - lastContactY);
    maxY = Math.max(maxY, b.pos.y); minY = Math.min(minY, b.pos.y);
    if (k % 30 === 0) log.push(`t${f1(t, 1)} V${f1(b.V)} y${f1(b.pos.y)} z${f1(b.pos.z, 0)} g${f1(b.gamma * 57.3, 0)} ph${f1(b.phi * 57.3, 0)} st${f1(b.stamina, 2)} ${A.mode}`);
  }
  return { b, A, log, contacts, hard, launch, maxUpAfterContact, firstContact, maxY, minY, ms: cost / (T * 60), pops };
}

const results = [];
const check = (name, ok, info) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${info}`); };

const NEW = await load(false), OLD = await load(true);
const open = town({ block: false, roof: false, tree: false });

// 1. hands off = altitude hold, the speed kept by light beats, stamina not drained
{
  const r = run(NEW, { start: [0, 100, 0, 0, 14, 0], T: 60, world: open });
  check("hands off holds the height", Math.abs(r.b.pos.y - 100) < 2 && r.maxY - r.minY < 4 && r.b.V > 11 && r.b.stamina > 0.6,
    `y ${f1(r.b.pos.y)} (range ${f1(r.minY)}-${f1(r.maxY)}), V ${f1(r.b.V)}, stamina ${f1(r.b.stamina, 2)}, ${f1(r.ms, 3)} ms/frame`);
}
// 1b. the old hands-off glide (no assist) for comparison: it sinks
{
  const r = run(NEW, { start: [0, 100, 0, 0, 14, 0], T: 60, world: open, assisted: false });
  console.log(`      (raw controls hands off: y ${f1(r.b.pos.y)} after 60 s: the glide)`);
}
// 2. A held 3 s: a turn, then let go: wings level, the height kept
{
  const r = run(NEW, { start: [0, 100, 0, 0, 14, 0], T: 8, world: open, script: (t, I) => { I.turn = t < 3 ? 1 : 0; } });
  const h = r.b.heading * 57.3;
  check("A turns, let go levels", Math.abs(r.b.phi) < 0.08 && Math.abs(h) > 90 && Math.abs(r.b.pos.y - 100) < 4,
    `heading ${f1(h, 0)} deg after 3 s of A, bank ${f1(r.b.phi * 57.3)} deg at 8 s, y ${f1(r.b.pos.y)}`);
}
// 3. mouse aim 90 deg left: the heading reaches it without a big overshoot
{
  let over = 0;
  const r = run(NEW, { start: [0, 100, 0, 0, 14, 0], T: 6, world: open, intent: { aim: { yaw: Math.PI / 2, pitch: 0 } }, script: (t, I, b) => { over = Math.max(over, b.heading - Math.PI / 2); } });
  check("mouse aim 90 deg", Math.abs(r.b.heading - Math.PI / 2) < 0.05 && over < 0.17, `heading ${f1(r.b.heading * 57.3)} deg at 6 s, overshoot ${f1(over * 57.3)} deg, y ${f1(r.b.pos.y)}`);
}
// 4. W 3 s (descend), S 3 s (climb), then hold
{
  const r = run(NEW, { start: [0, 100, 0, 0, 14, 0], T: 14, world: open, script: (t, I) => { I.vert = t < 3 ? -1 : t < 6 ? 1 : 0; } });
  const y6 = r.log[12];
  check("W / S descend, climb, hold", r.b.V > 10 && r.b.stall < 0.3 && r.maxY - r.b.pos.y < 3, `${r.log[6]} | ${y6} | end y ${f1(r.b.pos.y)} V ${f1(r.b.V)}`);
}
// 5. Space: a flapping climb (stamina used), no stall
{
  const r = run(NEW, { start: [0, 50, 0, 0, 14, 0], T: 10, world: open, intent: { climb: 1 } });
  check("Space climbs", r.b.pos.y > 60 && r.b.V > 8, `y ${f1(r.b.pos.y)} V ${f1(r.b.V)} stamina ${f1(r.b.stamina, 2)}`);
}
// 6. the stoop from 300 m (Shift 6 s), let go: pull-out, then hold; no zoom climb
{
  let rel = null;
  const r = run(NEW, { start: [0, 300, 0, 0, 14, 0], T: 20, world: open, script: (t, I, b) => { I.stoop = t < 6 ? 1 : 0; if (t >= 6 && !rel) rel = { y: b.pos.y, V: b.V }; } });
  const lowest = r.minY;
  check("stoop + release: pull-out, hold, no zoom", r.b.pos.y - lowest < 12 && r.b.gamma > -0.1 && lowest > 20,
    `released at y ${f1(rel.y)} V ${f1(rel.V)}; lowest ${f1(lowest)}, end y ${f1(r.b.pos.y)} V ${f1(r.b.V)} (climbed ${f1(r.b.pos.y - lowest)} m after)`);
}
// 7. the stoop held into the ground: the avoid assist pulls out by itself
{
  const r = run(NEW, { start: [0, 150, 0, 0, 14, -0.3], T: 12, world: open, intent: { stoop: 1 } });
  check("stoop held: auto pull-out (avoid on)", r.contacts === 0 && r.minY > 1, `lowest ${f1(r.minY)} m, contacts ${r.contacts}, end V ${f1(r.b.V)}`);
}
// 8. level at 10 m into the 18 m block, avoid on: climbs over it, no contact
{
  const r = run(NEW, { start: [0, 10, 0, 0, 14, 0], T: 12 });
  check("avoid: over the block", r.contacts === 0 && r.b.pos.z < -100, `contacts ${r.contacts}, max y ${f1(r.maxY)}, end z ${f1(r.b.pos.z, 0)} y ${f1(r.b.pos.y)}`);
}
// 9. into the block with avoid OFF: a wall hit, never thrown up, not pinned, no pop; old (round 2) for comparison
for (const [name, M, assisted] of [["round 3 + assist", NEW, true], ["round 3, raw", NEW, false], ["round 2 (old)", OLD, false]]) {
  const r = run(M, { start: [0, 10, 0, 0, 20, 0], T: 6, avoid: false, assisted, world: town({ roof: false, tree: false }) });
  const c = r.firstContact;
  const ok = name.startsWith("round 2") ? true : r.launch < 1.1 && r.b.pos.y < 18 && r.pops === 0 && r.b.pos.z > -60.5;
  check(`wall head-on 20 m/s (${name})`, ok, `first contact ${c ? `${c.wall ? "wall" : "top"} vn ${f1(c.vn)} hard ${c.hard}` : "none"}; launch ${f1(r.launch)} m/s, rose ${f1(r.maxUpAfterContact)} m after it, pops ${r.pops}, end y ${f1(r.b.pos.y)} z ${f1(r.b.pos.z)} V ${f1(r.b.V)}`);
}
// 10. a glancing scrape along the block's face (15 deg), avoid off: slides along, keeps most of the speed
for (const [name, M, assisted] of [["round 3", NEW, true], ["round 2 (old)", OLD, false]]) {
  const r = run(M, { start: [-35, 10, -58.5, -Math.PI / 2 + 15 * Math.PI / 180, 16, 0], T: 3, avoid: false, assisted, world: town({ roof: false, tree: false }) });
  check(`scrape 15 deg (${name})`, name.startsWith("round 2") || (r.b.V > 11 && r.hard === 0 && r.pops === 0 && r.launch < 1.1), `contacts ${r.contacts} hard ${r.hard}, V ${f1(r.b.V)}, launch ${f1(r.launch)} m/s, pops ${r.pops}, end x ${f1(r.b.pos.x)} z ${f1(r.b.pos.z)}`);
}
// 11. into the pitched roof's slope at 22 m/s, avoid off: not thrown over it
for (const [name, M, assisted] of [["round 3", NEW, true], ["round 2 (old)", OLD, false]]) {
  const r = run(M, { start: [0, 9, -100, 0, 22, 0], T: 4, avoid: false, assisted, world: town({ block: false, tree: false }) });
  check(`pitched roof at 22 m/s (${name})`, name.startsWith("round 2") || (r.maxUpAfterContact < 4 && r.pops === 0), `contacts ${r.contacts}, launch ${f1(r.launch)} m/s, rose ${f1(r.maxUpAfterContact)} m after the first contact, max y ${f1(r.maxY)}, pops ${r.pops}`);
}
// 12. a stalled drop onto the ground: a touch-down, no bounce
for (const [name, M] of [["round 3", NEW], ["round 2 (old)", OLD]]) {
  const r = run(M, { start: [0, 20, 0, 0, 3, -1.2], T: 5, avoid: false, assisted: false, world: open });
  const c = r.firstContact;
  check(`stalled drop (${name})`, name.startsWith("round 2") || (r.maxUpAfterContact < 0.3), `first contact vn ${c ? f1(c.vn) : "-"} land ${c?.land} hard ${c?.hard}; launch ${f1(r.launch)} m/s, rose ${f1(r.maxUpAfterContact)} m after it`);
}
// 13. a 40 m/s dive into the ground (raw controls held into it): a crash, no launch upward
for (const [name, M] of [["round 3", NEW], ["round 2 (old)", OLD]]) {
  const r = run(M, { start: [0, 30, 0, 0, 40, -0.6], T: 2, avoid: false, assisted: M === NEW, world: open, intent: { stoop: 1 } });
  const c = r.firstContact;
  check(`ground at 40 m/s (${name})`, name.startsWith("round 2") || (c?.hard && r.launch < 1.1 && r.maxUpAfterContact < 1.5), `first contact vn ${c ? f1(c.vn) : "-"} hard ${c?.hard}; launch ${f1(r.launch)} m/s, rose ${f1(r.maxUpAfterContact)} m after it, end V ${f1(r.b.V)}`);
}
// 14. level into the tree's crown at 8.5 m (its core), avoid off: a side hit, not popped onto the crown's top
for (const [name, M, assisted] of [["round 3", NEW, true], ["round 2 (old)", OLD, false]]) {
  const r = run(M, { start: [0.5, 8.5, 0, 0, 14, 0], T: 4, avoid: false, assisted, world: town({ block: false, roof: false }) });
  check(`into a crown (${name})`, name.startsWith("round 2") || (r.pops === 0 && r.maxUpAfterContact < 2.5), `contacts ${r.contacts} hard ${r.hard}; rose ${f1(r.maxUpAfterContact)} m after the first, pops ${r.pops}, max y ${f1(r.maxY)}`);
}
// 15. the tree with avoid on: over or round it
{
  const r = run(NEW, { start: [0.5, 8.5, 0, 0, 14, 0], T: 4, world: town({ block: false, roof: false }) });
  check("avoid: the crown", r.contacts === 0, `contacts ${r.contacts}, max y ${f1(r.maxY)}`);
}
// 16. started inside the block (a tile streamed in round the bird): out, not held inside
{
  const r = run(NEW, { start: [0, 10, -70, 0, 14, 0], T: 2, avoid: false, world: town({ roof: false, tree: false }) });
  const w = town({ roof: false, tree: false });
  check("started inside a solid", r.b.pos.y >= w.floor(r.b.pos.x, r.b.pos.z) + 0.3, `end x ${f1(r.b.pos.x)} y ${f1(r.b.pos.y)} z ${f1(r.b.pos.z)}`);
}
// 16b. hands off with no stamina left: the beats lighten, the stamina comes back, the bird sinks only slowly
{
  const r = run(NEW, { start: [0, 100, 0, 0, 14, 0], T: 30, world: open, script: (t, I, b) => { if (t === 0) b.stamina = 0; } });
  check("hold when exhausted", r.b.stamina > 0.1 && r.b.pos.y > 85 && r.b.V > 9, `after 30 s: stamina ${f1(r.b.stamina, 2)}, y ${f1(r.b.pos.y)}, V ${f1(r.b.V)}`);
}
// 17. cost
{
  const r = run(NEW, { start: [0, 10, 0, 0, 14, 0], T: 20 });
  check("cost (assist + model + collisions)", r.ms < 0.1, `${f1(r.ms, 4)} ms a frame (node)`);
}
console.log(`\n${results.filter(Boolean).length} / ${results.length} pass`);
