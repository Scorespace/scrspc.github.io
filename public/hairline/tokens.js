/**
 * Tokens: thirty-six stacks of arcade tokens on a rounded plinth. The pointer
 * is projected back onto the ground, and each stack takes its height from its
 * distance to it, on its own spring, so tokens pile up around the pointer. A
 * seam rings every token's edge; the top token keeps its rim. At rest the
 * field is a dune with two rises, its tallest stack lit. A ring of dots rides
 * the top of the stack under the pointer. The slider is the radius, in cells.
 *
 * The pattern: a continuous field (Terrain). Springs, a falloff by distance,
 * a hit test on the ground plane, which never moves, and a composed rest.
 */
const {
  Cam, clamp, facing, fit, open, prism, proj, rings, ringAt, run, unproj, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 6, CELL = 17, R = 6.2, TT = 3.4, HMAX = 44, EXT = N * CELL, PB = 5;

/** The share of full height at u radii from the pointer: a bell that reaches a floor of .1, so a pile, not a spike. */
const falloff = (u) => Math.max(0.1, Math.exp(-2.4 * u * u));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.86);
  fit(C, [[-6, -6, -PB], [EXT + 6, EXT + 6, -PB], [EXT + 6, -6, -PB], [-6, EXT + 6, -PB], [0, 0, HMAX * 0.8]], 200, 166);
  const P = proj(C), front = facing(C);
  let RAD = value * CELL, over = null;

  const g = mk("g", {}, svg), stacks = [];
  const [pr, pi] = rings(-6, -6, EXT + 6, EXT + 6, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  // Diagonal by diagonal from the back corner, so appending is painting back to front.
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i;
    if (j < 0 || j >= N) continue;
    const u = i / (N - 1), v = j / (N - 1);
    const h0 = TT * 1.6 + 24 * Math.exp(-((u - 0.24) ** 2 + (v - 0.7) ** 2) / 0.08) + 13 * Math.exp(-((u - 0.82) ** 2 + (v - 0.28) ** 2) / 0.04);
    const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
    const [ring, inner] = rings(cx - R, cy - R, cx + R, cy + R, R, 1.1);
    const el = solid(g), seams = mk("path", { class: "nf lo" }, el.g);
    stacks.push({ i, j, h0, ring, near: run(ring, front), inner, sp: spring(h0, { eps: 0.04 }), el, seams, drawn: NaN });
  }

  // The mark: a centre dot in a ring of six, riding the top token of one stack,
  // moved in the paint order to just after it, so the stacks in front still cover it.
  const mark = mk("g", {}, g), md = [];
  for (let k = 0; k < 7; k++) md.push(flatDot(mark, C, 0.5, k === 0 ? "dot" : "dot m"));
  const peak = stacks.reduce((a, b) => (b.h0 > a.h0 ? b : a));
  const byCell = new Map();
  stacks.forEach((t) => byCell.set(t.i + "," + t.j, t));
  let mc = null, want = peak;

  function drawMark() {
    if (want !== mc) {
      if (mc) mc.el.sil.classList.remove("hi");
      mc = want; mc.el.g.after(mark); mc.el.sil.classList.add("hi");
    }
    const cx = (mc.i + 0.5) * CELL, cy = (mc.j + 0.5) * CELL, h = Math.max(TT, mc.sp.x);
    md.forEach((el, k) => {
      const a = (k - 1) * (Math.PI / 3), rr = k === 0 ? 0 : 2.9;
      place(el, P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, h));
    });
  }
  // A stack whose spring hasn't moved keeps its paths: most of the 36 are still on most frames.
  function drawStack(t) {
    const h = Math.max(TT, t.sp.x);
    if (h === t.drawn) return;
    t.drawn = h;
    put(t.el, prism(P, front, t.ring, t.inner, 0, h));
    let d = "";
    for (let z = TT; z < h - 0.8; z += TT) d += open(ringAt(P, t.near, z));
    t.seams.setAttribute("d", d);
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const t of stacks) { if (stepS(t.sp, dt)) m = true; drawStack(t); }
    drawMark();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    for (const t of stacks) {
      if (!over) { t.sp.t = t.h0; continue; }
      const dx = (t.i + 0.5) * CELL - over[0], dy = (t.j + 0.5) * CELL - over[1];
      t.sp.t = Math.max(TT, HMAX * falloff(Math.hypot(dx, dy) / RAD));
    }
    if (over) {
      const i = clamp(Math.floor(over[0] / CELL), 0, N - 1), j = clamp(Math.floor(over[1] / CELL), 0, N - 1);
      want = byCell.get(i + "," + j);
      read.textContent = `stack ${i + 1}·${j + 1}`;
    } else { want = peak; read.textContent = "rest"; }
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { RAD = v * CELL; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "tokens",
  means: "Stacks of arcade tokens on a plinth: tokens pile up under the pointer and fall off with distance.",
  rules: [1, 3, 5, 9],
  range: [1.6, 2.4, 3.6],
  tour: [[132, 186], [200, 152], [268, 186], null],
  mount,
});
