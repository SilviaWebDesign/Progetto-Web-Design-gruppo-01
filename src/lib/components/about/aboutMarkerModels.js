import * as THREE from 'three';

const DEFAULT_MARKER_SIZE = 1.15;
const MARKER_RADIUS = DEFAULT_MARKER_SIZE / 2;
const PARTICLE_COUNT = 4500;

/** Stessi riferimenti visivi di Scene3D / infrastrutture. */
const INFRA_BS = 0.6405;
const PARTICLE_RADIUS = (0.012 * INFRA_BS) / DEFAULT_MARKER_SIZE;
const PULSE_DIR_SCALE = (8 * INFRA_BS) / DEFAULT_MARKER_SIZE;
const IDLE_PULSE_SPEED = 0.65;
const HOVER_SCATTER_SCALE = PULSE_DIR_SCALE * 0.38;
const HOVER_IN_LERP = 0.055;
const HOVER_OUT_LERP = 0.035;
const FOCUS_HOVER_IN_LERP = 0.09;
const FOCUS_HOVER_OUT_LERP = 0.065;
const BASE_OPACITY = 0.85;
const ACTIVE_OPACITY = 0.95;
/** Colore particelle marker — allineato al testo UI (#161A1F). */
const MARKER_COLOR_RGB = 'vec3(0.0862745, 0.1019608, 0.1215686)';
const PART_RETURN = 0.10;
const PART_DAMPING = 0.86;
const CURSOR_RADIUS_FRAC = 0.056;
const CURSOR_PUSH_FRAC = 0.028;
const PART_MAX_OFFSET_FRAC = 0.4;
const PART_SLEEP_V2 = 1e-8;
const CURSOR_SPEED_BOOST = 24;
const CURSOR_BOOST_MAX = 3;

const raycaster = new THREE.Raycaster();
const _rayOriginLocal = new THREE.Vector3();
const _rayDirLocal = new THREE.Vector3();
const _invMat = new THREE.Matrix4();

/**
 * @param {number} count
 * @param {number} radius
 * @returns {Float32Array}
 */
function sampleSphereSurface(count, radius) {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1);
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = golden * i;
    const sinInc = Math.sin(inclination);

    positions[i * 3] = radius * sinInc * Math.cos(azimuth);
    positions[i * 3 + 1] = radius * Math.cos(inclination);
    positions[i * 3 + 2] = radius * sinInc * Math.sin(azimuth);
  }

  return positions;
}

/**
 * @param {boolean} active
 * @returns {THREE.InstancedMesh}
 */
function buildParticleSphereMesh(active = false) {
  const targets = sampleSphereSurface(PARTICLE_COUNT, MARKER_RADIUS * 0.96);
  const directions = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    directions[i * 3] = (Math.random() - 0.5) * PULSE_DIR_SCALE;
    directions[i * 3 + 1] = (Math.random() - 0.5) * PULSE_DIR_SCALE;
    directions[i * 3 + 2] = (Math.random() - 0.5) * PULSE_DIR_SCALE;
  }

  const geo = new THREE.SphereGeometry(PARTICLE_RADIUS, 4, 4);
  geo.setAttribute('aDirection', new THREE.InstancedBufferAttribute(directions, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPulse: { value: 0.0 },
      uHover: { value: 0.0 },
      uTime: { value: 0.0 },
      uHoverScatter: { value: HOVER_SCATTER_SCALE },
      uBaseOpacity: { value: active ? ACTIVE_OPACITY : BASE_OPACITY }
    },
    vertexShader: /* glsl */ `
      attribute vec3 aDirection;
      uniform float uPulse;

      void main() {
        // Same idea as Scene3D's particle shader:
        // "breath" = expand along each particle's scatter direction (aDirection)
        // driven by uPulse. (About keeps uHover/uTime uniforms for compatibility.)
        vec3 local = position + aDirection * uPulse;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(local, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uPulse;
      uniform float uBaseOpacity;
      void main() {
        float alpha = uBaseOpacity + uPulse * 0.5;
        gl_FragColor = vec4(${MARKER_COLOR_RGB}, alpha);
      }
    `,
    transparent: true,
    depthWrite: false
  });

  const mesh = new THREE.InstancedMesh(geo, material, PARTICLE_COUNT);
  mesh.frustumCulled = false;
  mesh.userData.isMarkerParticles = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    position.set(targets[i * 3], targets[i * 3 + 1], targets[i * 3 + 2]);
    matrix.makeTranslation(position.x, position.y, position.z);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  const current = targets.slice();
  const velocity = new Float32Array(PARTICLE_COUNT * 3);
  const localExtent = MARKER_RADIUS * 2;
  mesh.userData.particleState = {
    targets,
    current,
    velocity,
    iMatBuf: mesh.instanceMatrix.array,
    cursorRadius: localExtent * CURSOR_RADIUS_FRAC,
    cursorPush: localExtent * CURSOR_PUSH_FRAC,
    maxOffset: localExtent * PART_MAX_OFFSET_FRAC,
    physicsAsleep: true,
    hoverWasActive: false,
    cursorSpeed: 0,
    prevNdc: new THREE.Vector2()
  };

  return mesh;
}

/** @param {THREE.Object3D} markerRoot @param {string} _modelSrc @param {THREE.Vector3} worldPoint */
export function orientMarkerTowardWorldPoint(markerRoot, _modelSrc, worldPoint) {
  const pos = markerRoot.position;
  const dx = worldPoint.x - pos.x;
  const dz = worldPoint.z - pos.z;
  if (dx * dx + dz * dz < 1e-8) return;
  markerRoot.rotation.y = Math.atan2(dx, dz);
}

/** @param {THREE.Object3D} object @param {boolean} active */
export function applyMarkerMaterial(object, active = false) {
  object.traverse((child) => {
    if (!(child instanceof THREE.InstancedMesh) || !child.userData.isMarkerParticles) return;
    const mat = child.material;
    if (!(mat instanceof THREE.ShaderMaterial)) return;
    mat.uniforms.uBaseOpacity.value = active ? ACTIVE_OPACITY : BASE_OPACITY;
  });
}

/** @param {THREE.Object3D} object @param {number} elapsedSeconds @param {boolean} [active] */
export function updateMarkerParticlePulse(object, elapsedSeconds, active = false) {
  const pulseAmp = active ? 0.06 : 0.04;
  const pulse = Math.abs(Math.sin(elapsedSeconds * Math.PI * IDLE_PULSE_SPEED)) * pulseAmp;

  object.traverse((child) => {
    if (!(child instanceof THREE.InstancedMesh) || !child.userData.isMarkerParticles) return;
    const mat = child.material;
    if (!(mat instanceof THREE.ShaderMaterial)) return;
    mat.uniforms.uPulse.value = pulse;
  });
}

/** @param {THREE.Object3D} object @param {THREE.Camera} camera @param {THREE.Vector2} pointerNdc @param {boolean} hovering */
export function updateMarkerCursorPhysics(object, camera, pointerNdc, hovering) {
  object.traverse((child) => {
    if (!(child instanceof THREE.InstancedMesh) || !child.userData.isMarkerParticles) return;
    const state = child.userData.particleState;
    if (!state) return;

    const {
      targets,
      current,
      velocity,
      iMatBuf,
      cursorRadius,
      cursorPush,
      maxOffset,
      prevNdc
    } = state;

    if (state.physicsAsleep && !hovering) return;
    state.physicsAsleep = false;

    let hasCursor = false;
    if (hovering) {
      if (!state.hoverWasActive) prevNdc.copy(pointerNdc);
      const sdx = (pointerNdc.x - prevNdc.x) * (/** @type {THREE.PerspectiveCamera} */ (camera)).aspect;
      const sdy = pointerNdc.y - prevNdc.y;
      state.cursorSpeed = Math.hypot(sdx, sdy);
      prevNdc.copy(pointerNdc);

      raycaster.setFromCamera(pointerNdc, camera);
      _invMat.copy(child.matrixWorld).invert();
      _rayOriginLocal.copy(raycaster.ray.origin).applyMatrix4(_invMat);
      _rayDirLocal.copy(raycaster.ray.direction).transformDirection(_invMat).normalize();
      hasCursor = true;
    } else {
      state.cursorSpeed = 0;
    }
    state.hoverWasActive = hovering;

    const boost = 1 + Math.min(state.cursorSpeed * CURSOR_SPEED_BOOST, CURSOR_BOOST_MAX);
    const r2 = cursorRadius * cursorRadius;
    const maxOff2 = maxOffset * maxOffset;
    let maxV2 = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const hx = targets[ix], hy = targets[ix + 1], hz = targets[ix + 2];
      let cx = current[ix], cy = current[ix + 1], cz = current[ix + 2];
      let vx = velocity[ix], vy = velocity[ix + 1], vz = velocity[ix + 2];

      if (hasCursor) {
        const wx = cx - _rayOriginLocal.x;
        const wy = cy - _rayOriginLocal.y;
        const wz = cz - _rayOriginLocal.z;
        const t = wx * _rayDirLocal.x + wy * _rayDirLocal.y + wz * _rayDirLocal.z;
        const dx = wx - _rayDirLocal.x * t;
        const dy = wy - _rayDirLocal.y * t;
        const dz = wz - _rayDirLocal.z * t;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r2 && d2 > 1e-9) {
          const d = Math.sqrt(d2);
          const f = (1 - d / cursorRadius) * cursorPush * boost;
          const inv = 1 / d;
          vx += dx * inv * f;
          vy += dy * inv * f;
          vz += dz * inv * f;
        }
      }

      vx *= PART_DAMPING;
      vy *= PART_DAMPING;
      vz *= PART_DAMPING;
      cx += vx;
      cy += vy;
      cz += vz;
      cx += (hx - cx) * PART_RETURN;
      cy += (hy - cy) * PART_RETURN;
      cz += (hz - cz) * PART_RETURN;

      const ox = cx - hx, oy = cy - hy, oz = cz - hz;
      const o2 = ox * ox + oy * oy + oz * oz;
      if (o2 > maxOff2) {
        const sc = maxOffset / Math.sqrt(o2);
        cx = hx + ox * sc;
        cy = hy + oy * sc;
        cz = hz + oz * sc;
      }

      current[ix] = cx;
      current[ix + 1] = cy;
      current[ix + 2] = cz;
      velocity[ix] = vx;
      velocity[ix + 1] = vy;
      velocity[ix + 2] = vz;

      const v2 = vx * vx + vy * vy + vz * vz;
      if (v2 > maxV2) maxV2 = v2;

      const b = i * 16 + 12;
      iMatBuf[b] = cx;
      iMatBuf[b + 1] = cy;
      iMatBuf[b + 2] = cz;
    }

    child.instanceMatrix.needsUpdate = true;

    if (!hovering && maxV2 < PART_SLEEP_V2) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        current[ix] = targets[ix];
        current[ix + 1] = targets[ix + 1];
        current[ix + 2] = targets[ix + 2];
        velocity[ix] = 0;
        velocity[ix + 1] = 0;
        velocity[ix + 2] = 0;
        const b = i * 16 + 12;
        iMatBuf[b] = targets[ix];
        iMatBuf[b + 1] = targets[ix + 1];
        iMatBuf[b + 2] = targets[ix + 2];
      }
      child.instanceMatrix.needsUpdate = true;
      state.physicsAsleep = true;
    }
  });
}

/**
 * Scatter random delle particelle (solo in focus + hover).
 * @param {THREE.Object3D} object
 * @param {number} elapsedSeconds
 * @param {number} targetStrength 0–1
 * @param {boolean} [focusMode]
 */
export function updateMarkerParticleScatter(object, elapsedSeconds, targetStrength, focusMode = false) {
  object.traverse((child) => {
    if (!(child instanceof THREE.InstancedMesh) || !child.userData.isMarkerParticles) return;
    const mat = child.material;
    if (!(mat instanceof THREE.ShaderMaterial)) return;

    const current = mat.uniforms.uHover.value;
    const lerp =
      targetStrength > current
        ? focusMode
          ? FOCUS_HOVER_IN_LERP
          : HOVER_IN_LERP
        : focusMode
          ? FOCUS_HOVER_OUT_LERP
          : HOVER_OUT_LERP;

    mat.uniforms.uTime.value = elapsedSeconds;
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(current, targetStrength, lerp);
  });
}

/** @param {THREE.Object3D} object */
export function resetMarkerParticleScatter(object) {
  updateMarkerParticleScatter(object, 0, 0);
}

export function preloadAboutMarkerModels() {
  return Promise.resolve();
}

/** @param {string} [_url] @param {boolean} [active] */
export function createMarkerParticleSphere(_url, active = false) {
  const group = new THREE.Group();

  const particles = buildParticleSphereMesh(active);
  particles.position.y = MARKER_RADIUS;
  group.add(particles);

  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(MARKER_RADIUS * 0.9, 14, 14),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = MARKER_RADIUS;
  group.add(hit);

  return group;
}

/** Compatibilità con il vecchio nome. */
export const cloneMarkerModel = createMarkerParticleSphere;

/** @param {THREE.Object3D} object */
export function disposeMarkerGeometries(object) {
  object.traverse((child) => {
    if (child instanceof THREE.InstancedMesh) {
      child.geometry?.dispose();
      child.material?.dispose();
      return;
    }
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry?.dispose();
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => m.dispose());
  });
}
