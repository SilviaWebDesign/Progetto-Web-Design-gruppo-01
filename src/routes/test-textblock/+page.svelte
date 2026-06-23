<script lang="ts">
  import TextBlock from '$lib/components/section/TextBlock.svelte';
  import { getSectionById } from '$lib/data/sections';

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
    padding: var(--spacing-3xl) var(--spacing-xl);
  }
</style>