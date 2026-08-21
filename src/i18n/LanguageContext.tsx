/* ============================================================================
   LanguageContext — the single switch that makes the site bilingual
   ----------------------------------------------------------------------------
   - Auto-detects Arabic vs English from the browser on first visit.
   - Remembers the visitor's explicit choice in localStorage.
   - Applies <html lang> / <html dir> and localizes the document <head>.

   Switching language is synchronous: both dictionaries are already built (see
   dictionary.ts). Nothing is fetched, so there is no half-translated frame.
   Consumers use the hooks in useContent.ts, not this file directly.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { dictionaries, toArabic, type Lang, type Dictionary } from './dictionary';
import { uiEn } from './ui';

const STORAGE_KEY = 'moi-lang';

export interface LanguageContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  content: Dictionary;
  /** Translate a single English string for the active language. */
  t: (englishText: string) => string;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ar') return stored;
  } catch {
    /* localStorage may be blocked; fall through to detection */
  }
  const langs = navigator.languages ?? [navigator.language];
  const prefersArabic = langs.some((l) => l?.toLowerCase().startsWith('ar'));
  return prefersArabic ? 'ar' : 'en';
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  const el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (el) el.content = content;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

  const t = useCallback(
    (englishText: string) => (lang === 'ar' ? toArabic(englishText) : englishText),
    [lang],
  );

  // Reflect language onto the document root for CSS + a11y, and localize the
  // <head> — the tab title and share description are words on the site too.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', dir);
    root.dataset.lang = lang;

    const title = t(uiEn.docTitle);
    const description = t(uiEn.docDescription);
    document.title = title;
    setMeta('description', description);
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
  }, [lang, dir, t]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore persistence failure */
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'ar' : 'en');
  }, [lang, setLang]);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, dir, content: dictionaries[lang], t, setLang, toggleLang }),
    [lang, dir, t, setLang, toggleLang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
