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
    viewBox="10 12 24 24"
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
    gap: var(--spacing-md);

    width: 100%;
    padding: var(--spacing-md);

    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    border: var(--border-thin);
    border-radius: var(--radius-xs);
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

  .comment-card[data-size='sm'] { max-width: 356px; min-height: 82px; }
  .comment-card[data-size='lg'] { max-width: 426px; min-height: 96px; }


  /* ============================================================
     ANIMATED SWEEP GRADIENT (::before)
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
    filter: blur(20px);

    background-size: 300% 100%;
    background-position: 100% 50%;
    background-repeat: no-repeat;
  }

  .comment-card[data-section='sustainability']::before {
    background-image: linear-gradient(
      to right,
      var(--color-section-sustainability) 0%,
      rgba(255, 255, 255, 0) 50%
    );
  }
  .comment-card[data-section='sport']::before {
    background-image: linear-gradient(
      to right,
      var(--color-section-sport) 0%,
      rgba(255, 255, 255, 0) 50%
    );
  }
  .comment-card[data-section='infrastructure']::before {
    background-image: linear-gradient(
      to right,
      var(--color-section-infrastructure) 0%,
      rgba(255, 255, 255, 0) 50%
    );
  }

  .comment-card:hover::before {
    opacity: 1;
    animation: sweep 800ms cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }

  .comment-card[data-liked='true']::before {
    opacity: 0.6;
    background-position: 50% 50%;
  }

  @keyframes sweep {
    from { background-position: 100% 50%; }
    to   { background-position: 0% 50%; }
  }


  /* ============================================================
     HOVER — lift, border, outline, glow
     ============================================================ */

  .comment-card:hover { transform: translateY(-1px); }

  .comment-card[data-section='sustainability']:hover {
    border-color: var(--color-section-sustainability);
    outline-color: var(--color-section-sustainability);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 24px rgba(71, 208, 142, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }
  .comment-card[data-section='sport']:hover {
    border-color: var(--color-section-sport);
    outline-color: var(--color-section-sport);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 24px rgba(137, 186, 255, 0.30),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }
  .comment-card[data-section='infrastructure']:hover {
    border-color: var(--color-section-infrastructure);
    outline-color: var(--color-section-infrastructure);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 24px rgba(255, 131, 76, 0.28),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }


  /* ============================================================
     LIKED — border + outline section-colored
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
     BODY
     ============================================================ */

  .comment-card__body { flex: 1; margin: 0; }

  .comment-card[data-size='sm'] .comment-card__body {
    font: var(--text-comment-body-sm-font);
  }
  .comment-card[data-size='lg'] .comment-card__body {
    font: var(--text-comment-body-lg-font);
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
    width: 36px;
    height: 36px;
    transition: color 200ms ease;
  }

  .comment-card__heart-shape {
    fill: none;
    transition: fill 200ms ease, stroke 200ms ease;
  }

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