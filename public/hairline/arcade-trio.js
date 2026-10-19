/**
 * Arcade trio: three upright cabinets with wide screens, each running its own game on a 10 × 9 grid of dots:
 * breakout, tetris, snake. One at a time rolls forward and plays while the others hold their last frame, dim;
 * every 3.5 seconds the next takes over. The cabinet under the pointer rolls forward and keeps playing until
 * the pointer leaves. The playing game's ball, piece or head is the one bright mark. The slider is the
 * stagger, in ms. The pattern: one of many (Riffle), on an ambient clock that a hand can hold.
 */
const { Cam, fillet, fit, hull, open, poly, proj, prism, rings, rrect, seg, facing, reducedMotion,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid } = HL;

const N = 3, CW = 40, GAP = 5, D = 30, PULL = 16, HOLD = 3.5, GC = 10, GR = 9;
const REST = [2, -1.5, 1], NAMES = ["breakout", "tetris", "snake"], RATES = [8, 5, 7];
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
const L = Math.hypot(9, 36), SCREEN = rrect(2.5, 3, CW - 2.5, L - 3, 2.6, 3);
const zTop = (y) => 46 + (D + 7 - y) * 0.4;

/** The games on a 10 × 9 grid of dots, y up from the bottom: step() on each beat, at(x, y) is 2 bright, 1 medium, 0 off.
 * Each step leaves its moment in fx (null for none): breakout "jolt", tetris "thud" or "land", snake "hop" or "crash". */
function makeGames(rand) {
  const box = (x, y) => x >= 0 && x < GC && y >= 0 && y < GR, eq = (p, x, y) => p && p[0] === x && p[1] === y;
  // Breakout: three rows of five two-dot bricks. A brick the ball strikes flashes for a beat, then is gone, and a ring
  // of sparks flies out of it; the ball leaves a trail of one dot.
  const breakout = () => {
    let bricks, b, v, pad, hit, wait, tr, sp, sa;
    const brick = (x, y) => (y >= GR - 3 && box(x, y) ? (GR - 1 - y) * 5 + (x >> 1) : -1);
    const reset = () => { bricks = new Set([...Array(15).keys()]); b = [4, 1]; v = [1, 1]; pad = 3; hit = -1; wait = 0; tr = sp = null; }; reset();
    return { fx: null, step() {
      hit = -1; this.fx = null; tr = b; if (sp && ++sa > 2) sp = null;
      if (wait) { if (--wait === 0) reset(); return; }
      let [x, y] = b, [vx, vy] = v;
      if (!box(x + vx, 0)) vx = -vx;
      if (y + vy >= GR) vy = -vy;
      const k = brick(x + vx, y + vy);
      if (bricks.has(k)) { bricks.delete(k); hit = k; sp = [x + vx, y + vy]; sa = 1; this.fx = "jolt"; vy = -vy; if (!bricks.size) wait = 5; }
      else if (y + vy === 0 && x + vx >= pad - 1 && x + vx <= pad + 3) { vy = 1; vx = x + vx < pad + 1 ? -1 : x + vx > pad + 1 ? 1 : vx; }
      else if (y + vy < 0) return reset();
      else { x += vx; y += vy; }
      b = [x, y]; v = [vx, vy];
      pad = Math.max(0, Math.min(GC - 3, pad + Math.sign(x + vx - pad - 1)));
    }, at: (x, y) => { const k = brick(x, y), spark = sp && !bricks.has(k) && Math.max(Math.abs(x - sp[0]), Math.abs(y - sp[1])) === sa;
      return eq(b, x, y) || (k >= 0 && k === hit) || spark ? 2 : bricks.has(k) || eq(tr, x, y) || (y === 0 && x >= pad && x <= pad + 2) ? 1 : 0; } };
  };
  // Tetris: a six-wide well between two walls. Each piece slides to where a simple player would put it, and drops.
  const tetris = () => {
    const L0 = 2, WW = 6, KINDS = [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]]];
    const turn = (c) => { const r = c.map(([x, y]) => [y, -x]), mx = Math.min(...r.map((p) => p[0])), my = Math.min(...r.map((p) => p[1])); return r.map(([x, y]) => [x - mx, y - my]); };
    const row = (w, j) => w.slice(j * WW, j * WW + WW).every(Boolean);
    let well, cells, px, py, tx, full;
    const fits = (c, x, y) => c.every(([u, v]) => x + u >= 0 && x + u < WW && y + v >= 0 && (y + v >= GR || !well[(y + v) * WW + x + u]));
    function spawn() {
      let c = KINDS[rand(KINDS.length)], best = -Infinity;
      for (let r = 0; r < 4; r++, c = turn(c)) for (let x = 0; x + Math.max(...c.map((p) => p[0])) < WW; x++) {
        let y = GR - 1, s = 0;
        while (fits(c, x, y - 1)) y--;
        const w = well.slice();
        c.forEach(([u, v]) => { if (y + v < GR) w[(y + v) * WW + x + u] = 1; });
        for (let i = 0; i < WW; i++) { let h = GR; while (h > 0 && !w[(h - 1) * WW + i]) h--; s -= h; for (let j = 0; j < h; j++) if (!w[j * WW + i]) s -= 4; }
        for (let j = 0; j < GR; j++) if (row(w, j)) s += 12;
        if (s > best) { best = s; cells = c; tx = x; }
      }
      px = Math.min(2, WW - 1 - Math.max(...cells.map((p) => p[0]))); py = GR - 1;
      if (!fits(cells, px, py)) well.fill(0);
    }
    const reset = () => { well = Array(WW * GR).fill(0); full = []; spawn(); }; reset();
    return { fx: null, step() { this.fx = null;
      if (full.length) { full.sort((a, c) => c - a).forEach((r) => { well.splice(r * WW, WW); well.push(...Array(WW).fill(0)); }); full = []; return; }
      if (px !== tx && fits(cells, px + Math.sign(tx - px), py)) px += Math.sign(tx - px);
      if (fits(cells, px, py - 1)) { py--; return; }
      cells.forEach(([u, v]) => { if (py + v < GR) well[(py + v) * WW + px + u] = 1; });
      for (let j = 0; j < GR; j++) if (row(well, j)) full.push(j);
      this.fx = full.length ? "thud" : "land"; spawn();
    }, at: (x, y) => { const u = x - L0; if (u === -1 || u === WW) return 1; if (u < 0 || u > WW) return 0;
      return cells.some(([a, c]) => px + a === u && py + c === y) || (well[y * WW + u] && full.includes(y)) ? 2 : well[y * WW + u] ? 1 : 0;
    } };
  };
  // Snake: it steers for the pellet, grows when it eats, and starts over when it boxes itself in. Eating sends a ring
  // out from its head; boxing itself in is three beats of static before it starts again.
  const snake = () => {
    let body, dir, food, ring, rr, noise = 0;
    const on = (x, y) => body.some((q) => eq(q, x, y));
    const feed = () => { do food = [rand(GC), rand(GR)]; while (on(...food)); };
    const reset = () => { body = [[3, 4], [2, 4], [1, 4]]; dir = 0; ring = null; feed(); }; reset();
    return { fx: null, step() { this.fx = null;
      if (noise) { if (--noise === 0) reset(); return; } if (ring && ++rr > 3) ring = null;
      const h = body[0], M = [[1, 0], [0, 1], [-1, 0], [0, -1]], far = (o) => Math.abs(o[1] - food[0]) + Math.abs(o[2] - food[1]);
      const o = [dir, (dir + 1) % 4, (dir + 3) % 4].map((k) => [k, h[0] + M[k][0], h[1] + M[k][1]]).filter(([, x, y]) => box(x, y) && !on(x, y));
      if (!o.length) { noise = 3; this.fx = "crash"; return; }
      o.sort((a, c) => far(a) - far(c));
      dir = o[0][0]; body.unshift([o[0][1], o[0][2]]);
      if (eq(food, ...body[0])) { if (body.length > 12) body.length = 3; feed(); ring = body[0]; rr = 1; this.fx = "hop"; } else body.pop();
    }, at: (x, y) => (noise ? (rand(4) ? 0 : 1) : eq(body[0], x, y) ? 2 : on(x, y) || eq(food, x, y) ? 1
      : ring && Math.max(Math.abs(x - ring[0]), Math.abs(y - ring[1])) === rr ? 2 : 0) };
  };
  return [breakout(), tetris(), snake()];
}
// The marquee lights' pattern for each game while a score's beats last: a chase, a flash, alternating pairs.
const BLINK = [(k, b, n) => k === b % n, (k, b) => b % 2 === 0, (k, b) => (k + b) % 2 === 0];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value, seed = 3;
  const games = makeGames((n) => ((seed = (seed * 1103515245 + 12345) % 2147483648) % n));
  const X1 = N * CW + (N - 1) * GAP, YF = D + 7 + PULL + 4;
  const C = Cam(45, 0.5, 1.8);
  fit(C, [[-4, -4, -3], [X1 + 4, YF, -3], [X1 + 4, -4, -3], [-4, YF, -3], [0, 0, 102], [X1, 0, 102]], 200, 162);
  const P = proj(C), g = mk("g", {}, svg);
  const [fr, fi] = rings(-4, -4, X1 + 4, YF, 6, 1.6);
  put(solid(g), prism(P, facing(C), fr, fi, -3, 0));
  const cabs = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", { "data-game": NAMES[i] }, g), el = (cls, tag = "path") => mk(tag, { class: cls }, grp);
    const c = { fills: PIECES.map(() => el("fo")), sil: el("nf sil"), crease: el("nf"), seams: el("nf lo"), door: el("nf lo"), slots: el("nf") };
    Object.assign(c, { screen: el("nf"), marquee: el("nf lo"), stick: el("nf sil"), knob: el("sil", "ellipse") });
    c.knob.setAttribute("rx", (1.7 * C.S).toFixed(2)); c.knob.setAttribute("ry", (1.7 * C.S).toFixed(2));
    c.cells = [...Array(GC * GR)].map(() => ({ el: mk("circle", { r: 0.85, class: "dot off" }, grp), cls: "dot off" }));
    Object.assign(c, { i, a: i * (CW + GAP), y: tween(REST[i]), drawn: NaN, blink: 0, lights: [0, 1, 2, 3].map(() => mk("circle", { r: 1.1, class: "dot off" }, grp)) });
    cabs.push(c);
  }
  function draw(c, dy) {
    if (dy === c.drawn) return; c.drawn = dy;
    const a = c.a, cells = c.cells;
    const b = a + CW, m = a + CW / 2, W = (x, yy, z) => P(x, yy + dy, z), at = (x, pts) => pts.map(([yy, z]) => W(x, yy, z));
    const along = ([yy, z]) => seg(W(a, yy, z), W(b, yy, z)), onScreen = (u, v) => W(a + u, D - 3 - 9 * (v / L), 50 + 36 * (v / L));
    PIECES.forEach((pc, k) => c.fills[k].setAttribute("d", poly(hull(at(a, pc).concat(at(b, pc))))));
    c.sil.setAttribute("d", open(at(a, FRONT)) + DARK_RUNS.map((r) => open(at(b, r))).join("") + [RAW(1), RAW(3), RAW(7), RAW(9)].map(along).join(""));
    c.crease.setAttribute("d", LIT_RUNS.map((r) => open(at(b, r))).join(""));
    c.seams.setAttribute("d", [RAW(4), RAW(5), RAW(8)].map(along).join(""));
    c.door.setAttribute("d", poly(rrect(m - 6, 7, m + 6, 24, 1.6, 3).map((q) => W(q.u, D, q.v))));
    c.slots.setAttribute("d", seg(W(m - 2.4, D, 15), W(m - 2.4, D, 20)) + seg(W(m + 2.4, D, 15), W(m + 2.4, D, 20)));
    c.screen.setAttribute("d", poly(SCREEN.map((q) => onScreen(q.u, q.v))));
    c.marquee.setAttribute("d", poly(rrect(a + 3, 90, b - 3, 98, 1.6, 3).map((q) => W(q.u, D - 6, q.v))));
    const s1 = W(a + 8, D + 2, zTop(D + 2) + 6);
    c.stick.setAttribute("d", seg(W(a + 8, D + 2, zTop(D + 2)), s1));
    c.knob.setAttribute("cx", s1[0].toFixed(2)); c.knob.setAttribute("cy", s1[1].toFixed(2));
    cells.forEach((t, k) => place(t.el, onScreen(4 + (k % GC) * 3.55, 4.6 + ((k / GC) | 0) * 3.62)));
    c.lights.forEach((d, k) => place(d, W(m + (k - 1.5) * 6, D - 6, 94)));
  }
  /** Paints a cabinet's game; a game that is not playing keeps its frame, dimmed. */
  const paint = (c, live) => c.cells.forEach((t, k) => {
    const v = games[c.i].at(k % GC, (k / GC) | 0), cls = v === 2 && live ? "dot" : v ? "dot m" : "dot off";
    if (cls !== t.cls) { t.el.setAttribute("class", cls); t.cls = cls; }
  });
  /** A game's moment: its marquee blinks in the game's own pattern for six beats, and the page hears of it. */
  function score(c, fx) {
    if (c.blink > 0) c.blink--; if (fx) { if (fx !== "land") c.blink = 6; stage.dispatchEvent(new CustomEvent("arcade", { bubbles: true, detail: { game: NAMES[c.i], fx } })); }
    c.lights.forEach((d, k) => d.setAttribute("class", c.blink > 0 && BLINK[c.i](k, c.blink, 4) ? "dot" : "dot off"));
  }
  let lit = 0, act = -1, clock = 0, acc = 0;
  /** Lights cabinet i: it rolls forward, the rest fall back to their places, staggered outwards from it. */
  function light(i) {
    const now = performance.now(), was = lit;
    lit = i;
    cabs.forEach((c, k) => { tset(c.y, k === i ? PULL : REST[k], now, Math.abs(k - i) * stag); c.screen.classList.toggle("hi", k === i); });
    paint(cabs[was], false); paint(cabs[i], true); cabs[was].blink = 0; score(cabs[was], null);
  }
  cabs.forEach((c) => paint(c, false)); light(0);
  const B = register(stage, (dt, now) => {
    for (const c of cabs) draw(c, tval(c.y, now));
    if (reducedMotion()) return !cabs.every((c) => tdone(c.y, now));
    if (act < 0 && (clock += dt) >= HOLD) { clock = 0; light((lit + 1) % N); }
    for (acc += dt; acc >= 1 / RATES[lit]; acc -= 1 / RATES[lit]) { games[lit].step(); paint(cabs[lit], true); score(cabs[lit], games[lit].fx); }
    return true;
  });
  bag.add(B.unregister);
  // Hit test on the rest pose: the cabinet whose resting centre is nearest the pointer's screen x, inside the row's height.
  const cx = cabs.map((c) => P(c.a + CW / 2, D / 2, 50)[0]), pitch = cx[1] - cx[0];
  const top = Math.min(...cabs.map((c) => P(c.a, 0, 102)[1])) - 6, bot = Math.max(...cabs.map((c) => P(c.a + CW, D + 7, 0)[1])) + 10;
  const hit = ([x, y]) => (y < top || y > bot ? -1 : cx.reduce((best, c, i) => (Math.abs(x - c) < pitch * 0.75 && (best < 0 || Math.abs(x - c) < Math.abs(x - cx[best])) ? i : best), -1));
  function hold(i) {
    if (i === act) return; act = i; clock = 0;
    if (i >= 0 && i !== lit) light(i);
    read.textContent = i < 0 ? "rest" : NAMES[i];
    B.wake();
  }
  bag.add(pointer(stage, { move: (p) => hold(hit(p)), leave: () => hold(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}

hairline({
  name: "arcade-trio",
  means: "Three arcade cabinets taking turns to play breakout, tetris and snake; the pointer holds one.",
  rules: [1, 2, 4, 7], range: [0, 45, 90], tour: [[157, 107], [272, 164], [215, 136], null], mount,
});
