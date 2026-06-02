<script lang="ts">
  import SectionChoiceCard from '$lib/components/cards/SectionChoiceCard.svelte';
  import CommentCardGlass from '$lib/components/cards/CommentCardGlass.svelte';
  import { sections } from '$lib/data/sections';
  import { sustainabilitySection } from '$lib/data/sustainability';

  /* Comments from the first sustainability topic (to test alongside cards). */
  const comments = sustainabilitySection.topics[0].comments;

  /* Like state for the comment cards. */
  let likes = $state<Record<string, boolean>>({});

  function toggleLike(key: string) {
    return () => {
      likes[key] = !likes[key];
    };
  }
</script>


<header class="test-header">
  <h1>Confronto coerenza visiva</h1>
  <p>
    Sopra: le 3 SectionChoiceCard. Sotto: 4 CommentCardGlass dello stesso
    tema (sostenibilità). Hover su entrambe per valutare la coerenza
    cromatica e di effetti.
  </p>
</header>


<section class="block">
  <h2>SectionChoiceCard (home)</h2>

  <div class="card-grid">
    {#each sections as section (section.id)}
      <SectionChoiceCard {section} />
    {/each}
  </div>
</section>


<section class="block">
  <h2>CommentCardGlass (sostenibilità, primo topic)</h2>

  <div class="card-stack">
    {#each comments as comment (comment.id)}
      <CommentCardGlass
        {comment}
        sectionId="sustainability"
        size="sm"
        liked={likes[comment.id] ?? false}
        onToggleLike={toggleLike(comment.id)}
      />
    {/each}
  </div>
</section>


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

  .block {
    margin-bottom: var(--spacing-2xl);
  }

  .block > h2 {
    font: var(--text-header-font);
    margin: 0 0 var(--spacing-md) 0;
  }

  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xl);
    align-items: flex-start;
  }

  .card-stack {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
    max-width: 356px;
  }
</style>