<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { progress, SECTION_ORDER } from '$lib/stores/progress';
  import { sectionState } from '$lib/stores/sectionState';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { headerState } from '$lib/stores/header';
  import ModelViewer from '$lib/components/3d/ModelViewer.svelte';
  import MountainScene from '$lib/components/3d/MountainScene.svelte';
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

  onMount(() => {
    // keep the global header visible on this page (no real scroll to trigger it)
    headerState.update((s) => ({ ...s, forceVisible: true }));
    // Reveal the page by fading the navigation veil out
    const t = setTimeout(() => overlayVisible.set(false), 60);
    return () => {
      clearTimeout(t);
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

<div class="results">
  <div class="results__bg" aria-hidden="true">
    <MountainScene scrollProgress={RESULT_MOUNTAIN_PROGRESS} />
  </div>

  <div class="results__models">
    {#each models as model (model.id)}
      <div class="results__model">
        <ModelViewer src={model.src} fitFactor={model.fitFactor} />
      </div>
    {/each}
  </div>

  <p class="results__quote">
    La realtà non è mai unica e uguale per tutti.<br />
    Lo stesso evento può generare visioni differenti e soggettive, in base alle opinioni di ognuno.
  </p>

 <div class="results__ctas">
    <button class="results__cta results__cta--primary" type="button" onclick={goHome}>
      <span class="results__cta-label">Torna alla home</span>
      <svg class="results__cta-arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
        <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <button class="results__cta results__cta--secondary" type="button" onclick={goAbout}>
      <span class="results__cta-label">Scopri di più sul progetto</span>
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

  .results__cta:hover {
    transform: scale(1.05);
  }

  .results__cta:hover {
    opacity: 1;
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
</style>