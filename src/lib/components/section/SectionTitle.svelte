<!--
  ============================================================
  SECTION TITLE
  ============================================================
  The big chapter title at the bottom of a section's intro/frost
  scene. Three rendering modes, chosen per section (mirrors the
  prototype, where each mode was tuned to look perfect for its
  word):

  - 'svg'    (infrastructure): an SVG whose viewBox is fit to the
             real glyph box after fonts load. Scales as one block
             and sits flush with the bottom. Best for long words.
  - 'spread' (sport): letters in a flex row with space-between, so
             a short word stretches edge-to-edge.
  - 'center' (sustainability): a single line with a fixed-ish
             font-size formula and responsive letter-spacing.

  Mode is selected internally from the section id.
  ============================================================ -->

<script lang="ts">
  import { onMount } from 'svelte';
  import type { SectionId } from '$lib/types';

  interface Props {
    id: SectionId;
    title: string;
  }

  let { id, title }: Props = $props();

  type TitleMode = 'svg' | 'spread' | 'center';

  /* Per-section rendering mode (from the prototype's tuning). */
  const MODE: Record<SectionId, TitleMode> = {
    infrastructure: 'svg',
    sport: 'spread',
    sustainability: 'center'
  };

  let mode = $derived(MODE[id]);
  let upper = $derived(title.toUpperCase());
  let glyphs = $derived(upper.split(''));

  /* --- SVG mode refs + fitting (infrastructure) --- */
  let svgEl = $state<SVGSVGElement | null>(null);
  let textEl = $state<SVGTextElement | null>(null);

  function fitTitle() {
    if (!svgEl || !textEl) return;
    const bb = textEl.getBBox();
    const svgW = svgEl.getBoundingClientRect().width;
    const capH = -bb.y;
    const svgH = (svgW * capH) / bb.width;
    svgEl.setAttribute('height', String(Math.ceil(svgH)));
    svgEl.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${capH}`);
    svgEl.style.opacity = '1';
  }

  onMount(() => {
    if (mode !== 'svg') return;
    document.fonts.ready.then(fitTitle);
    window.addEventListener('resize', fitTitle);
    return () => window.removeEventListener('resize', fitTitle);
  });
</script>


{#if mode === 'svg'}
  <svg
    bind:this={svgEl}
    class="section-title section-title--svg"
    width="100%"
    preserveAspectRatio="xMidYMax meet"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label={title}
  >
    <text bind:this={textEl} class="section-title__svg-text" x="0" y="0">
      {upper}
    </text>
  </svg>

{:else if mode === 'spread'}
  <h1 class="section-title section-title--spread" aria-label={title}>
    {#each glyphs as glyph, i (i)}
      <span aria-hidden="true">{glyph}</span>
    {/each}
  </h1>

{:else}
  <h1
    class="section-title section-title--center"
    style="--title-chars: {upper.length}"
  >
    {upper}
  </h1>
{/if}


<style>
  .section-title {
    margin: 0;
    padding: 0;
    width: 100%;
    color: var(--color-text-primary);
    font-family: var(--font-family-display);
    font-weight: 700;
    font-variation-settings: 'wght' 700;
    user-select: none;
  }

  /* ── SVG mode (infrastructure) ── */
  .section-title--svg {
    display: block;
    line-height: 0;
    overflow: visible;
    opacity: 0; /* revealed by fitTitle() after fonts load */
  }

  .section-title__svg-text {
    font-family: var(--font-family-display);
    font-weight: 700;
    font-variation-settings: 'wght' 700;
    fill: var(--color-text-primary);
  }

  /* ── Spread mode (sport) ── */
 .section-title--spread {
    display: flex;
    justify-content: space-between;
    margin: 0 0 -0.06em;
    font-size: min(var(--unit-300), 22vw);
    font-weight: var(--font-weight-black);
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: var(--line-height-none);
    letter-spacing: var(--letter-spacing-none);
  }

  /* ── Center mode (sustainability) ── */
 .section-title--center {
    text-align: center;
    margin: 0 0 -0.06em;
    font-size: min(
      var(--unit-300),
      max(18vw, calc(100vw / (var(--title-chars, 12) * 0.44)))
    );
    font-weight: var(--font-weight-black);
    font-variation-settings: 'wght' 900;
    font-stretch: condensed;
    line-height: var(--line-height-none);
    letter-spacing: clamp(6px, 1.2vw, 18.2px);
  }

  /* Mobile: fit long words like "SOSTENIBILITÀ" to the device width — drop the
     18vw floor and shrink the large letter-spacing that was eating the width and
     clipping the word. Tune the 0.5 factor if it's a touch too small/large. */
  @media (max-width: 768px) {
    .section-title--center {
      font-size: min(4.25rem, calc(100vw / (var(--title-chars, 12) * 0.5)));
      letter-spacing: -0.01em;
    }
  }
</style>