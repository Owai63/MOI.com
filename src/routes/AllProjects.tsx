import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent, useCopy, useUi, useFormat } from '../i18n/useContent';
import { Reveal } from '../components/ui/Reveal';
import { TagList } from '../components/ui/TagList';
import styles from './AllProjects.module.scss';

type Filter = 'all' | 'production' | 'academic';

export function AllProjects() {
  const { projects, profile, isActive } = useContent();
  const copy = useCopy();
  const ui = useUi();
  const fmt = useFormat();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    document.title = `${copy.allProjects.title} — ${profile.displayName}`;
    return () => {
      document.title = `${profile.displayName} — ${profile.title}`;
    };
  }, [copy, profile]);

  const counts = useMemo(
    () => ({
      all: projects.length,
      production: projects.filter((p) => p.category === 'production').length,
      academic: projects.filter((p) => p.category === 'academic').length,
    }),
    [projects],
  );

  const visible = projects.filter((p) => filter === 'all' || p.category === filter);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link to="/" className={styles.home}>
          <span className={styles.mark} aria-hidden="true" />
          MOI<span className={styles.dim}>·ENG</span>
        </Link>
        <Link to="/#work" className={styles.back}>
          {copy.allProjects.back}
        </Link>
      </header>

      <main id="main">
        <section className={`container ${styles.hero}`}>
          <div className={styles.headingMeta}>
            <span className={styles.headingNum}>00</span>
            <span className="eyebrow">{copy.allProjects.eyebrow}</span>
          </div>
          <h1 className={styles.title}>{copy.allProjects.title}</h1>
          <p className={styles.intro}>{copy.allProjects.intro}</p>

          <div className={styles.filters} role="tablist" aria-label={ui.filterProjects}>
            {(['all', 'production', 'academic'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
                onClick={() => setFilter(f)}
              >
                <span>
                  {f === 'all'
                    ? copy.allProjects.filterAll
                    : f === 'production'
                      ? copy.allProjects.filterProduction
                      : copy.allProjects.filterAcademic}
                </span>
                <em>{counts[f]}</em>
              </button>
            ))}
          </div>
        </section>

        <section className={`container ${styles.grid}`}>
          {visible.map((p, i) => (
            <Reveal key={p.slug} as="article" delay={(i % 6) * 60} className={styles.card}>
              <Link to={`/work/${p.slug}`} className={styles.cardLink}>
                <div className={styles.cardTop}>
                  <span className={styles.index}>{p.index}</span>
                  <span
                    className={`${styles.catTag} ${p.category === 'production' ? styles.catProd : styles.catAcad}`}
                  >
                    {p.category === 'production' ? copy.allProjects.filterProduction : copy.allProjects.filterAcademic}
                  </span>
                </div>
                <span className={styles.kicker}>{p.kicker}</span>
                <h2 className={styles.name}>{p.name}</h2>
                <p className={styles.summary}>{p.summary}</p>

                <dl className={styles.meta}>
                  <div>
                    <dt>{copy.work.context}</dt>
                    <dd>{p.org}</dd>
                  </div>
                  <div>
                    <dt>{copy.work.status}</dt>
                    <dd className={isActive(p.slug) ? styles.activeStatus : ''}>
                      {p.status}
                    </dd>
                  </div>
                </dl>

                {p.tech.length > 0 && <TagList items={p.tech.slice(0, 5)} label={fmt(ui.technologiesOf, { subject: p.name })} />}

                <span className={styles.read}>
                  {copy.allProjects.read}
                </span>
              </Link>
            </Reveal>
          ))}
        </section>
      </main>
    </div>
  );
}
