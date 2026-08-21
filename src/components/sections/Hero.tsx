import { useEffect, useRef } from 'react';
import { useContent, useCopy, useUi } from '../../i18n/useContent';
import { Cta } from '../ui/Cta';
import { sceneState } from '../../three/sceneState';
import styles from './Hero.module.scss';

export function Hero() {
  const { profile, heroProof } = useContent();
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
