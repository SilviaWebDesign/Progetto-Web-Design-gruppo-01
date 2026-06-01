<!--
  ============================================================
  COMMENT CARD — GLASS VARIANT
  ============================================================
  A/B test counterpart of CommentCard.svelte.

  Identical props and behaviour, different visual style:
  - true glass with backdrop-filter blur
  - persistent interior "glow orb" of section color
  - micro-lift on hover (-1px translateY)
  - liked state still uses border + filled heart

  When the design choice is made, the loser will be deleted.
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


<div class="glass-wrapper" data-section={sectionId} data-size={size}>
  <!-- Interior glow orb (persistent) -->
  <div class="glass-wrapper__orb" aria-hidden="true"></div>

  <article
    class="comment-card-glass"
    data-section={sectionId}
    data-liked={liked}
  >
    <p class="comment-card-glass__body">{comment.body}</p>

    <button
      type="button"
      class="comment-card-glass__like-button"
      aria-pressed={liked}
      aria-label={liked ? 'Rimuovi like dal commento' : 'Metti like al commento'}
      onclick={onToggleLike}
    >
      <svg
        class="comment-card-glass__heart"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          class="comment-card-glass__heart-circle"
          d="M21.5117 0.5C33.109 0.5 42.5244 10.0547 42.5244 21.8574C42.5243 33.66 33.1089 43.2139 21.5117 43.2139C9.91479 43.2136 0.500153 33.6599 0.5 21.8574C0.5 10.0548 9.91469 0.500262 21.5117 0.5Z"
          stroke="currentColor"
        />
        <path
          class="comment-card-glass__heart-shape"
          d="M12.4194 15.7227C14.8602 13.2819 18.8175 13.2819 21.2583 15.7227L22.1421 16.6066L23.026 15.7227C25.4668 13.2819 29.4241 13.2819 31.8649 15.7227C34.3055 18.1634 34.3056 22.1208 31.8649 24.5615L22.1421 34.2842L12.4194 24.5615C9.97876 22.1208 9.97896 18.1635 12.4194 15.7227Z"
          stroke="currentColor"
        />
      </svg>
    </button>
  </article>
</div>


<style>
  /* ============================================================
     WRAPPER — provides stacking context for orb + card layering
     ============================================================ */

  .glass-wrapper {
    position: relative;
    width: 100%;
    isolation: isolate;
  }

  .glass-wrapper[data-size='sm'] {
    max-width: 356px;
  }

  .glass-wrapper[data-size='lg'] {
    max-width: 426px;
  }


  /* ============================================================
     GLOW ORB — persistent interior light, section-colored
     ============================================================
     Always visible, sitting behind the card to give a sense of
     internal illumination through the glass surface.
     ============================================================ */

  .glass-wrapper__orb {
    position: absolute;
    inset: 0;
    z-index: 0;

    border-radius: var(--radius-xs);
    filter: blur(30px);

    /* Hidden by default; revealed on hover or when liked. */
    opacity: 0;

    pointer-events: none;
    transition: opacity 300ms ease;
  }

 /* Single neutral white orb — same for all sections.
     The section color is signalled by border + outline + heart + shadow,
     while the orb provides a soft, neutral inner glow that doesn't tint
     the card with the section hue. */
  .glass-wrapper__orb {
    background: radial-gradient(
      ellipse 100% 80% at center,
      rgba(255, 255, 255, 0.50) 18%,
      rgba(255, 255, 255, 0.20) 65%,
      rgba(255, 255, 255, 0)   100%
    );
  }


  /* ============================================================
     CARD — true glass on top of the orb
     ============================================================ */

  .comment-card-glass {
    position: relative;
    z-index: 1;

    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    width: 100%;
    padding: var(--spacing-md);

    /* True glassmorphism. */
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    border: var(--border-thin);
    border-radius: var(--radius-xs);
    color: var(--color-text-primary);

    /* Transparent outline reserved for hover/liked (visual 2px without layout shift). */
    outline: var(--border-width-thin) solid transparent;
    outline-offset: 0;

    /* Subtle inner highlight to enhance glass feel. */
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.08),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);

    transition:
      transform 300ms cubic-bezier(0.25, 1, 0.5, 1),
      background 300ms ease,
      border-color 200ms ease,
      outline-color 200ms ease,
      box-shadow 300ms ease;
  }

  .glass-wrapper[data-size='sm'] .comment-card-glass {
    min-height: 82px;
  }

  .glass-wrapper[data-size='lg'] .comment-card-glass {
    min-height: 96px;
  }


  /* ============================================================
     HOVER STATE
     ============================================================
     - Background brightens slightly.
     - Border takes section color.
     - Micro-lift (-1px translateY).
     - Outer shadow intensifies softly.
     ============================================================ */

   .glass-wrapper:hover .glass-wrapper__orb,
  .glass-wrapper:has(.comment-card-glass[data-liked='true']) .glass-wrapper__orb {
    opacity: 1;
  }

  .comment-card-glass[data-section='sustainability']:hover {
    border-color: var(--color-section-sustainability);
    outline-color: var(--color-section-sustainability);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 40px rgba(71, 208, 142, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }
  .comment-card-glass[data-section='sport']:hover {
    border-color: var(--color-section-sport);
    outline-color: var(--color-section-sport);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 40px rgba(137, 186, 255, 0.30),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }
  .comment-card-glass[data-section='infrastructure']:hover {
    border-color: var(--color-section-infrastructure);
    outline-color: var(--color-section-infrastructure);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 40px rgba(255, 131, 76, 0.28),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }


  /* ============================================================
     LIKED STATE — border colored, heart filled
     ============================================================ */

  .comment-card-glass[data-section='sustainability'][data-liked='true'] {
    border-color: var(--color-section-sustainability);
    outline-color: var(--color-section-sustainability);
  }
  .comment-card-glass[data-section='sport'][data-liked='true'] {
    border-color: var(--color-section-sport);
    outline-color: var(--color-section-sport);
  }
  .comment-card-glass[data-section='infrastructure'][data-liked='true'] {
    border-color: var(--color-section-infrastructure);
    outline-color: var(--color-section-infrastructure);
  }


  /* ============================================================
     BODY TEXT
     ============================================================ */

  .comment-card-glass__body {
    flex: 1;
    margin: 0;
  }

  .glass-wrapper[data-size='sm'] .comment-card-glass__body {
    font: var(--text-comment-body-sm-font);
  }

  .glass-wrapper[data-size='lg'] .comment-card-glass__body {
    font: var(--text-comment-body-lg-font);
  }

  .comment-card-glass__body::before { content: '“'; }
  .comment-card-glass__body::after  { content: '”'; }


  /* ============================================================
     LIKE BUTTON + HEART
     ============================================================ */

  .comment-card-glass__like-button {
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

  .comment-card-glass__like-button:hover,
  .comment-card-glass__like-button:focus-visible {
    transform: scale(1.08);
  }

  .comment-card-glass__like-button:active {
    transform: scale(0.92);
  }

  .comment-card-glass__like-button:focus-visible {
    outline: 2px solid var(--color-border);
    outline-offset: 2px;
    border-radius: 50%;
  }

  .comment-card-glass__heart {
    display: block;
    width: 100%;
    height: 100%;
    transition: color 200ms ease;
  }

  .comment-card-glass__heart-shape {
    fill: none;
    transition: fill 200ms ease, stroke 200ms ease;
  }


  /* --- Heart fills with section color on liked --- */

  .comment-card-glass[data-section='sustainability'][data-liked='true'] .comment-card-glass__heart-shape {
    fill: var(--color-section-sustainability);
    stroke: var(--color-section-sustainability);
  }
  .comment-card-glass[data-section='sport'][data-liked='true'] .comment-card-glass__heart-shape {
    fill: var(--color-section-sport);
    stroke: var(--color-section-sport);
  }
  .comment-card-glass[data-section='infrastructure'][data-liked='true'] .comment-card-glass__heart-shape {
    fill: var(--color-section-infrastructure);
    stroke: var(--color-section-infrastructure);
  }
</style>