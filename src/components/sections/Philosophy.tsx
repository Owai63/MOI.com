import { useContent, useCopy } from '../../i18n/useContent';
import { Reveal } from '../ui/Reveal';
import styles from './Philosophy.module.scss';

/**
 * A statement band rather than a full chapter. The four principles are kept
 * — they are the engineering argument — but compressed into a single dense
 * row so the homepage does not spend a full screen on voice.
 */
export function Philosophy() {
  const { philosophy } = useContent();
  const copy = useCopy();
  return (
    <aside id="philosophy" className={styles.band} aria-labelledby="phil-title">
      <div className={`container ${styles.inner}`}>
        <Reveal className={styles.statement}>
          <span className="eyebrow">{copy.philosophy.eyebrow}</span>
          <h2 id="phil-title" className={styles.lead}>
            {philosophy.lead}
          </h2>
        </Reveal>

        <dl className={styles.principles}>
          {philosophy.principles.map((p, i) => (
            <Reveal key={p.k} className={styles.principle} delay={i * 60}>
              <dt className={styles.t}>
                <span className={styles.k}>{p.k}</span>
                {p.t}
              </dt>
              <dd className={styles.d}>{p.d}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </aside>
  );
}
