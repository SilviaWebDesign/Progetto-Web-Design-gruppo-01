<script lang="ts">
  import { T, Canvas } from '@threlte/core';
  import RotatingModel from './RotatingModel.svelte';
</script>


<h1>Threlte smoke test — caricamento GLB</h1>
<p>Caricamento di crane.glb (19.5 MB, può richiedere qualche secondo).</p>


<div class="scene">
  <Canvas>
    <T.PerspectiveCamera
      makeDefault
      position={[5, 3, 5]}
      fov={50}
      oncreate={(ref) => {
        ref.lookAt(0, 0, 0);
      }}
    />

    <T.AmbientLight intensity={1.5} />
    <T.DirectionalLight position={[5, 5, 5]} intensity={1.5} />

    <RotatingModel url="/models/crane.glb" />

    <T.GridHelper args={[10, 10]} />
  </Canvas>
</div>


<style>
  h1 {
    font: var(--text-header-font);
    margin: 0 0 var(--spacing-sm) 0;
  }

  p {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--color-text-secondary);
  }

  .scene {
    width: 100%;
    max-width: 600px;
    aspect-ratio: 4 / 3;
    background: var(--neutral-100);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  :global(body) {
    padding: var(--spacing-xl);
  }
</style>