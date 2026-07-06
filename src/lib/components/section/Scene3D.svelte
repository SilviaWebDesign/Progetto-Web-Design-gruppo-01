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

  export interface Scene3DApi {
    setRotationY: (rad: number) => void;
    setScale: (factor: number) => void;
    setOpacity: (val: number) => void;
    settle: () => void;
    unsettle: (onDone?: () => void) => void;
    pulse: () => void;
    resetPulse: () => void;
    snapToParticles: () => void;
    snapToResult: (path: string) => void;
    preloadResultModels: () => void;
    morphToResult: (path: string, onDone: () => void) => void;
    returnToParticles: () => void;
  }

  interface Props {
    api?: Scene3DApi;
    modelSrc: string;
    fitFactor?: number;
    resultScale?: number;
    resultPaths?: string[];
    onModelLoaded?: () => void;
    orbitEnabled?: boolean;
  }
  let {
    api = $bindable(),
    modelSrc,
    fitFactor = 1,
    resultScale = 1,
    resultPaths = [],
    onModelLoaded,
    orbitEnabled = false
  }: Props = $props();

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

  type TState = 'none' | 'in' | 'out' | 'done';
  let transitionState: TState = 'none';
  let transitionProgress = 0;
  const TRANSITION_DURATION = 2.0;

  const SETTLE_PULSE_AMPLITUDE = 0.4;
  let unsettleElapsed = 0;
  const UNSETTLE_DURATION = 0.6;
  let unsettleDoneCallback: (() => void) | null = null;

  let manualPulseActive = false;
  let manualPulseElapsed = 0;
  const MANUAL_PULSE_DURATION = 1.5;
  const MANUAL_PULSE_AMPLITUDE = 0.4; 
  const IDLE_PULSE_AMPLITUDE = 0.06;
  const IDLE_PULSE_SPEED = Math.PI * 0.8; // rallentata dell'20% rispetto al ciclo originale (Math.PI)


  const _hoverNDC = new THREE.Vector2();
  let pointerInside = false;
  const HOVER_STRENGTH_RATE = 10; 

  const resultModels = new Map<string, THREE.Group>();

  const resultTargets = new Float32Array(COUNT * 3);
  type MorphState = 'none' | 'morphing';
  let morphState: MorphState = 'none';
  let morphElapsed = 0;
  const MORPH_DURATION = 1.5;
  let morphDoneCallback: (() => void) | null = null;
  let resultModelMaterials: THREE.MeshPhysicalMaterial[] = [];

  onMount(() => {
    if (!canvasEl || !wrapperEl) return;

    api = {
      setRotationY: (rad) => {
        if (modelGroup) modelGroup.rotation.y = rad;
      },
      setScale: (f) => {
        if (modelGroup) modelGroup.scale.setScalar(baseScale * f);
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
      pulse: triggerManualPulse,
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
        morphState = 'none';

        for (let i = 0; i < COUNT; i++) {
          const b = i * 16 + 12;
          iMatBuf[b] = particleTargets[i * 3];
          iMatBuf[b + 1] = particleTargets[i * 3 + 1];
          iMatBuf[b + 2] = particleTargets[i * 3 + 2];
        }
        particleCurrent.set(particleTargets);
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
      returnToParticles: () => {
        if (controls) controls.enabled = false;
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
            color: 0x181818,
            metalness: 1.0,
            roughness: 0.015,
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
        uPointerNDC: { value: new THREE.Vector2() },
        uHoverRadiusNDC: { value: 0.18 },
        uHoverPush: { value: 0.2 },
        uHoverStrength: { value: 0.0 },
        uHoverJitter: { value: 1.0 },
        uAspect: { value: camera ? camera.aspect : 1 }
      },
      vertexShader: `
        attribute vec3 aDirection;
        uniform float uPulse;
        uniform vec2 uPointerNDC;
        uniform float uHoverRadiusNDC;
        uniform float uHoverPush;
        uniform float uHoverStrength;
        uniform float uHoverJitter;
        uniform float uAspect;

        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }

        void main() {
          vec3 local = position + aDirection * uPulse;
          vec3 instPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

          // particle vertex and center in VIEW space (camera-aligned)
          vec4 vertView = modelViewMatrix * instanceMatrix * vec4(local, 1.0);
          vec4 centerView = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

          // project center to screen (NDC) -> distance to cursor ignores depth
          vec4 centerClip = projectionMatrix * centerView;
          vec2 ndc = centerClip.xy / max(centerClip.w, 0.0001);

          // stable per-particle randoms
          float r1 = hash(instPos + 1.3);
          float r2 = hash(instPos + 5.7);
          float r3 = hash(instPos + 9.1);

          // domain-warp the sample point: affected zone is blobby, not a circle
          vec2 warp = (vec2(r1, r2) - 0.5) * uHoverJitter * 0.14;
          vec2 d = (ndc + warp) - uPointerNDC;
          d.x *= uAspect;
          float dist = length(d);

          float infl = smoothstep(uHoverRadiusNDC, uHoverRadiusNDC * 0.2, dist) * uHoverStrength;

          // direction: per-particle turbulent angle blended with radial.
          // mostly turbulent -> particles scatter instead of clearing a clean sphere
          float a = r3 * 6.2831853;
          vec2 turb = vec2(cos(a), sin(a));
          vec2 radial = dist > 0.0001 ? normalize(d) : turb;
          vec2 dir = normalize(mix(radial, turb, uHoverJitter * 0.8) + 1e-4);

          float pushAmt = uHoverPush * (0.5 + r1);
          vertView.xy += dir * infl * pushAmt;

          gl_Position = projectionMatrix * vertView;
        }
      `,
      fragmentShader: `
        uniform float uPulse;
        uniform float uBaseOpacity;
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, uBaseOpacity + uPulse * 0.5);
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
  function buildResultGroup(source: THREE.Group): THREE.Group | null {
    if (!camera || !modelGroup) return null;

    const resultGroup = source.clone();
    resultGroup.updateMatrixWorld(true);

    // --- fit the model into a "safe box" between the top heading and the bottom text ---
    // box edges as fractions of viewport height (0 = top, 1 = bottom)
    const RESULT_BOX_TOP = 0.24; // just below the heading
    const RESULT_BOX_BOTTOM = 0.68; // just above the body text
   const RESULT_BOX_FILL = 0.9; // how much of the box the model fills
    const RESULT_BOX_LIFT = 0.06; // extra upward nudge (fraction of viewport height)

    const fov = camera.fov * (Math.PI / 180);
    const visibleH = 2 * Math.tan(fov / 2) * camera.position.z; // world height at z = 0
    const boxWorldH = (RESULT_BOX_BOTTOM - RESULT_BOX_TOP) * visibleH;
    const boxCenterFrac = (RESULT_BOX_TOP + RESULT_BOX_BOTTOM) / 2;
    const worldCenterY = (0.5 - boxCenterFrac) * visibleH; // > 0 = above screen center

    // 1) scale so the model's largest dimension fills the box (rotation-safe)
    const box = new THREE.Box3().setFromObject(resultGroup);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    resultGroup.scale.setScalar((boxWorldH * RESULT_BOX_FILL * resultScale) / maxDim);

    // 2) recenter on the SCALED bounding box, then lift to the box center
    resultGroup.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(resultGroup);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    const RESULT_OPTICAL_LIFT = 0.04; // frazione di boxWorldH, da tarare a occhio

    resultGroup.position.sub(scaledCenter);
    resultGroup.position.y += worldCenterY + RESULT_BOX_LIFT * visibleH;

    resultModelMaterials = [];
    resultGroup.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeVertexNormals();
      const chrome = new THREE.MeshPhysicalMaterial({
        color: 0x181818,
        metalness: 1.0,
        roughness: 0.015,
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

    const resultGroup = buildResultGroup(source);
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

  function startTransition() {
    if (transitionState !== 'none' || !particleMesh) return;
    materials.forEach((m) => {
      if (!m.transparent) {
        m.transparent = true;
        m.needsUpdate = true;
      }
    });
    transitionState = 'in';
    transitionProgress = 0;
    particleCurrent.fill(0);
    particleMesh.visible = true;
  }

  function triggerManualPulse() {
    if (transitionState !== 'done') return;
    manualPulseActive = true;
    manualPulseElapsed = 0;
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
    if (!renderer || !particleMat) return;
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    _hoverNDC.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    particleMat.uniforms.uPointerNDC.value.lerp(_hoverNDC, 0.5);
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
    if (controls?.enabled) controls.update();

    if (particleMat) {
      const hoverTarget = pointerInside && particlesHoverActive() ? 1 : 0;
      const u = particleMat.uniforms.uHoverStrength;
      u.value += (hoverTarget - u.value) * Math.min(1, dt * HOVER_STRENGTH_RATE);
    }

    if (transitionState === 'in' && particleMesh && particleMat && iMatBuf) {
      transitionProgress = Math.min(1, transitionProgress + dt / TRANSITION_DURATION);

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
      particleMesh.instanceMatrix.needsUpdate = true;

      particleMat.uniforms.uPulse.value = Math.sin(transitionProgress * Math.PI) * SETTLE_PULSE_AMPLITUDE;
      particleMat.uniforms.uBaseOpacity.value = Math.min(0.85, transitionProgress * 1.7 * 0.85);
      materials.forEach((m) => {
        m.opacity = Math.max(0, 1 - transitionProgress);
      });

      if (transitionProgress >= 1) {
        transitionState = 'done';
        for (let i = 0; i < COUNT; i++) {
          const b = i * 16 + 12;
          iMatBuf[b] = particleTargets[i * 3];
          iMatBuf[b + 1] = particleTargets[i * 3 + 1];
          iMatBuf[b + 2] = particleTargets[i * 3 + 2];
        }
        particleMesh.instanceMatrix.needsUpdate = true;
        particleMat.uniforms.uBaseOpacity.value = 0.85;
        materials.forEach((m) => {
          m.opacity = 0;
          m.visible = false;
        });
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
        particleMat.uniforms.uPulse.value = Math.sin(t * Math.PI) * MANUAL_PULSE_AMPLITUDE;
        if (t >= 1) manualPulseActive = false;
      } else {
        particleMat.uniforms.uPulse.value =
          Math.abs(Math.sin(elapsed * IDLE_PULSE_SPEED)) * IDLE_PULSE_AMPLITUDE;
      }
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

      if (t >= 0.8) {
        const fadeT = (t - 0.8) / 0.2;
        resultModelMaterials.forEach((m) => {
          m.opacity = fadeT;
        });
      }

      if (t >= 1) {
        morphState = 'none';
        particleMesh.visible = false;
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
    if (particleMat) particleMat.uniforms.uAspect.value = camera.aspect;
    applyViewportFit();
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