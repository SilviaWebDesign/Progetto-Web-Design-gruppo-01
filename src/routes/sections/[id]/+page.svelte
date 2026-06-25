<!--
  ============================================================
  SECTION PAGE — [id] dynamic route
  ============================================================
  Serves all three sections from one template. Section data comes
  from +page.ts (validated against the URL [id]).

  This step builds the INTRO scene (scroll-driven):
  frost + chapter title (stretch/fade) + narrative phrase (in/out)
  + 3D model (appear / rotate 360° / shrink, then continuous spin).
  The topics stage and feedback come in later steps.
  ============================================================
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import SectionTitle from '$lib/components/section/SectionTitle.svelte';
  import Scene3D from '$lib/components/section/Scene3D.svelte';
  import type { Scene3DApi } from '$lib/components/section/Scene3D.svelte';
  import { headerState, resetHeaderState } from '$lib/stores/header';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let section = $derived(data.section);

  let scrollArea = $state<HTMLDivElement | null>(null);
  let titleWrap = $state<HTMLDivElement | null>(null);
  let frostLayer = $state<HTMLDivElement | null>(null);
  let phraseEl = $state<HTMLParagraphElement | null>(null);
  let scene3d = $state<Scene3DApi | undefined>(undefined);

  onMount(() => {
    if (!scrollArea || !titleWrap || !frostLayer || !phraseEl) return;

    headerState.update((s) => ({ ...s, sectionTitle: section.title }));

    const ctx = gsap.context(() => {
      /* ── Intro timeline: title + frost + phrase ── */
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollArea,
          start: 'top top',
          end: () => `+=${window.innerHeight * 1.5}`,
          scrub: 1.2
        }
      });

      heroTl.fromTo(
        titleWrap,
        { scaleY: 1, yPercent: 0, opacity: 1 },
        { scaleY: 2.2, yPercent: -120, opacity: 0, ease: 'power3.inOut' },
        0
      );
      heroTl.fromTo(frostLayer, { opacity: 1 }, { opacity: 0, ease: 'power2.inOut' }, 0);
      heroTl.fromTo(
        phraseEl,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, ease: 'power2.out' },
        0.35
      );
      heroTl.to(phraseEl, { opacity: 0, y: -40, ease: 'power2.in' }, 0.7);

      /* ── 3D timeline: appear → rotate 360° → shrink, then settle ── */
      const proxy = { rot: 0, scale: 1, appear: 0 };

      const threeTrigger: ScrollTrigger.Vars = {
        trigger: scrollArea,
        start: () => `top+=${window.innerHeight * 1.85} top`,
        end: 'bottom bottom',
        scrub: 1.2,
        onUpdate: (self) => {
          if (self.progress >= 0.999) scene3d?.settle();
        },
        onLeaveBack: () => scene3d?.unsettle()
      };

      const threeTl = gsap.timeline({ scrollTrigger: threeTrigger });

      threeTl.fromTo(
        proxy,
        { appear: 0 },
        { appear: 1, duration: 0.12, onUpdate: () => scene3d?.setOpacity(proxy.appear) },
        0
      );
      threeTl.to(
        proxy,
        {
          rot: Math.PI * 2,
          ease: 'none',
          duration: 0.46,
          onUpdate: () => scene3d?.setRotationY(proxy.rot)
        },
        0.06
      );
      threeTl.to(
        proxy,
        {
          scale: 0.56,
          ease: 'power2.inOut',
          duration: 0.28,
          onUpdate: () => scene3d?.setScale(proxy.scale)
        },
        0.46
      );

      /* Header section name once the title has scrolled away. */
      ScrollTrigger.create({
        trigger: scrollArea,
        start: () => `top+=${window.innerHeight * 0.5} top`,
        onEnter: () => headerState.update((s) => ({ ...s, showSection: true })),
        onLeaveBack: () => headerState.update((s) => ({ ...s, showSection: false }))
      });
    }, scrollArea);

    return () => {
      ctx.revert();
      resetHeaderState();
    };
  });
</script>


<svelte:head>
  <title>{section.title} — Quante facce ha una medaglia?</title>
</svelte:head>


<div class="scroll-area" bind:this={scrollArea}>
  <div class="scene">
    <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

    <div class="layer layer--frost" bind:this={frostLayer}>
      <FrostCanvas src={section.frostImage} />
    </div>

   <div class="layer layer--model">
      <Scene3D
        modelSrc={section.glbPath}
        fitFactor={section.modelFitFactor}
        autoRotate={false}
        bind:api={scene3d}
      />
    </div>

    <div class="hero-title" bind:this={titleWrap}>
      <SectionTitle id={section.id} title={section.title} />
    </div>

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
    background: var(--color-background-page);
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

  .layer--model {
    z-index: 3;
    pointer-events: none;
  }

  .hero-title {
    position: absolute;
    z-index: 4;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    transform-origin: bottom center;
    pointer-events: none;
    will-change: transform, opacity;
  }

  .phrase-anchor {
    position: absolute;
    z-index: 5;
    left: 0;
    right: 0;
    bottom: var(--page-gutter);
    padding: 0 var(--page-gutter);
    box-sizing: border-box;
    pointer-events: none;
  }

  .phrase {
    width: 100%;
    max-width: 89.22vw;
    height: 29.76vw;
    margin: 0;
    display: flex;
    align-items: center;
    text-align: left;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: 4.5vw;
    line-height: var(--line-height-tight);
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
    opacity: 0;
    will-change: transform, opacity;
  }
</style>