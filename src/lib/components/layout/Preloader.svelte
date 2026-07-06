<script lang="ts">
  import { fade } from 'svelte/transition';

  interface Props {
    progress: number; // 0..1
    visible: boolean;
  }
  let { progress, visible }: Props = $props();

  const MESSAGES = [
    'Spalando la neve…',
    'Lucidando le medaglie…',
    'Cercando il punto di vista giusto…',
    'Montando la montagna…',
    'Affilando i pattini…'
  ];
  let msgIndex = $state(0);

  $effect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      msgIndex = (msgIndex + 1) % MESSAGES.length;
    }, 2600);
    return () => clearInterval(timer);
  });

  let pct = $derived(Math.round(clamp01(progress) * 100));
  function clamp01(v: number) {
    return Math.min(1, Math.max(0, v));
  }
</script>

{#if visible}
  <div class="preloader" role="status" aria-live="polite" transition:fade={{ duration: 400 }}>
    <div class="preloader__inner">
      <p class="preloader__msg">{MESSAGES[msgIndex]}</p>
      <div class="preloader__bar">
        <div class="preloader__fill" style="width: {pct}%"></div>
      </div>
      <p class="preloader__pct">{pct}%</p>
    </div>
  </div>
{/if}

<style>
  .preloader {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--page-gutter);
    background: var(--color-background-page);
    color: var(--color-text-primary);
  }
  .preloader__inner {
    width: min(520px, 86vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    text-align: center;
  }
  .preloader__msg {
    margin: 0;
    min-height: 1.4em;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-lg);
  }
  .preloader__bar {
    width: 100%;
    height: 3px;
    border-radius: 999px;
    overflow: hidden;
    background: color-mix(in srgb, var(--color-text-primary) 15%, transparent);
  }
  .preloader__fill {
    height: 100%;
    border-radius: 999px;
    background: var(--color-text-primary);
    transition: width 0.25s ease;
  }
  .preloader__pct {
    margin: 0;
    font-family: var(--font-family-body);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
  }
</style>