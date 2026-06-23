<!--
  ============================================================
  SECTION MODEL
  ============================================================
  Loads a .glb file and renders it centered at the scene origin
  via automatic bounding-box centering. Rotates slowly on Y axis.

  MUST be rendered inside a Threlte <Canvas>.

  ============================================================
  TODO: METALLIC PBR LOOK (postponed)
  ============================================================
  All section objects (tree, skater, crane) should share a
  "metallic" finish for visual cohesion across the site.

  Implementation plan (apply once the real GLB models are available
  and we can verify performance with 3+ scenes in parallel):

  1. RENDERER (configure on the <Canvas>):
     - toneMapping: ACESFilmicToneMapping
     - toneMappingExposure: 1.2

  2. ENVIRONMENT MAP (for reflections):
     Add a RoomEnvironment with PMREMGenerator to scene.environment.
     Required because metals reflect their surroundings: without
     an env map, metals look fake/flat.

  3. MATERIAL OVERRIDE (per mesh in the loaded GLB):
     Replace mesh.material with MeshStandardMaterial:
     - color: 0x181818 (dark titanium/chrome base)
     - metalness: 1.0
     - roughness: 0.015 (near-mirror finish)
     - envMapIntensity: 5.0
     - clearcoat: 1.0
     - clearcoatRoughness: 0.01

  4. LIGHTING (inside the card scene):
     - DirectionalLight 3.5 intensity from (5, 10, 7)
     - DirectionalLight 1.5 intensity from (-5, 2, -5)
     Two lights catch the metal edges for crisp highlights.

  Reference implementation: vanilla Three.js example by a
  teammate (see /docs/ or ask Silvia for the index.html file).

  Consideration: env map adds GPU cost. With 3 SectionChoiceCard
  rendering simultaneously on the home, verify FPS before locking
  in. If too heavy, share a single PMREM-generated texture across
  all cards via a context/store.
  ============================================================
-->

<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  import * as THREE from 'three';
  import type { Group } from 'three';

  interface Props {
    url: string;
    paused?: boolean;
  }

  let { url, paused = false }: Props = $props();

  const gltf = useGltf(url);

  /* Centering offset, computed once the GLB is loaded.
     The GLB origin may not be the visual center of the model; we
     compute its bounding-box center and apply an opposite offset
     so the model appears centered at (0,0,0). */
  let centerOffset = $state<[number, number, number]>([0, 0, 0]);

  $effect(() => {
    if ($gltf?.scene) {
      const box = new THREE.Box3().setFromObject($gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      centerOffset = [-center.x, -center.y, -center.z];
    }
  });

  let modelRef = $state<Group | undefined>(undefined);

  useTask((delta) => {
    if (modelRef && !paused) {
      modelRef.rotation.y += delta * 0.5;
    }
  });
</script>


{#if $gltf}
  <T.Group bind:ref={modelRef}>
    <!-- Inner group applies the centering offset to the loaded scene. -->
    <T.Group position={centerOffset}>
      <T is={$gltf.scene} />
    </T.Group>
  </T.Group>
{/if}