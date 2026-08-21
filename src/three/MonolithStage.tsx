import { Suspense, lazy, useMemo } from 'react';
import { getDeviceProfile } from '../lib/quality';
import { usePrefersReducedMotion } from '../lib/useMediaQuery';
import { MonolithFallback } from './MonolithFallback';

// Lazy-load the whole 3D bundle so it never blocks first paint or ships to
// devices that fall back.
const MonolithCanvas = lazy(() =>
  import('./MonolithCanvas').then((m) => ({ default: m.MonolithCanvas })),
);

/** Chooses the live WebGL scene or the static fallback based on device
 *  capability and motion preference. */
export function MonolithStage() {
  const reduced = usePrefersReducedMotion();
  const profile = useMemo(() => getDeviceProfile(), []);

  // No WebGL, low tier, or reduced-motion → static, calm fallback.
  if (!profile.webgl || profile.tier === 'low' || reduced) {
    return <MonolithFallback />;
  }

  return (
    <Suspense fallback={<MonolithFallback />}>
      <MonolithCanvas profile={profile} />
    </Suspense>
  );
}
