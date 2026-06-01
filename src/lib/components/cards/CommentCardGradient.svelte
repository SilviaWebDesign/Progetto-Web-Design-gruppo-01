<!--
  ============================================================
  COMMENT CARD — GRADIENT VARIANT
  ============================================================
  A/B/C test counterpart.

  Identical props and behaviour, different visual style:
  - No external glow, no lift, no interior orb.
  - On hover (and liked), a radial gradient fills the card itself,
    starting from the section color and fading to transparent.
  - Only the heart button scales (bounce); the card stays still.
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
</script>


<article
  class="comment-card-gradient"
  data-section={sectionId}
  data-liked={liked}
  data-size={size}
>
  <p class="comment-card-gradient__body">{comment.body}</p>

  <button
    type="button"
    class="comment-card-gradient__like-button"
    aria-pressed={liked}
    aria-label={liked ? 'Rimuovi like dal commento' : 'Metti like al commento'}
    onclick={onToggleLike}
  >
    <svg
      class="comment-card-gradient__heart"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21.5117 0.5C33.109 0.5 42.5244 10.0547 42.5244 21.8574C42.5243 33.66 33.1089 43.2139 21.5117 43.2139C9.91479 43.2136 0.500153 33.6599 0.5 21.8574C0.5 10.0548 9.91469 0.500262 21.5117 0.5Z"
        stroke="currentColor"
      />
      <path
        class="comment-card-gradient__heart-shape"
        d="M12.4194 15.7227C14.8602 13.2819 18.8175 13.2819 21.2583 15.7227L22.1421 16.6066L23.026 15.7227C25.4668 13.2819 29.4241 13.2819 31.8649 15.7227C34.3055 18.1634 34.3056 22.1208 31.8649 24.5615L22.1421 34.2842L12.4194 24.5615C9.97876 22.1208 9.97896 18.1635 12.4194 15.7227Z"
        stroke="currentColor"
      />
    </svg>
  </button>
</article>


<style>
  /* ============================================================
     STRUCTURE
     ============================================================
     Card uses a layered background:
     - layer 1 (top): the radial color gradient (transparent in default)
     - layer 2 (bottom): the default translucent card color
     The top layer's opacity transitions for hover/liked.
     ============================================================ */

  .comment-card-gradient {
    position: relative;
    isolation: isolate;

    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    width: 100%;
    padding: var(--spacing-md);

    background-color: var(--color-background-card);
    border: var(--border-thin);
    border-radius: var(--radius-xs);
    color: var(--color-text-primary);

    /* Outline reserved for 2px appearance in active states. */
    outline: var(--border-width-thin) solid transparent;
    outline-offset: 0;

    transition:
      border-color 200ms ease,
      outline-color 200ms ease;

    overflow: hidden; /* Keep the inner gradient clipped to the rounded corners. */
  }

  /* --- Size variants --- */

  .comment-card-gradient[data-size='sm'] {
    max-width: 356px;
    min-height: 82px;
  }

  .comment-card-gradient[data-size='lg'] {
    max-width: 426px;
    min-height: 96px;
  }


  /* ============================================================
     GRADIENT LAYER (::before, behind content)
     ============================================================
     Radial gradient starts opaque on the left and fades to
     transparent toward the right.
     Hidden by default (opacity 0), visible on hover or liked.
     ============================================================ */

  .comment-card-gradient::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;

    border-radius: inherit;
    opacity: 0;
    transition: opacity 300ms ease;
    pointer-events: none;
  }

  /* Gradient per section: opaque section color on left, fading to right. */
  .comment-card-gradient[data-section='sustainability']::before {
    background: radial-gradient(
      ellipse 80% 200% at 0% 50%,
      var(--color-section-sustainability) 0%,
      rgba(255, 255, 255, 0) 100%
    );
  }
  .comment-card-gradient[data-section='sport']::before {
    background: radial-gradient(
      ellipse 80% 200% at 0% 50%,
      var(--color-section-sport) 0%,
      rgba(255, 255, 255, 0) 100%
    );
  }
  .comment-card-gradient[data-section='infrastructure']::before {
    background: radial-gradient(
      ellipse 80% 200% at 0% 50%,
      var(--color-section-infrastructure) 0%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  /* Reveal the gradient on hover or when liked. */
  .comment-card-gradient:hover::before,
  .comment-card-gradient[data-liked='true']::before {
    opacity: 1;
  }


  /* ============================================================
     ACTIVE STATES — border + outline take section color
     ============================================================ */

  .comment-card-gradient[data-section='sustainability']:hover,
  .comment-card-gradient[data-section='sustainability'][data-liked='true'] {
    border-color: var(--color-section-sustainability);
    outline-color: var(--color-section-sustainability);
  }
  .comment-card-gradient[data-section='sport']:hover,
  .comment-card-gradient[data-section='sport'][data-liked='true'] {
    border-color: var(--color-section-sport);
    outline-color: var(--color-section-sport);
  }
  .comment-card-gradient[data-section='infrastructure']:hover,
  .comment-card-gradient[data-section='infrastructure'][data-liked='true'] {
    border-color: var(--color-section-infrastructure);
    outline-color: var(--color-section-infrastructure);
  }


  /* ============================================================
     BODY TEXT
     ============================================================ */

  .comment-card-gradient__body {
    flex: 1;
    margin: 0;
  }

  .comment-card-gradient[data-size='sm'] .comment-card-gradient__body {
    font: var(--text-comment-body-sm-font);
  }

  .comment-card-gradient[data-size='lg'] .comment-card-gradient__body {
    font: var(--text-comment-body-lg-font);
  }

  .comment-card-gradient__body::before { content: '“'; }
  .comment-card-gradient__body::after  { content: '”'; }


  /* ============================================================
     LIKE BUTTON + HEART (the only thing that scales on hover)
     ============================================================ */

  .comment-card-gradient__like-button {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    padding: 0;

    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-primary);

    transition: transform 150ms ease;
  }

  .comment-card-gradient__like-button:hover,
  .comment-card-gradient__like-button:focus-visible {
    transform: scale(1.15);
  }

  .comment-card-gradient__like-button:active {
    transform: scale(0.92);
  }

  .comment-card-gradient__like-button:focus-visible {
    outline: 2px solid var(--color-border);
    outline-offset: 2px;
    border-radius: 50%;
  }

  .comment-card-gradient__heart {
    display: block;
    width: 100%;
    height: 100%;
    transition: color 200ms ease;
  }

  .comment-card-gradient__heart-shape {
    fill: none;
    transition: fill 200ms ease, stroke 200ms ease;
  }


  /* --- Heart fills with section color on liked --- */

  .comment-card-gradient[data-section='sustainability'][data-liked='true'] .comment-card-gradient__heart-shape {
    fill: var(--color-section-sustainability);
    stroke: var(--color-section-sustainability);
  }
  .comment-card-gradient[data-section='sport'][data-liked='true'] .comment-card-gradient__heart-shape {
    fill: var(--color-section-sport);
    stroke: var(--color-section-sport);
  }
  .comment-card-gradient[data-section='infrastructure'][data-liked='true'] .comment-card-gradient__heart-shape {
    fill: var(--color-section-infrastructure);
    stroke: var(--color-section-infrastructure);
  }
</style>