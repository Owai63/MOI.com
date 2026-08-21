import { asset } from '../lib/asset';
import styles from './MonolithFallback.module.scss';

/** Static, GPU-free hero artwork for low-power, reduced-motion, or no-WebGL
 * devices. Decorative only; all portfolio content remains in the DOM. */
export function MonolithFallback() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <img
        className={styles.image}
        src={asset('/assets/generated/hero/monolith-fallback.webp')}
        alt=""
        decoding="async"
      />
      <div className={styles.vignette} />
    </div>
  );
}
