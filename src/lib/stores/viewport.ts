/* ============================================================
   VIEWPORT STATE (store)
   ============================================================
   Single source of truth for "are we on a mobile-sized viewport".

   Layout stays responsive via CSS `@media (max-width: 768px)` on the
   existing components. This store is ONLY for gating expensive JS
   (frost defrost, particle cursor physics, orbit, high pixelRatio…)
   so the desktop experience is never affected.
   ============================================================ */

import { readable } from 'svelte/store';
import { browser } from '$app/environment';

/** Mobile breakpoint in px. Keep in sync with the CSS `@media` queries. */
export const MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

/**
 * `true` when the viewport is mobile-sized. SSR-safe (defaults to `false`
 * on the server) and updates live on resize / orientation change.
 */
export const isMobile = readable(false, (set) => {
  if (!browser) return;
  const mq = window.matchMedia(QUERY);
  set(mq.matches);
  const onChange = (e: MediaQueryListEvent) => set(e.matches);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
});