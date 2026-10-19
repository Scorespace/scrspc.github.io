/**
 * Phone: a phone leaning back over its dashed footprint, rounded all round,
 * a pill cut out at the top of the glass and a bar at its foot. The glass is
 * 7 × 13 dots running a stacker: a bar slides from wall to wall, stops, and
 * keeps only what lands on the row below, so the tower narrows as it climbs.
 * The game plays itself; with the pointer on the glass, a fixed plane, the
 * bar stops when it is under the pointer. The sliding bar is the bright mark.
 * The slider is the pace, in steps a second.
 *
 * The pattern: an ambient loop that answers the pointer. One game clock, a
 * hit test on a fixed plane, solids built from an extruded front outline.
 */
const {
  Cam, fillet, fit, hull, open, poly, proj, rad, rrect, reducedMotion,
  disposer, mk, place, pointer, register,
} = HL;

const W = 54, H = 110, T = 6.5, LEAN = 14, LIFT = 10, COLS = 7, ROWS = 13;
const GX = 10.8, GZ = 14, SX = 5.4, SZ = 6.1, GLASS = [4, 5, 50, 99];
const OUTLINE = fillet([[0, 0], [W, 0], [W, H], [0, H]], [10, 10, 10, 10], 6);
const cs = Math.cos(rad(LEAN)), sn = Math.sin(rad(LEAN));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let rate = value;
  const C = Cam(45, 0.5, 2.05);
  const P0 = proj(C), P = (x, y, z) => P0(x, y * cs - z * sn, LIFT + y * sn + z * cs);
  fit(C, [[0, 0, 0], [W, T, 0], [0, -H * sn, H * cs + LIFT], [W, T - H * sn, H * cs + LIFT], [0, T, -LIFT], [W, -H * sn, -LIFT]], 200, 160);
  const face = (pts, dy = 0) => pts.map(([x, z]) => P(x, T + dy, z));
  const ring = (u0, v0, u1, v1, r, n = 4) => rrect(u0, v0, u1, v1, r, n).map((q) => [q.u, q.v]);
  const g = mk("g", {}, svg);

  mk("path", { d: poly(rrect(0, -H * sn, W, T, 8, 5).map((q) => P0(q.u, q.v, 0))), class: "nf dash" }, g);
  mk("path", { d: poly(hull(OUTLINE.map(([x, z]) => P(x, 0, z)).concat(face(OUTLINE)))), class: "sil" }, g);
  // Dim where the front meets the side and the top we see.
  const sees = (k) => { const p = OUTLINE[k], q = OUTLINE[(k + 1) % OUTLINE.length]; return q[1] - p[1] - 0.55 * (q[0] - p[0]) > 0; };
  let d = "";
  for (let k = 0, run = []; k <= OUTLINE.length; k++) {
    if (k < OUTLINE.length && sees(k)) { if (!run.length) run.push(OUTLINE[k]); run.push(OUTLINE[(k + 1) % OUTLINE.length]); }
    else if (run.length) { d += open(face(run)); run = []; }
  }
  mk("path", { d, class: "nf" }, g);
  mk("path", { d: poly(face(ring(...GLASS, 7.5, 5))), class: "nf lo" }, g);
  mk("path", { d: poly(face(ring(20, 100.5, 34, 104.5, 2))), class: "nf" }, g);
  mk("path", { d: poly(face(ring(19, 7.2, 35, 8.2, 0.5, 2))), class: "nf lo" }, g);
  // A side key on the edge we see, standing proud of it.
  mk("path", { d: poly(hull([[W, 1.5, 70], [W, 1.5, 86], [W, T - 1.5, 70], [W, T - 1.5, 86]].map(([x, y, z]) => P(x + 1.2, y, z)).concat(
    [[W, 1.5, 70], [W, 1.5, 86], [W, T - 1.5, 70], [W, T - 1.5, 86]].map(([x, y, z]) => P(x, y, z))))), class: "sil" }, g);

  const dots = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const el = mk("circle", { r: 1.2, class: "dot off" }, g);
    place(el, P(GX + c * SX, T, GZ + r * SZ));
    dots.push({ el, cls: "dot off" });
  }
  const o = P(0, T, 0), ex = P(1, T, 0), ez = P(0, T, 1);
  const a = ex[0] - o[0], b = ez[0] - o[0], c2 = ex[1] - o[1], dd = ez[1] - o[1], det = a * dd - b * c2;
  const onGlass = ([sx, sy]) => { const qx = sx - o[0], qy = sy - o[1]; return [(dd * qx - b * qy) / det, (a * qy - c2 * qx) / det]; };

  // The game: the rows already stacked, each [from, to], and the bar sliding on the next row.
  let seed = 5, stack, x, w, dir, hold = 0, held = null, acc = 0, ran = 0;
  const rand = (n) => ((seed = (seed * 1103515245 + 12345) % 2147483648) % n);
  function start() { stack = [[1, 4]]; w = 4; x = 0; dir = 1; }
  function drop() {
    const [f, t] = stack[stack.length - 1], from = Math.max(f, x), to = Math.min(t, x + w - 1);
    if (from > to || stack.length + 1 >= ROWS) { hold = 6; return; }
    stack.push([from, to]);
    w = to - from + 1; x = 0; dir = 1; ran = 0;
  }
  function step() {
    if (hold > 0) { if (--hold === 0) start(); return; }
    x += dir;
    if (x < 0 || x + w > COLS) { dir = -dir; x += 2 * dir; }
    ran++;
    const [f, t] = stack[stack.length - 1], over = Math.min(t, x + w - 1) - Math.max(f, x) + 1;
    if (held !== null) { if (Math.abs(x + (w - 1) / 2 - held) <= 0.5) drop(); }
    else if (ran > 2 && (over === w ? rand(10) < 8 : over === w - 1 ? rand(10) < 3 : rand(30) === 0)) drop();
  }
  function paint() {
    const r0 = stack.length;
    dots.forEach((t, k) => {
      const c = k % COLS, r = (k / COLS) | 0;
      const row = stack[r];
      const cls = r === r0 && hold === 0 && c >= x && c < x + w ? "dot" : row && c >= row[0] && c <= row[1] ? (hold % 2 ? "dot" : "dot m") : "dot off";
      if (cls !== t.cls) { t.el.setAttribute("class", cls); t.cls = cls; }
    });
  }
  start();
  [[1, 4], [2, 4], [2, 4]].slice(1).forEach((r) => stack.push(r));
  w = 3; x = 3;
  paint();

  const B = register(stage, (dt) => {
    if (reducedMotion()) return false;
    let stepped = false;
    for (acc += dt; acc >= 1 / rate; acc -= 1 / rate) { step(); stepped = true; }
    if (stepped) paint();
    return true;
  });
  bag.add(B.unregister);

  function move(p) {
    const [gx, gz] = onGlass(p);
    if (gx < GLASS[0] || gx > GLASS[2] || gz < GLASS[1] || gz > GLASS[3]) { leave(); return; }
    held = Math.max(0, Math.min(COLS - 1, Math.round((gx - GX) / SX)));
    read.textContent = "col " + (held + 1);
    B.wake();
  }
  function leave() {
    held = null;
    read.textContent = "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move, leave }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { rate = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "phone",
  means: "A phone playing a stacker; with the pointer on the glass, the sliding bar stops beneath it.",
  rules: [1, 4, 7, 9],
  range: [5, 8, 12],
  tour: [[176, 141], [216, 160], [196, 151], null],
  mount,
});
