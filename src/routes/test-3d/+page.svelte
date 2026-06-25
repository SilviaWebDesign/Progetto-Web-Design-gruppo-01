<script lang="ts">
  import Scene3D from '$lib/components/section/Scene3D.svelte';
  import { getSectionById } from '$lib/data/sections';

  const section = getSectionById('infrastructure')!;
</script>


<main class="test-3d">
  <Scene3D modelSrc={section.glbPath} />
</main>


<style>
  .test-3d {
    width: 100vw;
    height: 100vh;
    background: var(--color-background-page);
  }
</style>