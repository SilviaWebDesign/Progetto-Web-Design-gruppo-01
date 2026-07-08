<!--
  ============================================================
  COMMENT CARD
  ============================================================
  Glass card showing an opinion. The whole card is the like
  toggle (click anywhere, or Enter/Space when focused). The
  heart is a decorative indicator that fills when liked.

  Behaviour aligned with the final prototype: the card itself
  is the button (larger, touch-friendly target).
  ============================================================
-->

<script lang="ts">
  import type { Comment, SectionId } from '$lib/types';

  interface Props {
    comment: Comment;
    sectionId: SectionId;
    liked: boolean;
    onToggleLike: () => void;
    size?: 'sm' | 'lg';
  }

  let {
    comment,
    sectionId,
    liked,
    onToggleLike,
    size = 'sm'
  }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleLike();
    }
  }
</script>


<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<article
  class="comment-card"
  data-section={sectionId}
  data-liked={liked}
  data-size={size}
  role="button"
  tabindex="0"
  aria-pressed={liked}
  aria-label={liked ? 'Rimuovi like dal commento' : 'Metti like al commento'}
  onclick={onToggleLike}
  onkeydown={handleKeydown}
>
  <p class="comment-card__body">{comment.body}</p>

 <svg
    class="comment-card__heart"
    viewBox="8 11 28 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      class="comment-card__heart-shape"
      d="M12.4194 15.7227C14.8602 13.2819 18.8175 13.2819 21.2583 15.7227L22.1421 16.6066L23.026 15.7227C25.4668 13.2819 29.4241 13.2819 31.8649 15.7227C34.3055 18.1634 34.3056 22.1208 31.8649 24.5615L22.1421 34.2842L12.4194 24.5615C9.97876 22.1208 9.97896 18.1635 12.4194 15.7227Z"
      stroke="currentColor"
      fill="none"
    />
  </svg>
</article>


<style>
  /* ============================================================
     STRUCTURE — the whole card is the like button
     ============================================================ */

  .comment-card {
    position: relative;
    isolation: isolate;

    display: flex;
    align-items: center;
    justify-content: space-between;   /* push heart to the right edge */
    gap: var(--spacing-md);          /* 20px */
    width: 100%;
    padding: var(--spacing-md);                  /* 20px @ 1512px */

    background: transparent;
   

    border: var(--border-thin);
    border-radius: var(--radius-s);             /* 12px @ 1512px */
    color: var(--color-text-primary);

    outline: var(--border-width-thin) solid transparent;
    outline-offset: 0;

    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.08),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);

    cursor: pointer;

    transition:
      transform 300ms cubic-bezier(0.25, 1, 0.5, 1),
      background 300ms ease,
      border-color 200ms ease,
      outline-color 200ms ease,
      box-shadow 300ms ease;
  }

  .comment-card[data-size='sm'] { height: 96px; }
  .comment-card[data-size='lg'] { height: 96px; }


  /* ============================================================
     RADIAL GRADIENT (::before) — monochrome, fades in on hover
     ============================================================
     A soft dark-grey radial glow, offset to the left. Fades in
     on hover. On liked it's hidden, but reappears on liked+hover.
     ============================================================ */

  .comment-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;

    border-radius: inherit;
    opacity: 0;
    transition: opacity 400ms ease;

    pointer-events: none;
    filter: blur(6px);

    background-image: var(--gradient-comment-hover)
  }

  @media (hover: hover) {
    .comment-card:hover::before {
      opacity: 1;
    }
  }

  .comment-card[data-liked='true']::before {
    opacity: 0;
  }

  @media (hover: hover) {
    .comment-card[data-liked='true']:hover::before {
      opacity: 1;
    }
  }

  /* ============================================================
     HOVER — lift, border, outline, glow
     ============================================================ */

 @media (hover: hover) {
    .comment-card:hover {
      transform: translateY(-0.5px);
      border-color: var(--color-border);
      outline-color: var(--color-border);
      box-shadow:
        0 10px 30px rgba(0, 0, 0, 0.10),
        inset 0 1px 1px rgba(255, 255, 255, 0.5);
    }
  }
  .comment-card:hover {
    transform: translateY(-0.5px);
    border-color: var(--color-border);
    outline-color: var(--color-border);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }

  /* ============================================================
     LIKED — border + outline section-colored
     ============================================================ */

 .comment-card[data-liked='true'] {
    border-color: var(--color-border);
    outline-color: var(--color-border);
  }


  /* ============================================================
     BODY
     ============================================================ */

  .comment-card__body {
    flex: 1;
    margin: 0;
    padding-left: 0.5em;
    text-indent: -0.5em;
    white-space: pre-line; /* honor explicit line breaks in comment.body */
  }

  .comment-card[data-size='sm'] .comment-card__body {
    font: var(--text-comment-body-sm-font);
    line-height: var(--line-height-normal);
  }
  .comment-card[data-size='lg'] .comment-card__body {
    font: var(--text-comment-body-lg-font);
    line-height: var(--line-height-normal);
  }
  

  .comment-card__body::before { content: '\201C'; }
  .comment-card__body::after  { content: '\201D'; }


  /* ============================================================
     FOCUS (keyboard)
     ============================================================ */

  .comment-card:focus-visible {
    outline: 2px solid var(--color-border);
    outline-offset: 4px;
  }


  /* ============================================================
     HEART (decorative indicator)
     ============================================================ */

 .comment-card__heart {
    display: block;
    flex-shrink: 0;

    /* Resting size — keeps the heart's natural proportions. */
    width: 32px;
    height: auto;

    transform: scale(1);
    transform-origin: center;

    transition:
      transform 200ms cubic-bezier(0.25, 1, 0.5, 1),
      color 200ms ease;
  }

  /* Hover (whether liked or not): grow uniformly, no distortion. */
  @media (hover: hover) {
    .comment-card:hover .comment-card__heart {
      transform: scale(1.1);
    }
  }

  .comment-card__heart-shape {
    fill: none;
    transition: fill 200ms ease, stroke 200ms ease;
  }

    .comment-card[data-liked='true'] .comment-card__heart-shape {
    fill: var(--color-border);
    stroke: var(--color-border);
  }

  /* ── Mobile (≤768px): Figma comment card — fill width, min 96h hug, 20 padding ── */
  @media (max-width: 768px) {
    .comment-card,
    .comment-card[data-size='sm'],
    .comment-card[data-size='lg'] {
      padding: var(--spacing-comment-card-padding);
      gap: var(--spacing-comment-card-inner-gap);
      height: auto;
      min-height: var(--spacing-comment-card-min-height);
      box-sizing: border-box;
      align-items: flex-start;
    }

    .comment-card__body {
      font: var(--text-comment-body-mobile-font);
      flex: 1;
      min-width: 0;
      max-width: var(--spacing-comment-body-max-width);
      overflow-wrap: break-word;
      /* Mobile: ignore desktop manual line breaks — let text reflow naturally. */
      white-space: normal;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
      line-clamp: 4;
      overflow: hidden;
    }

    .comment-card__heart {
      align-self: center;
      flex-shrink: 0;
      width: 32px;
    }
  }
</style>