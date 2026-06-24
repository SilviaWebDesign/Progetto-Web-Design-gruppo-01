<script lang="ts">
  import FrostCanvas from '$lib/components/section/FrostCanvas.svelte';
  import { getSectionById } from '$lib/data/sections';

  const section = getSectionById('infrastructure');
</script>


<main class="test-frost">
  <FrostCanvas src={section!.frostImage} />
</main>


<style>
  .test-frost {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
</style>