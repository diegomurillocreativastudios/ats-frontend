"use client"

import { useState } from "react"
import { downloadElementAsPdf } from "@/lib/pdf/download-element-as-pdf"

export interface DownloadPdfButtonProps {
  targetRef: React.RefObject<HTMLElement | null>
  fileName?: string
  label?: string
  className?: string
  disabled?: boolean
}

export function DownloadPdfButton({
  targetRef,
  fileName,
  label = "Descargar PDF",
  className,
  disabled = false,
}: DownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    const element = targetRef.current

    if (!element) {
      console.error("No se encontró el elemento a capturar.")
      return
    }

    try {
      setIsGenerating(true)
      await downloadElementAsPdf({
        element,
        fileName,
        orientation: "portrait",
        format: "a4",
        scale: 2,
        marginMm: 0,
      })
    } catch (error) {
      console.error("Error al generar PDF:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleDownload()
      }}
      disabled={disabled || isGenerating}
      data-html2canvas-ignore="true"
      className={className}
    >
      {isGenerating ? "Generando PDF..." : label}
    </button>
  )
}
