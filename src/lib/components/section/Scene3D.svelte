<!--
  ============================================================
  SCENE 3D
  ============================================================
  A vanilla Three.js scene that loads a GLB model, applies a
  chrome/metallic PBR material, lights it with a room
  environment, and spins it slowly on the Y axis.

  This is the base version: renderer + scene + lights + model
  load + idle rotation. Scroll-driven scale/opacity and the
  particle/morph systems come in later steps.

  Exposes a small bindable API so a parent can drive rotation,
  scale and opacity from a scroll timeline.
  ============================================================
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

  export interface Scene3DApi {
    setRotationY: (rad: number) => void;
    setScale: (factor: number) => void;
    setOpacity: (val: number) => void;
  }

  interface Props {
    modelSrc: string;
    /** Per-model fit tweak (e.g. some models need to be smaller). */
    fitFactor?: number;
    /** Spin the model automatically (idle rotation). */
    autoRotate?: boolean;
    onModelLoaded?: () => void;
    api?: Scene3DApi;
  }

  let {
    modelSrc,
    fitFactor = 1,
    autoRotate = true,
    onModelLoaded,
    api = $bindable()
  }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let wrapperEl = $state<HTMLDivElement | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let modelGroup: THREE.Group | null = null;   // holds the model, scaled/positioned
  let spinner: THREE.Group | null = null;      // rotates for idle spin
  let materials: THREE.MeshPhysicalMaterial[] = [];
  let baseScale = 1;

  let rafId: number | null = null;
  const clock = new THREE.Clock();
  const IDLE_RAD_S = THREE.MathUtils.degToRad(7); // 7°/s idle spin

  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    /* Expose the API for parents (scroll timeline will use it). */
    api = {
      setRotationY: (rad) => { if (spinner) spinner.rotation.y = rad; },
      setScale: (f) => { if (modelGroup) modelGroup.scale.setScalar(baseScale * f); },
      setOpacity: (val) => {
        materials.forEach((m) => {
          const needsTransparent = val < 1;
          if (m.transparent !== needsTransparent) {
            m.transparent = needsTransparent;
            m.needsUpdate = true;
          }
          m.opacity = val;
        });
      }
    };

    initThree();
    startLoop();
    loadModel();

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  onDestroy(() => {
    stopLoop();
    scene?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => (m as THREE.Material).dispose());
    });
    renderer?.dispose();
    scene = null;
    renderer = null;
    camera = null;
    modelGroup = null;
    spinner = null;
    materials = [];
  });

  function initThree() {
    if (!canvasEl || !wrapperEl) return;

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    scene = new THREE.Scene();
    scene.background = null; // transparent

    /* Room environment gives the chrome material something to reflect. */
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
    pmrem.dispose();

    const w = wrapperEl.clientWidth;
    const h = wrapperEl.clientHeight;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0.3, 0);
    renderer.setSize(w, h);

    /* Lights. */
    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(5, 10, 7);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-5, 2, -5);
    scene.add(fill);

    /* Spinner holds the model group and rotates for the idle spin. */
    spinner = new THREE.Group();
    scene.add(spinner);
  }

  function loadModel() {
    const loader = new GLTFLoader();

    loader.load(
      modelSrc,
      (gltf) => {
        if (!scene || !camera || !spinner) return;

        /* Center the model at the origin. */
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        gltf.scene.position.sub(center);

        /* Compute a scale so the model fits nicely in view. */
        const fov = camera.fov * (Math.PI / 180);
        const dist = camera.position.z;
        const visibleH = 2 * Math.tan(fov / 2) * dist;
        const maxDim = Math.max(size.x, size.y, size.z);
        baseScale = (visibleH * 0.9 * fitFactor) / maxDim;

        /* Replace all materials with a chrome PBR material. */
        materials = [];
        gltf.scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mat = new THREE.MeshPhysicalMaterial({
            color: 0x181818,
            metalness: 1.0,
            roughness: 0.015,
            envMapIntensity: 5.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.01
          });
          mesh.material = mat;
          materials.push(mat);
        });

        /* Wrap in a group we can scale/position independently. */
        modelGroup = new THREE.Group();
        modelGroup.add(gltf.scene);
        modelGroup.scale.setScalar(baseScale);
        spinner.add(modelGroup);

        onModelLoaded?.();
      },
      undefined,
      (err) => console.error('Error loading model', modelSrc, err)
    );
  }

  function startLoop() {
    const render = () => {
      rafId = requestAnimationFrame(render);
      const dt = clock.getDelta();

      if (autoRotate && spinner) {
        spinner.rotation.y += IDLE_RAD_S * dt;
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    render();
  }

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function onResize() {
    if (!renderer || !camera || !wrapperEl) return;
    const w = wrapperEl.clientWidth;
    const h = wrapperEl.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
</script>


<div class="scene-3d" bind:this={wrapperEl}>
  <canvas bind:this={canvasEl}></canvas>
</div>


<style>
  .scene-3d {
    width: 100%;
    height: 100%;
  }

  .scene-3d canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>