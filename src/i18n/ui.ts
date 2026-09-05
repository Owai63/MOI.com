/* ============================================================================
   ui — interface micro-copy (not portfolio content)
   ----------------------------------------------------------------------------
   Buttons, aria labels, chatbot UI, CV labels. ENGLISH ONLY — this is authored
   copy, and the Arabic for every string here is produced once by
   `npm run translate` and served from the Arabic map. Portfolio *facts* live in
   the content dictionary; only chrome lives here.
   ========================================================================== */

export interface UiStrings {
  // global chrome
  skipToContent: string;
  languageName: string; // label of the *other* language on the toggle
  switchLanguage: string; // aria-label for the toggle
  availabilityFallback: string;

  // CV
  downloadCv: string;
  cvGenerating: string;
  cvFileLabel: string; // used in the generated file name segment

  // chat widget
  chatOpen: string;
  chatClose: string;
  chatTitle: string;
  chatSubtitle: string;
  chatPlaceholder: string;
  chatSend: string;
  chatGreeting: string;
  chatError: string;
  chatBusy: string;
  chatThinking: string;
  chatDownloadCv: string;
  chatSuggest1: string;
  chatSuggest2: string;
  chatSuggest3: string;
  chatDisclaimer: string;

  // landmarks & aria labels (previously hardcoded in components)
  navHome: string;
  navPrimary: string;
  navMobile: string;
  /** Template — {subject} is the top-level destination the menu belongs to. */
  navSubmenuOf: string;
  navNewTab: string;
  navShortcuts: string;
  navSitemap: string;
  navProjectPager: string;
  menuOpen: string;
  menuClose: string;
  heroLandmark: string;
  filterProjects: string;
  technologies: string;
  /** Placeholder template — {subject} is substituted at render time, so the
   *  translator is free to move it to the position Arabic grammar needs. */
  technologiesOf: string;

  // loading / error routes
  loading: string;
  notFoundKicker: string;
  notFoundTitle: string;
  backHome: string;

  // decorative overlays
  loaderEyebrow: string;
  conceptualOverlay: string;
  featuredAlt: string;

  // document <head>
  docTitle: string;
  docDescription: string;
}

export const uiEn: UiStrings = {
  skipToContent: 'Skip to content',
  languageName: 'العربية',
  switchLanguage: 'Switch language to Arabic',
  availabilityFallback: 'Available for relevant opportunities',

  downloadCv: 'Download CV',
  cvGenerating: 'Preparing CV…',
  cvFileLabel: 'CV',

  chatOpen: 'Open assistant',
  chatClose: 'Close assistant',
  chatTitle: 'Ask about Owais',
  chatSubtitle: 'AI assistant · grounded in this portfolio',
  chatPlaceholder: 'Ask about experience, projects, skills…',
  chatSend: 'Send',
  chatGreeting:
    "Hi — I'm the assistant for this portfolio. Ask me about Owais's embedded and IoT work, experience, or skills. I can also generate his CV.",
  chatError:
    'Sorry, I could not reach the assistant. Please try again in a moment.',
  chatBusy:
    'The assistant has reached its request limit for now. Please try again later, or email owais1.iqbal@gmail.com.',
  chatThinking: 'Thinking…',
  chatDownloadCv: 'Download CV',
  chatSuggest1: 'What does Owais do?',
  chatSuggest2: 'Tell me about the MYMO2 tracker',
  chatSuggest3: 'What is his experience with BLE?',
  chatDisclaimer: 'Answers are based only on this portfolio.',

  navHome: 'Home — Muhammad Owais Iqbal',
  navPrimary: 'Primary',
  navMobile: 'Mobile',
  navSubmenuOf: '{subject} submenu',
  navNewTab: 'opens in a new tab',
  navShortcuts: 'Chapter shortcuts',
  navSitemap: 'Sitemap',
  navProjectPager: 'Project navigation',
  menuOpen: 'Open menu',
  menuClose: 'Close menu',
  heroLandmark: 'Introduction',
  filterProjects: 'Filter projects',
  technologies: 'Technologies',
  technologiesOf: '{subject} technologies',

  loading: 'Loading…',
  notFoundKicker: '404 — Not found',
  notFoundTitle: 'This page left the lab.',
  backHome: '← Back to home',

  loaderEyebrow: 'Engineered Reality',
  conceptualOverlay: 'CONCEPTUAL · ILLUSTRATIVE OVERLAY',
  featuredAlt:
    'Conceptual visualization of a vehicle connected to cloud services through a cellular data path.',

  docTitle: 'Muhammad Owais Iqbal — Embedded Systems & IoT Engineer',
  docDescription:
    'Muhammad Owais Iqbal Malik — Embedded Systems and IoT Engineer in Riyadh. Firmware, wireless communication, device-to-cloud systems, and real-world deployment. I build systems that leave the lab.',
};

/** The `languageName` / `switchLanguage` values are deliberately the *other*
 *  language's label, so their Arabic counterparts live in curated.ar.ts like
 *  any other pair. */
