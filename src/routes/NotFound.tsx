import { Link } from 'react-router-dom';
import { useCopy, useUi } from '../i18n/useContent';
import { Nav } from '../components/Nav';

/* A dead end is the page that most needs a way out, so it carries the full
   header — every section and every case study is one menu away from here. */
export function NotFound() {
  const ui = useUi();
  const copy = useCopy();
  return (
    <>
    <Nav back={{ to: '/work', label: copy.nav.allProjects }} />
    <div
      style={{
        minHeight: '100vh',
        paddingTop: 'var(--header-h)',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--cyan)',
            marginBottom: '1.2rem',
          }}
        >
          {ui.notFoundKicker}
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.6rem, 5vw, 2.6rem)',
            marginBottom: '1.6rem',
          }}
        >
          {ui.notFoundTitle}
        </h1>
        <Link
          to="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--cyan-bright)',
            letterSpacing: '0.08em',
          }}
        >
          {ui.backHome}
        </Link>
      </div>
    </div>
    </>
  );
}
