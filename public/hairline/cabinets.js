/**
 * Cabinets: a row of five upright arcade cabinets on a floor plate, each with
 * the classic side profile: a coin door below, a control panel that juts out
 * with a stick and two buttons, a screen raked back, and a marquee on top.
 * The cabinet under the pointer rolls forward out of the row and its screen
 * lights; the rest square up behind it, staggered outwards. At rest the row
 * is a little ragged and one screen is lit. The slider is the stagger, in ms.
 *
 * The pattern: one of many (Riffle). Tweens, a stagger by distance, a hit
 * test on the rest pose's screen x, and solids built as extruded profiles.
 */
const {
  Cam, fillet, fit, hull, open, poly, proj, prism, rings, rrect, seg, facing,
  tdone, tset, tval, tween, disposer, flatDot, mk, pointer, put, register, solid,
} = HL;

const N = 5, CW = 24, GAP = 3.5, D = 30, PULL = 16, LIT = 2;
const REST = [1.5, -2.5, 5, 0, 2.5];
// The side profile in (y, z), front at +y, cut into convex pieces so each fills as a hull.
const PIECES = [
  [[0, 0], [D, 0], [D, 38], [0, 38]],
  [[0, 38], [D, 38], [D + 7, 42], [D + 7, 46], [D - 3, 50], [0, 50]],
  [[0, 50], [D - 3, 50], [D - 11, 78], [0, 78]],
  [[0, 78], [D - 11, 78], [D - 5, 80], [D - 5, 92], [0, 94]],
];
const SIDE = fillet(
  [[0, 0], [D, 0], [D, 38], [D + 7, 42], [D + 7, 46], [D - 3, 50], [D - 11, 78], [D - 5, 80], [D - 5, 92], [0, 94]],
  [1.2, 1.2, 0.8, 1.2, 1.4, 0.8, 0.8, 1, 1.4, 2.4], 3,
);
const RAW = (k) => SIDE[k * 4 + 2];
/** Whether the edge leaving point k faces the camera, for an outward normal of a counter-clockwise (y, z) profile. */
const faces = (k) => { const p = SIDE[k], q = SIDE[(k + 1) % SIDE.length]; return q[1] - p[1] - 0.816 * (q[0] - p[0]) > 0; };
/** The runs of the profile whose edges do (or do not) face the camera, each as its points. */
function runs(want) {
  const n = SIDE.length, out = [];
  let k0 = 0, cur = null;
  while (k0 < n && faces(k0) === want) k0++;
  for (let j = 0; j < n; j++) {
    const k = (k0 + j) % n;
    if (faces(k) === want) { if (!cur) out.push((cur = [SIDE[k]])); cur.push(SIDE[(k + 1) % n]); } else cur = null;
  }
  return out;
}
const LIT_RUNS = runs(true), DARK_RUNS = runs(false);
const FRONT = SIDE.slice(5, 39); // from the foot of the front to the roof's back corner
const L = Math.hypot(8, 28), SCREEN = rrect(3, 4, CW - 3, L - 4, 2.2, 3);
const zTop = (y) => 46 + (D + 7 - y) * 0.4;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const X1 = N * CW + (N - 1) * GAP, YF = D + 7 + PULL + 4;
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-4, -4, -3], [X1 + 4, YF, -3], [X1 + 4, -4, -3], [-4, YF, -3], [0, 0, 94], [X1, 0, 94]], 200, 162);
  const P = proj(C);
  const g = mk("g", {}, svg);
  const [fr, fi] = rings(-4, -4, X1 + 4, YF, 6, 1.6);
  put(solid(g), prism(P, facing(C), fr, fi, -3, 0));

  const cabs = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g), el = (cls, tag = "path") => mk(tag, { class: cls }, grp);
    const fills = PIECES.map(() => el("fo"));
    const c = { a: i * (CW + GAP), fills, sil: el("nf sil"), crease: el("nf"), seams: el("nf lo"), door: el("nf lo"), slots: el("nf") };
    Object.assign(c, { screen: el("nf"), marquee: el("nf lo"), stick: el("nf sil"), knob: el("sil", "ellipse") });
    c.knob.setAttribute("rx", (1.7 * C.S).toFixed(2)); c.knob.setAttribute("ry", (1.7 * C.S).toFixed(2));
    c.btns = [flatDot(grp, C, 1.1, "dot m"), flatDot(grp, C, 1.1, "dot m")];
    c.y = tween(REST[i]); c.drawn = NaN;
    cabs.push(c);
  }
  cabs[LIT].screen.classList.add("hi");

  function draw(c, dy) {
    if (dy === c.drawn) return;
    c.drawn = dy;
    const a = c.a, b = a + CW, m = a + CW / 2;
    const W = (x, y, z) => P(x, y + dy, z), at = (x, pts) => pts.map(([y, z]) => W(x, y, z));
    const along = ([y, z]) => seg(W(a, y, z), W(b, y, z));
    PIECES.forEach((pc, k) => c.fills[k].setAttribute("d", poly(hull(at(a, pc).concat(at(b, pc))))));
    // Bright outside: the left profile's front, the right profile's hidden edges, and the edges along x that turn away.
    c.sil.setAttribute("d", open(at(a, FRONT)) + DARK_RUNS.map((r) => open(at(b, r))).join("") +
      [RAW(1), RAW(3), RAW(7), RAW(9)].map(along).join(""));
    // Dim inside: the right profile where it meets the faces we see, and the folds across the front.
    c.crease.setAttribute("d", LIT_RUNS.map((r) => open(at(b, r))).join(""));
    c.seams.setAttribute("d", [RAW(4), RAW(5), RAW(8)].map(along).join(""));
    c.door.setAttribute("d", poly(rrect(m - 4.5, 7, m + 4.5, 22, 1.4, 3).map((q) => W(q.u, D, q.v))));
    c.slots.setAttribute("d", seg(W(m - 2, D, 15), W(m - 2, D, 19)) + seg(W(m + 2, D, 15), W(m + 2, D, 19)));
    c.screen.setAttribute("d", poly(SCREEN.map((q) => W(a + q.u, D - 3 - 8 * (q.v / L), 50 + 28 * (q.v / L)))));
    c.marquee.setAttribute("d", poly(rrect(a + 3, 82.5, b - 3, 89.5, 1.6, 3).map((q) => W(q.u, D - 5, q.v))));
    const s0 = W(a + 7, D + 2, zTop(D + 2)), s1 = W(a + 7, D + 2, zTop(D + 2) + 6);
    c.stick.setAttribute("d", seg(s0, s1));
    c.knob.setAttribute("cx", s1[0].toFixed(2)); c.knob.setAttribute("cy", s1[1].toFixed(2));
    [[b - 8.5, D + 2.6], [b - 4.5, D + 1.4]].forEach(([x, y], k) => {
      const q = W(x, y, zTop(y));
      c.btns[k].setAttribute("cx", q[0].toFixed(2)); c.btns[k].setAttribute("cy", q[1].toFixed(2));
    });
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const c of cabs) { draw(c, tval(c.y, now)); if (!tdone(c.y, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  // Hit test on the rest pose: the cabinet whose resting centre is nearest the pointer's screen x, inside the row's height.
  const cx = cabs.map((c) => P(c.a + CW / 2, D / 2, 47)[0]), pitch = cx[1] - cx[0];
  const top = Math.min(...cabs.map((c) => P(c.a, 0, 94)[1])) - 6, bot = Math.max(...cabs.map((c) => P(c.a + CW, D + 7, 0)[1])) + 10;
  function hit([x, y]) {
    if (y < top || y > bot) return -1;
    let best = -1, d = pitch * 0.75;
    cx.forEach((c, i) => { if (Math.abs(x - c) < d) { d = Math.abs(x - c); best = i; } });
    return best;
  }

  let act = -1;
  function setActive(i) {
    if (i === act) return;
    const now = performance.now(), from = i >= 0 ? i : act;
    act = i;
    cabs.forEach((c, k) => {
      tset(c.y, i < 0 ? REST[k] : k === i ? PULL : 0, now, Math.abs(k - from) * stag);
      c.screen.classList.toggle("hi", i < 0 ? k === LIT : k === i);
    });
    read.textContent = i < 0 ? "rest" : "cab " + (i + 1);
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "cabinets",
  means: "A row of arcade cabinets: the one under the pointer rolls forward and its screen lights, the rest fall in line.",
  rules: [1, 2, 5, 6],
  range: [0, 45, 90],
  tour: [[182, 120], [243, 150], [211, 134], null],
  mount,
});
