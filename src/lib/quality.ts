/** Device performance tiering + WebGL capability detection.
 *  Drives adaptive quality for the 3D scene and the no-WebGL fallback. */

export type QualityTier = 'high' | 'medium' | 'low';

export interface DeviceProfile {
  tier: QualityTier;
  webgl: boolean;
  dpr: [number, number];
  postprocessing: boolean;
  /** MSAA. Off on touch devices — see getDeviceProfile. */
  antialias: boolean;
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

  /* Touch devices pay for the scene twice: the bench is a full-viewport fixed
     canvas, so every frame is both rendered and then composited underneath
     scrolling page content. Capping resolution and dropping MSAA there is the
     difference between a smooth scroll and a stuttering one, and at phone
     pixel densities neither is visible — the edges are already sub-pixel. */
  cached = {
    tier,
    webgl,
    dpr: tier === 'low' ? [1, 1] : coarse ? [1, 1.25] : tier === 'high' ? [1, 2] : [1, 1.5],
    postprocessing: tier === 'high',
    antialias: tier !== 'low' && !coarse,
  };
  return cached;
}
