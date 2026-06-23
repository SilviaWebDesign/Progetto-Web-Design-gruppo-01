<script lang="ts">
  import CommentCard from '$lib/components/cards/CommentCard.svelte';
  import { getSectionById } from '$lib/data/sections';

  /* Real comments from the first infrastructure topic. */
  const section = getSectionById('infrastructure');
  const comments = section?.topics[0].comments ?? [];

  /* Track liked state per comment id. */
  let likes = $state<Record<string, boolean>>({});

  function toggleLike(id: string) {
    return () => {
      likes[id] = !likes[id];
    };
  }
</script>


<main class="test">
  <h1>Test CommentCard</h1>
  <p class="hint">
    Clicca ovunque su una card per mettere/togliere like. Hover per lo sweep.
  </p>

  <div class="stack">
    {#each comments as comment (comment.id)}
      <CommentCard
        {comment}
        sectionId="infrastructure"
        liked={likes[comment.id] ?? false}
        onToggleLike={toggleLike(comment.id)}
        size="sm"
      />
    {/each}
  </div>
</main>


<style>
  :global(body) {
    /* Light snowy backdrop to evaluate the glass against a real-ish scene. */
    background-color: var(--color-background-page);
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.72)),
      url('/images/mountain-test-bg.avif');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
  }

  .test {
    min-height: 100vh;
    padding: var(--spacing-3xl) var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .test h1 {
    font: var(--text-header-font);
    margin: 0;
  }

  .hint {
    color: var(--color-text-secondary);
    margin: 0 0 var(--spacing-lg) 0;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>