<script lang="ts">
  import CommentCard from '$lib/components/cards/CommentCard.svelte';
  import { sustainabilitySection } from '$lib/data/sustainability';

  /* Pull all 4 comments from the first topic of sustainability. */
  const topic = sustainabilitySection.topics[0];
  const comments = topic.comments;

  /* One like state per card, keyed by size + comment id. */
  let likes = $state<Record<string, boolean>>({});

  function toggleLike(key: string) {
    return () => {
      likes[key] = !likes[key];
    };
  }
</script>


<header class="test-header">
  <h1>Test CommentCard — Fase B.1</h1>
  <p>
    Hover → glow del colore della sezione. Click cuore → border e cuore
    si tingono del colore della sezione. Sfondo di test colorato per
    valutare la translucenza della card.
  </p>
</header>


<main class="test-layout">

  <section class="card-stack">
    <h2>Size <code>sm</code> (356 × 82)</h2>
    {#each comments as comment (comment.id)}
      <CommentCard
        {comment}
        sectionId="sustainability"
        size="sm"
        liked={likes[`sm-${comment.id}`] ?? false}
        onToggleLike={toggleLike(`sm-${comment.id}`)}
      />
    {/each}
  </section>

  <section class="card-stack">
    <h2>Size <code>lg</code> (426 × 96)</h2>
    {#each comments as comment (comment.id)}
      <CommentCard
        {comment}
        sectionId="sustainability"
        size="lg"
        liked={likes[`lg-${comment.id}`] ?? false}
        onToggleLike={toggleLike(`lg-${comment.id}`)}
      />
    {/each}
  </section>

</main>


<style>
  /* ============================================================
     TEST PAGE — coloured backdrop to evaluate glass feel
     ============================================================ */

  :global(body) {
  /* Snow mountain background at 25% opacity to simulate the final design.
     The white base underneath keeps text readable while the mountain
     adds depth and a non-flat backdrop to evaluate the card's translucency. */
  background-color: var(--color-background-page);
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.75)),
    url('/images/mountain-test-bg.avif');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;

  min-height: 100vh;
  padding: var(--spacing-xl);
}

  .test-header {
    margin-bottom: var(--spacing-2xl);
    max-width: 720px;
  }

  .test-header h1 {
    font: var(--text-header-font);
    margin-bottom: var(--spacing-sm);
  }

  .test-header p {
    color: var(--color-text-secondary);
    margin: 0;
  }

  .test-layout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xl);
    align-items: flex-start;
  }

  .card-stack {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl); /* 40px ≈ requested 35 */
  }

  .card-stack h2 {
    font: var(--text-header-font);
    margin-bottom: var(--spacing-sm);
  }

  code {
    font-family: monospace;
    background: rgba(255, 255, 255, 0.6);
    padding: 0 var(--spacing-3xs);
    border-radius: var(--radius-xs);
  }
</style>