/* ============================================================
   SMOOTH SCROLL (Lenis)
   ============================================================
   Sets up Lenis for inertial smooth scrolling and runs its
   animation loop. Returns the Lenis instance so callers can
   control it (e.g. stop/start) or hook GSAP ScrollTrigger to it
   later, plus a destroy() to clean up.
   ============================================================ */

import Lenis from 'lenis';

export interface SmoothScroll {
  lenis: Lenis;
  destroy: () => void;
}

/**
 * Initialise Lenis smooth scrolling.
 * Call once (e.g. in the root layout's onMount) in the browser.
 */
export function initSmoothScroll(): SmoothScroll {
  const lenis = new Lenis({
    /* Duration of the inertial glide (seconds). Higher = smoother/slower. */
    duration: 1.1,
    /* Easing curve for the glide. */
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    /* Smooth only vertical wheel scrolling. */
    smoothWheel: true
  });

  let rafId: number;

  /* Lenis must be ticked every frame to advance the scroll. */
  function raf(time: number) {
    lenis.raf(time);
    rafId = requestAnimationFrame(raf);
  }
  rafId = requestAnimationFrame(raf);

  function destroy() {
    cancelAnimationFrame(rafId);
    lenis.destroy();
  }

  return { lenis, destroy };
}