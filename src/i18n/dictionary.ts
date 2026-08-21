/* ============================================================================
   dictionary — the bilingual bundle, built once at module load
   ----------------------------------------------------------------------------
   English (src/data/content.ts, ui.ts, copy.ts) is the ONLY authored side of
   this site. Arabic is not authored anywhere: it is one flat English→Arabic
   map, produced once by `npm run translate` and shipped with the bundle.

     English source ──▶ scripts/translate.mts (build time, once) ──▶ ar.json
                                                                      │
     English source ──▶ rebuildWithMap ◀────────────────────────────--┘
                                │
                                └─▶ Arabic dictionary (synchronous, complete)

   Nothing is fetched, cached per-visitor, or translated in the browser. A
   string that has no entry in the map falls back to English, and
   `npm run translate -- --check` fails the build when that happens.
   ========================================================================== */

import * as en from '../data/content';
import generatedAr from './ar.json';
import { curatedAr } from './curated.ar';
import { rebuildWithMap } from './translatable';

/** The canonical shape every section reads from. */
export interface Dictionary {
  profile: typeof en.profile;
  heroProof: typeof en.heroProof;
  impact: typeof en.impact;
  projects: typeof en.projects;
  featuredSlugs: typeof en.featuredSlugs;
  capabilities: typeof en.capabilities;
  experience: typeof en.experience;
  additionalExperience: typeof en.additionalExperience;
  education: typeof en.education;
  awards: typeof en.awards;
  certifications: typeof en.certifications;
  openTo: typeof en.openTo;
  philosophy: typeof en.philosophy;
  nav: typeof en.nav;
  contactLine: typeof en.contactLine;
}

const enDict: Dictionary = {
  profile: en.profile,
  heroProof: en.heroProof,
  impact: en.impact,
  projects: en.projects,
  featuredSlugs: en.featuredSlugs,
  capabilities: en.capabilities,
  experience: en.experience,
  additionalExperience: en.additionalExperience,
  education: en.education,
  awards: en.awards,
  certifications: en.certifications,
  openTo: en.openTo,
  philosophy: en.philosophy,
  nav: en.nav,
  contactLine: en.contactLine,
};

export type Lang = 'en' | 'ar';

/** The single English→Arabic lookup. Hand-approved pairs in curated.ar.ts
 *  always win over the machine-generated ones. */
export const arMap: Map<string, string> = new Map([
  ...Object.entries(generatedAr as Record<string, string>),
  ...Object.entries(curatedAr),
]);

/** Translate one English string. Unknown strings fall back to English. */
export function toArabic(englishText: string): string {
  return arMap.get(englishText) ?? englishText;
}

/** Substitute {placeholders} into a (possibly translated) template. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, k: string) => vars[k] ?? whole);
}

const arDict: Dictionary = rebuildWithMap(enDict, arMap);

export const dictionaries: Record<Lang, Dictionary> = { en: enDict, ar: arDict };

/** English is always the stable structural reference (slugs, hrefs, and any
 *  value that code compares against). Never render it directly in Arabic mode. */
export const baseDict = enDict;
export { enDict, arDict };
