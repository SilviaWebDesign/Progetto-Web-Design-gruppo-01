<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import SectionTitle from '$lib/components/section/SectionTitle.svelte';
  import { getSectionById } from '$lib/data/sections';

  const section = getSectionById('infrastructure')!;

  let scrollArea = $state<HTMLDivElement | null>(null);
  let titleWrap = $state<HTMLDivElement | null>(null);
  let frostLayer = $state<HTMLDivElement | null>(null);
  let phraseEl = $state<HTMLParagraphElement | null>(null);

  onMount(() => {
    if (!scrollArea || !titleWrap || !frostLayer || !phraseEl) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollArea,
          start: 'top top',
          end: () => `+=${window.innerHeight * 3}`,
          scrub: true
        }
      });

      /* --- Phase 1 (0 → 0.3): title stretches & fades, frost fades out --- */
      tl.fromTo(
        titleWrap,
        { scaleY: 1, yPercent: 0, opacity: 1 },
        { scaleY: 2.2, yPercent: -120, opacity: 0, ease: 'power3.inOut' },
        0
      );
      tl.fromTo(
        frostLayer,
        { opacity: 1 },
        { opacity: 0, ease: 'power2.inOut' },
        0
      );

      /* --- Phase 2 (0.35 → 0.6): phrase fades/rises in --- */
      tl.fromTo(
        phraseEl,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, ease: 'power2.out' },
        0.35
      );

      /* --- Phase 3 (0.7 → 1): phrase fades/rises out --- */
      tl.to(
        phraseEl,
        { opacity: 0, y: -40, ease: 'power2.in' },
        0.7
      );
    }, scrollArea);

    return () => ctx.revert();
  });
</script>


<div class="scroll-area" bind:this={scrollArea}>
  <div class="scene">
    <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

    <div class="layer layer--frost" bind:this={frostLayer}>
      <FrostCanvas src={section.frostImage} />
    </div>

    <div class="hero-title" bind:this={titleWrap}>
      <SectionTitle id={section.id} title={section.title} />
    </div>

   <!-- Narrative phrase: outer wrapper positions/centers it,
         inner <p> is the element GSAP animates. -->
    <div class="phrase-anchor">
      <p class="phrase" bind:this={phraseEl}>{section.description}</p>
    </div>
  </div>
</div>


<style>
  .scroll-area {
    height: 500vh;
    position: relative;
  }

  .scene {
    position: sticky;
    top: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #ffffff;
  }

  .layer { position: absolute; inset: 0; }

  .layer--bg {
    z-index: 1;
    background-size: cover;
    background-position: center;
    opacity: 0.28;
    pointer-events: none;
  }

  .layer--frost { z-index: 2; overflow: hidden; }

  .hero-title {
    position: absolute;
    z-index: 3;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    transform-origin: bottom center;
    pointer-events: none;
    will-change: transform, opacity;
  }

 /* Outer wrapper: anchored to the bottom with a scalable 80px margin
     (5.29vw @ 1512px), respecting the side gutters too. */
  .phrase-anchor {
    position: absolute;
    z-index: 4;
    left: 0;
    right: 0;
    bottom: 5.29vw;       /* 80px @ 1512px, scales like the rest */

    padding: 0 5.29vw;    /* side margins 80px @ 1512px */
    box-sizing: border-box;

    pointer-events: none;
  }

  /* Inner phrase: GSAP animates this. Everything scales with the
     viewport width, calibrated to the Figma values on a 1512px screen:
     width 1349px, height 450px, font 68px → all expressed in vw so the
     composition looks identical at any screen size. */
  .phrase {
    width: 100%;
    max-width: 89.22vw;   /* 1349px @ 1512px */
    height: 29.76vw;      /* 450px  @ 1512px */
    margin: 0;

    display: flex;
    align-items: center;  /* center text block within the fixed-ratio height */

    text-align: left;

    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: 4.5vw;     /* 68px @ 1512px */
    line-height: var(--line-height-tight);
    letter-spacing: -0.01em;
    color: var(--color-text-primary);

    opacity: 0;
    will-change: transform, opacity;
  }
</style>