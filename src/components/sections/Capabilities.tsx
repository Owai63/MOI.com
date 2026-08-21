import { useContent, useCopy } from '../../i18n/useContent';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import styles from './Capabilities.module.scss';

export function Capabilities() {
  const { capabilities } = useContent();
  const copy = useCopy();
  return (
    <section id="capabilities" className="section section-tint" aria-labelledby="cap-title">
      <div className="container">
        <SectionHeading
          id="cap-title"
          index="02"
          eyebrow={copy.capabilities.eyebrow}
          title={copy.capabilities.title}
        />

        <div className={styles.stack}>
          {capabilities.map((c, i) => (
            <Reveal as="article" key={c.id} className={styles.row} delay={i * 60}>
              <div className={styles.left}>
                <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className={styles.title}>{c.title}</h3>
                  <p className={styles.line}>{c.line}</p>
                </div>
              </div>
              <ul className={styles.items}>
                {c.items.map((it) => (
                  <li key={it} data-latin>
                    {it}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
