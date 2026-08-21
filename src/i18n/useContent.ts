/* ============================================================================
   hooks — the API every component uses instead of importing data/content
   ----------------------------------------------------------------------------
   useContent() -> the localized portfolio dictionary (+ lookup helpers)
   useUi()      -> localized interface micro-copy
   useCopy()    -> localized editorial / section copy
   useT()       -> translate an arbitrary English string (component literals)
   useLang()    -> raw language state + toggle (for the language switch)

   Every one of these resolves through the same English→Arabic map, so there is
   exactly one translation mechanism on the site.
   ========================================================================== */

import { useContext, useMemo } from 'react';
import { LanguageContext } from './LanguageContext';
import { baseDict, fill, type Dictionary } from './dictionary';
import { NO_SKIP, rebuildWithMap } from './translatable';
import { arMap } from './dictionary';
import { uiEn, type UiStrings } from './ui';
import { copyEn, type Copy } from './copy';

/* Built once, not per render — the shapes are static. */
const uiAr: UiStrings = rebuildWithMap(uiEn, arMap, NO_SKIP);
const copyAr: Copy = rebuildWithMap(copyEn, arMap, NO_SKIP);

/** The English status value that marks a project as actively developed. Logic
 *  compares against English so it keeps working in any language. */
const ACTIVE_STATUS = 'Developing actively';

function useLangContext() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('Language hooks must be used within <LanguageProvider>.');
  }
  return ctx;
}

export function useLang() {
  return useLangContext();
}

/** Translate an English literal that lives in a component. */
export function useT() {
  return useLangContext().t;
}

/** Translate a template and substitute {placeholders}. */
export function useFormat() {
  const { t } = useLangContext();
  return (template: string, vars: Record<string, string>) => fill(t(template), vars);
}

export interface LocalizedContent extends Dictionary {
  getProject: (slug: string) => Dictionary['projects'][number] | undefined;
  /** Language-independent: reads the English record, never the translation. */
  isActive: (slug: string) => boolean;
}

export function useContent(): LocalizedContent {
  const { content: dict } = useLangContext();
  return useMemo(
    () => ({
      ...dict,
      getProject: (slug: string) => dict.projects.find((p) => p.slug === slug),
      isActive: (slug: string) =>
        baseDict.projects.find((p) => p.slug === slug)?.status === ACTIVE_STATUS,
    }),
    [dict],
  );
}

export function useUi(): UiStrings {
  const { lang } = useLangContext();
  return lang === 'ar' ? uiAr : uiEn;
}

export function useCopy(): Copy {
  const { lang } = useLangContext();
  return lang === 'ar' ? copyAr : copyEn;
}
