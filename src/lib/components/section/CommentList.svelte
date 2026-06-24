<!--
  ============================================================
  COMMENT LIST
  ============================================================
  Vertical stack of CommentCards for a single topic. Receives
  the topic's comments and a map of liked states, and reports
  like toggles back to the parent via onToggleLike(id).

  The parent owns the liked state (it feeds the opinion
  algorithm), so this component is purely a presentational
  list that renders and forwards events.
  ============================================================
-->

<script lang="ts">
  import CommentCard from '$lib/components/cards/CommentCard.svelte';
  import type { Comment, SectionId } from '$lib/types';

  interface Props {
    comments: Comment[];
    sectionId: SectionId;
    /** Map of comment id → liked boolean. */
    likes: Record<string, boolean>;
    onToggleLike: (id: string) => void;
  }

  let { comments, sectionId, likes, onToggleLike }: Props = $props();
</script>


<div class="comment-list">
  {#each comments as comment (comment.id)}
    <CommentCard
      {comment}
      {sectionId}
      liked={likes[comment.id] ?? false}
      onToggleLike={() => onToggleLike(comment.id)}
      size="sm"
    />
  {/each}
</div>


<style>
  .comment-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>