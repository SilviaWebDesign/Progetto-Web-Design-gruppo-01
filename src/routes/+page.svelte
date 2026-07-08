<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { headerState } from '$lib/stores/header';
  import MountainScene from '$lib/components/3d/MountainScene.svelte';
  import SectionChoiceCard from '$lib/components/cards/SectionChoiceCard.svelte';
  import Preloader from '$lib/components/layout/Preloader.svelte';
  import { sections } from '$lib/data/sections';
  import { preloadAssets } from '$lib/utils/preloadAssets';
  import { isMobile } from '$lib/stores/viewport';

  const PRELOAD_URLS = ['/models/snow-mountain.glb', ...sections.map((s) => s.glbPath)];
  const PRELOAD_MIN_MS = 1400; // minimum time the bar is shown (so it always fills)
  let preloadProgress = $state(0);
  let preloading = $state(true);
  let revealed = $state(false); // true one frame after preload ends -> enables fade-in
  let mountainReady = $state(false); // true after the mountain's first render

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const rangeProgress = (p: number, s: number, e: number) =>
    p <= s ? 0 : p >= e ? 1 : (p - s) / (e - s);
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
    'e prendi posizione davanti',
    'alle informazioni.'
  ];
  const TEXT3_LINES = [
    'Le tue scelte plasmeranno la realtà',
    'di Milano-Cortina 2026.'
  ];

  // Mobile line breaks (calibrated to the 390px Figma frame): the desktop breaks
  // are too wide for a phone, so we swap to shorter lines when `$isMobile`.
  const TEXT1_LINES_M = [
    'La realtà non è unica',
    'e oggettiva, dipende',
    'dai fatti che osservi e dal',
    'punto di vista che scegli.'
  ];
  const TEXT2_LINES_M = [
    'Attraversa il percorso,',
    'tra sostenibilità, sport',
    'e infrastrutture, e prendi',
    'posizione davanti',
    'alle informazioni.'
  ];
  const TEXT3_LINES_M = [
    'Le tue scelte',
    'plasmeranno la realtà di',
    'Milano-Cortina 2026.'
  ];

  // mountain scrollProgress at each stage (hero, text1, text2, text3, cards)
  const ANCHORS = [0, 0.12, 0.34, 0.69, 0.95];
  const LAST = ANCHORS.length - 1;

  // --- feel controls (tune these) ---
  const WHEEL_SENS = 0.0003; // slightly softer desktop wheel response
  const SMOOTH = 0.075; // lower chase factor = smoother camera/text motion
  const SNAP_IDLE_MS = 210; // wait a bit more before magnetic snap
  const GESTURE_GAP_MS = 140; // avoids premature "new gesture" resets
  const TOUCH_SENS = 0.00145; // mobile counterpart of WHEEL_SENS

  const WHITE_ZONE_AT = 0.66; // just inside the white zone, BEFORE the text-3 anchor (0.69)
  const TEXT3_FADE_MS = 900; // soft, time-based fade for the final text

  let scrollProgress = $state(0); // -> MountainScene + texts
  let text3Fade = $state(0); // 0..1 time-based opacity of the final text
  let target = 0; // where scrollProgress eases toward
  let gestureAnchor = 0; // anchor the current gesture may move ONE step from
  let lastWheel = 0;
  let snapTimer: ReturnType<typeof setTimeout> | null = null;
  let rafId = 0;

  // continuous cross-fade opacities from scrollProgress (prototype curves)
  let heroOpacity = $derived(1 - easeOutCubic(clamp(scrollProgress / ANCHORS[1], 0, 1)));
  let heroLift = $derived(easeOutCubic(clamp(scrollProgress / ANCHORS[1], 0, 1)) * -8); // vh
  let text1Opacity = $derived(stageOpacity(scrollProgress, 0.06, 0.11, 0.13, 0.18));
  let text2Opacity = $derived(stageOpacity(scrollProgress, 0.28, 0.33, 0.35, 0.4));
  // scroll-driven presence (like two versions ago) × a soft time-based fade-in
  let text3Opacity = $derived(stageOpacity(scrollProgress, 0.6, 0.68, 0.86, 0.94) * text3Fade);
  let cardsOpacity = $derived(easeOutCubic(rangeProgress(scrollProgress, 0.9, 0.95)));

  // show the final CTA while the last text is up (and cards not yet in)
  let showFinalCta = $derived(text3Opacity > 0.6 && cardsOpacity < 0.05);

  $effect(() => {
    // header appears from the first text onward (stays hidden only on the hero)
    headerState.update((s) => ({ ...s, forceVisible: scrollProgress > 0.06 }));
  });

  $effect(() => {
    // clicking the logo/Home link while already on "/" can't trigger a navigation
    // (same URL), so the Header calls this to reset the narrative to the start
    headerState.update((s) => ({
      ...s,
      onLogoClick: () => {
        gestureAnchor = 0;
        target = 0;
      }
    }));
  });

  // landing on "/#sections" jumps straight to the cards
  $effect(() => {
    if (page.url.hash === '#sections') {
      target = ANCHORS[LAST];
      scrollProgress = ANCHORS[LAST];
      gestureAnchor = LAST;
    }
  });

  function nearestAnchorIndex(p: number) {
    let best = 0;
    for (let i = 1; i < ANCHORS.length; i++) {
      if (Math.abs(ANCHORS[i] - p) < Math.abs(ANCHORS[best] - p)) best = i;
    }
    return best;
  }

  function scheduleSnap() {
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      target = ANCHORS[nearestAnchorIndex(target)]; // magnetic settle onto a text
    }, SNAP_IDLE_MS);
  }

  function onWheel(e: WheelEvent) {
    if (!revealed) return; // ignore input until the home is shown (no scroll-during-preload jump, #4)
    e.preventDefault();
    const now = performance.now();
    // a long-enough pause = "finger lifted" -> start a fresh gesture from here
    if (now - lastWheel > GESTURE_GAP_MS) gestureAnchor = nearestAnchorIndex(scrollProgress);
    lastWheel = now;

    // resistance: one gesture may move at most one anchor step (a "check-point")
    const lo = ANCHORS[Math.max(0, gestureAnchor - 1)];
    const hi = ANCHORS[Math.min(LAST, gestureAnchor + 1)];

    const d = clamp(e.deltaY, -65, 65);
    target = clamp(target + d * WHEEL_SENS, lo, hi);
    scheduleSnap();
  }

  function step(dir: number) {
    const i = clamp(nearestAnchorIndex(target) + dir, 0, LAST);
    gestureAnchor = i;
    target = ANCHORS[i];
  }

  function onKey(e: KeyboardEvent) {
    if (!revealed) return; // match onWheel: no navigation before the home is shown (#4)
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      step(-1);
    }
  }

  function goToCards() {
    gestureAnchor = LAST;
    target = ANCHORS[LAST];
  }

  // --- touch input: feeds the SAME engine as the wheel, so the mobile scroll
  //     feels identical to desktop — the finger just replaces the wheel. ---
  let lastTouchY = 0;
  let touchActive = false;

  function onTouchStart(e: TouchEvent) {
    if (!revealed || e.touches.length !== 1) return;
    touchActive = true;
    lastTouchY = e.touches[0].clientY;
    // a fresh finger press = a new gesture (mirrors the wheel gesture-gap reset)
    gestureAnchor = nearestAnchorIndex(scrollProgress);
  }

  function onTouchMove(e: TouchEvent) {
    if (!revealed || !touchActive || e.touches.length !== 1) return;
    e.preventDefault(); // we drive the engine ourselves: no native scroll / rubber-band
    const y = e.touches[0].clientY;
    const d = clamp(lastTouchY - y, -52, 52); // finger up = scroll down (matches wheel sign)
    lastTouchY = y;

    // same resistance as the wheel: one gesture moves at most one anchor step
    const lo = ANCHORS[Math.max(0, gestureAnchor - 1)];
    const hi = ANCHORS[Math.min(LAST, gestureAnchor + 1)];
    target = clamp(target + d * TOUCH_SENS, lo, hi);
    scheduleSnap();
  }

  function onTouchEnd() {
    touchActive = false;
    scheduleSnap(); // settle magnetically on release, like the wheel pause
  }

  let lastFrame = 0;

  function frame() {
    const now = performance.now();
    const dt = lastFrame ? now - lastFrame : 16;
    lastFrame = now;

    scrollProgress += (target - scrollProgress) * SMOOTH;
    if (Math.abs(target - scrollProgress) < 0.0002) scrollProgress = target;

    // soft fade-in once we've entered the white zone (so the text eases in
    // instead of popping); eases back out when we leave it
    const inWhiteZone = scrollProgress >= WHITE_ZONE_AT;
    const dir = inWhiteZone ? 1 : -1;
    text3Fade = clamp(text3Fade + (dir * dt) / TEXT3_FADE_MS, 0, 1);

    rafId = requestAnimationFrame(frame);
  }

  onMount(() => {
    overlayVisible.set(false);
    frame();
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    preloadProgress = 0;
    preloading = true;
    revealed = false;
    // animate the bar over at least PRELOAD_MIN_MS, and never faster than
    // the real download; whichever finishes last hides the overlay
    const start = performance.now();
    let realProgress = 0;
    const load = preloadAssets(PRELOAD_URLS, (p) => (realProgress = p));

    const tick = () => {
      const timed = clamp((performance.now() - start) / PRELOAD_MIN_MS, 0, 1);
      preloadProgress = Math.min(timed, Math.max(realProgress, timed * 0.15 + realProgress * 0.85));
      if (preloadProgress < 1) {
        requestAnimationFrame(tick);
      } else {
        preloading = false;
        requestAnimationFrame(() => (revealed = true));
      }
    };
    load.finally(() => {}); // ensure caching proceeds
    requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (snapTimer) clearTimeout(snapTimer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      headerState.update((s) => ({ ...s, forceVisible: false, onLogoClick: undefined }));
    };
  });
</script>

<svelte:head>
  <title>Quante facce ha una medaglia?</title>
</svelte:head>

<div class="home" class:is-revealed={revealed}>
  <!-- 3D mountain background, driven by scrollProgress -->
  <div class="home__bg" class:is-ready={mountainReady} aria-hidden="true">
    {#if !preloading}<MountainScene {scrollProgress} onReady={() => (mountainReady = true)} />{/if}
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
      {#each ($isMobile ? TEXT1_LINES_M : TEXT1_LINES) as line}<p class="home__line">{line}</p>{/each}
    </div>
  </section>

  <section class="home__stage home__text" style="opacity: {text2Opacity}" aria-hidden={text2Opacity < 0.05}>
    <div class="home__lines">
      {#each ($isMobile ? TEXT2_LINES_M : TEXT2_LINES) as line}<p class="home__line">{line}</p>{/each}
    </div>
  </section>

  <section class="home__stage home__text home__text--center" class:is-active={showFinalCta} style="opacity: {text3Opacity}" aria-hidden={text3Opacity < 0.05}>
    <div class="home__lines">
      {#each ($isMobile ? TEXT3_LINES_M : TEXT3_LINES) as line}<p class="home__line">{line}</p>{/each}
    </div>
    {#if showFinalCta}
      <button class="home__final-cta" onclick={goToCards} aria-label="Inizia il percorso">
        <span>Inizia il percorso</span>
        <svg class="home__hint-arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
          <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    {/if}
  </section>

  <section class="home__stage home__cards" class:is-active={cardsOpacity > 0.9} style="opacity: {cardsOpacity}" aria-hidden={cardsOpacity < 0.05}>
    <div class="home__cards-block">
      <div class="home__cards-grid">
        {#each sections as section (section.id)}
          <SectionChoiceCard {section} href={`/sections/${section.id}`} />
        {/each}
      </div>
    </div>
  </section>
</div>

<Preloader progress={preloadProgress} visible={preloading} />

<style>
  .home {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    touch-action: none; /* the finger drives our scroll engine, not native scroll */
  }

  .home__bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: var(--color-background-page);
    opacity: 0; /* revealed once the mountain's first frame is ready */
    transition: opacity 0.8s ease;
  }

  .home {
    opacity: 0;
    transition: opacity 0.8s ease;
  }

  .home.is-revealed {
    opacity: 1;
  }

  .home__bg.is-ready {
    opacity: 1;
  }

  /* Every stage is a fixed full-screen layer; they cross-fade via opacity */
  .home__stage {
    position: fixed;
    inset: 0;
    pointer-events: none;
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
    top: 10vh;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font: var(--text-home-subtitle-font);
    color: var(--color-text-primary);
  }

  @media (min-width: 769px) {
    .home__brand {
      font-size: 1.35rem;
      font-weight: var(--font-weight-bold);
    }
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
    line-height: var(--line-height-solid);
    text-transform: uppercase;
    color: var(--color-text-primary);
  }

  .home__hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2xs);
    color: var(--color-text-primary);
  }

 .home__hint-arrow {
    width: 25px;
    height: 10px;
    animation: home-cta-bounce 1.6s ease-in-out infinite;
  }

  @keyframes home-cta-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .home__hint-arrow {
      animation: none;
    }
  }

  .home__hint-text {
    font: var(--text-home-subtitle-font);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
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

  .home__stage.is-active {
    pointer-events: auto; /* cards clickable only when fully shown */
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

  @media (max-width: 1150px) {
    .home__cards-grid {
      grid-template-columns: 1fr;
      justify-content: center;
      justify-items: center;
      gap: clamp(10px, 2vh, 24px);
    }
  }

.home__final-cta {
    position: absolute;
    left: 50%;
    bottom: var(--cta-bottom); 
    transform: translateX(-50%);
    margin: 0;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2xs);
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-primary);
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    transition: transform 0.2s ease;
  }
  @media (hover: hover) {
    .home__final-cta:hover {
      transform: translateX(-50%) scale(1.08); /* keep centering while growing */
    }
  }

  /* ── Mobile (≤768px): typography calibrated so it matches the Figma sizes at the
     390px frame (56 / 20 / 24 / 10), while staying scalable. Desktop untouched. ── */
  @media (max-width: 768px) {
    .home__stage {
      padding: 88px var(--page-gutter) 40px;
    }

    .home__brand {
      top: 12vh;
      font-size: var(--font-size-section-topic-body-expanded); /* 20px @390 */
    }

    .home__title {
      font-size: var(--font-size-home-title); /* 56px @390 */
    }

    /* narrative blocks: readable size + vertically centered like the Figma */
    .home__text {
      justify-content: center;
    }
    .home__text .home__lines {
      margin-top: 0;
      margin-bottom: 0;
    }
    .home__line {
      font-size: var(--font-size-section-topic-title-compact); /* 24px @390 */
    }

    .home__hint-text,
    .home__final-cta {
      font: var(--text-caption-font);
      text-transform: var(--text-caption-text-transform);
    }

    .home__final-cta {
      -webkit-tap-highlight-color: transparent;
    }
  }
</style>