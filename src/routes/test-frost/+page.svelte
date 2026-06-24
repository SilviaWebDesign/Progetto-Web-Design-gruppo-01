<script lang="ts">
  import { onMount } from 'svelte';
  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import { getSectionById } from '$lib/data/sections';

  const section = getSectionById('infrastructure')!;

  /* Refs to the SVG title and its <text>, for the dynamic viewBox. */
  let titleEl = $state<SVGSVGElement | null>(null);
  let textEl = $state<SVGTextElement | null>(null);

  /**
   * Fit the SVG viewBox tightly to the glyphs so the text sits flush
   * with the bottom edge (no descender gap). Runs after fonts load.
   */
  function fitTitle() {
    if (!titleEl || !textEl) return;

    const bb = textEl.getBBox();                     // real glyph bounding box
    const svgW = titleEl.getBoundingClientRect().width;
    const capH = -bb.y;                              // height from glyph top to baseline
    const svgH = (svgW * capH) / bb.width;           // proportional height

    titleEl.setAttribute('height', String(Math.ceil(svgH)));
    titleEl.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${capH}`);
    titleEl.style.opacity = '1';                     // reveal once fitted
  }

  onMount(() => {
    /* Wait for the font to be ready, otherwise getBBox is wrong. */
    document.fonts.ready.then(fitTitle);

    /* Refit on resize (width changes → height must follow). */
    window.addEventListener('resize', fitTitle);
    return () => window.removeEventListener('resize', fitTitle);
  });
</script>


<main class="test-frost">
  <!-- Permanent blurred background photo -->
  <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

  <!-- Interactive frost -->
  <div class="layer layer--frost">
    <FrostCanvas src={section.frostImage} />
  </div>

  <!-- Chapter title, anchored to the bottom -->
  <svg
    bind:this={titleEl}
    class="hero-title"
    width="100%"
    preserveAspectRatio="xMidYMax meet"
    xmlns="http://www.w3.org/2000/svg"
  >
    <text bind:this={textEl} class="hero-title__text" x="0" y="0">
      {section.title.toUpperCase()}
    </text>
  </svg>
</main>


<style>
  .test-frost {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #ffffff;
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  .layer--bg {
    z-index: 1;
    background-size: cover;
    background-position: center;
    opacity: 0.28;
    pointer-events: none;
  }

  .layer--frost {
    z-index: 2;
    overflow: hidden;
  }

  /* ── Chapter title, flush with the bottom ── */
  .hero-title {
    display: block;
    position: absolute;
    z-index: 3;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    line-height: 0;
    margin: 0;
    padding: 0;
    overflow: visible;
    transform-origin: bottom center;
    pointer-events: none;
    user-select: none;
    will-change: transform, opacity;
    opacity: 0;  /* revealed by fitTitle() after fonts load */
  }

  .hero-title__text {
    font-family: var(--font-family-display);
    font-weight: 700;
    font-variation-settings: 'wght' 700;
    fill: var(--color-text-primary);
  }
</style>