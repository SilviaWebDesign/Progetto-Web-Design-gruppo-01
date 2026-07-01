<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { createGltfLoader } from '$lib/utils/gltf';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  interface Props {
    src: string | null;
    fitFactor?: number;
  }
  let { src, fitFactor = 0.9 }: Props = $props();

 let containerEl = $state<HTMLDivElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let loaded = $state(false); // drives the fade-in once the model is ready

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let controls: OrbitControls | null = null;
  let rafId: number | null = null;
  let ro: ResizeObserver | null = null;

  onMount(() => {
    if (!containerEl || !canvasEl || !src) return;

    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setSize(w, h);

    scene = new THREE.Scene();

    // Environment matched to the prototype look (low sigma -> punchier chrome)
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(5, 10, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-5, 2, -5);
    scene.add(fill);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    controls.target.set(0, 0, 0);

    // No DRACO: our GLBs are not Draco-compressed (same setup as Scene3D)
    const loader = createGltfLoader();

    loader.load(src, (gltf) => {
      if (!scene || !camera) return;

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      gltf.scene.position.sub(center);

      const fov = camera.fov * (Math.PI / 180);
      const dist = camera.position.z;
      const visibleH = 2 * Math.tan(fov / 2) * dist;
      const visibleW = visibleH * (w / h);
      // Worst-case horizontal extent during Y auto-rotation is the XZ diagonal
      const maxHoriz = Math.hypot(size.x, size.z);
      const maxVert = Math.max(size.y, Math.max(size.x, size.z));
      const scaleByH = (visibleH * fitFactor) / maxVert;
      const scaleByW = (visibleW * fitFactor) / maxHoriz;
      const scale = Math.min(scaleByH, scaleByW);

      const group = new THREE.Group();
      group.add(gltf.scene);
      group.scale.setScalar(scale);
      group.updateMatrixWorld(true);

      // Re-center after scaling so the model sits in the middle of its box
      const fittedBox = new THREE.Box3().setFromObject(group);
      const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
      group.position.sub(fittedCenter);

      group.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.computeVertexNormals();
        // Same chrome material as Scene3D for visual consistency
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: 0x181818,
          metalness: 1.0,
          roughness: 0.015,
          envMapIntensity: 5.0,
          clearcoat: 1.0,
          clearcoatRoughness: 0.01
        });
      });

      scene.add(group);
      loaded = true; 
    });

    function loop() {
      rafId = requestAnimationFrame(loop);
      controls?.update();
      if (renderer && scene && camera) renderer.render(scene, camera);
    }
    loop();

    ro = new ResizeObserver(() => {
      if (!containerEl || !renderer || !camera) return;
      const nw = containerEl.clientWidth;
      const nh = containerEl.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    ro.observe(containerEl);

    return cleanup;
  });

  function cleanup() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    ro?.disconnect();
    controls?.dispose();
    renderer?.dispose();
    renderer = null;
    scene = null;
    camera = null;
    controls = null;
    rafId = null;
    ro = null;
  }

  onDestroy(cleanup);
</script>

<div class="model-viewer" bind:this={containerEl}>
  {#if src}
    <canvas bind:this={canvasEl} class:is-loaded={loaded}></canvas>
  {/if}
</div>

<style>
  .model-viewer {
    width: 100%;
    height: 100%;
    position: relative;
  }

 canvas {
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.6s ease;
  }

  canvas.is-loaded {
    opacity: 1;
  }
</style>