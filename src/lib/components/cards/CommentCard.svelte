<!--
  ============================================================
  COMMENT CARD
  ============================================================
  A single opinion comment with a like button.

  - Likes are owned by the parent (controlled component).
  - Themed by `sectionId` (drives hover gradient + liked color).
  - Two sizes via `size` prop: 'sm' (356x82, 14px body) or
    'lg' (426x96, 18px body).

  States:
  - default: translucent card, 1px border, outlined heart.
  - hover:   section-color radial gradient appears, smooth fade.
  - liked:   filled heart in section color, 2px border (visual,
             no layout shift).
  ============================================================
-->

<script lang="ts">
  import type { Comment, SectionId } from '$lib/types';

  /* --- Props --- */

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
  class="comment-card"
  data-section={sectionId}
  data-liked={liked}
  data-size={size}
>
  <p class="comment-card__body">{comment.body}</p>

  <button
    type="button"
    class="comment-card__like-button"
    aria-pressed={liked}
    aria-label={liked ? 'Rimuovi like dal commento' : 'Metti like al commento'}
    onclick={onToggleLike}
  >
    <svg
      class="comment-card__heart"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <!-- Circle outline -->
      <path
        class="comment-card__heart-circle"
        d="M21.5117 0.5C33.109 0.5 42.5244 10.0547 42.5244 21.8574C42.5243 33.66 33.1089 43.2139 21.5117 43.2139C9.91479 43.2136 0.500153 33.6599 0.5 21.8574C0.5 10.0548 9.91469 0.500262 21.5117 0.5Z"
        stroke="currentColor"
      />
      <!-- Heart: stroke when default, fill when liked -->
      <path
        class="comment-card__heart-shape"
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
     Border is ALWAYS 2px. Default state hides 1px by overlaying
     a 1px transparent "inner" via background-clip trick — but
     a simpler approach: just keep border at 2px always, and
     use --color-border (black) when not liked. The card is
     1px "bigger" than the original 1px design, but this is
     imperceptible and we gain zero-layout-shift transitions.

     We accept the 1px extra as a minor compromise for stability.
     ============================================================ */

  .comment-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    width: 100%;
    padding: var(--spacing-md);

    background-color: var(--color-background-card);

    /* Border is always 1px. The "thicker" hover/liked appearance is
       achieved by adding a 1px outline (sits OUTSIDE the box, no shift). */
    border: var(--border-thin);
    border-radius: var(--radius-xs);
    color: var(--color-text-primary);

    /* Default outline is transparent — becomes visible on hover/liked. */
    outline: var(--border-width-thin) solid transparent;
    outline-offset: 0;

    transition:
      box-shadow 300ms ease,
      border-color 200ms ease,
      outline-color 200ms ease;
  }

  /* --- Size variants --- */

  .comment-card[data-size='sm'] {
    max-width: 356px;
    min-height: 82px;
  }

  .comment-card[data-size='lg'] {
    max-width: 426px;
    min-height: 96px;
  }


  /* ============================================================
     HOVER STATE
     ============================================================
     - Border + outline both take the section color (visually 2px).
     - Soft diffuse glow in the section color.
     ============================================================ */

  .comment-card[data-section='sustainability']:hover {
    border-color: var(--color-section-sustainability);
    outline-color: var(--color-section-sustainability);
    box-shadow: 0 0 40px 8px var(--color-section-sustainability);
  }
  .comment-card[data-section='sport']:hover {
    border-color: var(--color-section-sport);
    outline-color: var(--color-section-sport);
    box-shadow: 0 0 40px 8px var(--color-section-sport);
  }
  .comment-card[data-section='infrastructure']:hover {
    border-color: var(--color-section-infrastructure);
    outline-color: var(--color-section-infrastructure);
    box-shadow: 0 0 40px 8px var(--color-section-infrastructure);
  }


  /* ============================================================
     LIKED STATE
     ============================================================
     Border + outline both section-colored (visually 2px).
     No glow when only liked (only on hover).
     ============================================================ */

  .comment-card[data-section='sustainability'][data-liked='true'] {
    border-color: var(--color-section-sustainability);
    outline-color: var(--color-section-sustainability);
  }
  .comment-card[data-section='sport'][data-liked='true'] {
    border-color: var(--color-section-sport);
    outline-color: var(--color-section-sport);
  }
  .comment-card[data-section='infrastructure'][data-liked='true'] {
    border-color: var(--color-section-infrastructure);
    outline-color: var(--color-section-infrastructure);
  }


  /* ============================================================
     BODY TEXT
     ============================================================ */

  .comment-card__body {
    flex: 1;
    margin: 0;
  }

  .comment-card[data-size='sm'] .comment-card__body {
    font: var(--text-comment-body-sm-font);
  }

  .comment-card[data-size='lg'] .comment-card__body {
    font: var(--text-comment-body-lg-font);
  }

  .comment-card__body::before { content: '“'; }
  .comment-card__body::after  { content: '”'; }


  /* ============================================================
     LIKE BUTTON + HEART
     ============================================================ */

  .comment-card__like-button {
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

  .comment-card__like-button:hover,
  .comment-card__like-button:focus-visible {
    transform: scale(1.08);
  }

  .comment-card__like-button:active {
    transform: scale(0.92);
  }

  .comment-card__like-button:focus-visible {
    outline: 2px solid var(--color-border);
    outline-offset: 2px;
    border-radius: 50%;
  }

  .comment-card__heart {
    display: block;
    width: 100%;
    height: 100%;
    transition: color 200ms ease;
  }

  .comment-card__heart-shape {
    fill: none;
    transition: fill 200ms ease, stroke 200ms ease;
  }


  /* ============================================================
     LIKED VARIANTS — heart fills with section color
     ============================================================ */

  .comment-card[data-section='sustainability'][data-liked='true'] .comment-card__heart-shape {
    fill: var(--color-section-sustainability);
    stroke: var(--color-section-sustainability);
  }
  .comment-card[data-section='sport'][data-liked='true'] .comment-card__heart-shape {
    fill: var(--color-section-sport);
    stroke: var(--color-section-sport);
  }
  .comment-card[data-section='infrastructure'][data-liked='true'] .comment-card__heart-shape {
    fill: var(--color-section-infrastructure);
    stroke: var(--color-section-infrastructure);
  }
</style>