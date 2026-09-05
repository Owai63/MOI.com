import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useContent, useCopy, useUi } from '../../i18n/useContent';
import { Cta } from '../ui/Cta';
import { sceneState } from '../../three/sceneState';
import styles from './Hero.module.scss';

export function Hero() {
  const { profile, heroProof, nav, projects } = useContent();
  const copy = useCopy();
  const ui = useUi();
  const ref = useRef<HTMLElement>(null);

  // Gate pointer influence on the monolith to when the hero is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => (sceneState.heroVisible = e.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="top"
      className={styles.hero}
      ref={ref}
      aria-label={ui.heroLandmark}
      data-scene-window
    >
      <div className={styles.grid}>
        <div className={styles.lead}>
          <span className={styles.eyebrow}>{profile.displayName}</span>
          <span className={styles.eyebrowSub}>
            {profile.title} — {profile.location}
          </span>
        </div>

        <h1 className={styles.statement}>
          {profile.heroStatement.map((line, i) => (
            <span key={i} className={styles.line} style={{ ['--i']: i }}>
              {line}
            </span>
          ))}
        </h1>

        {/* Five-second read: what the discipline is, then three pieces of
            evidence — so a recruiter or manager can qualify the profile
            without scrolling. */}
        <div className={styles.proof}>
          <p className={styles.proofLine}>{heroProof.line}</p>
          <ul className={styles.proofPoints}>
            {heroProof.points.map((point) => (
              <li key={point}>
                <span className={styles.proofTick} aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* The hero's own submenu — the page as a numbered contents list.
            Everything below this point is one long scroll, and a reader who
            arrives looking for one specific thing (the experience, the
            credentials, the project index) should not have to travel through
            the other four chapters to find out whether it is there. Each row
            is the same destination the header menu opens, said in full.

            The last row leaves the page entirely, which is deliberate: the
            full catalogue is a route, not a section, and it is the single
            most useful destination on the site for anyone assessing the
            work. */}
        <nav className={styles.explore} aria-label={ui.navShortcuts}>
          <span className={styles.exploreLabel}>{copy.nav.exploreEyebrow}</span>
          <ul className={styles.exploreList}>
            {nav.map((item, i) => (
              <li key={item.id}>
                <a href={item.href} className={styles.exploreItem}>
                  <span className={styles.exploreNum}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.exploreText}>
                    <span className={styles.exploreName}>{item.label}</span>
                    <span className={styles.exploreHint}>{item.children[0].hint}</span>
                  </span>
                </a>
              </li>
            ))}
            <li>
              <Link to="/work" className={`${styles.exploreItem} ${styles.exploreAll}`}>
                <span className={styles.exploreNum}>
                  {String(nav.length + 1).padStart(2, '0')}
                </span>
                <span className={styles.exploreText}>
                  <span className={styles.exploreName}>
                    {copy.nav.allProjects}
                    <em className={styles.exploreCount}>{projects.length}</em>
                  </span>
                  <span className={styles.exploreHint}>{copy.nav.exploreAllHint}</span>
                </span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className={styles.foot}>
          <div className={styles.footLeft}>
            <p className={styles.support}>{profile.supporting}</p>
            <div className={styles.actions}>
              <Cta href="#work" variant="primary">
                {copy.hero.viewWork}
              </Cta>
              <Cta href="#contact" variant="ghost">
                {copy.hero.contact}
              </Cta>
            </div>
          </div>
          <div className={styles.footRight}>
            <div className={styles.available}>
              <span className={styles.availDot} aria-hidden="true" />
              {profile.availability}
            </div>
            <div className={styles.scrollHint} aria-hidden="true">
              <span>{copy.hero.scroll}</span>
              <span className={styles.scrollLine} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
