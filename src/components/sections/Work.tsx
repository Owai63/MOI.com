import { Link } from 'react-router-dom';
import { useContent, useCopy, useUi, useFormat } from '../../i18n/useContent';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { TagList } from '../ui/TagList';
import styles from './Work.module.scss';

export function Work() {
  const { featuredSlugs, getProject, isActive } = useContent();
  const copy = useCopy();
  const ui = useUi();
  const fmt = useFormat();
  const projects = featuredSlugs.map(getProject).filter(Boolean);

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="container">
        <SectionHeading
          id="work-title"
          index="01"
          eyebrow={copy.work.eyebrow}
          title={copy.work.title}
        />
      </div>

      <div className={styles.chapters}>
        {projects.map((p, i) => (
          <article
            key={p!.slug}
            className={`${styles.chapter} ${i % 2 === 1 ? styles.flip : ''}`}
            data-layer={i}
          >
            <div className="container">
              <div className={styles.grid}>
                <Reveal className={styles.text}>
                  <div className={styles.top}>
                    <span className={styles.index}>{p!.index}</span>
                    <span className={styles.kicker}>{p!.kicker}</span>
                  </div>
                  <h3 className={styles.name}>{p!.name}</h3>

                  {/* Kind of project + where it got to, answered before the
                      reader has to parse a paragraph. */}
                  <p className={styles.classification}>
                    <span>
                      {p!.category === 'production'
                        ? copy.work.catProduction
                        : copy.work.catAcademic}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        isActive(p!.slug)
                          ? styles.activeStatus
                          : p!.needsSourceContent
                            ? styles.flag
                            : styles.shipped
                      }
                    >
                      {p!.status}
                    </span>
                  </p>

                  <p className={styles.summary}>{p!.summary}</p>

                  <dl className={styles.facts}>
                    <div>
                      <dt>{copy.work.ownership}</dt>
                      <dd>{p!.ownership}</dd>
                    </div>
                    <div>
                      <dt>{copy.work.role}</dt>
                      <dd>
                        {p!.role} · {p!.org}
                      </dd>
                    </div>
                    {p!.tech.length > 0 && (
                      <div>
                        <dt>{copy.work.stack}</dt>
                        <dd>
                          <TagList items={p!.tech} label={fmt(ui.technologiesOf, { subject: p!.name })} />
                        </dd>
                      </div>
                    )}
                  </dl>

                  <Link to={`/work/${p!.slug}`} className={styles.cta}>
                    <span>{copy.work.read}</span>
                    <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" data-arrow>
                      <path d="M0 4h20M17 1l4 3-4 3" stroke="currentColor" fill="none" strokeWidth="1.2" />
                    </svg>
                  </Link>
                </Reveal>

                {/* The visual column is a hole in the page, not a picture.
                    The workbench renders on a fixed canvas behind all content
                    and this element draws nothing, so the device that
                    assembles on the bench simply shows through here with no
                    frame around it. The camera is biased toward this side of
                    the viewport per chapter (see useBenchScroll), which is
                    what lands the object in the right place. */}
                <Reveal className={styles.visual} delay={120}>
                  <div className={styles.deviceWindow} data-scene-window aria-hidden="true" />
                </Reveal>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="container">
        <Reveal className={styles.more}>
          <Link to="/work" className={styles.moreCta}>
            <span>{copy.work.viewAll}</span>
            <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" data-arrow>
              <path d="M0 4h20M17 1l4 3-4 3" stroke="currentColor" fill="none" strokeWidth="1.2" />
            </svg>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
