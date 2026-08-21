import { useContent, useCopy } from '../../i18n/useContent';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { CredentialsList } from './Credentials';
import styles from './Recognition.module.scss';

/** Education, awards and certifications — one section rather than three,
 *  since they are all the same kind of evidence to a reader. */
export function Recognition() {
  const { education, awards } = useContent();
  const copy = useCopy();
  return (
    <section id="about" className="section section-grid" aria-labelledby="rec-title">
      <div className="container">
        <SectionHeading
          id="rec-title"
          index="04"
          eyebrow={copy.recognition.eyebrow}
          title={copy.recognition.title}
        />

        <div className={styles.grid}>
          <Reveal className={styles.edu}>
            <span className={styles.tag}>{copy.recognition.education}</span>
            <h3 className={styles.degree}>
              {education.degree} {copy.recognition.degreeConnector} {education.field}
            </h3>
            <div className={styles.uni}>
              {education.university} · {education.years}
            </div>
            <div className={styles.gpa}>
              <span className={styles.gpaNum}>{education.cgpa}</span>
              <span className={styles.gpaScale}>
                {copy.recognition.cgpa} {education.cgpaScale}
              </span>
            </div>
          </Reveal>

          <div className={styles.awards}>
            <h3 className={styles.awardsLabel}>{copy.recognition.awardsLabel}</h3>
            {awards.map((a, i) => (
              <Reveal as="article" key={a.rank} className={styles.medal} delay={i * 100}>
                <span
                  className={`${styles.disc} ${i === 0 ? styles.gold : styles.silver}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path
                      d="M12 2l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 15.9 6.8 18l1-5.8L3.6 8.1l5.8-.8z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <div>
                  <div className={styles.rank}>{a.rank}</div>
                  <div className={styles.detail}>{a.detail}</div>
                  <div className={styles.issuer}>{a.issuer}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <CredentialsList />
      </div>
    </section>
  );
}
