<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

  /**
   * Mountain background scene for the home.
   * Driven entirely by `scrollProgress` (0..1):
   *  - 0 .. ORBIT_END                 camera orbits 360° around the mountain
   *  - SNOW_DIVE_START .. SNOW_ZONE   dive toward the snow field + whiteout
   *  - SNOW_ZONE .. CARDS_START       white gap (canvas hidden)
   *  - CARDS_START .. CARDS_END       mountain reappears top-down (cards phase)
   */
  let { scrollProgress = 0, snowZoneAt = 0.62 } = $props();

  // --- scroll phase thresholds (must match the home anchors scale) ---
  const ORBIT_END = 0.45;
  const SNOW_DIVE_START = 0.46;
  const CARDS_START = 0.9;
  const CARDS_END = 0.95;

  // --- model + framing constants (tuned to the mountain GLB) ---
  const MOUNTAIN_GLB_URL = '/models/snow-mountain.glb';
  const MOUNTAIN_ROTATION_Y = Math.PI / 2 + 0.12; // slight offset from 90°
  const CAM_Y_LOW = -2.9; // hero camera height
  const TOP_DOWN_YAW = Math.PI / 2; // top-down view yaw (cards phase)
  const ORBIT_EASE_POWER = 1.45; // higher = slower rotation mid-scroll
  const ORBIT_ARC = Math.PI * 2; // full turn
  const FOG_COLOR = '#ffffff';

  let container: HTMLDivElement | undefined = $state(undefined);
  let renderer: THREE.WebGLRenderer | undefined;
  let scene: THREE.Scene | undefined;
  let camera: THREE.PerspectiveCamera | undefined;
  let sceneFog: THREE.FogExp2 | undefined;
  let animationFrameId = 0;
  let snowMountainModel: THREE.Group | undefined;
  let initGeneration = 0;

  type OrbitConfig = {
    center: THREE.Vector3;
    snowField: THREE.Vector3;
    startAngle: number;
    orbitY: number;
    radius: number;
    topDownHeight: number;
  };

  type MountainMaterial = {
    material: THREE.Material;
    originalColor: THREE.Color;
  };

  let orbitConfig: OrbitConfig | null = null;
  let mountainMaterials: MountainMaterial[] = [];

  // scratch vectors (avoid per-frame allocations)
  const _camPos = new THREE.Vector3();
  const _lookAt = new THREE.Vector3();
  const _orbitEndPos = new THREE.Vector3();
  const _orbitEndLookAt = new THREE.Vector3();
  const _snowApproachPos = new THREE.Vector3();
  const _snowApproachLookAt = new THREE.Vector3();
  const _snowCamPos = new THREE.Vector3();
  const _snowLookAt = new THREE.Vector3();
  const _snowDir = new THREE.Vector3();
  const _whiteColor = new THREE.Color(0xffffff);

  // --- math helpers ---
  const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeInOutQuint = (t: number): number =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // --- mountain GLB load + fit (no DRACO; our GLBs are uncompressed) ---
  let loadPromise: Promise<GLTF> | null = null;
  function preloadMountainGltf(): Promise<GLTF> {
    THREE.Cache.enabled = true;
    if (!loadPromise) {
      loadPromise = new Promise<GLTF>((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(MOUNTAIN_GLB_URL, resolve, undefined, (err) => {
          loadPromise = null;
          reject(err);
        });
      });
    }
    return loadPromise;
  }

  function fitMountainModel(model: THREE.Group): {
    mountainCenter: THREE.Vector3;
    snowField: THREE.Vector3;
    orbitRadius: number;
    topDownHeight: number;
  } {
    model.rotation.set(0, MOUNTAIN_ROTATION_Y, 0);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const desiredSize = 45.0;
    const scaleFactor = desiredSize / Math.max(size.x, size.y, size.z);

    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    model.position.x = -center.x * scaleFactor - 2.5;
    model.position.y = -center.y * scaleFactor - 1.5;
    model.position.z = -center.z * scaleFactor - 10.5;
    model.updateMatrixWorld(true);

    const worldBox = new THREE.Box3().setFromObject(model);
    const worldSize = worldBox.getSize(new THREE.Vector3());
    const mountainCenter = worldBox.getCenter(new THREE.Vector3());

    const snowField = mountainCenter.clone();
    snowField.y = worldBox.min.y + worldSize.y * 0.16;
    const orbitRadius = Math.max(worldSize.x, worldSize.z) * 0.58 + 7;
    const topDownHeight = Math.max(worldSize.x, worldSize.z) * 0.52 + 8;

    return { mountainCenter, snowField, orbitRadius, topDownHeight };
  }

  function waitForContainerSize(el: HTMLElement | undefined, maxFrames = 40): Promise<void> {
    return new Promise<void>((resolve) => {
      let frames = 0;
      const check = () => {
        if (el && el.clientWidth > 0 && el.clientHeight > 0) return resolve();
        if (frames++ >= maxFrames) return resolve();
        requestAnimationFrame(check);
      };
      check();
    });
  }

  // --- camera choreography ---
  function zoomAt(scroll: number): number {
    const orbitU = clamp(scroll / Math.max(ORBIT_END, 0.01), 0, 1);
    const orbitZoom = easeInOutCubic(orbitU) * 0.85;
    const snowU = smoothstep(SNOW_DIVE_START, snowZoneAt, scroll);
    const snowZoom = easeInOutCubic(snowU) * 2.15;
    const deepSnowBoost = easeInOutCubic(smoothstep(0.55, 1, snowU)) * 0.85;
    return 1.2 + orbitZoom + snowZoom + deepSnowBoost;
  }

  function positionOnOrbit(angle: number, radius: number, cfg: OrbitConfig, target: THREE.Vector3): void {
    target.set(
      cfg.center.x + Math.sin(angle) * radius,
      cfg.orbitY,
      cfg.center.z + Math.cos(angle) * radius
    );
  }

  function sampleCameraAt(scroll: number): boolean {
    const cfg = orbitConfig;
    if (!cfg) return false;

    const orbitSpan = Math.max(ORBIT_END, 0.01);
    const endAngle = cfg.startAngle + ORBIT_ARC;

    if (scroll <= SNOW_DIVE_START) {
      const rawT = clamp(scroll / orbitSpan, 0, 1);
      const orbitT = easeInOutQuint(Math.pow(rawT, ORBIT_EASE_POWER));
      const angle = cfg.startAngle + ORBIT_ARC * orbitT;
      positionOnOrbit(angle, cfg.radius, cfg, _camPos);
      _lookAt.copy(cfg.center).add(new THREE.Vector3(0, 2.2, 0));
      return true;
    }

    positionOnOrbit(endAngle, cfg.radius, cfg, _orbitEndPos);
    _orbitEndLookAt.copy(cfg.center).add(new THREE.Vector3(0, 2.2, 0));

    _snowDir.set(cfg.snowField.x - _orbitEndPos.x, 0, cfg.snowField.z - _orbitEndPos.z);
    if (_snowDir.lengthSq() < 0.01) {
      _snowDir.set(cfg.snowField.x - cfg.center.x, 0, cfg.snowField.z - cfg.center.z);
    }
    if (_snowDir.lengthSq() < 0.01) _snowDir.set(0, 0, -1);
    else _snowDir.normalize();

    _snowApproachPos.copy(cfg.snowField).addScaledVector(_snowDir, -6.5);
    _snowApproachPos.y = cfg.snowField.y + 4.2;
    _snowApproachLookAt.copy(cfg.snowField);

    _snowCamPos.copy(cfg.snowField);
    _snowCamPos.y += 0.4;
    _snowLookAt.copy(_snowCamPos).addScaledVector(_snowDir, 10);
    _snowLookAt.y -= 0.2;

    const snowT = smoothstep(SNOW_DIVE_START, snowZoneAt, scroll);
    const eased = easeInOutCubic(snowT);

    if (eased < 0.34) {
      const te = easeInOutCubic(eased / 0.34);
      _camPos.lerpVectors(_orbitEndPos, _snowApproachPos, te);
      _lookAt.lerpVectors(_orbitEndLookAt, _snowApproachLookAt, te);
    } else {
      const te = easeInOutQuint((eased - 0.34) / 0.66);
      _camPos.lerpVectors(_snowApproachPos, _snowCamPos, te);
      _lookAt.lerpVectors(_snowApproachLookAt, _snowLookAt, te);
    }
    return true;
  }

  function applySnowWhiteout(scroll: number): void {
    const whiteT = smoothstep(SNOW_DIVE_START, snowZoneAt, scroll);
    const insideT = smoothstep(0.3, 0.96, whiteT);
    if (!snowMountainModel) return;

    snowMountainModel.visible = insideT < 0.97;
    if (!snowMountainModel.visible) return;

    const meshOpacity = 1 - insideT * 0.96;
    for (const { material, originalColor } of mountainMaterials) {
      if ('color' in material && material.color instanceof THREE.Color) {
        material.color.copy(originalColor).lerp(_whiteColor, insideT * 0.9);
      }
      material.opacity = meshOpacity;
    }
  }

  function sampleTopDownCamera(cardsT: number): boolean {
    const cfg = orbitConfig;
    if (!cfg) return false;
    const eased = easeInOutCubic(clamp(cardsT, 0, 1));
    const height = cfg.topDownHeight * lerp(1.12, 1, eased);
    _camPos.set(cfg.center.x, cfg.center.y + height, cfg.center.z);
    _lookAt.copy(cfg.center);
    return true;
  }

  function buildOrbitConfig(
    mountainCenter: THREE.Vector3,
    snowField: THREE.Vector3,
    orbitRadius: number,
    topDownHeight: number
  ): void {
    const c = mountainCenter;
    const startCam = new THREE.Vector3(0, CAM_Y_LOW, 7.8);
    const dx = startCam.x - c.x;
    const dz = startCam.z - c.z;
    const startAngle = Math.atan2(dx, dz);
    const heroRadius = Math.hypot(dx, dz);

    orbitConfig = {
      center: c.clone(),
      snowField: snowField.clone(),
      startAngle,
      orbitY: c.y + CAM_Y_LOW + 1.1,
      radius: Math.max(orbitRadius, heroRadius, 12) * 0.82,
      topDownHeight
    };
  }

  function setupMountainMaterials(object: THREE.Object3D): void {
    mountainMaterials = [];
    object.traverse((o: THREE.Object3D) => {
      if (!(o instanceof THREE.Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      const cloned = materials.map((mat) => {
        const material = mat.clone();
        material.transparent = true;
        material.fog = true;
        material.side = THREE.FrontSide;
        const color =
          'color' in material && material.color instanceof THREE.Color
            ? material.color.clone()
            : new THREE.Color(0xffffff);
        mountainMaterials.push({ material, originalColor: color });
        return material;
      });
      o.material = cloned.length === 1 ? cloned[0] : cloned;
    });
  }

  function setMountainVisible(visible: boolean): void {
    if (!snowMountainModel) return;
    snowMountainModel.visible = visible;
    if (!visible) return;
    for (const { material, originalColor } of mountainMaterials) {
      if ('color' in material && material.color instanceof THREE.Color) {
        material.color.copy(originalColor);
      }
      material.opacity = 1;
    }
  }

  function resizeRenderer(): void {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate(): void {
    if (!renderer || !scene || !camera) return;
    animationFrameId = requestAnimationFrame(animate);

    const progress = scrollProgress;
    const inSnowGap = progress >= snowZoneAt && progress < CARDS_START;
    const inCardsPhase = progress >= CARDS_START;

    if (inSnowGap) {
      if (snowMountainModel) snowMountainModel.visible = false;
      renderer.domElement.style.visibility = 'hidden';
      renderer.domElement.style.opacity = '0';
      return;
    }

    if (inCardsPhase) {
      const cardsT = smoothstep(CARDS_START, CARDS_END, progress);
      renderer.domElement.style.visibility = 'visible';
      renderer.domElement.style.opacity = String(cardsT);

      setMountainVisible(true);
      if (sampleTopDownCamera(cardsT)) {
        camera.position.copy(_camPos);
        camera.up.set(Math.cos(TOP_DOWN_YAW), 0, Math.sin(TOP_DOWN_YAW));
        camera.lookAt(_lookAt);
      }
      camera.zoom = lerp(1.05, 1.28, easeInOutCubic(cardsT));
      camera.updateProjectionMatrix();

      if (sceneFog) {
        sceneFog.density = lerp(0.03, 0.022, cardsT);
        sceneFog.color.setRGB(1, 1, 1);
      }
      renderer.setClearColor(0xffffff, 1);
      renderer.render(scene, camera);
      return;
    }

    renderer.domElement.style.visibility = 'visible';
    renderer.domElement.style.opacity = '1';

    const scroll = clamp(progress, 0, snowZoneAt);
    if (sampleCameraAt(scroll)) {
      camera.position.copy(_camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(_lookAt);
    } else {
      camera.position.set(0, CAM_Y_LOW, 7.8);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
    }

    camera.zoom = zoomAt(scroll);
    camera.updateProjectionMatrix();

    const whiteT = smoothstep(SNOW_DIVE_START, snowZoneAt, scroll);
    const insideFog = smoothstep(0.28, 1, whiteT);
    if (sceneFog) {
      sceneFog.density = lerp(0.045, 0.38, insideFog);
      sceneFog.color.setRGB(1, 1, 1);
    }

    if (whiteT > 0.02) applySnowWhiteout(scroll);
    else setMountainVisible(true);

    renderer.setClearColor(0xffffff, 1);
    renderer.render(scene, camera);
  }

  function teardown(): void {
    initGeneration += 1;
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', resizeRenderer);

    if (snowMountainModel && scene) {
      scene.remove(snowMountainModel);
      snowMountainModel.traverse((o: THREE.Object3D) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: THREE.Material) => m.dispose());
      });
      snowMountainModel = undefined;
    }

    mountainMaterials = [];
    orbitConfig = null;
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
      renderer = undefined;
    }
    scene = undefined;
    camera = undefined;
    sceneFog = undefined;
  }

  onMount(() => {
    if (!browser) return;

    const gen = ++initGeneration;
    (async () => {
      await tick();
      await waitForContainerSize(container);
      if (gen !== initGeneration || !container) return;

      scene = new THREE.Scene();
      sceneFog = new THREE.FogExp2(FOG_COLOR, 0.045);
      scene.fog = sceneFog;

      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);

      camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 500);
      camera.position.set(0, CAM_Y_LOW, 7.8);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 2.0));
      const directionalLight = new THREE.DirectionalLight(0xeaeff5, 2.5);
      directionalLight.position.set(5, 10, 7);
      scene.add(directionalLight);

      animate();
      window.addEventListener('resize', resizeRenderer);

      try {
        const gltf = await preloadMountainGltf();
        if (gen !== initGeneration || !scene) return;

        snowMountainModel = gltf.scene.clone(true);
        const { mountainCenter, snowField, orbitRadius, topDownHeight } =
          fitMountainModel(snowMountainModel);
        buildOrbitConfig(mountainCenter, snowField, orbitRadius, topDownHeight);
        setupMountainMaterials(snowMountainModel);
        scene.add(snowMountainModel);
        resizeRenderer();
      } catch (err) {
        console.error('[MountainScene] mountain load failed:', err);
      }
    })();

    return teardown;
  });
</script>

<div class="mountain-scene" bind:this={container}></div>

<style>
  .mountain-scene {
    width: 100%;
    height: 100%;
    background: #ffffff;
  }
</style>
