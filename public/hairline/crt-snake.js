/**
 * CRT snake: the tube television from `crt`, playing snake on its 11 × 8
 * phosphor dots. The snake plays itself, steering for a blinking pellet, and
 * grows when it eats; boxed in, it starts over. The pointer, taken onto the
 * plane of the glass, which never moves, becomes the pellet: the snake turns
 * and hunts it down, then circles where the hand rests. The head is the one
 * bright dot. The slider is the pace, in steps a second.
 *
 * The pattern: an ambient loop that answers the pointer (Slow, Phosphor). One
 * clock for the game, a hit test on a fixed plane, and a rest that is play.
 */
const {
  Cam, facing, fit, poly, prism, proj, rings, rrect, seg, reducedMotion,
  disposer, mk, place, pointer, put, register, solid,
} = HL;

const COLS = 11, ROWS = 8, X0 = 15, Z0 = 24, SX = 5, SZ = 6.4, YF = 70, MAX = 13;
const GLASS = [11, 19, 69, 75];
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let rate = value;
  const C = Cam(45, 0.5, 1.82);
  fit(C, [[0, 0, 0], [96, 70, 0], [96, 0, 0], [0, 70, 0], [0, 20, 84], [96, 20, 84], [24, 30, 122], [78, 24, 118]], 200, 158);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, r, b, z0, z1) => {
    const [o, i] = rings(x0, y0, x1, y1, r, b);
    put(solid(g), prism(P, front, o, i, z0, z1));
  };
  // Back to front: the tube's housing, the stand, the cabinet, then what sits on its face and its top.
  box(14, 0, 82, 24, 7, 1.4, 20, 72);
  box(18, 28, 78, 66, 4, 1, 0, 8);
  box(0, 20, 96, 70, 8, 1.8, 8, 84);
  const face = (ring) => poly(ring.map((q) => P(q.u, YF, q.v)));
  mk("path", { d: face(rrect(8, 16, 72, 78, 7, 5)), class: "nf" }, g);
  mk("path", { d: face(rrect(...GLASS, 5, 5)), class: "nf lo" }, g);
  for (const z of [64, 50]) mk("path", { d: face(rrect(80, z - 4, 88, z + 4, 4, 4)), class: "nf" }, g);
  mk("path", { d: [24, 27, 30, 33].map((z) => seg(P(79, YF, z), P(89, YF, z))).join(""), class: "nf lo" }, g);
  box(40, 34, 56, 46, 6, 1, 84, 88);
  mk("path", { d: seg(P(46, 40, 88), P(24, 30, 122)) + seg(P(50, 40, 88), P(78, 24, 118)), class: "nf sil" }, g);
  for (const q of [P(24, 30, 122), P(78, 24, 118)]) place(mk("circle", { r: 1.3, class: "dot m" }, g), q);

  // The dots: cell (c, r) is dots[c][r], r counted up from the bottom row.
  const dots = [];
  for (let c = 0; c < COLS; c++) {
    dots.push([]);
    for (let r = 0; r < ROWS; r++) {
      const el = mk("circle", { r: 1.3, class: "dot off" }, g);
      place(el, P(X0 + c * SX, YF, Z0 + r * SZ));
      dots[c].push({ el, cls: "dot off" });
    }
  }

  // The glass is a plane: invert its projection once, so the hit test never reads what is drawn.
  const o = P(0, YF, 0), ex = P(1, YF, 0), ez = P(0, YF, 1);
  const a = ex[0] - o[0], b = ez[0] - o[0], c2 = ex[1] - o[1], d = ez[1] - o[1], det = a * d - b * c2;
  const onGlass = ([sx, sy]) => {
    const qx = sx - o[0], qy = sy - o[1];
    return [(d * qx - b * qy) / det, (a * qy - c2 * qx) / det];
  };

  // The game. A small seeded generator, so a lap plays the same way every time.
  let seed = 7;
  const rand = (n) => ((seed = (seed * 1103515245 + 12345) % 2147483648) % n);
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
  let body, dir, pellet, held = null, acc = 0, blink = 0;
  const onBody = (p) => body.some((q) => same(p, q));
  const free = () => { let p; do p = [rand(COLS), rand(ROWS)]; while (onBody(p)); return p; };
  function start() { body = [[4, 3], [3, 3], [2, 3]]; dir = 0; pellet = [8, 6]; }
  start();

  function step() {
    const target = held || pellet, head = body[0];
    const opts = [dir, (dir + 1) % 4, (dir + 3) % 4]
      .map((k) => ({ k, p: [head[0] + DIRS[k][0], head[1] + DIRS[k][1]] }))
      .filter(({ p }) => p[0] >= 0 && p[0] < COLS && p[1] >= 0 && p[1] < ROWS && !onBody(p));
    if (!opts.length) { start(); return; }
    const far = (p) => Math.abs(p[0] - target[0]) + Math.abs(p[1] - target[1]);
    opts.sort((u, v) => far(u.p) - far(v.p));
    dir = opts[0].k;
    body.unshift(opts[0].p);
    const ate = same(opts[0].p, target);
    if (!ate || body.length > MAX) body.pop();
    if (ate && !held) pellet = free();
  }

  function paint() {
    const want = (c, r) => {
      const p = [c, r];
      if (same(p, body[0])) return "dot";
      if (onBody(p)) return "dot m";
      if (same(p, held || pellet)) return blink % 2 ? "dot off" : "dot m";
      return "dot off";
    };
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = dots[c][r], cls = want(c, r);
      if (cls !== t.cls) { t.el.setAttribute("class", cls); t.cls = cls; }
    }
  }
  paint();

  // One clock for the game: it steps on whole beats, and holds still when the reader asks for less motion.
  const B = register(stage, (dt) => {
    if (reducedMotion()) { paint(); return false; }
    acc += dt;
    let stepped = false;
    while (acc >= 1 / rate) { acc -= 1 / rate; step(); blink++; stepped = true; }
    if (stepped) paint();
    return true;
  });
  bag.add(B.unregister);

  function move(p) {
    const [x, z] = onGlass(p);
    const inside = x > GLASS[0] && x < GLASS[2] && z > GLASS[1] && z < GLASS[3];
    if (!inside) { leave(); return; }
    const cell = [Math.max(0, Math.min(COLS - 1, Math.round((x - X0) / SX))), Math.max(0, Math.min(ROWS - 1, Math.round((z - Z0) / SZ)))];
    if (!held || !same(held, cell)) { held = cell; paint(); }
    read.textContent = `pellet ${cell[0] + 1}·${cell[1] + 1}`;
    B.wake();
  }
  function leave() {
    if (held) { held = null; pellet = free(); paint(); }
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
  name: "crt-snake",
  means: "A tube television playing snake: the snake hunts the pellet, and the pointer on the glass becomes the pellet.",
  rules: [1, 4, 7, 10],
  range: [3, 5, 8],
  tour: [[124, 150], [165, 212], [152, 176], null],
  mount,
});
