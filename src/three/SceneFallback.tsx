import { asset } from '../lib/asset';
import styles from './SceneFallback.module.scss';

/** Static, GPU-free hero artwork for low-power, reduced-motion, or no-WebGL
 *  devices: a still of the same workbench the live scene renders, produced by
 *  `npm run fallback`. Decorative only — all portfolio content is in the DOM,
 *  so nothing is lost by never running the 3D. */
export function SceneFallback() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <img
        className={styles.image}
        src={asset('/assets/generated/hero/bench-fallback.webp')}
        alt=""
        decoding="async"
      />
      <div className={styles.vignette} />
    </div>
  );
}
