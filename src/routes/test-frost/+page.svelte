<script lang="ts">
  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import SectionTitle from '$lib/components/section/SectionTitle.svelte';
  import { getSectionById } from '$lib/data/sections';

  const section = getSectionById('infrastructure')!;
</script>


<!-- Tall scroll container; the scene sticks while we scroll past it. -->
<div class="scroll-area">
  <div class="scene">
    <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

    <div class="layer layer--frost">
      <FrostCanvas src={section.frostImage} />
    </div>

    <div class="hero-title">
      <SectionTitle id={section.id} title={section.title} />
    </div>
  </div>
</div>


<style>
  .scroll-area {
    /* Tall enough to scroll through (~5 viewports). */
    height: 500vh;
    position: relative;
  }

  .scene {
    position: sticky;
    top: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #ffffff;
  }

  .layer { position: absolute; inset: 0; }

  .layer--bg {
    z-index: 1;
    background-size: cover;
    background-position: center;
    opacity: 0.28;
    pointer-events: none;
  }

  .layer--frost { z-index: 2; overflow: hidden; }

  .hero-title {
    position: absolute;
    z-index: 3;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    transform-origin: bottom center;
    pointer-events: none;
    will-change: transform, opacity;
  }
</style>