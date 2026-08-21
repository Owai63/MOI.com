import { Suspense, lazy, useEffect, useMemo } from 'react';
import { getDeviceProfile } from '../lib/quality';
import { usePrefersReducedMotion } from '../lib/useMediaQuery';
import { SceneFallback } from './SceneFallback';
import { resetSceneState } from './sceneState';
import type { StageMode } from './bench/BenchCanvas';

// Lazy-load the whole 3D bundle so it never blocks first paint or ships to
// devices that fall back.
const BenchCanvas = lazy(() =>
  import('./bench/BenchCanvas').then((m) => ({ default: m.BenchCanvas })),
);

/**
 * Chooses the live workbench or the static fallback based on device capability
 * and motion preference.
 *
 * `mode="inspect"` puts a single device on the case study's inspection stage,
 * `mode="range"` dresses the shooting-range lane, and the default shows the
 * whole bench.
 */
export function BenchStage({
  mode = 'bench',
  slug,
}: {
  mode?: StageMode;
  slug?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const profile = useMemo(() => getDeviceProfile(), []);

  // A route change swaps which page the scene is serving; clear the pose so
  // the new one never inherits the old page's camera station or explosion.
  useEffect(() => {
    resetSceneState(mode);
  }, [mode, slug]);

  // No WebGL, low tier, or reduced-motion → static, calm fallback.
  if (!profile.webgl || profile.tier === 'low' || reduced) {
    return <SceneFallback />;
  }

  return (
    <Suspense fallback={<SceneFallback />}>
      <BenchCanvas profile={profile} mode={mode} slug={slug} />
    </Suspense>
  );
}
