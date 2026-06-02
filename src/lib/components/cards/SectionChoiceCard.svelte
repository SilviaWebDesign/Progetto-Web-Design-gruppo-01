<!--
  ============================================================
  SECTION CHOICE CARD
  ============================================================
  A large card representing one of the three main sections.

  Hover behaviour:
  - Border takes the section color
  - A diffuse radial gradient of the section color fades in
    inside the card (clipped to the card's rounded corners)
  - The 3D model stops rotating, so the user can take in the shape
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

  /* Hover state — drives the gradient appearance and pauses the 3D rotation. */
  let isHovered = $state(false);
</script>


<article
  class="section-choice-card"
  data-section={section.id}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
>
  <!-- 3D scene fills the entire card. -->
  <div class="section-choice-card__scene" aria-hidden="true">
    <Canvas>
      <T.PerspectiveCamera
        makeDefault
        position={[0, 0, 3.5]}
        fov={35}
        oncreate={(ref) => {
          ref.lookAt(0, 0, 0);
        }}
      />

      <T.AmbientLight intensity={1.5} />
      <T.DirectionalLight position={[5, 5, 5]} intensity={1.5} />

      <SectionModel url={section.glbPath} paused={isHovered} />
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
    isolation: isolate;

    width: 100%;
    max-width: 354px;
    aspect-ratio: 354 / 572;

    /* True glassmorphism. */
    background-color: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    border: var(--border-thin);
    border-radius: var(--radius-md);

    color: var(--color-text-primary);

    /* Inner highlight + subtle outer shadow (default state). */
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.08),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);

    overflow: hidden;

    /* Reserved 1px outline for hover (no layout shift). */
    outline: var(--border-width-thin) solid transparent;
    outline-offset: 0;

    transition:
      transform 300ms cubic-bezier(0.25, 1, 0.5, 1),
      border-color 200ms ease,
      outline-color 200ms ease,
      box-shadow 300ms ease;
  }


  /* ============================================================
     DIFFUSE GRADIENT INSIDE (::before, behind everything)
     ============================================================ */

  .section-choice-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;

    border-radius: inherit;
    opacity: 0;
    transition: opacity 400ms ease;

    pointer-events: none;
    filter: blur(20px);
  }

  .section-choice-card[data-section='sustainability']::before {
    background: radial-gradient(
      circle at center,
      var(--color-section-sustainability) 0%,
      rgba(255, 255, 255, 0) 80%
    );
  }
  .section-choice-card[data-section='sport']::before {
    background: radial-gradient(
      circle at center,
      var(--color-section-sport) 0%,
      rgba(255, 255, 255, 0) 80%
    );
  }
  .section-choice-card[data-section='infrastructure']::before {
    background: radial-gradient(
      circle at center,
      var(--color-section-infrastructure) 0%,
      rgba(255, 255, 255, 0) 80%
    );
  }

  .section-choice-card:hover::before {
    opacity: 1;
  }


  /* ============================================================
     HOVER — lift, border, outline, layered glow
     ============================================================ */

  .section-choice-card:hover {
    transform: translateY(-1px);
  }

  .section-choice-card[data-section='sustainability']:hover {
    border-color: var(--color-section-sustainability);
    outline-color: var(--color-section-sustainability);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 24px rgba(71, 208, 142, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }
  .section-choice-card[data-section='sport']:hover {
    border-color: var(--color-section-sport);
    outline-color: var(--color-section-sport);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 24px rgba(137, 186, 255, 0.30),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }
  .section-choice-card[data-section='infrastructure']:hover {
    border-color: var(--color-section-infrastructure);
    outline-color: var(--color-section-infrastructure);
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.10),
      0 0 24px rgba(255, 131, 76, 0.28),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
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
     STRETCHED LINK
     ============================================================ */

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


  /* ============================================================
     UTILS
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