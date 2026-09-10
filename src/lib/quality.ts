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
    const context = canvas.getContext('webgl2');
    const supported = Boolean(context);
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return supported;
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

  /* CPU count and reported memory are weak proxies for GPU throughput, which
     is the thing that actually matters here — so this only sets a CEILING.
     What the machine really manages is measured at runtime: BenchCanvas opens
     below the ceiling and lets drei's PerformanceMonitor walk the resolution
     up or down from real frame times (see the <PerformanceMonitor> near the
     bottom of that file).

     That division of labour is the whole point, and getting it wrong is
     expensive in one direction only. A ceiling set too low can never be
     recovered from: a machine that could have rendered the scene at dpr 2
     with the post chain on renders it at 1.35 with no anti-aliasing for the
     entire session, and no amount of spare headroom will let it look right.
     A ceiling set too high costs a second or two of adaptation before the
     monitor finds the level — which is exactly what the monitor is for. */
  let tier: QualityTier = 'high';
  if (!webgl || saveData || cores <= 2 || mem <= 2) {
    tier = 'low';
  } else if (coarse || narrow || cores <= 4 || mem <= 4) {
    tier = 'medium';
  }

  /* Touch devices pay for the scene twice: the homepage is a full-viewport fixed
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
