<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import SectionTitle from '$lib/components/section/SectionTitle.svelte';
  import { getSectionById } from '$lib/data/sections';

  const section = getSectionById('infrastructure')!;

  /* Refs to the elements we animate on scroll. */
  let scrollArea = $state<HTMLDivElement | null>(null);
  let titleWrap = $state<HTMLDivElement | null>(null);

  onMount(() => {
    if (!scrollArea || !titleWrap) return;

    /* Build the scroll-driven timeline. */
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollArea,
          start: 'top top',
          end: () => `+=${window.innerHeight * 1.5}`,
          scrub: true
        }
      });

      /* Title stretches vertically and fades as you scroll. */
      tl.fromTo(
        titleWrap,
        { scaleY: 1, yPercent: 0, opacity: 1 },
        { scaleY: 2.2, yPercent: -120, opacity: 0, ease: 'power3.inOut' },
        0
      );
    }, scrollArea);

    return () => ctx.revert();
  });
</script>


<div class="scroll-area" bind:this={scrollArea}>
  <div class="scene">
    <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

    <div class="layer layer--frost">
      <FrostCanvas src={section.frostImage} />
    </div>

    <div class="hero-title" bind:this={titleWrap}>
      <SectionTitle id={section.id} title={section.title} />
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
</style>