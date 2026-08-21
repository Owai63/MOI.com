/* ============================================================================
   asset — resolve a file in public/ against the deployment base
   ----------------------------------------------------------------------------
   Vite rewrites absolute asset URLs it finds in CSS, but not ones written as
   strings in TypeScript. Those must be resolved by hand, or they break wherever
   the site is not served from the domain root — e.g. GitHub Pages, which serves
   this project from /MyPortfolio/.

   Always wrap public/ paths with this instead of hardcoding a leading slash.
   ========================================================================== */

export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
