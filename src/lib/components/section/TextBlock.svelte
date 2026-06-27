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
    font-family: var(--font-family-body);
    font-size: 14px;
    font-weight: var(--font-weight-bold);       /* 700 */
    color: var(--color-text-primary);

    margin-bottom: var(--spacing-xl);            /* 40px gap to the title */
  }

  .text-block__title {
    margin: 0 0 var(--spacing-xs);               /* 40px gap to the body */
    font-family: var(--font-family-body);
    font-size: 45px;
    font-weight: var(--font-weight-extrabold);   /* 800 */
    line-height: var(--line-height-tight);       /* 110% */
    color: var(--color-text-primary);
  }

  .text-block__body {
    margin: 0 0 var(--spacing-xl);               /* 40px gap to the sources */
    font-family: var(--font-family-body);
    font-size: 22px;
    font-weight: var(--font-weight-bold);        /* 700 */
    line-height: var(--line-height-tight);       /* 110% */
    color: var(--color-text-primary);
  }

  .text-block__sources {
    margin: 0;
    font-family: var(--font-family-body);
    font-size: 18px;
    font-weight: var(--font-weight-bold);        /* 700 */
    text-transform: uppercase;
    color: var(--color-text-primary);
  }

  .text-block__source {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  .text-block__source:hover,
  .text-block__source:focus-visible {
    text-decoration-thickness: 2px;
  }
</style>