/* ============================================================================
   translatable — the one traversal that defines "what is a translatable word"
   ----------------------------------------------------------------------------
   English is the only authored side of this site. Everything the visitor can
   read is collected by this walk, translated once by scripts/translate.mts,
   and rebuilt by the same walk at runtime. Because collection and rebuilding
   share this file, the build script and the browser can never disagree about
   which strings are covered.
   ========================================================================== */

/** Keys whose values are NOT prose: identifiers, links, machine-compared
 *  values, and bare numbers. Skipping a key skips its entire subtree.
 *
 *  Everything not listed here IS translated — including `tech`, `tags`,
 *  `items`, `skills`, `headers` and `rows`, which are visible words and used
 *  to be left in English. The translator keeps acronyms (BLE, STM32, AWS…)
 *  in Latin script, so nothing readable is skipped merely because it is
 *  technical. */
export const SKIP_KEYS = new Set<string>([
  // identifiers & routing
  'slug', 'slugs', 'featuredSlugs', 'id', 'href', 'url', 'index',
  // contact endpoints (must stay machine-usable). NOTE: these names are only
  // identifiers inside the *content* model — in ui.ts / copy.ts the same names
  // hold display labels ("Email", "Phone"), which is why those two surfaces are
  // walked with NO skip list at all (see `NO_SKIP`).
  'email', 'phone', 'phoneHref', 'handle',
  // presentation / logic switches compared in code
  'accent', 'category', 'heroImage', 'src', 'position',
]);

/** Display-copy surfaces (ui.ts, copy.ts) contain no identifiers, so nothing
 *  is skipped there. */
export const NO_SKIP: Set<string> = new Set();

// Note: keys holding bare numbers ('index', 'k', 'cgpa', 'year', 'years') need
// no entry here — `isUntranslatable` already leaves digit-only strings alone,
// while letting genuinely worded siblings like 'Nov 2024 – Present' through.

type Node = unknown;

/** True when a string carries no translatable word (digits/punctuation only,
 *  e.g. "01", "3.59", "2020 – 2024", "0.798 / 0.906"). */
export function isUntranslatable(s: string): boolean {
  return !/\p{L}/u.test(s) || !/[\p{L}]{2,}/u.test(s);
}

/** Visit every translatable string in a structure. */
export function walkStrings(
  node: Node,
  key: string | undefined,
  visit: (s: string) => void,
  skip: Set<string> = SKIP_KEYS,
): void {
  if (key && skip.has(key)) return;
  if (typeof node === 'string') {
    if (node.trim() && !isUntranslatable(node)) visit(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkStrings(item, key, visit, skip);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, Node>)) {
      walkStrings(v, k, visit, skip);
    }
  }
}

/** Collect the unique set of translatable English strings. */
export function collectStrings(node: Node, skip: Set<string> = SKIP_KEYS): Set<string> {
  const out = new Set<string>();
  walkStrings(node, undefined, (s) => out.add(s), skip);
  return out;
}

/** Rebuild the same structure, replacing translatable strings via `map`
 *  (missing translations fall back to the original English). */
export function rebuildWithMap<T>(
  node: T,
  map: Map<string, string>,
  skip: Set<string> = SKIP_KEYS,
  key?: string,
): T {
  if (key && skip.has(key)) return node;
  if (typeof node === 'string') {
    return (map.get(node) ?? node) as unknown as T;
  }
  if (Array.isArray(node)) {
    return node.map((item) => rebuildWithMap(item, map, skip, key)) as unknown as T;
  }
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = rebuildWithMap(v, map, skip, k);
    }
    return out as unknown as T;
  }
  return node;
}

/** Extract en→ar pairs from a hand-written source (used by the one-off
 *  migration that produced curated.ar.ts), keeping only genuine translations. */
export function seedPairs(en: Node, ar: Node, map: Map<string, string>, key?: string): void {
  if (key && SKIP_KEYS.has(key)) return;
  if (typeof en === 'string') {
    if (typeof ar === 'string' && ar.trim() && ar !== en) map.set(en, ar);
    return;
  }
  if (Array.isArray(en)) {
    en.forEach((item, i) => seedPairs(item, Array.isArray(ar) ? ar[i] : undefined, map, key));
    return;
  }
  if (en && typeof en === 'object') {
    for (const [k, v] of Object.entries(en as Record<string, Node>)) {
      const av = ar && typeof ar === 'object' ? (ar as Record<string, Node>)[k] : undefined;
      seedPairs(v, av, map, k);
    }
  }
}
