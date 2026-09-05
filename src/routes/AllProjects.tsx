import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useContent, useCopy, useUi, useFormat } from '../i18n/useContent';
import { Nav } from '../components/Nav';
import { Footer } from '../components/sections/Footer';
import { Reveal } from '../components/ui/Reveal';
import { TagList } from '../components/ui/TagList';
import styles from './AllProjects.module.scss';

type Filter = 'all' | 'production' | 'academic';

const FILTERS: Filter[] = ['all', 'production', 'academic'];

const isFilter = (v: string | null): v is Filter =>
  FILTERS.includes(v as Filter);

export function AllProjects() {
  const { projects, profile, featuredSlugs, isActive } = useContent();
  const copy = useCopy();
  const ui = useUi();
  const fmt = useFormat();

  /* The filter lives in the URL rather than in component state. This page is
     the one a reader comes BACK to — every case study's "All projects" link
     lands here — and a group they chose before opening a project should still
     be the group they are looking at when they return. It also makes a
     filtered index something that can be sent to someone. */
  const [params, setParams] = useSearchParams();
  const raw = params.get('filter');
  const filter: Filter = isFilter(raw) ? raw : 'all';

  const setFilter = (next: Filter) => {
    const p = new URLSearchParams(params);
    if (next === 'all') p.delete('filter');
    else p.set('filter', next);
    // Replace, so paging through filters does not fill the back button with
    // states the reader has to walk out of one at a time.
    setParams(p, { replace: true });
  };

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

  const featured = useMemo(() => new Set<string>(featuredSlugs), [featuredSlugs]);
  const visible = projects.filter((p) => filter === 'all' || p.category === filter);

  return (
    <div className={styles.page}>
      {/* The full header, not a stub bar. Someone who arrived here from a
          search result should be able to reach any part of the site from the
          page they landed on. */}
      <Nav back={{ to: '/', label: copy.nav.home }} />

      <main id="main">
        <section className={`container ${styles.hero}`}>
          <div className={styles.headingMeta}>
            <span className={styles.headingNum}>00</span>
            <span className="eyebrow">{copy.allProjects.eyebrow}</span>
          </div>
          <h1 className={styles.title}>{copy.allProjects.title}</h1>
          <p className={styles.intro}>{copy.allProjects.intro}</p>

          {/* A group of toggles, not a tablist: there is no tabpanel here,
              only one list that gets shorter, and calling these tabs told a
              screen reader to expect a panel that never arrives. */}
          <div className={styles.filters} role="group" aria-label={ui.filterProjects}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
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

          {/* Announced, so a filter change is not a silent reflow for anyone
              who cannot see the grid shorten. */}
          <p className={styles.count} role="status">
            {copy.allProjects.countLabel} {visible.length} / {projects.length}
          </p>
        </section>

        <section className={`container ${styles.grid}`}>
          {visible.map((p, i) => (
            <Reveal key={p.slug} as="article" delay={(i % 6) * 60} className={styles.card}>
              <Link to={`/work/${p.slug}`} className={styles.cardLink}>
                <div className={styles.cardTop}>
                  <span className={styles.index}>{p.index}</span>
                  <span className={styles.cardTags}>
                    {featured.has(p.slug) && (
                      <span className={styles.featTag}>{copy.allProjects.featuredLabel}</span>
                    )}
                    <span
                      className={`${styles.catTag} ${p.category === 'production' ? styles.catProd : styles.catAcad}`}
                    >
                      {p.category === 'production'
                        ? copy.allProjects.filterProduction
                        : copy.allProjects.filterAcademic}
                    </span>
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

                {p.tech.length > 0 && (
                  <TagList
                    items={p.tech.slice(0, 5)}
                    label={fmt(ui.technologiesOf, { subject: p.name })}
                  />
                )}

                <span className={styles.read}>{copy.allProjects.read}</span>
              </Link>
            </Reveal>
          ))}

          {visible.length === 0 && <p className={styles.empty}>{copy.allProjects.empty}</p>}
        </section>
      </main>

      {/* The same sitemap the homepage carries. */}
      <Footer />
    </div>
  );
}
