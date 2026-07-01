<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import * as THREE from 'three';
 import { createGltfLoader } from '$lib/utils/gltf';

  interface Props {
    src: string;
    paused?: boolean; // stop auto-rotation (e.g. on hover)
    tilt?: number; // camera elevation in radians (slight view from above)
    fitFactor?: number; // how much of the frame the model fills (0..1)
  }

  let { src, paused = false, tilt = 0.22, fitFactor = 0.65 }: Props = $props();

  // gray metallic look (matches the prototype card object)
  const MATERIAL_COLOR = 0x8a8d94;
  const MATERIAL_METALNESS = 0.92;
  const MATERIAL_ROUGHNESS = 0.28;
  const CAMERA_Z = 6;
  const CAMERA_FOV = 45;
  const ROTATION_SPEED = 0.5; // rad/s

  let container = $state<HTMLDivElement | undefined>(undefined);
  let renderer: THREE.WebGLRenderer | undefined;
  let scene: THREE.Scene | undefined;
  let camera: THREE.PerspectiveCamera | undefined;
  let modelRoot: THREE.Group | undefined;
  let rafId = 0;
  let gen = 0;
  let loaded = $state(false);
  const clock = new THREE.Clock();

  // keep the latest `paused` readable inside the rAF loop
  let pausedRef = paused;
  $effect(() => {
    pausedRef = paused;
  });

 function fitModel(object: THREE.Object3D) {
    // 1) measure the raw model and scale it to fill the frame
    let box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const visibleH = 2 * CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 180 / 2);
    object.scale.setScalar((visibleH * fitFactor) / maxDim);
    // 2) recenter AFTER scaling, using the scaled bounding box
    object.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
  }

  function applyMetallic(object: THREE.Object3D) {
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = new THREE.MeshStandardMaterial({
        color: MATERIAL_COLOR,
        metalness: MATERIAL_METALNESS,
        roughness: MATERIAL_ROUGHNESS
      });
    });
  }

  function setupLights(s: THREE.Scene) {
    s.add(new THREE.AmbientLight(0xe8eaef, 0.6));
    const key = new THREE.PointLight(0xffffff, 110, 16);
    key.position.set(6, 1.15, 0);
    s.add(key);
    const rim = new THREE.PointLight(0xd4d8e0, 65, 14);
    rim.position.set(-4.2, 0.55, 4.5);
    s.add(rim);
    const fill = new THREE.PointLight(0xf2f4f8, 40, 12);
    fill.position.set(0, -0.35, -6);
    s.add(fill);
  }

  function resize() {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    rafId = requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;
    const dt = clock.getDelta();
    if (modelRoot && !pausedRef) modelRoot.rotation.y += ROTATION_SPEED * dt;
    renderer.render(scene, camera);
  }

  onMount(() => {
    if (!browser) return;
    const myGen = ++gen;

    (async () => {
      await tick();
      if (!container || myGen !== gen) return;

      scene = new THREE.Scene();
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);

      camera = new THREE.PerspectiveCamera(CAMERA_FOV, w / h, 0.1, 100);
      // slight tilt: lift the camera and look at the origin (view from a bit above)
      camera.position.set(0, Math.sin(tilt) * CAMERA_Z, Math.cos(tilt) * CAMERA_Z);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      setupLights(scene);
      animate();
      window.addEventListener('resize', resize);

      const loader = createGltfLoader();
      loader.load(
        src,
        (gltf) => {
          if (myGen !== gen || !scene) return;
          modelRoot = new THREE.Group();
          applyMetallic(gltf.scene);
          modelRoot.add(gltf.scene);
          fitModel(gltf.scene);
          scene.add(modelRoot);
          loaded = true;
        },
        undefined,
        (err) => console.error('[CardModel] load failed:', src, err)
      );
    })();

    return () => {
      gen++;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      renderer?.dispose();
      renderer?.domElement.remove();
      renderer = undefined;
      scene = undefined;
      camera = undefined;
      modelRoot = undefined;
    };
  });
</script>

<div class="card-model" bind:this={container} class:is-loaded={loaded}></div>

<style>
  .card-model {
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .card-model.is-loaded {
    opacity: 1;
  }
</style>