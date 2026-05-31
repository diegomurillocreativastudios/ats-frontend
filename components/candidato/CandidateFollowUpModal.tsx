"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import Modal from "@/components/ui/Modal"
import {
  updateCandidateEvaluations,
  type CandidateEvaluation,
} from "@/lib/api/candidates"

const FOLLOW_UP_OPTIONS = [
  { value: 3, label: "3 meses post-contratación" },
  { value: 6, label: "6 meses post-contratación" },
  { value: 12, label: "12 meses post-contratación" },
]

export interface CandidateProfile {
  id: string
  profileId?: string
  name: string
  email?: string
  evalMonth?: number | null
  evalComments?: string | null
  evaluations?: CandidateEvaluation[]
  [key: string]: unknown
}

export interface CandidateFollowUpModalProps {
  open: boolean
  candidate: CandidateProfile | null
  onClose: () => void
  onUpdated: (updatedCandidate: CandidateProfile) => void
}

export default function CandidateFollowUpModal({
  open,
  candidate,
  onClose,
  onUpdated,
}: CandidateFollowUpModalProps) {
  const [evaluations, setEvaluations] = useState<CandidateEvaluation[]>([
    { evalMonth: null, evalComments: "" },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !candidate) return

    if (candidate.evaluations && candidate.evaluations.length > 0) {
      setEvaluations(
        candidate.evaluations.map((ev) => ({
          evalMonth: ev.evalMonth ?? null,
          evalComments: ev.evalComments?.trim() || "",
        }))
      )
    } else if (candidate.evalMonth !== undefined || candidate.evalComments) {
      setEvaluations([
        {
          evalMonth: candidate.evalMonth ?? null,
          evalComments: candidate.evalComments?.trim() || "",
        },
      ])
    } else {
      setEvaluations([{ evalMonth: null, evalComments: "" }])
    }

    setError(null)
  }, [open, candidate])

  const getAvailableOptions = useCallback((currentIndex: number) => {
    const usedValues = evaluations
      .map((ev, index) => (index !== currentIndex ? ev.evalMonth : null))
      .filter((val): val is number => val !== null && val !== undefined)
    
    return FOLLOW_UP_OPTIONS.filter(option => !usedValues.includes(option.value))
  }, [evaluations])

  const handleAddEvaluation = useCallback(() => {
    const availableOptions = getAvailableOptions(-1)
    if (availableOptions.length > 0) {
      setEvaluations((prev) => [...prev, { evalMonth: null, evalComments: "" }])
    }
  }, [getAvailableOptions])

  const handleRemoveEvaluation = useCallback((index: number) => {
    setEvaluations((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleEvaluationChange = useCallback(
    (index: number, field: "evalMonth" | "evalComments", value: number | null | string) => {
      setEvaluations((prev) => {
        const updated = [...prev]
        if (field === "evalMonth") {
          updated[index] = { ...updated[index], evalMonth: value as number | null }
        } else {
          updated[index] = { ...updated[index], evalComments: value as string }
        }
        return updated
      })
    },
    []
  )

  const handleSave = useCallback(async () => {
    if (!candidate) return
    const candidateId = candidate.profileId || candidate.id
    if (!candidateId) {
      setError("ID de candidato no disponible")
      return
    }

    const validEvaluations = evaluations.filter((ev) => {
      const hasMonth = ev.evalMonth !== null && ev.evalMonth !== undefined
      const hasComments = ev.evalComments && ev.evalComments.trim() !== ""
      return hasMonth || hasComments
    })

    if (validEvaluations.length === 0) {
      setError(
        "Debes completar al menos un seguimiento con un período o comentarios."
      )
      return
    }

    const invalidMonth = validEvaluations.find(
      (ev) =>
        ev.evalMonth !== null &&
        ev.evalMonth !== undefined &&
        ![3, 6, 12].includes(ev.evalMonth)
    )
    if (invalidMonth) {
      setError("Debes seleccionar un período de seguimiento válido.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        evaluations: validEvaluations.map((ev) => ({
          evalMonth: ev.evalMonth,
          evalComments: ev.evalComments.trim() || null,
        })),
      }

      const updatedData = await updateCandidateEvaluations(candidateId, payload)

      const updatedCandidate: CandidateProfile = {
        ...candidate,
        ...(typeof updatedData === "object" && updatedData !== null
          ? updatedData
          : {}),
        evaluations: payload.evaluations,
      }

      onUpdated(updatedCandidate)
      onClose()
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "No se pudo guardar el seguimiento."
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [candidate, evaluations, onClose, onUpdated])

  if (!candidate) return null

  const modalTitle = `Seguimiento | ${candidate.name}`
  const canRemove = evaluations.length > 1
  const canAddMore = getAvailableOptions(-1).length > 0

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!saving) onClose()
      }}
      title={modalTitle}
      size="lg"
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleAddEvaluation}
            disabled={saving || !canAddMore}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 font-sans text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Agregar
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center rounded-md border border-border px-4 py-2 font-sans text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2 font-sans text-sm font-medium text-white hover:bg-vo-purple-hover disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {saving ? "Guardando…" : "Guardar seguimiento"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {error ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {evaluations.map((evaluation, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-base font-semibold text-foreground">
                Seguimiento {index + 1}
              </h3>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => handleRemoveEvaluation(index)}
                  disabled={saving}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-50"
                  aria-label={`Eliminar seguimiento ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor={`eval-month-select-${index}`}
                className="font-sans text-sm font-medium text-foreground"
              >
                Período de seguimiento
              </label>
              <select
                id={`eval-month-select-${index}`}
                value={evaluation.evalMonth ?? ""}
                onChange={(e) => {
                  const val = e.target.value
                  handleEvaluationChange(
                    index,
                    "evalMonth",
                    val === "" ? null : Number(val)
                  )
                }}
                disabled={saving}
                className="h-10 rounded-md border border-input bg-background px-3 font-sans text-sm disabled:opacity-60"
              >
                <option value="">Seleccionar período</option>
                {getAvailableOptions(index).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {evaluation.evalMonth && !getAvailableOptions(index).find(opt => opt.value === evaluation.evalMonth) && (
                  <option key={evaluation.evalMonth} value={evaluation.evalMonth}>
                    {FOLLOW_UP_OPTIONS.find(opt => opt.value === evaluation.evalMonth)?.label || `${evaluation.evalMonth} meses`}
                  </option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor={`eval-comments-textarea-${index}`}
                className="font-sans text-sm font-medium text-foreground"
              >
                Comentarios de evaluación
              </label>
              <textarea
                id={`eval-comments-textarea-${index}`}
                value={evaluation.evalComments || ""}
                onChange={(e) =>
                  handleEvaluationChange(index, "evalComments", e.target.value)
                }
                rows={4}
                disabled={saving}
                placeholder="Escribe comentarios sobre el seguimiento del candidato..."
                className="resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm disabled:opacity-60"
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
