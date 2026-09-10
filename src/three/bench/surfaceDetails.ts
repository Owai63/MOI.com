import * as THREE from 'three';

const maps = new Map<string, THREE.DataTexture>();
/** Sub-millimetre surface variation, shared across hardware instances. */
export function microSurface(kind: 'polymer' | 'metal') {
  const found = maps.get(kind);
  if (found) return found;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  let seed = 14839;
  for (let y = 0; y < size; y++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const line = seed / 4294967295;
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 4294967295;
      const h = kind === 'metal' ? line * 0.8 + noise * 0.2 : noise;
      const at = (y * size + x) * 4;
      data[at] = data[at + 1] = data[at + 2] = Math.round(170 + h * 85);
      data[at + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(kind === 'metal' ? 2 : 6, kind === 'metal' ? 7 : 6);
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  maps.set(kind, map);
  return map;
}

export function disposeSurfaceDetails() {
  maps.forEach(map => map.dispose());
  maps.clear();
}
