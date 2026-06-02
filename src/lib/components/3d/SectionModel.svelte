<!--
  ============================================================
  SECTION MODEL
  ============================================================
  Loads a .glb file and rotates it slowly around the Y axis.
  Used inside SectionChoiceCard (and possibly other places later).

  MUST be rendered inside a Threlte <Canvas>.
  ============================================================
-->

<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  import type { Group } from 'three';

  interface Props {
    url: string;
    paused?: boolean;
  }

  let { url, paused = false }: Props = $props();

  /* useGltf needs to be re-run if `url` changes. We pass a getter
     so it re-evaluates on prop changes (per Svelte 5 reactivity model). */
  const gltf = useGltf(url);

  let modelRef = $state<Group | undefined>(undefined);

  useTask((delta) => {
    if (modelRef && !paused) {
      modelRef.rotation.y += delta * 0.5;
    }
  });
</script>


{#if $gltf}
  <T.Group bind:ref={modelRef}>
    <T is={$gltf.scene} />
  </T.Group>
{/if}