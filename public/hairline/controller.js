/**
 * Controller: a game pad held over its own dashed footprint. A stadium body
 * with shoulder buttons along its back, a raised cross d-pad, start and
 * select, four face buttons in a diamond, and a cord. The pad tips toward
 * the pointer on two springs, as if the hand pressed where it points, and
 * the part nearest the pointer takes the bright stroke. At rest it hangs a
 * little askew with one face button lit. The slider is the tilt, in degrees.
 *
 * The pattern: aim at the pointer (Basket). Springs for where, a hit test on
 * a fixed plane and on rest positions, a clamp on the tilt.
 */
const {
  Cam, clamp, facing, fillet, fit, open, poly, prism, proj, rad, ringAt, rrect, unproj, spring, stepS,
  disposer, mk, pointer, put, register, solid,
} = HL;

const BW = 124, BD = 54, BH = 10, CX = BW / 2, CY = BD / 2, LIFT = 14, REST = [-3, 4];
const ring = (x0, y0, x1, y1, r, b, n = 6) => [rrect(x0, y0, x1, y1, r, n), rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b), n)];
const DX = 27, DY = 27, W = 4.4, LN = 13;
const CROSS = fillet(
  [[DX - W, DY - LN], [DX + W, DY - LN], [DX + W, DY - W], [DX + LN, DY - W], [DX + LN, DY + W], [DX + W, DY + W],
    [DX + W, DY + LN], [DX - W, DY + LN], [DX - W, DY + W], [DX - LN, DY + W], [DX - LN, DY - W], [DX - W, DY - W]],
  [1.6, 1.6, 1.2, 1.6, 1.6, 1.2, 1.6, 1.6, 1.2, 1.6, 1.6, 1.2], 3,
);
// Every part the pointer can name: where it sits at rest, how far it reaches, and its solid.
const PARTS = [
  { name: "l", x: 26, y: 2, r: 12, ring: ring(10, -4, 42, 8, 4, 1), z: [2, 8.5] },
  { name: "r", x: 98, y: 2, r: 12, ring: ring(82, -4, 114, 8, 4, 1), z: [2, 8.5] },
  { name: "d-pad", x: DX, y: DY, r: LN },
  { name: "select", x: 53.5, y: 32, r: 4.5, ring: ring(49, 30, 58, 34, 2, 0.6, 4), z: [BH, BH + 1.2] },
  { name: "start", x: 70.5, y: 32, r: 4.5, ring: ring(66, 30, 75, 34, 2, 0.6, 4), z: [BH, BH + 1.2] },
  ...[["x", 97, 16.5], ["y", 86.5, 27], ["a", 107.5, 27], ["b", 97, 37.5]].map(([name, x, y]) => (
    { name, x, y, r: 4.6, ring: ring(x - 4.6, y - 4.6, x + 4.6, y + 4.6, 4.6, 1), z: [BH, BH + 3.2] })),
];
const A = PARTS.findIndex((p) => p.name === "a");
const CORD = [[62, 0, 5], [62, -7, 4.5], [60, -14, 3], [54, -19.5, 1.5], [45, -21.5, 0.5], [37, -19.5, 0]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value;
  const C = Cam(45, 0.5, 2.2);
  fit(C, [[0, -22, -LIFT], [BW, BD, -LIFT], [BW, -4, BH + 18], [0, BD, BH + 18]], 200, 160);
  const P = proj(C), front = facing(C);
  const [br, bi] = ring(0, 0, BW, BD, 27, 2.2, 14);

  const g = mk("g", {}, svg);
  // The footprint on the ground, painted first so every plate covers it.
  mk("path", { d: poly(ringAt(P, br, -LIFT)), class: "nf dash" }, g);
  const cord = mk("path", { class: "nf sil" }, g);
  const sol = (p) => (p.el = solid(g));
  PARTS.slice(0, 2).forEach(sol);
  const body = solid(g);
  const dBase = mk("path", { class: "lo" }, g), dTop = mk("path", { class: "sil" }, g), dimple = mk("path", { class: "nf lo" }, g);
  PARTS.slice(3).forEach(sol);
  PARTS[2].el = { sil: dTop };

  const ax = spring(REST[0]), ay = spring(REST[1]);
  let drawn = "", lit = A;
  PARTS[A].el.sil.classList.add("hi");

  function draw() {
    const key = ax.x.toFixed(4) + "," + ay.x.toFixed(4);
    if (key === drawn) return;
    drawn = key;
    const ca = Math.cos(rad(ax.x)), sa = Math.sin(rad(ax.x)), cb = Math.cos(rad(ay.x)), sb = Math.sin(rad(ay.x));
    // The pad's own frame: pitch about x, then roll about y, around its centre, LIFT above the ground.
    const R = (x, y, z) => {
      const u = x - CX, v = y - CY, w = z - BH / 2;
      const v1 = v * ca - w * sa, w1 = v * sa + w * ca;
      return P(CX + u * cb + w1 * sb, CY + v1, LIFT + BH / 2 - u * sb + w1 * cb);
    };
    cord.setAttribute("d", open(CORD.map(([x, y, z]) => R(x, y, z))));
    put(body, prism(R, front, br, bi, 0, BH));
    for (const p of PARTS) if (p.ring) put(p.el, prism(R, front, p.ring[0], p.ring[1], p.z[0], p.z[1]));
    dBase.setAttribute("d", poly(CROSS.map(([x, y]) => R(x, y, BH))));
    dTop.setAttribute("d", poly(CROSS.map(([x, y]) => R(x, y, BH + 2.4))));
    dimple.setAttribute("d", poly(rrect(DX - 2.6, DY - 2.6, DX + 2.6, DY + 2.6, 2.6, 4).map((q) => R(q.u, q.v, BH + 2.4))));
  }

  const B = register(stage, (dt) => {
    const m = stepS(ax, dt) | stepS(ay, dt);
    draw();
    return !!m;
  });
  bag.add(B.unregister);

  function light(i) {
    if (i === lit) return;
    PARTS[lit].el.sil.classList.remove("hi");
    PARTS[i].el.sil.classList.add("hi");
    lit = i;
  }

  function aim(p) {
    // The pointer on the plane of the pad's top at rest, which never moves.
    const [wx, wy] = unproj(C, p[0], p[1], LIFT + BH);
    ay.t = max * clamp((wx - CX) / (BW / 2), -1, 1);
    ax.t = -max * 0.8 * clamp((wy - CY) / (BD / 2), -1, 1);
    let best = 0, bd = Infinity;
    PARTS.forEach((q, i) => { const d = Math.hypot(wx - q.x, wy - q.y) - q.r; if (d < bd) { bd = d; best = i; } });
    light(best);
    read.textContent = PARTS[best].name;
    B.wake();
  }
  function leave() {
    ax.t = REST[0]; ay.t = REST[1];
    light(A);
    read.textContent = "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, leave }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { max = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "controller",
  means: "A game pad that tips toward the pointer, the part nearest it lit, as if a thumb pressed there.",
  rules: [1, 3, 4, 5],
  range: [5, 10, 15],
  tour: [[142, 78], [266, 140], [202, 118], null],
  mount,
});
