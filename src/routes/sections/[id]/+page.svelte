<!--
  ============================================================
  SECTION PAGE — [id] dynamic route
  ============================================================
  Serves all three sections (sustainability, sport, infrastructure)
  from a single template. The actual section data comes from the
  load function in +page.ts, validated against the URL [id].

  This is currently a minimal skeleton showing only the title.
  Scenes (frost + title, intro phrase, 3D, topics) will be built
  in subsequent steps.
  ============================================================
-->

<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  /* The validated section object from the load function. */
  let section = $derived(data.section);
</script>


<svelte:head>
  <title>{section.title} — Quante facce ha una medaglia?</title>
</svelte:head>


<main class="section-page">
  <p class="debug">Route funzionante. Sezione caricata:</p>
  <h1 class="section-page__title" data-section={section.id}>
    {section.title}
  </h1>
  <p class="debug">id: <code>{section.id}</code></p>
  <p class="debug">topics: <code>{section.topics.length}</code></p>
</main>


<style>
  .section-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-xl);
    text-align: center;
  }

  .section-page__title {
    font: var(--text-section-title-default-font, 700 120px/1 sans-serif);
    text-transform: uppercase;
  }

  /* Color the title by section, just to verify data binding works. */
  .section-page__title[data-section='sustainability'] { color: var(--color-section-sustainability); }
  .section-page__title[data-section='sport']          { color: var(--color-section-sport); }
  .section-page__title[data-section='infrastructure'] { color: var(--color-section-infrastructure); }

  .debug {
    color: var(--color-text-secondary);
    font-size: 14px;
  }

  .debug code {
    background: var(--neutral-100);
    padding: 2px 6px;
    border-radius: 4px;
  }
</style>