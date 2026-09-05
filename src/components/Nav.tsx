/* ============================================================================
   Nav — the site header, with a real submenu behind every destination
   ----------------------------------------------------------------------------
   The bar used to be four anchors. That kept it uncluttered and made half the
   site unaddressable: Capabilities, the featured system, the philosophy band
   and every individual case study could only be reached by scrolling past
   them and recognising them on the way. A section nobody can address is a
   section nobody can find.

   So each top-level destination now owns a disclosure menu that lists what
   actually lives under it, and the Work menu lists the six case studies by
   name. The pattern is the ARIA authoring practice "disclosure navigation
   with top-level links": the label itself is still a link that goes to the
   section, and a separate chevron button opens the panel. Both are operable
   from the keyboard, and a pointer user gets the panel on hover without
   losing the ability to just click through.

   The same header is now used on every route. On a case study an in-page
   anchor resolves to '/#work' instead of '#work', so the whole site index is
   two keystrokes away from anywhere in it.
   ========================================================================== */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useContent, useUi, useLang, useFormat } from '../i18n/useContent';
import { downloadCv } from '../lib/cv/downloadCv';
import { useSiteMenus, type Menu } from '../lib/menus';
import { useIsCoarsePointer } from '../lib/useMediaQuery';
import styles from './Nav.module.scss';

/** A "back" affordance for the sub-routes, shown next to the wordmark. */
export interface NavBack {
  to: string;
  label: string;
}

/* --- links --------------------------------------------------------------- */

/**
 * One link that knows what kind of destination it points at.
 *
 *   '#work'                in-page anchor at home, a route hash anywhere else
 *   '/work/mymo2'          a route
 *   'mailto:' / 'https://' leaves the site
 */
function SmartLink({
  href,
  external,
  className,
  onNavigate,
  children,
  ...rest
}: {
  href: string;
  external?: boolean;
  className?: string;
  onNavigate?: () => void;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const { pathname } = useLocation();
  const direct = href.startsWith('mailto:') || href.startsWith('tel:');

  if (direct) {
    return (
      <a href={href} className={className} onClick={onNavigate} {...rest}>
        {children}
      </a>
    );
  }
  if (external) {
    return (
      <a
        href={href}
        className={className}
        onClick={onNavigate}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  }
  if (href.startsWith('#')) {
    // On the homepage the anchor is a plain in-page jump; anywhere else it has
    // to go home first, and ScrollManager lands on the hash on arrival.
    if (pathname === '/') {
      return (
        <a href={href} className={className} onClick={onNavigate} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link to={`/${href}`} className={className} onClick={onNavigate} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <Link to={href} className={className} onClick={onNavigate} {...rest}>
      {children}
    </Link>
  );
}

/* --- one desktop menu ---------------------------------------------------- */

function DesktopMenu({
  menu,
  open,
  active,
  onOpen,
  onClose,
}: {
  menu: Menu;
  open: boolean;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const ui = useUi();
  const fmt = useFormat();
  const panelId = `navmenu-${menu.id}`;
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const coarse = useIsCoarsePointer();

  /* The panel's rows are ordinary links, so the keyboard model is the
     disclosure one: arrows move within the open panel, Escape closes it and
     puts focus back on the button that opened it, Tab leaves and closes. */
  const rows = useCallback(
    () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLAnchorElement>('[data-menuitem]') ?? [],
      ),
    [],
  );

  const focusRow = useCallback(
    (i: number) => {
      const list = rows();
      if (!list.length) return;
      list[((i % list.length) + list.length) % list.length].focus();
    },
    [rows],
  );

  const openAndFocus = (i: number) => {
    onOpen();
    requestAnimationFrame(() => focusRow(i));
  };

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openAndFocus(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAndFocus(-1);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      onClose();
    }
  };

  const onPanelKey = (e: React.KeyboardEvent) => {
    const list = rows();
    const i = list.indexOf(document.activeElement as HTMLAnchorElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusRow(i + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusRow(i - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusRow(0);
        break;
      case 'End':
        e.preventDefault();
        focusRow(-1);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        btnRef.current?.focus();
        break;
      case 'Tab':
        onClose();
        break;
    }
  };

  return (
    <li
      className={styles.navItem}
      // Hover opens on a pointer device only. On touch the chevron is the only
      // way in, which is what stops the first tap being swallowed by a panel
      // the reader never asked for.
      onPointerEnter={coarse ? undefined : onOpen}
    >
      <div className={styles.navRow}>
        <SmartLink
          href={menu.href}
          className={`${styles.navLink} ${active ? styles.linkActive : ''}`}
          onNavigate={onClose}
        >
          {menu.label}
        </SmartLink>
        <button
          ref={btnRef}
          type="button"
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={fmt(ui.navSubmenuOf, { subject: menu.label })}
          onClick={() => (open ? onClose() : onOpen())}
          onKeyDown={onButtonKey}
        >
          <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
            <path d="M1 1.2 4.5 4.6 8 1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className={`${styles.panel} ${menu.wide ? styles.panelWide : ''}`}
        onKeyDown={onPanelKey}
      >
        <ul className={styles.panelList}>
          {menu.children.map((c) => (
            <li key={`${c.href}-${c.label}`}>
              <SmartLink
                href={c.href}
                external={c.external}
                data-menuitem=""
                className={styles.panelLink}
                onNavigate={onClose}
              >
                {c.num && <span className={styles.panelNum}>{c.num}</span>}
                <span className={styles.panelText}>
                  <span className={styles.panelLabel}>
                    {c.label}
                    {c.external && (
                      <span className={styles.extMark} aria-hidden="true">
                        {'↗'}
                      </span>
                    )}
                  </span>
                  <span className={styles.panelHint}>{c.hint}</span>
                </span>
                {c.external && <span className="sr-only"> ({ui.navNewTab})</span>}
              </SmartLink>
            </li>
          ))}
        </ul>

        {menu.footer && (
          <SmartLink
            href={menu.footer.href}
            data-menuitem=""
            className={styles.panelFooter}
            onNavigate={onClose}
          >
            <span>{menu.footer.label}</span>
            <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" data-arrow>
              <path d="M0 4h20M17 1l4 3-4 3" stroke="currentColor" fill="none" strokeWidth="1.2" />
            </svg>
          </SmartLink>
        )}
      </div>
    </li>
  );
}

/* --- the header ---------------------------------------------------------- */

export function Nav({ back }: { back?: NavBack }) {
  const { nav } = useContent();
  const ui = useUi();
  const fmt = useFormat();
  const { lang, toggleLang } = useLang();
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [active, setActive] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const drawerId = useId();

  const menus = useSiteMenus();

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
  }, [sectionKey, pathname]);

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

  /* Lock scroll, close on Esc, and flag the drawer on <body> so the chat
     assistant can get out of the way — it is fixed at z-index 200, above the
     drawer, and its button sits exactly where the last group's toggle is. */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) document.body.dataset.navOpen = 'true';
    else delete document.body.dataset.navOpen;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      delete document.body.dataset.navOpen;
    };
  }, [open]);

  /* A menu left open across a navigation would hang over the page the reader
     just asked for. */
  useEffect(() => {
    setOpenMenu(null);
    setOpen(false);
  }, [pathname, hash]);

  // pressing anywhere outside the bar dismisses an open panel
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [openMenu]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const openPanel = useCallback((id: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(id);
  }, []);

  const closePanel = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(null);
  }, []);

  /* Leaving the bar with the pointer closes after a beat. Without the delay,
     the diagonal from a label down to the row under it crosses the gap and
     shuts the panel halfway to the thing being aimed at. */
  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 180);
  }, []);

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

  /* Which top-level destination the reader is inside. On the homepage that is
     the scroll-spy; on a project route it is Work, whatever the scroll. */
  const currentId = pathname.startsWith('/work') ? 'work' : active;

  return (
    <>
      <header
        ref={barRef}
        className={`${styles.nav} ${scrolled ? styles.scrolled : ''} ${back ? styles.hasBack : ''}`}
        onPointerLeave={scheduleClose}
      >
        <SmartLink href="#top" className={styles.logo} aria-label={ui.navHome}>
          <span className={styles.logoMark} aria-hidden="true" />
          MOI
        </SmartLink>

        {/* On a sub-route the way back out is the first thing in the bar, not
            something to be hunted for at the bottom of the page. */}
        {back && (
          <Link to={back.to} className={styles.back}>
            <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" data-arrow>
              <path d="M22 4H2M5 1 1 4l4 3" stroke="currentColor" fill="none" strokeWidth="1.2" />
            </svg>
            <span>{back.label}</span>
          </Link>
        )}

        {/* The availability indicator lives in the hero and contact section —
            repeating it here only crowded the bar at tablet widths. */}
        <nav className={styles.links} aria-label={ui.navPrimary}>
          <ul className={styles.linkList}>
            {menus.map((menu) => (
              <DesktopMenu
                key={menu.id}
                menu={menu}
                open={openMenu === menu.id}
                active={currentId === menu.id}
                onOpen={() => openPanel(menu.id)}
                onClose={closePanel}
              />
            ))}
          </ul>
        </nav>

        {/* The language switch sits in the bar at EVERY width, not inside the
            mobile menu. Someone who needs Arabic should not have to discover
            it behind a hamburger first — it has to be the thing they see. The
            CV button is the one that folds into the drawer on a phone: its
            label is too wide for the bar and it is not urgent in the way a
            language is. */}
        <div className={styles.actions}>
          <LangToggle />
          <CvButton className={styles.headerCv} />
        </div>

        <button
          className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
          aria-label={open ? ui.menuClose : ui.menuOpen}
          aria-expanded={open}
          aria-controls={drawerId}
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </header>

      {/* --- mobile drawer -------------------------------------------------
          The same tree, as an accordion. Each group's label is still a link
          that goes to the section, and the chevron beside it opens the list —
          so a phone reader can go straight to Work, or open Work and go
          straight to one case study, without a round trip through the page. */}
      <div
        id={drawerId}
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        hidden={!open}
      >
        <nav aria-label={ui.navMobile} className={styles.drawerNav}>
          <ul className={styles.drawerList}>
            {menus.map((menu) => {
              const expanded = openGroup === menu.id;
              const groupId = `drawer-${menu.id}`;
              return (
                <li key={menu.id} className={styles.drawerGroup}>
                  <div className={styles.drawerRow}>
                    <SmartLink
                      href={menu.href}
                      className={styles.drawerLink}
                      onNavigate={() => setOpen(false)}
                    >
                      {menu.label}
                    </SmartLink>
                    <button
                      type="button"
                      className={`${styles.drawerToggle} ${
                        expanded ? styles.drawerToggleOpen : ''
                      }`}
                      aria-expanded={expanded}
                      aria-controls={groupId}
                      aria-label={fmt(ui.navSubmenuOf, { subject: menu.label })}
                      onClick={() => setOpenGroup(expanded ? null : menu.id)}
                    >
                      <svg width="14" height="9" viewBox="0 0 9 6" aria-hidden="true">
                        <path
                          d="M1 1.2 4.5 4.6 8 1.2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                    </button>
                  </div>

                  <ul id={groupId} className={styles.drawerSub} hidden={!expanded}>
                    {menu.children.map((c) => (
                      <li key={`${c.href}-${c.label}`}>
                        <SmartLink
                          href={c.href}
                          external={c.external}
                          className={styles.drawerSubLink}
                          onNavigate={() => setOpen(false)}
                        >
                          {c.num && <span className={styles.panelNum}>{c.num}</span>}
                          <span>{c.label}</span>
                          {c.external && (
                            <>
                              <span className={styles.extMark} aria-hidden="true">
                                {'↗'}
                              </span>
                              <span className="sr-only"> ({ui.navNewTab})</span>
                            </>
                          )}
                        </SmartLink>
                      </li>
                    ))}
                    {menu.footer && (
                      <li>
                        <SmartLink
                          href={menu.footer.href}
                          className={`${styles.drawerSubLink} ${styles.drawerSubFooter}`}
                          onNavigate={() => setOpen(false)}
                        >
                          <span>{menu.footer.label}</span>
                        </SmartLink>
                      </li>
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.drawerActions}>
          <CvButton className={styles.drawerCv} />
        </div>
      </div>
    </>
  );
}
