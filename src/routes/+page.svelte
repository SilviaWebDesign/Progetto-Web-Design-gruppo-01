<script lang="ts">
  import { onMount } from 'svelte';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { headerState } from '$lib/stores/header';
  import MountainScene from '$lib/components/3d/MountainScene.svelte';
  import SectionChoiceCard from '$lib/components/cards/SectionChoiceCard.svelte';
  import { sections } from '$lib/data/sections';

  // --- scroll math ---
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
    'Attraversa il percorso, tra',
    'sostenibilità, sport e infrastrutture,',
    'e prendi posizione davanti alle',
    'informazioni.'
  ];
  const TEXT3_LINES = [
    'Le tue scelte plasmeranno la realtà',
    'di Milano-Cortina 2026.'
  ];

  // Text snap anchors = prototype scroll positions (so the mountain lands right).
  // The hero zone (0 .. FREE_END) is FREE scroll; snapping starts at the texts.
  const TEXT_ANCHORS = [0.12, 0.34, 0.69, 0.95]; // text1, text2, text3, cards
  const FREE_END = TEXT_ANCHORS[0];
  const FREE_SENS = 0.0006; // hero free-scroll sensitivity (per wheel unit)
  const FREE_STEP = 0.03; // hero free-scroll step for arrow keys
  const FREE_SMOOTH = 0.06; // chase smoothing for the free hero scroll
  const DURATION_HERO = 800; // ms, title <-> first text (bounded, clean stop)
  const DURATION_TEXT = 1300; // ms, text-to-text (softer, bounded, clean stop)
  const SMOOTH_TEXT = 0.01; // glide for the text-to-text snaps (slower)
  const SNAP_COOLDOWN = 1100; // ms lock between text snaps
  const SNAP_THRESHOLD = 60; // wheel delta needed to trigger a snap (higher = less sensitive)
  const ACCUM_RESET_MS = 180; // reset the wheel accumulator after a scroll pause

  let scrollProgress = $state(0);
  let targetProgress = 0;
  let snapIndex = -1; // -1 = free hero zone; 0..3 = locked on a text anchor
  let snapLockUntil = 0;
  // bounded tween state for snaps (so the mountain stops exactly when a text lands)
  let tweening = false;
  let tweenFrom = 0;
  let tweenTo = 0;
  let tweenStart = 0;
  let tweenDuration = DURATION_TEXT;
  let wheelAccum = 0; // accumulated wheel delta toward the next snap
  let lastWheelTime = 0;
  let rafId = 0;

  // hero fully fades across its own free zone (0 -> 0 opacity at the first text)
  let heroOpacity = $derived(1 - easeOutCubic(clamp(scrollProgress / FREE_END, 0, 1)));
  let heroLift = $derived(easeOutCubic(clamp(scrollProgress / FREE_END, 0, 1)) * -8); // vh
  let text1Opacity = $derived(stageOpacity(scrollProgress, 0.06, 0.11, 0.13, 0.18));
  let text2Opacity = $derived(stageOpacity(scrollProgress, 0.28, 0.33, 0.35, 0.4));
  let text3Opacity = $derived(stageOpacity(scrollProgress, 0.58, 0.68, 0.7, 0.8));
  let cardsOpacity = $derived(easeOutCubic(rangeProgress(scrollProgress, 0.9, 0.95)));

  // reveal the global header once we reach the cards phase
  $effect(() => {
    const inCards = scrollProgress > 0.85;
    headerState.update((s) => ({ ...s, forceVisible: inCards }));
  });

  function startTween(to: number, duration: number) {
    tweenFrom = scrollProgress;
    tweenTo = to;
    tweenStart = performance.now();
    tweenDuration = duration;
    tweening = true;
  }

  function enterTextZone() {
    snapIndex = 0;
    startTween(TEXT_ANCHORS[0], DURATION_HERO); // title -> first text
    snapLockUntil = performance.now() + SNAP_COOLDOWN;
  }

  function advance(dir: number) {
    // free hero zone (arrow keys use a fixed step)
    if (snapIndex < 0) {
      tweening = false; // free chase mode
      targetProgress = clamp(targetProgress + dir * FREE_STEP, 0, FREE_END);
      if (targetProgress >= FREE_END) enterTextZone();
      return;
    }
    // text zone: one snap per gesture, cooldown-guarded
    if (performance.now() < snapLockUntil) return;
    if (dir > 0 && snapIndex < TEXT_ANCHORS.length - 1) {
      snapIndex += 1;
      startTween(TEXT_ANCHORS[snapIndex], DURATION_TEXT); // text-to-text
      snapLockUntil = performance.now() + SNAP_COOLDOWN;
    } else if (dir < 0) {
      if (snapIndex > 0) {
        snapIndex -= 1;
        startTween(TEXT_ANCHORS[snapIndex], DURATION_TEXT); // text-to-text
      } else {
        snapIndex = -1; // back into the free hero zone
        targetProgress = FREE_END - FREE_STEP;
        startTween(targetProgress, DURATION_HERO); // first text -> title
      }
      snapLockUntil = performance.now() + SNAP_COOLDOWN;
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const dir = Math.sign(e.deltaY);
    if (dir === 0) return;
    if (snapIndex < 0) {
      // free scroll: move the target by the wheel delta (clamped for mouse wheels)
      tweening = false; // free chase mode
      const d = clamp(e.deltaY, -80, 80);
      targetProgress = clamp(targetProgress + d * FREE_SENS, 0, FREE_END);
      if (targetProgress >= FREE_END) enterTextZone();
      return;
    }
    // text zone: require a deliberate scroll (threshold) before snapping,
    // so an accidental little scroll doesn't jump and you can recover.
    const now = performance.now();
    if (now - lastWheelTime > ACCUM_RESET_MS) wheelAccum = 0; // decay stale input
    lastWheelTime = now;
    if (now < snapLockUntil) {
      wheelAccum = 0; // ignore input during the cooldown
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
    // let links/buttons (section cards, header) behave normally
    const target = e.target as HTMLElement | null;
    if (target && target.closest('a, button')) return;
    // lower half = forward, upper half = back (experimental)
    const dir = e.clientY > window.innerHeight / 2 ? 1 : -1;
    if (snapIndex < 0) {
      if (dir > 0) enterTextZone(); // hero -> first text
      return;
    }
    if (dir < 0 && snapIndex === 0) {
      // clicking back from the first text returns fully to the hero
      if (performance.now() < snapLockUntil) return;
      snapIndex = -1;
      targetProgress = 0;
      startTween(0, DURATION_HERO);
      snapLockUntil = performance.now() + SNAP_COOLDOWN;
      return;
    }
    advance(dir);
  }

  function frame() {
    if (tweening) {
      // bounded eased snap: reaches the anchor and STOPS (mountain settles with it)
      const t = clamp((performance.now() - tweenStart) / tweenDuration, 0, 1);
      scrollProgress = tweenFrom + (tweenTo - tweenFrom) * easeOutCubic(t);
      if (t >= 1) {
        scrollProgress = tweenTo;
        tweening = false;
      }
    } else if (snapIndex < 0) {
      // free hero zone: smoothly chase the wheel-driven target
      scrollProgress += (targetProgress - scrollProgress) * FREE_SMOOTH;
      if (Math.abs(targetProgress - scrollProgress) < 0.0003) scrollProgress = targetProgress;
    }
    // else: locked on a text anchor -> nothing moves (mountain at rest)
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
    <div class="home__hero-inner">
      <p class="home__brand">Milano-Cortina 2026</p>
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
      <p class="home__cards-hint">Scegli una sezione per iniziare ad esplorare</p>
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
    margin: 0;
    transform: translateY(-25px); /* nudge the brand up, above the title */
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

  .home__cards-hint {
    position: absolute;
    top: calc(100% - 580px); /* ~100px below the cards, out of flow */
    left: 0;
    right: 0;
    margin: 0;
    text-align: center;
    font: var(--text-home-subtitle-font); /* bold 16px (body) */
    color: var(--color-text-primary);
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

  @keyframes home-bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
    60% { transform: translateY(-3px); }
  }
</style>