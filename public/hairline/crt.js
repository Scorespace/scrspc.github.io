/**
 * CRT: a tube television on a short stand, with rabbit ears, two knobs and a
 * grille beside the glass. The glass is a matrix of 11 × 8 phosphor dots.
 * The pointer is taken onto the plane of the glass, which never moves, and
 * excites the dots under it; they glow and fade back, the farther from the
 * brush the less. At rest the screen holds a slow wave, its crest lit. The
 * slider is the afterglow: how long a dot takes to fade, in seconds.
 *
 * The pattern: paint and decay (Phosphor). A decay per dot, a hit test on a
 * fixed plane, and a rest that is already a picture.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, rings, rrect, seg, reducedMotion,
  disposer, mk, place, pointer, put, register, solid,
} = HL;

const COLS = 11, ROWS = 8, X0 = 15, Z0 = 24, SX = 5, SZ = 6.4, YF = 70, BRUSH = 1.7;
const GLASS = [11, 19, 69, 75];
const WAVE = Array.from({ length: COLS }, (_, c) => Math.round(3.2 + 2.4 * Math.sin(c * 0.62 + 0.5)));
const CREST = WAVE.indexOf(Math.max(...WAVE));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let tau = value;
  const C = Cam(45, 0.5, 1.82);
  fit(C, [[0, 0, 0], [96, 70, 0], [96, 0, 0], [0, 70, 0], [0, 20, 84], [96, 20, 84], [24, 30, 122], [78, 24, 118]], 200, 158);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, r, b, z0, z1) => {
    const [o, i] = rings(x0, y0, x1, y1, r, b);
    const s = solid(g);
    put(s, prism(P, front, o, i, z0, z1));
    return s;
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

  // The dots, column by column; each keeps its glow and the class it last drew.
  const dots = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const x = X0 + c * SX, z = Z0 + r * SZ, el = mk("circle", { r: 1.3, class: "dot off" }, g);
    place(el, P(x, YF, z));
    dots.push({ c, r, x, z, el, e: 0, f: 0, cls: "dot off", rest: r === WAVE[c] ? (c === CREST ? "dot" : "dot m") : "dot off" });
  }

  // The glass is a plane: invert its projection once, so the hit test never reads what is drawn.
  const o = P(0, YF, 0), ex = P(1, YF, 0), ez = P(0, YF, 1);
  const a = ex[0] - o[0], b = ez[0] - o[0], c2 = ex[1] - o[1], d = ez[1] - o[1], det = a * d - b * c2;
  const onGlass = ([sx, sy]) => {
    const qx = sx - o[0], qy = sy - o[1];
    return [(d * qx - b * qy) / det, (a * qy - c2 * qx) / det];
  };

  let over = false;
  function paint(t) {
    const cls = t.e > 0.55 ? "dot" : t.e > 0.18 ? "dot m" : over && t.rest === "dot" ? "dot m" : t.rest;
    if (cls !== t.cls) { t.el.setAttribute("class", cls); t.cls = cls; }
  }

  // Each frame every dot fades by the afterglow, but never below what the brush, held still, gives it.
  const B = register(stage, (dt) => {
    let moving = false;
    const k = reducedMotion() ? 0 : Math.exp(-dt / tau);
    for (const t of dots) {
      const was = t.e;
      t.e = Math.max(t.e * k, t.f);
      if (t.e < 0.02) t.e = 0;
      if (Math.abs(t.e - was) > 1e-3) moving = true;
      paint(t);
    }
    return moving;
  });
  bag.add(B.unregister);

  function move(p) {
    const [x, z] = onGlass(p);
    const inside = x > GLASS[0] && x < GLASS[2] && z > GLASS[1] && z < GLASS[3];
    over = inside;
    let near = null, nd = Infinity;
    for (const t of dots) {
      const u = Math.hypot((x - t.x) / SX, (z - t.z) / SZ);
      t.f = inside && u < BRUSH ? clamp(1 - 0.7 * (u / BRUSH) ** 2, 0, 1) : 0;
      t.e = Math.max(t.e, t.f);
      if (u < nd) { nd = u; near = t; }
    }
    if (!inside) { read.textContent = "rest"; B.wake(); return; }
    read.textContent = `dot ${near.c + 1}·${near.r + 1}`;
    B.wake();
  }
  function leave() {
    over = false;
    for (const t of dots) t.f = 0;
    read.textContent = "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move, leave }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { tau = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "crt",
  means: "A tube television whose phosphor dots glow where the pointer passes, then fade back to the wave at rest.",
  rules: [1, 4, 5, 7],
  range: [0.35, 0.8, 1.6],
  tour: [[124, 150], [152, 176], [165, 212], null],
  mount,
});
