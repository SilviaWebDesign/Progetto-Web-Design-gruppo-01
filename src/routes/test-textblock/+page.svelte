<script lang="ts">
  import TextBlock from '$lib/components/section/TextBlock.svelte';
  import { getSectionById } from '$lib/data/sections';

  /* Pull the first topic of infrastructure for a realistic preview. */
  const section = getSectionById('infrastructure');
  const topic = section?.topics[0];
</script>


<main class="test">
  {#if topic}
    <TextBlock
      counter="1/3"
      title={topic.title}
      body={topic.description}
    />
  {:else}
    <p>Topic non trovato.</p>
  {/if}
</main>


<style>
  .test {
    min-height: 100vh;
    display: flex;
    align-items: center;
    /* Give the column some height so margin-top:auto on sources is visible. */
    padding: var(--spacing-3xl) var(--spacing-xl);
  }

  /* Force a tall container to preview the bottom-aligned sources. */
  .test :global(.text-block) {
    min-height: 419px;
  }
</style>