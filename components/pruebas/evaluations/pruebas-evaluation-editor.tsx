"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/pruebas/shared/confirm-dialog"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { Button } from "@/components/ui/Button"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import {
  buildCompatibleQuestionDraft,
  createAssessmentQuestion,
  createAssessmentTest,
  deleteAssessmentQuestion,
  getAssessmentApiErrorCode,
  getAssessmentTestDetail,
  openAssessmentTestDraft,
  publishAssessmentTest,
  reorderAssessmentQuestions,
  resolveAssessmentErrorMessage,
  resolveVersionQuestionOrderIds,
  updateAssessmentTest,
  type AssessmentQuestionView,
  type AssessmentTestView,
  type AssessmentVersionView,
} from "@/lib/api/recruiter-assessments-tests"
import {
  ATTEMPTS_MAX,
  ATTEMPTS_MIN,
  DEMO_EXPIRY_DAYS,
  DESCRIPTION_MAX,
  DURATION_MAX,
  DURATION_MIN,
  EDITOR_STEPS,
  TITLE_MAX,
  emptyEditorForm,
  formsEqual,
  incompatibleQuestionIds,
  isQuestionCompatible,
  isStepValid,
  nextPublishedVersionNumber,
  removeQuestionId,
  reorderQuestionIds,
  totalTechnicalPoints,
  uniqueDimensions,
  validateStep,
  type EditorFieldErrorKey,
  type EditorStepId,
  type EvaluationEditorForm,
  type StepFieldErrors,
} from "@/lib/pruebas/evaluation-editor"
import { resolveCurrentVersion } from "@/lib/pruebas/evaluations"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type { AssessmentKind, MockQuestion } from "@/lib/pruebas/types"

const CONTROL_CLASS =
  "h-11 w-full rounded-md border border-border bg-background px-3 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

type SnackbarState = {
  open: boolean
  variant: "success" | "error"
  message: string
}

interface PruebasEvaluationEditorProps {
  mode: "create" | "edit"
  testId?: string
}

function fieldErrorMessage(
  key: EditorFieldErrorKey,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (key) {
    case "titleTooLong":
      return t("errors.titleTooLong", { max: TITLE_MAX })
    case "descriptionTooLong":
      return t("errors.descriptionTooLong", { max: DESCRIPTION_MAX })
    case "durationInvalid":
      return t("errors.durationInvalid", {
        min: DURATION_MIN,
        max: DURATION_MAX,
      })
    case "attemptsInvalid":
      return t("errors.attemptsInvalid", {
        min: ATTEMPTS_MIN,
        max: ATTEMPTS_MAX,
      })
    default:
      return t(`errors.${key}`)
  }
}

export function PruebasEvaluationEditor({
  mode,
  testId: initialTestId,
}: PruebasEvaluationEditorProps) {
  const t = useTranslations("PruebasPortal.evaluations.editor")
  const tEval = useTranslations("PruebasPortal.evaluations")
  const router = useRouter()

  const [isBooting, setIsBooting] = useState(true)
  const [bootError, setBootError] = useState<"not_found" | "load" | null>(null)
  const [testId, setTestId] = useState<string | null>(
    mode === "edit" ? (initialTestId ?? null) : null,
  )
  const [test, setTest] = useState<AssessmentTestView | null>(null)
  const [versions, setVersions] = useState<AssessmentVersionView[]>([])
  const [questions, setQuestions] = useState<AssessmentQuestionView[]>([])
  const [form, setForm] = useState<EvaluationEditorForm>(emptyEditorForm())
  const [savedSnapshot, setSavedSnapshot] = useState<EvaluationEditorForm>(
    emptyEditorForm(),
  )
  const [step, setStep] = useState<EditorStepId>("info")
  const [fieldErrors, setFieldErrors] = useState<StepFieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [awaitingClone, setAwaitingClone] = useState(false)
  const [isCloning, setIsCloning] = useState(false)
  const [isMutatingQuestion, setIsMutatingQuestion] = useState(false)
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    variant: "success",
    message: "",
  })

  const showToast = useCallback(
    (variant: "success" | "error", message: string) => {
      setSnackbar({ open: true, variant, message })
    },
    [],
  )

  const hydrateFromDetail = useCallback(
    (detail: {
      test: AssessmentTestView
      versions: AssessmentVersionView[]
      currentQuestions: AssessmentQuestionView[]
    }) => {
      const current = resolveCurrentVersion(detail.versions, detail.test.id)
      const questionIds =
        detail.currentQuestions.length > 0
          ? detail.currentQuestions.map((question) => question.id)
          : current
            ? [...current.questionIds]
            : []
      const nextForm: EvaluationEditorForm = {
        title: detail.test.title,
        description: detail.test.description,
        kind: detail.test.kind,
        instructions: current?.instructions ?? "",
        durationMinutes: current?.durationMinutes ?? 45,
        maxAttempts: current?.maxAttempts ?? 1,
        questionIds,
      }
      setTest(detail.test)
      setTestId(detail.test.id)
      setVersions(detail.versions)
      setQuestions(detail.currentQuestions)
      setForm(nextForm)
      setSavedSnapshot(nextForm)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    async function bootCreate() {
      setIsBooting(true)
      setBootError(null)
      setQuestions([])
      setIsBooting(false)
    }

    async function bootEdit() {
      if (!initialTestId) {
        setBootError("not_found")
        setIsBooting(false)
        return
      }
      setIsBooting(true)
      setBootError(null)
      try {
        const detail = await getAssessmentTestDetail(initialTestId)
        if (cancelled) return
        if (detail.test.lifecycleStatus === "archived") {
          setBootError("not_found")
          setIsBooting(false)
          return
        }
        if (
          detail.test.lifecycleStatus === "published" &&
          !detail.openDraft
        ) {
          setTest(detail.test)
          setVersions(detail.versions)
          setQuestions(detail.currentQuestions)
          setAwaitingClone(true)
          setIsBooting(false)
          return
        }
        hydrateFromDetail(detail)
        setIsBooting(false)
      } catch (error) {
        if (cancelled) return
        const code = getAssessmentApiErrorCode(error)
        setBootError(code === "not_found" ? "not_found" : "load")
        setIsBooting(false)
      }
    }

    if (mode === "create") {
      void bootCreate()
    } else {
      void bootEdit()
    }

    return () => {
      cancelled = true
    }
  }, [hydrateFromDetail, initialTestId, mode])

  const stepIndex = EDITOR_STEPS.indexOf(step)
  const nextVersion = useMemo(
    () => (testId ? nextPublishedVersionNumber(versions, testId) : 1),
    [testId, versions],
  )

  const attachedQuestions = useMemo(() => {
    const byId = new Map(questions.map((question) => [question.id, question]))
    return form.questionIds
      .map((id) => byId.get(id))
      .filter((question): question is MockQuestion => Boolean(question))
  }, [form.questionIds, questions])

  const badQuestionIds = useMemo(
    () => incompatibleQuestionIds(form.kind, form.questionIds, questions),
    [form.kind, form.questionIds, questions],
  )

  const isDirty = !formsEqual(form, savedSnapshot)

  const patchForm = useCallback((patch: Partial<EvaluationEditorForm>) => {
    setForm((current) => ({ ...current, ...patch }))
    setFieldErrors({})
  }, [])

  const handleCloneConfirm = useCallback(async () => {
    if (!initialTestId) return
    setIsCloning(true)
    try {
      const detail = await openAssessmentTestDraft(initialTestId)
      hydrateFromDetail(detail)
      setAwaitingClone(false)
      showToast("success", t("toasts.cloned"))
    } catch (error) {
      showToast("error", resolveAssessmentErrorMessage(error, tEval))
    } finally {
      setIsCloning(false)
    }
  }, [hydrateFromDetail, initialTestId, showToast, t, tEval])

  const persistDraft = useCallback(async (): Promise<string | null> => {
    setIsSaving(true)
    try {
      let id = testId
      if (!id) {
        const created = await createAssessmentTest({
          title: form.title.trim(),
          description: form.description.trim(),
          kind: form.kind,
        })
        id = created.id
        setTest(created)
        setTestId(created.id)
        router.replace(`${PRUEBAS_HOME_HREF}/evaluaciones/${created.id}/editar`)
      }

      const updated = await updateAssessmentTest(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        kind: form.kind,
        instructions: form.instructions.trim(),
        durationMinutes: form.durationMinutes,
        maxAttempts: form.maxAttempts,
      })
      const detail = await getAssessmentTestDetail(id)
      setTest(updated)
      setVersions(detail.versions)
      setQuestions(detail.currentQuestions)
      const snapshot: EvaluationEditorForm = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        instructions: form.instructions.trim(),
        questionIds:
          detail.currentQuestions.length > 0
            ? detail.currentQuestions.map((question) => question.id)
            : form.questionIds,
      }
      setForm(snapshot)
      setSavedSnapshot(snapshot)
      showToast("success", t("toasts.saved"))
      return id
    } catch (error) {
      showToast("error", resolveAssessmentErrorMessage(error, tEval))
      return null
    } finally {
      setIsSaving(false)
    }
  }, [form, router, showToast, t, tEval, testId])

  const handleSaveDraft = useCallback(async () => {
    const errors = validateStep(step, form, questions)
    if (
      Object.keys(errors).length > 0 &&
      (step === "info" || step === "config" || step === "questions")
    ) {
      setFieldErrors(errors)
      return
    }
    const infoErrors = validateStep("info", form, questions)
    if (Object.keys(infoErrors).length > 0) {
      setStep("info")
      setFieldErrors(infoErrors)
      return
    }
    await persistDraft()
  }, [form, persistDraft, questions, step])

  const handleNext = useCallback(() => {
    const errors = validateStep(step, form, questions)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    const next = EDITOR_STEPS[stepIndex + 1]
    if (next) setStep(next)
  }, [form, questions, step, stepIndex])

  const handleBack = useCallback(() => {
    const prev = EDITOR_STEPS[stepIndex - 1]
    if (prev) {
      setFieldErrors({})
      setStep(prev)
    }
  }, [stepIndex])

  const handlePublish = useCallback(async () => {
    const errors = validateStep("publish", form, questions)
    if (Object.keys(errors).length > 0) {
      if (!isStepValid("info", form, questions)) setStep("info")
      else if (!isStepValid("config", form, questions)) setStep("config")
      else if (!isStepValid("questions", form, questions)) setStep("questions")
      setFieldErrors(errors)
      setShowPublishConfirm(false)
      return
    }

    setIsPublishing(true)
    try {
      let id = testId
      if (isDirty || !id) {
        id = await persistDraft()
        if (!id) {
          setIsPublishing(false)
          setShowPublishConfirm(false)
          return
        }
      }
      await publishAssessmentTest(id)
      showToast("success", t("toasts.published"))
      setShowPublishConfirm(false)
      router.push(`${PRUEBAS_HOME_HREF}/evaluaciones/${id}`)
    } catch (error) {
      showToast("error", resolveAssessmentErrorMessage(error, tEval))
      setShowPublishConfirm(false)
    } finally {
      setIsPublishing(false)
    }
  }, [form, isDirty, persistDraft, questions, router, showToast, t, tEval, testId])

  const ensureTestId = useCallback(async (): Promise<string | null> => {
    if (testId) return testId
    const infoErrors = validateStep("info", form, questions)
    if (Object.keys(infoErrors).length > 0) {
      setStep("info")
      setFieldErrors(infoErrors)
      showToast("error", t("errors.saveFailed"))
      return null
    }
    return persistDraft()
  }, [form, persistDraft, questions, showToast, t, testId])

  const handleAddNewQuestion = useCallback(async () => {
    setIsMutatingQuestion(true)
    try {
      const id = await ensureTestId()
      if (!id) return
      const draft = buildCompatibleQuestionDraft(form.kind)
      const created = await createAssessmentQuestion(id, draft)
      setQuestions((current) => [...current, created])
      patchForm({
        questionIds: [...form.questionIds, created.id],
      })
      setSavedSnapshot((current) => ({
        ...current,
        questionIds: [...current.questionIds, created.id],
      }))
    } catch (error) {
      showToast("error", resolveAssessmentErrorMessage(error, tEval))
    } finally {
      setIsMutatingQuestion(false)
    }
  }, [ensureTestId, form.kind, form.questionIds, patchForm, showToast, tEval])

  const handleRemoveQuestion = useCallback(
    async (questionId: string) => {
      if (!testId) {
        patchForm({
          questionIds: removeQuestionId(form.questionIds, questionId),
        })
        setQuestions((current) =>
          current.filter((question) => question.id !== questionId),
        )
        return
      }
      setIsMutatingQuestion(true)
      try {
        await deleteAssessmentQuestion(testId, questionId)
        const nextIds = removeQuestionId(form.questionIds, questionId)
        setQuestions((current) =>
          current.filter((question) => question.id !== questionId),
        )
        patchForm({ questionIds: nextIds })
        setSavedSnapshot((current) => ({
          ...current,
          questionIds: nextIds,
        }))
      } catch (error) {
        showToast("error", resolveAssessmentErrorMessage(error, tEval))
      } finally {
        setIsMutatingQuestion(false)
      }
    },
    [form.questionIds, patchForm, showToast, tEval, testId],
  )

  const handleMoveQuestion = useCallback(
    async (index: number, direction: "up" | "down") => {
      const nextIds = reorderQuestionIds(form.questionIds, index, direction)
      if (nextIds.every((id, i) => id === form.questionIds[i])) return
      patchForm({ questionIds: nextIds })
      if (!testId) return
      setIsMutatingQuestion(true)
      try {
        await reorderAssessmentQuestions(
          testId,
          resolveVersionQuestionOrderIds(nextIds, questions),
        )
        setSavedSnapshot((current) => ({
          ...current,
          questionIds: nextIds,
        }))
      } catch (error) {
        patchForm({ questionIds: form.questionIds })
        showToast("error", resolveAssessmentErrorMessage(error, tEval))
      } finally {
        setIsMutatingQuestion(false)
      }
    },
    [form.questionIds, patchForm, questions, showToast, tEval, testId],
  )

  if (isBooting) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <LoadingSkeleton rows={4} />
      </div>
    )
  }

  if (bootError === "not_found" || (mode === "edit" && !initialTestId)) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <EmptyState
          title={t("errors.notFoundTitle")}
          description={t("errors.notFoundDescription")}
          action={
            <Link
              href={`${PRUEBAS_HOME_HREF}/evaluaciones`}
              className="inline-flex h-11 items-center rounded-md bg-vo-purple px-4 font-sans text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            >
              {t("errors.backToList")}
            </Link>
          }
        />
      </div>
    )
  }

  if (bootError === "load") {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <ErrorState
          title={tEval("states.errorTitle")}
          description={tEval("states.errorDescription")}
          action={
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => window.location.reload()}
            >
              {tEval("states.retry")}
            </Button>
          }
        />
      </div>
    )
  }

  if (awaitingClone) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <PortalPageHeader
          id="pruebas-evaluation-editor-clone"
          title={test?.title ?? t("editTitle")}
          description={t("clonePublished.description")}
        />
        <ConfirmDialog
          isOpen
          title={t("clonePublished.title")}
          description={t("clonePublished.description")}
          confirmLabel={t("clonePublished.confirm")}
          cancelLabel={t("clonePublished.cancel")}
          isConfirmLoading={isCloning}
          onConfirm={() => {
            void handleCloneConfirm()
          }}
          onClose={() => {
            router.push(
              `${PRUEBAS_HOME_HREF}/evaluaciones/${initialTestId ?? ""}`,
            )
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id="pruebas-evaluation-editor"
        title={mode === "create" && !testId ? t("createTitle") : t("editTitle")}
        description={
          mode === "create" && !testId
            ? t("createDescription")
            : t("editDescription")
        }
      />

      <nav aria-label={t("steps.navLabel")}>
        <ol className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-3">
          {EDITOR_STEPS.map((id, index) => {
            const isCurrent = id === step
            const isPast = index < stepIndex
            return (
              <li key={id} className="flex items-center gap-2">
                <span
                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 font-sans text-sm font-medium ${
                    isCurrent
                      ? "bg-vo-purple text-white"
                      : isPast
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-muted text-muted-foreground"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {index + 1}. {t(`steps.${id}`)}
                </span>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="glass-card flex flex-col gap-6 p-4 md:p-6">
        {step === "info" ? (
          <InfoStep
            form={form}
            errors={fieldErrors}
            t={t}
            onChange={patchForm}
          />
        ) : null}
        {step === "config" ? (
          <ConfigStep
            form={form}
            errors={fieldErrors}
            t={t}
            onChange={patchForm}
          />
        ) : null}
        {step === "questions" ? (
          <QuestionsStep
            form={form}
            errors={fieldErrors}
            attachedQuestions={attachedQuestions}
            badQuestionIds={badQuestionIds}
            disabled={isMutatingQuestion || isSaving}
            t={t}
            tEval={tEval}
            onRemove={(id) => {
              void handleRemoveQuestion(id)
            }}
            onMove={(index, direction) => {
              void handleMoveQuestion(index, direction)
            }}
            onAddNew={() => {
              void handleAddNewQuestion()
            }}
          />
        ) : null}
        {step === "preview" ? (
          <PreviewStep
            form={form}
            attachedQuestions={attachedQuestions}
            t={t}
          />
        ) : null}
        {step === "publish" ? (
          <PublishStep form={form} nextVersion={nextVersion} t={t} />
        ) : null}
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={
                stepIndex === 0 ||
                isSaving ||
                isPublishing ||
                isMutatingQuestion
              }
              onClick={handleBack}
            >
              {t("actions.back")}
            </Button>
            {step !== "publish" ? (
              <Button
                variant="primary"
                className="min-h-11"
                disabled={isSaving || isPublishing || isMutatingQuestion}
                onClick={handleNext}
              >
                {t("actions.next")}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={isSaving || isPublishing || isMutatingQuestion}
              loading={isSaving}
              onClick={() => {
                void handleSaveDraft()
              }}
            >
              {isSaving ? t("actions.saving") : t("actions.saveDraft")}
            </Button>
            {step === "publish" ? (
              <Button
                variant="primary"
                className="min-h-11"
                disabled={isSaving || isPublishing || isMutatingQuestion}
                onClick={() => setShowPublishConfirm(true)}
              >
                {t("actions.publish")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showPublishConfirm}
        title={t("publish.confirmTitle")}
        description={t("publish.confirmDescription", {
          number: nextVersion,
        })}
        confirmLabel={t("publish.confirm")}
        cancelLabel={t("publish.cancel")}
        isConfirmLoading={isPublishing}
        onConfirm={() => {
          void handlePublish()
        }}
        onClose={() => {
          if (!isPublishing) setShowPublishConfirm(false)
        }}
      />

      <Snackbar
        open={snackbar.open}
        variant={snackbar.variant}
        message={snackbar.message}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
      />
    </div>
  )
}

function InfoStep({
  form,
  errors,
  t,
  onChange,
}: {
  form: EvaluationEditorForm
  errors: StepFieldErrors
  t: ReturnType<typeof useTranslations>
  onChange: (patch: Partial<EvaluationEditorForm>) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field
        id="editor-title"
        label={t("fields.title")}
        error={
          errors.titleRequired || errors.titleTooLong
            ? fieldErrorMessage(
                errors.titleRequired ? "titleRequired" : "titleTooLong",
                t,
              )
            : undefined
        }
      >
        <input
          id="editor-title"
          className={CONTROL_CLASS}
          value={form.title}
          maxLength={TITLE_MAX + 20}
          onChange={(event) => onChange({ title: event.target.value })}
          aria-invalid={Boolean(errors.titleRequired || errors.titleTooLong)}
        />
      </Field>
      <Field
        id="editor-description"
        label={t("fields.description")}
        error={
          errors.descriptionRequired || errors.descriptionTooLong
            ? fieldErrorMessage(
                errors.descriptionRequired
                  ? "descriptionRequired"
                  : "descriptionTooLong",
                t,
              )
            : undefined
        }
      >
        <textarea
          id="editor-description"
          className={TEXTAREA_CLASS}
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          aria-invalid={Boolean(
            errors.descriptionRequired || errors.descriptionTooLong,
          )}
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-sans text-sm font-medium text-foreground">
          {t("fields.kind")}
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(
            [
              ["technical", "fields.kindTechnical"],
              ["psychometric", "fields.kindPsychometric"],
            ] as const
          ).map(([value, labelKey]) => (
            <label
              key={value}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 font-sans text-sm"
            >
              <input
                type="radio"
                name="editor-kind"
                value={value}
                checked={form.kind === value}
                onChange={() => onChange({ kind: value as AssessmentKind })}
                className="size-4 text-vo-purple focus-visible:ring-2 focus-visible:ring-vo-purple"
              />
              {t(labelKey)}
            </label>
          ))}
        </div>
        {errors.kindRequired ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {fieldErrorMessage("kindRequired", t)}
          </p>
        ) : null}
      </fieldset>
    </div>
  )
}

function ConfigStep({
  form,
  errors,
  t,
  onChange,
}: {
  form: EvaluationEditorForm
  errors: StepFieldErrors
  t: ReturnType<typeof useTranslations>
  onChange: (patch: Partial<EvaluationEditorForm>) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field
        id="editor-instructions"
        label={t("fields.instructions")}
        error={
          errors.instructionsRequired
            ? fieldErrorMessage("instructionsRequired", t)
            : undefined
        }
      >
        <textarea
          id="editor-instructions"
          className={TEXTAREA_CLASS}
          value={form.instructions}
          onChange={(event) => onChange({ instructions: event.target.value })}
          aria-invalid={Boolean(errors.instructionsRequired)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="editor-duration"
          label={t("fields.duration")}
          error={
            errors.durationInvalid
              ? fieldErrorMessage("durationInvalid", t)
              : undefined
          }
        >
          <input
            id="editor-duration"
            type="number"
            min={DURATION_MIN}
            max={DURATION_MAX}
            className={CONTROL_CLASS}
            value={form.durationMinutes}
            onChange={(event) =>
              onChange({
                durationMinutes: Number.parseInt(event.target.value, 10) || 0,
              })
            }
            aria-invalid={Boolean(errors.durationInvalid)}
          />
        </Field>
        <Field
          id="editor-attempts"
          label={t("fields.maxAttempts")}
          error={
            errors.attemptsInvalid
              ? fieldErrorMessage("attemptsInvalid", t)
              : undefined
          }
        >
          <input
            id="editor-attempts"
            type="number"
            min={ATTEMPTS_MIN}
            max={ATTEMPTS_MAX}
            className={CONTROL_CLASS}
            value={form.maxAttempts}
            onChange={(event) =>
              onChange({
                maxAttempts: Number.parseInt(event.target.value, 10) || 0,
              })
            }
            aria-invalid={Boolean(errors.attemptsInvalid)}
          />
        </Field>
      </div>
      <p className="rounded-md border border-border bg-muted/40 px-3 py-3 font-sans text-sm text-muted-foreground">
        {t("fields.expiryNotice", { days: DEMO_EXPIRY_DAYS })}
      </p>
    </div>
  )
}

function QuestionsStep({
  form,
  errors,
  attachedQuestions,
  badQuestionIds,
  disabled,
  t,
  tEval,
  onRemove,
  onMove,
  onAddNew,
}: {
  form: EvaluationEditorForm
  errors: StepFieldErrors
  attachedQuestions: MockQuestion[]
  badQuestionIds: string[]
  disabled: boolean
  t: ReturnType<typeof useTranslations>
  tEval: ReturnType<typeof useTranslations>
  onRemove: (id: string) => void
  onMove: (index: number, direction: "up" | "down") => void
  onAddNew: () => void
}) {
  const badSet = new Set(badQuestionIds)

  return (
    <div className="flex flex-col gap-6">
      {(errors.questionsRequired || errors.questionsIncompatible) && (
        <p className="font-sans text-sm text-destructive" role="alert">
          {fieldErrorMessage(
            errors.questionsRequired
              ? "questionsRequired"
              : "questionsIncompatible",
            t,
          )}
        </p>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="attached-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="attached-title"
            className="font-display text-base font-semibold text-foreground"
          >
            {t("questions.attachedTitle")}
          </h2>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={disabled}
            onClick={onAddNew}
          >
            <Plus className="size-4" aria-hidden />
            {t("questions.addNew")}
          </Button>
        </div>
        {form.questionIds.length === 0 ? (
          <p className="font-sans text-sm text-muted-foreground">
            {t("questions.emptyAttached")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {form.questionIds.map((id, index) => {
              const question = attachedQuestions.find((item) => item.id === id)
              const incompatible =
                badSet.has(id) ||
                (question
                  ? !isQuestionCompatible(form.kind, question.kind)
                  : true)
              return (
                <li
                  key={id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                  data-testid="editor-attached-question"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm text-foreground">
                      {question?.prompt ?? id}
                    </p>
                    <p className="font-sans text-xs text-muted-foreground">
                      {question
                        ? tEval(`questionKind.${question.kind}`)
                        : id}
                      {incompatible
                        ? ` · ${t("questions.incompatibleBadge")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <IconAction
                      label={t("questions.moveUp")}
                      disabled={disabled || index === 0}
                      onClick={() => onMove(index, "up")}
                    >
                      <ChevronUp className="size-4" />
                    </IconAction>
                    <IconAction
                      label={t("questions.moveDown")}
                      disabled={
                        disabled || index === form.questionIds.length - 1
                      }
                      onClick={() => onMove(index, "down")}
                    >
                      <ChevronDown className="size-4" />
                    </IconAction>
                    <IconAction
                      label={t("questions.remove")}
                      disabled={disabled}
                      onClick={() => onRemove(id)}
                    >
                      <Trash2 className="size-4" />
                    </IconAction>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function PreviewStep({
  form,
  attachedQuestions,
  t,
}: {
  form: EvaluationEditorForm
  attachedQuestions: MockQuestion[]
  t: ReturnType<typeof useTranslations>
}) {
  const points = totalTechnicalPoints(attachedQuestions)
  const dimensions = uniqueDimensions(attachedQuestions)

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4">
        <h2 className="font-display text-base font-semibold text-foreground">
          {t("preview.staffTitle")}
        </h2>
        <ul className="flex flex-col gap-2 font-sans text-sm text-foreground">
          <li>{form.title}</li>
          <li>{t("preview.questionCount", { count: form.questionIds.length })}</li>
          <li>{t("preview.duration", { minutes: form.durationMinutes })}</li>
          <li>{t("preview.attempts", { count: form.maxAttempts })}</li>
          <li>{t("preview.expiry", { days: DEMO_EXPIRY_DAYS })}</li>
          {form.kind === "technical" ? (
            <li>{t("preview.totalPoints", { points })}</li>
          ) : (
            <li>
              {dimensions.length > 0
                ? t("preview.dimensions", { list: dimensions.join(", ") })
                : t("preview.noDimensions")}
            </li>
          )}
        </ul>
      </section>
      <section className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
        <h2 className="font-display text-base font-semibold text-foreground">
          {t("preview.candidateTitle")}
        </h2>
        <p className="font-sans text-sm text-muted-foreground">
          {t("preview.candidateHint")}
        </p>
        <p className="font-sans text-sm text-foreground">{form.instructions}</p>
        <ol className="flex list-decimal flex-col gap-3 pl-5">
          {attachedQuestions.map((question) => (
            <li key={question.id} className="font-sans text-sm text-foreground">
              {question.prompt}
              {question.kind === "single_choice" ||
              question.kind === "multiple_choice" ? (
                <ul className="mt-2 list-none space-y-1 pl-0">
                  {question.options.map((option) => (
                    <li
                      key={option.id}
                      className="rounded-md border border-border px-3 py-2"
                    >
                      {option.label}
                    </li>
                  ))}
                </ul>
              ) : null}
              {question.kind === "true_false" ? (
                <ul className="mt-2 list-none space-y-1 pl-0">
                  <li className="rounded-md border border-border px-3 py-2">
                    V / F
                  </li>
                </ul>
              ) : null}
              {question.kind === "likert" ? (
                <p className="mt-2 text-muted-foreground">
                  {question.scaleMin} – {question.scaleMax}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function PublishStep({
  form,
  nextVersion,
  t,
}: {
  form: EvaluationEditorForm
  nextVersion: number
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-base font-semibold text-foreground">
        {t("publish.summaryTitle")}
      </h2>
      <p className="font-sans text-sm text-foreground">{form.title}</p>
      <p className="rounded-md border border-border bg-muted/40 px-3 py-3 font-sans text-sm text-muted-foreground">
        {t("publish.versionNotice", { number: nextVersion })}
      </p>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-sans text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="font-sans text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}
