import { Loader } from '../components/Loader';
import { Nav } from '../components/Nav';
import { MonolithStage } from '../three/MonolithStage';
import { Hero } from '../components/sections/Hero';
import { ImpactStrip } from '../components/sections/ImpactStrip';
import { Interlude } from '../components/sections/Interlude';
import { Work } from '../components/sections/Work';
import { FeaturedStory } from '../components/sections/FeaturedStory';
import { Capabilities } from '../components/sections/Capabilities';
import { Experience } from '../components/sections/Experience';
import { Recognition } from '../components/sections/Recognition';
import { Philosophy } from '../components/sections/Philosophy';
import { Contact } from '../components/sections/Contact';
import { Footer } from '../components/sections/Footer';
import { useLenis } from '../lib/useLenis';
import { useMonolithScroll } from '../lib/useMonolithScroll';
import { useCopy } from '../i18n/useContent';
import styles from './Home.module.scss';

/**
 * Homepage flow, consolidated to five chapters so a recruiter scanning quickly
 * reaches the contact details:
 *
 *   Hero + proof → Impact strip → Work (incl. featured story) → Capabilities
 *   → Experience → Education/Recognition/Credentials → Contact (+ open to)
 *
 * Philosophy is a statement band between chapters rather than a chapter of its
 * own; Credentials and Opportunities were folded into the sections they belong
 * to. Nothing was deleted — the detail lives on the individual case studies.
 */
export function Home() {
  useLenis(true);
  useMonolithScroll(true);
  const copy = useCopy();

  return (
    <>
      <Loader />
      <div className="grain" aria-hidden="true" />
      <Nav />
      <MonolithStage />

      <main id="main">
        <Hero />
        <ImpactStrip />

        <Interlude id="interlude-open" label={copy.interlude.open} />

        <div className={styles.surface}>
          <Work />
          <FeaturedStory />
        </div>

        <div className={styles.surface}>
          <Capabilities />
        </div>

        <div className={styles.surface}>
          <Experience />
          <Philosophy />
          <Recognition />
        </div>

        <Interlude id="interlude-close" label={copy.interlude.close} align="right" />

        <div className={styles.surface}>
          <Contact />
        </div>
      </main>

      <Footer />
    </>
  );
}
