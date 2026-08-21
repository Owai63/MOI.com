/* ============================================================================
   downloadCv — open the deterministic CV and invoke the browser's PDF export
   ----------------------------------------------------------------------------
   The CV is a fixed document (see cvData.ts) rendered by cvTemplate.ts. We open
   it in a new tab styled for A4 and trigger the print dialog, where the visitor
   chooses "Save as PDF". Using the browser's own print pipeline keeps the
   layout identical across machines with zero heavy PDF dependencies.
   ========================================================================== */

import { cvData } from './cvData';
import { buildCvHtml } from './cvTemplate';
import type { Lang } from '../../i18n/dictionary';

export function downloadCv(lang: Lang): void {
  const data = cvData[lang] ?? cvData.en;
  const html = buildCvHtml(data, lang);

  const win = window.open('', '_blank');
  if (!win) {
    // Pop-up blocked — fall back to a same-tab Blob download of the HTML.
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cvFileName(lang)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = cvFileName(lang);

  // Give the new document a tick to lay out (and fonts to settle) before print.
  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* user can still print manually */
    }
  };
  if (win.document.readyState === 'complete') {
    setTimeout(triggerPrint, 350);
  } else {
    win.onload = () => setTimeout(triggerPrint, 350);
  }
}

function cvFileName(lang: Lang): string {
  return lang === 'ar'
    ? 'محمد_أويس_إقبال_السيرة_الذاتية'
    : 'Muhammad_Owais_Iqbal_CV';
}
