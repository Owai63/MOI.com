import { useEffect, useState } from 'react';
import { useContent, useUi, useLang } from '../i18n/useContent';
import { downloadCv } from '../lib/cv/downloadCv';
import styles from './Nav.module.scss';

export function Nav() {
  const { nav } = useContent();
  const ui = useUi();
  const { lang, toggleLang } = useLang();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);

  // hrefs are language-stable; labels are localized.
  const sectionIds = nav.map((n) => n.href.replace('#', ''));
  const sectionKey = sectionIds.join('|');

  /* Scroll-spy via IntersectionObserver rather than measuring on every scroll
     event. Lenis emits a scroll event per animation frame, so the previous
     getBoundingClientRect() loop forced a synchronous layout ~60x a second for
     the whole session. The observer does the same job off the hot path. */
  useEffect(() => {
    const ids = sectionKey.split('|').filter(Boolean);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;

    const onScreen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) onScreen.add(e.target.id);
          else onScreen.delete(e.target.id);
        }
        // Highlight the last section in document order that is on screen, so
        // the marker advances as the reader moves down.
        const current = ids.filter((id) => onScreen.has(id)).pop() ?? '';
        setActive(current);
      },
      // A band across the upper half of the viewport: a section counts as
      // "current" once its top passes into it.
      { rootMargin: '-15% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sectionKey]);

  /* Condensed bar. A one-pixel sentinel at the top of the page is cheaper than
     reading window.scrollY on every scroll event. */
  useEffect(() => {
    const sentinel = document.createElement('div');
    sentinel.style.cssText =
      'position:absolute;top:0;left:0;width:1px;height:40px;pointer-events:none;';
    document.body.appendChild(sentinel);
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting));
    io.observe(sentinel);
    return () => {
      io.disconnect();
      sentinel.remove();
    };
  }, []);

  // lock scroll + Esc close when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleCv = () => {
    setCvBusy(true);
    // Deterministic template — opens a print-ready CV window synchronously.
    try {
      downloadCv(lang);
    } finally {
      setCvBusy(false);
      setOpen(false);
    }
  };

  const LangToggle = ({ className }: { className?: string }) => (
    <button
      type="button"
      className={`${styles.langToggle} ${className ?? ''}`}
      onClick={toggleLang}
      aria-label={ui.switchLanguage}
      lang={lang === 'en' ? 'ar' : 'en'}
    >
      {ui.languageName}
    </button>
  );

  const CvButton = ({ className }: { className?: string }) => (
    <button
      type="button"
      className={`${styles.cvBtn} ${className ?? ''}`}
      onClick={handleCv}
      disabled={cvBusy}
    >
      {cvBusy ? ui.cvGenerating : ui.downloadCv}
    </button>
  );

  return (
    <>
      <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <a href="#top" className={styles.logo} aria-label={ui.navHome}>
          <span className={styles.logoMark} aria-hidden="true" />
          MOI
        </a>

        {/* The availability indicator lives in the hero and contact section —
            repeating it here only crowded the bar at tablet widths. */}
        <nav className={styles.links} aria-label={ui.navPrimary}>
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={active === n.href.replace('#', '') ? styles.linkActive : ''}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <LangToggle />
          <CvButton />
        </div>

        <button
          className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
          aria-label={open ? ui.menuClose : ui.menuOpen}
          aria-expanded={open}
          aria-controls="mobile-drawer"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </header>

      <div
        id="mobile-drawer"
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        hidden={!open}
      >
        {/* Language first: someone who needs Arabic needs it before they read
            any of the links below it. */}
        <div className={styles.drawerTop}>
          <LangToggle className={styles.drawerLang} />
        </div>
        <nav aria-label={ui.navMobile}>
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className={styles.drawerActions}>
          <CvButton className={styles.drawerCv} />
        </div>
      </div>
    </>
  );
}
