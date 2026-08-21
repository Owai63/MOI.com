/** Device performance tiering + WebGL capability detection.
 *  Drives adaptive quality for the 3D scene and the no-WebGL fallback. */

export type QualityTier = 'high' | 'medium' | 'low';

export interface DeviceProfile {
  tier: QualityTier;
  webgl: boolean;
  dpr: [number, number];
  postprocessing: boolean;
}

let cached: DeviceProfile | null = null;

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function getDeviceProfile(): DeviceProfile {
  if (cached) return cached;

  const webgl = detectWebGL();
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const narrow = window.innerWidth < 900;
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData === true;

  let tier: QualityTier = 'high';
  if (!webgl || saveData || cores <= 2 || mem <= 2) {
    tier = 'low';
  } else if (coarse || narrow || cores <= 4 || mem <= 4) {
    tier = 'medium';
  }

  cached = {
    tier,
    webgl,
    dpr: tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [1, 1],
    postprocessing: tier === 'high',
  };
  return cached;
}
