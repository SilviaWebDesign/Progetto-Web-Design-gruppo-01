<script lang="ts">
  import { onMount } from 'svelte';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import MountainScene from '$lib/components/3d/MountainScene.svelte';

  // --- scroll math (ported from the prototype's scrollStages) ---
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const rangeProgress = (p: number, s: number, e: number) =>
    p <= s ? 0 : p >= e ? 1 : (p - s) / (e - s);
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  function stageOpacity(p: number, inS: number, inE: number, outS: number, outE: number) {
    if (p < inS) return 0;
    if (p < inE) return easeOutCubic(rangeProgress(p, inS, inE));
    if (p < outS) return 1;
    if (p < outE) return 1 - easeOutCubic(rangeProgress(p, outS, outE));
    return 0;
  }

  // --- narrative content ---
  const TEXT1_LINES = [
    'La realtà non è unica e oggettiva,',
    'dipende dai fatti che osservi',
    'e dal punto di vista che scegli.'
  ];
  const TEXT2_LINES = [
    'Attraversa il percorso, tra sostenibilità,',
    'sport e infrastrutture, e prendi posizione',
    'davanti alle informazioni.'
  ];
  const TEXT3_LINES = [
    'Le tue scelte plasmeranno gli eroi',
    'e i cattivi di Milano-Cortina 2026.'
  ];

  // Snap anchors = the prototype's exact scroll positions, so the mountain
  // rotation (added in a later phase) lands correctly at each text.
  const ANCHORS = [0, 0.12, 0.34, 0.69, 0.95]; // hero, text1, text2, text3, cards
  const SNAP_DURATION = 900; // ms

  let scrollProgress = $state(0);
  let stageIndex = $state(0);
  let animating = false;

  // Opacities driven by scrollProgress (same curves/ranges as the prototype)
  let heroOpacity = $derived(Math.max(0, 1 - easeOutCubic(clamp(scrollProgress * 3.8, 0, 1))));
  let text1Opacity = $derived(stageOpacity(scrollProgress, 0.06, 0.11, 0.13, 0.18));
  let text2Opacity = $derived(stageOpacity(scrollProgress, 0.28, 0.33, 0.35, 0.4));
  let text3Opacity = $derived(stageOpacity(scrollProgress, 0.58, 0.68, 0.7, 0.8));
  let cardsOpacity = $derived(easeOutCubic(rangeProgress(scrollProgress, 0.9, 0.95)));

  function snapTo(index: number) {
    const target = clamp(index, 0, ANCHORS.length - 1);
    if (target === stageIndex || animating) return;
    stageIndex = target;
    const from = scrollProgress;
    const to = ANCHORS[target];
    const start = performance.now();
    animating = true;
    function step(now: number) {
      const t = clamp((now - start) / SNAP_DURATION, 0, 1);
      scrollProgress = from + (to - from) * easeOutCubic(t);
      if (t < 1) requestAnimationFrame(step);
      else animating = false;
    }
    requestAnimationFrame(step);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (animating) return;
    if (e.deltaY > 0) snapTo(stageIndex + 1);
    else if (e.deltaY < 0) snapTo(stageIndex - 1);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      snapTo(stageIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      snapTo(stageIndex - 1);
    }
  }

  onMount(() => {
    overlayVisible.set(false); // dissolve the navigation veil on arrival
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  });
</script>

<svelte:head>
  <title>Quante facce ha una medaglia?</title>
</svelte:head>

<div class="home">
  <!-- 3D mountain background, driven by scrollProgress -->
  <div class="home__bg" aria-hidden="true">
    <MountainScene {scrollProgress} />
  </div>

  <section class="home__stage home__hero" style="opacity: {heroOpacity}" aria-hidden={heroOpacity < 0.05}>
    <div class="home__hero-inner">
      <p class="home__brand">Milano-Cortina 2026</p>
      <h1 class="home__title">
        <span>Quante facce ha</span>
        <span>una medaglia?</span>
      </h1>
      <div class="home__hint">
        <span class="home__hint-arrow" aria-hidden="true">↓</span>
        <span class="home__hint-text">Scorri per continuare</span>
      </div>
    </div>
  </section>

  <section class="home__stage home__text" style="opacity: {text1Opacity}" aria-hidden={text1Opacity < 0.05}>
    <div class="home__lines">
      {#each TEXT1_LINES as line}<p class="home__line">{line}</p>{/each}
    </div>
  </section>

  <section class="home__stage home__text" style="opacity: {text2Opacity}" aria-hidden={text2Opacity < 0.05}>
    <div class="home__lines">
      {#each TEXT2_LINES as line}<p class="home__line">{line}</p>{/each}
    </div>
  </section>

  <section class="home__stage home__text home__text--center" style="opacity: {text3Opacity}" aria-hidden={text3Opacity < 0.05}>
    <div class="home__lines">
      {#each TEXT3_LINES as line}<p class="home__line">{line}</p>{/each}
    </div>
  </section>

  <section class="home__stage home__cards" style="opacity: {cardsOpacity}" aria-hidden={cardsOpacity < 0.05}>
    <p class="home__cards-placeholder">[ Card sezioni — Fase 2 ]</p>
  </section>
</div>

<style>
  .home {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  .home__bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: var(--color-background-page);
  }

  /* Every stage is a fixed full-screen layer; they cross-fade via opacity */
  .home__stage {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-sizing: border-box;
    padding: 110px 40px 52px; /* prototype hero padding (top/x/bottom) */
  }

  /* Hero: brand + title + hint anchored toward the bottom */
  .home__hero-inner {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .home__brand {
    margin: 0;
    font: var(--text-home-subtitle-font);
    color: var(--color-text-primary);
  }

  .home__title {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: var(--font-family-display);
    font-weight: var(--font-weight-black);
    /* hero element -> vw calibrated to 1512 (150px / 1512 * 100 = 9.92vw) */
    font-size: 9.92vw;
    line-height: var(--line-height-tight);
    text-transform: uppercase;
    color: var(--color-text-primary);
  }

  .home__hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3xs);
    color: var(--color-text-primary);
  }

  .home__hint-arrow {
    font-size: 1rem;
    animation: home-bounce 2s infinite;
  }

  .home__hint-text {
    font: var(--text-home-subtitle-font);
    font-weight: var(--font-weight-regular);
  }

  /* Narrative texts: bottom-aligned like the hero title (prototype positions) */
  .home__text .home__lines {
    margin-top: auto;
    margin-bottom: 5.25rem; /* prototype --hero-text-lift */
  }

  /* Third text is vertically centered (prototype center-stage--viewport) */
  .home__text--center {
    justify-content: center;
  }

  .home__text--center .home__lines {
    margin-top: 0;
    margin-bottom: 0;
  }

  .home__lines {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 1200px;
  }

  .home__line {
    margin: 0;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    /* hero element -> vw calibrated to 1512 (56px / 1512 * 100 = 3.70vw) */
    font-size: 3.7vw;
    line-height: var(--line-height-tight);
    color: var(--color-text-primary);
  }

  .home__cards {
    justify-content: center;
  }

  .home__cards-placeholder {
    margin: 0;
    font: var(--text-home-subtitle-font);
    color: var(--color-text-secondary);
  }

  @keyframes home-bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
    60% { transform: translateY(-3px); }
  }
</style>