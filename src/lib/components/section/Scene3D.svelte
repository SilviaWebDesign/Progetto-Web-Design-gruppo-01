<!--
  ============================================================
  SCENE 3D (particle system)
  ============================================================
  Three.js scene that renders the chrome model and can:
    - appear / rotate / shrink during the intro
    - settle() → dissolve the solid model into ~20k particles
    - pulse() → a one-off ripple through the particles (on like)
    - morphToResult(path, done) → particles fly to a result shape
    - returnToParticles() → back from a result model to particles
    - orbitEnabled → OrbitControls for the feedback phase

  No DRACO (our GLBs aren't Draco-compressed); bright PMREM
  environment (no low sigma) for our light background.
  ============================================================
-->

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { createGltfLoader } from '$lib/utils/gltf';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  export interface MobileFitOptions {
    centerBias?: number;
    viewportHeightPx?: number;
  }

  export interface Scene3DApi {
    setRotationY: (rad: number) => void;
    setScale: (factor: number) => void;
    setPositionY: (val: number) => void;
    resetOrientation: () => void;
    setOpacity: (val: number) => void;
    setTransitionProgress: (t: number) => void;
    settle: () => void;
    unsettle: (onDone?: () => void) => void;
    pulse: (amplitude?: number) => void;
    resetPulse: () => void;
    snapToParticles: () => void;
    snapToResult: (path: string) => void;
    preloadResultModels: () => void;
    morphToResult: (path: string, onDone: () => void) => void;
    /** Abort an in-flight result morph without firing its onDone callback. */
    cancelMorph: () => void;
    /** Re-fit the result model to the current layout (fonts/resize/orientation). */
    reframeResult: () => void;
    returnToParticles: () => void;
    setMobileFit: (topPx: number, bottomPx: number, options?: MobileFitOptions) => void;
    setMobileLayoutBlend: (t: number) => void;
    setMobileFitLerp: (t: number) => void;
    setModelBaseYOffset: (vhFraction: number) => void;
    snapMobileFit: () => void;
    lockMobileFit: () => void;
    unlockMobileFit: () => void;
    clearMobileFit: () => void;
  }

  interface Props {
    api?: Scene3DApi;
    modelSrc: string;
    theme?: 'light' | 'dark';
    fitFactor?: number;
    resultScale?: number;
    resultPaths?: string[];
    onModelLoaded?: () => void;
    orbitEnabled?: boolean;
  }
  let {
    api = $bindable(),
    modelSrc,
    theme = 'light',
    fitFactor = 1,
    resultScale = 1,
    resultPaths = [],
    onModelLoaded,
    orbitEnabled = false
  }: Props = $props();

  function modelColorHex(): number {
    return theme === 'dark' ? 0xffffff : 0x181818;
  }

  function modelMetalness(): number {
    return theme === 'dark' ? 0.0 : 1.0;
  }

  function modelRoughness(): number {
    return theme === 'dark' ? 0.35 : 0.015;
  }

  function particleColor(): THREE.Color {
    // Particles: in dark/negative we want white points.
    return theme === 'dark' ? new THREE.Color(0xffffff) : new THREE.Color(0x000000);
  }

  let wrapperEl = $state<HTMLDivElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let modelGroup: THREE.Group | null = null;
  let materials: THREE.MeshPhysicalMaterial[] = [];
  let baseScale = 1;
  let fitVisibleH = 0;
  let fitModelW = 0;
  const VIEWPORT_FIT_MARGIN = 0.9;

  let rafId: number | null = null;
  let spinner: THREE.Group | null = null;
  let controls: OrbitControls | null = null;

  const clock = new THREE.Clock();
  const IDLE_RAD_S = THREE.MathUtils.degToRad(7);

  const COUNT = 20000;

  let particleMesh: THREE.InstancedMesh | null = null;
  let particleMat: THREE.ShaderMaterial | null = null;
  let iMatBuf: Float32Array | null = null;

  const particleTargets = new Float32Array(COUNT * 3);
  const particleCurrent = new Float32Array(COUNT * 3);

  // --- Cursor "cross-through" physics (Windle-style) -----------------------
  // Each particle keeps a velocity, springs back to its home (particleTargets),
  // and is pushed by a localized 3D sphere around the cursor. Runs ONLY in the
  // idle 'done' state; the transition/morph loops still own iMatBuf otherwise.
  const particleVel = new Float32Array(COUNT * 3);
  const PART_RETURN = 0.10;         // direct ease back home (no spring => no bounce)
  const PART_DAMPING = 0.86;        // velocity kept per frame (higher = longer wake)
  const CURSOR_RADIUS_FRAC = 0.056; // ray reach (perpendicular), fraction of model extent
  const CURSOR_PUSH_FRAC = 0.028;   // per-frame impulse at center, fraction of extent
  const PART_MAX_OFFSET_FRAC = 0.4; // clamp so particles never fly too far from home
  const PART_SLEEP_V2 = 1e-8;       // below this max speed^2 (and no hover) -> sleep
  const CURSOR_SPEED_BOOST = 24;    // faster cursor -> stronger plow (0 = speed-independent)
  const CURSOR_BOOST_MAX = 3;       // cap the extra push so a fast flick can't explode it
  let cursorRadius = 0;             // resolved in buildParticles (needs the cloud extent)
  let cursorPush = 0;
  let partMaxOffset = 0;
  let physicsAsleep = true;
  const raycaster = new THREE.Raycaster();
  // Cursor as a RAY in the group's local space, so the push pierces the model
  // through its full depth (front & back both react along the line).
  const _rayOriginLocal = new THREE.Vector3();
  const _rayDirLocal = new THREE.Vector3();
  const _invMat = new THREE.Matrix4();
  const _prevNDC = new THREE.Vector2();
  let hoverWasActive = false;
  let cursorSpeed = 0;

  type TState = 'none' | 'in' | 'out' | 'done';
  let transitionState: TState = 'none';
  let transitionProgress = 0;
  let scrollDrivenTransition = false;
  let transitionPrepared = false;
  const TRANSITION_DURATION = 2.0;

  const SETTLE_PULSE_AMPLITUDE = 0.4;
  let unsettleElapsed = 0;
  const UNSETTLE_DURATION = 0.6;
  let unsettleDoneCallback: (() => void) | null = null;

  let manualPulseActive = false;
  let manualPulseElapsed = 0;
  let manualPulseAmplitude = 0.4;
  const MANUAL_PULSE_DURATION = 1.5;
  const MANUAL_PULSE_AMPLITUDE = 0.4; 
  const IDLE_PULSE_AMPLITUDE = 0.06;
  const IDLE_PULSE_SPEED = Math.PI * 0.8; // rallentata dell'20% rispetto al ciclo originale (Math.PI)


  const _hoverNDC = new THREE.Vector2();
  let pointerInside = false; 

  const resultModels = new Map<string, THREE.Group>();

  const resultTargets = new Float32Array(COUNT * 3);
  type MorphState = 'none' | 'morphing';
  let morphState: MorphState = 'none';
  let morphElapsed = 0;
  const MORPH_DURATION = 1.5;
  const MORPH_HANDOFF_START = 0.62; // when the particle->model cross-fade begins (0..1 of the morph)
  const MORPH_ORBIT_AT = 0.16;      // when to hand the camera to OrbitControls during the morph (0..1)
  let morphDoneCallback: (() => void) | null = null;
  let resultModelMaterials: THREE.MeshPhysicalMaterial[] = [];

  $effect(() => {
    // Force dependency tracking on `theme` so shader/material colors update when toggling.
    void theme;

    if (particleMat?.uniforms?.uParticleColor) {
      const uniform = particleMat.uniforms.uParticleColor as { value: THREE.Color };
      uniform.value.copy(particleColor());
      particleMat.needsUpdate = true;
    }

    for (const m of materials) {
      if (!m) continue;
      m.color.setHex(modelColorHex());
      m.metalness = modelMetalness();
      m.roughness = modelRoughness();
      m.needsUpdate = true;
    }

    for (const m of resultModelMaterials) {
      if (!m) continue;
      m.color.setHex(modelColorHex());
      m.metalness = modelMetalness();
      m.roughness = modelRoughness();
      m.needsUpdate = true;
    }
  });

  // --- Mobile topics layout fit (vertical band between DOM-measured edges) ---
  let mobileFitActive = false;
  let mobileFitFinalOffsetY = 0;
  let mobileLayoutBlend = 0;
  let mobileFitLocked = false;
  let modelBaseYOffsetVh = 0;
  let mobileFitLerp = 0.12;
  const MOBILE_FIT_LERP_DEFAULT = 0.12;

  function getCameraVisibleH(): number {
    if (!camera) return 0;
    const fov = camera.fov * (Math.PI / 180);
    return 2 * Math.tan(fov / 2) * camera.position.z;
  }

  function getModelBaseYOffset(): number {
    return modelBaseYOffsetVh * getCameraVisibleH();
  }

  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    api = {
      setRotationY: (rad) => {
        if (modelGroup) modelGroup.rotation.y = rad;
      },
      setScale: (f) => {
        if (modelGroup) modelGroup.scale.setScalar(baseScale * f);
      },
      setPositionY: (val) => {
        if (spinner) spinner.position.y = val;
      },
      resetOrientation: () => {
        // Undo rotation from the feedback OrbitControls + idle spin, so the model
        // reappears at its default facing when we rewind to the intro (S5).
        mobileFitActive = false;
        mobileFitLocked = false;
        mobileLayoutBlend = 0;
        mobileFitFinalOffsetY = 0;
        modelBaseYOffsetVh = 0;
        mobileFitLerp = MOBILE_FIT_LERP_DEFAULT;
        if (spinner) {
          spinner.rotation.y = 0;
          spinner.position.y = 0;
        }
        if (camera) camera.position.set(0, 0, 6);
        if (controls) {
          controls.target.set(0, 0.3, 0);
          controls.update();
          controls.enabled = false;
        }
      },
      setOpacity: (val) => {
        materials.forEach((m) => {
          const needsTransparent = val < 1;
          if (m.transparent !== needsTransparent) {
            m.transparent = needsTransparent;
            m.needsUpdate = true;
          }
          m.opacity = val;
        });
      },
      setTransitionProgress: (t) => applyTransitionProgress(t),
      settle: startTransition,
      unsettle: (onDone) => {
        if (transitionState === 'none' && !particleMesh?.visible) {
          onDone?.();
          return;
        }
        materials.forEach((m) => {
          m.visible = true;
          m.transparent = true;
          m.opacity = 0;
          m.needsUpdate = true;
        });
        morphState = 'none';
        manualPulseActive = false;
        manualPulseElapsed = 0;
        unsettleDoneCallback = onDone ?? null;
        transitionState = 'out';
        unsettleElapsed = 0;
      },
      pulse: (amplitude) => triggerManualPulse(amplitude),
      resetPulse: () => {
        manualPulseActive = false;
        manualPulseElapsed = 0;
        if (particleMat) particleMat.uniforms.uPulse.value = 0;
      },
      // Jump straight to the settled "particles" state, no animation.
      // Mirror of the transitionProgress>=1 branch in tick(). Used to
      // restore the scene after a reload into topics phase.
      snapToParticles: () => {
        if (!particleMesh || !particleMat || !iMatBuf) return;

        transitionState = 'done';
        transitionProgress = 1;
        scrollDrivenTransition = false;
        transitionPrepared = false;
        morphState = 'none';

        for (let i = 0; i < COUNT; i++) {
          const b = i * 16 + 12;
          iMatBuf[b] = particleTargets[i * 3];
          iMatBuf[b + 1] = particleTargets[i * 3 + 1];
          iMatBuf[b + 2] = particleTargets[i * 3 + 2];
        }
        particleCurrent.set(particleTargets);
        particleVel.fill(0);
        physicsAsleep = true;
        particleMesh.instanceMatrix.needsUpdate = true;
        particleMesh.visible = true;

        particleMat.uniforms.uBaseOpacity.value = 0.85;
        particleMat.uniforms.uPulse.value = 0;

       materials.forEach((m) => {
          m.opacity = 0;
          m.visible = false;
        });
      },
      // Show the result model already fully formed, particles off — the
      // end-state of a morph, with no animation. Used to restore feedback
      // phase after a reload. Loads (or reuses cached) glb, then snaps.
      snapToResult: (path: string) => {
        const finish = (source: THREE.Group) => {
          if (!scene || !spinner || !particleMesh) return;
          const resultGroup = buildResultGroup(source);
          if (!resultGroup) return;

          spinner.add(resultGroup);
          resultModelMaterials.forEach((m) => {
            m.opacity = 1;
            m.transparent = false;
            m.needsUpdate = true;
          });

          particleMesh.visible = false;
          if (particleMat) particleMat.uniforms.uPulse.value = 0;

          transitionState = 'done';
          morphState = 'none';
        };

        const cached = resultModels.get(path);
        if (cached) {
          finish(cached);
          return;
        }
        const loader = createGltfLoader();
        loader.load(
          path,
          (gltf) => {
            resultModels.set(path, gltf.scene);
            finish(gltf.scene);
          },
          undefined,
          (err) => console.error('[Scene3D] snapToResult load error:', path, err)
        );
      },
      preloadResultModels,
      morphToResult,
      reframeResult: () => {
        if (currentResultGroup) frameResultGroup(currentResultGroup);
      },
      cancelMorph: () => {
        morphDoneCallback = null;
        morphState = 'none';
        morphElapsed = 0;
        if (controls) controls.enabled = false;
        if (particleMesh) particleMesh.visible = false;
        if (particleMat) {
          particleMat.uniforms.uBaseOpacity.value = 0;
          particleMat.uniforms.uPulse.value = 0;
        }
        resultModelMaterials.forEach((m) => {
          m.opacity = 0;
          m.visible = false;
          m.needsUpdate = true;
        });
      },
      returnToParticles: () => {
        if (controls) controls.enabled = false;
        // Restore the base particle cloud: after a morph, iMatBuf still holds the
        // RESULT shape, so re-show without this leaves a stale blob (bug #14).
        // Mirror snapToParticles: rewrite instance translations to particleTargets.
        if (particleMesh && iMatBuf) {
          for (let i = 0; i < COUNT; i++) {
            const b = i * 16 + 12;
            iMatBuf[b] = particleTargets[i * 3];
            iMatBuf[b + 1] = particleTargets[i * 3 + 1];
            iMatBuf[b + 2] = particleTargets[i * 3 + 2];
          }
          particleCurrent.set(particleTargets);
          particleVel.fill(0);
          physicsAsleep = true;
          particleMesh.instanceMatrix.needsUpdate = true;
        }
        if (particleMesh) particleMesh.visible = true;
        if (particleMat) {
          particleMat.uniforms.uBaseOpacity.value = 0.85;
          particleMat.uniforms.uPulse.value = 0;
        }
        resultModelMaterials.forEach((m) => {
          m.opacity = 0;
          m.visible = false;
        });
        morphState = 'none';
      },
      setMobileFit: (topPx, bottomPx, options = {}) => {
        if (!camera) return;
        mobileFitActive = true;
        const vh = options.viewportHeightPx ?? window.innerHeight;
        const visibleH = getCameraVisibleH();
        const gapPx = Math.max(24, bottomPx - topPx);
        const centerBias = options.centerBias ?? 0.5;
        const centerPx = topPx + gapPx * centerBias;
        mobileFitFinalOffsetY = ((vh / 2 - centerPx) / vh) * visibleH;
        if (mobileFitLocked && spinner) {
          spinner.position.y = mobileFitFinalOffsetY * mobileLayoutBlend + getModelBaseYOffset();
        }
      },
      setMobileLayoutBlend: (t) => {
        if (mobileFitLocked) return;
        mobileLayoutBlend = Math.max(0, Math.min(1, t));
      },
      setMobileFitLerp: (t) => {
        mobileFitLerp = Math.max(0.01, Math.min(1, t));
      },
      setModelBaseYOffset: (vh) => {
        modelBaseYOffsetVh = vh;
      },
      snapMobileFit: () => {
        if (!spinner || !mobileFitActive) return;
        spinner.position.y = mobileFitFinalOffsetY * mobileLayoutBlend + getModelBaseYOffset();
      },
      lockMobileFit: () => {
        mobileFitLocked = true;
        if (!spinner || !mobileFitActive) return;
        spinner.position.y = mobileFitFinalOffsetY * mobileLayoutBlend + getModelBaseYOffset();
      },
      unlockMobileFit: () => {
        mobileFitLocked = false;
      },
      clearMobileFit: () => {
        mobileFitActive = false;
        mobileFitLocked = false;
        mobileLayoutBlend = 0;
        mobileFitFinalOffsetY = 0;
        modelBaseYOffsetVh = 0;
        mobileFitLerp = MOBILE_FIT_LERP_DEFAULT;
        if (spinner) spinner.position.y = 0;
      }
    };

    initThree();

    if (renderer && camera) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = false;
      controls.minDistance = 1.5;
      controls.maxDistance = 8;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5;
      controls.enabled = false;
      controls.target.set(0, 0.3, 0);
    }

    startLoop();

    if ('requestIdleCallback' in window) {
      (
        window as Window &
          typeof globalThis & {
            requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
          }
      ).requestIdleCallback(loadModel, { timeout: 300 });
    } else {
      setTimeout(loadModel, 100);
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  });

  $effect(() => {
    if (controls) controls.enabled = orbitEnabled;
  });

  onDestroy(() => {
    stopLoop();
    scene?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material)
        ? (mesh.material as THREE.Material[])
        : [mesh.material as THREE.Material];
      mats.forEach((m) => m.dispose());
    });
    controls?.dispose();
    renderer?.dispose();
    scene = null;
    renderer = null;
    camera = null;
    modelGroup = null;
    spinner = null;
    controls = null;
    materials = [];
    particleMesh = null;
    particleMat = null;
    iMatBuf = null;
  });

  function initThree() {
    if (!canvasEl || !wrapperEl) return;

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    scene = new THREE.Scene();
    scene.background = null;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
    pmrem.dispose();

    const w = window.innerWidth;
    const h = window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0.3, 0);
    renderer.setSize(w, h);

    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(5, 10, 7);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-5, 2, -5);
    scene.add(fill);
  }

  function loadModel() {
    const loader = createGltfLoader();

    loader.load(
      modelSrc,
      (gltf) => {
        if (!scene || !camera) return;

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        gltf.scene.position.sub(center);

        const fov = camera.fov * (Math.PI / 180);
        const dist = camera.position.z;
        const visibleH = 2 * Math.tan(fov / 2) * dist;
        const maxDim = Math.max(size.x, size.y, size.z);
        baseScale = (visibleH * 0.9 * fitFactor) / maxDim;

       const group = new THREE.Group();
        group.add(gltf.scene);
        group.scale.setScalar(baseScale);

        fitVisibleH = visibleH;
        fitModelW = baseScale * Math.max(size.x, size.z);

        materials = [];
        group.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.computeVertexNormals();
          const chrome = new THREE.MeshPhysicalMaterial({
            color: modelColorHex(),
            metalness: modelMetalness(),
            roughness: modelRoughness(),
            envMapIntensity: 5.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.01,
            transparent: true,
            opacity: 0
          });
          mesh.material = chrome;
          materials.push(chrome);
        });

        modelGroup = group;
        spinner = new THREE.Group();
        spinner.add(group);
        scene.add(spinner);

        buildParticles(group);
        applyViewportFit();
        onModelLoaded?.();
      },
      undefined,
      (err) => {
        console.error('[Scene3D] load error:', err);
        onModelLoaded?.();
      }
    );
  }

  function buildParticles(root: THREE.Group) {
    if (!scene || !spinner) return;

    // FORCE l'update delle matrici world PRIMA di leggerle: senza (true) i
    // nodi interni del GLB possono restare con matrici stantie (bug #9).
    scene.updateMatrixWorld(true);
    root.updateMatrixWorld(true);
    const rootWorldInv = new THREE.Matrix4().copy(root.matrixWorld).invert();

    const geos: THREE.BufferGeometry[] = [];
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || mesh === particleMesh) return;
      const posAttr = mesh.geometry.getAttribute('position') as
        | THREE.BufferAttribute
        | undefined;
      if (!posAttr) return;

      const g = new THREE.BufferGeometry();
      const skinned = mesh as THREE.SkinnedMesh;

      if (skinned.isSkinnedMesh && skinned.skeleton) {
        mesh.updateWorldMatrix(true, false);
        skinned.skeleton.update();
        const baked = new Float32Array(posAttr.count * 3);
        const vp = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
          skinned.getVertexPosition(i, vp);
          baked[i * 3] = vp.x;
          baked[i * 3 + 1] = vp.y;
          baked[i * 3 + 2] = vp.z;
        }
        g.setAttribute('position', new THREE.BufferAttribute(baked, 3));
      } else {
        g.setAttribute('position', posAttr.clone());
      }

      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());

      const deindexed = g.toNonIndexed();
      g.dispose();

      const relMatrix = new THREE.Matrix4().multiplyMatrices(rootWorldInv, mesh.matrixWorld);
      deindexed.applyMatrix4(relMatrix);
      geos.push(deindexed);
    });
    if (geos.length === 0) return;

    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) return;

    const samplerMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial());
    const sampler = new MeshSurfaceSampler(samplerMesh).build();
    const p = new THREE.Vector3();

    for (let i = 0; i < COUNT; i++) {
      sampler.sample(p);
      particleTargets[i * 3] = p.x;
      particleTargets[i * 3 + 1] = p.y;
      particleTargets[i * 3 + 2] = p.z;
    }
    merged.dispose();

    // Resolve the cursor-physics scales from the sampled cloud's local extent,
    // so reach/impulse feel the same across models of different sizes.
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < COUNT; i++) {
      const x = particleTargets[i * 3];
      const y = particleTargets[i * 3 + 1];
      const z = particleTargets[i * 3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const localExtent = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    cursorRadius = localExtent * CURSOR_RADIUS_FRAC;
    cursorPush = localExtent * CURSOR_PUSH_FRAC;
    partMaxOffset = localExtent * PART_MAX_OFFSET_FRAC;
    particleVel.fill(0);
    physicsAsleep = true;

    const REF_BS = 0.6405;
    const particleRadius = (0.012 * REF_BS) / baseScale;
    const dirScale = (8 * REF_BS) / baseScale;
    const directions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      directions[i * 3] = (Math.random() - 0.5) * dirScale;
      directions[i * 3 + 1] = (Math.random() - 0.5) * dirScale;
      directions[i * 3 + 2] = (Math.random() - 0.5) * dirScale;
    }

    const geo = new THREE.SphereGeometry(particleRadius, 4, 4);
    geo.setAttribute('aDirection', new THREE.InstancedBufferAttribute(directions, 3));

    particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uPulse: { value: 0.0 },
        uBaseOpacity: { value: 0.0 },
        uParticleColor: { value: particleColor() }
      },
      vertexShader: `
        attribute vec3 aDirection;
        uniform float uPulse;
        void main() {
          // Idle "breath": particles expand slightly along their scatter dir.
          // Cursor displacement is done on the CPU (see updateParticlePhysics).
          vec3 local = position + aDirection * uPulse;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(local, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uPulse;
        uniform float uBaseOpacity;
        uniform vec3 uParticleColor;
        void main() {
          gl_FragColor = vec4(uParticleColor, uBaseOpacity + uPulse * 0.5);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    particleMesh = new THREE.InstancedMesh(geo, particleMat, COUNT);
    particleMesh.frustumCulled = false;
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleMesh.visible = false;

    iMatBuf = particleMesh.instanceMatrix.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const b = i * 16;
      iMatBuf[b] = 1; iMatBuf[b + 1] = 0; iMatBuf[b + 2] = 0; iMatBuf[b + 3] = 0;
      iMatBuf[b + 4] = 0; iMatBuf[b + 5] = 1; iMatBuf[b + 6] = 0; iMatBuf[b + 7] = 0;
      iMatBuf[b + 8] = 0; iMatBuf[b + 9] = 0; iMatBuf[b + 10] = 1; iMatBuf[b + 11] = 0;
      iMatBuf[b + 15] = 1;
    }
    particleMesh.instanceMatrix.needsUpdate = true;

    root.add(particleMesh);
  }

  function preloadResultModels() {
    const uniquePaths = [...new Set(resultPaths)];
    if (uniquePaths.length === 0) return;
    const loader = createGltfLoader();
    uniquePaths.forEach((path) => {
      loader.load(
        path,
        (gltf) => {
          resultModels.set(path, gltf.scene);
        },
        undefined,
        (err) => {
          console.warn('[Scene3D] preload error:', path, err);
        }
      );
    });
  }

  // Clone, center, scale and chrome-material a result model so it sits
  // exactly where doMorph and snapToResult both need it. Returns null if
  // prerequisites aren't ready.
  // The "safe box" is the gap between the feedback heading and the body text.
  // Measured from the DOM so it is correct on every viewport (desktop and mobile)
  // instead of hardcoded fractions that only matched the desktop layout.
  const RESULT_BOX_FALLBACK_TOP = 0.24; // used only if the texts aren't in the DOM yet
  const RESULT_BOX_FALLBACK_BOTTOM = 0.68;
  const RESULT_BOX_PADDING = 0.02; // breathing room from the texts (fraction of vh)
  // Mobile: the body text is anchored low, so a DOM-measured box drops the model to the
  // bottom. Use a fixed upper band instead (fractions of viewport height). Tune these two
  // to move the model up/down and change its size. Desktop is unaffected.
  const RESULT_BOX_MOBILE_TOP = 0.18;
  const RESULT_BOX_MOBILE_BOTTOM = 0.5;
  const RESULT_MODEL_SCALE_MOBILE = 2; // mobile only: multiply the fitted result size (~2x). Tune.

  function resultBoxFractions(): { topFrac: number; bottomFrac: number } {
    if (window.innerWidth <= 768) {
      return { topFrac: RESULT_BOX_MOBILE_TOP, bottomFrac: RESULT_BOX_MOBILE_BOTTOM };
    }
    const fallback = {
      topFrac: RESULT_BOX_FALLBACK_TOP,
      bottomFrac: RESULT_BOX_FALLBACK_BOTTOM
    };
    const vh = window.innerHeight;
    const heading = document.querySelector<HTMLElement>('.feedback__heading');
    const body = document.querySelector<HTMLElement>('.feedback__body');
    if (!heading || !body || !vh) return fallback;
    const topFrac = heading.getBoundingClientRect().bottom / vh + RESULT_BOX_PADDING;
    const bottomFrac = body.getBoundingClientRect().top / vh - RESULT_BOX_PADDING;
    if (!(bottomFrac > topFrac)) return fallback;
    return { topFrac, bottomFrac };
  }

  const RESULT_BOX_FILL = 0.9; // how much of the box height the model fills
  const RESULT_BOX_WIDTH_FILL = 0.86; // how much of the screen width it may use
  const RESULT_BOX_LIFT = 0; // optical nudge on desktop (fraction of viewport height)
  const RESULT_BOX_LIFT_MOBILE = 0; // fine nudge; the mobile band above sets the position

  /** The result group currently in the scene, so it can be re-framed on layout change. */
  let currentResultGroup: THREE.Group | null = null;

  /** (Re)compute scale + position of a result group from the CURRENT layout.
   *  compensateParent=true (default) cancels the spinner's scale/offset so a STATIC
   *  result sits correctly; it MUST be false during the morph, where the particle
   *  sampling already accounts for the parent transform (otherwise it double-counts,
   *  which mis-places and over-sizes the end-of-section model). */
  function frameResultGroup(group: THREE.Group, compensateParent = true) {
    if (!camera) return;
    const horizExtent = (group.userData.horizExtent as number) || 1;
    const vertExtent = (group.userData.vertExtent as number) || 1;

    const fov = camera.fov * (Math.PI / 180);
    const visibleH = 2 * Math.tan(fov / 2) * camera.position.z; // world height at z = 0
    const visibleW = visibleH * camera.aspect;

    const { topFrac, bottomFrac } = resultBoxFractions();
    const boxWorldH = (bottomFrac - topFrac) * visibleH;
    const boxCenterFrac = (topFrac + bottomFrac) / 2;
    const worldCenterY = (0.5 - boxCenterFrac) * visibleH; // > 0 = above screen center

    // fit BOTH height and width, so it never overflows a narrow phone.
    // NB: the height term uses the LARGEST extent (like the old maxDim), not just size.y —
    // otherwise flat/long models (the crane) get a huge height-scale and end up oversized.
    const fitExtent = Math.max(vertExtent, horizExtent);
    const scale =
      Math.min(
        (boxWorldH * RESULT_BOX_FILL) / fitExtent,
        (visibleW * RESULT_BOX_WIDTH_FILL) / horizExtent
      ) * resultScale;

    // The group lives under `spinner`, whose transform is NOT identity: applyViewportFit()
    // scales the rig down on narrow screens and the topics mobile-fit offsets it in Y.
    // Convert the world-space target into the parent's local space, otherwise the model
    // ends up smaller and vertically shifted (and only a reload looked right). Skipped
    // during the morph, where the particle sampling already handles the parent.
    const parent = group.parent ?? spinner;
    const parentScale = compensateParent && parent ? parent.scale.x || 1 : 1;
    const parentOffsetY = compensateParent && parent ? parent.position.y : 0;

    const lift = (window.innerWidth <= 768 ? RESULT_BOX_LIFT_MOBILE : RESULT_BOX_LIFT) * visibleH;
    // mobile: enlarge the fitted result model (desktop keeps mul = 1).
    const modelScaleMul = window.innerWidth <= 768 ? RESULT_MODEL_SCALE_MOBILE : 1;
    group.scale.setScalar((scale * modelScaleMul) / parentScale);
    group.position.set(0, (worldCenterY + lift - parentOffsetY) / parentScale, 0);
  }

  function buildResultGroup(source: THREE.Group, compensateParent = true): THREE.Group | null {
    if (!camera || !modelGroup) return null;

    // Outer group = placed in the box and scaled. Inner = the geometry, shifted so its
    // visual centre sits on the outer group's origin. Without this the spinner rotates
    // an off-centre group, so the model ORBITS instead of spinning in place — which is
    // why its position looked different (and never right) at every angle.
    const resultGroup = new THREE.Group();
    const inner = source.clone();
    resultGroup.add(inner);
    resultGroup.updateMatrixWorld(true);

    // measure in local units (scale is still 1 here)
    const box = new THREE.Box3().setFromObject(inner);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // the model spins around Y, so its worst-case horizontal extent is the XZ diagonal
    resultGroup.userData.horizExtent = Math.max(Math.hypot(size.x, size.z), 1e-6);
    resultGroup.userData.vertExtent = Math.max(size.y, 1e-6);

    inner.position.sub(center); // recentre the geometry on the rotation pivot
    frameResultGroup(resultGroup, compensateParent); // scale + place from the current layout
    currentResultGroup = resultGroup;

    resultModelMaterials = [];
    resultGroup.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeVertexNormals();
      const chrome = new THREE.MeshPhysicalMaterial({
        color: modelColorHex(),
        metalness: modelMetalness(),
        roughness: modelRoughness(),
        envMapIntensity: 5.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        transparent: true,
        opacity: 0
      });
      mesh.material = chrome;
      resultModelMaterials.push(chrome);
    });

    return resultGroup;
  }

  function doMorph(source: THREE.Group, onDone: () => void) {
    if (!scene || !camera || !spinner || !modelGroup || !particleMesh || !iMatBuf) return;

    // No parent compensation here: the sampling below re-applies the parent transform
    // via relMatrix, so compensating would double-count it (the regression we saw).
    const resultGroup = buildResultGroup(source, false);
    if (!resultGroup) return;


    spinner.add(resultGroup);
    scene.updateMatrixWorld();

    const modelGroupWorldInv = new THREE.Matrix4().copy(modelGroup.matrixWorld).invert();
    const geos: THREE.BufferGeometry[] = [];
    resultGroup.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const posAttr = mesh.geometry.getAttribute('position') as
        | THREE.BufferAttribute
        | undefined;
      if (!posAttr) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', posAttr.clone());
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
      const deindexed = g.toNonIndexed();
      g.dispose();
      const relMatrix = new THREE.Matrix4().multiplyMatrices(
        modelGroupWorldInv,
        mesh.matrixWorld
      );
      deindexed.applyMatrix4(relMatrix);
      geos.push(deindexed);
    });

    if (geos.length === 0) {
      spinner.remove(resultGroup);
      return;
    }
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) {
      spinner.remove(resultGroup);
      return;
    }

    const samplerMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial());
    const sampler = new MeshSurfaceSampler(samplerMesh).build();
    const p = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      sampler.sample(p);
      resultTargets[i * 3] = p.x;
      resultTargets[i * 3 + 1] = p.y;
      resultTargets[i * 3 + 2] = p.z;
    }
    merged.dispose();

    particleCurrent.set(particleTargets);
    particleMesh.visible = true;

    morphState = 'morphing';
    morphElapsed = 0;
    morphDoneCallback = onDone;
  }

  function morphToResult(path: string, onDone: () => void) {
    const cached = resultModels.get(path);
    if (cached) {
      doMorph(cached, onDone);
      return;
    }

    const loader = createGltfLoader();
    loader.load(
      path,
      (gltf) => {
        resultModels.set(path, gltf.scene);
        doMorph(gltf.scene, onDone);
      },
      undefined,
      (err) => {
        console.error('[Scene3D] on-demand load error:', path, err);
      }
    );
  }

  function resetToSolid() {
    scrollDrivenTransition = false;
    transitionPrepared = false;
    transitionState = 'none';
    transitionProgress = 0;
    if (particleMesh) particleMesh.visible = false;
    if (particleMat) {
      particleMat.uniforms.uBaseOpacity.value = 0;
      particleMat.uniforms.uPulse.value = 0;
    }
    materials.forEach((m) => {
      m.visible = true;
      m.transparent = true;
      m.needsUpdate = true;
    });
  }

  function ensureTransitionPrepared() {
    if (transitionPrepared || !particleMesh || !modelGroup) return;
    transitionPrepared = true;
    materials.forEach((m) => {
      if (!m.transparent) {
        m.transparent = true;
        m.needsUpdate = true;
      }
      m.visible = true;
    });
    particleCurrent.fill(0);
    particleMesh.visible = true;
  }

  function applyTransitionVisuals(p: number) {
    if (!particleMesh || !particleMat || !iMatBuf) return;

    if (scrollDrivenTransition) {
      for (let i = 0; i < COUNT; i++) {
        particleCurrent[i * 3] = particleTargets[i * 3] * p;
        particleCurrent[i * 3 + 1] = particleTargets[i * 3 + 1] * p;
        particleCurrent[i * 3 + 2] = particleTargets[i * 3 + 2] * p;
        const b = i * 16 + 12;
        iMatBuf[b] = particleCurrent[i * 3];
        iMatBuf[b + 1] = particleCurrent[i * 3 + 1];
        iMatBuf[b + 2] = particleCurrent[i * 3 + 2];
      }
    } else {
      for (let i = 0; i < COUNT; i++) {
        particleCurrent[i * 3] += (particleTargets[i * 3] - particleCurrent[i * 3]) * 0.04;
        particleCurrent[i * 3 + 1] +=
          (particleTargets[i * 3 + 1] - particleCurrent[i * 3 + 1]) * 0.04;
        particleCurrent[i * 3 + 2] +=
          (particleTargets[i * 3 + 2] - particleCurrent[i * 3 + 2]) * 0.04;
        const b = i * 16 + 12;
        iMatBuf[b] = particleCurrent[i * 3];
        iMatBuf[b + 1] = particleCurrent[i * 3 + 1];
        iMatBuf[b + 2] = particleCurrent[i * 3 + 2];
      }
    }
    particleMesh.instanceMatrix.needsUpdate = true;

    particleMat.uniforms.uPulse.value = Math.sin(p * Math.PI) * SETTLE_PULSE_AMPLITUDE;
    particleMat.uniforms.uBaseOpacity.value = Math.min(0.85, p * 1.7 * 0.85);
    materials.forEach((m) => {
      m.opacity = Math.max(0, 1 - p);
    });
  }

  function finalizeTransition() {
    if (!particleMesh || !particleMat || !iMatBuf) return;
    transitionState = 'done';
    transitionProgress = 1;
    scrollDrivenTransition = false;
    for (let i = 0; i < COUNT; i++) {
      const b = i * 16 + 12;
      iMatBuf[b] = particleTargets[i * 3];
      iMatBuf[b + 1] = particleTargets[i * 3 + 1];
      iMatBuf[b + 2] = particleTargets[i * 3 + 2];
    }
    particleCurrent.set(particleTargets);
    particleVel.fill(0);
    physicsAsleep = true;
    particleMesh.instanceMatrix.needsUpdate = true;
    particleMat.uniforms.uBaseOpacity.value = 0.85;
    particleMat.uniforms.uPulse.value = 0;
    materials.forEach((m) => {
      m.opacity = 0;
      m.visible = false;
    });
  }

  function applyTransitionProgress(t: number) {
    const p = Math.max(0, Math.min(1, t));
    if (p <= 0) {
      resetToSolid();
      return;
    }

    scrollDrivenTransition = true;
    ensureTransitionPrepared();
    transitionProgress = p;
    transitionState = 'in';

    if (p >= 1) {
      finalizeTransition();
      return;
    }

    applyTransitionVisuals(p);
  }

  /** Time-based solid → particles dissolve (~TRANSITION_DURATION). Used on desktop. */
  function startTransition() {
    if (transitionState !== 'none' || !particleMesh) return;
    scrollDrivenTransition = false;
    transitionPrepared = false;
    ensureTransitionPrepared();
    transitionState = 'in';
    transitionProgress = 0;
  }

  function triggerManualPulse(amplitude = MANUAL_PULSE_AMPLITUDE) {
    if (transitionState !== 'done') return;
    manualPulseAmplitude = amplitude;
    manualPulseActive = true;
    manualPulseElapsed = 0;
  }

  function updateParticlePhysics() {
    if (!particleMesh || !iMatBuf || !camera || !modelGroup) return;

    const hovering = pointerInside && particlesHoverActive();
    if (physicsAsleep && !hovering) return; // at rest and untouched -> nothing to do
    physicsAsleep = false;

    // Resolve the cursor to a point in the group's LOCAL space (once per frame),
    // so the sphere tracks correctly even while the cloud idle-rotates.
    let hasCursor = false;
    if (hovering) {
      // Cursor speed from SCREEN (NDC) movement -> immune to the cloud idle spin.
      if (!hoverWasActive) _prevNDC.copy(_hoverNDC);
      const sdx = (_hoverNDC.x - _prevNDC.x) * camera.aspect;
      const sdy = _hoverNDC.y - _prevNDC.y;
      cursorSpeed = Math.hypot(sdx, sdy);
      _prevNDC.copy(_hoverNDC);

      // Transform the world cursor RAY into group-local space (origin + dir), so
      // we can push by perpendicular distance to the line (full-depth pierce).
      raycaster.setFromCamera(_hoverNDC, camera);
      _invMat.copy(modelGroup.matrixWorld).invert();
      _rayOriginLocal.copy(raycaster.ray.origin).applyMatrix4(_invMat);
      _rayDirLocal.copy(raycaster.ray.direction).transformDirection(_invMat).normalize();
      hasCursor = true;
    } else {
      cursorSpeed = 0;
    }
    hoverWasActive = hovering;

    // Extra plow when the cursor moves fast (capped so a flick can't explode).
    const boost = 1 + Math.min(cursorSpeed * CURSOR_SPEED_BOOST, CURSOR_BOOST_MAX);

    const r = cursorRadius;
    const r2 = r * r;
    const maxOff = partMaxOffset;
    const maxOff2 = maxOff * maxOff;
    let maxV2 = 0;

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const hx = particleTargets[ix], hy = particleTargets[ix + 1], hz = particleTargets[ix + 2];
      let cx = particleCurrent[ix], cy = particleCurrent[ix + 1], cz = particleCurrent[ix + 2];
      let vx = particleVel[ix], vy = particleVel[ix + 1], vz = particleVel[ix + 2];

      // (return handled after integration, as a direct ease — no spring/bounce)

      // repulsion from the cursor RAY: push away by perpendicular distance to the
      // line, so the "needle" pierces the whole model in depth (front & back).
      if (hasCursor) {
        const wx = cx - _rayOriginLocal.x;
        const wy = cy - _rayOriginLocal.y;
        const wz = cz - _rayOriginLocal.z;
        const t = wx * _rayDirLocal.x + wy * _rayDirLocal.y + wz * _rayDirLocal.z;
        const dx = wx - _rayDirLocal.x * t; // perpendicular component
        const dy = wy - _rayDirLocal.y * t;
        const dz = wz - _rayDirLocal.z * t;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r2 && d2 > 1e-9) {
          const d = Math.sqrt(d2);
          const f = (1 - d / r) * cursorPush * boost; // linear falloff toward the edge
          const inv = 1 / d;
          vx += dx * inv * f;
          vy += dy * inv * f;
          vz += dz * inv * f;
        }
      }

      // damp + integrate the push velocity (this carries the outward "wake")
      vx *= PART_DAMPING; vy *= PART_DAMPING; vz *= PART_DAMPING;
      cx += vx; cy += vy; cz += vz;
      // ease straight back home: no spring => never overshoots/bounces
      // (the cursor passes THROUGH, like sliding back through a curtain)
      cx += (hx - cx) * PART_RETURN;
      cy += (hy - cy) * PART_RETURN;
      cz += (hz - cz) * PART_RETURN;

      // clamp distance from home so nothing ever flies off
      const ox = cx - hx, oy = cy - hy, oz = cz - hz;
      const o2 = ox * ox + oy * oy + oz * oz;
      if (o2 > maxOff2) {
        const sc = maxOff / Math.sqrt(o2);
        cx = hx + ox * sc; cy = hy + oy * sc; cz = hz + oz * sc;
      }

      particleCurrent[ix] = cx; particleCurrent[ix + 1] = cy; particleCurrent[ix + 2] = cz;
      particleVel[ix] = vx; particleVel[ix + 1] = vy; particleVel[ix + 2] = vz;

      const v2 = vx * vx + vy * vy + vz * vz;
      if (v2 > maxV2) maxV2 = v2;

      const b = i * 16 + 12;
      iMatBuf[b] = cx; iMatBuf[b + 1] = cy; iMatBuf[b + 2] = cz;
    }

    particleMesh.instanceMatrix.needsUpdate = true;

    // Once settled and not hovering, snap exactly home and sleep to spare cycles.
    if (!hovering && maxV2 < PART_SLEEP_V2) {
      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3;
        particleCurrent[ix] = particleTargets[ix];
        particleCurrent[ix + 1] = particleTargets[ix + 1];
        particleCurrent[ix + 2] = particleTargets[ix + 2];
        particleVel[ix] = 0; particleVel[ix + 1] = 0; particleVel[ix + 2] = 0;
        const b = i * 16 + 12;
        iMatBuf[b] = particleTargets[ix];
        iMatBuf[b + 1] = particleTargets[ix + 1];
        iMatBuf[b + 2] = particleTargets[ix + 2];
      }
      particleMesh.instanceMatrix.needsUpdate = true;
      physicsAsleep = true;
    }
  }

  function startLoop() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function particlesHoverActive() {
    return (
      !!particleMesh?.visible &&
      morphState === 'none' &&
      !orbitEnabled &&
      transitionState === 'done'
    );
  }

  function updateHoverPointer(clientX: number, clientY: number) {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Keep the raw pointer NDC fresh; the physics loop reads it each frame.
    _hoverNDC.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  function onPointerMove(event: PointerEvent) {
    pointerInside = true;
    if (particlesHoverActive()) updateHoverPointer(event.clientX, event.clientY);
  }

  function onPointerLeave() {
    pointerInside = false;
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!renderer || !scene || !camera) return;

    const dt = clock.getDelta();
    const elapsed = clock.elapsedTime;

    if (spinner && !orbitEnabled) spinner.rotation.y += IDLE_RAD_S * dt;
    if (
      spinner &&
      !orbitEnabled &&
      morphState === 'none' &&
      !mobileFitLocked &&
      mobileFitActive
    ) {
      const targetY = mobileFitFinalOffsetY * mobileLayoutBlend + getModelBaseYOffset();
      spinner.position.y += (targetY - spinner.position.y) * mobileFitLerp;
    }
    if (controls?.enabled) controls.update();

    if (transitionState === 'in' && particleMesh && particleMat && iMatBuf) {
      if (!scrollDrivenTransition) {
        transitionProgress = Math.min(1, transitionProgress + dt / TRANSITION_DURATION);
      }
      applyTransitionVisuals(transitionProgress);

      if (transitionProgress >= 1) {
        finalizeTransition();
      }
    }

    if (transitionState === 'out' && particleMesh && particleMat) {
      unsettleElapsed += dt;
      const t = Math.min(1, unsettleElapsed / UNSETTLE_DURATION);
      const e = t * t * (3 - 2 * t); 
      particleMat.uniforms.uBaseOpacity.value = 0.85 * (1 - e); 
      materials.forEach((m) => {
        m.opacity = e; 
      });
      if (t >= 1) {
        transitionState = 'none';
        transitionProgress = 0;
        particleMesh.visible = false;
        particleMat.uniforms.uPulse.value = 0;
        particleMat.uniforms.uBaseOpacity.value = 0;
        materials.forEach((m) => {
          m.opacity = 1;
          m.transparent = false;
          m.needsUpdate = true;
        });
        const cb = unsettleDoneCallback;
        unsettleDoneCallback = null;
        cb?.(); 
      }
    }

    if (transitionState === 'done' && morphState === 'none' && particleMat) {
      if (manualPulseActive) {
        manualPulseElapsed += dt;
        const t = Math.min(1, manualPulseElapsed / MANUAL_PULSE_DURATION);
        particleMat.uniforms.uPulse.value = Math.sin(t * Math.PI) * manualPulseAmplitude;
        if (t >= 1) manualPulseActive = false;
      } else {
        particleMat.uniforms.uPulse.value =
          Math.abs(Math.sin(elapsed * IDLE_PULSE_SPEED)) * IDLE_PULSE_AMPLITUDE;
      }
      // Cross-through cursor physics (idle only, model in particles, no orbit).
      if (particleMesh?.visible && !orbitEnabled) updateParticlePhysics();
    }

    if (morphState === 'morphing' && particleMesh && particleMat && iMatBuf) {
      morphElapsed += dt;
      const t = Math.min(1, morphElapsed / MORPH_DURATION);

      for (let i = 0; i < COUNT; i++) {
        particleCurrent[i * 3] += (resultTargets[i * 3] - particleCurrent[i * 3]) * 0.06;
        particleCurrent[i * 3 + 1] +=
          (resultTargets[i * 3 + 1] - particleCurrent[i * 3 + 1]) * 0.06;
        particleCurrent[i * 3 + 2] +=
          (resultTargets[i * 3 + 2] - particleCurrent[i * 3 + 2]) * 0.06;
        const b = i * 16 + 12;
        iMatBuf[b] = particleCurrent[i * 3];
        iMatBuf[b + 1] = particleCurrent[i * 3 + 1];
        iMatBuf[b + 2] = particleCurrent[i * 3 + 2];
      }
      particleMesh.instanceMatrix.needsUpdate = true;

      // Smooth handoff: over the last part of the morph, CROSS-fade the particle
      // cloud OUT while the solid model fades IN (instead of popping the cloud off
      // at the very end). Both eased with smoothstep so there's no hard cut.
      if (t >= MORPH_HANDOFF_START) {
        let k = (t - MORPH_HANDOFF_START) / (1 - MORPH_HANDOFF_START);
        k = k * k * (3 - 2 * k); // smoothstep
        resultModelMaterials.forEach((m) => {
          m.opacity = k;
        });
        particleMat.uniforms.uBaseOpacity.value = 0.85 * (1 - k);
      }

      // Hand the camera to OrbitControls EARLY in the morph, while the cloud is
      // still formless, so its one-time reframe is masked by the transition
      // (no snap when the solid model is finally revealed).
      if (t >= MORPH_ORBIT_AT && controls && !controls.enabled) controls.enabled = true;

      if (t >= 1) {
        morphState = 'none';
        particleMesh.visible = false;
        particleMat.uniforms.uBaseOpacity.value = 0.85; // restore for the next appearance
        resultModelMaterials.forEach((m) => {
          m.opacity = 1;
          m.transparent = false;
          m.needsUpdate = true;
        });
        const cb = morphDoneCallback;
        morphDoneCallback = null;
        cb?.();
      }
    }

    renderer.render(scene, camera);
  }

  function applyViewportFit() {
    if (!spinner || !camera || fitModelW <= 0) return;
    // visibleW shrinks with aspect on narrow windows; scale the rig down to fit.
    const visibleW = fitVisibleH * camera.aspect;
    const fit = Math.min(1, (visibleW * VIEWPORT_FIT_MARGIN) / fitModelW);
    spinner.scale.setScalar(fit);
  }

  function onResize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyViewportFit();
    if (mobileFitActive && mobileFitLocked && spinner) {
      spinner.position.y = mobileFitFinalOffsetY * mobileLayoutBlend + getModelBaseYOffset();
    }
  }
</script>


<div
  class="scene-wrapper"
  bind:this={wrapperEl}
  style:pointer-events={orbitEnabled ? 'auto' : 'none'}
>
  <canvas bind:this={canvasEl}></canvas>
</div>


<style>
  .scene-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>