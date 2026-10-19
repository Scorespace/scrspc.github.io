/**
 * Cabinets, playing: the row of arcade cabinets from `cabinets`, where the
 * lit cabinet is running a game of breakout on a 6 × 7 grid of dots: two rows
 * of bricks, a paddle that follows the ball, a ball that is the one bright
 * dot. The cabinet under the pointer rolls forward, its screen lights, and a
 * fresh game starts on it; the rest square up behind it, staggered outwards.
 * The slider is the stagger, in ms.
 *
 * The pattern: one of many (Riffle), with an ambient loop on the chosen one.
 */
const {
  Cam, fillet, fit, hull, open, poly, proj, prism, rings, rrect, seg, facing, reducedMotion,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
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
const GC = 6, GR = 7, RATE = 7; // the game's grid, and its steps a second

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
    c.y = tween(REST[i]); c.drawn = NaN; c.grp = grp;
    cabs.push(c);
  }
  cabs[LIT].screen.classList.add("hi");

  // The game: one grid of dots, carried by whichever cabinet is lit, painted just after it.
  const play = mk("g", {}, g), cells = [];
  for (let k = 0; k < GC * GR; k++) cells.push({ el: mk("circle", { r: 0.95, class: "dot off" }, play), cls: "dot off" });
  let bricks, ball, vel, pad, acc = 0, host = -1;
  function newGame() { bricks = new Set([...Array(GC * 2).keys()].map((k) => k + GC * (GR - 2))); ball = [2, 2]; vel = [1, 1]; pad = 2; }
  function step() {
    let [x, y] = ball, [vx, vy] = vel;
    if (x + vx < 0 || x + vx >= GC) vx = -vx;
    if (y + vy >= GR) vy = -vy;
    const k = (x + vx) + (y + vy) * GC;
    if (bricks.has(k)) { bricks.delete(k); vy = -vy; if (!bricks.size) newGame(); }
    else if (y + vy === 0 && (x + vx === pad || x + vx === pad + 1 || x === pad || x === pad + 1)) vy = 1;
    else if (y + vy < 0) { newGame(); return; }
    else { x += vx; y += vy; }
    ball = [x, y]; vel = [vx, vy];
    pad = Math.max(0, Math.min(GC - 2, pad + Math.sign(x - pad - 0.5 + vx)));
  }
  function paintGame() {
    cells.forEach((t, k) => {
      const x = k % GC, y = (k / GC) | 0;
      const cls = x === ball[0] && y === ball[1] ? "dot" : bricks.has(k) || (y === 0 && (x === pad || x === pad + 1)) ? "dot m" : "dot off";
      if (cls !== t.cls) { t.el.setAttribute("class", cls); t.cls = cls; }
    });
  }
  function seat(i) {
    const c = cabs[i], dy = c.drawn;
    if (i !== host) { host = i; c.grp.after(play); newGame(); paintGame(); }
    cells.forEach((t, k) => {
      const u = 5.5 + (k % GC) * 2.6, v = 6 + ((k / GC) | 0) * 3;
      place(t.el, P(c.a + u, D - 3 - 8 * (v / L) + dy, 50 + 28 * (v / L)));
    });
  }

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

  let act = -1;
  const B = register(stage, (dt, now) => {
    let moving = false;
    for (const c of cabs) { draw(c, tval(c.y, now)); if (!tdone(c.y, now)) moving = true; }
    seat(act >= 0 ? act : LIT);
    if (reducedMotion()) return moving;
    for (acc += dt; acc >= 1 / RATE; acc -= 1 / RATE) step();
    paintGame();
    return true;
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
  name: "cabinets-play",
  means: "A row of arcade cabinets, one playing breakout: the one under the pointer rolls forward and starts a game.",
  rules: [1, 2, 5, 6],
  range: [0, 45, 90],
  tour: [[182, 120], [243, 150], [211, 134], null],
  mount,
});
