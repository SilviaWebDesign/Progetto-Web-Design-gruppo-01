<script lang="ts">
  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import SectionTitle from '$lib/components/section/SectionTitle.svelte';
  import { getSectionById } from '$lib/data/sections';

  /* Change to 'sport' | 'sustainability' to test the other modes. */
  const section = getSectionById('sustainability')!;
</script>


<main class="test-frost">
  <div class="layer layer--bg" style="background-image: url({section.frostImage})"></div>

  <div class="layer layer--frost">
    <FrostCanvas src={section.frostImage} />
  </div>

  <div class="hero-title">
    <SectionTitle id={section.id} title={section.title} />
  </div>
</main>


<style>
  .test-frost {
    position: relative;
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
    inset: 0;                      /* full viewport so flex-end can push down */
    display: flex;
    flex-direction: column;
    justify-content: flex-end;     /* anchor the title to the bottom */
    transform-origin: bottom center;
    pointer-events: none;
    will-change: transform, opacity;
  }
</style>