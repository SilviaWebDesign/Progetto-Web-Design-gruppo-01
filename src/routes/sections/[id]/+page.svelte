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
  import TextBlock from '$lib/components/section/TextBlock.svelte';
  import CommentList from '$lib/components/section/CommentList.svelte';
  import type { PageData } from './$types';
  import { lenisStore } from '$lib/stores/scroll';
  import { get } from 'svelte/store';
  import { computeOpinionState } from '$lib/utils/result';
  import type { OpinionState } from '$lib/types';
  import { FEEDBACK_HEADING } from '$lib/data/feedback';
  import { goto } from '$app/navigation';
  import { progress, allSectionsCompleted, SECTION_ORDER } from '$lib/stores/progress';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let section = $derived(data.section);

  let scrollArea = $state<HTMLDivElement | null>(null);
  let titleWrap = $state<HTMLDivElement | null>(null);
  let stageTextEl = $state<HTMLDivElement | null>(null);
  let stageRightEl = $state<HTMLDivElement | null>(null);
  let frostLayer = $state<HTMLDivElement | null>(null);
  let phraseEl = $state<HTMLParagraphElement | null>(null);
  let scene3d = $state<Scene3DApi | undefined>(undefined);
  let currentTopic = $state(0);
  let topicLikes = $state<Record<string, boolean>[]>(
    section.topics.map(() => ({}))
  );
  let currentResult = $state<OpinionState | null>(null);

  type Phase = 'intro' | 'topics' | 'feedback';
  let phase = $state<Phase>('intro');


  let inTopicsMode = $derived(phase === 'topics');

  let inIntro = $derived(phase === 'intro');

  /* The currently displayed topic object. */
  let topic = $derived(section.topics[currentTopic]);

  /* "1 / 3" counter string. */
  let counter = $derived(`${currentTopic + 1} / ${section.topics.length}`);

/* True if at least one comment of the current topic is liked.
     Required to advance to the next topic. */
  let anyLiked = $derived(
    Object.values(topicLikes[currentTopic]).some(Boolean)
  );

  let feedbackBody = $derived(
    currentResult ? section.feedback[currentResult] : ''
  );

  function toggleLike(commentId: string) {
    const current = topicLikes[currentTopic];
    topicLikes[currentTopic] = { ...current, [commentId]: !current[commentId] };
  }

  function enterTopicsMode() {
    if (phase === 'topics') return;     
    phase = 'topics';
    get(lenisStore)?.stop();            // freeze native/smooth scroll
    scene3d?.settle();                  // 3D keeps spinning on its own
  }

  function exitTopicsMode() {
    if (phase !== 'topics') return;
    phase = 'intro';
    get(lenisStore)?.start();           // resume scrolling
    scene3d?.unsettle();
  }

  /* Guards against starting a new transition before the current
     one finishes (works together with the wheel lock). */
  let isTransitioning = false;


  function changeTopic(applyChange: () => void) {
    if (isTransitioning) return;
    if (!stageTextEl || !stageRightEl) {
      applyChange();
      return;
    }

    isTransitioning = true;
    const targets = [stageTextEl, stageRightEl];

    gsap
      .timeline({
        onComplete: () => {
          isTransitioning = false;
        }
      })
      .to(targets, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.in',
        onComplete: applyChange   // swap while invisible
      })
      .to(targets, {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out'
      });
  }

  function goNext() {
    if (!anyLiked) return;
    if (currentTopic < section.topics.length - 1) {
      changeTopic(() => { currentTopic += 1; });
    } else {
      enterFeedbackPhase();
    }
  }

  function goPrev() {
    if (currentTopic > 0) {
      changeTopic(() => { currentTopic -= 1; });
    } else {
      exitTopicsMode();
    }
  }

function enterFeedbackPhase() {
    if (phase !== 'topics' || !anyLiked) return;
    currentResult = computeOpinionState(section, topicLikes);
    progress.markCompleted(section.id, currentResult);   // record result
    phase = 'feedback';
    // (3D morph to the result model comes later, with particles)
  }

  function exitFeedbackPhase() {
    if (phase !== 'feedback') return;
    phase = 'topics';
    currentResult = null;
  }

  function goToNextSection() {
    const i = SECTION_ORDER.indexOf(section.id);
    const next = SECTION_ORDER[(i + 1) % SECTION_ORDER.length];
    goto(`/sections/${next}`);
  }

  function finishFeedback() {
    if (get(allSectionsCompleted)) {
      // goto('/results');   // results page — created in a later step
      console.log('All sections completed → results page (coming soon)');
    } else {
      goToNextSection();
    }
  }

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
          if (self.progress >= 0.999) enterTopicsMode();
        },
        onLeaveBack: () => exitTopicsMode()
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
   
/* ── Wheel navigation while in topics mode ── */
    let wheelLock = false;

    /* Scroll accumulation for leaving the feedback by scrolling down. */
    let feedbackAccum = 0;
    let feedbackResetTimer: ReturnType<typeof setTimeout> | null = null;
    const FEEDBACK_THRESHOLD = 450;       // px to scroll before advancing
    const FEEDBACK_RESET_MS = 220;        // idle gap that resets the accumulation

    function clearFeedbackAccum() {
      feedbackAccum = 0;
      if (feedbackResetTimer) {
        clearTimeout(feedbackResetTimer);
        feedbackResetTimer = null;
      }
    }

    function onWheel(e: WheelEvent) {
      if (phase === 'topics') {
        e.preventDefault();
        if (wheelLock) return;
        if (Math.abs(e.deltaY) < 10) return;

        wheelLock = true;
        if (e.deltaY > 0) goNext();
        else goPrev();
        setTimeout(() => { wheelLock = false; }, 1000);
        return;
      }

      if (phase === 'feedback') {
        e.preventDefault();

        // scroll up → back to topics
        if (e.deltaY < 0) {
          clearFeedbackAccum();
          exitFeedbackPhase();
          return;
        }

        // scroll down → accumulate until the threshold, then advance
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
  <div class="scene">
    <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

    <div class="layer layer--frost" class:is-hidden={!inIntro} bind:this={frostLayer}>
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

    <div class="hero-title" class:is-hidden={!inIntro} bind:this={titleWrap}>
      <SectionTitle id={section.id} title={section.title} />
    </div>

    <div class="phrase-anchor" class:is-hidden={!inIntro}>
      <p class="phrase" bind:this={phraseEl}>{section.description}</p>
    </div>

  <!-- ── Topics stage: 3-column layout, shown in topics mode ── -->
    <div class="stage" class:is-visible={inTopicsMode}>
      <div class="stage__text" bind:this={stageTextEl}>
        <TextBlock
          {counter}
          title={topic.title}
          body={topic.description}
          sources={topic.sources}
        />
      </div>

      <div class="stage__center" aria-hidden="true"></div>

      <div class="stage__right" bind:this={stageRightEl}>
        <h2 class="stage__heading">Metti like alle opinioni con cui sei d'accordo</h2>
        <CommentList
          comments={topic.comments}
          sectionId={section.id}
          likes={topicLikes[currentTopic]}
          onToggleLike={toggleLike}
        />
      </div>
    </div>
    <!-- ── "Continua" CTA: advances to the next topic (needs a like) ── -->
    <button
      class="continue"
      class:is-visible={inTopicsMode}
      disabled={!anyLiked}
      onclick={goNext}
      aria-label="Continua al prossimo argomento"
    >
      <span class="continue__label">Continua</span>
      <svg class="continue__arrow" viewBox="0 0 24 12" fill="none" aria-hidden="true">
        <path
          d="M2 2l10 8 10-8"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    
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
            <path
              d="M2 2l10.5 6 10.5-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
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


  .layer--frost.is-hidden,
  .hero-title.is-hidden,
  .phrase-anchor.is-hidden {
    opacity: 0 !important;
    pointer-events: none;
  }

  /* ── Topics stage ── */
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
    justify-self: start;   /* hug the left gutter */
  }

  .stage__center {
    grid-column: 2;
  }

  .stage__right {
    grid-column: 3;
    justify-self: end;     /* hug the right gutter */

    width: 354px; 

    display: flex;
    flex-direction: column;
    gap: 1.26vw;           /* 19px @ 1512px */
    max-height: 100%;
  }

  .stage__heading {
    margin: 0;
    text-align: center;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: 0.73vw;     /* 11px @ 1512px */
    line-height: var(--line-height-tight);
    color: var(--color-text-primary);
  }

  /* ── "Continua" CTA ── */
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

    /* Hidden outside topics mode. */
    opacity: 0;
    pointer-events: none;
    transition: opacity 400ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  /* Shown in topics mode; dimmed until a like enables advancing. */
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
    height: 24px;
  }

  /* Gentle bounce, only when the CTA is active (can advance). */
  .continue.is-visible:not(:disabled) .continue__arrow {
    animation: continue-bounce 1.6s ease-in-out infinite;
  }

  /* ── Feedback overlay ── */
  .feedback {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;   /* let the 3D be orbited; children re-enable */
  }

  .feedback__heading {
    position: absolute;
    top: 8vh;
    left: 50%;
    transform: translateX(-50%);

    margin: 0;
    text-align: center;
    white-space: pre-line;   /* renders the \n as a line break */

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
    font-weight: var(--font-weight-medium);
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

    pointer-events: auto;   /* CTA is clickable */
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

  @media (prefers-reduced-motion: reduce) {
    .feedback__cta-arrow { animation: none; }
  }

  @keyframes continue-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .continue__arrow { animation: none; }
  }


</style>