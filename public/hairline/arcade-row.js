/**
 * Arcade row: five upright cabinets, each running its own game on a 6 × 8 grid of dots: breakout, pong,
 * snake, invaders, stacker. One at a time rolls forward and plays while the others hold their last frame,
 * dim; every 3.5 seconds the next takes over. The cabinet under the pointer rolls forward and keeps playing
 * until the pointer leaves. The playing game's ball, head, shot or bar is the one bright mark. The slider
 * is the stagger, in ms. The pattern: one of many (Riffle), on an ambient clock that a hand can hold.
 */
const { Cam, fillet, fit, hull, open, poly, proj, prism, rings, rrect, seg, facing, reducedMotion,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid } = HL;

const N = 5, CW = 28, GAP = 4, D = 30, PULL = 16, HOLD = 3.5, RATE = 7, GC = 6, GR = 8;
const REST = [1.5, -2.5, 3, 0, 2.5], NAMES = ["breakout", "pong", "snake", "invaders", "stacker"];
// The side profile in (y, z), front at +y, cut into convex pieces so each fills as a hull.
const PIECES = [[[0, 0], [D, 0], [D, 38], [0, 38]], [[0, 38], [D, 38], [D + 7, 42], [D + 7, 46], [D - 3, 50], [0, 50]],
  [[0, 50], [D - 3, 50], [D - 12, 86], [0, 86]], [[0, 86], [D - 12, 86], [D - 6, 88], [D - 6, 100], [0, 102]]];
const SIDE = fillet([[0, 0], [D, 0], [D, 38], [D + 7, 42], [D + 7, 46], [D - 3, 50], [D - 12, 86], [D - 6, 88], [D - 6, 100], [0, 102]],
  [1.2, 1.2, 0.8, 1.2, 1.4, 0.8, 0.8, 1, 1.4, 2.4], 3);
const RAW = (k) => SIDE[k * 4 + 2];
const faces = (k) => { const p = SIDE[k], q = SIDE[(k + 1) % SIDE.length]; return q[1] - p[1] - 0.816 * (q[0] - p[0]) > 0; };
/** The runs of the profile whose edges do (or do not) face the camera, each as its points. */
function runs(want) {
  const n = SIDE.length, out = [];
  let k0 = 0, cur = null;
  while (k0 < n && faces(k0) === want) k0++;
  for (let j = 0, k = k0; j < n; j++, k = (k0 + j) % n) faces(k) === want ? (cur || out.push((cur = [SIDE[k]])), cur.push(SIDE[(k + 1) % n])) : (cur = null);
  return out;
}
const LIT_RUNS = runs(true), DARK_RUNS = runs(false), FRONT = SIDE.slice(5, 39);
const L = Math.hypot(9, 36), SCREEN = rrect(2.5, 3, CW - 2.5, L - 3, 2.4, 3);
const zTop = (y) => 46 + (D + 7 - y) * 0.4;

/** The five games. Each step()s on the beat; at(x, y) says what a cell shows: 2 bright, 1 medium, 0 off. y counts up from the bottom. */
function makeGames(rand) {
  const box = (x, y) => x >= 0 && x < GC && y >= 0 && y < GR, eq = (p, x, y) => p && p[0] === x && p[1] === y;
  const breakout = () => {
    let bricks, b, v, pad;
    const reset = () => { bricks = new Set([...Array(GC * 2).keys()].map((k) => k + GC * (GR - 2))); b = [2, 2]; v = [1, 1]; pad = 2; }; reset();
    return { step() {
      let [x, y] = b, [vx, vy] = v;
      if (!box(x + vx, 0)) vx = -vx;
      if (y + vy >= GR) vy = -vy;
      const k = x + vx + (y + vy) * GC;
      if (bricks.has(k)) { bricks.delete(k); vy = -vy; if (!bricks.size) return reset(); }
      else if (y + vy === 0 && x + vx >= pad - 1 && x + vx <= pad + 2) vy = 1;
      else if (y + vy < 0) return reset();
      else { x += vx; y += vy; }
      b = [x, y]; v = [vx, vy]; pad = Math.max(0, Math.min(GC - 2, pad + Math.sign(x - pad - 0.5 + vx)));
    }, at: (x, y) => (eq(b, x, y) ? 2 : bricks.has(x + y * GC) || (y === 0 && x >= pad && x <= pad + 1) ? 1 : 0) };
  };
  const pong = () => {
    let b, v, p = [2, 2];
    const serve = () => { b = [rand(GC), 3 + rand(2)]; v = [rand(2) ? 1 : -1, rand(2) ? 1 : -1]; }; serve();
    return { step() {
      let [x, y] = b, [vx, vy] = v;
      if (!box(x + vx, 0)) vx = -vx;
      const s = vy < 0 ? 0 : 1;
      if (rand(8)) p[s] = Math.max(0, Math.min(GC - 2, p[s] + Math.sign(x + vx - p[s] - 0.5)));
      if (y === (s ? GR - 2 : 1)) { if (x + vx >= p[s] && x + vx <= p[s] + 1) vy = -vy; else return serve(); }
      b = [x + vx, y + vy]; v = [vx, vy];
    }, at: (x, y) => (eq(b, x, y) ? 2 : (y === 0 && x >= p[0] && x <= p[0] + 1) || (y === GR - 1 && x >= p[1] && x <= p[1] + 1) ? 1 : 0) };
  };
  const snake = () => {
    let body, dir, food;
    const on = (x, y) => body.some((q) => eq(q, x, y));
    const feed = () => { do food = [rand(GC), rand(GR)]; while (on(...food)); };
    const reset = () => { body = [[2, 3], [1, 3], [0, 3]]; dir = 0; feed(); }; reset();
    return { step() {
      const h = body[0], M = [[1, 0], [0, 1], [-1, 0], [0, -1]], far = (o) => Math.abs(o[1] - food[0]) + Math.abs(o[2] - food[1]);
      const o = [dir, (dir + 1) % 4, (dir + 3) % 4].map((k) => [k, h[0] + M[k][0], h[1] + M[k][1]]).filter(([, x, y]) => box(x, y) && !on(x, y));
      if (!o.length) return reset();
      o.sort((a, c) => far(a) - far(c));
      dir = o[0][0]; body.unshift([o[0][1], o[0][2]]);
      if (eq(food, ...body[0])) { if (body.length > 9) body.length = 3; feed(); } else body.pop();
    }, at: (x, y) => (eq(body[0], x, y) ? 2 : on(x, y) || eq(food, x, y) ? 1 : 0) };
  };
  const invaders = () => {
    let foes, dx, t, gun, shot;
    const reset = () => { foes = [0, 2, 4].flatMap((x) => [[x, GR - 1], [x, GR - 2]]); dx = 1; t = 0; gun = 2; shot = null; }; reset();
    return { step() {
      if (shot) shot[1]++;
      const k = shot ? foes.findIndex((f) => eq(f, ...shot)) : -1;
      if (k >= 0) { foes.splice(k, 1); shot = null; } else if (shot && shot[1] >= GR) shot = null;
      if (++t % 3 === 0) foes.some((f) => !box(f[0] + dx, 0)) ? ((dx = -dx), foes.forEach((f) => f[1]--)) : foes.forEach((f) => (f[0] += dx));
      if (!foes.length || foes.some((f) => f[1] <= 1)) return reset();
      const aim = foes.reduce((a, f) => (Math.abs(f[0] - gun) < Math.abs(a[0] - gun) ? f : a))[0];
      if (aim !== gun) gun += Math.sign(aim - gun); else if (!shot) shot = [gun, 0];
    }, at: (x, y) => (eq(shot, x, y) ? 2 : foes.some((f) => eq(f, x, y)) || (y === 0 && x === gun) ? 1 : 0) };
  };
  const stacker = () => {
    let rows, bx, w, dir, ran, hold;
    const reset = () => { rows = [[1, 3]]; w = 3; bx = 0; dir = 1; ran = 0; hold = 0; }; reset();
    return { step() {
      if (hold) { if (--hold === 0) reset(); return; }
      bx += dir;
      if (!box(bx, 0) || !box(bx + w - 1, 0)) { dir = -dir; bx += 2 * dir; }
      const [f, e] = rows[rows.length - 1], over = Math.min(e, bx + w - 1) - Math.max(f, bx) + 1;
      if (!(++ran > 2 && (over === w ? rand(10) < 7 : over === w - 1 ? rand(10) < 3 : !rand(30)))) return;
      if (over <= 0) { hold = 6; return; }
      rows.push([Math.max(f, bx), Math.min(e, bx + w - 1)]); w = over; bx = 0; dir = 1; ran = 0;
      if (rows.length >= GR) hold = 6;
    }, at: (x, y) => (!hold && y === rows.length && x >= bx && x < bx + w ? 2 : rows[y] && x >= rows[y][0] && x <= rows[y][1] ? (hold % 2 ? 2 : 1) : 0) };
  };
  return [breakout(), pong(), snake(), invaders(), stacker()];
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value, seed = 3;
  const games = makeGames((n) => ((seed = (seed * 1103515245 + 12345) % 2147483648) % n));
  const X1 = N * CW + (N - 1) * GAP, YF = D + 7 + PULL + 4;
  const C = Cam(45, 0.5, 1.8);
  fit(C, [[-4, -4, -3], [X1 + 4, YF, -3], [X1 + 4, -4, -3], [-4, YF, -3], [0, 0, 102], [X1, 0, 102]], 200, 162);
  const P = proj(C);
  const g = mk("g", {}, svg);
  const [fr, fi] = rings(-4, -4, X1 + 4, YF, 6, 1.6);
  put(solid(g), prism(P, facing(C), fr, fi, -3, 0));
  const cabs = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g), el = (cls, tag = "path") => mk(tag, { class: cls }, grp);
    const c = { i, a: i * (CW + GAP), fills: PIECES.map(() => el("fo")), sil: el("nf sil"), crease: el("nf"), seams: el("nf lo") };
    Object.assign(c, { door: el("nf lo"), slots: el("nf"), screen: el("nf"), marquee: el("nf lo"), stick: el("nf sil"), knob: el("sil", "ellipse") });
    c.knob.setAttribute("rx", (1.7 * C.S).toFixed(2)); c.knob.setAttribute("ry", (1.7 * C.S).toFixed(2));
    c.cells = [...Array(GC * GR)].map(() => ({ el: mk("circle", { r: 0.95, class: "dot off" }, grp), cls: "dot off" }));
    c.y = tween(REST[i]); c.drawn = NaN;
    cabs.push(c);
  }
  function draw(c, dy) {
    if (dy === c.drawn) return;
    c.drawn = dy;
    const a = c.a, b = a + CW, m = a + CW / 2;
    const W = (x, y, z) => P(x, y + dy, z), at = (x, pts) => pts.map(([y, z]) => W(x, y, z));
    const along = ([y, z]) => seg(W(a, y, z), W(b, y, z)), onScreen = (u, v) => W(a + u, D - 3 - 9 * (v / L), 50 + 36 * (v / L));
    PIECES.forEach((pc, k) => c.fills[k].setAttribute("d", poly(hull(at(a, pc).concat(at(b, pc))))));
    c.sil.setAttribute("d", open(at(a, FRONT)) + DARK_RUNS.map((r) => open(at(b, r))).join("") + [RAW(1), RAW(3), RAW(7), RAW(9)].map(along).join(""));
    c.crease.setAttribute("d", LIT_RUNS.map((r) => open(at(b, r))).join(""));
    c.seams.setAttribute("d", [RAW(4), RAW(5), RAW(8)].map(along).join(""));
    c.door.setAttribute("d", poly(rrect(m - 5, 7, m + 5, 23, 1.4, 3).map((q) => W(q.u, D, q.v))));
    c.slots.setAttribute("d", seg(W(m - 2, D, 15), W(m - 2, D, 19)) + seg(W(m + 2, D, 15), W(m + 2, D, 19)));
    c.screen.setAttribute("d", poly(SCREEN.map((q) => onScreen(q.u, q.v))));
    c.marquee.setAttribute("d", poly(rrect(a + 3, 90, b - 3, 98, 1.6, 3).map((q) => W(q.u, D - 6, q.v))));
    const s1 = W(a + 7, D + 2, zTop(D + 2) + 6);
    c.stick.setAttribute("d", seg(W(a + 7, D + 2, zTop(D + 2)), s1));
    c.knob.setAttribute("cx", s1[0].toFixed(2)); c.knob.setAttribute("cy", s1[1].toFixed(2));
    c.cells.forEach((t, k) => place(t.el, onScreen(4.5 + (k % GC) * 3.8, 5.5 + ((k / GC) | 0) * 3.75)));
  }
  /** Paints a cabinet's game; a game that is not playing keeps its frame, dimmed. */
  const paint = (c, live) => c.cells.forEach((t, k) => {
    const v = games[c.i].at(k % GC, (k / GC) | 0), cls = v === 2 && live ? "dot" : v ? "dot m" : "dot off";
    if (cls !== t.cls) { t.el.setAttribute("class", cls); t.cls = cls; }
  });
  let lit = 0, act = -1, clock = 0, acc = 0;
  /** Lights cabinet i: it rolls forward, the rest fall back to their places, staggered outwards from it. */
  function light(i) {
    const now = performance.now(), was = lit;
    lit = i;
    cabs.forEach((c, k) => { tset(c.y, k === i ? PULL : REST[k], now, Math.abs(k - i) * stag); c.screen.classList.toggle("hi", k === i); });
    paint(cabs[was], false); paint(cabs[i], true);
  }
  cabs.forEach((c) => paint(c, false));
  light(0);
  const B = register(stage, (dt, now) => {
    for (const c of cabs) draw(c, tval(c.y, now));
    if (reducedMotion()) return !cabs.every((c) => tdone(c.y, now));
    if (act < 0 && (clock += dt) >= HOLD) { clock = 0; light((lit + 1) % N); }
    for (acc += dt; acc >= 1 / RATE; acc -= 1 / RATE) { games[lit].step(); paint(cabs[lit], true); }
    return true;
  });
  bag.add(B.unregister);
  // Hit test on the rest pose: the cabinet whose resting centre is nearest the pointer's screen x, inside the row's height.
  const cx = cabs.map((c) => P(c.a + CW / 2, D / 2, 50)[0]), pitch = cx[1] - cx[0];
  const top = Math.min(...cabs.map((c) => P(c.a, 0, 102)[1])) - 6, bot = Math.max(...cabs.map((c) => P(c.a + CW, D + 7, 0)[1])) + 10;
  const hit = ([x, y]) => (y < top || y > bot ? -1 : cx.reduce((best, c, i) => (Math.abs(x - c) < pitch * 0.75 && (best < 0 || Math.abs(x - c) < Math.abs(x - cx[best])) ? i : best), -1));
  function hold(i) {
    if (i === act) return;
    act = i; clock = 0;
    if (i >= 0 && i !== lit) light(i);
    read.textContent = i < 0 ? "rest" : NAMES[i];
    B.wake();
  }
  bag.add(pointer(stage, { move: (p) => hold(hit(p)), leave: () => hold(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}

hairline({
  name: "arcade-row",
  means: "Five arcade cabinets taking turns to play breakout, pong, snake, invaders and stacker; the pointer holds one.",
  rules: [1, 2, 4, 7], range: [0, 45, 90], tour: [[174, 115], [255, 156], [214, 135], null], mount,
});
