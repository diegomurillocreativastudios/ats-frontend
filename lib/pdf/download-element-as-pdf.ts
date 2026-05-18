import { prepareHtml2CanvasClone } from "@/lib/pdf/html2canvas-prepare-clone"

export interface CaptureElementAsPdfOptions {
  element: HTMLElement
  orientation?: "portrait" | "landscape"
  format?: "a4" | "letter"
  scale?: number
  marginMm?: number
}

export interface DownloadElementAsPdfOptions extends CaptureElementAsPdfOptions {
  fileName?: string
}

async function buildPdfFromElement({
  element,
  orientation = "portrait",
  format = "a4",
  scale = 2,
  marginMm = 0,
}: CaptureElementAsPdfOptions) {
  if (typeof window === "undefined") {
    throw new Error("buildPdfFromElement solo puede ejecutarse en el cliente.")
  }

  if (!element) {
    throw new Error("No se recibió un elemento HTML válido para generar el PDF.")
  }

  const html2canvas = (await import("html2canvas-pro")).default
  const { jsPDF } = await import("jspdf")

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (clonedDoc, clonedElement) => {
      if (clonedElement instanceof HTMLElement) {
        prepareHtml2CanvasClone(clonedDoc, element, clonedElement)
      }
    },
  })

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format,
    compress: true,
  })

  const pageWidthMm = pdf.internal.pageSize.getWidth()
  const pageHeightMm = pdf.internal.pageSize.getHeight()

  const contentWidthMm = pageWidthMm - marginMm * 2
  const contentHeightMm = pageHeightMm - marginMm * 2

  const pxPerMm = canvas.width / contentWidthMm
  const pageHeightPx = Math.floor(contentHeightMm * pxPerMm)

  let renderedHeightPx = 0
  let pageIndex = 0

  while (renderedHeightPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx)

    const pageCanvas = document.createElement("canvas")
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeightPx

    const ctx = pageCanvas.getContext("2d")

    if (!ctx) {
      throw new Error("No se pudo crear el contexto del canvas para el PDF.")
    }

    ctx.drawImage(
      canvas,
      0,
      renderedHeightPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx
    )

    const imgData = pageCanvas.toDataURL("image/png")
    const imgHeightMm = sliceHeightPx / pxPerMm

    if (pageIndex > 0) {
      pdf.addPage(format, orientation)
    }

    pdf.addImage(imgData, "PNG", marginMm, marginMm, contentWidthMm, imgHeightMm)

    renderedHeightPx += sliceHeightPx
    pageIndex += 1
  }

  return pdf
}

export async function captureElementAsPdfBlob(
  options: CaptureElementAsPdfOptions
): Promise<Blob> {
  const pdf = await buildPdfFromElement(options)
  return pdf.output("blob")
}

export async function downloadElementAsPdf({
  element,
  fileName = `documento-${new Date().toISOString().slice(0, 10)}.pdf`,
  orientation = "portrait",
  format = "a4",
  scale = 2,
  marginMm = 0,
}: DownloadElementAsPdfOptions): Promise<void> {
  const pdf = await buildPdfFromElement({
    element,
    orientation,
    format,
    scale,
    marginMm,
  })
  pdf.save(fileName)
}
