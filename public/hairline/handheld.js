/**
 * Handheld: a brick of a handheld console leaning back over its dashed
 * footprint. One big rounded corner at the bottom right, a bezel round the
 * glass, a power lamp, a raised cross pad, A and B on a slant, start and
 * select, a grille. The glass is 8 × 9 dots running a falling-blocks game:
 * pieces drop, stack and clear their rows. The game plays itself; the pointer
 * on the glass, a fixed plane, steers the falling piece to its column. The
 * falling piece is the bright mark. The slider is the pace, in steps a second.
 *
 * The pattern: an ambient loop that answers the pointer. One game clock, a
 * hit test on a fixed plane, solids built from an extruded front outline.
 */
const {
  Cam, fillet, fit, hull, open, poly, proj, rad, rrect, seg, reducedMotion,
  disposer, mk, place, pointer, register,
} = HL;

const W = 62, H = 104, T = 13, LEAN = 14, LIFT = 10, COLS = 8, ROWS = 9;
const GX = 17.5, GZ = 58.5, SX = 3.9, SZ = 3.75, GLASS = [15, 56, 47, 90.5];
const OUTLINE = fillet([[0, 0], [W, 0], [W, H], [0, H]], [5, 22, 5, 5], 8);
const PIECES = [[[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]]];
const cs = Math.cos(rad(LEAN)), sn = Math.sin(rad(LEAN));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let rate = value;
  const C = Cam(45, 0.5, 2.15);
  // Leaning back about its bottom back edge, LIFT above the ground.
  const P0 = proj(C), P = (x, y, z) => P0(x, y * cs - z * sn, LIFT + y * sn + z * cs);
  fit(C, [[0, 0, 0], [W, T, 0], [0, -H * sn, H * cs + LIFT], [W, T - H * sn, H * cs + LIFT], [0, T, -LIFT], [W, -H * sn, -LIFT]], 200, 160);
  const face = (pts, dy = 0) => pts.map(([x, z]) => P(x, T + dy, z));
  const g = mk("g", {}, svg);

  // The footprint on the ground, first, so every plate covers it.
  mk("path", { d: poly(rrect(0, -H * sn, W, T, 5, 4).map((q) => P0(q.u, q.v, 0))), class: "nf dash" }, g);
  // The body: a hull of its back and front outlines. Bright outside; dim where the front meets the sides we see.
  mk("path", { d: poly(hull(OUTLINE.map(([x, z]) => P(x, 0, z)).concat(face(OUTLINE)))), class: "sil" }, g);
  const sees = (k) => { const p = OUTLINE[k], q = OUTLINE[(k + 1) % OUTLINE.length]; return q[1] - p[1] - 0.55 * (q[0] - p[0]) > 0; };
  let d = "";
  for (let k = 0, run = []; k <= OUTLINE.length; k++) {
    if (k < OUTLINE.length && sees(k)) { if (!run.length) run.push(OUTLINE[k]); run.push(OUTLINE[(k + 1) % OUTLINE.length]); }
    else if (run.length) { d += open(face(run)); run = []; }
  }
  mk("path", { d, class: "nf" }, g);

  // What the face carries: bezel, glass, lamp, cross pad, A and B, start and select, grille.
  mk("path", { d: poly(face(fillet([[6, 50], [56, 50], [56, 97], [6, 97]], [3, 10, 3, 3], 5))), class: "nf" }, g);
  mk("path", { d: poly(face(rrect(...GLASS, 1.5, 3).map((q) => [q.u, q.v]))), class: "nf lo" }, g);
  place(mk("circle", { r: 1.1, class: "dot m" }, g), P(10, T, 79));
  const cross = fillet([[13.2, 22], [18.8, 22], [18.8, 27.2], [24, 27.2], [24, 32.8], [18.8, 32.8], [18.8, 38], [13.2, 38], [13.2, 32.8], [8, 32.8], [8, 27.2], [13.2, 27.2]], Array(12).fill(1), 2);
  mk("path", { d: poly(face(cross)), class: "lo" }, g);
  mk("path", { d: poly(face(cross, 1.8)), class: "sil" }, g);
  for (const [x, z] of [[42, 28], [52, 33]]) {
    const ring = rrect(x - 4, z - 4, x + 4, z + 4, 4, 5).map((q) => [q.u, q.v]);
    mk("path", { d: poly(face(ring)), class: "lo" }, g);
    mk("path", { d: poly(face(ring, 1.6)), class: "sil" }, g);
  }
  for (const x of [22, 33]) mk("path", { d: poly(face(rrect(x, 12, x + 7, 14.6, 1.3, 3).map((q) => [q.u, q.v]))), class: "nf" }, g);
  mk("path", { d: [0, 1, 2, 3].map((i) => seg(P(41 + i * 3.4, T, 5), P(47 + i * 3.4, T, 14))).join(""), class: "nf lo" }, g);

  // The dots, and the glass as a plane whose projection is inverted once, for the hit test.
  const dots = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const el = mk("circle", { r: 1.15, class: "dot off" }, g);
    place(el, P(GX + c * SX, T, GZ + r * SZ));
    dots.push({ el, cls: "dot off" });
  }
  const o = P(0, T, 0), ex = P(1, T, 0), ez = P(0, T, 1);
  const a = ex[0] - o[0], b = ez[0] - o[0], c2 = ex[1] - o[1], dd = ez[1] - o[1], det = a * dd - b * c2;
  const onGlass = ([sx, sy]) => { const qx = sx - o[0], qy = sy - o[1]; return [(dd * qx - b * qy) / det, (a * qy - c2 * qx) / det]; };

  // The game: a board of settled blocks, and one falling piece.
  let seed = 11, board, piece, px, py, aim = 0, held = null, acc = 0;
  const rand = (n) => ((seed = (seed * 1103515245 + 12345) % 2147483648) % n);
  const filled = (c, r) => board[r * COLS + c];
  const fits = (x, y) => piece.every(([u, v]) => x + u >= 0 && x + u < COLS && y + v >= 0 && (y + v >= ROWS || !filled(x + u, y + v)));
  const height = (c) => { let r = ROWS; while (r > 0 && !filled(c, r - 1)) r--; return r; };
  function spawn() {
    piece = PIECES[rand(PIECES.length)];
    px = 3; py = ROWS - 1;
    let best = Infinity;
    for (let c = 0; c < COLS - 1; c++) { const h = Math.max(height(c), height(c + 1)) + rand(2); if (h < best) { best = h; aim = c; } }
    if (!fits(px, py)) board.fill(false);
  }
  function step() {
    const target = held ?? aim;
    if (px !== target && fits(px + Math.sign(target - px), py)) px += Math.sign(target - px);
    if (fits(px, py - 1)) { py--; return; }
    for (const [u, v] of piece) if (py + v < ROWS) board[(py + v) * COLS + px + u] = true;
    for (let r = ROWS - 1; r >= 0; r--) if (board.slice(r * COLS, r * COLS + COLS).every(Boolean)) {
      board.splice(r * COLS, COLS);
      board.push(...Array(COLS).fill(false));
    }
    spawn();
  }
  function paint() {
    dots.forEach((t, k) => {
      const c = k % COLS, r = (k / COLS) | 0;
      const cls = piece.some(([u, v]) => px + u === c && py + v === r) ? "dot" : board[k] ? "dot m" : "dot off";
      if (cls !== t.cls) { t.el.setAttribute("class", cls); t.cls = cls; }
    });
  }
  board = Array(COLS * ROWS).fill(false);
  [0, 1, 2, 5, 6, 7, 8, 9, 13, 14, 15].forEach((k) => (board[k] = true));
  spawn();
  paint();

  // One clock for the game: whole steps only, and none when the reader asks for less motion.
  const B = register(stage, (dt) => {
    if (reducedMotion()) return false;
    let stepped = false;
    for (acc += dt; acc >= 1 / rate; acc -= 1 / rate) { step(); stepped = true; }
    if (stepped) paint();
    return true;
  });
  bag.add(B.unregister);

  function move(p) {
    const [x, z] = onGlass(p);
    if (x < GLASS[0] || x > GLASS[2] || z < GLASS[1] || z > GLASS[3]) { leave(); return; }
    held = Math.max(0, Math.min(COLS - 1, Math.round((x - GX) / SX)));
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
  name: "handheld",
  means: "A handheld console playing falling blocks; the pointer on its glass steers the falling piece.",
  rules: [1, 4, 7, 9],
  range: [3, 5, 8],
  tour: [[177, 106], [216, 122], [199, 108], null],
  mount,
});
