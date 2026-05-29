"use client"

import { useState } from "react"
import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { StarRating } from "@/components/ui/StarRating"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

interface FinishVacancyProcessModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { calification: number; comments: string }) => Promise<void>
  loading?: boolean
}

export function FinishVacancyProcessModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: FinishVacancyProcessModalProps) {
  const [calification, setCalification] = useState(5)
  const [comments, setComments] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)

    if (calification < 1 || calification > 5) {
      setError("La calificación debe estar entre 1 y 5 estrellas.")
      return
    }

    try {
      await onConfirm({ calification, comments: comments.trim() })
      setCalification(5)
      setComments("")
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al finalizar el proceso"
      setError(errorMessage)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setCalification(5)
      setComments("")
      onClose()
    }
  }

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        disabled={loading}
        aria-label="Cancelar"
      >
        Cancelar
      </Button>
      <Button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        loading={loading}
        className="bg-vo-purple text-white hover:bg-vo-purple-hover focus-visible:ring-vo-purple"
        aria-label="Confirmar finalización"
      >
        Finalizar proceso
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Finalizar proceso de la vacante"
      footer={footer}
      size="md"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
            <CheckCircle2 className="h-5 w-5 text-sky-600" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-sans text-sm font-semibold text-sky-900">
              Proceso completado
            </p>
            <p className="font-sans text-sm text-sky-800">
              Al finalizar el proceso, la vacante quedará inactiva y en estado de solo
              lectura. Podrás consultar toda la información, pero no realizar
              cambios.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacancy-calification"
            className="font-sans text-sm font-medium text-foreground"
          >
            Calificación del proceso
            <span className="ml-1 text-destructive" aria-label="requerido">
              *
            </span>
          </label>
          <div className="flex items-center gap-3">
            <StarRating
              value={calification}
              onChange={setCalification}
              size="lg"
            />
            <span className="font-sans text-sm text-muted-foreground">
              {calification} de 5 estrella{calification !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="font-sans text-xs text-muted-foreground">
            Selecciona entre 1 y 5 estrellas para calificar el proceso de
            reclutamiento.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacancy-comments"
            className="font-sans text-sm font-medium text-foreground"
          >
            Comentarios (opcional)
          </label>
          <textarea
            id="vacancy-comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={loading}
            rows={4}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
            placeholder="Agrega tus comentarios sobre el proceso de reclutamiento..."
            aria-label="Comentarios sobre el proceso"
          />
          <p className="font-sans text-xs text-muted-foreground">
            Puedes agregar observaciones o notas sobre cómo fue el proceso.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="flex-1 font-sans text-sm text-destructive">
              {error}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
