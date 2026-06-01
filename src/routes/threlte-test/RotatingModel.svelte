<!--
  ============================================================
  ROTATING MODEL
  ============================================================
  Loads a .glb file and renders it with continuous Y rotation.
  Used in the Threlte smoke test, will become the base for the
  3D inside SectionChoiceCard.
  ============================================================
-->

<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  import type { Group } from 'three';

  interface Props {
    url: string;
  }

  let { url }: Props = $props();

  /* useGltf returns a "store" with the loaded GLTF data.
     The actual scene becomes available asynchronously once the
     download + parse completes. */
  const gltf = useGltf(url);

  /* Reference to the model group (to rotate it on every frame). */
  let modelRef = $state<Group | undefined>(undefined);

  useTask((delta) => {
    if (modelRef) {
      modelRef.rotation.y += delta * 0.5;
    }
  });
</script>


{#if $gltf}
  <T.Group bind:ref={modelRef}>
    <!-- The scene loaded from the GLB. -->
    <T is={$gltf.scene} />
  </T.Group>
{/if}