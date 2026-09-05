/* ============================================================================
   menus — one navigation tree, built once, read by the header and the footer
   ----------------------------------------------------------------------------
   The header's dropdowns and the footer's sitemap have to agree, and the one
   way to guarantee that is for neither of them to own the list. Both call
   `useSiteMenus()`, which takes the four destinations from the content model
   and splices the featured case studies into the Work branch — so a project
   that is renamed, reordered or dropped changes in both places at once, and
   arrives already translated.
   ========================================================================== */

import { useMemo } from 'react';
import { useContent, useCopy } from '../i18n/useContent';

export interface MenuChild {
  href: string;
  label: string;
  hint: string;
  external?: boolean;
  /** editorial chapter number — only the case-study rows carry one. */
  num?: string;
}

export interface Menu {
  id: string;
  label: string;
  href: string;
  children: MenuChild[];
  /** closing action of the branch, rendered apart from the list. */
  footer?: MenuChild;
  /** two columns — the Work branch carries seven rows, and one column of
   *  those is taller than a laptop viewport. */
  wide?: boolean;
}

export function useSiteMenus(): Menu[] {
  const { nav, featuredSlugs, getProject } = useContent();
  const copy = useCopy();

  return useMemo(() => {
    const projects: MenuChild[] = featuredSlugs
      .map((slug) => getProject(slug))
      .filter((p): p is NonNullable<ReturnType<typeof getProject>> => Boolean(p))
      .map((p) => ({
        href: `/work/${p.slug}`,
        label: p.name,
        hint: p.kicker,
        num: p.index,
      }));

    return nav.map((item) => {
      if (!item.projects) return { ...item, children: [...item.children] };
      return {
        ...item,
        wide: true,
        children: [...item.children, ...projects],
        footer: {
          href: '/work',
          label: copy.nav.allProjects,
          hint: copy.nav.allProjectsHint,
        },
      };
    });
  }, [nav, featuredSlugs, getProject, copy]);
}
