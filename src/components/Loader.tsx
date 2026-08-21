import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../lib/useMediaQuery';
import { useContent, useUi } from '../i18n/useContent';
import styles from './Loader.module.scss';

/** Minimal loading sequence — a calm hold + a single progress line, then a
 *  curtain wipe. Not a boot terminal. */
export function Loader() {
  const [done, setDone] = useState(false);
  const reduced = usePrefersReducedMotion();
  const { profile } = useContent();
  const ui = useUi();

  useEffect(() => {
    const hold = reduced ? 300 : 1500;
    const t = setTimeout(() => setDone(true), hold);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className={styles.loader}
          initial={{ opacity: 1 }}
          exit={{ y: '-100%' }}
          transition={{ duration: reduced ? 0.2 : 0.9, ease: [0.76, 0, 0.24, 1] }}
          aria-hidden="true"
        >
          <div className={styles.inner}>
            <div className={styles.eyebrow}>{ui.loaderEyebrow}</div>
            <div className={styles.name}>{profile.displayName}</div>
            <div className={styles.bar}>
              <motion.span
                className={styles.fill}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: reduced ? 0.2 : 1.3, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
