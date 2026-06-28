<!--
  ============================================================
  SECTION PAGE — [id] dynamic route
  ============================================================
  intro   — scroll-driven: frost + title + phrase + 3D
  topics  — model settled into particles; wheel navigates topics
  feedback— particles morph into the result model; overlay + blur

  Card stagger fires only on entering topics (first topic) and
  leaving towards feedback (last topic). Intermediate changes use
  a coordinated directional crossfade.
  ============================================================
-->

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import SectionTitle from '$lib/components/section/SectionTitle.svelte';
  import Scene3D from '$lib/components/section/Scene3D.svelte';
  import type { Scene3DApi } from '$lib/components/section/Scene3D.svelte';
  import TextBlock from '$lib/components/section/TextBlock.svelte';
  import CardStack from '$lib/components/section/CardStack.svelte';
  import type { CardStackApi } from '$lib/components/section/CardStack.svelte';

  import { headerState, resetHeaderState } from '$lib/stores/header';
  import { lenisStore } from '$lib/stores/scroll';
  import { progress, allSectionsCompleted, SECTION_ORDER } from '$lib/stores/progress';
  import { computeOpinionState } from '$lib/utils/result';
  import { FEEDBACK_HEADING } from '$lib/data/feedback';
  import { get } from 'svelte/store';
  import type { OpinionState } from '$lib/types';
  import type { PageData } from './$types';
  import { overlayVisible } from '$lib/stores/pageTransition';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();
  let section = $derived(data.section);

  let scrollArea = $state<HTMLDivElement | null>(null);
  let sceneEl = $state<HTMLDivElement | null>(null);
  let titleWrap = $state<HTMLDivElement | null>(null);
  let frostLayer = $state<HTMLDivElement | null>(null);
  let phraseEl = $state<HTMLParagraphElement | null>(null);
  let scene3d = $state<Scene3DApi | undefined>(undefined);
  let cardStack = $state<CardStackApi | undefined>(undefined);

  let currentTopic = $state(0);
  let topicLikes = $state<Record<string, boolean>[]>(section.topics.map(() => ({})));
  let currentResult = $state<OpinionState | null>(null);
  let isTransitioning = $state(false);

  type Phase = 'intro' | 'topics' | 'feedback';
  let phase = $state<Phase>('intro');

  let inIntro = $derived(phase === 'intro');
  let lastTopic = $derived(section.topics.length - 1);
  let topic = $derived(section.topics[currentTopic]);
  let counter = $derived(`${currentTopic + 1} / ${section.topics.length}`);
  let anyLiked = $derived(Object.values(topicLikes[currentTopic]).some(Boolean));
  let feedbackBody = $derived(currentResult ? section.feedback[currentResult] : '');

  let resultPaths = $derived([
    `/models/${section.id}-positive.glb`,
    `/models/${section.id}-negative.glb`,
    `/models/${section.id}-more-positive.glb`,
    `/models/${section.id}-more-negative.glb`,
    `/models/${section.id}-neutral.glb`
  ]);

  function resultPathFor(state: OpinionState): string {
    const map: Record<OpinionState, string> = {
      ALL_POSITIVE: `/models/${section.id}-positive.glb`,
      ALL_NEGATIVE: `/models/${section.id}-negative.glb`,
      MOSTLY_POSITIVE: `/models/${section.id}-more-positive.glb`,
      MOSTLY_NEGATIVE: `/models/${section.id}-more-negative.glb`,
      NEUTRAL: `/models/${section.id}-neutral.glb`
    };
    return map[state];
  }

  function toggleLike(commentId: string) {
    const current = topicLikes[currentTopic];
    topicLikes[currentTopic] = { ...current, [commentId]: !current[commentId] };
    scene3d?.pulse();
  }

  function crossfadeTopic(direction: 1 | -1, applyChange: () => void): Promise<void> {
    return new Promise((resolve) => {
      const textTargets = '.stage__text, .stage__heading';
      const outY = direction === 1 ? -40 : 40;
      const inY = direction === 1 ? 40 : -40;

      const tl = gsap.timeline({ onComplete: resolve });

      // 1) fade the current content out
      tl.to([textTargets, '.card-stack__item'], {
        opacity: 0,
        y: outY,
        duration: 0.4,
        ease: 'power2.in'
      });

      // 2) swap the topic (new cards mount at opacity 0)
      tl.add(() => {
        applyChange();
      });

      // 3) after the DOM updates, place the new content and fade it in
      tl.add(async () => {
        await tick();
        gsap.set([textTargets, '.card-stack__item'], { opacity: 0, y: inY });
        gsap.to([textTargets, '.card-stack__item'], {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out'
        });
      });
    });
  }

  async function goNext() {
    if (!anyLiked || isTransitioning) return;
    if (currentTopic === lastTopic) {
      enterFeedbackPhase();
      return;
    }
    scene3d?.resetPulse();
    isTransitioning = true;
    await crossfadeTopic(1, () => {
      currentTopic += 1;
    });
    isTransitioning = false;
  }

  async function goPrev() {
    if (isTransitioning || currentTopic === 0) return;
    scene3d?.resetPulse();
    isTransitioning = true;
    await crossfadeTopic(-1, () => {
      currentTopic -= 1;
    });
    isTransitioning = false;
  }

  function enterTopicsMode() {
    if (phase !== 'intro') return;
    phase = 'topics';
    get(lenisStore)?.stop();
    scene3d?.settle();
    void tick().then(() => cardStack?.animateIn());
  }

  function exitTopicsMode() {
    if (phase !== 'topics') return;
    phase = 'intro';
    get(lenisStore)?.start();
    scene3d?.unsettle();
  }

  async function enterFeedbackPhase() {
    if (phase !== 'topics' || isTransitioning || !anyLiked) return;
    isTransitioning = true;

    const OUT = 0.5;
    gsap.to('.stage__text', { opacity: 0, y: -8, duration: OUT, ease: 'power3.inOut' });
    gsap.to('.stage__heading', { opacity: 0, duration: OUT * 0.6, ease: 'power3.inOut' });
    gsap.to('.continue', { opacity: 0, duration: OUT * 0.6, ease: 'power2.inOut' });
    await cardStack?.animateOut();

    const result = computeOpinionState(section, topicLikes);
    currentResult = result;
    progress.markCompleted(section.id, result);

    gsap.to('.layer--bg', { filter: 'blur(12px)', duration: 0.8, ease: 'power2.inOut' });

    scene3d?.morphToResult(resultPathFor(result), () => {
      phase = 'feedback';
      isTransitioning = false;
      void tick().then(() => {
        gsap.fromTo('.feedback__heading', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.fromTo('.feedback__body', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.15 });
        gsap.fromTo('.feedback__cta', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.25 });
      });
    });
  }

  async function exitFeedbackPhase() {
    if (phase !== 'feedback' || isTransitioning) return;
    isTransitioning = true;

    const OUT = 0.35;
    gsap.to('.feedback__heading', { opacity: 0, duration: OUT });
    gsap.to('.feedback__body', { opacity: 0, duration: OUT });
    gsap.to('.feedback__cta', { opacity: 0, duration: OUT });
    await new Promise<void>((r) => setTimeout(r, OUT * 1000));

    gsap.to('.layer--bg', { filter: 'none', duration: 0.6, ease: 'power2.inOut' });
    scene3d?.returnToParticles();
    currentResult = null;
    phase = 'topics';
    await tick();

    gsap.fromTo('.stage__text', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.inOut' });
    gsap.fromTo('.stage__heading', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power3.inOut', delay: 0.04 });
    await tick();
    await cardStack?.animateIn();
    gsap.to('.continue', { opacity: 1, duration: 0.3, delay: 0.1 });
    isTransitioning = false;
  }

async function goToNextSection() {
    get(lenisStore)?.start();
    overlayVisible.set(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    const i = SECTION_ORDER.indexOf(section.id);
    const next = SECTION_ORDER[(i + 1) % SECTION_ORDER.length];
    goto(`/sections/${next}`);
  }

  function finishFeedback() {
    if (get(allSectionsCompleted)) {
      console.log('All sections completed → results page (coming soon)');
    } else {
      goToNextSection();
    }
  }

  let modelLoaded = false;

  onMount(() => {
    if (!browser || !scrollArea || !titleWrap || !frostLayer || !phraseEl) return;
    
    // Reveal this section by fading out the navigation veil.
    if (get(overlayVisible)) {
      setTimeout(() => overlayVisible.set(false), 60);
    }

    history.scrollRestoration = 'manual';

    headerState.update((s) => ({ ...s, sectionTitle: section.title }));

    const ctx = gsap.context(() => {
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
      heroTl.fromTo(phraseEl, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out' }, 0.35);
      heroTl.to(phraseEl, { opacity: 0, y: -40, ease: 'power2.in' }, 0.7);

      const proxy = { rot: 0, scale: 1, appear: 0 };

      const threeTl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollArea,
          start: () => `top+=${window.innerHeight * 1.85} top`,
          end: 'bottom bottom',
          scrub: 1.2,
          onUpdate: (self) => {
            if (self.progress >= 0.999) enterTopicsMode();
          },
          onLeaveBack: () => exitTopicsMode()
        }
      });

      threeTl.fromTo(
        proxy,
        { appear: 0 },
        { appear: 1, duration: 0.12, onUpdate: () => scene3d?.setOpacity(proxy.appear) },
        0
      );
      threeTl.to(
        proxy,
        { rot: Math.PI * 2, ease: 'none', duration: 0.46, onUpdate: () => scene3d?.setRotationY(proxy.rot) },
        0.06
      );
      threeTl.to(
        proxy,
        { scale: 0.56, ease: 'power2.inOut', duration: 0.28, onUpdate: () => scene3d?.setScale(proxy.scale) },
        0.46
      );

      ScrollTrigger.create({
        trigger: scrollArea,
        start: () => `top+=${window.innerHeight * 0.5} top`,
        onEnter: () => headerState.update((s) => ({ ...s, showSection: true })),
        onLeaveBack: () => headerState.update((s) => ({ ...s, showSection: false }))
      });
    }, scrollArea);

    const windowLoaded = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    });
    windowLoaded.then(() => {
      ScrollTrigger.refresh();
      requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
      if ('requestIdleCallback' in window) {
        (
          window as Window & {
            requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
          }
        ).requestIdleCallback(() => scene3d?.preloadResultModels(), { timeout: 1000 });
      } else {
        setTimeout(() => scene3d?.preloadResultModels(), 2000);
      }
    });

    let wheelLock = false;
    let feedbackAccum = 0;
    let feedbackResetTimer: ReturnType<typeof setTimeout> | null = null;
    const FEEDBACK_THRESHOLD = 450;
    const FEEDBACK_RESET_MS = 700;

    function clearFeedbackAccum() {
      feedbackAccum = 0;
      if (feedbackResetTimer) {
        clearTimeout(feedbackResetTimer);
        feedbackResetTimer = null;
      }
    }

    function onWheel(e: WheelEvent) {
      if (phase === 'topics') {
        const goingDown = e.deltaY > 0;
        if (!goingDown && currentTopic === 0) {
          exitTopicsMode();
          return;
        }
        e.preventDefault();
        if (wheelLock || isTransitioning) return;
        if (Math.abs(e.deltaY) < 10) return;

        wheelLock = true;
        if (goingDown) goNext();
        else goPrev();
        setTimeout(() => {
          wheelLock = false;
        }, 1000);
        return;
      }

      if (phase === 'feedback') {
        e.preventDefault();
        if (isTransitioning) return;

        if (e.deltaY < 0) {
          clearFeedbackAccum();
          exitFeedbackPhase();
          return;
        }

        feedbackAccum += e.deltaY;
        if (feedbackResetTimer) clearTimeout(feedbackResetTimer);
        feedbackResetTimer = setTimeout(() => {
          feedbackAccum = 0;
          feedbackResetTimer = null;
        }, FEEDBACK_RESET_MS);

        if (feedbackAccum >= FEEDBACK_THRESHOLD) {
          clearFeedbackAccum();
          finishFeedback();
        }
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', onWheel);
      ctx.revert();
      resetHeaderState();
    };
  });
</script>

<svelte:head>
  <title>{section.title} — Quante facce ha una medaglia?</title>
</svelte:head>


<div class="scroll-area" bind:this={scrollArea}>
  <div class="scene" bind:this={sceneEl}>
    <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

    <div class="layer layer--frost" class:is-hidden={!inIntro} bind:this={frostLayer}>
      <FrostCanvas src={section.frostImage} />
    </div>

    <div class="layer layer--model">
      <Scene3D
        modelSrc={section.glbPath}
        fitFactor={section.modelFitFactor}
        resultPaths={resultPaths}
        orbitEnabled={phase === 'feedback'}
        onModelLoaded={() => (modelLoaded = true)}
        bind:api={scene3d}
      />
    </div>

    <div class="hero-title" class:is-hidden={!inIntro} bind:this={titleWrap}>
      <SectionTitle id={section.id} title={section.title} />
    </div>

    <div class="phrase-anchor" class:is-hidden={!inIntro}>
      <p class="phrase" bind:this={phraseEl}>{section.description}</p>
    </div>

    <!-- ── Topics stage ── -->
    <div class="stage" class:is-visible={phase === 'topics'}>
      <div class="stage__text">
        <TextBlock {counter} title={topic.title} body={topic.description} sources={topic.sources} />
      </div>

      <div class="stage__center" aria-hidden="true"></div>

      <div class="stage__right" class:no-pointer={phase !== 'topics'}>
        <h2 class="stage__heading">Metti like alle opinioni con cui sei d'accordo</h2>
        <CardStack
          bind:api={cardStack}
          comments={topic.comments}
          sectionId={section.id}
          likes={topicLikes[currentTopic]}
          onToggleLike={toggleLike}
          topicId={topic.id}
        />
      </div>
    </div>

    <!-- ── "Continua" CTA ── -->
    <button
      class="continue"
      class:is-visible={phase === 'topics'}
      disabled={!anyLiked}
      onclick={goNext}
      aria-label="Continua al prossimo argomento"
    >
      <span class="continue__label">Continua</span>
      <svg class="continue__arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
        <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <!-- ── Feedback overlay ── -->
    {#if phase === 'feedback'}
      <div class="feedback">
        <p class="feedback__heading">{FEEDBACK_HEADING}</p>
        <p class="feedback__body">{feedbackBody}</p>
        <button
          class="feedback__cta"
          onclick={finishFeedback}
          aria-label={$allSectionsCompleted ? 'Scopri i tuoi risultati' : 'Passa al prossimo argomento'}
        >
          <span class="feedback__cta-label">
            {$allSectionsCompleted ? 'Scopri i tuoi risultati' : 'Passa al prossimo argomento'}
          </span>
          <svg class="feedback__cta-arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
            <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    {/if}
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

  .layer--frost.is-hidden,
  .hero-title.is-hidden,
  .phrase-anchor.is-hidden {
    opacity: 0 !important;
    pointer-events: none;
  }

  .stage {
    position: absolute;
    inset: 0;
    z-index: 6;
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    align-items: center;
    gap: var(--page-gutter);
    padding: 0 var(--page-gutter);
    box-sizing: border-box;
    opacity: 0;
    pointer-events: none;
    transition: opacity 600ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  .stage.is-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .stage__text {
    grid-column: 1;
    justify-self: start;
  }

  .stage__center {
    grid-column: 2;
  }

  .stage__right {
    grid-column: 3;
    justify-self: end;
    width: 354px;
    display: flex;
    flex-direction: column;
    gap: 19px;
    max-height: 100%;
  }

  .stage__right.no-pointer {
    pointer-events: none;
  }

  .stage__heading {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: 0.73vw;
    line-height: var(--line-height-tight);
    color: var(--color-text-primary);
  }

  .continue {
    position: absolute;
    z-index: 7;
    left: 50%;
    bottom: var(--page-gutter);
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2xs);
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-primary);
    opacity: 0;
    pointer-events: none;
    transition: opacity 400ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  .continue.is-visible {
    opacity: 0.35;
    pointer-events: auto;
  }

  .continue.is-visible:not(:disabled) {
    opacity: 1;
  }

  .continue:disabled {
    cursor: default;
  }

  .continue__label {
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
    color: inherit;
  }

  .continue__arrow {
    width: 25px;
    height: 10px;
  }

  .continue.is-visible:not(:disabled) .continue__arrow {
    animation: continue-bounce 1.6s ease-in-out infinite;
  }

  .feedback {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;
  }

  .feedback__heading {
    position: absolute;
    top: 8vh;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    text-align: center;
    white-space: pre-line;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: 36px;
    line-height: 1.25;
    color: var(--color-text-primary);
  }

  .feedback__body {
    position: absolute;
    bottom: 110px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    max-width: 840px;
    padding: 0 clamp(16px, 4vw, 48px);
    box-sizing: border-box;
    text-align: center;
    text-wrap: balance;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-regular);
    font-size: 24px;
    line-height: 1.5;
    color: var(--color-text-primary);
  }

  .feedback__cta {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2xs);
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-primary);
    pointer-events: auto;
  }

  .feedback__cta-label {
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-medium);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wide);
  }

  .feedback__cta-arrow {
    width: 25px;
    height: 10px;
    animation: continue-bounce 1.6s ease-in-out infinite;
  }

  @keyframes continue-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .continue__arrow,
    .feedback__cta-arrow {
      animation: none;
    }
  }
</style>