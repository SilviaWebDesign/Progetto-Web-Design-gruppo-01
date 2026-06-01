<!--
  ============================================================
  COMMENT CARD
  ============================================================
  A single opinion comment with a like button. Likes are
  owned by the parent (controlled component pattern): the
  parent passes `liked` and reacts to `onToggleLike`.

  The card is themed via the `sectionId` prop, which drives
  the hover gradient color and the liked heart color.

  Sizing: full-width up to 356px, scales down gracefully
  for mobile (responsive details refined later).
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
  }

  let { comment, sectionId, liked, onToggleLike }: Props = $props();
</script>


<article
  class="comment-card"
  data-section={sectionId}
  data-liked={liked}
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
      <!-- Heart shape (filled or outlined based on liked state) -->
      <path
        class="comment-card__heart-shape"
        d="M12.4194 15.7227C14.8602 13.2819 18.8175 13.2819 21.2583 15.7227L22.1421 16.6066L23.026 15.7227C25.4668 13.2819 29.4241 13.2819 31.8649 15.7227C34.3055 18.1634 34.3056 22.1208 31.8649 24.5615L22.1421 34.2842L12.4194 24.5615C9.97876 22.1208 9.97896 18.1635 12.4194 15.7227Z"
        stroke="currentColor"
        fill="none"
      />
    </svg>
  </button>
</article>


<style>

  .comment-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    width: 100%;
    max-width: 356px;
    min-height: 82px;
    padding: var(--spacing-md);

    background-color: var(--color-background-card);
    border: var(--border-thin);
    border-radius: var(--radius-xs);
    color: var(--color-text-primary);
  }

  .comment-card__body {
    flex: 1;
    margin: 0;
    font: var(--text-comment-body-font);
  }

  /* Quotes are added visually via pseudo-elements, keeping
     the data clean (no quotes stored in comment.body). */
  .comment-card__body::before {
    content: '“';
  }
  .comment-card__body::after {
    content: '”';
  }

  .comment-card__like-button {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    padding: 0;

    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-primary);
  }

  .comment-card__heart {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>