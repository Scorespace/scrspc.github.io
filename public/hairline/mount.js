/*
 * Mounts a Hairline figure into a page. This is the bench's window.hairline
 * (skills/hairline-create/bench.html) without the bench: no slider, no theme
 * switch, no captions. The host is any element with data-hl-figure="<name>";
 * inside it, [data-hl-stage] is drawn into and [data-hl-read] gets the
 * read-out. data-intensity sets the slider (0 to 1); data-play walks the
 * figure's tour until a hand arrives, and rests under reduced motion. Once
 * mounted, host.hairline.set(i) moves the slider.
 */
(() => {
  window.hairline = (figure) => {
    const host = document.querySelector(`[data-hl-figure="${figure.name}"]`);
    if (!host || host.dataset.hlMounted) return;
    host.dataset.hlMounted = "true";
    const stage = host.querySelector("[data-hl-stage]");
    const out = host.querySelector("[data-hl-read]");

    /* intensity to the figure's own number: two straight lines that meet at 0.5, as in the package */
    const [lo, mid, hi] = figure.range;
    const at = (i) => Math.round((i <= 0.5 ? lo + (i / 0.5) * (mid - lo) : mid + ((i - 0.5) / 0.5) * (hi - mid)) * 1000) / 1000;
    const raw = Number(host.dataset.intensity);
    const intensity = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.5;

    HL.inject(document);
    stage.setAttribute("data-hairline", figure.name);
    stage.setAttribute("role", "img");
    stage.setAttribute("aria-label", host.dataset.label || figure.means);
    const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);

    let text = null;
    const read = {
      get textContent() { return text; },
      set textContent(value) {
        text = value == null ? "" : String(value);
        if (out) out.textContent = text;
      },
    };

    const handle = figure.mount({ stage, svg, read }, at(intensity));
    // The page may turn the figure's slider later: host.hairline.set(0..1).
    host.hairline = { set: (i) => handle.set(at(Math.min(1, Math.max(0, i)))) };
    if (text === null) read.textContent = "rest";
    if (host.hasAttribute("data-play")) HL.tour(stage, figure.tour || HL.LAP);
    host.dispatchEvent(new CustomEvent("hairline:ready", { bubbles: true }));
  };
})();
