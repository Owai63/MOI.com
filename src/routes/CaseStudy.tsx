import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useContent, useCopy } from '../i18n/useContent';
import { ProjectVisual } from '../components/visuals/ProjectVisual';
import { TagList } from '../components/ui/TagList';
import { NotFound } from './NotFound';
import styles from './CaseStudy.module.scss';

export function CaseStudy() {
  const { getProject, profile, isActive } = useContent();
  const copy = useCopy();
  const { slug } = useParams();
  const project = getProject(slug ?? '');

  useEffect(() => {
    if (project) document.title = `${project.name} — ${profile.displayName}`;
    return () => {
      document.title = `${profile.displayName} — ${profile.title}`;
    };
  }, [project]);

  if (!project) return <NotFound />;

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link to="/" className={styles.home}>
          <span className={styles.mark} aria-hidden="true" />
          MOI<span className={styles.dim}>·ENG</span>
        </Link>
        <Link to="/#work" className={styles.back}>
          {copy.caseStudy.allWork}
        </Link>
      </header>

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
            <div className={`${styles.visual} ${styles[`accent-${project.accent}`]}`}>
              <ProjectVisual slug={project.slug} />
              <span className={styles.visualTag}>
                {project.heroConceptual ? copy.caseStudy.conceptualViz : copy.caseStudy.illustrative}
              </span>
            </div>
          </div>
        </section>

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
      </main>
    </div>
  );
}
