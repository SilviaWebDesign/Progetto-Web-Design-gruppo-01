<!--
  ============================================================
  TEXT BLOCK
  ============================================================
  Left column of a section topic: a small counter (e.g. "1 / 3"),
  the topic title, the body paragraph, and the source links.

  Purely presentational — driven entirely by props.

  Fixed-size design (matches Figma on the 1512px reference): the
  block is 437px wide and grows to fit its content up to 500px tall.
  Like the comment cards, it uses fixed px so the stacked text stays
  legible and compact at any viewport width.
  ============================================================
-->

<script lang="ts">
  import type { Source } from '$lib/types';

  interface Props {
    /** Position indicator, e.g. "1 / 3". */
    counter: string;
    title: string;
    body: string;
    /** External sources shown at the bottom (may be empty). */
    sources: Source[];
  }

  let { counter, title, body, sources }: Props = $props();
</script>


<div class="text-block">
  <span class="text-block__counter">{counter}</span>
  <h2 class="text-block__title">{title}</h2>
  <p class="text-block__body">{body}</p>

{#if sources.length > 0}
    <p class="text-block__sources">
    -
      {#each sources as source, i (source.url)}
        {#if i > 0}, {/if}
        <a class="text-block__source" href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>
      {/each}
    </p>
  {/if}
</div>


<style>
  .text-block {
    width: 437px;
    max-height: 500px;

    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .text-block__counter {
    font: var(--text-section-topic-counter-font);
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-xl);
  }

  .text-block__title {
    margin: 0 0 var(--spacing-xs);
    font: var(--text-section-topic-title-font);
    color: var(--color-text-primary);
  }

  .text-block__body {
    margin: 0 0 var(--spacing-xl);
    font: var(--text-section-topic-body-font);
    color: var(--color-text-primary);
  }

  .text-block__sources {
    margin: 0;
    font: var(--text-section-topic-sources-font);
    text-transform: var(--text-section-topic-sources-text-transform);
    color: var(--color-text-primary);
  }

  .text-block__source {
    display: inline-block; /* so the hover scale can apply */
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    transition: transform 0.2s ease;
  }

  .text-block__source:hover,
  .text-block__source:focus-visible {
    transform: scale(1.05); /* same grow-on-hover as the CTAs */
    text-decoration-thickness: 2px;
  }
</style>