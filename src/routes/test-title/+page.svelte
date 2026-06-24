<script lang="ts">
  import { sections } from '$lib/data/sections';

  /* Letter-spacing per section (from Figma / our text-style tokens):
     sustainability 7%, sport 88%, infrastructure 0%. Expressed in em. */
  const letterSpacing: Record<string, string> = {
    sustainability: '0.07em',
    sport: '0.88em',
    infrastructure: '0em'
  };

  /* Split a title into individual letters for the flexbox approach. */
  function letters(title: string): string[] {
    return title.toUpperCase().split('');
  }
</script>


<main class="compare">
  {#each sections as section (section.id)}
    <section class="block">
      <p class="block__label">
        {section.id} — letter-spacing {letterSpacing[section.id]}
      </p>

      <!-- APPROACH A: fixed font-size + per-section letter-spacing (Figma) -->
      <p class="variant-label">A — letter-spacing fisso (Figma)</p>
      <div class="title-frame">
        <h1
          class="title-a"
          style="letter-spacing: {letterSpacing[section.id]}"
        >
          {section.title.toUpperCase()}
        </h1>
      </div>

      <!-- APPROACH B: flexbox spread (letters to exact edges) -->
      <p class="variant-label">B — flexbox spread (bordi esatti)</p>
      <div class="title-frame">
        <h1 class="title-b" aria-label={section.title}>
          {#each letters(section.title) as letter, i (i)}
            <span aria-hidden="true">{letter}</span>
          {/each}
        </h1>
      </div>
    </section>
  {/each}
</main>


<style>
  .compare {
    padding: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3xl);
  }

  .block__label {
    font-family: var(--font-family-body);
    font-weight: 700;
    font-size: 14px;
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0 0 var(--spacing-md) 0;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--spacing-xs);
  }

  .variant-label {
    font-family: var(--font-family-body);
    font-size: 12px;
    color: var(--color-text-muted);
    margin: var(--spacing-md) 0 var(--spacing-2xs) 0;
  }

  /* The frame represents the full screen width, so we can see whether
     letters reach the edges. */
  .title-frame {
    width: 100%;
    outline: 1px dashed var(--color-text-muted);
    overflow: hidden;
  }

  /* ---- Approach A: fixed size + letter-spacing ---- */
  .title-a {
    margin: 0;
    font-family: var(--font-family-display);
    font-weight: 700;
    font-variation-settings: 'wght' 700;
    font-size: clamp(48px, 18vw, 260px);
    line-height: 1.3;
    color: var(--color-text-primary);
    white-space: nowrap;
  }

  /* ---- Approach B: flexbox spread ---- */
  .title-b {
    margin: 0;
    display: flex;
    justify-content: space-between;
    font-family: var(--font-family-display);
    font-weight: 700;
    font-variation-settings: 'wght' 700;
    font-size: clamp(48px, 18vw, 260px);
    line-height: 1.3;
    color: var(--color-text-primary);
  }
</style>