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
  import { onMount, tick, untrack, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { afterNavigate, goto } from '$app/navigation';
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
  import { isMobile } from '$lib/stores/viewport';
  import { progress, allSectionsCompleted, SECTION_ORDER } from '$lib/stores/progress';
  import { computeOpinionState } from '$lib/utils/result';
  import { FEEDBACK_HEADING, FEEDBACK_HEADING_MOBILE } from '$lib/data/feedback';
  import { get } from 'svelte/store';
  import type { OpinionState } from '$lib/types';
  import type { PageData } from './$types';
  import { overlayVisible } from '$lib/stores/pageTransition';
  import { sectionState } from '$lib/stores/sectionState';
  import { homeDarkModeEnabled } from '$lib/stores/theme';

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();
  let section = $derived(data.section);

  const isHomeDarkMode = $derived($homeDarkModeEnabled);

  $effect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('theme-dark-sections', isHomeDarkMode);
  });

  onDestroy(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-dark-sections');
  });

  let scrollArea = $state<HTMLDivElement | null>(null);
  let sceneEl = $state<HTMLDivElement | null>(null);
  let titleWrap = $state<HTMLDivElement | null>(null);
  let frostLayer = $state<HTMLDivElement | null>(null);
  let phraseEl = $state<HTMLParagraphElement | null>(null);
  let scene3d = $state<Scene3DApi | undefined>(undefined);
  let cardStack = $state<CardStackApi | undefined>(undefined);
  // Mobile topics: false = mode A (expanded text, object below), true = mode B
  // (compact text + comments visible, object shrunk between them). Desktop ignores it.
  let mobileCardsVisible = $state(false);
  let textFading = false;
  let cardsScrollAnimating = false;
  let cardsScrollRef = $state<HTMLElement | null>(null);
  let stageTextEl = $state<HTMLElement | null>(null);
  let stageRightEl = $state<HTMLElement | null>(null);

  function cardsScrollAtBottom(): boolean {
    const el = cardsScrollRef;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  }

  function cardsScrollAtTop(): boolean {
    const el = cardsScrollRef;
    if (!el) return true;
    return el.scrollTop < 8;
  }

  let commentsAtScrollEnd = $state(true);

  // C3: custom vertical scrollbar (mobile mode B). Read-only indicator synced to
  // the comments scroll position; hidden when the list doesn't overflow.
  let scrollbarTrackEl = $state<HTMLElement | null>(null);
  let commentsThumbY = $state(0);
  let commentsScrollable = $state(false);

  function updateCommentsScrollbar() {
    const el = cardsScrollRef;
    const track = scrollbarTrackEl;
    if (!el || !track) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    commentsScrollable = maxScroll > 8;
    if (!commentsScrollable) { commentsThumbY = 0; return; }
    // thumb length lives in one place, the CSS knob --sb-thumb-len
    const thumbLen = parseFloat(getComputedStyle(track).getPropertyValue('--sb-thumb-len')) || 66;
    const travel = Math.max(0, track.clientHeight - thumbLen);
    commentsThumbY = (el.scrollTop / maxScroll) * travel;
  }

  function syncCommentsScrollMask() {
    commentsAtScrollEnd = cardsScrollAtBottom();
    updateCommentsScrollbar();
  }

  function onCommentsScroll() {
    syncCommentsScrollMask();
  }

  function finalizeMobileModeFit() {
    updateTopicsModelFit();
    scene3d?.setMobileFitLerp(0.12);
    requestAnimationFrame(() => {
      scene3d?.snapMobileFit();
      scene3d?.lockMobileFit();
    });
  }

  // Toggle mobile topics A/B: text crossfade + an eased model glide that
  // repositions/resizes the model from its start band to the destination band
  // (computed up-front, then interpolated — like the intro settle).
  // `applyChange` (optional) runs a topic change WHILE the text is faded out, so
  // "scroll up from topic N" can land on topic N-1 already in mode B with a SINGLE
  // crossfade (no mode-A flash / scattino). Without it, behaves exactly as before.
  async function setMobileCards(next: boolean, applyChange?: () => void) {
    if (next === mobileCardsVisible || textFading || cardsScrollAnimating) return;
    textFading = true;
    cardsScrollAnimating = true;

    const textTargets = '.stage__text';
    const cardTargets = '.card-stack__item';
    const fadeOutDuration = 0.4;
    const fadeInDuration = 0.5;
    // Shared by the model glide AND the text fade-in so they start/move in sync.
    const SETTLE_EASE = 'power2.inOut';
    const outY = next ? -40 : 40;
    const inY = next ? 40 : -40;

    // Capture where the model STARTS before we touch anything, and where its SCALE
    // must end (known immediately). The fit stays locked so nothing lerps on its own.
    scene3d?.lockMobileFit();
    const startBand = computeTopicsModelBand(mobileCardsVisible);
    const endScale = topicsScaleTarget(next);

    // Model SCALE glides across the WHOLE crossfade (fade-out + fade-in) starting
    // NOW, so the model reacts together with the text from t=0 (no delayed start /
    // "chasing"). Its POSITION is handled once we know the destination band (step 3).
    gsap.killTweensOf(topicsScaleTween);
    const scaleSettle = gsap.to(topicsScaleTween, {
      value: endScale,
      duration: fadeOutDuration + fadeInDuration,
      ease: SETTLE_EASE,
      onUpdate: () => scene3d?.setScale(topicsScaleTween.value)
    });

    // 1) Fade the current content out.
    if (next) {
      await gsap.to(textTargets, {
        opacity: 0,
        y: outY,
        duration: fadeOutDuration,
        ease: 'power2.in'
      });
      mobileCardsVisible = true;
      if (applyChange) {
        // topic changed while invisible → the previous topic lands fresh in mode B
        applyChange();
        if (cardsScrollRef) cardsScrollRef.scrollTop = 0;
        cardStack?.resetHidden();
      }
    } else {
      // B→A: same crossfade as topic change (no card slide-out).
      await gsap.to([textTargets, cardTargets], {
        opacity: 0,
        y: outY,
        duration: fadeOutDuration,
        ease: 'power2.in'
      });
      mobileCardsVisible = false;
      if (cardsScrollRef) cardsScrollRef.scrollTop = 0;
      cardStack?.resetHidden();
    }

    // 2) New mode's layout is in the DOM now (text at opacity 0, settled at y:0),
    //    so we can measure the exact DESTINATION band.
    gsap.set(textTargets, { y: 0, opacity: 0 });
    await tick();
    const endBand = computeTopicsModelBand(mobileCardsVisible);

    // 3) Model POSITION glides start→end over the fade-in (eased, fit kept locked so
    //    we drive spinner.y directly — no constant-rate lerp = no fast-start lunge).
    //    Shares fadeInDuration + SETTLE_EASE with the text so they move in lockstep.
    const settle = { t: 0 };
    gsap.killTweensOf(settle);
    const posSettle =
      startBand && endBand
        ? gsap.to(settle, {
            t: 1,
            duration: fadeInDuration,
            ease: SETTLE_EASE,
            onUpdate: () => {
              const k = settle.t;
              const topPx = startBand.topPx + (endBand.topPx - startBand.topPx) * k;
              const bottomPx = startBand.bottomPx + (endBand.bottomPx - startBand.bottomPx) * k;
              const centerBias =
                startBand.centerBias + (endBand.centerBias - startBand.centerBias) * k;
              scene3d?.setModelBaseYOffset(0);
              // fit is locked → setMobileFit snaps spinner.y to this interpolated band
              scene3d?.setMobileFit(topPx, bottomPx, {
                centerBias,
                viewportHeightPx: endBand.vh
              });
            }
          })
        : null;

    // 4) Fade the new content in, concurrently with the model glide.
    if (next) {
      gsap.set('.stage__right', { opacity: 0 });
      gsap.set(cardTargets, { opacity: 0, y: 0 });
      await Promise.all([
        scaleSettle,
        posSettle,
        gsap.to(textTargets, {
          opacity: 1,
          y: 0,
          duration: fadeInDuration,
          ease: SETTLE_EASE
        }),
        gsap.to('.stage__right', {
          opacity: 1,
          duration: fadeInDuration * 0.85,
          ease: 'power2.out'
        }),
        gsap.to(cardTargets, {
          opacity: 1,
          y: 0,
          duration: fadeInDuration,
          ease: 'power2.out',
          onComplete: syncCommentsScrollMask
        })
      ]);
    } else {
      gsap.set(textTargets, { y: inY });
      await Promise.all([
        scaleSettle,
        posSettle,
        gsap.to(textTargets, {
          opacity: 1,
          y: 0,
          duration: fadeInDuration,
          ease: SETTLE_EASE
        })
      ]);
    }

    finalizeMobileModeFit();
    textFading = false;
    cardsScrollAnimating = false;
    scheduleTopicsModelFit();
  }

  function resetMobileTopicLayout() {
    if (!$isMobile) return;
    mobileCardsVisible = false;
    if (cardsScrollRef) cardsScrollRef.scrollTop = 0;
    topicsScaleTween.value = topicsScaleTarget(false);
    scene3d?.setScale(topicsScaleTween.value);
  }

  // Mobile topics scroll nav: swipe toggles A↔B; swipe up in mode A goes to previous topic.
  function handleTopicsForwardNavigation() {
    if (wheelLock || isTransitioning || textFading || cardsScrollAnimating) return;
    if ($isMobile) {
      if (!mobileCardsVisible) setMobileCards(true);
      return;
    }
    wheelLock = true;
    goNext();
    setTimeout(() => { wheelLock = false; }, 1000);
  }

  function handleTopicsBackwardNavigation() {
    if (wheelLock || isTransitioning || textFading || cardsScrollAnimating) return;
    if ($isMobile) {
      if (mobileCardsVisible && cardsScrollAtTop()) {
        setMobileCards(false);
        return;
      }
      if (!mobileCardsVisible && currentTopic > 0) {
        wheelLock = true;
        // Error prevention: land on the previous topic already in mode B (its comments),
        // not in mode A. Single crossfade — the topic change happens inside
        // setMobileCards' fade-out, so there's no mode-A flash / scattino.
        void setMobileCards(true, () => {
          scene3d?.resetPulse();
          currentTopic -= 1;
        }).finally(() => {
          setTimeout(() => { wheelLock = false; }, 1000);
        });
        return;
      }
      if (!mobileCardsVisible && currentTopic === 0) {
        wheelLock = true;
        void exitTopicsToIntro().finally(() => {
          setTimeout(() => { wheelLock = false; }, 400);
        });
      }
      return;
    }
    if (currentTopic === 0) {
      wheelLock = true;
      void exitTopicsToIntro().finally(() => {
        setTimeout(() => { wheelLock = false; }, 400);
      });
      return;
    }
    wheelLock = true;
    goPrev();
    setTimeout(() => { wheelLock = false; }, 1000);
  }

  let currentTopic = $state(0);
  let topicLikes = $state<Record<string, boolean>[]>(
    untrack(() => section.topics.map(() => ({})))
  );
  let currentResult = $state<OpinionState | null>(null);
  let isTransitioning = $state(false);
  let wheelLock = false;
  // Set while goToSectionStart() rewinds to the intro, so the scroll-driven
  // auto-enter can't bounce us back into topics before we reach the top.
  let returningToStart = false;
  // True from the moment the morph starts, so the feedback texts are in the DOM and
  // morphToResult() can frame the model against the REAL box (no post-morph reframe
  // jump). Kept independent from `phase` so the overlay can be pre-mounted invisibly.
  let feedbackMounting = $state(false);
  /** Clears the reveal auto-complete timer on teardown. */
  let revealAutoCompleteCleanup: (() => void) | null = null;
  /** Blocks ScrollTrigger from re-entering topics during a programmatic rewind. */
  let suppressTopicsEnter = false;

  type Phase = 'intro' | 'topics' | 'feedback';
  let phase = $state<Phase>('intro');
  let restored = $state(false);

  // #8 — tell a reload apart from a fresh (re)entry.
  // resumeFromSave is true ONLY on a real page load / reload ('enter'); on menu
  // re-selection or "next section" navigation we always restart from the intro,
  // keeping any likes already given (they reappear when the user reaches topics).
  let resumeFromSave = $state(false);
  let navHandled = false;

  afterNavigate((nav) => {
    if (navHandled) return; // only react to the navigation that mounted us
    navHandled = true;

    const saved = sectionState.read(section.id);
    resumeFromSave = nav.type === 'enter';

    if (saved) {
      // Likes are always remembered, so the user sees them again.
      if (saved.topicLikes.length === section.topics.length) {
        topicLikes = saved.topicLikes;
      }
      // Phase / current topic / result come back only on a real reload.
      if (resumeFromSave) {
        currentTopic = saved.currentTopic;
        currentResult = saved.currentResult;
      }
    }
    restored = true;
  });

  const TOPICS_SCALE = 0.48;
  const INTRO_MODEL_SCALE = 0.85; // model size when it first appears (before shrinking to TOPICS_SCALE)
  const INTRO_MODEL_Y_OFFSET = -0.10; // model starts slightly lower, rises into place as it fades in
  const INTRO_PHRASE_BEAT = 0.75;
  const INTRO_SCROLL_COMMIT = 1.65;

  /** Reset the 3D scene to the pre-reveal intro baseline (hidden model, no particles). */
  function syncIntroSceneBaseline() {
    scene3d?.setTransitionProgress(0);
    scene3d?.setMobileLayoutBlend(0);
    scene3d?.setOpacity(0);
    scene3d?.setScale(INTRO_MODEL_SCALE);
    scene3d?.setPositionY(INTRO_MODEL_Y_OFFSET);
    scene3d?.setRotationY(0);
  }

  /** Clear GSAP inline state on the topics stage so a later re-entry can animate in cleanly. */
  function teardownTopicsStageForExit() {
    gsap.killTweensOf([
      '.stage__text',
      '.stage__heading',
      '.continue',
      '.card-stack__item'
    ]);
    cardStack?.resetHidden();
    gsap.set('.stage__text', { opacity: 0, y: 8 });
    if (!get(isMobile)) gsap.set('.stage__heading', { opacity: 0 });
    gsap.set(['.stage__text', '.stage__heading', '.card-stack__item'], {
      clearProps: 'opacity,transform'
    });
    gsap.set('.continue', { clearProps: 'opacity' });
  }

  // Mobile topics 3D fit: bottom third for the model in mode A; model anchored low in its band.
  const TOPICS_MODEL_MARGIN = 20;
  const MOBILE_MODEL_BOTTOM_MARGIN = 16;
  const MOBILE_MODEL_BAND_FRACTION = 1 / 3;
  const MOBILE_THEME_CENTER_BIAS = 0.4;
  const PARTICLE_SCROLL_START = 0.58;
  const PARTICLE_SCROLL_END = 0.98;
  const MOBILE_LAYOUT_START = 0.55;
  const MOBILE_TOPIC_COMPACT_RATIO = 24 / 36;
  const MOBILE_TEXT_SCALE_DURATION = 0.52;
  const MOBILE_LAYOUT_PULSE_AMPLITUDE = 0.14;
  const MOBILE_FIT_LERP_ANIMATING = 0.09;
  const MOBILE_MODE_B_MODEL_FRACTION = 0.30;
  const MOBILE_MODE_B_COMMENTS_FRACTION = 0.46;
  const MOBILE_MODE_B_MIN_MODEL_BAND = 64;
  /** Mode A: tree + crane read small at default scale on mobile. */
  const MOBILE_MODE_A_SCALE_MUL: Partial<Record<string, number>> = {
    sustainability: 1.14,
    infrastructure: 1.14
  };
  const topicsScaleTween = { value: TOPICS_SCALE };

  function sectionModeAScaleMul(): number {
    return MOBILE_MODE_A_SCALE_MUL[section.id] ?? 1;
  }

  function topicsEntryScale(): number {
    return TOPICS_SCALE * sectionModeAScaleMul();
  }

  function particleProgressFromScroll(scrollProgress: number): number {
    if (scrollProgress <= PARTICLE_SCROLL_START) return 0;
    return Math.min(
      1,
      (scrollProgress - PARTICLE_SCROLL_START) / (PARTICLE_SCROLL_END - PARTICLE_SCROLL_START)
    );
  }

  function topicsLayoutBlendFromParticleT(particleT: number): number {
    if (particleT <= MOBILE_LAYOUT_START) return 0;
    return Math.min(1, (particleT - MOBILE_LAYOUT_START) / (1 - MOBILE_LAYOUT_START));
  }

  function topicsScaleTarget(cardsMode: boolean): number {
    if (!get(isMobile)) return TOPICS_SCALE;
    let scale = TOPICS_SCALE;
    if (!cardsMode) scale *= sectionModeAScaleMul();
    else scale *= MOBILE_TOPIC_COMPACT_RATIO;
    return scale;
  }

  function applyTopicsScale(animate = false, cardsMode = mobileCardsVisible): Promise<void> {
    if (!scene3d || phase !== 'topics') return Promise.resolve();
    const target = topicsScaleTarget(cardsMode);
    gsap.killTweensOf(topicsScaleTween);
    if (animate && get(isMobile)) {
      scene3d.unlockMobileFit();
      scene3d.setMobileFitLerp(MOBILE_FIT_LERP_ANIMATING);
      scene3d.pulse(MOBILE_LAYOUT_PULSE_AMPLITUDE);
      return new Promise((resolve) => {
        gsap.to(topicsScaleTween, {
          value: target,
          duration: MOBILE_TEXT_SCALE_DURATION,
          ease: 'power2.inOut',
          onUpdate: () => {
            scene3d?.setScale(topicsScaleTween.value);
            updateTopicsModelFit({ soft: true });
          },
          onComplete: () => {
            updateTopicsModelFit();
            scene3d?.setMobileFitLerp(0.12);
            requestAnimationFrame(() => {
              scene3d?.snapMobileFit();
              scene3d?.lockMobileFit();
              resolve();
            });
          }
        });
      });
    }
    topicsScaleTween.value = target;
    scene3d.setScale(target);
    return Promise.resolve();
  }

  function updateTopicsScrollLayout(particleT: number) {
    if (!scene3d || !stageTextEl || phase === 'feedback' || !get(isMobile)) return;
    scene3d.unlockMobileFit();
    updateTopicsModelFit({ duringScroll: true });
    scene3d.setMobileLayoutBlend(topicsLayoutBlendFromParticleT(particleT));
    scene3d.snapMobileFit();
    if (particleT >= 1) scene3d.lockMobileFit();
  }

  function animateTopicsContentIn() {
    gsap.fromTo(
      '.stage__text',
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.inOut' }
    );
    if (!get(isMobile)) {
      gsap.fromTo(
        '.stage__heading',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power3.inOut', delay: 0.04 }
      );
    }
  }

  function mobileTopicsViewportHeightPx(): number {
    return sceneEl?.getBoundingClientRect().height ?? window.innerHeight;
  }

  function topicsCardsActive(): boolean {
    return $isMobile && mobileCardsVisible;
  }

  type ModelBand = { topPx: number; bottomPx: number; centerBias: number; vh: number };

  // Pure geometry: where the model band sits for a given mode (A = false, B = true).
  // Single source of truth so both the live fit and the A↔B glide agree.
  function computeTopicsModelBand(cardsActive: boolean): ModelBand | null {
    if (!scene3d || !stageTextEl) return null;
    const textRect = stageTextEl.getBoundingClientRect();
    const vh = mobileTopicsViewportHeightPx();
    let topPx: number;
    let bottomPx: number;
    let centerBias = MOBILE_THEME_CENTER_BIAS;

    if (cardsActive) {
      const cardsRect = stageRightEl?.getBoundingClientRect();
      const commentsTop =
        cardsRect && cardsRect.top > 0
          ? cardsRect.top
          : vh * (1 - MOBILE_MODE_B_COMMENTS_FRACTION);

      // Anchor the model band strictly between measured text bottom and comments top.
      topPx = textRect.bottom + TOPICS_MODEL_MARGIN;
      bottomPx = commentsTop - TOPICS_MODEL_MARGIN;

      const targetBand = vh * MOBILE_MODE_B_MODEL_FRACTION;
      if (bottomPx - topPx < targetBand) {
        bottomPx = Math.min(commentsTop - TOPICS_MODEL_MARGIN, topPx + targetBand);
      }
      if (bottomPx - topPx < MOBILE_MODE_B_MIN_MODEL_BAND) {
        bottomPx = Math.min(commentsTop - TOPICS_MODEL_MARGIN, topPx + MOBILE_MODE_B_MIN_MODEL_BAND);
      }

      centerBias = 0.5;
    } else {
      const modelBandTop = vh * (1 - MOBILE_MODEL_BAND_FRACTION);
      topPx = Math.max(textRect.bottom + TOPICS_MODEL_MARGIN, modelBandTop);
      bottomPx = vh - MOBILE_MODEL_BOTTOM_MARGIN;
    }

    if (bottomPx - topPx < 48) bottomPx = topPx + 48;
    return { topPx, bottomPx, centerBias, vh };
  }

  function updateTopicsModelFit(options: { duringScroll?: boolean; soft?: boolean } = {}) {
    if (!scene3d || !stageTextEl || phase === 'feedback') return;
    if (!get(isMobile)) return;
    if (phase !== 'topics' && !options.duringScroll) return;

    const band = computeTopicsModelBand(topicsCardsActive());
    if (!band) return;

    scene3d.setModelBaseYOffset(0);
    scene3d.setMobileFit(band.topPx, band.bottomPx, {
      centerBias: band.centerBias,
      viewportHeightPx: band.vh
    });
    if (options.duringScroll || options.soft) return;
    scene3d.setMobileLayoutBlend(1);
    scene3d.snapMobileFit();
    scene3d.lockMobileFit();
  }

  function scheduleTopicsModelFit() {
    // Don't schedule non-soft snaps mid A↔B glide (setMobileCards re-runs this
    // itself once the transition finishes).
    if (!$isMobile || phase !== 'topics' || textFading) return;
    void tick().then(() => {
      updateTopicsModelFit();
      requestAnimationFrame(() => updateTopicsModelFit());
      setTimeout(() => updateTopicsModelFit(), 450);
    });
  }

  let inIntro = $derived(phase === 'intro');
  let lastTopic = $derived(section.topics.length - 1);
  // Shuffle each topic's comments once per session, so positive and negative
  // are interspersed (not always 3 positive then 3 negative). Likes are keyed
  // by comment id, so the reorder is purely visual.
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const shuffledComments = untrack(() => section.topics.map((t) => shuffle(t.comments)));

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
        resetMobileTopicLayout();
      });

      // 3) after the DOM updates, place the new content and fade it in
      tl.add(async () => {
        await tick();
        gsap.set([textTargets, '.card-stack__item'], { opacity: 0, y: inY });
        gsap.to([textTargets, '.card-stack__item'], {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: scheduleTopicsModelFit
        });
      });
    });
  }

  function onContinue() {
    // Mobile mode A: the CTA opens the comments (mode B); it does NOT advance.
    // In mode B (and on desktop) it advances via goNext, gated by a like.
    if ($isMobile && !mobileCardsVisible) {
      setMobileCards(true);
      return;
    }
    goNext();
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
    if (phase !== 'intro' || suppressTopicsEnter) return;
    phase = 'topics';
    isTransitioning = false;
    textFading = false;
    cardsScrollAnimating = false;
    resetMobileTopicLayout();
    topicsScaleTween.value = topicsScaleTarget(false);
    get(lenisStore)?.stop();
    // Desktop: animated dissolve. Mobile: scroll scrub already drove progress; finalize.
    if (get(isMobile)) scene3d?.setTransitionProgress(1);
    else scene3d?.settle();
    if (get(isMobile)) scene3d?.lockMobileFit();
    gsap.killTweensOf(['.stage__text', '.stage__heading', '.card-stack__item', '.continue']);
    cardStack?.resetHidden();
    gsap.set('.stage__text', { opacity: 0, y: 8 });
    if (!get(isMobile)) gsap.set('.stage__heading', { opacity: 0 });
    void (async () => {
      await tick();
      // the CardStack api can bind a frame or two after phase flips to 'topics';
      // wait for it, otherwise the entrance is skipped and the cards stay hidden (#3)
      for (let i = 0; i < 20 && !cardStack; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      animateTopicsContentIn();
      if (!get(isMobile)) await cardStack?.animateIn();
      scheduleTopicsModelFit();
    })();
  }


function exitTopicsMode() {
    if (phase !== 'topics') return;
    isTransitioning = false;
    textFading = false;
    cardsScrollAnimating = false;
    phase = 'intro';
    scene3d?.clearMobileFit();
    teardownTopicsStageForExit();
    scene3d?.unsettle(() => get(lenisStore)?.start());
  }

  async function exitTopicsToIntro() {
    if (phase !== 'topics') return;
    isTransitioning = true;
    textFading = false;
    cardsScrollAnimating = false;
    suppressTopicsEnter = true;
    resetMobileTopicLayout();
    phase = 'intro';
    scene3d?.clearMobileFit();
    teardownTopicsStageForExit();

    const lenis = get(lenisStore);
    lenis?.start();

    const vh = window.innerHeight;
    const targetY = vh * INTRO_PHRASE_BEAT;
    const REWIND_DURATION = 0.85;

    await new Promise<void>((resolve) => {
      // The scrollTo can be cancelled (e.g. the user keeps scrolling up towards the
      // title), and then `onComplete` never fires. Without this guard isTransitioning
      // and suppressTopicsEnter would stay true forever, so enterTopicsMode() would
      // bail out on every later attempt and only the particle model would show.
      let settled = false;
      let fallback: ReturnType<typeof setTimeout> | undefined;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (fallback) clearTimeout(fallback);
        syncIntroSceneBaseline();
        ScrollTrigger.update();
        requestAnimationFrame(() => {
          ScrollTrigger.update();
          isTransitioning = false;
          // Brief guard so a parked scroll position cannot bounce back into topics.
          setTimeout(() => {
            suppressTopicsEnter = false;
          }, 450);
          resolve();
        });
      };

      fallback = setTimeout(finish, REWIND_DURATION * 1000 + 250); // safety net
      if (!lenis) {
        finish();
        return;
      }
      lenis.scrollTo(targetY, {
        duration: REWIND_DURATION,
        force: true,
        lock: true, // user input can't cancel the rewind halfway through
        onComplete: finish
      });
    });
  }

 
  const FEEDBACK_BODY_MAX_LINES = 3;
  const FEEDBACK_BODY_MAX_FONT = 24; 
  const FEEDBACK_BODY_MIN_FONT = 14; 
  const FEEDBACK_BODY_LINE_HEIGHT = 1.5;

  function fitFeedbackBody() {
    const el = document.querySelector<HTMLElement>('.feedback__body');
    if (!el) return;
    // Mobile: the size is a scalable clamp in CSS (16px @390). Clear any inline size
    // left behind by the desktop fit, otherwise it would win over the stylesheet.
    if (get(isMobile)) {
      el.style.fontSize = '';
      return;
    }
    let fs = FEEDBACK_BODY_MAX_FONT;
    el.style.fontSize = `${fs}px`;
    // step down 1px at a time until it fits in <= max lines or hits the floor
    while (fs > FEEDBACK_BODY_MIN_FONT) {
      const lines = Math.round(el.scrollHeight / (fs * FEEDBACK_BODY_LINE_HEIGHT));
      if (lines <= FEEDBACK_BODY_MAX_LINES) break;
      fs -= 1;
      el.style.fontSize = `${fs}px`;
    }
  }

  async function enterFeedbackPhase() {
    if (phase !== 'topics' || isTransitioning || !anyLiked) return;
    isTransitioning = true;
    resetMobileTopicLayout();
    scene3d?.clearMobileFit();

    const OUT = 0.5;
    gsap.to('.stage__text', { opacity: 0, y: -8, duration: OUT, ease: 'power3.inOut' });
    gsap.to('.stage__heading', { opacity: 0, duration: OUT * 0.6, ease: 'power3.inOut' });
    gsap.to('.continue', { opacity: 0, duration: OUT * 0.6, ease: 'power2.inOut' });
    await cardStack?.animateOut();

    const result = computeOpinionState(section, topicLikes);
    currentResult = result;
    progress.markCompleted(section.id, result);

    gsap.to('.layer--bg', { filter: 'blur(12px)', duration: 0.8, ease: 'power2.inOut' });

    // Pre-mount the feedback overlay (still invisible) and let it lay out, so the model
    // is framed against the REAL text box BEFORE the morph — the particles then fly
    // straight to their final place/scale, with no post-morph reframe "scattino".
    feedbackMounting = true;
    await tick();
    fitFeedbackBody();
    // hide the texts until the model has settled
    gsap.set(['.feedback__heading', '.feedback__body', '.feedback__cta'], { opacity: 0 });

    scene3d?.morphToResult(resultPathFor(result), () => {
      phase = 'feedback';
      isTransitioning = false;
      gsap.to('.feedback__heading', { opacity: 1, duration: 0.5, ease: 'power2.out' });
      gsap.to('.feedback__body', { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.15 });
      gsap.to('.feedback__cta', { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.25 });
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
    feedbackMounting = false;
    phase = 'topics';
    await tick();

    gsap.fromTo('.stage__text', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.inOut' });
    gsap.fromTo('.stage__heading', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power3.inOut', delay: 0.04 });
    await tick();
    await cardStack?.animateIn();
    gsap.to('.continue', { opacity: 1, duration: 0.3, delay: 0.1 });
    scheduleTopicsModelFit();
    isTransitioning = false;
  }

  async function goToSectionStart() {
    // Header rewind must always win — even mid morph / crossfade / scroll animation.
    if (phase !== 'feedback' && phase !== 'topics') {
      get(lenisStore)?.scrollTo(0, { immediate: true, force: true });
      return;
    }

    const fromFeedback = phase === 'feedback';

    // Cancel in-flight GSAP / 3D work so the rewind is immediate and reliable.
    gsap.killTweensOf([
      '.feedback__heading',
      '.feedback__body',
      '.feedback__cta',
      '.stage__text',
      '.stage__heading',
      '.continue',
      '.card-stack__item',
      '.layer--bg'
    ]);
    scene3d?.cancelMorph();
    scene3d?.clearMobileFit();

    isTransitioning = true;
    returningToStart = true;
    suppressTopicsEnter = true;

    if (fromFeedback) {
      gsap.set('.layer--bg', { filter: 'none' });
      gsap.set('.feedback__heading, .feedback__body, .feedback__cta', { opacity: 0 });
    }

    // Rewind to the very start of the section and reset it COMPLETELY: first
    // topic, no result, likes/choices cleared, and this section removed from
    // progress (redoing it from scratch, desktop fix A4).
    currentTopic = 0;
    currentResult = null;
    topicLikes = section.topics.map(() => ({}));
    progress.clearSection(section.id);
    resetMobileTopicLayout();
    feedbackMounting = false;
    phase = 'intro';
    syncIntroSceneBaseline();
    scene3d?.resetOrientation();
    teardownTopicsStageForExit();
    await tick();

    const lenis = get(lenisStore);
    lenis?.start();
    lenis?.scrollTo(0, { immediate: true, force: true });
    ScrollTrigger.update();

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        ScrollTrigger.update();
        returningToStart = false;
        isTransitioning = false;
        setTimeout(() => {
          suppressTopicsEnter = false;
        }, 450);
      })
    );
  }

  async function goToNextSection() {
    get(lenisStore)?.start();
    overlayVisible.set(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    const i = SECTION_ORDER.indexOf(section.id);
    const next = SECTION_ORDER[(i + 1) % SECTION_ORDER.length];
    goto(`/sections/${next}`);
  }

  
  async function goToResults() {
    get(lenisStore)?.start();
    overlayVisible.set(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    goto('/results');
  }

  function finishFeedback() {
    if (get(allSectionsCompleted)) {
      goToResults();
    } else {
      goToNextSection();
    }
  }

  let modelLoaded = $state(false);

 
  $effect(() => {
    if (!restored) return;
    sectionState.save(section.id, {
      currentTopic,
      topicLikes: $state.snapshot(topicLikes),
      phase,
      currentResult
    });
  });

  let sceneRestored = $state(false);
  $effect(() => {
    if (sceneRestored || !restored || !modelLoaded || !resumeFromSave) return;
    const saved = sectionState.read(section.id);
    if (saved?.phase !== 'topics' && saved?.phase !== 'feedback') return;

    sceneRestored = true;
    scene3d?.setScale(TOPICS_SCALE);

    if (saved.phase === 'topics') {
      scene3d?.snapToParticles();
      topicsScaleTween.value = topicsScaleTarget(false);
      scene3d?.setScale(topicsScaleTween.value);
      void tick().then(() => {
        if (get(isMobile)) {
          gsap.set('.stage__text', { opacity: 1, y: 0 });
        } else {
          cardStack?.animateIn();
          gsap.set('.stage__text', { opacity: 1, y: 0 });
          gsap.set('.stage__heading', { opacity: 1 });
        }
        scheduleTopicsModelFit();
      });
    } else {
      // feedback: show the result model formed, blur the backdrop.
      if (currentResult) scene3d?.snapToResult(resultPathFor(currentResult));
      gsap.set('.layer--bg', { filter: 'blur(12px)' });
    }
  });

  // Re-fit the feedback body whenever it appears or its text changes.
  $effect(() => {
    if (phase === 'feedback' && feedbackBody) {
      void tick().then(fitFeedbackBody);
    }
  });

  $effect(() => {
    if (!stageTextEl || phase === 'feedback') return;
    const observer = new ResizeObserver(() => {
      // Skip while an A↔B glide is running, or the resize-driven snap fights it.
      if ($isMobile && phase === 'topics' && !textFading) updateTopicsModelFit();
    });
    observer.observe(stageTextEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (!stageRightEl || phase === 'feedback') return;
    const observer = new ResizeObserver(() => {
      // Skip while an A↔B glide is running, or the resize-driven snap fights it.
      if ($isMobile && phase === 'topics' && mobileCardsVisible && !textFading)
        updateTopicsModelFit();
    });
    observer.observe(stageRightEl);
    return () => observer.disconnect();
  });

  $effect(() => {
    if (phase !== 'topics' || !$isMobile) return;
    currentTopic;
    mobileCardsVisible;
    scheduleTopicsModelFit();
    if (mobileCardsVisible) {
      void tick().then(syncCommentsScrollMask);
    } else {
      commentsAtScrollEnd = true;
    }
  });

  $effect(() => {
    if (phase !== 'topics' || !$isMobile) return;
    const onResize = () => updateTopicsModelFit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onMount(() => {
    if (!browser || !scrollArea || !titleWrap || !frostLayer || !phraseEl) return;

    // State restore (likes / topic / result) is handled in afterNavigate above,
    // so it can tell a reload apart from a menu re-selection (#8).
    const saved = sectionState.read(section.id);

    // Reveal this section by fading out the navigation veil.
    if (get(overlayVisible)) {
      setTimeout(() => overlayVisible.set(false), 60);
    }

    history.scrollRestoration = 'manual';

    // Fresh entry: reset the persistent Lenis scroll right away (see #2). Re-asserted
    // in the deferred block below once the layout settles.
    resetScrollToTop();

    headerState.update((s) => ({
      ...s,
      sectionTitle: section.title,
      onSectionTitleClick: goToSectionStart
    }));

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
        { yPercent: 0, opacity: 1 },
        { yPercent: -100, opacity: 0, ease: 'power3.inOut' },
        0
      );
      heroTl.fromTo(frostLayer, { opacity: 1 }, { opacity: 0, ease: 'power2.inOut' }, 0);
      heroTl.fromTo(phraseEl, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out' }, 0.35);
      heroTl.to(phraseEl, { opacity: 0, y: -40, ease: 'power2.in' }, 0.7);

      const proxy = { rot: 0, scale: INTRO_MODEL_SCALE, appear: 0, posY: INTRO_MODEL_Y_OFFSET };

      // --- auto-complete the reveal rotation ---
      // If the user stops scrolling just short of the end, finish the rotation for them
      // instead of leaving them stranded mid-spin. Below AUTO_COMPLETE_FROM we never
      // intervene, so whoever scrolls slowly to inspect the object stays in control.
      const AUTO_COMPLETE_FROM = 0.60; // only near the end (0..1 of the reveal)
      const AUTO_COMPLETE_IDLE_MS = 260; // pause after the scroll settles
      const AUTO_COMPLETE_DURATION = 1.4; // seconds; higher = softer/slower
      let autoCompleteTimer: ReturnType<typeof setTimeout> | null = null;

      function scheduleRevealAutoComplete(self: { progress: number; end: number }) {
        if (autoCompleteTimer) clearTimeout(autoCompleteTimer);
        if (self.progress < AUTO_COMPLETE_FROM || self.progress >= 0.999) return;
        autoCompleteTimer = setTimeout(() => {
          autoCompleteTimer = null;
          if (phase !== 'intro' || isTransitioning || suppressTopicsEnter || returningToStart) return;
          if (self.progress < AUTO_COMPLETE_FROM || self.progress >= 0.999) return;
          get(lenisStore)?.scrollTo(self.end, {
            duration: AUTO_COMPLETE_DURATION,
            easing: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2, // easeInOutSine: gentle start AND stop
            force: true
          });
        }, AUTO_COMPLETE_IDLE_MS);
      }
      revealAutoCompleteCleanup = () => {
        if (autoCompleteTimer) clearTimeout(autoCompleteTimer);
      };

      const threeTl = gsap.timeline({
        scrollTrigger: {
          // Start the model reveal right after the hero timeline ends (1.5vh) so there
          // is no "dead"/blocked zone of empty scroll between the intro phrase leaving
          // and the model appearing. The small 0.05vh buffer keeps text and model from
          // overlapping (the phrase finishes fading out exactly at 1.5vh).
          trigger: scrollArea,
          start: () => `top+=${window.innerHeight * 1.55} top`,
          end: 'bottom bottom',
          scrub: 1.2,
          onUpdate: (self) => {
            if (returningToStart) return;
            const progress = self.progress;
            const particleT = particleProgressFromScroll(progress);
            // Mobile: always scrub. Desktop: only while rewinding (suppressTopicsEnter).
            if (get(isMobile) || suppressTopicsEnter) {
              scene3d?.setTransitionProgress(particleT);
              if (get(isMobile)) updateTopicsScrollLayout(particleT);
            }
            if (suppressTopicsEnter) return;
            if (progress >= 0.999) {
              enterTopicsMode();
              return;
            }
            scheduleRevealAutoComplete(self);
          },
          onLeaveBack: () => {
            exitTopicsMode();
            if (get(isMobile)) scene3d?.setTransitionProgress(0);
          }
        }
      });

      threeTl.fromTo(
        proxy,
        { appear: 0 },
        { appear: 1, duration: 0.12, onUpdate: () => scene3d?.setOpacity(proxy.appear) },
        0
      );
      threeTl.fromTo(
        proxy,
        { posY: INTRO_MODEL_Y_OFFSET },
        { posY: 0, duration: 0.12, ease: 'power2.out', onUpdate: () => scene3d?.setPositionY(proxy.posY) },
        0
      );
      threeTl.to(
        proxy,
        { rot: Math.PI * 2, ease: 'none', duration: 0.46, onUpdate: () => scene3d?.setRotationY(proxy.rot) },
        0.06
      );
      threeTl.to(
        proxy,
        {
          scale: topicsEntryScale(),
          ease: 'power2.inOut',
          duration: 0.46,
          onUpdate: () => scene3d?.setScale(proxy.scale)
        },
        0.06
      );

      gsap.set('.stage__text', { opacity: 0, y: 8 });
      if (!get(isMobile)) gsap.set('.stage__heading', { opacity: 0 });

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

    function resetScrollToTop() {
    // Fresh entry (menu re-selection / "next section"): Lenis is a persistent
    // singleton that keeps the previous section's scroll position across SPA
    // navigation, so without this the intro opens scrolled down (#2).
    if (resumeFromSave) return;
    const lenis = get(lenisStore);
    lenis?.start();
    lenis?.scrollTo(0, { immediate: true, force: true });
    ScrollTrigger.update();
    }

     function restoreScrollForPhase() {
      if (!resumeFromSave || !saved) return;
      if (saved.phase !== 'topics' && saved.phase !== 'feedback') return;
      phase = saved.phase; // guards in enter/exitTopicsMode now bail out
      const lenis = get(lenisStore);
      lenis?.scrollTo(document.documentElement.scrollHeight, {
        immediate: true,
        force: true
      });
      ScrollTrigger.update();
      lenis?.stop();
    }

      windowLoaded.then(() => {
      ScrollTrigger.refresh();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          resetScrollToTop();
          restoreScrollForPhase();
        })
      );
      // On mobile, don't eagerly preload all result models: loading several GLBs at
      // once spikes memory and crashes the tab on mobile Safari. The one needed model
      // still loads on demand in morphToResult when the user reaches the feedback.
      if (!$isMobile) {
        if ('requestIdleCallback' in window) {
          (
            window as Window & {
              requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
            }
          ).requestIdleCallback(() => scene3d?.preloadResultModels(), { timeout: 1000 });
        } else {
          setTimeout(() => scene3d?.preloadResultModels(), 2000);
        }
      }
    });

    // --- touch input (mobile): swipe nav on touchend (prototype model); tap stays on onclick. ---
    const MOBILE_SWIPE_THRESHOLD = 48; // px vertical swipe to trigger one nav action
    let touchStartX = 0;
    let touchStartY = 0;
    let touchLastY = 0;

    // --- intro snap: settle the frost/phrase scroll onto rest beats ---
    const INTRO_SNAP_IDLE_MS = 180;
    const INTRO_COMMIT_FRAC = 0.12;
    let introSnapTimer: ReturnType<typeof setTimeout> | null = null;
    let introDir = 1; // last intro wheel direction: 1 = down, -1 = up

    function introSnap() {
      if (phase !== 'intro' || isTransitioning || suppressTopicsEnter) return;
      const vh = window.innerHeight;
      const y = window.scrollY;
      if (y > vh * INTRO_SCROLL_COMMIT) {
        // Rewinding from the 3D reveal: swipe up settles on the phrase beat.
        if (introDir < 0) {
          const target = vh * INTRO_PHRASE_BEAT;
          const dist = Math.abs(target - y);
          if (dist >= 4) {
            const duration = Math.min(0.85, 0.18 + (dist / vh) * 0.6);
            get(lenisStore)?.scrollTo(target, {
              duration,
              easing: (t: number) => Math.sin((t * Math.PI) / 2)
            });
          }
        }
        return;
      }

      const title = 0;
      const phraseY = vh * INTRO_PHRASE_BEAT;

      // Directional commit (like the home scroll): a deliberate scroll settles onto
      // the beat it heads TOWARD, instead of the geometrically nearest one — so a
      // small downward move no longer gets thrown back to the title (#11).
      let target: number;
      if (y <= phraseY) {
        const progress = (y - title) / (phraseY - title || 1); // 0..1 within the gap
        if (introDir > 0) {
          target = progress > INTRO_COMMIT_FRAC ? phraseY : title;
        } else {
          // Swiping up between title and phrase always settles on the title.
          target = title;
        }
      } else {
        // past the phrase, in the run-up to the 3D reveal:
        // scrolling down flows on (no snap-back); scrolling up settles on the phrase
        if (introDir > 0) return;
        target = phraseY;
      }

      const dist = Math.abs(target - y);
      if (dist < 4) return;
      // duration scales with distance -> tiny fixes feel instant, no springy bounce
      const duration = Math.min(0.7, 0.18 + (dist / vh) * 0.6);
      get(lenisStore)?.scrollTo(target, {
        duration,
        easing: (t: number) => Math.sin((t * Math.PI) / 2) // easeOutSine, no overshoot
      });
    }

    // --- intro checkpoint (title -> phrase) ---
    // A single gesture cannot blow past the phrase and land on the 3D model. This is a
    // HARD STOP exactly at the checkpoint, never a rubber-band back to the title (that
    // bounce is what felt wrong before). Pause/lift the finger to continue past it.
    const INTRO_GATE_GAP_MS = 220; // pause that starts a new gesture (same idea as the home)
    let introGateArmed = false; // this gesture began before the checkpoint
    let introLastInputAt = 0;
    let introGateRaf = 0;

    const introGateY = () => window.innerHeight * INTRO_PHRASE_BEAT;

    /** Called on every intro wheel/touch input, to open or keep the gate. */
    function noteIntroInput() {
      const now = performance.now();
      if (now - introLastInputAt > INTRO_GATE_GAP_MS) {
        // new gesture: it may only run up TO the checkpoint if it started before it
        introGateArmed = window.scrollY < introGateY() - 2;
      }
      introLastInputAt = now;
      if (introGateArmed && !introGateRaf) introGateRaf = requestAnimationFrame(introGateTick);
    }

    /** Holds the scroll at the checkpoint while the gesture (and its inertia) lasts. */
    function introGateTick() {
      introGateRaf = 0;
      if (phase !== 'intro' || !introGateArmed) return;
      const lenis = get(lenisStore);
      const limit = introGateY();
      if (lenis && lenis.scroll > limit) {
        // stop AT the checkpoint: this also kills the leftover momentum
        lenis.scrollTo(limit, { immediate: true, force: true });
      }
      // keep watching a little past the gesture, since inertia arrives late
      if (performance.now() - introLastInputAt < INTRO_GATE_GAP_MS + 400) {
        introGateRaf = requestAnimationFrame(introGateTick);
      }
    }

    function onWheel(e: WheelEvent) {
      if (phase === 'intro') {
        // free scroll, but settle onto the intro beat we're heading toward on pause
        if (e.deltaY !== 0) introDir = e.deltaY > 0 ? 1 : -1;
        if (!isTransitioning && !suppressTopicsEnter) {
          noteIntroInput();
          if (introSnapTimer) clearTimeout(introSnapTimer);
          introSnapTimer = setTimeout(introSnap, INTRO_SNAP_IDLE_MS);
        }
        return;
      }

      if (phase === 'topics') {
        // Mode B (mobile): let the comments scroll natively; only advance the topic
        // once the comments hit their edge (matches the prototype).
        if (mobileCardsVisible) {
          const el = e.target as Element | null;
          const sc = el && (el.closest('.stage__right-scroll') as HTMLElement | null);
          if (sc) {
            const atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 8;
            const atTop = sc.scrollTop < 8;
            if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
          }
        }

        const goingDown = e.deltaY > 0;

        // guards first, so leftover scroll momentum can't fire another action
        if (wheelLock || isTransitioning) {
          e.preventDefault();
          return;
        }
        if (Math.abs(e.deltaY) < 10) return;

        e.preventDefault();

        if ($isMobile) {
          // Mobile: no wheel topic navigation — Continua button only. Block stray momentum.
          return;
        }

        // Desktop: at the first topic, scrolling up rewinds to the intro phrase beat
        if (!goingDown && currentTopic === 0) {
          wheelLock = true;
          void exitTopicsToIntro().finally(() => {
            setTimeout(() => { wheelLock = false; }, 400);
          });
          return;
        }

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
        // Scrolling DOWN advances like the CTA (the whole site is scroll-driven,
        // so users expect scroll to continue). Scrolling up stays disabled
        // (one-way, approach A: no going back to topics).
        if (wheelLock || isTransitioning) return;
        if (e.deltaY > 10) {
          wheelLock = true;
          finishFeedback();
          setTimeout(() => { wheelLock = false; }, 1000);
        }
      }
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchLastY = touchStartY;
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = touchLastY - y; // finger up = positive = "scroll down" (matches wheel sign)
      touchLastY = y;

      if (phase === 'intro') {
        // let native/Lenis scroll drive the reveal; we only track direction for the snap
        if (dy !== 0) introDir = dy > 0 ? 1 : -1;
        if (!isTransitioning && !suppressTopicsEnter) {
          noteIntroInput();
          if (introSnapTimer) clearTimeout(introSnapTimer);
          introSnapTimer = setTimeout(introSnap, INTRO_SNAP_IDLE_MS);
        }
        return; // no preventDefault -> native scroll moves the intro
      }

      if (phase === 'topics') {
        // Mode B: let the comments list scroll natively; nav fires on touchend at the edge.
        if (mobileCardsVisible) {
          const el = e.target as Element | null;
          const sc = el && (el.closest('.stage__right-scroll') as HTMLElement | null);
          if (sc) {
            const atBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 8;
            const atTop = sc.scrollTop < 8;
            if ((dy > 0 && !atBottom) || (dy < 0 && !atTop)) return; // comments own this touch
          }
        }
        e.preventDefault(); // we own the gesture: no native scroll in topics
        return;
      }

      if (phase === 'feedback') {
        e.preventDefault(); // one-way: no scrolling back on touch either
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (phase === 'intro') {
        if (!isTransitioning && !suppressTopicsEnter) {
          if (introSnapTimer) clearTimeout(introSnapTimer);
          introSnapTimer = setTimeout(introSnap, INTRO_SNAP_IDLE_MS);
        }
        return;
      }

      if (phase !== 'topics' || !$isMobile) return;
      if (wheelLock || isTransitioning || textFading || cardsScrollAnimating) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touchStartY - touch.clientY;

      if (Math.abs(dy) <= Math.abs(dx) || Math.abs(dy) <= MOBILE_SWIPE_THRESHOLD) return;

      if (dy > 0) {
        if (mobileCardsVisible && cardsScrollRef?.contains(e.target as Node) && !cardsScrollAtBottom()) {
          return;
        }
        handleTopicsForwardNavigation();
      } else if (dy < 0) {
        if (mobileCardsVisible && cardsScrollRef?.contains(e.target as Node) && !cardsScrollAtTop()) {
          return;
        }
        handleTopicsBackwardNavigation();
      }
    }

    const onFeedbackResize = () => {
      if (phase !== 'feedback') return;
      fitFeedbackBody(); // may move the body, so re-frame the model after it
      scene3d?.reframeResult();
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onFeedbackResize);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      const lenis = get(lenisStore);
      lenis?.start();
      lenis?.scrollTo(0, { immediate: true, force: true });
      ScrollTrigger.update();
      window.removeEventListener('wheel', onWheel);
      if (introGateRaf) cancelAnimationFrame(introGateRaf);
      revealAutoCompleteCleanup?.();
      window.removeEventListener('resize', onFeedbackResize);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (introSnapTimer) clearTimeout(introSnapTimer);
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
        theme={isHomeDarkMode ? 'dark' : 'light'}
        fitFactor={section.modelFitFactor}
        resultScale={section.resultScale}
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
      <p class="phrase" bind:this={phraseEl}><span class="phrase__text">{$isMobile && section.descriptionMobile ? section.descriptionMobile : section.description}</span></p>
    </div>

    <!-- ── Topics stage ── -->
    <div class="stage" class:is-visible={phase === 'topics'} class:m-cards-visible={mobileCardsVisible}>
      <div
        class="stage__text"
        bind:this={stageTextEl}
        role="button"
        tabindex="0"
        onclick={() => { if ($isMobile) setMobileCards(!mobileCardsVisible); }}
        onkeydown={(e) => { if ($isMobile && (e.key === 'Enter' || e.key === ' ')) setMobileCards(!mobileCardsVisible); }}
      >
        <TextBlock {counter} title={topic.title} body={topic.description} sources={topic.sources} />
      </div>

      <div class="stage__center" aria-hidden="true"></div>

      <div class="stage__right" class:no-pointer={phase !== 'topics'} bind:this={stageRightEl}>
        <h2 class="stage__heading">Metti like alle opinioni con cui sei d'accordo</h2>
        <div class="stage__comments">
          <div
            class="stage__right-scroll"
            class:is-scroll-end={commentsAtScrollEnd}
            data-lenis-prevent
            bind:this={cardsScrollRef}
            onscroll={onCommentsScroll}
          >
            <CardStack
              bind:api={cardStack}
              comments={shuffledComments[currentTopic]}
              sectionId={section.id}
              likes={topicLikes[currentTopic]}
              onToggleLike={toggleLike}
              topicId={topic.id}
              active={phase === 'topics'}
            />
          </div>

          <!-- C3: custom vertical scrollbar, mobile mode B only. -->
          {#if $isMobile && mobileCardsVisible}
            <div
              class="stage__scrollbar"
              class:is-hidden={!commentsScrollable}
              bind:this={scrollbarTrackEl}
              aria-hidden="true"
            >
              <div class="stage__scrollbar-thumb" style:transform="translateY({commentsThumbY}px)"></div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- ── "Continua" CTA ── -->
    <button
      class="continue"
      class:is-visible={phase === 'topics'}
      disabled={$isMobile && !mobileCardsVisible ? false : !anyLiked}
      onclick={onContinue}
      aria-label={currentTopic === lastTopic ? 'Conferma le tue scelte' : 'Continua al prossimo argomento'}
    >
      <span class="continue__label">
        {#if currentTopic === lastTopic}
          Conferma le tue scelte
        {:else}
          Continua
        {/if}
      </span>
      <svg class="continue__arrow" viewBox="0 0 25 10" fill="none" aria-hidden="true">
        <path d="M2 2l10.5 6 10.5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <!-- ── Feedback overlay (pre-mounted invisibly during the morph so the model can
         be framed against the real text box) ── -->
    {#if phase === 'feedback' || feedbackMounting}
      <div class="feedback" class:is-visible={phase === 'feedback'}>
        <p class="feedback__heading">{$isMobile ? FEEDBACK_HEADING_MOBILE : FEEDBACK_HEADING}</p>
        <p class="feedback__body">{feedbackBody}</p>
        <button
          class="feedback__cta"
          onclick={finishFeedback}
          aria-label={$allSectionsCompleted ? 'Scopri i tuoi risultati' : 'Continua il percorso'}
        >
          <span class="feedback__cta-label">
            {$allSectionsCompleted ? 'Scopri i tuoi risultati' : 'Continua il percorso'}
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
    height: 100dvh;
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
    opacity: 0.10;
    pointer-events: none;
  }

  /* Dark sections: put the background image in "negative". */
  :global(body.theme-dark-sections) .layer--bg {
    filter: grayscale(1) invert(1);
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
    white-space: pre-line; /* honor the explicit line breaks in the description */
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: 4.5vw;
    line-height: var(--line-height-tight);
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
    opacity: 0;
    will-change: transform, opacity;
  }

  .phrase__text {
    width: 100%;
    /* Safari drops white-space:pre-line on flex containers, so the explicit
       newlines must live on the text node itself, not on the flex .phrase. */
    white-space: pre-line;
  }

  .layer--frost.is-hidden,
  .hero-title.is-hidden,
  .phrase-anchor.is-hidden {
    opacity: 0 !important;
    pointer-events: none;
  }

  /* ── Mobile (≤768px) intro: cover title centered, phrase large + top-anchored,
     calibrated to the 390px Figma frame (title 68 / phrase 36). ── */
  @media (max-width: 768px) {
    .hero-title {
      justify-content: center; /* cover title centered vertically like the Figma */
    }

    .phrase-anchor {
      top: 104px; /* sits below the header */
      bottom: auto;
    }
    .phrase {
      height: auto;
      align-items: flex-start;
      font-size: var(--font-size-section-intro-phrase); /* 36px @390 */
    }
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
    width: 385px;
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
    font: var(--text-section-comments-heading-font);
    line-height: var(--line-height-tight);
    color: var(--color-text-primary);
  }

  /* ── Mobile topics (S4.1): stack vertically; mode A = text + object (scene behind),
     mode B (.m-cards-visible) = text on top + comments at the bottom. ── */
  @media (max-width: 768px) {
    .stage {
      display: flex;
      flex-direction: column;
      grid-template-columns: none;
      gap: 0;
      align-items: stretch;
      justify-content: flex-start;
      padding: var(--spacing-section-stage-top) var(--page-gutter) 0;
    }

    .stage__center {
      display: none;
    }

    .stage__text {
      justify-self: stretch;
      cursor: pointer; /* tap toggles mode A/B */
    }

    /* text block: fit the phone width (not the 437px desktop column), with two
       sizes that morph smoothly between mode A (expanded) and B (compact). */
    .stage__text :global(.text-block) {
      width: 100%;
      max-height: none;
    }
    /* size changes happen while the text is faded out (see setMobileCards),
       so NO font-size transition here — that caused the visible scaling. */
    /* Mode A (expanded) — tokens: text-style.css + spacing.css */
    .stage__text :global(.text-block__title) {
      font: var(--text-section-topic-title-expanded-font);
      margin-bottom: var(--spacing-section-topic-gap-title-body-expanded);
    }
    .stage__text :global(.text-block__body) {
      font: var(--text-section-topic-body-expanded-font);
      margin-bottom: var(--spacing-section-topic-gap-body-sources-expanded);
    }
    .stage__text :global(.text-block__counter) {
      margin-bottom: var(--spacing-section-topic-gap-counter-title);
    }
    .stage__text :global(.text-block__sources) {
      font: var(--text-caption-font);
      text-transform: var(--text-caption-text-transform);
    }

    /* Mode B (compact) */
    .stage.m-cards-visible .stage__text :global(.text-block__title) {
      font: var(--text-section-topic-title-compact-font);
      margin-bottom: var(--spacing-section-topic-gap-title-body-compact);
    }
    .stage.m-cards-visible .stage__text :global(.text-block__body) {
      font: var(--text-section-topic-body-compact-font);
      margin-bottom: 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 5;
      line-clamp: 5;
    }

    /* Mode B: flex column — body truncates, sources always visible (never clipped). */
    .stage.m-cards-visible .stage__text {
      flex-shrink: 0;
    }

    .stage.m-cards-visible .stage__text :global(.text-block) {
      max-height: var(--spacing-section-mode-b-text-band);
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .stage.m-cards-visible .stage__text :global(.text-block__sources) {
      flex-shrink: 0;
      margin-top: var(--spacing-section-topic-gap-body-end-compact);
    }

    /* Mode B (compact): hide the topic counter to free vertical space. */
    .stage.m-cards-visible .stage__text :global(.text-block__counter) {
      display: none;
    }

    .stage__right {
      width: auto;
      display: none;
    }

    /* Mode B: bottom ~46% = heading + scrollable cards + Continua reserve. */
    .stage.m-cards-visible .stage__right {
      position: absolute;
      left: var(--page-gutter);
      right: var(--page-gutter);
      bottom: 0;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-section-comments-heading-gap);
      height: var(--spacing-section-mode-b-comments-band);
      padding-bottom: var(--spacing-section-comments-cta-reserve);
      box-sizing: border-box;
      min-height: 0;
    }

    /* C3: wrapper is layout-transparent by default (desktop unchanged); only in
       mobile mode B it becomes the flex box + positioning context for the scrollbar. */
    .stage__comments { display: contents; }

    .stage.m-cards-visible .stage__comments {
      display: block;
      position: relative;
      flex: 1;
      min-height: 0;
    }

    .stage.m-cards-visible .stage__right-scroll {
      height: 100%;               /* fill .stage__comments (was flex:1 directly) */
      min-height: 0;
      padding: 4px var(--spacing-section-comments-scroll-inset);
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;        /* hide the NATIVE bar — our custom one replaces it */
      -ms-overflow-style: none;

      /* soft bottom fade, hinting there's more to scroll (matches the Figma). */
      -webkit-mask-image: linear-gradient(
            to bottom, #000 calc(100% - var(--spacing-section-comments-fade)), transparent 100%
      );
      mask-image: linear-gradient(
        to bottom, #000 calc(100% - var(--spacing-section-comments-fade)), transparent 100%
      );
    }

    /* C3: custom vertical scrollbar. Track ends where the bottom fade starts (same
       token as the mask). Figma: 2px track (neutral-200), 66px thumb (neutral-600),
       rounded ends. Read-only for now (pointer-events:none). */
    .stage.m-cards-visible .stage__scrollbar {
      --sb-thumb-len: 66px;                          /* Figma thumb length; tune here */
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;  /* run the track down to the end of the last comment */
      width: 2px;
      border-radius: var(--radius-pill, 999px);
      background: var(--neutral-200);
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .stage.m-cards-visible .stage__scrollbar.is-hidden { opacity: 0; }

    .stage.m-cards-visible .stage__scrollbar-thumb {
      width: 100%;
      height: var(--sb-thumb-len);
      border-radius: var(--radius-pill, 999px);
      background: var(--neutral-600);
      will-change: transform;
    }

    /* Hide the native scrollbar (WebKit) — the custom .stage__scrollbar replaces it. */
    .stage.m-cards-visible .stage__right-scroll::-webkit-scrollbar {
      width: 0;
      height: 0;
    }

    /* At scroll bottom the last card keeps a crisp edge (no fade on nothing). */
    .stage.m-cards-visible .stage__right-scroll.is-scroll-end {
      -webkit-mask-image: none;
      mask-image: none;
    }

.continue__label {
      font: var(--text-caption-font);
      text-transform: var(--text-caption-text-transform);
      text-align: center;
      line-height: var(--line-height-tight);
      white-space: nowrap; /* all mobile CTAs stay on a single line (Figma) */
    }

    .continue,
    .feedback__cta {
      -webkit-tap-highlight-color: transparent;
    }

    .continue:focus:not(:focus-visible),
    .feedback__cta:focus:not(:focus-visible) {
      outline: none;
    }
  }

   .continue {
    position: absolute;
    z-index: 7;
    transition: transform 0.2s ease;
    left: 50%;
    bottom: var(--cta-bottom);
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

  @media (hover: hover) {
    .continue:hover:not(:disabled) {
      transform: translateX(-50%) scale(1.05); /* grow label + arrow together */
    }

    .continue:hover .continue__arrow {
      transform: scale(1.05);
    }
  }

  .continue__label {
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    color: inherit;
  }



  .continue__arrow {
    width: 25px;
    height: 10px;
    transition: transform 0.2s ease;
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
    top: 14vh;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    text-align: center;
    white-space: pre;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: clamp(16px, 2.38vw, 36px);
    line-height: normal; /* Figma: heading leading is "auto" (desktop + mobile) */
    color: var(--color-text-primary);
  }

  .feedback__body {
    position: absolute;
    bottom: calc(var(--page-gutter) + 60px); /* sits above the CTA */
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    width: 1000px;
    max-width: 1100px;
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

  /* ── Mobile (≤768px) feedback: the body is a fixed 1000px column on desktop, which
     overflows a phone. Make it fluid and use the mobile CTA size. The 3D result is
     framed by Scene3D's own box constants. ── */
  @media (max-width: 768px) {
    .feedback__heading {
      top: 18vh;             /* B: title lowered a bit on mobile (was 12vh) — tune here */
      width: 100%;
      padding: 0 var(--page-gutter);
      box-sizing: border-box;
      white-space: pre-line;  /* honors \n breaks and wraps the rest */
      font-size: clamp(1.1rem, 5.13vw, 1.35rem); /* 20px @390 */
      font-weight: var(--font-weight-bold);
      line-height: normal;    /* B: "interlinea auto" (era 1.25 ereditato) */
    }

    .feedback__body {
      width: 100%;
      max-width: none;
      padding: 0 var(--page-gutter);
      bottom: calc(var(--cta-bottom) + 64px); /* clears the CTA */
      text-wrap: pretty;
      font-size: clamp(0.9rem, 4.1vw, 1.05rem); /* 16px @390 */
      font-weight: var(--font-weight-regular);
    }

    .feedback__cta-label {
      font-size: clamp(0.75rem, 3.33vw, 0.9rem); /* same as the other mobile CTAs */
      white-space: nowrap; /* single line on mobile (Figma) */
    }
  }

  .feedback__cta {
    position: absolute;
    transition: transform 0.2s ease;
    bottom: var(--cta-bottom);
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

  @media (hover: hover) {
    .feedback__cta:hover {
      transform: translateX(-50%) scale(1.08);
    }
  }

  .feedback__cta-label {
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    color: inherit;
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