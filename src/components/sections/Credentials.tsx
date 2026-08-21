import { useContent, useCopy } from '../../i18n/useContent';
import { Reveal } from '../ui/Reveal';
import styles from './Credentials.module.scss';

/**
 * Certification list. This is a *block*, not a section — it renders inside the
 * merged "Education, Recognition & Credentials" section so the homepage does
 * not spend two full chapters on the same kind of evidence.
 */
export function CredentialsList() {
  const { certifications } = useContent();
  const copy = useCopy();

  return (
    <div className={styles.block}>
      <h3 className={styles.blockLabel}>{copy.recognition.certsLabel}</h3>

      <ul className={styles.list}>
        {certifications.map((c, i) => (
          <Reveal as="li" key={c.title} delay={i * 40}>
            <a
              className={styles.item}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className={styles.head}>
                <span className={styles.issuer}>{c.issuer}</span>
                <span className={styles.year}>{c.year}</span>
              </div>
              <h4 className={styles.title}>{c.title}</h4>
              <div className={styles.skills}>
                {c.skills.map((s) => (
                  <span key={s} data-latin>
                    {s}
                  </span>
                ))}
              </div>
              <span className={styles.verify}>
                {copy.credentials.verify}
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 10L10 2M4 2h6v6" stroke="currentColor" fill="none" strokeWidth="1.2" />
                </svg>
              </span>
            </a>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
