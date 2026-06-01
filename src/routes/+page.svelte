<script lang="ts">
  import CommentCard from '$lib/components/cards/CommentCard.svelte';
  import CommentCardGlass from '$lib/components/cards/CommentCardGlass.svelte';
  import CommentCardGradient from '$lib/components/cards/CommentCardGradient.svelte';
  import { sustainabilitySection } from '$lib/data/sustainability';

  const comments = sustainabilitySection.topics[0].comments;

  let likes = $state<Record<string, boolean>>({});

  function toggleLike(key: string) {
    return () => {
      likes[key] = !likes[key];
    };
  }
</script>


<header class="test-header">
  <h1>CommentCard — confronto A / B / C</h1>
  <p>
    Tre varianti dello stesso componente, identico comportamento,
    diverso effetto di hover / liked.
  </p>
</header>


<main class="test-layout">

  <section class="card-stack">
    <h2>A — Glow esterno</h2>
    {#each comments as comment (comment.id)}
      <CommentCard
        {comment}
        sectionId="sustainability"
        size="sm"
        liked={likes[`a-${comment.id}`] ?? false}
        onToggleLike={toggleLike(`a-${comment.id}`)}
      />
    {/each}
  </section>

  <section class="card-stack">
    <h2>B — Glass + orb + lift</h2>
    {#each comments as comment (comment.id)}
      <CommentCardGlass
        {comment}
        sectionId="sustainability"
        size="sm"
        liked={likes[`b-${comment.id}`] ?? false}
        onToggleLike={toggleLike(`b-${comment.id}`)}
      />
    {/each}
  </section>

  <section class="card-stack">
    <h2>C — Gradient interno + cuore</h2>
    {#each comments as comment (comment.id)}
      <CommentCardGradient
        {comment}
        sectionId="sustainability"
        size="sm"
        liked={likes[`c-${comment.id}`] ?? false}
        onToggleLike={toggleLike(`c-${comment.id}`)}
      />
    {/each}
  </section>

</main>


<style>
  :global(body) {
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
    gap: var(--spacing-xl);
  }

  .card-stack h2 {
    font: var(--text-header-font);
    margin-bottom: var(--spacing-sm);
  }
</style>