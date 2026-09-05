import { Suspense, lazy, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { Home } from './routes/Home';
import { RouteFallback } from './components/RouteFallback';
import { LanguageProvider } from './i18n/LanguageContext';
import { useUi } from './i18n/useContent';
import { ChatWidget } from './components/chat/ChatWidget';

const CaseStudy = lazy(() =>
  import('./routes/CaseStudy').then((m) => ({ default: m.CaseStudy })),
);
const AllProjects = lazy(() =>
  import('./routes/AllProjects').then((m) => ({ default: m.AllProjects })),
);
const NotFound = lazy(() =>
  import('./routes/NotFound').then((m) => ({ default: m.NotFound })),
);

/** Localized skip-to-content link. */
function SkipLink() {
  const ui = useUi();
  return (
    <a className="skip-link" href="#main">
      {ui.skipToContent}
    </a>
  );
}

/** Reset scroll to top on route change — and, when a link carried a hash,
 *  land on the section it named.
 *
 *  The header submenus can now address any section from any route, so
 *  '/#capabilities' arrives here as a route change WITH a hash. React Router
 *  does not scroll to a hash on its own, and the target does not exist until
 *  the homepage has painted, so the lookup is deferred by a frame. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);
  return null;
}

export function App() {
  return (
    <LanguageProvider>
      {/* Vite's base (see vite.config.ts) — '/' on the droplet, '/MyPortfolio/'
          on GitHub Pages. Feeding it to the router keeps every <Link> and deep
          link correct on both, with no per-host code. */}
      <BrowserRouter
        basename={import.meta.env.BASE_URL}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ScrollManager />
        <SkipLink />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/work" element={<AllProjects />} />
            <Route path="/work/:slug" element={<CaseStudy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <ChatWidget />
      </BrowserRouter>
    </LanguageProvider>
  );
}
