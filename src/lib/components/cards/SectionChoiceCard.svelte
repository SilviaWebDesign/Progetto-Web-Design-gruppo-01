<!--
  ============================================================
  SECTION CHOICE CARD
  ============================================================
  One of the three home menu cards. Form/position mirror the
  prototype, restyled with our design tokens:
  - glass surface, dark 2px border (--border-thick), soft radius
  - 3D object sits in the upper area; title below
  - hover: card lifts (scale), dark halo + object glow fade in,
    and the 3D model stops rotating so the shape can be read
  ============================================================
-->

<script lang="ts">
  import CardModel from '$lib/components/cards/CardModel.svelte';
  import type { Section } from '$lib/types';
  import { homeDarkModeEnabled } from '$lib/stores/theme';

  interface Props {
    section: Section;
    href?: string;
  }

  let { section, href }: Props = $props();

  let computedHref = $derived(href ?? `/sections/${section.id}`);
  let isHovered = $state(false);
  let isHomeDark = $derived($homeDarkModeEnabled);
</script>

<article
  class="section-choice-card"
  data-section={section.id}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
>
  <div class="section-choice-card__halo" aria-hidden="true"></div>

  <div class="section-choice-card__surface">
    <div class="section-choice-card__object" aria-hidden="true">
      <div class="section-choice-card__glow" aria-hidden="true"></div>
      <div class="section-choice-card__scene">
        <CardModel
          src={section.glbPath}
          paused={isHovered}
          fitFactor={section.cardFitFactor}
          theme={isHomeDark ? 'dark' : 'light'}
        />
      </div>
    </div>

    <h2 class="section-choice-card__title">{section.title}</h2>
  </div>

  <a class="section-choice-card__link" href={computedHref}>
    <span class="visually-hidden">Vai alla sezione {section.title}</span>
  </a>
</article>

<style>
  .section-choice-card {
    position: relative;
    isolation: isolate;
    width: 354px;
    height: 380px;
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (hover: hover) {
    .section-choice-card:hover {
      transform: scale(1.03);
      z-index: 2;
    }
  }

  /* Dark diffuse halo behind the card (hover) */
  .section-choice-card__halo {
    position: absolute;
    inset: -48px;
    z-index: 0;
    border-radius: var(--radius-md);
    opacity: 0;
    pointer-events: none;
    filter: blur(26px);
    background: radial-gradient(
      ellipse 72% 68% at 50% 44%,
      color-mix(in srgb, var(--color-border) 18%, transparent) 0%,
      color-mix(in srgb, var(--color-border) 9%, transparent) 38%,
      color-mix(in srgb, var(--color-border) 4%, transparent) 58%,
      transparent 78%
    );
    transition: opacity 0.35s ease;
  }

  .section-choice-card:hover .section-choice-card__halo {
    opacity: 1;
  }

  /* Glass surface (the visible card) */
  .section-choice-card__surface {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.5); /* glass surface (tokenize later) */
    border: var(--border-thick);
    border-radius: var(--radius-s);
    overflow: hidden;
    box-sizing: border-box;
    transition: box-shadow 0.35s ease;
  }

  .section-choice-card:hover .section-choice-card__surface {
    box-shadow:
      0 0 24px color-mix(in srgb, var(--color-border) 12%, transparent),
      0 0 48px color-mix(in srgb, var(--color-border) 7%, transparent),
      0 0 80px color-mix(in srgb, var(--color-border) 4%, transparent);
  }

  /* 3D object box, centered in the upper area */
  .section-choice-card__object {
    position: absolute;
    top: var(--spacing-lg);
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    height: 220px;
    z-index: 1;
  }

  .section-choice-card__glow {
    position: absolute;
    left: 50%;
    top: 54%;
    transform: translate(-50%, -50%);
    width: 78%;
    height: 72%;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
    filter: blur(16px);
    background: radial-gradient(
      ellipse at center,
      color-mix(in srgb, var(--color-border) 32%, transparent) 0%,
      color-mix(in srgb, var(--color-border) 14%, transparent) 42%,
      transparent 72%
    );
    transition: opacity 0.35s ease;
  }

  .section-choice-card:hover .section-choice-card__glow {
    opacity: 1;
  }

  .section-choice-card__scene {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  /* Title below the object */
  .section-choice-card__title {
    position: absolute;
    left: 0;
    right: 0;
    bottom: var(--spacing-xl);
    margin: 0;
    padding: 0 var(--spacing-md);
    text-align: center;
    font: var(--text-section-menu-font);
    text-transform: uppercase;
    color: var(--color-text-primary);
    pointer-events: none;
  }

  .section-choice-card__link {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: block;
    color: transparent;
    text-decoration: none;
  }

  .section-choice-card__link:focus-visible {
    outline: 2px solid var(--color-border);
    outline-offset: -2px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* --- strip layout (narrow screens): title overlaid on the 3D --- */
  @media (max-width: 1150px) {
    .section-choice-card {
      aspect-ratio: 354 / 157; /* squashed like the Figma */
      height: auto;
      /* scales with the viewport, but capped so all three fit without scrolling */
      width: min(
        calc(100vw - 2 * var(--page-gutter)),
        calc((100dvh - 220px) / 3 * (354 / 157))
      );
    }

    .section-choice-card__surface {
      border-radius: var(--radius-s);
    }

    /* the 3D fills the whole strip */
    .section-choice-card__object {
      inset: 0;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      transform: none;
      overflow: hidden;
    }

    /* title overlaid on the model: centered vertically, left-aligned */
    .section-choice-card__title {
      top: 50%;
      bottom: auto;
      left: var(--spacing-md);
      right: var(--spacing-md);
      transform: translateY(-50%);
      text-align: center;
      white-space: nowrap;
      font-size: clamp(2.25rem, 10vmin, 64px);
      z-index: 2;
    }

    .section-choice-card__glow {
      width: 70%;
      height: 64%;
      filter: blur(12px);
    }

    .section-choice-card__halo {
      inset: -20px;
      filter: blur(18px);
    }

    /* dim the model and lift the surface so the title stays readable */
    .section-choice-card__scene {
      opacity: 0.72;
    }

    .section-choice-card__surface {
      background: rgba(255, 255, 255, 0.62);
    }

    /* soft glow right behind the title for extra contrast */
    .section-choice-card__title {
      text-shadow: 0 0 18px rgba(255, 255, 255, 0.9), 0 0 6px rgba(255, 255, 255, 0.9);
    }
  }

  :global(body.theme-dark-home) .section-choice-card__surface {
    background: rgba(0, 0, 0, 0.46);
    border: 2px solid var(--color-text-primary);
  }
</style>