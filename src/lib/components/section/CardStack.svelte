<!--
  ============================================================
  CARD STACK
  ============================================================
  Vertical stack of CommentCards with imperative entrance/exit
  animations, exposed via a bindable api:
    - animateIn():  cards slide in from the right, staggered
    - animateOut(): cards slide out to the right, staggered
    - resetHidden(): snap all cards hidden (opacity 0)

  Used for the "special" moments (entering topics on the first
  topic, leaving towards feedback on the last). Intermediate
  topic changes are handled by the page with a coordinated
  crossfade instead, so the stagger doesn't fire every time.

  Presentational: receives comments + liked map, forwards like
  toggles by comment id (string, matching our data model).
  ============================================================
-->

<script lang="ts">
  import gsap from 'gsap';
  import CommentCard from '$lib/components/cards/CommentCard.svelte';
  import type { Comment, SectionId } from '$lib/types';

  export interface CardStackApi {
    animateOut: () => Promise<void>;
    animateIn: () => Promise<void>;
    resetHidden: () => void;
  }

  interface Props {
    comments: Comment[];
    sectionId: SectionId;
    /** Map of comment id → liked boolean. */
    likes: Record<string, boolean>;
    onToggleLike: (id: string) => void;
    /** Identifies the current topic so each stack keys uniquely. */
    topicId: string;
    active: boolean;
    api?: CardStackApi;
  }

  let { comments, sectionId, likes, onToggleLike, topicId, active, api = $bindable() }: Props =
    $props();

  let stackEl = $state<HTMLDivElement | null>(null);

  const STAGGER = 0.075;
  const DURATION = 0.42;
  const OFFSCREEN_PAD = 32;
  const HINT_FIRST_DELAY_MS = 10000;
  const HINT_REPEAT_MS = 30000;
  const HINT_MAX_REPEATS = 3;        // dopo N ripetizioni senza like, smette di insistere
  const HINT_NUDGE_DISTANCE = 22;   // px — ampiezza dello scarto laterale
  const HINT_NUDGE_DURATION = 1.6;  // s — durata di un ciclo completo
  const HINT_STAGGER = 0.09;        // s — ritardo tra una card e la successiva



  function getItems(): HTMLElement[] {
    if (!stackEl) return [];
    return Array.from(stackEl.querySelectorAll<HTMLElement>('.card-stack__item'));
  }

  /** Distance needed to push a card fully past the right viewport edge. */
  function exitDistanceFor(item: HTMLElement): number {
    const rect = item.getBoundingClientRect();
    return window.innerWidth - rect.left + OFFSCREEN_PAD;
  }

  /** Cards exit fully to the right, one after another. */
  function animateOut(): Promise<void> {
    const items = getItems();
    if (!items.length) return Promise.resolve();
    return new Promise((resolve) => {
      gsap.to(items, {
        x: (_i, el) => exitDistanceFor(el as HTMLElement),
        duration: DURATION,
        stagger: STAGGER,
        ease: 'power3.in',
        onComplete: resolve
      });
    });
  }

  /** Cards re-enter from the right edge, one after another. */
  async function animateIn(): Promise<void> {
    // On the first entry the {#each} items can land a frame after this is called;
    // wait for them so the entrance never silently no-ops (cards default to
    // opacity:0 and would stay invisible). Fixes #3.
    let items = getItems();
    for (let i = 0; i < 10 && !items.length; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      items = getItems();
    }
    if (!items.length) return;

    gsap.set(items, { x: 0, opacity: 1 });
    const distances = items.map((item) => exitDistanceFor(item));
    items.forEach((item, i) => gsap.set(item, { x: distances[i] }));

    return new Promise((resolve) => {
      gsap.to(items, {
        x: 0,
        duration: DURATION,
        stagger: STAGGER,
        ease: 'power3.out',
        onComplete: resolve
      });
    });
  }

  function resetHidden() {
    const items = getItems();
    gsap.killTweensOf(items);
    gsap.set(items, { opacity: 0, x: 0 });
  }

  function nudgeCards() {
  const items = getItems();
  if (!items.length) return;
  gsap.to(items, {
    keyframes: { x: [0, HINT_NUDGE_DISTANCE, -HINT_NUDGE_DISTANCE, HINT_NUDGE_DISTANCE * 0.5, 0] },
    duration: HINT_NUDGE_DURATION,
    stagger: HINT_STAGGER,
    ease: 'sine.inOut'
  });
  }


  let hintTimer: ReturnType<typeof setTimeout> | null = null;
  let hintCount = 0;
  let lastTopicId = '';

  function scheduleHint(delay: number) {
    clearHint();
    if (hintCount >= HINT_MAX_REPEATS) return;
    hintTimer = setTimeout(() => {
      nudgeCards();
      hintCount += 1;
      scheduleHint(HINT_REPEAT_MS);
    }, delay);
  }

  function clearHint() {
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = null;
  }


    api = { animateOut, animateIn, resetHidden };

    $effect(() => {
    const hasLiked = Object.values(likes).some(Boolean);
    if (topicId !== lastTopicId) {
      lastTopicId = topicId;
      hintCount = 0;
    }
    if (active && !hasLiked) scheduleHint(HINT_FIRST_DELAY_MS);
    else clearHint();
    return clearHint;
  });

</script>


<div class="card-stack" bind:this={stackEl}>
  {#each comments as comment (`${topicId}-${comment.id}`)}
    <div class="card-stack__item">
      <CommentCard
        {comment}
        {sectionId}
        liked={likes[comment.id] ?? false}
        onToggleLike={() => onToggleLike(comment.id)}
        size="sm"
      />
    </div>
  {/each}
</div>


<style>
  .card-stack {
    display: flex;
    flex-direction: column;
    gap: 19px; /* 19px @ 1512px — matches our comment list spacing */
    width: 100%;
    overflow: visible;
  }

  .card-stack__item {
    opacity: 0;
    will-change: transform;
  }
</style>