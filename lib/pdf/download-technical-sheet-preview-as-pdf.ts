import { prepareHtml2CanvasClone } from "@/lib/pdf/html2canvas-prepare-clone"
import { resolveTechnicalSheetPdfElement } from "@/lib/pdf/resolve-technical-sheet-pdf-element"
import { downloadElementAsPdf } from "@/lib/pdf/download-element-as-pdf"
import {
  TECHNICAL_SHEET_PAGE_HEIGHT_PX,
  TECHNICAL_SHEET_PAGE_WIDTH_PX,
} from "@/lib/technical-sheet/technical-sheet-page-constants"

export interface DownloadTechnicalSheetPreviewAsPdfOptions {
  panelRoot: HTMLElement
  fileName: string
  scale?: number
}

/**
 * Exporta el PDF desde el iframe de vista previa (WYSIWYG con la plantilla del backend).
 * Captura cada `.technical-sheet-page` en formato carta para alinear con la paginación del panel.
 */
export async function downloadTechnicalSheetPreviewAsPdf({
  panelRoot,
  fileName,
  scale = 2,
}: DownloadTechnicalSheetPreviewAsPdfOptions): Promise<void> {
  const iframe = panelRoot.querySelector("iframe")
  const doc = iframe?.contentDocument
  if (!doc) {
    throw new Error("La vista previa no está lista para exportar el PDF.")
  }

  if (doc.fonts?.ready) {
    await doc.fonts.ready
  }

  const pageElements = Array.from(doc.querySelectorAll<HTMLElement>(".technical-sheet-page"))

  if (pageElements.length === 0) {
    const main = resolveTechnicalSheetPdfElement(panelRoot)
    if (!main) {
      throw new Error("No hay contenido de ficha técnica para exportar.")
    }
    await downloadElementAsPdf({
      element: main,
      fileName,
      orientation: "portrait",
      format: "letter",
      scale,
      marginMm: 0,
    })
    return
  }

  const html2canvas = (await import("html2canvas-pro")).default
  const { jsPDF } = await import("jspdf")

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
    compress: true,
  })

  const pageWidthMm = pdf.internal.pageSize.getWidth()
  const pageHeightMm = pdf.internal.pageSize.getHeight()

  for (let i = 0; i < pageElements.length; i += 1) {
    const pageEl = pageElements[i]
    const canvas = await html2canvas(pageEl, {
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#FBFAF7",
      width: TECHNICAL_SHEET_PAGE_WIDTH_PX,
      height: TECHNICAL_SHEET_PAGE_HEIGHT_PX,
      windowWidth: TECHNICAL_SHEET_PAGE_WIDTH_PX,
      windowHeight: TECHNICAL_SHEET_PAGE_HEIGHT_PX,
      onclone: (clonedDoc, clonedElement) => {
        if (clonedElement instanceof HTMLElement) {
          prepareHtml2CanvasClone(clonedDoc, pageEl, clonedElement)
        }
      },
    })

    const imgData = canvas.toDataURL("image/png")
    if (i > 0) {
      pdf.addPage("letter", "portrait")
    }
    pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm)
  }

  pdf.save(fileName)
}
