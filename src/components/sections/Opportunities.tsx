import { useContent, useCopy } from '../../i18n/useContent';
import { Reveal } from '../ui/Reveal';
import styles from './Opportunities.module.scss';

/**
 * "Open to" block. Rendered inside the contact section rather than as its own
 * chapter — the roles someone is open to and how to reach them are one
 * decision for the reader, so they belong in one place.
 */
export function OpenToBlock() {
  const { openTo } = useContent();
  const copy = useCopy();

  return (
    <div className={styles.block}>
      <h3 className={styles.blockLabel}>{copy.contact.openTo}</h3>

      <div className={styles.grid}>
        {openTo.primary.map((o, i) => (
          <Reveal as="article" key={o.title} className={styles.card} delay={i * 80}>
            <span className={styles.num}>0{i + 1}</span>
            <h4 className={styles.title}>{o.title}</h4>
            <p className={styles.line}>{o.line}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className={styles.secondary}>
        <span className={styles.secLabel}>{copy.opportunities.also}</span>
        <p>{openTo.secondary}</p>
      </Reveal>
    </div>
  );
}
