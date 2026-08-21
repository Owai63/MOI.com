import { useContent, useCopy, useUi, useFormat } from '../../i18n/useContent';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { TagList } from '../ui/TagList';
import styles from './Experience.module.scss';

export function Experience() {
  const { experience, additionalExperience } = useContent();
  const copy = useCopy();
  const ui = useUi();
  const fmt = useFormat();
  return (
    <section id="experience" className="section section-grid" aria-labelledby="exp-title">
      <div className="container">
        <SectionHeading
          id="exp-title"
          index="03"
          eyebrow={copy.experience.eyebrow}
          title={copy.experience.title}
        />

        <ol className={styles.timeline}>
          {experience.map((r, i) => (
            <Reveal as="li" key={`${r.company}-${r.role}`} className={styles.item} delay={i * 40}>
              <div className={styles.meta}>
                <span className={styles.period}>{r.period}</span>
                <span className={styles.location}>{r.location}</span>
              </div>
              <div className={styles.body}>
                <h3 className={styles.role}>{r.role}</h3>
                <div className={styles.company}>{r.company}</div>
                <ul className={styles.bullets}>
                  {r.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
                <TagList items={r.tags} label={fmt(ui.technologiesOf, { subject: r.company })} />
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal className={styles.additional}>
          <h3 className={styles.addTitle}>{copy.experience.additional}</h3>
          <ul className={styles.addList}>
            {additionalExperience.map((r) => (
              <li key={r.company}>
                <div className={styles.addHead}>
                  <span className={styles.addRole}>{r.role}</span>
                  <span className={styles.addPeriod}>{r.period}</span>
                </div>
                <div className={styles.addCompany}>
                  {r.company} · {r.location}
                </div>
                <p className={styles.addDesc}>{r.bullets[0]}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
