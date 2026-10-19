/**
 * Arcade: an arcade stick. A rounded case with a top panel, a ball-top lever
 * on a dust washer, and eight buttons set in two curved rows, each a plunger
 * in a bezel. The pointer is projected onto the plane of the ball, and the
 * lever leans toward it on two springs, clamped to its gate. At rest the
 * lever sits a little off centre and one button is held down, lit. When the
 * pointer takes the lever the ball takes the light. The slider is the gate:
 * how far the lever may lean, as the sine of its angle.
 *
 * The pattern: aim at the pointer (Dish). Springs for where, a fixed plane
 * for the hit test, a clamp on the reach, and a rest that is mid-game.
 */
const {
  Cam, clamp, facing, fit, prism, proj, poly, rings, ringAt, rrect, unproj, spring, stepS,
  mk, pointer, put, register, disposer, solid,
} = HL;

const BW = 138, BD = 80, BH = 14, S = 1.72;
const LX = 36, LY = 42, PIV = 8, L = 38, RB = 9.5, RS = 1.8, RW = 10;
const BR = 6, BTN = [[70, 34], [87, 29], [105, 29], [123, 31], [66, 53], [83, 48], [101, 48], [119, 50]];
const DOWN = 5, HB = 3.2, REST = [0.12, -0.15], D0 = 46;
const NAMES = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gate = value;

  // Fitted with the lever at its widest lean every way, so nothing leaves the frame.
  const C = Cam(45, 0.5, S), reach = (L + PIV) * 0.7 + RB;
  fit(C, [[0, 0, 0], [BW, BD, 0], [BW, 0, 0], [0, BD, 0], [0, 0, BH],
    [LX - reach, LY - reach, BH + L + RB], [LX + reach, LY + reach, BH + L + RB]], 200, 170);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // The case, and its top panel: a thin plate gets a second line, not a second solid.
  const [cr, ci] = rings(0, 0, BW, BD, 9, 1.8);
  put(solid(g), prism(P, front, cr, ci, 0, BH));
  mk("path", { d: poly(ringAt(P, rrect(6, 6, BW - 6, BD - 6, 6, 5), BH)), class: "nf lo" }, g);

  // The lever and the buttons share the panel: paint them back to front by x + y.
  const parts = [{ lever: true, k: LX + LY }].concat(BTN.map(([x, y], i) => ({ i, x, y, k: x + y })));
  parts.sort((a, b) => a.k - b.k);

  const buttons = [];
  let washer, shaft, ball, equator;
  for (const p of parts) {
    if (p.lever) {
      washer = mk("path", { class: "sil" }, g);
      shaft = mk("path", { class: "sil" }, g);
      ball = mk("ellipse", { class: "sil", rx: RB * S, ry: RB * S }, g);
      equator = mk("path", { class: "nf lo" }, g);
      continue;
    }
    const { i, x, y } = p, h = i === DOWN ? 0.9 : HB;
    mk("path", { d: poly(ringAt(P, rrect(x - BR - 1.8, y - BR - 1.8, x + BR + 1.8, y + BR + 1.8, BR + 1.8, 5), BH)), class: "nf lo" }, g);
    const [ring, inner] = rings(x - BR, y - BR, x + BR, y + BR, BR, 1.1);
    const el = solid(g);
    put(el, prism(P, front, ring, inner, BH, BH + h));
    buttons[i] = el;
  }
  buttons[DOWN].sil.classList.add("hi");

  // The lever's lean, as the ground vector of its top over its pivot: one spring per axis.
  const lx = spring(REST[0]), ly = spring(REST[1]);
  const disc = rrect(-RW, -RW, RW, RW, RW, 5);
  let drawn = "";

  function drawLever() {
    const key = lx.x.toFixed(4) + "," + ly.x.toFixed(4);
    if (key === drawn) return;
    drawn = key;
    const sx = Math.min(1, Math.hypot(lx.x, ly.x)), cz = Math.sqrt(1 - sx * sx);
    const at = (t) => [LX + lx.x * t, LY + ly.x * t, BH - PIV + cz * t];
    const w = at(PIV / cz), top = P(...at(PIV + L)), base = P(...w);
    washer.setAttribute("d", poly(disc.map((q) => P(w[0] + q.u, w[1] + q.v, BH + 0.6))));
    const dx = top[0] - base[0], dy = top[1] - base[1], n = Math.hypot(dx, dy) || 1;
    const ox = (-dy / n) * RS * S, oy = (dx / n) * RS * S;
    shaft.setAttribute("d", poly([[base[0] + ox, base[1] + oy], [top[0] + ox, top[1] + oy], [top[0] - ox, top[1] - oy], [base[0] - ox, base[1] - oy]]));
    ball.setAttribute("cx", top[0].toFixed(2));
    ball.setAttribute("cy", top[1].toFixed(2));
    const r = RB * S;
    equator.setAttribute("d", `M${(top[0] - r).toFixed(2)} ${top[1].toFixed(2)}A${r} ${r * 0.5} 0 0 0 ${(top[0] + r).toFixed(2)} ${top[1].toFixed(2)}`);
  }

  const B = register(stage, (dt) => {
    const m = stepS(lx, dt) | stepS(ly, dt);
    drawLever();
    return !!m;
  });
  bag.add(B.unregister);

  /** The direction the lever is told to lean, read from the springs' targets: screen up is up. */
  function name() {
    const mag = Math.hypot(lx.t, ly.t);
    if (mag < gate * 0.3) return "centre";
    const a = P(LX, LY, 0), b = P(LX + lx.t, LY + ly.t, 0);
    const ang = Math.atan2((b[1] - a[1]) / 0.5, b[0] - a[0]);
    return NAMES[(Math.round(ang / (Math.PI / 4)) + 8) % 8];
  }

  let held = false;
  function aim(p) {
    if (!held) { held = true; buttons[DOWN].sil.classList.remove("hi"); ball.classList.add("hi"); }
    const [wx, wy] = unproj(C, p[0], p[1], BH + L);
    const dx = wx - LX, dy = wy - LY, d = Math.hypot(dx, dy) || 1, m = gate * clamp(d / D0, 0, 1);
    lx.t = (dx / d) * m; ly.t = (dy / d) * m;
    read.textContent = "stick " + name();
    B.wake();
  }
  function leave() {
    held = false;
    buttons[DOWN].sil.classList.add("hi"); ball.classList.remove("hi");
    lx.t = REST[0]; ly.t = REST[1];
    read.textContent = "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, leave }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gate = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "arcade",
  means: "An arcade stick: the lever leans toward the pointer, as far as its gate allows.",
  rules: [1, 3, 5, 9],
  range: [0.38, 0.55, 0.68],
  tour: [[238, 135], [110, 110], [175, 215], null],
  mount,
});
