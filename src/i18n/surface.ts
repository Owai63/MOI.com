/* ============================================================================
   surface — the complete set of English words the site can render
   ----------------------------------------------------------------------------
   This is the contract behind "every word is translated". `npm run translate`
   translates exactly this set, and `npm run translate -- --check` fails when
   any member of it is missing from the Arabic map.

   If you add visible English copy anywhere, it must reach this function —
   which happens automatically when the copy lives in one of the four places
   below. Do not hardcode visible English inside a component.
   ========================================================================== */

import { enDict } from './dictionary';
import { uiEn } from './ui';
import { copyEn } from './copy';
import { IMAGE_VISUALS } from '../data/projectVisuals';
import { collectStrings, NO_SKIP } from './translatable';

export interface SurfaceGroup {
  name: string;
  strings: string[];
}

/** Grouped so the translate script can report where a missing string lives. */
export function englishSurfaceGroups(): SurfaceGroup[] {
  return [
    { name: 'content', strings: [...collectStrings(enDict)] },
    // ui/copy hold display copy only — no identifiers, so nothing is skipped.
    { name: 'ui', strings: [...collectStrings(uiEn, NO_SKIP)] },
    { name: 'copy', strings: [...collectStrings(copyEn, NO_SKIP)] },
    { name: 'project-images', strings: [...collectStrings(IMAGE_VISUALS)] },
  ];
}

/** Every translatable English string on the site, deduplicated. */
export function englishSurface(): string[] {
  const seen = new Set<string>();
  for (const g of englishSurfaceGroups()) for (const s of g.strings) seen.add(s);
  return [...seen];
}
