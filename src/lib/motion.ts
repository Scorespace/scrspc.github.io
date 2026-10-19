// GSAP, registered once for the landing page variations. The `hairline` ease
// is the curve Hairline figures use for discrete changes (.32, .72, 0, 1), so
// the page and the figure on it move on the same clock.
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(CustomEase, ScrambleTextPlugin, ScrollTrigger, SplitText);
CustomEase.create('hairline', '.32,.72,0,1');
// Emil Kowalski's strong curves: ease-out for anything entering or answering
// the user, ease-in-out for things moving on screen.
CustomEase.create('out', '.23,1,.32,1');
CustomEase.create('inOut', '.77,0,.175,1');

export { gsap, ScrollTrigger, SplitText };

/**
 * Runs `setup` only when the reader has not asked for less motion. Elements
 * marked [data-reveal] are hidden by CSS until then; without motion they are
 * simply shown. Returns the matchMedia context, which reverts on change.
 */
export function onMotion(setup: () => void | (() => void)) {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.set('[data-reveal]', { visibility: 'visible' });
    return setup();
  });
  return mm;
}

/**
 * Like onMotion, with a gentler branch for readers who asked for less motion:
 * reduced motion means fewer, quieter animations (opacity only), not none.
 */
export function onMotionOr(full: () => void | (() => void), reduced: () => void | (() => void)) {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.set('[data-reveal]', { visibility: 'visible' });
    return full();
  });
  mm.add('(prefers-reduced-motion: reduce)', reduced);
  return mm;
}

/** Counts a number up into `el` once it scrolls into view. */
export function countUp(el: HTMLElement, to: number, format: (n: number) => string, delay = 0) {
  const state = { v: 0 };
  el.textContent = format(0);
  return gsap.to(state, {
    v: to,
    duration: 1.6,
    delay,
    ease: 'power3.out',
    onUpdate: () => {
      el.textContent = format(state.v);
    },
    scrollTrigger: { trigger: el, start: 'top bottom', once: true },
  });
}

/** A gentle pull toward the pointer, clamped to `max` px, for links and buttons. */
export function magnet(el: HTMLElement, max = 6) {
  const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
  const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    x(gsap.utils.clamp(-max, max, dx * max));
    y(gsap.utils.clamp(-max, max, dy * max));
  };
  const leave = () => {
    x(0);
    y(0);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
  };
}

export const formatThousands = (n: number) => Math.round(n).toLocaleString('en-US');
