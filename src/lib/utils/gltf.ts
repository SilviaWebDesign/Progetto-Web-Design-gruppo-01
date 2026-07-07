import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Shared Draco decoder, loaded once and reused by every GLTFLoader.
let dracoLoader: DRACOLoader | null = null;

function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    // Google-hosted decoder; also handles uncompressed GLBs transparently.
    dracoLoader.setDecoderPath('/draco/');
  }
  return dracoLoader;
}

/**
 * A GLTFLoader with Draco decoding enabled.
 * Works for both Draco-compressed and plain GLBs, so it is safe everywhere.
 */
export function createGltfLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(getDracoLoader());
  return loader;
}