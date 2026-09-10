import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useContent, useCopy, useUi } from '../i18n/useContent';
import { Nav } from '../components/Nav';
import { Footer } from '../components/sections/Footer';
import { ProjectStudio } from '../three/studio/ProjectStudio';
import { TagList } from '../components/ui/TagList';
import { useLenis } from '../lib/useLenis';
import { NotFound } from './NotFound';
import styles from './CaseStudy.module.scss';

export function CaseStudy() {
  const { getProject, projects, profile, isActive } = useContent();
  const copy = useCopy();
  const ui = useUi();
  const { slug } = useParams();
  const project = getProject(slug ?? '');

  /* Where this case study sits in the catalogue, so the foot of the page can
     offer the one either side of it. A reader who finished this one is far
     more likely to want the next project than the homepage. */
  const at = projects.findIndex((p) => p.slug === slug);
  const prev = at > 0 ? projects[at - 1] : null;
  const next = at >= 0 && at < projects.length - 1 ? projects[at + 1] : null;

  useLenis(true);

  useEffect(() => {
    if (project) document.title = `${project.name} — ${profile.displayName}`;
    return () => {
      document.title = `${profile.displayName} — ${profile.title}`;
    };
  }, [project]);

  if (!project) return <NotFound />;

  return (
    <div className={styles.page}>
      {/* Back goes to the project index, not to the homepage's Work band.
          Someone who opened a case study came from a list of projects and
          expects the list back — dropping them into the middle of the
          homepage means finding their place in it again. */}
      <Nav back={{ to: '/work', label: copy.caseStudy.allWork }} />

      <main id="main">
        {/* Hero */}
        <section className={styles.hero}>
          <div className="container">
            <div className={styles.heroTop}>
              <span className={styles.index}>{project.index}</span>
              <span className={styles.kicker}>{project.kicker}</span>
            </div>
            <h1 className={styles.title}>{project.name}</h1>
            <p className={styles.summary}>{project.summary}</p>

            <dl className={styles.meta}>
              <div>
                <dt>{copy.caseStudy.role}</dt>
                <dd>{project.role}</dd>
              </div>
              <div>
                <dt>{copy.caseStudy.context}</dt>
                <dd>{project.org}</dd>
              </div>
              <div>
                <dt>{copy.caseStudy.status}</dt>
                <dd
                  className={
                    isActive(project.slug)
                      ? styles.activeStatus
                      : project.needsSourceContent
                        ? styles.flag
                        : ''
                  }
                >
                  {project.status}
                </dd>
              </div>
            </dl>
          </div>

          <div className="container">
            <ProjectStudio key={project.slug} slug={project.slug} />
          </div>
        </section>

        {/* Everything below the stage is reading matter, so it sits on an
            opaque surface — the 3D belongs to the hero, not behind the prose. */}
        <div className={styles.reading}>
        {/* Problem + ownership framing */}
        <section className={`container ${styles.frame}`}>
          <div className={styles.frameCol}>
            <span className={styles.eyebrow}>{copy.caseStudy.challenge}</span>
            <p>{project.challenge}</p>
          </div>
          <div className={styles.frameCol}>
            <span className={styles.eyebrow}>{copy.caseStudy.ownership}</span>
            <p>{project.ownership}</p>
          </div>
        </section>

        {/* Detailed sections */}
        <div className={`container ${styles.sections}`}>
          {project.sections.map((s) => (
            <section
              key={s.heading}
              className={`${styles.block} ${s.conceptual ? styles.conceptual : ''}`}
            >
              <div className={styles.blockHead}>
                <h2>{s.heading}</h2>
                {s.conceptual && <span className={styles.conceptTag}>{copy.caseStudy.conceptual}</span>}
              </div>
              {s.body && <p className={styles.blockBody}>{s.body}</p>}
              {s.bullets && (
                <ul className={styles.blockList}>
                  {s.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
              {s.table && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {s.table.headers.map((header) => (
                          <th key={header} scope="col">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.note && <p className={styles.blockNote}>{s.note}</p>}
            </section>
          ))}

          {project.tech.length > 0 && (
            <section className={styles.block}>
              <div className={styles.blockHead}>
                <h2>{copy.caseStudy.techStack}</h2>
              </div>
              <TagList items={project.tech} label={copy.caseStudy.techStack} />
            </section>
          )}
        </div>

        {/* Honesty footer */}
        <section className={`container ${styles.note}`}>
          <p>
            {project.needsSourceContent
              ? copy.caseStudy.disclaimerNeeds
              : copy.caseStudy.disclaimerNormal}
          </p>
          <Link to="/#contact" className={styles.contact}>
            {copy.caseStudy.discuss}
          </Link>
        </section>

        {/* --- where to go next ------------------------------------------
            The end of a case study is the point at which a reader decides
            whether to read another one. Leaving only a back link at the top
            of the page made that decision cost a scroll to the top and a
            second scroll down the index. */}
        <nav className={`container ${styles.pager}`} aria-label={ui.navProjectPager}>
          <Link to="/work" className={styles.pagerIndex}>
            <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" data-arrow>
              <path d="M22 4H2M5 1 1 4l4 3" stroke="currentColor" fill="none" strokeWidth="1.2" />
            </svg>
            <span>{copy.caseStudy.backToIndex}</span>
          </Link>

          <div className={styles.pagerPair}>
            {prev && (
              <Link to={`/work/${prev.slug}`} className={styles.pagerLink}>
                <span className={styles.pagerKind}>{copy.caseStudy.prevProject}</span>
                <span className={styles.pagerName}>{prev.name}</span>
              </Link>
            )}
            {next && (
              <Link
                to={`/work/${next.slug}`}
                className={`${styles.pagerLink} ${styles.pagerNext}`}
              >
                <span className={styles.pagerKind}>{copy.caseStudy.nextProject}</span>
                <span className={styles.pagerName}>{next.name}</span>
              </Link>
            )}
          </div>
        </nav>
        </div>
      </main>

      <Footer />
    </div>
  );
}
