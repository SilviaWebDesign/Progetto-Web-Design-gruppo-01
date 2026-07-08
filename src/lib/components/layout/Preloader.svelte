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
        {LABEL}<span class="preloader__dots" aria-hidden="true"></span>
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

  /* Three dots revealed one after another, then the cycle restarts.
     They never move: `steps()` just uncovers one more dot each tick. */
  .preloader__dots {
    display: inline-block;
    /* empty inline-block: its bottom edge lands on the text baseline,
       so the dots rest on the same line as the label, like an ellipsis */
    vertical-align: baseline;
    width: 1.4em; /* holds three dots: wider cells = more space between them */
    aspect-ratio: 5.5; /* higher = smaller dots, so the gaps read wider */
    margin-left: 0.18em;
    background: radial-gradient(circle closest-side, currentColor 90%, transparent) 0 / calc(100% / 3)
      100% space;
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
    background: color-mix(in srgb, var(--color-text-primary) 15%, transparent);
  }
  .preloader__fill {
    height: 100%;
    border-radius: 999px;
    background: var(--color-text-primary);
    transition: width 0.25s ease;
  }
  .preloader__pct {
    margin: 0;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
  }
</style>