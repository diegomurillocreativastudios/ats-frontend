"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import { CandidateQuestionForm } from "@/components/pruebas/candidate/candidate-question-form"
import { ConfirmDialog } from "@/components/pruebas/shared/confirm-dialog"
import { EmptyState } from "@/components/pruebas/shared/empty-state"
import { ErrorState } from "@/components/pruebas/shared/error-state"
import { LoadingSkeleton } from "@/components/pruebas/shared/loading-skeleton"
import { Button } from "@/components/ui/Button"
import {
  answersMapFromSession,
  buildSessionDeadlineIso,
  isAnswerComplete,
  type CandidateDemoPayload,
  type CandidateScreenKind,
} from "@/lib/pruebas/candidate-session"
import { formatDurationMinutes, formatMockDate } from "@/lib/pruebas/formatters"
import {
  createSession,
  getCandidateDemo,
  MockServiceError,
  saveSessionAnswers,
  submitSession,
} from "@/lib/pruebas/mock-service"
import type { MockSession } from "@/lib/pruebas/types"

const TRACKING_HREF = "/portal-pruebas/seguimiento"

type Phase = "gate" | "welcome" | "taking" | "done"

type PruebasCandidateScreenProps = {
  demoToken: string
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function PruebasCandidateScreen({
  demoToken,
}: PruebasCandidateScreenProps) {
  const t = useTranslations("PruebasPortal.candidate")
  const locale = useLocale()

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [screen, setScreen] = useState<CandidateScreenKind>("invalid")
  const [payload, setPayload] = useState<CandidateDemoPayload | null>(null)
  const [phase, setPhase] = useState<Phase>("gate")
  const [session, setSession] = useState<MockSession | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [simulateSaveFailure, setSimulateSaveFailure] = useState(false)
  const [simulateTimeUp, setSimulateTimeUp] = useState(false)
  const [requiredError, setRequiredError] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      const view = await getCandidateDemo(demoToken, Date.now())
      setScreen(view.screen)
      if (view.screen === "invalid") {
        setPayload(null)
        setPhase("gate")
        setSession(null)
        return
      }
      setPayload(view.payload)
      if (view.screen === "resume") {
        setSession(view.payload.session)
        setAnswers(answersMapFromSession(view.payload.session))
        setPhase("taking")
        setQuestionIndex(0)
        setRemainingMs(
          Math.max(0, Date.parse(view.payload.session.deadlineAt) - Date.now()),
        )
      } else if (view.screen === "welcome") {
        setSession(null)
        setAnswers({})
        setPhase("welcome")
        setQuestionIndex(0)
        setRemainingMs(null)
      } else if (view.screen === "already_submitted") {
        setPhase("done")
        setSession(view.payload.session)
      } else {
        setPhase("gate")
        setSession(view.payload.session)
      }
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [demoToken])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (phase !== "taking" || !session || simulateTimeUp) return
    const tick = () => {
      const left = Date.parse(session.deadlineAt) - Date.now()
      if (left <= 0) {
        setRemainingMs(0)
        setScreen("time_up")
        setPhase("gate")
        return
      }
      setRemainingMs(left)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [phase, session, simulateTimeUp])

  useEffect(() => {
    if (simulateTimeUp && phase === "taking") {
      setScreen("time_up")
      setPhase("gate")
      setRemainingMs(0)
    }
  }, [simulateTimeUp, phase])

  const questions = payload?.questions ?? []
  const currentQuestion = questions[questionIndex]
  const isLastQuestion = questionIndex >= questions.length - 1

  const progressLabel = useMemo(() => {
    if (questions.length === 0) return ""
    return t("taking.progress", {
      current: questionIndex + 1,
      total: questions.length,
    })
  }, [questionIndex, questions.length, t])

  const persistAnswers = async (activeSession: MockSession) => {
    if (simulateSaveFailure) {
      setSaveError(t("taking.saveFailed"))
      return false
    }
    const nextAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }))
    try {
      const saved = await saveSessionAnswers(activeSession.id, nextAnswers)
      setSession(saved)
      setSaveError(null)
      return true
    } catch (error) {
      if (error instanceof MockServiceError && error.code === "application_closed") {
        setScreen("application_closed")
        setPhase("gate")
        return false
      }
      setSaveError(t("taking.saveFailed"))
      return false
    }
  }

  const handleStart = async () => {
    if (!payload) return
    if (session && session.status === "in_progress") {
      setPhase("taking")
      setRemainingMs(Math.max(0, Date.parse(session.deadlineAt) - Date.now()))
      return
    }
    setIsBusy(true)
    try {
      const startedAtMs = Date.now()
      const startedAt = new Date(startedAtMs).toISOString()
      const deadlineAt = buildSessionDeadlineIso(
        startedAtMs,
        payload.version.durationMinutes,
      )
      const created = await createSession({
        assignmentId: payload.assignment.id,
        startedAt,
        deadlineAt,
      })
      setSession(created)
      setAnswers({})
      setQuestionIndex(0)
      setPhase("taking")
      setScreen("welcome")
      setRemainingMs(Date.parse(deadlineAt) - Date.now())
    } catch (error) {
      if (error instanceof MockServiceError) {
        if (error.code === "application_closed") {
          setScreen("application_closed")
          setPhase("gate")
        } else if (error.code === "expired") {
          setScreen("expired")
          setPhase("gate")
        } else if (error.code === "attempts_exhausted") {
          setScreen("attempts_exhausted")
          setPhase("gate")
        } else {
          setHasError(true)
        }
      } else {
        setHasError(true)
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleNext = async () => {
    if (!currentQuestion || !session) return
    if (!isAnswerComplete(currentQuestion, answers[currentQuestion.id])) {
      setRequiredError(true)
      return
    }
    setRequiredError(false)
    setIsBusy(true)
    const ok = await persistAnswers(session)
    setIsBusy(false)
    if (!ok) return
    if (isLastQuestion) {
      setIsConfirmOpen(true)
      return
    }
    setQuestionIndex((index) => index + 1)
  }

  const handlePrev = () => {
    setRequiredError(false)
    setQuestionIndex((index) => Math.max(0, index - 1))
  }

  const handleBackToWelcome = () => {
    setPhase("welcome")
    setRequiredError(false)
    setSaveError(null)
  }

  const handleConfirmSubmit = async () => {
    if (!session || simulateTimeUp) {
      setIsConfirmOpen(false)
      setScreen("time_up")
      setPhase("gate")
      return
    }
    setIsBusy(true)
    const ok = await persistAnswers(session)
    if (!ok) {
      setIsBusy(false)
      setIsConfirmOpen(false)
      return
    }
    try {
      await submitSession(session.id)
      setIsConfirmOpen(false)
      setPhase("done")
      setScreen("already_submitted")
    } catch (error) {
      if (
        error instanceof MockServiceError &&
        error.code === "application_closed"
      ) {
        setScreen("application_closed")
        setPhase("gate")
      } else {
        setSaveError(t("taking.submitFailed"))
      }
      setIsConfirmOpen(false)
    } finally {
      setIsBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
        <LoadingSkeleton rows={4} />
        <p className="sr-only">{t("states.loading")}</p>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
        <ErrorState
          title={t("states.errorTitle")}
          description={t("states.errorDescription")}
          action={
            <Button variant="outline" onClick={() => void load()} className="min-h-11">
              {t("states.retry")}
            </Button>
          }
        />
      </div>
    )
  }

  if (phase === "gate" && screen !== "welcome") {
    return (
      <CandidateBlockedView
        screen={screen}
        onRetry={() => void load()}
      />
    )
  }

  if (phase === "done") {
    return (
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8"
        data-testid="candidate-done"
      >
        <EmptyState
          title={t("done.title")}
          description={t("done.description")}
        />
        <Link
          href={TRACKING_HREF}
          className="inline-flex h-11 items-center justify-center rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          data-testid="candidate-exit"
        >
          {t("actions.exit")}
        </Link>
      </div>
    )
  }

  if (!payload) {
    return (
      <CandidateBlockedView screen="invalid" onRetry={() => void load()} />
    )
  }

  if (phase === "welcome") {
    return (
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8"
        data-testid="candidate-welcome"
      >
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {payload.test.title}
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            {t("welcome.vacancy", { title: payload.vacancy.title })}
          </p>
        </header>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("welcome.duration")}
            </dt>
            <dd className="font-sans text-sm text-foreground">
              {t("welcome.durationValue", {
                minutes: formatDurationMinutes(payload.version.durationMinutes),
              })}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("welcome.expires")}
            </dt>
            <dd className="font-sans text-sm text-foreground">
              {formatMockDate(payload.assignment.expiresAt, locale)}
            </dd>
          </div>
        </dl>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-display text-base font-semibold text-foreground">
            {t("welcome.instructions")}
          </h2>
          <p className="font-sans text-sm text-foreground whitespace-pre-wrap">
            {payload.version.instructions}
          </p>
        </section>
        <p
          className="rounded-xl border border-border bg-muted/40 px-4 py-3 font-sans text-sm text-muted-foreground"
          data-testid="candidate-privacy"
        >
          {t("welcome.privacy")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={() => void handleStart()}
            loading={isBusy}
            data-testid="candidate-start"
            className="min-h-11"
          >
            {session ? t("welcome.resume") : t("welcome.start")}
          </Button>
          <Link
            href={TRACKING_HREF}
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-6 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            data-testid="candidate-exit"
          >
            {t("actions.exit")}
          </Link>
        </div>
      </div>
    )
  }

  // taking
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8"
      data-testid="candidate-taking"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            {payload.test.title}
          </h1>
          <p className="font-sans text-sm text-muted-foreground">{progressLabel}</p>
        </div>
        <p
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 font-sans text-sm font-medium text-foreground tabular-nums"
          data-testid="candidate-timer"
          aria-live="polite"
        >
          {t("taking.timer", {
            time: formatRemaining(remainingMs ?? 0),
          })}
        </p>
      </div>

      {currentQuestion ? (
        <CandidateQuestionForm
          question={currentQuestion}
          value={answers[currentQuestion.id]}
          onChange={(value) => {
            setRequiredError(false)
            setAnswers((prev) => ({
              ...prev,
              [currentQuestion.id]: value,
            }))
          }}
          disabled={isBusy}
        />
      ) : null}

      {requiredError ? (
        <p
          className="font-sans text-sm text-destructive"
          data-testid="candidate-required-error"
          role="alert"
        >
          {t("taking.required")}
        </p>
      ) : null}

      {saveError ? (
        <p
          className="font-sans text-sm text-destructive"
          data-testid="candidate-save-error"
          role="alert"
        >
          {saveError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-3">
        <label className="flex min-h-11 items-center gap-3 font-sans text-sm text-foreground">
          <input
            type="checkbox"
            data-testid="candidate-simulate-save-failure"
            checked={simulateSaveFailure}
            onChange={(event) => setSimulateSaveFailure(event.target.checked)}
            className="size-4 rounded border-border text-vo-purple focus:ring-vo-purple"
          />
          {t("demo.simulateSaveFailure")}
        </label>
        <label className="flex min-h-11 items-center gap-3 font-sans text-sm text-foreground">
          <input
            type="checkbox"
            data-testid="candidate-simulate-time-up"
            checked={simulateTimeUp}
            onChange={(event) => setSimulateTimeUp(event.target.checked)}
            className="size-4 rounded border-border text-vo-purple focus:ring-vo-purple"
          />
          {t("demo.simulateTimeUp")}
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={questionIndex === 0 || isBusy}
          data-testid="candidate-prev"
          className="min-h-11"
        >
          {t("taking.prev")}
        </Button>
        <Button
          onClick={() => void handleNext()}
          loading={isBusy}
          data-testid={isLastQuestion ? "candidate-submit" : "candidate-next"}
          className="min-h-11"
        >
          {isLastQuestion ? t("taking.submit") : t("taking.next")}
        </Button>
        <Button
          variant="ghost"
          onClick={handleBackToWelcome}
          disabled={isBusy}
          data-testid="candidate-back"
          className="min-h-11"
        >
          {t("actions.back")}
        </Button>
        <Link
          href={TRACKING_HREF}
          className="inline-flex h-11 items-center justify-center rounded-md px-4 font-sans text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          data-testid="candidate-exit"
        >
          {t("actions.exit")}
        </Link>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={t("confirm.title")}
        description={t("confirm.description")}
        confirmLabel={t("confirm.submit")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={() => void handleConfirmSubmit()}
        isConfirmLoading={isBusy}
      />
    </div>
  )
}

function CandidateBlockedView({
  screen,
  onRetry,
}: {
  screen: CandidateScreenKind
  onRetry: () => void
}) {
  const t = useTranslations("PruebasPortal.candidate")

  const key =
    screen === "invalid"
      ? "invalid"
      : screen === "application_closed"
        ? "applicationClosed"
        : screen === "cancelled"
          ? "cancelled"
          : screen === "expired"
            ? "expired"
            : screen === "time_up"
              ? "timeUp"
              : screen === "attempts_exhausted"
                ? "attemptsExhausted"
                : "invalid"

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8"
      data-testid={`candidate-blocked-${screen}`}
    >
      <EmptyState
        title={t(`blocked.${key}.title`)}
        description={t(`blocked.${key}.description`)}
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        {screen === "invalid" ? (
          <Button variant="outline" onClick={onRetry} className="min-h-11">
            {t("states.retry")}
          </Button>
        ) : null}
        <Link
          href={TRACKING_HREF}
          className="inline-flex h-11 items-center justify-center rounded-md bg-vo-purple px-6 font-sans text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
          data-testid="candidate-exit"
        >
          {t("actions.exit")}
        </Link>
      </div>
    </div>
  )
}
