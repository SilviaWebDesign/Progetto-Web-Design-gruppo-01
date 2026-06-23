<!--
  ============================================================
  TEXT BLOCK
  ============================================================
  Left column of a section topic: a small counter (e.g. "1/3"),
  the topic title, and the body paragraph.

  Purely presentational — driven entirely by props.

  NOTE: a `sources` prop is supported but optional and currently
  unused (no source data yet). When source lines are introduced,
  pass `sources` and it will render at the bottom of the column.
  The matching style is included (commented) below.
  ============================================================
-->

<script lang="ts">
  interface Props {
    /** Position indicator, e.g. "1/3". */
    counter: string;
    title: string;
    body: string;
    /** Optional attribution line; unused for now. */
    sources?: string;
  }

  let { counter, title, body, sources }: Props = $props();
</script>


<div class="text-block">
  <span class="text-block__counter">{counter}</span>
  <h2 class="text-block__title">{title}</h2>
  <p class="text-block__body">{body}</p>

  {#if sources}
    <span class="text-block__sources">— {sources}</span>
  {/if}
</div>


<style>
  .text-block {
    /* Fluid width: ~377px on the design viewport, clamped on small screens. */
    width: clamp(280px, 27.9vw, 377px);

    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: clamp(12px, 1.2vw, 16px);
  }

  .text-block__counter {
    font-family: var(--font-family-body);
    font-size: clamp(12px, 1.04vw, 14px);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--color-text-primary);
  }

  .text-block__title {
    margin: 0;
    font-family: var(--font-family-body);
    font-size: clamp(32px, 3.34vw, 45px);
    font-weight: 800;
    line-height: 1.1;
    color: var(--color-text-primary);
  }

  .text-block__body {
    margin: 0;
    font-family: var(--font-family-body);
    font-size: clamp(16px, 1.63vw, 22px);
    font-weight: 700;
    line-height: 1.5;
    color: var(--color-text-primary);
  }

  /* Sources style — predisposed for future use (currently no source data).
     Renders only when a `sources` prop is provided. */
  .text-block__sources {
    margin-top: auto; /* pin to the bottom of a taller column */
    font-family: var(--font-family-body);
    font-size: clamp(14px, 1.33vw, 18px);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-primary);
  }
</style>