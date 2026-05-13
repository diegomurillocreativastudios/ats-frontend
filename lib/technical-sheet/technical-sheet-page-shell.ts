import { escapeHtmlForTechnicalSheet } from "@/lib/technical-sheet/template-interpolate"
import {
  TECHNICAL_SHEET_CONTENT_BOTTOM_PX,
  TECHNICAL_SHEET_CONTENT_LEFT_PX,
  TECHNICAL_SHEET_CONTENT_RIGHT_PX,
  TECHNICAL_SHEET_CONTENT_TOP_PX,
  TECHNICAL_SHEET_PAGE_HEIGHT_PX,
  TECHNICAL_SHEET_PAGE_WIDTH_PX,
} from "@/lib/technical-sheet/technical-sheet-page-constants"

export interface TechnicalSheetPageHeaderFields {
  fullName: string
  address: string
  englishLevel: string
}

export interface TechnicalSheetPageShellOptions {
  logoUrl: string
  header: TechnicalSheetPageHeaderFields
  /** HTML ya interpolado que va dentro del área segura (normalmente `<article>...</article>`). */
  bodyHtml: string
}

/**
 * Una hoja carta completa: decoración, cabecera, barra inferior y área de contenido absoluta.
 */
export function buildTechnicalSheetPageHtml(options: TechnicalSheetPageShellOptions): string {
  const logo = options.logoUrl.replace(/"/g, "")
  const fullName = escapeHtmlForTechnicalSheet(options.header.fullName)
  const address = escapeHtmlForTechnicalSheet(options.header.address)
  const englishLevel = escapeHtmlForTechnicalSheet(options.header.englishLevel)

  return `<section class="technical-sheet-page" style="width:${TECHNICAL_SHEET_PAGE_WIDTH_PX}px;height:${TECHNICAL_SHEET_PAGE_HEIGHT_PX}px;max-width:100%;margin:0 auto 16px;position:relative;overflow:hidden;box-sizing:border-box;background:#ffffff;box-shadow:0 14px 40px rgba(0,0,0,0.16);page-break-after:always;">
  <div class="technical-sheet-page__decor" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;">
    <div style="position:absolute;top:0;left:365px;width:76px;height:28px;background:#6F12FF;"></div>
    <div style="position:absolute;top:0;right:0;width:86px;height:152px;background:#6F12FF;"></div>
    <div style="position:absolute;top:0;right:0;width:54px;height:45px;background:#67DFFC;"></div>
    <div style="position:absolute;top:139px;right:0;width:15px;height:47px;background:#67DFFC;"></div>
    <div style="position:absolute;top:762px;right:0;width:28px;height:78px;background:#6F12FF;"></div>
    <div style="position:absolute;bottom:58px;left:0;width:78px;height:126px;background:#6F12FF;"></div>
    <div style="position:absolute;bottom:58px;left:0;width:50px;height:46px;background:#67DFFC;"></div>
    <div style="position:absolute;bottom:76px;right:12px;display:grid;grid-template-columns:repeat(4,10px);gap:18px 16px;">
      ${Array(16)
        .fill(
          '<span style="width:7px;height:7px;border-radius:50%;background:#6F12FF;display:block;"></span>'
        )
        .join("")}
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:58px;background:#2C1240;"></div>
  </div>
  <header class="technical-sheet-page__header" style="position:relative;z-index:5;display:grid;grid-template-columns:430px 1fr;column-gap:35px;align-items:start;padding:62px 72px 0 20px;box-sizing:border-box;background:#ffffff;">
    <div style="display:flex;align-items:center;gap:14px;">
      <img src="${logo}" alt="" width="105" style="width:105px;height:auto;display:block;object-fit:contain;" />
      <div style="line-height:1;">
        <div style="font-size:40px;font-weight:800;letter-spacing:-2px;color:#4C4C4C;font-family:Arial,Helvetica,sans-serif;">visible</div>
        <div style="font-size:12px;color:#7A7A7A;margin-top:2px;letter-spacing:-0.2px;font-family:Arial,Helvetica,sans-serif;">transforming businesses with talent</div>
      </div>
    </div>
    <div style="font-size:12px;line-height:1.45;color:#111827;white-space:nowrap;padding-top:13px;">
      <div><strong>Nombre:</strong> ${fullName}</div>
      <div><strong>Dirección:</strong> ${address}</div>
      <div><strong>Nivel de inglés:</strong> ${englishLevel}</div>
    </div>
  </header>
  <div class="technical-sheet-content" style="position:absolute;z-index:5;box-sizing:border-box;top:${TECHNICAL_SHEET_CONTENT_TOP_PX}px;left:${TECHNICAL_SHEET_CONTENT_LEFT_PX}px;right:${TECHNICAL_SHEET_CONTENT_RIGHT_PX}px;bottom:${TECHNICAL_SHEET_CONTENT_BOTTOM_PX}px;font-size:13.5px;line-height:1.42;color:#111827;overflow:visible;">
    ${options.bodyHtml}
  </div>
</section>`
}

export const TECHNICAL_SHEET_MULTI_PAGE_STYLES = `<style data-technical-sheet-multi-page>
@page { size: letter; margin: 0; }
html, body { margin: 0; padding: 0; }
.technical-sheet-doc {
  margin: 0;
  padding: 24px 0 32px;
  background: #f5f5f5;
  font-family: Arial, Helvetica, sans-serif;
}
.technical-sheet-doc .technical-sheet-page:last-of-type {
  margin-bottom: 0;
  page-break-after: auto;
}
.technical-sheet-content article,
article.ts-article {
  margin: 0;
  padding: 0;
}
article.ts-article > section,
.technical-sheet-content article > section {
  margin-bottom: 28px;
  break-inside: avoid;
  page-break-inside: avoid;
}
article.ts-article > section > h2,
.technical-sheet-content article > section > h2 {
  break-after: avoid;
  page-break-after: avoid;
}
article.ts-article table,
.technical-sheet-content article table {
  break-inside: avoid;
  page-break-inside: avoid;
}
@media print {
  .technical-sheet-doc {
    padding: 0;
    background: #ffffff;
  }
  .technical-sheet-page {
    margin: 0 !important;
    box-shadow: none !important;
    page-break-after: always;
  }
}
</style>`
