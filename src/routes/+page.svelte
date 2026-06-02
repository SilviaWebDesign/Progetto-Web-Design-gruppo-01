<script lang="ts">
  import SectionChoiceCard from '$lib/components/cards/SectionChoiceCard.svelte';
  import { sections } from '$lib/data/sections';
</script>


<header class="test-header">
  <h1>SectionChoiceCard — Fase D</h1>
  <p>
    Struttura base con 3D, titolo centrato e link dinamico.
    Hover effect in Fase E.
  </p>
</header>


<main class="card-grid">
  {#each sections as section (section.id)}
    <SectionChoiceCard {section} />
  {/each}
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

  .card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xl);
    align-items: flex-start;
  }
</style>