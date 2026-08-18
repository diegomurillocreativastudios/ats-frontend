"use client"

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  Download,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  Phone,
  User,
  X,
} from "lucide-react"
import { getInitials } from "@/lib/getInitials"
import {
  downloadRecruiterCandidateCv,
  isRecruiterCandidateCvError,
} from "@/lib/api/recruiter-candidate-cv"
import {
  buildAttributeTableRows,
  type AttributeTableRow,
} from "@/lib/vacancies/build-attribute-table-rows"
import {
  formatScorePercent,
  scoreBarWidth,
} from "@/lib/vacancies/format-score-percent"
import {
  formatScoreKey,
  hasZeroScoreOutsideFullAggregate,
  partitionComponentScores,
  sortScoresByAscendingValue,
  type ScoreEntry,
} from "@/lib/vacancies/partition-component-scores"

export interface CandidateProfileMatch {
  name?: string | null
  email?: string | null
  phone?: string | null
  uploadedAt?: string | Date | null
  totalScore?: number | null
  candidateProfileId?: string | null
  candidateDocumentId?: string | null
  componentScores?: Record<string, unknown> | null
  matchedAttributes?: Record<string, unknown> | null
  matchedAttributePaths?: Record<string, unknown> | null
  qualitativeReasoning?: string | null
  qualitativeReasoningPositive?: string | null
  qualitativeReasoningNegative?: string | null
}

interface CandidateProfileModalProps {
  match: CandidateProfileMatch
  candidateId?: string | null
  uploadedAtLabel: string
  onClose: () => void
}

function emptyToDash(value: unknown): string {
  return value != null && String(value).trim() !== "" ? String(value).trim() : "—"
}

function toTrimmedText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text === "" ? null : text
}

function objectEntries(value: unknown): ScoreEntry[] {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>).filter(
    ([key]) => !key.startsWith("additionalProp")
  )
}

function resolveProfileHref(
  match: CandidateProfileMatch,
  candidateId?: string | null
): string | null {
  const profileId = toTrimmedText(match.candidateProfileId)
  if (profileId) return `/portal-rrhh/candidatos/${encodeURIComponent(profileId)}`

  const documentId = toTrimmedText(match.candidateDocumentId)
  if (documentId) return `/portal-rrhh/candidatos/${encodeURIComponent(documentId)}`

  const fallbackId = toTrimmedText(candidateId)
  if (fallbackId && !fallbackId.startsWith("candidate-")) {
    return `/portal-rrhh/candidatos/${encodeURIComponent(fallbackId)}`
  }

  return null
}

function sortAttributeRows(rows: AttributeTableRow[]): AttributeTableRow[] {
  return [...rows].sort((left, right) => {
    const leftScore = typeof left.score === "number" ? left.score : Number.POSITIVE_INFINITY
    const rightScore = typeof right.score === "number" ? right.score : Number.POSITIVE_INFINITY
    if (leftScore !== rightScore) return leftScore - rightScore
    return left.label.localeCompare(right.label)
  })
}

function ScoreTooltip({ text, accentClass = "text-slate-500" }: { text: string; accentClass?: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${accentClass} transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2`}
        aria-label={text}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-md border border-border bg-background px-3 py-2 text-left font-sans text-xs font-normal leading-relaxed text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}

interface ScoreBarRowProps {
  label: string
  value: unknown
  level?: string | null
  labelClass: string
  barClass: string
  valueClass: string
  barTrackClass?: string
  isTotalRow?: boolean
  hideLabel?: boolean
}

function ScoreBarRow({
  label,
  value,
  level,
  labelClass,
  barClass,
  valueClass,
  barTrackClass = "bg-slate-200/90",
  isTotalRow = false,
  hideLabel = false,
}: ScoreBarRowProps) {
  const percentLabel = formatScorePercent(value) ?? emptyToDash(value)
  const barWidth = scoreBarWidth(value)
  const hasNumericScore = typeof value === "number" && Number.isFinite(value)

  return (
    <li
      className={
        isTotalRow
          ? "flex flex-col gap-2.5 rounded-lg border border-sky-200/80 bg-sky-50/70 px-3 py-3 sm:flex-row sm:items-center sm:gap-3"
          : "flex items-center gap-3"
      }
    >
      {hideLabel ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span
          className={`w-full shrink-0 font-sans text-xs sm:w-44 ${labelClass} ${isTotalRow ? "font-semibold" : ""}`}
        >
          <span className="block">{label}</span>
          {level != null && (
            <span className="mt-0.5 block font-normal text-slate-500">{level}</span>
          )}
        </span>
      )}
      {hasNumericScore ? (
        <div
          className={`h-2.5 min-w-0 flex-1 overflow-hidden rounded-full ${barTrackClass}`}
          role="presentation"
        >
          <div
            className={`h-full rounded-full transition-all ${barClass}`}
            style={{ width: `${barWidth}%` }}
            aria-hidden
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}
      <span
        className={`w-full shrink-0 text-left font-sans text-xs font-semibold tabular-nums sm:w-13 sm:text-right ${valueClass}`}
      >
        {percentLabel}
      </span>
    </li>
  )
}

/**
 * Recruiter screening modal: familiar stacked layout with improved attribute deduplication.
 */
export function CandidateProfileModal({
  match,
  candidateId,
  uploadedAtLabel,
  onClose,
}: CandidateProfileModalProps) {
  const tMatching = useTranslations("RecruiterPortal.vacancies.matching")
  const tModal = useTranslations("RecruiterPortal.vacancies.matching.profileModal")
  const tScoreKeys = useTranslations("RecruiterPortal.vacancies.matching.scoreKeys")
  const tCommon = useTranslations("Common")
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const knownScoreLabels = useMemo(
    () => ({
      QualitativeScore: tScoreKeys("qualitative"),
      qualitativeScore: tScoreKeys("qualitative"),
      qualitative_score: tScoreKeys("qualitative"),
      VectorSimilarity: tScoreKeys("semanticSimilarity"),
      vectorSimilarity: tScoreKeys("semanticSimilarity"),
      vector_similarity: tScoreKeys("semanticSimilarity"),
      SemanticScore: tScoreKeys("semanticScore"),
      semanticScore: tScoreKeys("semanticScore"),
      semantic_score: tScoreKeys("semanticScore"),
      TotalScore: tScoreKeys("total"),
      totalScore: tScoreKeys("total"),
      total_score: tScoreKeys("total"),
      attribute_aggregate: tScoreKeys("attributesCombined"),
      AttributeAggregate: tScoreKeys("attributesCombined"),
      attributeAggregate: tScoreKeys("attributesCombined"),
      KeywordScore: tScoreKeys("keywordMatch"),
      keywordScore: tScoreKeys("keywordMatch"),
      keyword_score: tScoreKeys("keywordMatch"),
      ExperienceScore: tScoreKeys("experience"),
      experienceScore: tScoreKeys("experience"),
      experience_score: tScoreKeys("experience"),
      EducationScore: tScoreKeys("education"),
      educationScore: tScoreKeys("education"),
      education_score: tScoreKeys("education"),
      SkillsScore: tScoreKeys("skills"),
      skillsScore: tScoreKeys("skills"),
      skills_score: tScoreKeys("skills"),
      Recency: tScoreKeys("recency"),
      recency: tScoreKeys("recency"),
      RelevantYears: tScoreKeys("relevantYears"),
      relevantYears: tScoreKeys("relevantYears"),
      relevant_years: tScoreKeys("relevantYears"),
      "Relevant years": tScoreKeys("relevantYears"),
    }),
    [tScoreKeys]
  )

  const getScoreLabel = (key: string) => formatScoreKey(key, knownScoreLabels)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const handleDownloadCV = async () => {
    const profileId = toTrimmedText(match.candidateProfileId)
    if (!profileId) return
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadRecruiterCandidateCv(profileId)
    } catch (err) {
      if (isRecruiterCandidateCvError(err) && err.code === "unavailable") {
        setDownloadError(tMatching("errors.downloadCvUnavailable"))
        return
      }
      const message =
        err != null && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : ""
      setDownloadError(message !== "" ? message : tMatching("errors.downloadCvFailed"))
    } finally {
      setDownloading(false)
    }
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const componentScores = objectEntries(match.componentScores)
  const {
    attributeIndividuals,
    aggregateEntry,
    qualitativeEntry,
    semanticEntry,
  } = partitionComponentScores(componentScores)
  const sortedAttributeIndividuals = sortScoresByAscendingValue(attributeIndividuals)
  const showZeroHint = hasZeroScoreOutsideFullAggregate(attributeIndividuals, aggregateEntry)

  const matchedAttributesEntries = objectEntries(match.matchedAttributes)
  const attributeTableRows = sortAttributeRows(
    buildAttributeTableRows(sortedAttributeIndividuals, matchedAttributesEntries, getScoreLabel)
  )

  const qualitativeReasoningLegacy = toTrimmedText(match.qualitativeReasoning)
  const qualitativeReasoningPositive = toTrimmedText(match.qualitativeReasoningPositive)
  const qualitativeReasoningNegative = toTrimmedText(match.qualitativeReasoningNegative)
  const hasSplitQualitative =
    qualitativeReasoningPositive != null || qualitativeReasoningNegative != null
  const hasQualitativeBlock =
    qualitativeReasoningLegacy != null ||
    qualitativeReasoningPositive != null ||
    qualitativeReasoningNegative != null

  const hasAttributeBlock = attributeTableRows.length > 0 || aggregateEntry != null
  const hasScoreSections =
    hasAttributeBlock || qualitativeEntry != null || semanticEntry != null

  const displayName = emptyToDash(match.name)
  const email = toTrimmedText(match.email)
  const phone = toTrimmedText(match.phone)
  const initials = getInitials(displayName !== "—" ? displayName : "", email ?? "")
  const profileHref = resolveProfileHref(match, candidateId)
  const totalScorePercent = formatScorePercent(match.totalScore, { forceOneDecimal: true })

  const hasContent =
    componentScores.length > 0 || hasQualitativeBlock || matchedAttributesEntries.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tModal("profileAria", { name: displayName })}
      onClick={handleBackdropClick}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-background text-slate-900 shadow-xl">
        <div className="flex items-start justify-between border-b border-border p-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vo-purple font-sans text-base font-semibold text-white"
              aria-hidden
            >
              {initials}
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-sans text-lg font-semibold text-slate-900">{displayName}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-sm text-slate-600">
                {email != null && (
                  <span className="flex min-w-0 max-w-full items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate" title={email}>
                      {email}
                    </span>
                  </span>
                )}
                {phone != null && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {phone}
                  </span>
                )}
              </div>
              <p className="font-sans text-xs text-slate-600">{uploadedAtLabel}</p>
              {totalScorePercent != null && (
                <p className="font-sans text-xs font-semibold text-vo-purple">
                  {tModal("totalMatchScore")} {totalScorePercent}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label={tCommon("closeModal")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <User className="h-10 w-10 text-slate-400" aria-hidden />
              <p className="font-sans text-sm text-slate-600">{tModal("noAdditionalInfo")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-vo-purple/35 bg-vo-purple/10 p-4 shadow-sm">
                <h3 className="font-sans text-sm font-semibold text-vo-purple">
                  {tModal("aiProcessed")}
                </h3>
                <p className="mt-2 font-sans text-sm text-slate-700">{tModal("aiIntro")}</p>
                <p className="mt-1 font-sans text-sm text-slate-700">
                  {tModal.rich("aiTiming", {
                    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
                  })}
                </p>
                <p className="mt-1 font-sans text-xs text-slate-600">{tModal("aiValidationHint")}</p>
              </div>

              {hasScoreSections && (
                <div className="flex flex-col gap-5">
                  {hasAttributeBlock && (
                    <div className="rounded-xl border border-border bg-background p-4 shadow-sm ring-1 ring-sky-200/60">
                      <h3 className="mb-3.5 font-sans text-sm font-semibold text-sky-900">
                        {tModal("attributes")}
                      </h3>
                      {showZeroHint && (
                        <p className="mb-3 font-sans text-xs leading-relaxed text-slate-600">
                          {tModal("attributesZeroHint")}
                        </p>
                      )}
                      <ul className="flex flex-col gap-3" role="list">
                        {attributeTableRows.map((row) => (
                          <ScoreBarRow
                            key={row.key}
                            label={row.label}
                            value={row.score}
                            level={row.level}
                            labelClass="text-slate-800"
                            barClass={
                              typeof row.score === "number" && row.score <= 0
                                ? "bg-amber-500"
                                : "bg-sky-500"
                            }
                            valueClass="text-slate-900"
                            barTrackClass="bg-slate-200/95"
                          />
                        ))}
                        {aggregateEntry != null && (
                          <ScoreBarRow
                            label={getScoreLabel(aggregateEntry[0])}
                            value={aggregateEntry[1]}
                            labelClass="text-slate-800"
                            barClass="bg-sky-600"
                            valueClass="text-slate-900"
                            barTrackClass="bg-slate-200/95"
                            isTotalRow
                          />
                        )}
                      </ul>
                    </div>
                  )}

                  {qualitativeEntry != null && (
                    <div className="rounded-xl border border-border bg-background p-4 shadow-sm ring-1 ring-amber-200/70">
                      <div className="mb-3.5 flex items-center gap-1.5">
                        <h3 className="font-sans text-sm font-semibold text-amber-950">
                          {tModal("qualitativeScore")}
                        </h3>
                        <ScoreTooltip
                          text={tMatching("scoreTooltips.qualitativeScore")}
                          accentClass="text-amber-800"
                        />
                      </div>
                      <ul className="flex flex-col gap-2.5" role="list">
                        <ScoreBarRow
                          label={getScoreLabel(qualitativeEntry[0])}
                          value={qualitativeEntry[1]}
                          labelClass="text-amber-900"
                          barClass="bg-amber-500"
                          valueClass="text-amber-950"
                          barTrackClass="bg-amber-200/80"
                          hideLabel
                        />
                      </ul>
                    </div>
                  )}

                  {semanticEntry != null && (
                    <div className="rounded-xl border border-border bg-background p-4 shadow-sm ring-1 ring-vo-purple/25">
                      <div className="mb-3.5 flex items-center gap-1.5">
                        <h3 className="font-sans text-sm font-semibold text-vo-purple">
                          {tModal("semanticSimilarity")}
                        </h3>
                        <ScoreTooltip
                          text={tMatching("scoreTooltips.semanticSimilarity")}
                          accentClass="text-vo-purple"
                        />
                      </div>
                      <ul className="flex flex-col gap-2.5" role="list">
                        <ScoreBarRow
                          label={getScoreLabel(semanticEntry[0])}
                          value={semanticEntry[1]}
                          labelClass="text-vo-purple"
                          barClass="bg-vo-purple"
                          valueClass="text-violet-900"
                          barTrackClass="bg-violet-200/80"
                          hideLabel
                        />
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {hasSplitQualitative ? (
                <div className="flex flex-col gap-4">
                  {qualitativeReasoningPositive != null && (
                    <div className="rounded-xl border border-border bg-background p-4 shadow-sm ring-1 ring-emerald-200/50">
                      <h3 className="mb-3 font-sans text-sm font-semibold text-emerald-900">
                        {tModal("strengths")}
                      </h3>
                      <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                        {qualitativeReasoningPositive}
                      </p>
                    </div>
                  )}
                  {qualitativeReasoningNegative != null && (
                    <div className="rounded-xl border border-border bg-background p-4 shadow-sm ring-1 ring-amber-200/70">
                      <h3 className="mb-3 font-sans text-sm font-semibold text-amber-950">
                        {tModal("considerations")}
                      </h3>
                      <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                        {qualitativeReasoningNegative}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                qualitativeReasoningLegacy != null && (
                  <div className="rounded-xl border border-border bg-background p-4 shadow-sm ring-1 ring-border/60">
                    <h3 className="mb-3 font-sans text-sm font-semibold text-slate-900">
                      {tModal("qualitativeReasoning")}
                    </h3>
                    <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                      {qualitativeReasoningLegacy}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border p-6">
          <div>
            {downloadError != null && (
              <p className="font-sans text-xs text-destructive" role="alert">
                {downloadError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {toTrimmedText(match.candidateProfileId) != null && (
              <button
                type="button"
                onClick={handleDownloadCV}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={tModal("downloadCvAria")}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {downloading ? tModal("downloading") : tModal("downloadCv")}
              </button>
            )}
            {profileHref != null && (
              <Link
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-vo-purple/40 bg-background px-4 py-2.5 font-sans text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/10 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                aria-label={tMatching("errors.openProfileAria")}
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                {tModal("viewFullProfile")}
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              aria-label={tModal("closeProfileAria")}
            >
              {tModal("close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
