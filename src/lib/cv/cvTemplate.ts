/* ============================================================================
   cvTemplate — deterministic A4 CV renderer
   ----------------------------------------------------------------------------
   Turns cvData[lang] into a fixed, print-ready HTML document that mirrors the
   supplied PDF (light-blue section header bars, name + role header rule,
   bulleted sections, projects with org on the right). Pure function of the
   data → identical output every time.
   ========================================================================== */

import type { CvData, CvExperience, CvProject } from './cvData';
import type { Lang } from '../../i18n/dictionary';

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const li = (items: string[]) =>
  `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;

const sectionBar = (title: string) =>
  `<h2 class="bar">${esc(title)}</h2>`;

function experienceBlock(x: CvExperience, tech: string): string {
  const rightAlignedPeriod = `<span class="period">${esc(x.period)}</span>`;
  const head = `<div class="xp-head"><span class="xp-title"><strong>${esc(
    x.title,
  ).toUpperCase()}</strong> | ${esc(x.company)} | ${esc(
    x.location,
  )}</span>${rightAlignedPeriod}</div>`;
  const intro = x.intro
    ? `<p class="${x.intro.length < 40 ? 'xp-sub' : 'xp-intro'}">${esc(x.intro)}</p>`
    : '';
  return `<div class="xp">${head}${intro}${li(x.bullets)}</div>`;
  // `tech` param kept for signature symmetry with projects; experience has none
  void tech;
}

function projectBlock(p: CvProject, techLabel: string): string {
  const head = `<div class="pj-head"><strong class="pj-name">${esc(
    p.name,
  ).toUpperCase()}</strong><strong class="pj-org">${esc(p.org).toUpperCase()}</strong></div>`;
  const intro = p.intro ? `<p class="pj-intro">${esc(p.intro)}</p>` : '';
  const tech = p.tech
    ? `<p class="pj-tech"><strong>${esc(techLabel)}:</strong> ${esc(p.tech)}</p>`
    : '';
  return `<div class="pj">${head}${intro}${li(p.bullets)}${tech}</div>`;
}

export function buildCvHtml(data: CvData, lang: Lang): string {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontStack =
    lang === 'ar'
      ? `'Segoe UI', 'Tahoma', 'Arial', sans-serif`
      : `'Calibri', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;

  const skills = data.skills
    .map(
      (s) =>
        `<li><strong>${esc(s.label)}:</strong> ${esc(s.value)}</li>`,
    )
    .join('');

  const experience = data.experience
    .map((x) => experienceBlock(x, ''))
    .join('');
  const projects = data.projects
    .map((p) => projectBlock(p, data.labels.technologies))
    .join('');
  const certs = data.certifications.map((c) => `<li>${esc(c)}</li>`).join('');
  const awards = data.awards.map((a) => `<li>${esc(a)}</li>`).join('');
  const competencies = data.competencies
    .map((c) => `<li>${esc(c)}</li>`)
    .join('');

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(data.name)} — ${esc(data.role)}</title>
<style>
  :root { --ink:#1a1a1a; --muted:#333; --bar:#dbe5f1; --barink:#12233b; --rule:#111; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${fontStack};
    color: var(--ink);
    font-size: 10.5pt;
    line-height: 1.45;
    background: #fff;
  }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm 15mm; }
  @media screen { body { background:#525659; } .page { background:#fff; margin: 12px auto; box-shadow: 0 2px 18px rgba(0,0,0,.4); } }

  /* header */
  .name { font-size: 24pt; letter-spacing: 3px; font-weight: 700; margin: 0; }
  .header { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; }
  .role { font-size: 9.5pt; letter-spacing: 1.5px; color: var(--muted); white-space: nowrap; padding-bottom: 4px; }
  .contact { font-size: 9pt; color: var(--muted); margin: 3px 0 6px; }
  .rule { border: 0; border-top: 1.5px solid var(--rule); margin: 4px 0 12px; }

  /* section header bar */
  h2.bar {
    background: var(--bar); color: var(--barink);
    font-size: 11pt; letter-spacing: 1.5px; text-transform: uppercase;
    font-weight: 700; padding: 3px 8px; margin: 14px 0 8px;
  }

  ul { margin: 4px 0 8px; padding-inline-start: 20px; }
  li { margin: 2px 0; }
  p { margin: 4px 0; }

  /* experience */
  .xp { margin-bottom: 10px; }
  .xp-head { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
  .xp-title { font-size: 10.5pt; }
  .period { white-space: nowrap; color: var(--muted); font-size: 9.5pt; }
  .xp-sub { font-weight: 700; margin-top: 4px; }
  .xp-intro { margin-top: 4px; }

  /* projects */
  .pj { margin-bottom: 10px; }
  .pj-head { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
  .pj-name { font-size: 11pt; letter-spacing: .5px; }
  .pj-org { font-size: 11pt; letter-spacing: .5px; }
  .pj-tech { margin-top: 4px; }
  .pj-intro { margin-top: 4px; }

  .edu-line { margin: 4px 0; }

  @media print {
    @page { size: A4; margin: 0; }
    body { background:#fff; }
    .page { box-shadow:none; margin:0; }
    .xp, .pj { page-break-inside: avoid; }
    h2.bar { page-break-after: avoid; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1 class="name">${esc(data.name)}</h1>
      <div class="role">${esc(data.role)}</div>
    </div>
    <div class="contact">${data.contact.map(esc).join(' | ')}</div>
    <hr class="rule" />

    ${sectionBar(data.labels.summary)}
    <p>${esc(data.summary)}</p>

    ${sectionBar(data.labels.competencies)}
    <ul>${competencies}</ul>

    ${sectionBar(data.labels.skills)}
    <ul>${skills}</ul>

    ${sectionBar(data.labels.experience)}
    ${experience}

    ${sectionBar(data.labels.education)}
    <p class="edu-line">${esc(data.education.line1)}</p>
    <p class="edu-line">${esc(data.education.line2)}</p>

    ${sectionBar(data.labels.certifications)}
    <ul>${certs}</ul>

    ${sectionBar(data.labels.projects)}
    ${projects}

    ${sectionBar(data.labels.awards)}
    <ul>${awards}</ul>
  </div>
</body>
</html>`;
}
