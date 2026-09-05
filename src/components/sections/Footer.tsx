/* ============================================================================
   Footer — the sitemap, and then the colophon
   ----------------------------------------------------------------------------
   The header's menus are a good way to reach a section you already suspect
   exists. The foot of the page has to answer the other question: what IS
   here? So it lists the whole tree flat — the same tree the header opens, no
   second copy of it — and the reader who has scrolled to the bottom finds
   every destination on the site in one glance rather than being sent back to
   the top to hunt.
   ========================================================================== */

import { Link, useLocation } from 'react-router-dom';
import { useContent, useCopy, useUi } from '../../i18n/useContent';
import { useSiteMenus, type MenuChild } from '../../lib/menus';
import styles from './Footer.module.scss';

/** Footer rows are links of three kinds, exactly as in the header — including
 *  the same rule for in-page anchors: on the homepage they are a plain jump,
 *  anywhere else they have to go home first. */
function FootLink({ child, className }: { child: MenuChild; className?: string }) {
  const ui = useUi();
  const { pathname } = useLocation();
  if (child.external || child.href.startsWith('mailto:')) {
    const opens = child.href.startsWith('mailto:')
      ? {}
      : { target: '_blank', rel: 'noopener noreferrer' };
    return (
      <a href={child.href} className={className ?? styles.link} {...opens}>
        {child.label}
        <span className={styles.ext} aria-hidden="true">
          {'↗'}
        </span>
        {!child.href.startsWith('mailto:') && (
          <span className="sr-only"> ({ui.navNewTab})</span>
        )}
      </a>
    );
  }
  if (child.href.startsWith('#')) {
    if (pathname === '/') {
      return (
        <a href={child.href} className={className ?? styles.link}>
          {child.label}
        </a>
      );
    }
    return (
      <Link to={`/${child.href}`} className={className ?? styles.link}>
        {child.label}
      </Link>
    );
  }
  return (
    <Link to={child.href} className={className ?? styles.link}>
      {child.label}
    </Link>
  );
}

/* No `data-scene-window` here any more. It used to keep the render loop awake
   while the footer was on screen, for a closing look at the bench — but the
   footer is opaque and covers the canvas completely, so that was a full-frame
   render of something nobody can see. The closing shot has its own window, on
   the interlude band just above the contact section. */
export function Footer() {
  const { profile } = useContent();
  const copy = useCopy();
  const ui = useUi();
  const menus = useSiteMenus();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <nav className={`container ${styles.map}`} aria-label={ui.navSitemap}>
        {menus.map((menu) => (
          <div key={menu.id} className={styles.column}>
            <h2 className={styles.columnTitle}>
              {/* The heading is the destination too — a column head that is
                  only a label makes the reader look for the row that repeats
                  it. */}
              <FootLink
                child={{ href: menu.href, label: menu.label, hint: '' }}
                className={styles.columnLink}
              />
            </h2>
            <ul className={styles.list}>
              {menu.children.map((c) => (
                <li key={`${c.href}-${c.label}`}>
                  <FootLink child={c} />
                </li>
              ))}
              {menu.footer && (
                <li>
                  <Link to={menu.footer.href} className={styles.linkStrong}>
                    {menu.footer.label}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`container ${styles.inner}`}>
        <div className={styles.left}>
          <span className={styles.mark} aria-hidden="true" />
          <span>
            © {year} {profile.fullName}
          </span>
        </div>
        <div className={styles.mid}>
          {profile.title} · {profile.location}
        </div>
        <a href="#top" className={styles.top}>
          {copy.footer.backToTop}
        </a>
      </div>
    </footer>
  );
}
