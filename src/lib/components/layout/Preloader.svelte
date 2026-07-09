<script lang="ts">
  import { fade } from 'svelte/transition';

  interface Props {
    progress: number; // 0..1
    visible: boolean;
  }
  let { progress, visible }: Props = $props();

  const LABEL = 'Caricamento in corso';
  const MIN_RAMP_MS = 900;
  const CATCHUP_FACTOR = 0.22;
  const MIN_STEP = 0.006;
  let animatedProgress = $state(0);
  let rampStart = $state(0);
  let rafId = 0;

  let targetProgress = $derived(clamp01(progress));
  let pct = $derived(Math.round(clamp01(animatedProgress) * 100));
  function clamp01(v: number) {
    return Math.min(1, Math.max(0, v));
  }

  function step() {
    if (!visible) return;
    const elapsed = clamp01((performance.now() - rampStart) / MIN_RAMP_MS);
    const floorProgress = elapsed;
    const desired = Math.max(floorProgress, targetProgress);
    const delta = desired - animatedProgress;
    const next =
      delta <= 0 ? animatedProgress : Math.min(desired, animatedProgress + Math.max(MIN_STEP, delta * CATCHUP_FACTOR));
    animatedProgress = clamp01(next);
    rafId = requestAnimationFrame(step);
  }

  $effect(() => {
    if (!visible) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      return;
    }

    if (rafId) cancelAnimationFrame(rafId);
    animatedProgress = 0;
    rampStart = performance.now();
    rafId = requestAnimationFrame(step);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };
  });
</script>

{#if visible}
  <div class="preloader" role="status" aria-live="polite" transition:fade={{ duration: 400 }}>
    <div class="preloader__inner">
      <p class="preloader__msg">
        {LABEL}<span class="preloader__dots" aria-hidden="true">...</span>
      </p>
      <div class="preloader__bar">
        <div class="preloader__fill" style="width: {pct}%"></div>
      </div>
      <p class="preloader__pct">{pct}%</p>
    </div>
  </div>
{/if}

<style>
  .preloader {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--page-gutter);
    background: var(--color-background-page);
    color: var(--color-text-primary);
  }
  .preloader__inner {
    width: min(520px, 86vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    text-align: center;
  }
  .preloader__msg {
    margin: 0;
    min-height: 1.4em;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-lg);
  }

  /* Three typographic dots (real "." glyphs, so they match the label's font)
     revealed one after another like a growing ellipsis, then the cycle restarts.
     They never move: `steps()` just uncovers one more dot each tick. */
  .preloader__dots {
    display: inline-block;
    vertical-align: baseline;
    /* keep the three dots together and reserve their width (no reflow while hidden) */
    white-space: pre;
    clip-path: inset(0 100% 0 0);
    animation: preloader-dots 0.9s steps(4) infinite; /* lower = faster */
  }

  @keyframes preloader-dots {
    to {
      clip-path: inset(0 -34% 0 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .preloader__dots {
      animation: none;
      clip-path: none;
      opacity: 0.55;
    }
  }

  
  .preloader__bar {
    width: 100%;
    height: 3px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--neutral-200); /* Figma: light track */
  }
  .preloader__fill {
    height: 100%;
    border-radius: 999px;
    background: var(--neutral-900); /* Figma: filled portion */
    transition: width 0.25s ease;
  }
  .preloader__pct {
    margin: 0;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
  }

  /* ── Mobile (≤768px): Figma — bar ~258px (scalable), label ~16px bold. ── */
  @media (max-width: 768px) {
    .preloader__inner {
      width: min(258px, 80vw); /* ~258px bar, shrinks on narrow screens */
    }

    .preloader__msg {
      font-size: var(--font-size-sm); /* ~16px (was 20px) */
    }
  }
</style>