/* ============================================================
   SMOOTH SCROLL (Lenis + GSAP ScrollTrigger)
   ============================================================
   Sets up Lenis for inertial smooth scrolling and wires it to
   GSAP's ScrollTrigger so scroll-driven animations stay in sync:
   - Lenis 'scroll' events update ScrollTrigger.
   - GSAP's ticker drives Lenis' RAF (one loop, perfectly synced).
   Returns the Lenis instance and a destroy() for cleanup.
   ============================================================ */

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface SmoothScroll {
  lenis: Lenis;
  destroy: () => void;
}

export function initSmoothScroll(): SmoothScroll {
  const lenis = new Lenis({
    lerp: 0.16, // higher = snappier, less glide (default ~0.1)
    wheelMultiplier: 0.8, // slightly less scroll momentum per wheel tick
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });

  /* 1. Keep ScrollTrigger in sync with Lenis' scroll position. */
  lenis.on('scroll', ScrollTrigger.update);

  /* 2. Drive Lenis from GSAP's ticker (single synced loop).
     GSAP gives time in seconds; Lenis wants milliseconds. */
  function tick(time: number) {
    lenis.raf(time * 1000);
  }
  gsap.ticker.add(tick);

  /* Avoid GSAP smoothing the ticker delta (Lenis handles smoothing). */
  gsap.ticker.lagSmoothing(0);

  function destroy() {
    gsap.ticker.remove(tick);
    lenis.off('scroll', ScrollTrigger.update);
    lenis.destroy();
  }

  return { lenis, destroy };
}