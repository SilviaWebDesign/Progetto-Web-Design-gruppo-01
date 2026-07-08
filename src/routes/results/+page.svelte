<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { progress, SECTION_ORDER } from '$lib/stores/progress';
  import { sectionState } from '$lib/stores/sectionState';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { headerState } from '$lib/stores/header';
  import { isMobile } from '$lib/stores/viewport';
  import ModelViewer from '$lib/components/3d/ModelViewer.svelte';
  import MountainScene from '$lib/components/3d/MountainScene.svelte';
  import Preloader from '$lib/components/layout/Preloader.svelte';
  import { preloadAssets } from '$lib/utils/preloadAssets';
  import type { OpinionState, SectionId } from '$lib/types';

  // Fixed mountain view used as the page background (no whiteout in this range)
  const RESULT_MOUNTAIN_PROGRESS = 0.15;

  // Per-model fit factor, tuned by eye so the three read balanced
  const FIT_FACTOR: Record<SectionId, number> = {
    sustainability: 0.80,
    sport:  1.0,
    infrastructure: 0.98
  };

  // OpinionState -> model file variant (same scheme as the section page)
  const VARIANT: Record<OpinionState, string> = {
    ALL_POSITIVE: 'positive',
    ALL_NEGATIVE: 'negative',
    MOSTLY_POSITIVE: 'more-positive',
    MOSTLY_NEGATIVE: 'more-negative',
    NEUTRAL: 'neutral'
  };

  function resultModelPath(id: SectionId, state: OpinionState | undefined): string | null {
    return state ? `/models/${id}-${VARIANT[state]}.glb` : null;
  }

  // One entry per section, in canonical order, with its result model
  let models = $derived(
    SECTION_ORDER.map((id) => ({
      id,
      src: resultModelPath(id, $progress[id]),
      fitFactor: FIT_FACTOR[id]
    }))
  );

  // --- Loading gate: hold a preloader until the result models are ready ---
  const PRELOAD_MIN_MS = 900; // keep the screen up at least this long (no flash)
  let loadProgress = $state(0);
  let assetsReady = $state(false);
  let readyCount = 0;
  let minElapsed = false;

  function expectedModels() {
    return models.filter((m) => m.src).length;
  }
  function maybeReveal() {
    if (assetsReady) return;
    const expected = expectedModels();
    const barDone = loadProgress >= 1; // let the bar visibly reach 100%, like the home
    if (expected === 0 || (readyCount >= expected && minElapsed && barDone)) assetsReady = true;
  }
  function onModelReady() {
    readyCount += 1;
    maybeReveal();
  }

  onMount(() => {
    // keep the global header visible on this page (no real scroll to trigger it)
    headerState.update((s) => ({ ...s, forceVisible: true }));

    // Warm the cache for the result models (+ mountain bg) and drive the bar.
    const urls = [
      ...models.map((m) => m.src).filter((s): s is string => !!s),
      '/models/snow-mountain.glb'
    ];
    void preloadAssets(urls, (p) => {
      loadProgress = p;
      maybeReveal();
    });

    const minT = setTimeout(() => {
      minElapsed = true;
      maybeReveal();
    }, PRELOAD_MIN_MS);
    // Safety net: never trap the user behind the preloader.
    const maxT = setTimeout(() => (assetsReady = true), 8000);

    // Reveal the page by fading the navigation veil out
    const t = setTimeout(() => overlayVisible.set(false), 60);
    return () => {
      clearTimeout(t);
      clearTimeout(minT);
      clearTimeout(maxT);
      headerState.update((s) => ({ ...s, forceVisible: false }));
    };
  });

  async function goHome() {
    overlayVisible.set(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    progress.reset(); // clear per-section results
    sectionState.clear(); // clear resumable in-section state (phase/scroll/likes)
    goto('/');
  }

  // About page is not built yet — placeholder route for now
  async function goAbout() {
    overlayVisible.set(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    goto('/about');
  }
</script>

<svelte:head>
  <title>I tuoi risultati — Quante facce ha una medaglia?</title>
</svelte:head>

<Preloader progress={loadProgress} visible={!assetsReady} />

<div class="results">
  <div class="results__bg" aria-hidden="true">
    <MountainScene scrollProgress={RESULT_MOUNTAIN_PROGRESS} />
  </div>

  <div class="results__models">
    {#each models as model (model.id)}
      <div class="results__model">
        <ModelViewer src={model.src} fitFactor={model.fitFactor} onReady={onModelReady} />
      </div>
    {/each}
  </div>

  <p class="results__quote">
    {#if $isMobile}
      <!-- Figma mobile: shorter quote, broken over 4 lines (knobs = the <br/>) -->
      La realtà non è mai unica<br />
      e uguale per tutti.<br />
      Lo stesso evento può generare<br />
      visioni differenti e soggettive.
    {:else}
      La realtà non è mai unica e uguale per tutti.<br />
      Lo stesso evento può generare visioni differenti e soggettive, in base alle opinioni di ognuno.
    {/if}
  </p>

 <div class="results__ctas">
    <button class="results__cta results__cta--primary" type="button" onclick={goHome}>
      <span class="results__cta-label">Torna alla home</span>
      <svg class="results__cta-arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
        <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <button class="results__cta results__cta--secondary" type="button" onclick={goAbout}>
      <span class="results__cta-label">{$isMobile ? 'Scopri di più' : 'Scopri di più sul progetto'}</span>
      <svg class="results__cta-arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
        <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</div>

<style>
  .results {
    position: relative;
    min-height: 100dvh;
    background: var(--color-background-page);
    overflow: hidden;
  }

  .results__bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.9; 
    filter: blur(12px); /* b&w + same blur as the section feedback */
  }

  .results__models {
    position: fixed;
    left: 50%;
    top: 38%; /* lifted up */
    transform: translate(-50%, -50%);
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    width: min(1320px, 94vw);
    height: min(66vh, 720px);
    pointer-events: none;
  }

  .results__model {
    flex: 1;
    height: 100%;
    min-width: 0;
    pointer-events: auto;
  }

  .results__model:first-child {
    transform: translateX(3vw); /* nudge the plant toward the others, without resizing */
  }

  .results__quote {
    position: fixed;
    left: 50%;
    bottom: 240px;
    transform: translateX(-50%);
    z-index: 1;
    margin: 0;
    max-width: min(860px, 92vw);
    padding: 0 16px;
    text-align: center;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-medium);
    /* calibrated to 1512px (30/1512*100 = 1.98vw); shrinks on small windows */
    font-size: clamp(18px, 1.98vw, 30px);
    line-height: 1.35;
    color: var(--color-text-primary);
  }

  .results__ctas {
    position: fixed;
    left: 50%;
    bottom: var(--cta-bottom);
    transform: translateX(-50%);
    z-index: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
  }

  .results__cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2xs);
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    white-space: nowrap;
    color: var(--color-text-primary);
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    opacity: 0.7;
    transition: opacity 0.25s ease, transform 0.2s ease;
  }

  @media (hover: hover) {
    .results__cta:hover {
      transform: scale(1.05);
      opacity: 1;
    }
  }

  .results__cta-label {
    color: inherit;
    text-transform: uppercase;
  }

  .results__cta-arrow {
    width: 25px;
    height: 10px;
  }

  .results__cta--primary {
    font-weight: var(--font-weight-bold);
    opacity: 1;
  }

  .results__cta--primary .results__cta-arrow {
    transform: rotate(180deg);
  }

  .results__cta--secondary {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-bold);
    opacity: 1;
  }

  /* ── Mobile (≤768px): reflow the fixed desktop layout into one column — quote on
     top, the 3 result models stacked, CTAs in a row at the bottom. Desktop is
     untouched. Knobs (--results-*-m) let you fine-tune the spacing/size. ── */
  @media (max-width: 768px) {
    .results {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100dvh;         /* exactly one screen so the CTAs stay pinned + visible */
      /* bottom reserve clears the now-fixed CTA row (its height + --cta-bottom). */
      padding: var(--results-top-m, 96px) var(--page-gutter) var(--results-cta-reserve-m, 4.5rem);
      box-sizing: border-box;
    }

    .results__quote {
      order: -1;              /* DOM has the quote after the models; pull it on top */
      position: static;
      left: auto;
      bottom: auto;
      transform: none;
      max-width: 100%;
      padding: 0;
      font-size: clamp(1.1rem, 5.13vw, 1.35rem); /* 20px @390, scalable */
      line-height: 1.3;
    }

    .results__models {
      order: 0;
      position: static;
      left: auto;
      top: auto;
      transform: none;
      flex: 1;                /* fill the space between quote and CTAs */
      min-height: 0;
      flex-direction: column;
      width: 100%;
      height: auto;
      gap: var(--results-model-gap-m, var(--spacing-sm));
      margin: var(--results-models-margin-m, var(--spacing-md)) 0;
    }

    .results__model {
      flex: 1;                /* the 3 models split the column equally and always fit */
      min-height: 0;
      width: 100%;
    }

    .results__model:first-child {
      transform: none;        /* drop the desktop 3vw nudge */
    }

    .results__ctas {
      /* pinned exactly like the section CTAs (.continue): fixed at
         bottom: var(--cta-bottom), so results CTAs sit at the SAME height. */
      position: fixed;
      left: 0;
      right: 0;
      bottom: var(--cta-bottom);
      transform: none;
      width: 100%;
      justify-content: space-around;   /* the two CTAs spread like the Figma */
      gap: var(--spacing-md);
      z-index: 2;
    }

    /* CTA labels use the shared caption token, exactly like the section
       "Continua" CTA (--font-size-caption ≈ 13px @390), so they stay in sync. */
    .results__cta {
      font-size: var(--font-size-caption);
    }

    /* Figma shows both arrows pointing DOWN; desktop rotates the primary one. */
    .results__cta--primary .results__cta-arrow {
      transform: none;
    }
  }
</style>