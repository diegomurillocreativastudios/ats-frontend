"use client"

import { useEffect, useState } from "react"
import { Lightbulb } from "lucide-react"

const APPLICATION_TIPS = [
  "Revisa que tu correo electrónico y teléfono estén actualizados.",
  "Sube tu hoja de vida en formato PDF.",
  "Verifica que todos tus datos estén correctos antes de enviar.",
  "Asegúrate de cumplir con los requisitos principales de la vacante.",
  "Mantente pendiente de tu correo y teléfono después de postularte.",
  "Utiliza un nombre de archivo profesional para tu CV.",
  "Revisa la ortografía de tu información antes de continuar.",
  "Adjunta todos los documentos solicitados.",
  "No olvides incluir tu experiencia laboral más reciente.",
  "Confirma que tu disponibilidad coincida con lo solicitado en la vacante.",
]

const TIP_ROTATION_INTERVAL = 7000

function getRandomTip(excludeIndex?: number): { tip: string; index: number } {
  const availableIndices = APPLICATION_TIPS.map((_, i) => i).filter(
    (i) => i !== excludeIndex
  )
  const randomIndex =
    availableIndices[Math.floor(Math.random() * availableIndices.length)]
  return {
    tip: APPLICATION_TIPS[randomIndex] ?? APPLICATION_TIPS[0] ?? "",
    index: randomIndex ?? 0,
  }
}

interface ApplicationTipsWidgetProps {
  position?: "left" | "right"
}

export function ApplicationTipsWidget({
  position = "left",
}: ApplicationTipsWidgetProps = {}) {
  const [currentTipData, setCurrentTipData] = useState(() => getRandomTip())
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsVisible(false)

      setTimeout(() => {
        setCurrentTipData((prev) => getRandomTip(prev.index))
        setIsVisible(true)
      }, 300)
    }, TIP_ROTATION_INTERVAL)

    return () => clearInterval(intervalId)
  }, [])

  const positionClassName =
    position === "right" ? "right-6" : "left-6"

  return (
    <aside
      className={`fixed bottom-6 ${positionClassName} z-40 w-[320px] max-w-[calc(100vw-3rem)] sm:w-[380px]`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="overflow-hidden rounded-[26px] border border-white/20 bg-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/8 via-transparent to-transparent" />

        <div className="relative p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-[#ffd966]/30 bg-linear-to-br from-[#ffd966]/20 to-[#ffb84d]/20">
              <Lightbulb
                className="h-5 w-5 text-[#ffd966]"
                aria-hidden="true"
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <h3 className="text-sm font-semibold tracking-tight text-white">
                Consejo para tu postulación
              </h3>
              <p className="text-sm leading-relaxed text-white/84">
                {currentTipData.tip}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
