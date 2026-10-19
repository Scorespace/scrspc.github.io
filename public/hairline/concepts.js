/**
 * Concepts: a 7 × 7 field of game tiles on a plate that takes three shapes, one for each idea the page tells.
 * Creativity: identical low tiles, the copycats, and in the middle a lighthouse: a striped tower with a
 * gallery, a lantern holding a lit lamp, and two beams sweeping round over the field. Volume: every tile
 * stacks to its own height, a dune of submissions, and a beat later three picks, none of them the tallest,
 * lift above their neighbours and take the light. Distribution: the rest of the field sinks, the picks slide
 * to the middle and fuse into one game, and five round platforms rise around it, each linked to it by a
 * dashed line that players run out along. The tile or platform under the pointer lifts and takes the light.
 * The slider is the shape: 0, 1 or 2.
 *
 * The pattern: a field (Terrain) whose arrangement is the slider, tweens for every move, sequenced by their
 * delays alone, and two ambient loops, the beam and the players, each running only while its shape stands.
 */
const { Cam, clamp, facing, fit, open, prism, proj, rings, ringAt, run, seg, unproj, reducedMotion,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid } = HL;

const N = 7, CELL = 14, FOOT = 10, MID = 3, C0 = (MID + 0.5) * CELL, HALF = C0 + 7;
const PB = 5, LIFT = 16, STEP = 30, TOWER = 40, BEAM = 54, SPREAD = 0.11, TURN = 0.9;
const PICKS = [[1, 4], [4, 1], [5, 5]], PICK = 10, GAME = 30;
const PLATS = 5, ORBIT = 36, DISC = 6, RISE = 7, FLOW = 0.45, ROT = 3.3;

/** Where every tile stands, and how tall, in each of the three shapes; and the platforms, which stand only in the last. */
function layout() {
  const tiles = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const di = i - MID, dj = j - MID, x = (i + 0.5) * CELL, y = (j + 0.5) * CELL, hub = !di && !dj;
    const pick = PICKS.findIndex(([a, b]) => a === i && b === j);
    const dune = 5 + 34 * Math.exp(-(di ** 2 + (dj - 0.4) ** 2) / 5) + 18 * Math.exp(-((i - 5.5) ** 2 + (j - 1) ** 2) / 2.2);
    tiles.push({ i, j, di, dj, hub, pick, r: FOOT / 2, round: 2.6, at: [
      { x, y, h: hub ? TOWER : 3 + 0.5 * Math.sin(i * 1.9 + j * 1.3) },
      { x, y, h: dune },
      pick < 0 ? { x, y, h: 0 } : { x: C0, y: C0, h: GAME - PICK },
    ] });
  }
  const plats = Array.from({ length: PLATS }, (_, n) => {
    const a = ROT + (n / PLATS) * Math.PI * 2, x = C0 + Math.cos(a) * ORBIT, y = C0 + Math.sin(a) * ORBIT;
    return { n, pick: -1, disc: true, r: DISC, round: DISC, at: [{ x, y, h: 0 }, { x, y, h: 0 }, { x, y, h: RISE }] };
  });
  return [tiles, plats];
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.05), x0 = C0 - HALF, x1 = C0 + HALF, back = C0 - BEAM * 0.72;
  fit(C, [[x0, x0, -PB], [x1, x1, -PB], [x1, x0, -PB], [x0, x1, -PB], [C0, C0, 56], [back, back, TOWER + 4]], 200, 164);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg), plate = solid(g), links = mk("path", { class: "nf dash" }, g), runners = mk("g", {}, g);
  put(plate, prism(P, front, ...rings(x0, x0, x1, x1, 9, 2.2), -PB, 0));
  const lamp = tween(0);
  const [tiles, plats] = layout().map((list) => list.map((t) => {
    const s = t.at[0];
    return { ...t, el: solid(g), x: tween(s.x), y: tween(s.y), h: tween(s.h), lift: tween(0), glow: t.pick >= 0 ? tween(0) : null, drawn: "" };
  }));
  const items = [...tiles, ...plats], hub = tiles.find((t) => t.hub), picks = tiles.filter((t) => t.pick >= 0);
  items.forEach((t, id) => (t.id = id));
  const dots = plats.map(() => mk("circle", { r: 0, class: "dot" }, runners));
  // The lighthouse rides the hub: stripes on its tower, then (in front of it) the beams, gallery, lantern, lamp and cap.
  const stripes = mk("path", { class: "nf" }, hub.el.g);
  const house = mk("g", {}, g), beams = mk("path", { class: "nf hi" }, house), rays = mk("path", { class: "nf hi dash" }, house);
  const gallery = solid(house), lantern = solid(house), cap = solid(house);
  const bulb = mk("circle", { r: 1.6, class: "dot" }, house);
  let shape = -1, act = -1, order = "", lit = "", turn = 0.6, flow = 0;

  function drawHouse(x, y, top, k) {
    if (k < 0.02) { [beams, rays, stripes, gallery.sil, gallery.cr, lantern.sil, lantern.cr, cap.sil, cap.cr].forEach((e) => e.setAttribute("d", "")); bulb.setAttribute("r", "0"); return; }
    const round = (r, b) => rings(x - r, y - r, x + r, y + r, r, b);
    const band = (z) => open(ringAt(P, run(round(FOOT / 2, 0.5)[0], front), z));
    stripes.setAttribute("d", band(top * 0.36) + band(top * 0.68));
    const [gr, gi] = round(7, 1), [lr, li] = round(3.6, 0.8), [cr, ci] = round(2.4, 0.6);
    put(gallery, prism(P, front, gr, gi, top, top + 1.2 * k));
    put(lantern, prism(P, front, lr, li, top + 1.2 * k, top + 6 * k));
    put(cap, prism(P, front, cr, ci, top + 6 * k, top + 7.6 * k));
    const lz = top + 3.6 * k;
    place(bulb, P(x, y, lz)); bulb.setAttribute("r", (1.6 * k).toFixed(2));
    // Two beams, back to back, each a narrow cone of two rays from the lantern's glass, a dashed ray down its middle.
    const ray = (a) => seg(P(x + Math.cos(a) * 4.2, y + Math.sin(a) * 4.2, lz), P(x + Math.cos(a) * BEAM * k, y + Math.sin(a) * BEAM * k, lz));
    beams.setAttribute("d", [turn, turn + Math.PI].flatMap((a) => [ray(a - SPREAD), ray(a + SPREAD)]).join(""));
    rays.setAttribute("d", ray(turn) + ray(turn + Math.PI));
  }

  function draw(dt, now) {
    let moving = !tdone(lamp, now);
    const k = tval(lamp, now);
    for (const t of items) {
      const x = tval(t.x, now), y = tval(t.y, now), raw = tval(t.h, now), glow = t.glow ? tval(t.glow, now) : 0;
      const h = Math.max(0.8, raw + glow * PICK + tval(t.lift, now));
      if (![t.x, t.y, t.h, t.lift, t.glow].every((w) => !w || tdone(w, now))) moving = true;
      // Once the picks meet in the middle only the first is drawn: the three are one game now.
      t.cx = x; t.cy = y; t.raw = raw; t.on = glow > 0.5;
      t.shown = raw > 0.9 && !(t.pick > 0 && Math.hypot(x - C0, y - C0) < 1);
      const key = x.toFixed(2) + "," + y.toFixed(2) + "," + h.toFixed(2) + t.shown;
      if (key === t.drawn) continue;
      t.drawn = key;
      if (!t.shown) { t.el.sil.setAttribute("d", ""); t.el.cr.setAttribute("d", ""); continue; }
      put(t.el, prism(P, front, ...rings(x - t.r, y - t.r, x + t.r, y + t.r, t.round, 0.9), 0, h));
    }
    // The picks take the light as they lift; the class changes only when one of them crosses halfway.
    const on = picks.map((t) => +t.on).join("");
    if (on !== lit) { lit = on; light(); }
    // The beam turns while the lighthouse stands; it holds still for readers who asked for less motion.
    const sweeping = k > 0.02 && !reducedMotion();
    if (sweeping) turn += dt * TURN;
    drawHouse(hub.cx, hub.cy, Math.max(0.8, hub.raw + tval(hub.lift, now)), k);
    // A dashed link from the game to each platform, reaching it as it rises; once all stand, players run out along them.
    const up = plats.every((p) => p.raw > RISE - 0.05), flowing = up && !reducedMotion();
    if (flowing) flow = (flow + dt * FLOW) % 1;
    links.setAttribute("d", plats.filter((p) => p.shown).map((p) => {
      const f = Math.min(1, p.raw / RISE);
      return seg(P(C0, C0, 0.3), P(C0 + (p.cx - C0) * f, C0 + (p.cy - C0) * f, 0.3));
    }).join(""));
    plats.forEach((p, n) => {
      const u = flowing ? (flow + n / PLATS) % 1 : 0.5, d = FOOT / 2 + 1 + (ORBIT - DISC - FOOT / 2 - 2) * u;
      place(dots[n], P(C0 + ((p.cx - C0) * d) / ORBIT, C0 + ((p.cy - C0) * d) / ORBIT, 0.6));
      dots[n].setAttribute("r", up ? (1.4 * Math.min(1, u * 5, (1 - u) * 5)).toFixed(2) : "0");
    });
    // Back to front by where everything stands now; move the groups only when the order changes.
    const sorted = items.slice().sort((a, b) => a.cx + a.cy - (b.cx + b.cy));
    const next = sorted.map((t) => t.id).join(",");
    if (next !== order) { order = next; sorted.forEach((t) => g.appendChild(t.el.g)); hub.el.g.after(house); }
    return moving || sweeping || flowing;
  }

  /** The pointer's choice takes the light; with none, the shape's own: the lighthouse, then the picks, then the game they became. */
  function light() {
    items.forEach((t, k) => t.el.sil.classList.toggle("hi", act >= 0 ? k === act : shape === 0 ? t.hub : !!t.on));
    [beams, rays, lantern.sil].forEach((e) => e.classList.toggle("hi", act < 0));
    [bulb, ...dots].forEach((e) => e.setAttribute("class", act < 0 ? "dot" : "dot m"));
  }

  function become(s) {
    if (s === shape) return;
    const now = performance.now(), into = s === 2, out = shape === 2;
    shape = s;
    tset(lamp, s === 0 ? 1 : 0, now, s === 0 ? 4 * STEP : 0);
    // Into distribution the field sinks, leaving the picks standing alone a beat; then they gather, then the
    // platforms rise. Out of it, the other way round.
    const wait = (t) => t.disc ? (into ? 1100 + 60 * t.n : 0)
      : t.pick >= 0 && (into || out) ? (into ? 500 : 250) : (out ? 450 : 0) + Math.round(Math.hypot(t.di, t.dj)) * STEP;
    for (const t of items) {
      const to = t.at[s], delay = wait(t);
      tset(t.x, to.x, now, delay); tset(t.y, to.y, now, delay); tset(t.h, to.h, now, delay);
      if (t.glow) tset(t.glow, s ? 1 : 0, now, s === 1 && !out ? 700 + 60 * t.pick : 0);
    }
    light();
    B.wake();
  }

  const B = register(stage, (dt, now) => draw(dt, now));
  bag.add(B.unregister);
  become(clamp(Math.round(value), 0, 2));

  // Hit test on where everything is going, never where it is drawn: the pointer taken onto each target at
  // its top and halfway up, so the side of a tall tile counts as well as its lid.
  const gap = (sx, sy, to, z) => { const [wx, wy] = unproj(C, sx, sy, z); return Math.hypot(wx - to.x, wy - to.y); };
  function hit([sx, sy]) {
    let best = -1, bd = FOOT * 0.75;
    items.forEach((t, k) => {
      const to = t.at[shape], h = to.h + (t.glow && shape ? PICK : 0);
      if (h < 1 || (shape === 2 && t.pick > 0)) return;
      const d = Math.min(gap(sx, sy, to, h), gap(sx, sy, to, h / 2));
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  }
  function choose(k) {
    if (k === act) return;
    const now = performance.now(), t = items[k];
    if (act >= 0) tset(items[act].lift, 0, now, 0);
    act = k;
    if (t) tset(t.lift, t.disc ? LIFT / 2 : LIFT, now, 0);
    light();
    read.textContent = !t ? "rest" : t.disc ? `platform ${t.n + 1}` : shape === 2 ? "game" : `tile ${t.i + 1}·${t.j + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => become(clamp(Math.round(v), 0, 2)), destroy: bag.dispose };
}

hairline({
  name: "concepts",
  means: "Game tiles in three shapes: a lighthouse among copycats, a dune with three picks lit, then those fused into one game linked to platforms.",
  rules: [1, 2, 4, 7], range: [0, 1, 2], tour: [[200, 150], [170, 175], [235, 175], null], mount,
});
