/**
 * Cartridges: a rounded tray holding seven game cartridges on edge, each a
 * slab with a chamfered corner, a recessed label and grip ridges. The one
 * under the pointer stands up and lifts clear of the tray; the ones behind
 * lean back and the ones in front lean forward, staggered outwards from it.
 * At rest one cartridge already stands proud, its number lit. Each number is
 * a dot on the label's 4 × 2 grid. The slider is the stagger, in ms.
 *
 * The pattern: discrete items (Riffle). Tweens, a stagger by distance, a hit
 * test on static bands along the resting top edges, identity by geometry.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, reflect, register,
} = HL;

const N = 7, W = 68, H = 60, T = 7, G = 15, CH = 11;
const REST = [-14, -11, -13, -4, -12, -10, -13], RLIFT = [0, 0, 0, 9, 0, 0, 0], PROUD = 3;
const BACK = -22, FWD = 16, LIFT = 24;
const X0 = -5, X1 = W + 5, Y0 = -T - 5, Y1 = (N - 1) * G + 6, WH = 18, WR = 6, WT = 2.4;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The tray, which never moves: `far` is painted before the cartridges, `near` after them. */
function tray(P, front, outer, inner) {
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 2.5)), "nf lo"],
  ];
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  const hx = (X0 + X1) / 2, onFront = (ring) => ring.map((q) => P(q.u, Y1, q.v));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    [poly(onFront(rrect(hx - 11, 5.5, hx + 11, 11.5, 3, 5))), "nf"],
    [poly(onFront(rrect(hx - 9.4, 7, hx + 9.4, 10, 1.5, 5))), "nf lo"],
  ];
  return { far, near };
}

/** The cartridge's outline in its own plane: square below, the top right corner cut. */
const SHAPE = fillet([[0, 0], [W, 0], [W, H - CH], [W - CH, H], [0, H]], [1.4, 1.4, 2.4, 2.4, 3.6]);
/** The front face's edges that sit inside the silhouette: the right side, the chamfer and the top. */
const CREASE = SHAPE.slice(7, 23);
const LABEL = rrect(7, 9, W - 7, H - 19, 3, 4).map((q) => [q.u, q.v]);

/** Cartridge i leaning th degrees (negative leans back) and lifted by `lift`: its paths and its dots. */
function pose(P, i, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - T * c, v * c + T * s + lift);
  const pts = SHAPE.map((p) => w(p[0], p[1])).concat(SHAPE.map((p) => wb(p[0], p[1])));
  const dots = [];
  for (let k = 0; k < 8; k++) dots.push(w(13 + (k % 4) * 3.4, 14 + Math.floor(k / 4) * 3.4));
  return {
    sil: poly(hull(pts)),
    crease: open(CREASE.map((p) => w(p[0], p[1]))),
    label: poly(LABEL.map((p) => w(p[0], p[1]))),
    grip: [H - 5, H - 8.5, H - 12].map((v) => seg(w(9, v), w(W - CH - 6, v))).join(""),
    dots,
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted with a cartridge lifted and the front one leaning forward, so nothing leaves the frame.
  const C = Cam(45, 0.5, 1.68);
  fit(C, [[X0, Y0, 0], [X1, Y1, -8], [X1, Y0, 0], [X0, Y1, 0], [X0, Y0, H + LIFT], [X1, Y0, H + LIFT]], 200, 162);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const paths = tray(P, front, outer, inner);

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, outer, 0, 14);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  const carts = [];
  for (let i = 0; i < N; i++) {
    const n = N - i, grp = mk("g", {}, g);
    const sil = mk("path", { class: "sil" }, grp), crease = mk("path", { class: "nf" }, grp);
    const label = mk("path", { class: "nf" }, grp), grip = mk("path", { class: "nf lo" }, grp);
    // the cartridge's number: one dot of the label's 4 × 2 grid
    const dots = [];
    for (let k = 0; k < 8; k++) dots.push(mk("circle", { r: 0.95, class: "dot " + (k === n - 1 ? (i === PROUD ? "" : "m") : "off") }, grp));
    carts.push({ n, sil, crease, label, grip, dots, a: tween(REST[i]), z: tween(RLIFT[i]), drawn: "" });
  }
  carts[PROUD].crease.classList.add("hi");

  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  // hit bands: oblique strips along the RESTING top edges, at the mean lean. They never move.
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(-11)), H * Math.cos(rad(-11)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];

  /** The cartridge whose band holds the point; -1 outside. */
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N + 1) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const ct = carts[i], key = th.toFixed(3) + "," + lift.toFixed(3);
    if (key === ct.drawn) return;
    ct.drawn = key;
    const q = pose(P, i, th, lift);
    ct.sil.setAttribute("d", q.sil);
    ct.crease.setAttribute("d", q.crease);
    ct.label.setAttribute("d", q.label);
    ct.grip.setAttribute("d", q.grip);
    ct.dots.forEach((el, k) => place(el, q.dots[k]));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    carts.forEach((ct, i) => { draw(i, tval(ct.a, now), tval(ct.z, now)); if (!tdone(ct.a, now) || !tdone(ct.z, now)) moving = true; });
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  /** Pulls cartridge a (-1 puts them all back). The stagger spreads out from the one pulled, or let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    carts.forEach((ct, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST[i] : i < a ? BACK : i > a ? FWD : 0;
      tset(ct.a, th, now, delay); tset(ct.z, a < 0 ? RLIFT[i] : a === i ? LIFT : 0, now, delay);
      const lit = a < 0 ? i === PROUD : i === a;
      ct.crease.classList.toggle("hi", lit); ct.label.classList.toggle("hi", lit && a >= 0);
      ct.dots[ct.n - 1].classList.toggle("m", !lit);
    });
    read.textContent = a < 0 ? "rest" : "cart " + carts[a].n;
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
  name: "cartridges",
  means: "Seven game cartridges in a tray: the one under the pointer lifts clear, and its neighbours lean away in turn.",
  rules: [1, 2, 5, 10],
  range: [0, 40, 90],
  tour: [[178, 144], [213, 126], [249, 108], null],
  mount,
});
