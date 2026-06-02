<!--
  ============================================================
  SECTION CHOICE CARD
  ============================================================
  A large card representing one of the three main sections
  (sustainability, sport, infrastructure).

  Uses the "stretched link" pattern: the card is an <article>,
  and an invisible <a> overlays the whole surface. This keeps
  the <a> free of complex/interactive child markup (which can
  trip strict HTML5 / Svelte validation).

  Renders a 3D model with a centered title overlay.
  Hover effects (color gradient, paused rotation) come in a
  follow-up step.
  ============================================================
-->

<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import SectionModel from '$lib/components/3d/SectionModel.svelte';
  import type { Section } from '$lib/types';

  interface Props {
    section: Section;
    href?: string;
  }

  let { section, href }: Props = $props();

  let computedHref = $derived(href ?? `/sezioni/${section.id}`);
</script>


<article class="section-choice-card" data-section={section.id}>
  <!-- 3D scene fills the entire card. -->
  <div class="section-choice-card__scene" aria-hidden="true">
    <Canvas>
      <T.PerspectiveCamera
        makeDefault
        position={[0, 0, 5]}
        fov={45}
        oncreate={(ref) => {
          ref.lookAt(0, 0, 0);
        }}
      />

      <T.AmbientLight intensity={1.5} />
      <T.DirectionalLight position={[5, 5, 5]} intensity={1.5} />

      <SectionModel url={section.glbPath} />
    </Canvas>
  </div>

  <!-- Title overlaid centered on top of the 3D scene. -->
  <h2 class="section-choice-card__title">{section.title}</h2>

  <!-- Invisible stretched link covering the entire card. -->
  <a class="section-choice-card__link" href={computedHref}>
    <span class="visually-hidden">Vai alla sezione {section.title}</span>
  </a>
</article>


<style>
  /* ============================================================
     CARD STRUCTURE
     ============================================================ */

  .section-choice-card {
    position: relative;

    width: 100%;
    max-width: 354px;
    aspect-ratio: 354 / 572;

    background-color: var(--color-background-card);
    border: var(--border-thin);
    border-radius: var(--radius-md);

    color: var(--color-text-primary);

    overflow: hidden;

    transition:
      border-color 200ms ease,
      box-shadow 300ms ease;
  }


  /* ============================================================
     3D SCENE — fills the card behind the title
     ============================================================ */

  .section-choice-card__scene {
    position: absolute;
    inset: 0;
    z-index: 0;
  }


  /* ============================================================
     TITLE — centered absolutely above the 3D scene
     ============================================================ */

  .section-choice-card__title {
    position: absolute;
    inset: 0;
    z-index: 1;

    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;

    margin: 0;
    padding: 0 var(--spacing-md);

    font: var(--text-section-menu-font);

    pointer-events: none;
  }


  /* ============================================================
     STRETCHED LINK — invisible, covers the entire card
     ============================================================ */

  .section-choice-card__link {
    position: absolute;
    inset: 0;
    z-index: 2;

    /* Make the link fully transparent but cover the whole area. */
    display: block;
    color: transparent;
    text-decoration: none;
  }

  .section-choice-card__link:focus-visible {
    outline: 2px solid var(--color-border);
    outline-offset: -2px; /* keeps focus ring inside the card. */
  }


  /* ============================================================
     UTILS — screen-reader-only text
     ============================================================ */

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
</style>