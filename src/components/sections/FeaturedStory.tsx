import { Link } from 'react-router-dom';
import { useContent, useCopy, useUi } from '../../i18n/useContent';
import { Reveal } from '../ui/Reveal';
import { asset } from '../../lib/asset';
import styles from './FeaturedStory.module.scss';

export function FeaturedStory() {
  const { getProject } = useContent();
  const copy = useCopy();
  const ui = useUi();
  const p = getProject('mymo2');
  if (!p) return null;

  const f = copy.featured;
  const facts = [
    [f.facts.platform, f.factValues.platform],
    [f.facts.updates, f.factValues.updates],
    [f.facts.cloud, f.factValues.cloud],
    [f.facts.config, f.factValues.config],
  ];

  return (
    <section className={styles.story} aria-labelledby="featured-title">
      <div className={`container ${styles.layout}`}>
        <Reveal className={styles.copy}>
          <span className={styles.eyebrow}>{f.eyebrow}{p.org}</span>
          <h2 id="featured-title" className={styles.headline}>
            {f.headline}
          </h2>
          <p className={styles.lead}>{p.challenge}</p>
          <p className={styles.body}>{p.ownership}</p>

          <dl className={styles.facts}>
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <Link to={`/work/${p.slug}`} className={styles.link}>
            <span>{f.inside} {p.name}</span>
            <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" data-arrow>
              <path d="M0 4h20M17 1l4 3-4 3" stroke="currentColor" fill="none" strokeWidth="1.2" />
            </svg>
          </Link>
        </Reveal>

        <Reveal className={styles.media} delay={120}>
          <figure className={styles.figure}>
            <img
              src={asset('/assets/generated/projects/mymo2/mymo2-connectivity.webp')}
              alt={ui.featuredAlt}
              loading="lazy"
              decoding="async"
            />
            <figcaption>{f.figcaption}</figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
