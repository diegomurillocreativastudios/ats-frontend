"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"

import { QuestionCandidatePreview } from "@/components/pruebas/questions/question-candidate-preview"
import { ConfirmDialog } from "@/components/pruebas/shared/confirm-dialog"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { Button } from "@/components/ui/Button"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import {
  addOption,
  blankQuestion,
  isQuestionValid,
  moveOption,
  normalizeQuestionForSave,
  PROMPT_MAX,
  QUESTION_KINDS,
  questionsEqual,
  removeOption,
  switchQuestionKind,
  validateQuestion,
  type QuestionFieldErrorKey,
  type QuestionFieldErrors,
} from "@/lib/pruebas/question-editor"
import {
  createQuestion,
  getQuestion,
  isQuestionUsedByPublishedVersion,
  listVersions,
  MockServiceError,
  updateQuestion,
} from "@/lib/pruebas/mock-service"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type { MockQuestion, QuestionKind } from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const TEXTAREA_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

type PruebasQuestionEditorProps = {
  mode: "create" | "edit"
  questionId?: string
}

export function PruebasQuestionEditor({
  mode,
  questionId,
}: PruebasQuestionEditorProps) {
  const t = useTranslations("PruebasPortal.questionsBank")
  const router = useRouter()

  const [form, setForm] = useState<MockQuestion>(() =>
    blankQuestion("single_choice"),
  )
  const [baseline, setBaseline] = useState<MockQuestion | null>(null)
  const [isLoading, setIsLoading] = useState(mode === "edit")
  const [loadError, setLoadError] = useState<"not_found" | "load" | null>(null)
  const [usedInPublished, setUsedInPublished] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<QuestionFieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const isDirty = useMemo(() => {
    if (!baseline) return mode === "create" && form.prompt.trim().length > 0
    return !questionsEqual(form, baseline)
  }, [baseline, form, mode])

  const load = useCallback(async () => {
    if (mode !== "edit" || !questionId) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [question, versions] = await Promise.all([
        getQuestion(questionId),
        listVersions(),
      ])
      setForm(question)
      setBaseline(question)
      setUsedInPublished(isQuestionUsedByPublishedVersion(questionId, versions))
    } catch (error) {
      if (error instanceof MockServiceError && error.code === "not_found") {
        setLoadError("not_found")
      } else {
        setLoadError("load")
      }
    } finally {
      setIsLoading(false)
    }
  }, [mode, questionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (mode === "create") {
      const blank = blankQuestion("single_choice")
      setForm(blank)
      setBaseline(blank)
      setUsedInPublished(false)
    }
  }, [mode])

  const setKind = (kind: QuestionKind) => {
    setForm((current) => switchQuestionKind(current, kind))
    setFieldErrors({})
  }

  const errorMessage = (key: QuestionFieldErrorKey): string =>
    t(`validation.${key}`)

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
      return
    }
    router.push(`${PRUEBAS_HOME_HREF}/preguntas`)
  }

  const handleSave = async () => {
    const errors = validateQuestion(form)
    setFieldErrors(errors)
    if (!isQuestionValid(form)) return
    setIsSaving(true)
    try {
      const payload = normalizeQuestionForSave(form)
      if (mode === "create") {
        await createQuestion(payload)
      } else if (questionId) {
        await updateQuestion(questionId, payload)
      }
      router.push(`${PRUEBAS_HOME_HREF}/preguntas?saved=1`)
    } catch {
      setFieldErrors((current) => ({ ...current }))
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-question-editor"
          title={mode === "create" ? t("createTitle") : t("editTitle")}
          description={t("editorDescription")}
        />
        <p className="sr-only" role="status">
          {t("states.loading")}
        </p>
        <LoadingSkeleton rows={4} />
      </div>
    )
  }

  if (loadError === "not_found") {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <EmptyState
          title={t("states.notFoundTitle")}
          description={t("states.notFoundDescription")}
          action={
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => router.push(`${PRUEBAS_HOME_HREF}/preguntas`)}
            >
              {t("actions.backToList")}
            </Button>
          }
        />
      </div>
    )
  }

  if (loadError === "load") {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <ErrorState
          title={t("states.errorTitle")}
          description={t("states.errorDescription")}
          action={
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => void load()}
            >
              {t("states.retry")}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id="pruebas-question-editor"
        title={mode === "create" ? t("createTitle") : t("editTitle")}
        description={t("editorDescription")}
      />

      {usedInPublished ? (
        <div
          role="status"
          className="rounded-xl border border-amber-700/30 bg-amber-50 px-4 py-3 font-sans text-sm text-foreground"
        >
          {t("publishedWarning")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-6"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="question-kind"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("fields.kind")}
            </label>
            <select
              id="question-kind"
              className={CONTROL_CLASS}
              value={form.kind}
              onChange={(event) => setKind(event.target.value as QuestionKind)}
            >
              {QUESTION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`kind.${kind}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="question-prompt"
              className="font-sans text-sm font-medium text-foreground"
            >
              {t("fields.prompt")}
            </label>
            <textarea
              id="question-prompt"
              className={TEXTAREA_CLASS}
              rows={3}
              maxLength={PROMPT_MAX + 50}
              value={form.prompt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
              aria-invalid={Boolean(
                fieldErrors.promptRequired || fieldErrors.promptTooLong,
              )}
              aria-describedby={
                fieldErrors.promptRequired || fieldErrors.promptTooLong
                  ? "question-prompt-error"
                  : undefined
              }
            />
            {fieldErrors.promptRequired ? (
              <p id="question-prompt-error" className="font-sans text-sm text-destructive" role="alert">
                {errorMessage("promptRequired")}
              </p>
            ) : null}
            {fieldErrors.promptTooLong ? (
              <p id="question-prompt-error" className="font-sans text-sm text-destructive" role="alert">
                {errorMessage("promptTooLong")}
              </p>
            ) : null}
          </div>

          {form.kind === "single_choice" || form.kind === "multiple_choice" ? (
            <OptionsEditor
              form={form}
              fieldErrors={fieldErrors}
              onChange={setForm}
              t={t}
            />
          ) : null}

          {form.kind === "true_false" ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="font-sans text-sm font-medium text-foreground">
                  {t("fields.correctAnswer")}
                </legend>
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex min-h-11 items-center gap-2 font-sans text-sm">
                    <input
                      type="radio"
                      name="tf-correct"
                      checked={form.correct === true}
                      onChange={() =>
                        setForm((current) =>
                          current.kind === "true_false"
                            ? { ...current, correct: true }
                            : current,
                        )
                      }
                    />
                    {t("fields.true")}
                  </label>
                  <label className="inline-flex min-h-11 items-center gap-2 font-sans text-sm">
                    <input
                      type="radio"
                      name="tf-correct"
                      checked={form.correct === false}
                      onChange={() =>
                        setForm((current) =>
                          current.kind === "true_false"
                            ? { ...current, correct: false }
                            : current,
                        )
                      }
                    />
                    {t("fields.false")}
                  </label>
                </div>
              </fieldset>
              <PointsField
                id="tf-points"
                value={form.points}
                hasError={Boolean(fieldErrors.pointsRange)}
                label={t("fields.points")}
                error={errorMessage("pointsRange")}
                onChange={(points) =>
                  setForm((current) =>
                    current.kind === "true_false"
                      ? { ...current, points }
                      : current,
                  )
                }
              />
            </>
          ) : null}

          {form.kind === "likert" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="likert-dimension"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("fields.dimension")}
                </label>
                <input
                  id="likert-dimension"
                  className={CONTROL_CLASS}
                  value={form.dimension}
                  onChange={(event) =>
                    setForm((current) =>
                      current.kind === "likert"
                        ? { ...current, dimension: event.target.value }
                        : current,
                    )
                  }
                  aria-invalid={Boolean(fieldErrors.dimensionRequired)}
                />
                {fieldErrors.dimensionRequired ? (
                  <p className="font-sans text-sm text-destructive" role="alert">
                    {errorMessage("dimensionRequired")}
                  </p>
                ) : null}
              </div>
              <label className="inline-flex min-h-11 items-center gap-2 font-sans text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.reversed}
                  onChange={(event) =>
                    setForm((current) =>
                      current.kind === "likert"
                        ? { ...current, reversed: event.target.checked }
                        : current,
                    )
                  }
                />
                {t("fields.reversed")}
              </label>
              <p className="font-sans text-sm text-muted-foreground">
                {t("hints.likertScale")}
              </p>
            </>
          ) : null}

          {form.kind === "numeric" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="numeric-expected"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("fields.expected")}
                </label>
                <input
                  id="numeric-expected"
                  type="number"
                  className={CONTROL_CLASS}
                  value={form.expected}
                  onChange={(event) =>
                    setForm((current) =>
                      current.kind === "numeric"
                        ? {
                            ...current,
                            expected: Number(event.target.value),
                          }
                        : current,
                    )
                  }
                  aria-invalid={Boolean(fieldErrors.expectedRequired)}
                />
                {fieldErrors.expectedRequired ? (
                  <p className="font-sans text-sm text-destructive" role="alert">
                    {errorMessage("expectedRequired")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="numeric-tolerance"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("fields.tolerance")}
                </label>
                <input
                  id="numeric-tolerance"
                  type="number"
                  min={0}
                  className={CONTROL_CLASS}
                  value={form.tolerance}
                  onChange={(event) =>
                    setForm((current) =>
                      current.kind === "numeric"
                        ? {
                            ...current,
                            tolerance: Number(event.target.value),
                          }
                        : current,
                    )
                  }
                  aria-invalid={Boolean(fieldErrors.toleranceRange)}
                />
                {fieldErrors.toleranceRange ? (
                  <p className="font-sans text-sm text-destructive" role="alert">
                    {errorMessage("toleranceRange")}
                  </p>
                ) : null}
                <p className="font-sans text-sm text-muted-foreground">
                  {t("hints.numericDemo")}
                </p>
              </div>
              <PointsField
                id="numeric-points"
                value={form.points}
                hasError={Boolean(fieldErrors.pointsRange)}
                label={t("fields.points")}
                error={errorMessage("pointsRange")}
                onChange={(points) =>
                  setForm((current) =>
                    current.kind === "numeric"
                      ? { ...current, points }
                      : current,
                  )
                }
              />
            </>
          ) : null}

          {form.kind === "open" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="open-rubric"
                  className="font-sans text-sm font-medium text-foreground"
                >
                  {t("fields.rubric")}
                </label>
                <textarea
                  id="open-rubric"
                  className={TEXTAREA_CLASS}
                  rows={3}
                  value={form.rubric}
                  onChange={(event) =>
                    setForm((current) =>
                      current.kind === "open"
                        ? { ...current, rubric: event.target.value }
                        : current,
                    )
                  }
                  aria-invalid={Boolean(fieldErrors.rubricRequired)}
                />
                {fieldErrors.rubricRequired ? (
                  <p className="font-sans text-sm text-destructive" role="alert">
                    {errorMessage("rubricRequired")}
                  </p>
                ) : null}
                <p className="font-sans text-sm text-muted-foreground">
                  {t("hints.openReview")}
                </p>
              </div>
              <PointsField
                id="open-max-points"
                value={form.maxPoints}
                hasError={Boolean(fieldErrors.pointsRange)}
                label={t("fields.maxPoints")}
                error={errorMessage("pointsRange")}
                onChange={(maxPoints) =>
                  setForm((current) =>
                    current.kind === "open"
                      ? { ...current, maxPoints }
                      : current,
                  )
                }
              />
            </>
          ) : null}

          {(form.kind === "single_choice" ||
            form.kind === "multiple_choice") && (
            <>
              {form.kind === "multiple_choice" ? (
                <p className="font-sans text-sm text-muted-foreground">
                  {t("hints.multipleChoiceScoring")}
                </p>
              ) : null}
              <PointsField
                id="choice-points"
                value={form.points}
                hasError={Boolean(fieldErrors.pointsRange)}
                label={t("fields.points")}
                error={errorMessage("pointsRange")}
                onChange={(points) =>
                  setForm((current) =>
                    current.kind === "single_choice" ||
                    current.kind === "multiple_choice"
                      ? { ...current, points }
                      : current,
                  )
                }
              />
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={isSaving}
              onClick={handleCancel}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="min-h-11"
              loading={isSaving}
              disabled={isSaving}
            >
              {t("actions.save")}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("preview.title")}
          </h2>
          <QuestionCandidatePreview question={form} />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title={t("discard.title")}
        description={t("discard.description")}
        confirmLabel={t("discard.confirm")}
        cancelLabel={t("discard.cancel")}
        onConfirm={() => {
          setShowDiscardConfirm(false)
          router.push(`${PRUEBAS_HOME_HREF}/preguntas`)
        }}
        onClose={() => setShowDiscardConfirm(false)}
      />
    </div>
  )
}

function PointsField({
  id,
  value,
  label,
  hasError,
  error,
  onChange,
}: {
  id: string
  value: number
  label: string
  hasError: boolean
  error: string
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-sans text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={1}
        max={100}
        className={CONTROL_CLASS}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-invalid={hasError}
      />
      {hasError ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function OptionsEditor({
  form,
  fieldErrors,
  onChange,
  t,
}: {
  form: Extract<MockQuestion, { kind: "single_choice" | "multiple_choice" }>
  fieldErrors: QuestionFieldErrors
  onChange: (next: MockQuestion) => void
  t: ReturnType<typeof useTranslations>
}) {
  const isMultiple = form.kind === "multiple_choice"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-sans text-sm font-medium text-foreground">
          {t("fields.options")}
        </h3>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() =>
            onChange({
              ...form,
              options: addOption(form.options, form.id),
            })
          }
        >
          <Plus className="size-4" aria-hidden />
          {t("fields.addOption")}
        </Button>
      </div>
      {fieldErrors.optionsMin ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {t("validation.optionsMin")}
        </p>
      ) : null}
      {fieldErrors.optionLabelRequired ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {t("validation.optionLabelRequired")}
        </p>
      ) : null}
      {fieldErrors.correctOptionRequired || fieldErrors.correctOptionsRequired ? (
        <p className="font-sans text-sm text-destructive" role="alert">
          {t(
            fieldErrors.correctOptionsRequired
              ? "validation.correctOptionsRequired"
              : "validation.correctOptionRequired",
          )}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {form.options.map((option, index) => (
          <li
            key={option.id}
            className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
          >
            <label className="inline-flex min-h-11 items-center gap-2 font-sans text-sm">
              <input
                type={isMultiple ? "checkbox" : "radio"}
                name={isMultiple ? undefined : "correct-option"}
                checked={
                  isMultiple
                    ? form.correctOptionIds.includes(option.id)
                    : form.correctOptionId === option.id
                }
                onChange={() => {
                  if (isMultiple) {
                    const next = form.correctOptionIds.includes(option.id)
                      ? form.correctOptionIds.filter((id) => id !== option.id)
                      : [...form.correctOptionIds, option.id]
                    onChange({ ...form, correctOptionIds: next })
                  } else {
                    onChange({ ...form, correctOptionId: option.id })
                  }
                }}
                aria-label={t("fields.markCorrect", { index: index + 1 })}
              />
              <span className="sr-only sm:not-sr-only sm:text-muted-foreground">
                {t("fields.correct")}
              </span>
            </label>
            <input
              className={`${CONTROL_CLASS} flex-1`}
              value={option.label}
              placeholder={t("fields.optionPlaceholder", { index: index + 1 })}
              onChange={(event) => {
                const options = form.options.map((item) =>
                  item.id === option.id
                    ? { ...item, label: event.target.value }
                    : item,
                )
                onChange({ ...form, options })
              }}
              aria-label={t("fields.optionLabel", { index: index + 1 })}
            />
            <div className="flex gap-1">
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-md border border-border hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
                aria-label={t("fields.moveUp", { index: index + 1 })}
                disabled={index === 0}
                onClick={() =>
                  onChange({
                    ...form,
                    options: moveOption(form.options, index, -1),
                  })
                }
              >
                <ChevronUp className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-md border border-border hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
                aria-label={t("fields.moveDown", { index: index + 1 })}
                disabled={index === form.options.length - 1}
                onClick={() =>
                  onChange({
                    ...form,
                    options: moveOption(form.options, index, 1),
                  })
                }
              >
                <ChevronDown className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-md border border-border hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple disabled:opacity-50"
                aria-label={t("fields.removeOption", { index: index + 1 })}
                disabled={form.options.length <= 2}
                onClick={() => {
                  const options = removeOption(form.options, option.id)
                  if (isMultiple) {
                    onChange({
                      ...form,
                      options,
                      correctOptionIds: form.correctOptionIds.filter((id) =>
                        options.some((item) => item.id === id),
                      ),
                    })
                  } else {
                    const correctStillExists = options.some(
                      (item) => item.id === form.correctOptionId,
                    )
                    onChange({
                      ...form,
                      options,
                      correctOptionId: correctStillExists
                        ? form.correctOptionId
                        : (options[0]?.id ?? ""),
                    })
                  }
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
