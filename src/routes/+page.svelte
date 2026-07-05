<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { headerState } from '$lib/stores/header';
  import MountainScene from '$lib/components/3d/MountainScene.svelte';
  import SectionChoiceCard from '$lib/components/cards/SectionChoiceCard.svelte';
  import { sections } from '$lib/data/sections';

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;

  // --- narrative content ---
  const TEXT1_LINES = [
    'La realtà non è unica e oggettiva,',
    'dipende dai fatti che osservi',
    'e dal punto di vista che scegli.'
  ];
  const TEXT2_LINES = [
    'Attraversa il percorso, tra',
    'sostenibilità, sport e infrastrutture,',
    'e prendi posizione davanti alle',
    'informazioni.'
  ];
  const TEXT3_LINES = [
    'Le tue scelte plasmeranno la realtà',
    'di Milano-Cortina 2026.'
  ];

  // mountain scrollProgress at each stage (hero, text1, text2, text3, cards)
  const STAGE_ANCHORS = [0, 0.12, 0.34, 0.69, 0.95];
  const LAST_STAGE = STAGE_ANCHORS.length - 1;

  // --- feel controls (tune these) ---
  const MOUNTAIN_SPEED = 0.00001; // mountain move speed (progress/ms) — LOWER = slower rotation
  const MOVE_MIN_MS = 1100; // shortest mountain move
  const MOVE_MAX_MS = 4500; // longest mountain move (the dive)
  const FADE_OUT_MS = 300; // text fade-out before the mountain moves
  const FADE_IN_MS = 550; // text fade-in after the mountain settles
  const SNAP_THRESHOLD = 60; // wheel delta to trigger a move (higher = less sensitive)
  const ACCUM_RESET_MS = 180; // reset wheel accumulator after a pause

  let scrollProgress = $state(STAGE_ANCHORS[0]); // -> MountainScene
  let stage = $state(0); // committed stage
  let visibleStage = $state(0); // which text is on screen
  let textOpacity = $state(1); // 0..1 for the visible text

  // transition state machine: idle -> out -> move -> in -> idle
  let phase: 'idle' | 'out' | 'move' | 'in' = 'idle';
  let phaseStart = 0;
  let fromStage = 0;
  let toStage = 0;
  let moveFrom = 0;
  let moveTo = 0;
  let moveDur = 0;

  let wheelAccum = 0;
  let lastWheelTime = 0;
  let rafId = 0;

  // per-stage opacities derived from the single visible text (no overlap)
  let heroOpacity = $derived(visibleStage === 0 ? textOpacity : 0);
  let heroLift = $derived(visibleStage === 0 ? (1 - textOpacity) * -8 : 0); // vh
  let text1Opacity = $derived(visibleStage === 1 ? textOpacity : 0);
  let text2Opacity = $derived(visibleStage === 2 ? textOpacity : 0);
  let text3Opacity = $derived(visibleStage === 3 ? textOpacity : 0);
  let cardsOpacity = $derived(visibleStage === 4 ? textOpacity : 0);

  // reveal the global header at the cards stage
  $effect(() => {
    headerState.update((s) => ({ ...s, forceVisible: stage === LAST_STAGE }));
  });

  // landing on "/#sections" (e.g. from the header logo) jumps straight to
  // the section-choice cards, skipping the intro narrative.
  $effect(() => {
    if (page.url.hash === '#sections') {
      stage = LAST_STAGE;
      visibleStage = LAST_STAGE;
      scrollProgress = STAGE_ANCHORS[LAST_STAGE];
      textOpacity = 1;
    }
  });

  function advance(dir: number) {
    if (phase !== 'idle') return; // one guided step at a time
    const to = clamp(stage + dir, 0, LAST_STAGE);
    if (to === stage) return;
    fromStage = stage;
    toStage = to;
    visibleStage = stage; // fade the current text out first
    phase = 'out';
    phaseStart = performance.now();
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const dir = Math.sign(e.deltaY);
    if (dir === 0) return;
    const now = performance.now();
    if (now - lastWheelTime > ACCUM_RESET_MS) wheelAccum = 0;
    lastWheelTime = now;
    if (phase !== 'idle') {
      wheelAccum = 0; // ignore input mid-transition
      return;
    }
    if (wheelAccum !== 0 && Math.sign(e.deltaY) !== Math.sign(wheelAccum)) wheelAccum = 0;
    wheelAccum += e.deltaY;
    if (Math.abs(wheelAccum) >= SNAP_THRESHOLD) {
      const d = Math.sign(wheelAccum);
      wheelAccum = 0;
      advance(d);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      advance(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      advance(-1);
    }
  }

  function onClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('a, button')) return; // let links/buttons work
    advance(e.clientY > window.innerHeight / 2 ? 1 : -1);
  }

  function frame() {
    const now = performance.now();
    if (phase === 'out') {
      const t = clamp((now - phaseStart) / FADE_OUT_MS, 0, 1);
      textOpacity = 1 - easeInOutSine(t);
      if (t >= 1) {
        textOpacity = 0;
        moveFrom = STAGE_ANCHORS[fromStage];
        moveTo = STAGE_ANCHORS[toStage];
        moveDur = clamp(Math.abs(moveTo - moveFrom) / MOUNTAIN_SPEED, MOVE_MIN_MS, MOVE_MAX_MS);
        phase = 'move';
        phaseStart = now;
      }
    } else if (phase === 'move') {
      const t = clamp((now - phaseStart) / moveDur, 0, 1);
      scrollProgress = moveFrom + (moveTo - moveFrom) * easeInOutSine(t);
      if (t >= 1) {
        scrollProgress = moveTo;
        stage = toStage;
        visibleStage = toStage;
        phase = 'in';
        phaseStart = now;
      }
    } else if (phase === 'in') {
      const t = clamp((now - phaseStart) / FADE_IN_MS, 0, 1);
      textOpacity = easeInOutSine(t);
      if (t >= 1) {
        textOpacity = 1;
        phase = 'idle';
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  onMount(() => {
    overlayVisible.set(false);
    frame();
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
      headerState.update((s) => ({ ...s, forceVisible: false }));
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

  <section class="home__stage home__hero" style="opacity: {heroOpacity}; transform: translateY({heroLift}vh);" aria-hidden={heroOpacity < 0.05}>
    <p class="home__brand">Milano-Cortina 2026</p>
    <div class="home__hero-inner">
      <h1 class="home__title">
        <span>Quante facce ha</span>
        <span>una medaglia?</span>
      </h1>
      <div class="home__hint">
        <span class="home__hint-text">Scorri per continuare</span>
        <svg class="home__hint-arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
          <path
            d="M2 2l10.5 6 10.5-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
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
    <div class="home__cards-block">
      <div class="home__cards-grid">
        {#each sections as section (section.id)}
          <SectionChoiceCard {section} href={`/sections/${section.id}`} />
        {/each}
      </div>
    </div>
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
    /* side padding = page gutter, so cards align with the header */
    padding: 110px var(--page-gutter) 52px;
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
    position: absolute;
    top: 8vh;
    left: 50%;
    transform: translateX(-50%);
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
    width: 25px;
    height: 10px;
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

  .home__cards-block {
    position: relative;
    width: 100%;
  }

  .home__cards-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 354px));
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-lg);
  }

  /* above 1375px: fixed 100px gap, cards grouped and centered */
  @media (min-width: 1375px) {
    .home__cards-grid {
      justify-content: center;
      gap: 100px;
    }
  }

</style>