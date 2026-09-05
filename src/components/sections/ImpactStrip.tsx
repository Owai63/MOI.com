import { useContent, useCopy } from '../../i18n/useContent';
import { Reveal } from '../ui/Reveal';
import styles from './ImpactStrip.module.scss';

/**
 * Focus → evidence table placed directly under the hero. It connects the
 * cinematic introduction to the professional record: four disciplines, each
 * with the concrete evidence for it. Every line is a compression of facts
 * already stated in the experience and project data.
 */
export function ImpactStrip() {
  const { impact } = useContent();
  const copy = useCopy();

  return (
    <section id="impact" className={styles.strip} aria-labelledby="impact-title">
      <div className="container">
        <div className={styles.head}>
          <h2 id="impact-title" className="eyebrow">
            {copy.impact.eyebrow}
          </h2>
        </div>

        <dl className={styles.rows}>
          {impact.map((row, i) => (
            <Reveal key={row.focus} className={styles.row} delay={i * 60}>
              <dt className={styles.focus}>{row.focus}</dt>
              <dd className={styles.evidence}>{row.evidence}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
