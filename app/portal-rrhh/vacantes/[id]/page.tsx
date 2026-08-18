"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckSquare,
  DollarSign,
  FileText,
  Gift,
  Info,
  Loader2,
  Mail,
  Plus,
  Phone,
  Scale,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import Snackbar from "@/components/ui/Snackbar";
import { apiClient } from "@/lib/api"
import { listAdminVacancyCatalog } from "@/lib/api/admin-vacancy-catalogs"
import {
  DEFAULT_RECRUITER_COMPANY_ID,
  listCompanyApplicantStatuses,
  listRecruiterCompanies,
  listRecruiterStages,
  persistVacancyCompanyId,
  resolveVacancyCompanyId,
} from "@/lib/api/recruiter-companies"
import {
  mapVacancyCompanyPatchError,
  patchVacancyClientCompany,
} from "@/lib/api/recruiter-vacancies"
import { finishVacancyProcess } from "@/lib/api/recruiter-vacancy-finish"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatApplicationSourceBadge } from "@/lib/application-source"
import RematchButton from "@/components/rrhh/RematchButton"
import { VacancyReadOnlyBanner } from "@/components/rrhh/VacancyReadOnlyBanner"
import { VacancyFinishedSummary } from "@/components/rrhh/VacancyFinishedSummary"
import { FinishVacancyProcessModal } from "@/components/rrhh/FinishVacancyProcessModal"
import { VacancyPasteConfirmModal } from "@/components/rrhh/vacancy-paste-confirm-modal"
import { VacancyLocationFields } from "@/components/rrhh/VacancyLocationFields"
import { RequirementsDisplay } from "@/components/rrhh/requirements-display"
import { VacancyDelimitedText } from "@/components/rrhh/vacancy-delimited-text"
import { VacancyReadOnlyIdentity } from "@/components/rrhh/vacancy-read-only-identity"
import { CandidateProfileModal } from "@/components/rrhh/candidate-profile-modal"
import { TechnicalSheetModal } from "@/components/rrhh/technical-sheet/technical-sheet-modal"
import {
  AiDisclosureBadge,
  AiDisclosureNotice,
  AiDisclosurePillProgress,
  AiKpiCard,
} from "@/components/rrhh/AiDisclosure"
import {
  getVacancyPreliminaryMatchTypicalMsForDocCount,
  VACANCY_SMART_PRELIMINARY_SEARCH_TYPICAL_MS,
} from "@/lib/apply-loading-bar"
import {
  FALLBACK_KANBAN_STAGES,
  getCandidateId,
  normalizeKanbanStage,
  resolveOrderedStageNames,
} from "@/lib/rrhh/vacancy-pipeline-stats"
import { validateStageMove } from "@/lib/recruiter/stage-move-validation"
import {
  downloadRecruiterCandidateCv,
  isRecruiterCandidateCvError,
} from "@/lib/api/recruiter-candidate-cv"
import { getInitials } from "@/lib/getInitials";
import { normalizeVacancyDetailFromApi } from "@/lib/vacancies/normalize-vacancy-detail-from-api";
import { readVacancyIsActive } from "@/lib/vacancies/read-vacancy-is-active";
import {
  getVacancyRecruiterReadOnlyReason,
  isVacancyRecruiterReadOnly,
  vacancyRecruiterReadOnlyTitle,
} from "@/lib/vacancies/read-vacancy-recruiter-read-only";
import {
  appendVacancyLocationToPayload,
  normalizeStateCode,
  readVacancyStateCode,
} from "@/lib/vacancies/vacancy-location";
import { formatVacancyDetailDocumentTitle } from "@/lib/pageTitles";
import {
  getVacancyDepartmentId,
  getVacancyDepartmentLabel,
  getVacancyDepartmentSummary,
  getVacancyModalityId,
  getVacancyModalityLabel,
  getVacancyModalitySummary,
  mapActiveCatalogItemsToOptions,
  mergeCatalogOption,
} from "@/lib/vacancy-catalogs";
import { getVacancyStatusLabel } from "@/lib/vacancies/vacancy-status-labels";
import { VACANCY_STATUS_STYLES } from "@/lib/vacancies/vacancy-status-styles";
import {
  buildVacancyClipboardPayload,
  clipboardPayloadToRequirementRows,
  readVacancyClipboard,
  resolveClipboardCatalogId,
  writeVacancyClipboard,
  type VacancyClipboardPayload,
} from "@/lib/vacancies/vacancy-clipboard";

const LOCALE_DATE_MAP = {
  es: "es-CL",
  en: "en-US",
  it: "it-IT",
  de: "de-DE",
  fr: "fr-FR",
};

const formatDate = (value, locale = "es") => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const dateLocale = LOCALE_DATE_MAP[locale] ?? locale;
  return d.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (value, locale = "es") => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const dateLocale = LOCALE_DATE_MAP[locale] ?? locale;
  return d.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const emptyToDash = (value) =>
  value != null && String(value).trim() !== "" ? String(value).trim() : "—";

/** Mensaje legible desde el objeto que lanza `apiClient` en errores HTTP. */
const extractApiErrorMessage = (err) => {
  if (err == null) return null
  if (typeof err === "string") return err
  const msg =
    err.message ??
    err.detail ??
    err.title ??
    (typeof err.errors === "string" ? err.errors : null)
  if (msg != null && String(msg).trim() !== "") return String(msg).trim()
  if (Array.isArray(err.errors)) {
    const first = err.errors[0]
    if (typeof first === "string") return first
    if (first?.message) return String(first.message)
  }
  return null
}

/**
 * El API de move-to-stage exige un "estado de postulación por defecto" en la empresa.
 * Si falta, el backend devuelve un mensaje en inglés; aquí lo traducimos y damos contexto.
 */
const normalizeMoveStageError = (err, t) => {
  const fallback = t("errors.moveStageFailed")
  const raw = extractApiErrorMessage(err) ?? fallback
  const lower = raw.toLowerCase()
  const isDefaultStatusMissing =
    lower.includes("default application status") ||
    lower.includes("missing default application status")
  if (isDefaultStatusMissing) {
    return {
      text: t("errors.missingDefaultApplicationStatus"),
      showEstadosLink: true,
    }
  }
  return { text: raw, showEstadosLink: false }
}

const normalizeApplicationStatusError = (err, t) => {
  const fallback = t("errors.updateApplicationStatusFailed")
  const raw = extractApiErrorMessage(err) ?? fallback
  return { text: raw, showEstadosLink: false }
}

const normalizeStageMoveValidationError = (code, t) => {
  if (code === "final_status_required") {
    return {
      text: t("errors.finalStatusRequiredForStageMove"),
      showEstadosLink: true,
    }
  }
  return {
    text: t("errors.stageSkipNotAllowed"),
    showEstadosLink: false,
  }
}

/** Converts any value to a string safe for React (never render an object). */
const safeString = (value) => {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => {
        if (v != null && typeof v === "object") return `${k}: ${JSON.stringify(v)}`;
        return `${k}: ${v}`;
      })
      .join(", ");
  }
  return "—";
};

const STATUS_STYLES = VACANCY_STATUS_STYLES;

const normalizeVacancyStatusKey = (status) => {
  if (!status) return "activa";
  const key = String(status).toLowerCase();
  if (key === "open") return "activa";
  if (key === "closed") return "cerrada";
  if (key === "paused") return "pausada";
  return key;
};

const getStatusStyleKey = (status) => {
  if (!status) return "activa";
  const key = String(status).toLowerCase();
  return STATUS_STYLES[key] ? key : "activa";
};

const getStatusConfig = (status, t) => {
  const styleKey = getStatusStyleKey(status);
  const styles = STATUS_STYLES[styleKey] ?? STATUS_STYLES.activa;
  const mapperKey = normalizeVacancyStatusKey(status);
  const label = getVacancyStatusLabel(mapperKey, t) || String(status ?? "");
  return { ...styles, label };
};

const AI_EFFICIENCY_KPI_KEYS = [
  {
    titleKey: "kpis.preliminarySearchTitle",
    valueKey: "kpis.preliminarySearchSubtitle",
    helperKey: "kpis.prioritizationTitle",
  },
  {
    titleKey: "kpis.preliminaryMatchTitle",
    valueKey: "kpis.preliminaryMatchSubtitle",
    helperKey: "kpis.preliminaryMatchGoal",
  },
  {
    titleKey: "kpis.coverageTitle",
    valueKey: "kpis.coverageSubtitle",
    helperKey: "kpis.coverageHint",
  },
] as const;

const REQUIREMENT_SCALE_MIN = 1;
const REQUIREMENT_SCALE_MAX = 10;

const toSnakeCase = (str) =>
  String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const createEmptyRequirement = () => ({
  id: crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  requirementName: "",
  requirementValue: "",
  scale: 5,
});

/** Parses lines like "Clave: Valor" into structured pairs. Returns null if any line lacks the pattern. */
const parseKeyValueLines = (text) => {
  if (!text || typeof text !== "string") return null;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const pairs = [];
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex <= 0 || colonIndex >= line.length - 1) return null;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (!key || !value) return null;
    pairs.push({ key, value });
  }
  return pairs;
};

const VacancyDetailsReadout = ({ value }) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const pairs = parseKeyValueLines(text);
  if (pairs && pairs.length > 0) {
    return (
      <dl className="flex flex-col gap-2">
        {pairs.map(({ key, value: pairValue }) => (
          <div key={`${key}-${pairValue}`} className="flex flex-col gap-0.5">
            <dt className="font-sans text-xs font-medium text-muted-foreground">{key}</dt>
            <dd className="font-sans text-sm text-foreground">{pairValue}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <VacancyDelimitedText value={text} variant="chips" />;
};

const MatchCard = ({
  match,
  candidateId,
  isSelected,
  onToggle,
  showVerPerfil = false,
  aiLabel,
  readOnly = false,
}) => {
  const tMatching = useTranslations("RecruiterPortal.vacancies.matching");
  const locale = useLocale();
  const [showModal, setShowModal] = useState(false);
  const initials = getInitials(
    emptyToDash(match.name) !== "—" ? match.name : "",
    match.email ?? ""
  );

  const handleCheckboxChange = (e) => {
    onToggle?.(candidateId, e.target.checked);
  };

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  return (
    <>
      <article
        className="rounded-xl border border-border bg-card p-5"
        aria-label={tMatching("aria.candidateCard", { name: emptyToDash(match.name) })}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex shrink-0 items-start gap-3">
              <label
                className={`flex items-center justify-center rounded ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer focus-within:ring-2 focus-within:ring-vo-purple focus-within:ring-offset-2"}`}
                aria-label={tMatching("aria.selectCandidate", { name: emptyToDash(match.name) })}
              >
                <input
                  type="checkbox"
                  checked={isSelected ?? false}
                  onChange={handleCheckboxChange}
                  disabled={readOnly}
                  className="h-4 w-4 rounded border-border text-vo-purple focus:ring-vo-purple focus:ring-offset-0 disabled:cursor-not-allowed"
                  aria-label={tMatching("aria.selectCandidate", { name: emptyToDash(match.name) })}
                />
              </label>
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vo-purple font-sans text-base font-semibold text-white"
                aria-hidden
              >
                {initials}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {aiLabel ? (
                <div className="mb-1">
                  <AiDisclosureBadge label={aiLabel} />
                </div>
              ) : null}
              <h3 className="font-sans text-base font-semibold text-foreground">
                {emptyToDash(match.name)}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {emptyToDash(match.email)}
                </span>
                {match.phone != null && String(match.phone).trim() !== "" && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {emptyToDash(match.phone)}
                  </span>
                )}
              </div>
              <p className="font-sans text-xs text-muted-foreground">
                {tMatching("uploadedPrefix")} {formatDate(match.uploadedAt, locale)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center rounded-lg bg-muted/50 px-4 py-2">
              <span className="font-sans text-lg font-semibold text-foreground">
                {typeof (match.semanticScore ?? match.totalScore) === "number"
                  ? ((match.semanticScore ?? match.totalScore) * 100).toFixed(2)
                  : "—"}
              </span>
              <span className="font-sans text-xs text-muted-foreground">
                {tMatching("score")}
              </span>
            </div>
            {showVerPerfil && (
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                aria-label={tMatching("aria.viewCandidate", { name: emptyToDash(match.name) })}
              >
                <User className="h-4 w-4" aria-hidden />
                {tMatching("viewProfile")}
              </button>
            )}
          </div>
        </div>
      </article>
      {showVerPerfil && showModal && (
        <CandidateProfileModal
          match={match}
          candidateId={candidateId}
          uploadedAtLabel={`${tMatching("uploadedPrefix")} ${formatDate(match.uploadedAt, locale)}`}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

const mapStatusFromApi = (item, index = 0) => {
  const id = String(item?.id ?? item?.uuid ?? index);
  const name = item?.name ?? item?.status_name ?? "";
  const final = Boolean(item?.final ?? item?.isFinal ?? item?.is_final);
  return { id, name, final };
};

const KanbanCard = ({
  match,
  candidateId,
  stage,
  statuses,
  currentStatusId,
  onStatusChange,
  statusSelectDisabled,
  vacancyId = null,
  vacancyTitle = null,
  readOnly = false,
}) => {
  const tTechnicalSheet = useTranslations("RecruiterPortal.technicalSheet")
  const tMatching = useTranslations("RecruiterPortal.vacancies.matching")
  const [technicalSheetOpen, setTechnicalSheetOpen] = useState(false);
  const sheetCandidateProfileId =
    match.candidateProfileId != null && String(match.candidateProfileId).trim() !== ""
      ? String(match.candidateProfileId).trim()
      : null;
  const candidateLabelForSheet =
    emptyToDash(match.name) !== "—" ? String(match.name) : sheetCandidateProfileId ?? "";
  const initials = getInitials(
    emptyToDash(match.name) !== "—" ? match.name : "",
    match.email ?? ""
  );
  const rawScore = match.semanticScore ?? match.totalScore;
  const score = typeof rawScore === "number" ? (rawScore * 100).toFixed(0) : "—";
  const applicationSourceLabel = formatApplicationSourceBadge(
    match.applicationSource ?? match.application_source
  );

  const handleDragStart = (e) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/json", JSON.stringify({ candidateId, stage }));
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.setAttribute("data-dragging", "true");
  };

  const handleDragEnd = (e) => {
    e.currentTarget.removeAttribute("data-dragging");
  };

  const handleStatusChange = (e) => {
    e.stopPropagation();
    const value = e.target.value;
    if (value) onStatusChange?.(candidateId, value);
  };

  const handleSelectMouseDown = (e) => e.stopPropagation();
  const handleSelectClick = (e) => e.stopPropagation();

  const displayName = emptyToDash(match.name);
  const showTechnicalSheetButton = Boolean(vacancyId && sheetCandidateProfileId);
  const hasStatuses = statuses.length > 0;

  return (
    <>
      <div
        draggable={!readOnly}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing data-[dragging=true]:opacity-50 data-[dragging=true]:cursor-grabbing"}`}
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        aria-label={readOnly ? undefined : tMatching("kanban.moveStageAria", { name: displayName })}
        aria-describedby={`kanban-card-${candidateId}`}
      >
        <div className="flex items-center gap-2.5" id={`kanban-card-${candidateId}`}>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vo-purple font-sans text-sm font-semibold text-white"
            aria-hidden
          >
            {initials}
          </div>
          <p
            className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-foreground"
            title={displayName}
          >
            {displayName}
          </p>
          {showTechnicalSheetButton ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTechnicalSheetOpen(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              aria-label={tTechnicalSheet("aria.viewSheet")}
            >
              <FileText className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 font-sans text-xs">
            <span className="text-muted-foreground">{tMatching("kanban.score")}</span>
            <span className="font-semibold tabular-nums text-foreground">{score}</span>
          </div>
          <span className="inline-flex shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-foreground">
            {applicationSourceLabel}
          </span>
        </div>

        {hasStatuses ? (
          <select
            value={currentStatusId ?? ""}
            onChange={handleStatusChange}
            onMouseDown={handleSelectMouseDown}
            onClick={handleSelectClick}
            disabled={statusSelectDisabled || readOnly}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-sans text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={tMatching("kanban.statusAria", { name: displayName })}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.id}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {vacancyId && sheetCandidateProfileId && technicalSheetOpen ? (
        <TechnicalSheetModal
          isOpen={technicalSheetOpen}
          onClose={() => setTechnicalSheetOpen(false)}
          vacancyId={vacancyId}
          candidateProfileId={sheetCandidateProfileId}
          vacancyTitle={vacancyTitle}
          candidateLabel={candidateLabelForSheet}
        />
      ) : null}
    </>
  );
};

const MoveStageErrorBanner = ({ error }) => {
  const tMatching = useTranslations("RecruiterPortal.vacancies.matching")
  if (!error) return null
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
      role="alert"
    >
      <p className="font-sans text-sm text-destructive">{error.text}</p>
      {error.showEstadosLink ? (
        <Link
          href="/portal-admin/etapas"
          className="font-sans text-sm font-medium text-vo-purple underline underline-offset-2 hover:text-vo-purple/90 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded-sm"
          aria-label={tMatching("errors.goToStagesAria")}
        >
          {tMatching("goToStagesLink")}
        </Link>
      ) : null}
    </div>
  )
}

const KanbanColumn = ({
  stage,
  candidates,
  onDrop,
  onDragEnter,
  onDragLeave,
  isOver,
  statuses,
  candidateStatusOverrides,
  onStatusChange,
  updatingStatusCandidateId,
  vacancyId = null,
  vacancyTitle = null,
  readOnly = false,
}) => {
  const tMatching = useTranslations("RecruiterPortal.vacancies.matching")
  const handleDragOver = (e) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e) => {
    if (readOnly) return;
    e.preventDefault();
    onDragLeave?.();
    try {
      const raw = e.dataTransfer.getData("application/json");
      const payload = raw ? JSON.parse(raw) : null;
      if (payload?.candidateId && payload.stage !== stage) {
        onDrop?.(payload.candidateId, stage);
      }
    } catch {
      // ignore invalid payload
    }
  };

  const handleDragEnter = (e) => {
    if (readOnly) return;
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    onDragEnter?.(stage);
  };

  const handleDragLeave = (e) => {
    if (readOnly) return;
    if (e.currentTarget.contains(e.relatedTarget)) return;
    onDragLeave?.();
  };

  const getCurrentStatusId = (match, candidateId) => {
    const override = candidateStatusOverrides?.[candidateId];
    if (override) return override;
    const fromMatch =
      match.applicationStatusId ??
      match.statusId ??
      (statuses.find(
        (s) =>
          (s.name || "").toLowerCase() ===
          (match.applicationStatus ?? match.status ?? stage ?? "").toLowerCase()
      )?.id);
    return fromMatch ?? statuses[0]?.id ?? "";
  };

  const hasCandidates = candidates.length > 0;
  const widthClasses = hasCandidates
    ? "min-w-[320px] max-w-[420px] flex-1"
    : "min-w-[140px] max-w-[180px] flex-none";

  return (
    <div
      className={`flex min-h-[320px] flex-col rounded-xl border border-border bg-muted/30 ${widthClasses}`}
      aria-label={tMatching("kanban.columnAria", { stage })}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-sans text-sm font-semibold text-foreground">
          {stage}
        </h3>
        <span
          className="rounded-full bg-muted px-2 py-0.5 font-sans text-xs text-muted-foreground"
          aria-live="polite"
        >
          {candidates.length}
        </span>
      </div>
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`flex min-h-[260px] flex-1 flex-col gap-3 p-4 transition-colors ${isOver ? "bg-vo-purple/10" : ""}`}
        data-stage={stage}
      >
        {candidates.map(({ match, candidateId }) => (
          <KanbanCard
            key={candidateId}
            match={match}
            candidateId={candidateId}
            stage={stage}
            statuses={statuses}
            currentStatusId={getCurrentStatusId(match, candidateId)}
            onStatusChange={onStatusChange}
            statusSelectDisabled={updatingStatusCandidateId === candidateId}
            vacancyId={vacancyId}
            vacancyTitle={vacancyTitle}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
};

export default function VacanteDetallePage() {
  const t = useTranslations("RecruiterPortal.vacancies");
  const tDetail = useTranslations("RecruiterPortal.vacancies.detail");
  const tForm = useTranslations("RecruiterPortal.vacancies.form");
  const tMatching = useTranslations("RecruiterPortal.vacancies.matching");
  const locale = useLocale();
  const params = useParams();
  const id = params?.id ?? null;
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editAdvantages, setEditAdvantages] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("");
  const [editStateCode, setEditStateCode] = useState("");
  const [editVacancyDepartmentId, setEditVacancyDepartmentId] = useState("");
  const [editVacancyModalityId, setEditVacancyModalityId] = useState("");
  const [editCompanyId, setEditCompanyId] = useState(DEFAULT_RECRUITER_COMPANY_ID);
  const [editRequirements, setEditRequirements] = useState(() => [createEmptyRequirement()]);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingVacancy, setSavingVacancy] = useState(false);
  const [saveVacancyError, setSaveVacancyError] = useState(null);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [modalityOptions, setModalityOptions] = useState([]);
  const [loadingVacancyCatalogs, setLoadingVacancyCatalogs] = useState(false);
  const [vacancyCatalogsError, setVacancyCatalogsError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const [smartCandidates, setSmartCandidates] = useState(null);
  const [loadingSmart, setLoadingSmart] = useState(false);
  const [smartError, setSmartError] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const [loadingStartProcess, setLoadingStartProcess] = useState(false);
  const [startProcessError, setStartProcessError] = useState(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(() => new Set());
  const [selectedPossibleCandidateIds, setSelectedPossibleCandidateIds] = useState(() => new Set());
  const [candidateStageOverrides, setCandidateStageOverrides] = useState(() => ({}));
  const [candidateStatusOverrides, setCandidateStatusOverrides] = useState(() => ({}));
  const [dragOverStage, setDragOverStage] = useState(null);
  const [stages, setStages] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingMoveStage, setLoadingMoveStage] = useState(false);
  const [applicationStatusError, setApplicationStatusError] = useState(null);
  const [updatingStatusCandidateId, setUpdatingStatusCandidateId] = useState(null);
  const [finishProcessModalOpen, setFinishProcessModalOpen] = useState(false);
  const [finishingProcess, setFinishingProcess] = useState(false);
  const [pasteConfirmOpen, setPasteConfirmOpen] = useState(false);

  const possibleCandidatesSectionDesktopRef = useRef(null);
  const possibleCandidatesSectionMobileRef = useRef(null);
  const etapasSectionDesktopRef = useRef(null);
  const etapasSectionMobileRef = useRef(null);
  const pendingPastePayloadRef = useRef<VacancyClipboardPayload | null>(null);
  const originalCompanyIdAtEditRef = useRef(DEFAULT_RECRUITER_COMPANY_ID);
  const pipelineCompanyCapturedForVacancyRef = useRef<string | null>(null);
  const [pipelineCompanyId, setPipelineCompanyId] = useState(DEFAULT_RECRUITER_COMPANY_ID);

  const vacancyDepartmentSummary = useMemo(
    () =>
      getVacancyDepartmentSummary(
        vacancy && typeof vacancy === "object" ? vacancy : null
      ),
    [vacancy]
  );

  const vacancyModalitySummary = useMemo(
    () =>
      getVacancyModalitySummary(
        vacancy && typeof vacancy === "object" ? vacancy : null
      ),
    [vacancy]
  );

  const mergedDepartmentOptions = useMemo(
    () => mergeCatalogOption(departmentOptions, vacancyDepartmentSummary),
    [departmentOptions, vacancyDepartmentSummary]
  );

  const mergedModalityOptions = useMemo(
    () => mergeCatalogOption(modalityOptions, vacancyModalitySummary),
    [modalityOptions, vacancyModalitySummary]
  );

  const createCatalogSummary = useCallback((option) => {
    if (!option) return null
    return {
      id: option.id,
      code: option.code,
      displayName: option.displayName,
    }
  }, []);

  const scrollToPossibleCandidates = useCallback(() => {
    const run = () => {
      if (typeof window === "undefined") return;
      const isLg = window.matchMedia("(min-width: 1024px)").matches;
      const el = isLg
        ? possibleCandidatesSectionDesktopRef.current
        : possibleCandidatesSectionMobileRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  }, []);

  const scrollToEtapas = useCallback(() => {
    const run = () => {
      if (typeof window === "undefined") return;
      const isLg = window.matchMedia("(min-width: 1024px)").matches;
      const el = isLg ? etapasSectionDesktopRef.current : etapasSectionMobileRef.current;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  }, []);

  const vacancyRouteId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    pipelineCompanyCapturedForVacancyRef.current = null;
  }, [vacancyRouteId]);

  useEffect(() => {
    if (!vacancy || !vacancyRouteId) return;
    const routeKey = String(vacancyRouteId);
    if (pipelineCompanyCapturedForVacancyRef.current === routeKey) return;
    pipelineCompanyCapturedForVacancyRef.current = routeKey;
    setPipelineCompanyId(
      resolveVacancyCompanyId(
        vacancy && typeof vacancy === "object" ? vacancy : null,
        companies,
        vacancyRouteId
      )
    );
  }, [vacancy, companies, vacancyRouteId]);

  const savedCompanyId = useMemo(
    () =>
      resolveVacancyCompanyId(
        vacancy && typeof vacancy === "object" ? vacancy : null,
        companies,
        vacancyRouteId
      ),
    [vacancy, companies, vacancyRouteId]
  );

  const companySelectOptions = useMemo(() => {
    if (companies.length > 0) return companies;
    const fallbackName = String(vacancy?.company ?? vacancy?.companyName ?? "").trim();
    return [
      {
        id: savedCompanyId,
        name: fallbackName || "—",
        isActive: true,
      },
    ];
  }, [companies, vacancy, savedCompanyId]);

  const vacancyCompanyDisplayName = useMemo(() => {
    const match = companySelectOptions.find((c) => c.id === savedCompanyId);
    if (match?.name && match.name !== "—") return match.name;
    const fromVacancy = String(vacancy?.company ?? vacancy?.companyName ?? "").trim();
    return fromVacancy || "—";
  }, [companySelectOptions, savedCompanyId, vacancy]);

  const companyLogoSrc = useMemo(() => {
    const logo = vacancy?.logo;
    const hasLogo = Boolean(vacancy?.hasLogo ?? vacancy?.has_logo);
    if (!hasLogo || !logo || typeof logo !== "object") return null;
    const base64 = String(logo.base64 ?? "").trim();
    if (!base64) return null;
    if (base64.startsWith("data:")) return base64;
    const contentType = String(logo.contentType ?? logo.content_type ?? "image/png").trim() || "image/png";
    return `data:${contentType};base64,${base64}`;
  }, [vacancy?.hasLogo, vacancy?.has_logo, vacancy?.logo]);

  const fetchStages = useCallback(async () => {
    try {
      const list = await listRecruiterStages(pipelineCompanyId);
      setStages(
        list.map((item) => ({
          id: item.id,
          name: item.name,
          order: item.order,
          final: item.final ?? false,
        }))
      );
    } catch {
      setStages([]);
    }
  }, [pipelineCompanyId]);

  const fetchStatuses = useCallback(async () => {
    try {
      const list = await listCompanyApplicantStatuses(pipelineCompanyId);
      setStatuses(list.map((item, i) => mapStatusFromApi(item, i)));
    } catch {
      setStatuses([]);
    }
  }, [pipelineCompanyId]);

  const fetchVacancyCatalogs = useCallback(async () => {
    setLoadingVacancyCatalogs(true)
    setVacancyCatalogsError(null)

    try {
      const [departments, modalities] = await Promise.all([
        listAdminVacancyCatalog("departments"),
        listAdminVacancyCatalog("modalities"),
      ])

      setDepartmentOptions(mapActiveCatalogItemsToOptions(departments))
      setModalityOptions(mapActiveCatalogItemsToOptions(modalities))
    } catch (err) {
      setDepartmentOptions([])
      setModalityOptions([])
      setVacancyCatalogsError(
        getApiErrorMessage(err) ||
          t("form.errors.catalogsLoadFailed")
      )
    } finally {
      setLoadingVacancyCatalogs(false)
    }
  }, [t])

  const fetchVacancy = useCallback(async (silentFlag?: unknown) => {
    const silent = silentFlag === true
    if (!id) {
      if (!silent) setLoading(false);
      if (!silent) setFetchError(tDetail("errors.missingId"));
      return;
    }
    if (!silent) {
      setLoading(true);
      setFetchError(null);
    }
    try {
      const data = await apiClient.get(`/api/recruiter/vacancies/${id}`);
      setVacancy(normalizeVacancyDetailFromApi(data) ?? data);
      const record =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : null;
      const companyIdFromApi = record?.companyId ?? record?.company_id;
      if (companyIdFromApi != null && String(companyIdFromApi).trim() !== "") {
        persistVacancyCompanyId(String(id), String(companyIdFromApi).trim());
      }
    } catch (err: unknown) {
      if (!silent) {
        setFetchError(
          getApiErrorMessage(err) || tDetail("errors.loadFailed")
        );
        setVacancy(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, tDetail]);

  useEffect(() => {
    fetchVacancy();
  }, [fetchVacancy]);

  useEffect(() => {
    let cancelled = false;
    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const list = await listRecruiterCompanies();
        if (!cancelled) setCompanies(list);
      } catch {
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setLoadingCompanies(false);
      }
    };
    void loadCompanies();
    return () => {
      cancelled = true;
    };
  }, []);

  const hydrateEditFormFromVacancy = useCallback((v) => {
    if (!v) return;
    const ccRaw = v.countryCode ?? v.country_code;
    setEditCountryCode(
      ccRaw != null && String(ccRaw).trim() !== ""
        ? String(ccRaw).trim().toUpperCase()
        : ""
    );
    setEditStateCode(readVacancyStateCode(v) ?? "");
    setEditTitle(String(v.title ?? "").trim());
    setEditDescription(String(v.description ?? "").trim());
    setEditDetails(v.details == null ? "" : String(v.details));
    setEditSalary(v.salary == null ? "" : String(v.salary));
    setEditAdvantages(v.advantages == null ? "" : String(v.advantages));
    setEditVacancyDepartmentId(getVacancyDepartmentId(v))
    setEditVacancyModalityId(getVacancyModalityId(v))

    const rawReqs = v.requirements;
    const reqObj =
      rawReqs && typeof rawReqs === "object" && !Array.isArray(rawReqs)
        ? rawReqs
        : null;
    const attributes =
      v.weights && typeof v.weights === "object" && typeof v.weights.attributes === "object" && !Array.isArray(v.weights.attributes)
        ? v.weights.attributes
        : {};

    if (!reqObj) {
      setEditRequirements([createEmptyRequirement()]);
      return;
    }

    const entries = Object.entries(reqObj).filter(
      ([k]) => k != null && !String(k).startsWith("additionalProp")
    );

    if (entries.length === 0) {
      setEditRequirements([createEmptyRequirement()]);
      return;
    }

    setEditRequirements(
      entries.map(([key, value]) => {
        const attrWeight = attributes?.[key];
        const scaleFromWeight =
          typeof attrWeight === "number" && Number.isFinite(attrWeight)
            ? Math.round(attrWeight * 10)
            : 5;
        const boundedScale = Math.min(
          REQUIREMENT_SCALE_MAX,
          Math.max(REQUIREMENT_SCALE_MIN, scaleFromWeight)
        );
        return {
          id: crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          requirementName: String(key ?? ""),
          requirementValue: typeof value === "string" ? value : safeString(value),
          scale: boundedScale,
        };
      })
    );
  }, []);

  const validateEditForm = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    if (!String(editTitle ?? "").trim()) nextErrors.title = t("form.validation.nameRequired");
    if (!String(editDescription ?? "").trim()) nextErrors.description = t("form.validation.descriptionRequired");

    editRequirements.forEach((req) => {
      const hasName = !!String(req.requirementName ?? "").trim();
      const hasValue = !!String(req.requirementValue ?? "").trim();
      if (hasName && !hasValue) nextErrors[`req-value-${req.id}`] = t("form.validation.requirementValueRequired");
      if (!hasName && hasValue) nextErrors[`req-name-${req.id}`] = t("form.validation.requirementNameRequired");
    });

    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [editTitle, editDescription, editRequirements, t]);

  const handleEditVacancy = useCallback(() => {
    if (!vacancy || !readVacancyIsActive(vacancy)) return;
    setSaveVacancyError(null);
    setEditErrors({});
    setVacancyCatalogsError(null);
    const resolvedCompanyId = resolveVacancyCompanyId(
      vacancy && typeof vacancy === "object" ? vacancy : null,
      companies,
      vacancyRouteId
    );
    originalCompanyIdAtEditRef.current = resolvedCompanyId;
    setEditCompanyId(resolvedCompanyId);
    hydrateEditFormFromVacancy(vacancy);
    setIsEditing(true);
  }, [vacancy, hydrateEditFormFromVacancy, companies, vacancyRouteId]);

  const handleCopyVacancy = useCallback(async () => {
    if (!vacancy || typeof vacancy !== "object") return;
    const companyId = resolveVacancyCompanyId(
      vacancy,
      companies,
      vacancyRouteId
    );
    const companyName =
      vacancyCompanyDisplayName === "—" ? "" : vacancyCompanyDisplayName;
    const payload = buildVacancyClipboardPayload(vacancy, companyId, companyName);
    const wrote = await writeVacancyClipboard(payload);
    if (!wrote) {
      setSnackbar({
        open: true,
        variant: "error",
        message: tDetail("toasts.copyFailed"),
      });
      return;
    }
    setSnackbar({
      open: true,
      variant: "success",
      message: tDetail("toasts.copied"),
    });
  }, [vacancy, companies, vacancyRouteId, vacancyCompanyDisplayName, tDetail]);

  const applyClipboardToEditForm = useCallback((payload) => {
    setEditTitle(payload.title);
    setEditDescription(payload.description);
    setEditDetails(payload.details);
    setEditSalary(payload.salary);
    setEditAdvantages(payload.advantages);
    setEditCountryCode(payload.countryCode);
    setEditStateCode(payload.stateCode);
    setEditVacancyDepartmentId(
      resolveClipboardCatalogId(
        payload.vacancyDepartmentId,
        payload.vacancyDepartmentCode,
        payload.vacancyDepartmentName,
        mergedDepartmentOptions
      )
    );
    setEditVacancyModalityId(
      resolveClipboardCatalogId(
        payload.vacancyModalityId,
        payload.vacancyModalityCode,
        payload.vacancyModalityName,
        mergedModalityOptions
      )
    );
    setEditRequirements(clipboardPayloadToRequirementRows(payload.requirements));
    setEditErrors({});
  }, [mergedDepartmentOptions, mergedModalityOptions]);

  const handleRequestPaste = useCallback(async () => {
    const payload = await readVacancyClipboard();
    if (!payload) {
      setSnackbar({
        open: true,
        variant: "error",
        message: tForm("toasts.pasteEmpty"),
      });
      return;
    }
    pendingPastePayloadRef.current = payload;
    setPasteConfirmOpen(true);
  }, [tForm]);

  const handleConfirmPaste = useCallback(() => {
    const payload = pendingPastePayloadRef.current;
    pendingPastePayloadRef.current = null;
    setPasteConfirmOpen(false);
    if (!payload) return;
    applyClipboardToEditForm(payload);
    setSnackbar({
      open: true,
      variant: "success",
      message: tForm("toasts.pasted"),
    });
  }, [applyClipboardToEditForm, tForm]);

  const handleCancelPaste = useCallback(() => {
    pendingPastePayloadRef.current = null;
    setPasteConfirmOpen(false);
  }, []);

  const handleAddRequirement = useCallback(() => {
    setEditRequirements((prev) => [...prev, createEmptyRequirement()]);
  }, []);

  const handleRemoveRequirement = useCallback((reqId) => {
    setEditRequirements((prev) => {
      const next = prev.filter((r) => r.id !== reqId);
      return next.length === 0 ? [createEmptyRequirement()] : next;
    });
    setEditErrors((prev) => {
      const next = { ...prev };
      delete next[`req-name-${reqId}`];
      delete next[`req-value-${reqId}`];
      return next;
    });
  }, []);

  const handleUpdateRequirement = useCallback((reqId, field, value) => {
    setEditRequirements((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? {
              ...r,
              [field]: field === "scale" ? parseInt(value, 10) || 1 : value,
            }
          : r
      )
    );
  }, []);

  const handleSaveVacancy = useCallback(async () => {
    const vacancyId = Array.isArray(id) ? id[0] : id;
    if (!vacancyId || !vacancy || !readVacancyIsActive(vacancy)) return;
    if (!validateEditForm()) return;
    if (!editCompanyId.trim()) {
      setSaveVacancyError(tDetail("errors.companyRequired"));
      return;
    }

    const companyChanged = editCompanyId !== originalCompanyIdAtEditRef.current;

    const validReqs = editRequirements.filter(
      (r) => String(r.requirementName ?? "").trim() && String(r.requirementValue ?? "").trim()
    );

    const requirements = {};
    const attributes = {};

    validReqs.forEach((r) => {
      const key = toSnakeCase(r.requirementName);
      if (!key) return;
      requirements[key] = String(r.requirementValue ?? "").trim();
      const scaleNumber = typeof r.scale === "number" ? r.scale : parseInt(r.scale, 10) || 5;
      const boundedScale = Math.min(REQUIREMENT_SCALE_MAX, Math.max(REQUIREMENT_SCALE_MIN, scaleNumber));
      attributes[key] = boundedScale / 10;
    });

    const semanticWeight =
      typeof vacancy?.weights?.semantic === "number" && Number.isFinite(vacancy.weights.semantic)
        ? vacancy.weights.semantic
        : 0.5;

    const nextTitle = String(editTitle ?? "").trim();
    const nextDescription = String(editDescription ?? "").trim();
    const nextDetails = String(editDetails ?? "").trim();
    const nextSalary = String(editSalary ?? "").trim();
    const nextAdvantages = String(editAdvantages ?? "").trim();
    const currentDetails = vacancy?.details == null ? "" : String(vacancy.details).trim();
    const currentSalary = vacancy?.salary == null ? "" : String(vacancy.salary).trim();
    const currentAdvantages =
      vacancy?.advantages == null ? "" : String(vacancy.advantages).trim();
    const nextCountry = editCountryCode.trim();
    const nextCountryCode = nextCountry === "" ? "" : nextCountry.toUpperCase();
    const nextStateCode = normalizeStateCode(editStateCode);
    const currentStateCode = readVacancyStateCode(
      vacancy && typeof vacancy === "object" ? vacancy : null
    );
    const nextDepartmentId = editVacancyDepartmentId || null;
    const nextModalityId = editVacancyModalityId || null;

    const hasOtherFormChanges =
      nextTitle !== String(vacancy?.title ?? "").trim() ||
      nextDescription !== String(vacancy?.description ?? "").trim() ||
      nextDetails !== currentDetails ||
      nextSalary !== currentSalary ||
      nextAdvantages !== currentAdvantages ||
      nextCountryCode !==
        String(vacancy?.countryCode ?? vacancy?.country_code ?? "")
          .trim()
          .toUpperCase() ||
      nextStateCode !== currentStateCode ||
      nextDepartmentId !== (getVacancyDepartmentId(vacancy) || null) ||
      nextModalityId !== (getVacancyModalityId(vacancy) || null) ||
      JSON.stringify(requirements) !==
        JSON.stringify(
          vacancy?.requirements &&
            typeof vacancy.requirements === "object" &&
            !Array.isArray(vacancy.requirements)
            ? vacancy.requirements
            : {}
        );

    setSavingVacancy(true);
    setSaveVacancyError(null);
    try {
      if (companyChanged && !hasOtherFormChanges) {
        await patchVacancyClientCompany(vacancyId, editCompanyId);
        persistVacancyCompanyId(vacancyId, editCompanyId);
        await fetchVacancy(true);
      } else if (hasOtherFormChanges) {
        const payload: Record<string, unknown> = {
          title: nextTitle,
          description: nextDescription,
          details: nextDetails === "" ? null : nextDetails,
          salary: nextSalary === "" ? null : nextSalary,
          advantages: nextAdvantages === "" ? null : nextAdvantages,
          requirements,
          weights: {
            semantic: semanticWeight,
            attributes,
          },
          vacancyDepartmentId: nextDepartmentId,
          vacancyModalityId: nextModalityId,
        };
        appendVacancyLocationToPayload(payload, {
          countryCode: editCountryCode,
          stateCode: editStateCode,
        });
        if (companyChanged) {
          payload.companyId = editCompanyId;
        }

        const updated = await apiClient.put(
          `/api/recruiter/vacancies/${vacancyId}`,
          payload
        );
        const updatedRecord =
          updated && typeof updated === "object" && !Array.isArray(updated) ? updated : {};

        const selectedDepartment = mergedDepartmentOptions.find(
          (option) => option.id === editVacancyDepartmentId
        );
        const selectedModality = mergedModalityOptions.find(
          (option) => option.id === editVacancyModalityId
        );

        const nextDepartmentSummary =
          updatedRecord.vacancyDepartment ??
          updatedRecord.vacancy_department ??
          updatedRecord.department ??
          createCatalogSummary(selectedDepartment) ??
          null;

        const nextModalitySummary =
          updatedRecord.vacancyModality ??
          updatedRecord.vacancy_modality ??
          updatedRecord.modality ??
          updatedRecord.workArrangement ??
          updatedRecord.work_arrangement ??
          createCatalogSummary(selectedModality) ??
          null;

        const nextCompanyName =
          companySelectOptions.find((c) => c.id === editCompanyId)?.name ??
          String(updatedRecord.company ?? vacancy?.company ?? "").trim();

        if (companyChanged) {
          persistVacancyCompanyId(vacancyId, editCompanyId);
        }

        setVacancy((prev) => ({
          ...(prev && typeof prev === "object" ? prev : {}),
          ...updatedRecord,
          title: payload.title,
          description: payload.description,
          details: payload.details,
          salary: payload.salary,
          advantages: payload.advantages,
          countryCode: payload.countryCode,
          stateCode: payload.stateCode,
          state_code: payload.stateCode,
          companyId: companyChanged ? editCompanyId : prev?.companyId,
          company: companyChanged ? nextCompanyName : prev?.company,
          vacancyDepartmentId: editVacancyDepartmentId || null,
          vacancy_department_id: editVacancyDepartmentId || null,
          vacancyDepartment: nextDepartmentSummary,
          vacancy_department: nextDepartmentSummary,
          department:
            nextDepartmentSummary && typeof nextDepartmentSummary === "object"
              ? nextDepartmentSummary.displayName
              : nextDepartmentSummary,
          vacancyModalityId: editVacancyModalityId || null,
          vacancy_modality_id: editVacancyModalityId || null,
          vacancyModality: nextModalitySummary,
          vacancy_modality: nextModalitySummary,
          modality:
            nextModalitySummary && typeof nextModalitySummary === "object"
              ? nextModalitySummary.displayName
              : nextModalitySummary,
          workArrangement:
            nextModalitySummary && typeof nextModalitySummary === "object"
              ? nextModalitySummary.displayName
              : nextModalitySummary,
          work_arrangement:
            nextModalitySummary && typeof nextModalitySummary === "object"
              ? nextModalitySummary.displayName
              : nextModalitySummary,
        }));

        if (companyChanged) {
          await fetchVacancy(true);
        }
      }

      setIsEditing(false);
      setSnackbar({
        open: true,
        variant: "success",
        message: tDetail("toasts.saved"),
      });
    } catch (err) {
      const msg = companyChanged
        ? mapVacancyCompanyPatchError(err)
        : getApiErrorMessage(err) || tDetail("errors.saveFailed");
      setSaveVacancyError(msg);
      setSnackbar({ open: true, variant: "error", message: msg });
    } finally {
      setSavingVacancy(false);
    }
  }, [
    id,
    vacancy,
    editCompanyId,
    editTitle,
    editDescription,
    editDetails,
    editSalary,
    editAdvantages,
    editCountryCode,
    editStateCode,
    editVacancyDepartmentId,
    editVacancyModalityId,
    editRequirements,
    validateEditForm,
    fetchVacancy,
    mergedDepartmentOptions,
    mergedModalityOptions,
    createCatalogSummary,
    companySelectOptions,
    t,
    tDetail,
  ]);

  const handleFinishProcess = useCallback(
    async (data: { calification: number; comments: string }) => {
      const vacancyId = Array.isArray(id) ? id[0] : id
      if (!vacancyId) {
        throw new Error(tDetail("errors.missingId"))
      }

      setFinishingProcess(true)

      try {
        const result = await finishVacancyProcess(vacancyId, data)
        await fetchVacancy(true)
        setVacancy((prev) => ({
          ...(prev && typeof prev === "object" ? prev : {}),
          status: "Closed",
          state: "Closed",
          isVacancyDone: true,
          is_vacancy_done: true,
          isCompanyActive: false,
          is_company_active: false,
          companyIsActive: false,
          company_is_active: false,
          isActive: false,
          is_active: false,
          readOnly: true,
          read_only: true,
          canFinishProcess: true,
          can_finish_process: true,
          calification: result.calification,
          comments: result.comments,
        }))
        setFinishProcessModalOpen(false)
        setSnackbar({
          open: true,
          variant: "success",
          message: tDetail("toasts.finishSuccess"),
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : tDetail("errors.finishFailed")
        throw new Error(message)
      } finally {
        setFinishingProcess(false)
      }
    },
    [id, fetchVacancy, tDetail]
  )

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    if (!isEditing) return
    void fetchVacancyCatalogs()
  }, [isEditing, fetchVacancyCatalogs]);

  const kanbanStageNames = useMemo(
    () =>
      stages.length > 0
        ? stages.map((s) => s.name).filter(Boolean)
        : FALLBACK_KANBAN_STAGES,
    [stages]
  );

  const vacancyReadOnlyReason = useMemo(
    () => getVacancyRecruiterReadOnlyReason(vacancy, companies),
    [vacancy, companies]
  );

  const isVacancyReadOnly = useMemo(
    () => isVacancyRecruiterReadOnly(vacancy, companies),
    [vacancy, companies]
  );

  const vacancyReadOnlyTitle = vacancyRecruiterReadOnlyTitle(vacancyReadOnlyReason);

  const isVacancyDone = useMemo(() => {
    if (!vacancy || typeof vacancy !== "object") return false
    const record = vacancy as Record<string, unknown>
    return record.isVacancyDone === true || record.is_vacancy_done === true
  }, [vacancy])

  const vacancyCalification = useMemo(() => {
    if (!vacancy || typeof vacancy !== "object") return null
    const record = vacancy as Record<string, unknown>
    const cal = record.calification ?? record.Calification
    if (typeof cal === "number" && cal >= 1 && cal <= 5) return cal
    return null
  }, [vacancy])

  const vacancyComments = useMemo(() => {
    if (!vacancy || typeof vacancy !== "object") return null
    const record = vacancy as Record<string, unknown>
    const comments = record.comments ?? record.Comments
    if (typeof comments === "string" && comments.trim() !== "") {
      return comments.trim()
    }
    return null
  }, [vacancy])

  useEffect(() => {
    if (!isVacancyReadOnly) return;
    setIsEditing(false);
    setSaveVacancyError(null);
  }, [isVacancyReadOnly]);

  const loadSmartCandidates = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return;
      if (isVacancyReadOnly && !options?.silent) return;

      setLoadingSmart(true);
      setSmartError(null);
      if (!options?.silent) {
        setSmartCandidates(null);
      }

      try {
        const url = `/api/recruiter/vacancies/${id}/search-candidates?limit=20&minScore=0.7`;
        const data = await apiClient.post(url, {});
        const list = Array.isArray(data) ? data : data?.candidates ?? data?.results ?? [];
        setSmartCandidates(list);

        if (!options?.silent) {
          const count = list.length;
          setSnackbar({
            open: true,
            variant: count > 0 ? "success" : "info",
            message:
              count > 0
                ? `Se encontraron ${count} candidato${count === 1 ? "" : "s"}.`
                : "No se encontraron candidatos con ese criterio.",
          });
        }
      } catch (err) {
        const msg = err?.message ?? err?.detail ?? tMatching("toasts.loadMatchFailed");
        setSmartError(msg);
        setSmartCandidates([]);
        if (!options?.silent) {
          setSnackbar({ open: true, variant: "error", message: msg });
        }
      } finally {
        setLoadingSmart(false);
      }
    },
    [id, isVacancyReadOnly, tMatching]
  );

  const handleSearchSmartRecommendations = useCallback(() => {
    void loadSmartCandidates();
  }, [loadSmartCandidates]);

  useEffect(() => {
    if (!id || loading || !isVacancyReadOnly || smartCandidates !== null) return;
    void loadSmartCandidates({ silent: true });
  }, [id, loading, isVacancyReadOnly, smartCandidates, loadSmartCandidates]);

  useEffect(() => {
    if (!id) return;
    if (loading) return;
    document.title = formatVacancyDetailDocumentTitle(
      vacancy?.title != null && String(vacancy.title).trim() !== ""
        ? vacancy.title
        : null
    );
  }, [id, loading, vacancy?.title]);

  const statusConfig = vacancy ? getStatusConfig(vacancy.status, t) : getStatusConfig("activa", t);
  /** AI match suggestions from vacancy (for "Posibles candidatos" container). */
  const vacancyCandidates = Array.isArray(vacancy?.aiMatchSuggestions)
    ? vacancy.aiMatchSuggestions
    : Array.isArray(vacancy?.matches)
      ? vacancy.matches
      : [];

  /** Applicants for Kanban board. */
  const applicants = Array.isArray(vacancy?.applicants) ? vacancy.applicants : [];

  /** Calculate if process can be finished based on the current kanban state. */
  const canFinishProcess = useMemo(() => {
    if (!vacancy || typeof vacancy !== "object") return false

    const record = vacancy as Record<string, unknown>
    const backendValue =
      record.canFinishProcess === true || record.can_finish_process === true

    const finalStageNames = new Set(
      stages
        .filter((stage) => stage?.final === true)
        .map((stage) => String(stage?.name ?? "").trim().toLowerCase())
        .filter(Boolean)
    )

    if (applicants.length > 0 && finalStageNames.size > 0) {
      return applicants.some((applicant, index) => {
        const candidateId = getCandidateId(applicant, index)
        const rawStageName =
          candidateStageOverrides[candidateId] ??
          applicant?.applicationStage ??
          applicant?.stage ??
          applicant?.stageName ??
          applicant?.stage_name

        const stageName = String(rawStageName ?? "").trim().toLowerCase()
        return stageName !== "" && finalStageNames.has(stageName)
      })
    }

    return backendValue
  }, [vacancy, applicants, stages, candidateStageOverrides])

  const showFinishProcessButton = useMemo(() => {
    return canFinishProcess && !isVacancyDone && !isVacancyReadOnly
  }, [canFinishProcess, isVacancyDone, isVacancyReadOnly])

  /** Stable key for matching (same person in search vs aiMatchSuggestions). */
  const getMatchKey = (m) => m?.candidateDocumentId ?? m?.candidateProfileId ?? null;

  /** Search results to show: exclude anyone already in aiMatchSuggestions or applicants. */
  const searchResultsToDisplay = useMemo(() => {
    if (smartCandidates == null || smartCandidates.length === 0) return [];
    const existingKeys = new Set([
      ...vacancyCandidates.map((m) => getMatchKey(m)).filter(Boolean),
      ...applicants.map((m) => getMatchKey(m)).filter(Boolean),
    ]);
    return smartCandidates.filter((m) => !existingKeys.has(getMatchKey(m)));
  }, [smartCandidates, vacancyCandidates, applicants]);

  /** Candidates from Search only (for selection and Match button in Search container). */
  const displayCandidates = searchResultsToDisplay;

  const orderedKanbanStageNames = useMemo(
    () => resolveOrderedStageNames(kanbanStageNames, applicants),
    [kanbanStageNames, applicants]
  );

  const candidatesByStage = useMemo(() => {
    const columnStages =
      orderedKanbanStageNames.length > 0
        ? orderedKanbanStageNames
        : kanbanStageNames;
    if (applicants.length === 0) {
      return columnStages.map((stage) => ({ stage, candidates: [] }));
    }
    const withMeta = applicants.map((match, i) => {
      const candidateId = getCandidateId(match, i);
      const stage =
        candidateStageOverrides[candidateId] ??
        normalizeKanbanStage(
          match.applicationStage ?? match.stage,
          columnStages
        );
      return { match, candidateId, stage };
    });
    return columnStages.map((stage) => ({
      stage,
      candidates: withMeta
        .filter((c) => c.stage === stage)
        .map((c) => ({ match: c.match, candidateId: c.candidateId })),
    }));
  }, [
    applicants,
    candidateStageOverrides,
    kanbanStageNames,
    orderedKanbanStageNames,
  ]);

  const handleKanbanStageDrop = useCallback(
    async (candidateId, newStage) => {
      if (isVacancyReadOnly) return;
      setApplicationStatusError(null);
      const applicant = applicants.find(
        (m, i) => getCandidateId(m, i) === candidateId
      );
      const applicationId = applicant?.applicationId ?? applicant?.application_id;
      const currentStage =
        candidateStageOverrides[candidateId] ??
        normalizeKanbanStage(
          applicant?.applicationStage ?? applicant?.stage,
          kanbanStageNames
        );
      const currentStatusId =
        candidateStatusOverrides[candidateId] ??
        applicant?.applicationStatusId ??
        applicant?.statusId ??
        statuses.find(
          (status) =>
            (status.name || "").toLowerCase() ===
            String(
              applicant?.applicationStatus ?? applicant?.status ?? ""
            ).toLowerCase()
        )?.id ??
        statuses[0]?.id ??
        "";
      const validation = validateStageMove(
        currentStage,
        newStage,
        stages,
        currentStatusId,
        statuses
      );

      if (!validation.allowed) {
        const normalized = normalizeStageMoveValidationError(
          validation.code,
          tMatching
        );
        setSnackbar({
          open: true,
          variant: "error",
          message: normalized.text,
        });
        return;
      }

      const stageObj = stages.find(
        (s) => (s.name || "").trim() === (newStage || "").trim()
      );
      const stageId = stageObj?.id ?? stageObj?.uuid;

      setCandidateStageOverrides((prev) => ({ ...prev, [candidateId]: newStage }));

      if (applicationId && stageId) {
        setLoadingMoveStage(true);
        try {
          await apiClient.patch(
            `/api/recruiter/applications/${applicationId}/move-to-stage`,
            { stageId, notes: "" }
          );
          setSnackbar({
            open: true,
            variant: "success",
            message: tMatching("errors.candidateMovedStage"),
          });
          /* El servidor restablece el estado de postulación al predeterminado; hay que alinear la vista. */
          try {
            await fetchVacancy(true);
            setCandidateStageOverrides((prev) => {
              const next = { ...prev };
              delete next[candidateId];
              return next;
            });
            setCandidateStatusOverrides((prev) => {
              const next = { ...prev };
              delete next[candidateId];
              return next;
            });
          } catch {
            /* La etapa ya se guardó; si falla recargar la vacante, los overrides mantienen la UI coherente. */
          }
        } catch (err) {
          const normalized = normalizeMoveStageError(err, tMatching);
          setSnackbar({
            open: true,
            variant: "error",
            message: normalized.text,
          });
          setCandidateStageOverrides((prev) => {
            const next = { ...prev };
            delete next[candidateId];
            return next;
          });
        } finally {
          setLoadingMoveStage(false);
        }
      }
    },
    [applicants, stages, statuses, kanbanStageNames, candidateStageOverrides, candidateStatusOverrides, fetchVacancy, isVacancyReadOnly, tMatching]
  );

  const handleKanbanDragEnter = useCallback((stage) => {
    setDragOverStage(stage);
  }, []);

  const handleKanbanDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleStatusChange = useCallback(
    async (candidateId, statusId) => {
      if (isVacancyReadOnly) return;
      setApplicationStatusError(null);
      const applicant = applicants.find(
        (m, i) => getCandidateId(m, i) === candidateId
      );
      const applicationId = applicant?.applicationId ?? applicant?.application_id;
      if (!applicationId) {
        setApplicationStatusError({
          text: tMatching("errors.missingApplicationId"),
          showEstadosLink: false,
        });
        return;
      }

      setCandidateStatusOverrides((prev) => ({ ...prev, [candidateId]: statusId }));
      setUpdatingStatusCandidateId(candidateId);
      try {
        await apiClient.patch(
          `/api/recruiter/applications/${applicationId}/application-status`,
          { applicationStatusId: statusId }
        );
        setSnackbar({
          open: true,
          variant: "success",
          message: tMatching("errors.applicationStatusUpdated"),
        });
        try {
          await fetchVacancy(true);
          setCandidateStatusOverrides((prev) => {
            const next = { ...prev };
            delete next[candidateId];
            return next;
          });
        } catch {
          /* El estado ya se guardó; si falla recargar la vacante, el override mantiene la UI coherente. */
        }
      } catch (err) {
        const normalized = normalizeApplicationStatusError(err, tMatching);
        setApplicationStatusError(normalized);
        setSnackbar({
          open: true,
          variant: "error",
          message: normalized.text,
        });
        setCandidateStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[candidateId];
          return next;
        });
      } finally {
        setUpdatingStatusCandidateId(null);
      }
    },
    [applicants, fetchVacancy, isVacancyReadOnly, tMatching]
  );

  const handleToggleCandidate = useCallback((id, checked) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAllCandidates = useCallback(() => {
    if (displayCandidates.length === 0) return;
    setSelectedCandidateIds(
      new Set(displayCandidates.map((m, i) => getCandidateId(m, i)))
    );
  }, [displayCandidates]);

  const handleDeselectAllCandidates = useCallback(() => {
    setSelectedCandidateIds(new Set());
  }, []);

  const handleTogglePossibleCandidate = useCallback((candidateId, checked) => {
    setSelectedPossibleCandidateIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(candidateId);
      else next.delete(candidateId);
      return next;
    });
  }, []);

  const handleStartProcess = useCallback(async () => {
    if (!id || isVacancyReadOnly) return;
    const candidateProfileIds = vacancyCandidates
      .map((match, index) => (selectedPossibleCandidateIds.has(getCandidateId(match, index)) ? match.candidateProfileId : null))
      .filter((pid) => pid != null && String(pid).trim() !== "");
    if (candidateProfileIds.length === 0) return;
    setLoadingStartProcess(true);
    setStartProcessError(null);
    try {
      await apiClient.post("/api/recruiter/applications/start", {
        vacancyId: id,
        candidateProfileIds,
      });
      setSelectedPossibleCandidateIds(new Set());
      await fetchVacancy(true);
      setSnackbar({
        open: true,
        variant: "success",
        message: tMatching("toasts.processStarted"),
      });
      scrollToEtapas();
    } catch (err) {
      const msg = err?.message ?? err?.detail ?? "No se pudo iniciar el proceso.";
      setStartProcessError(msg);
      setSnackbar({ open: true, variant: "error", message: msg });
    } finally {
      setLoadingStartProcess(false);
    }
  }, [id, vacancyCandidates, selectedPossibleCandidateIds, fetchVacancy, scrollToEtapas, isVacancyReadOnly]);

  /** Selected candidate document IDs to send to the match API. */
  const selectedDocumentIds = displayCandidates
    .map((m, i) => (selectedCandidateIds.has(getCandidateId(m, i)) ? m.candidateDocumentId : null))
    .filter((docId) => docId != null && String(docId).trim() !== "");

  const handleMatch = useCallback(async () => {
    if (!id || isVacancyReadOnly) return;
    const docIds = displayCandidates
      .map((m, i) => (selectedCandidateIds.has(getCandidateId(m, i)) ? m.candidateDocumentId : null))
      .filter((docId) => docId != null && String(docId).trim() !== "");
    if (docIds.length === 0) return;
    setLoadingMatch(true);
    setMatchError(null);
    try {
      await apiClient.post(`/api/recruiter/vacancies/${id}/match`, docIds);
      await fetchVacancy(true);
      setSnackbar({
        open: true,
        variant: "success",
        message: tMatching("toasts.matchSuccess"),
      });
      scrollToPossibleCandidates();
    } catch (err) {
      const msg = err?.message ?? err?.detail ?? "No se pudo ejecutar el emparejamiento.";
      setMatchError(msg);
      setSnackbar({ open: true, variant: "error", message: msg });
    } finally {
      setLoadingMatch(false);
    }
  }, [id, displayCandidates, selectedCandidateIds, fetchVacancy, scrollToPossibleCandidates, isVacancyReadOnly]);

  const selectedCount = selectedCandidateIds.size;

  const breadcrumbLabel = vacancy?.title ? vacancy.title : tDetail("page.fallbackTitle");

  const breadcrumbTrail = useMemo(
    () => [
      { label: t("breadcrumb"), href: "/portal-rrhh/vacantes" },
      { label: breadcrumbLabel },
    ],
    [breadcrumbLabel, t]
  );

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel={breadcrumbLabel}
            breadcrumbTrail={breadcrumbTrail}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col p-8">
              {loading ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
                  aria-live="polite"
                >
                  <div
                    className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
                    aria-hidden
                  />
                  <p className="font-sans text-sm text-muted-foreground">
                    {tDetail("loadingStates.loading")}
                  </p>
                </div>
              ) : fetchError ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
                  role="alert"
                >
                  <p className="font-sans text-sm text-destructive">
                    {fetchError}
                  </p>
                  <Link
                    href="/portal-rrhh/vacantes"
                    className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    {tDetail("actions.backToVacancies")}
                  </Link>
                  <button
                    type="button"
                    onClick={fetchVacancy}
                    className="font-sans text-sm text-vo-purple hover:underline"
                  >
                    {t("actions.retry")}
                  </button>
                </div>
              ) : vacancy ? (
                <>
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href="/portal-rrhh/vacantes"
                      className="inline-flex w-fit items-center gap-2 font-sans text-sm text-gray-600 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                      aria-label={tDetail("actions.backToVacanciesAria")}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                      {tDetail("actions.backToVacancies")}
                    </Link>
                  </div>

                  {isVacancyReadOnly ? (
                    <div className="mb-6">
                      <VacancyReadOnlyBanner reason={vacancyReadOnlyReason ?? "vacancy"} />
                    </div>
                  ) : null}

                  {isVacancyDone && (vacancyCalification != null || vacancyComments != null) ? (
                    <div className="mb-6">
                      <VacancyFinishedSummary
                        calification={vacancyCalification}
                        comments={vacancyComments}
                      />
                    </div>
                  ) : null}

                  <section
                    className="mb-8 rounded-xl border border-border bg-card p-6"
                    aria-label={tDetail("page.vacancyInfoAria")}
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        {companyLogoSrc ? (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-background">
                            <img
                              src={companyLogoSrc}
                              alt={tDetail("page.logoAlt", { company: vacancyCompanyDisplayName })}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10"
                            aria-hidden
                          >
                            <Briefcase
                              className="h-7 w-7 text-vo-purple"
                              aria-hidden
                            />
                          </div>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          {isEditing ? (
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-2">
                                <label className="font-sans text-sm font-medium text-foreground" htmlFor="edit-vacancy-title-desktop">
                                  {t("form.fields.name.label")} <span className="text-vo-pink">*</span>
                                </label>
                                <input
                                  id="edit-vacancy-title-desktop"
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-invalid={!!editErrors.title}
                                  aria-describedby={editErrors.title ? "edit-title-error-desktop" : undefined}
                                  placeholder={t("form.fields.name.placeholder")}
                                />
                                {editErrors.title && (
                                  <p id="edit-title-error-desktop" className="font-sans text-sm text-vo-pink" role="alert">
                                    {editErrors.title}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <label
                                  className="font-sans text-sm font-medium text-foreground"
                                  htmlFor="edit-vacancy-company-desktop"
                                >
                                  {t("form.fields.client.label")}
                                </label>
                                <select
                                  id="edit-vacancy-company-desktop"
                                  value={editCompanyId}
                                  onChange={(e) => setEditCompanyId(e.target.value)}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                  aria-label={t("form.fields.client.ariaLabel")}
                                  disabled={loadingCompanies || companySelectOptions.length === 0}
                                >
                                  {companySelectOptions.map((company) => (
                                    <option key={company.id} value={company.id}>
                                      {company.name}
                                    </option>
                                  ))}
                                </select>
                                <p className="font-sans text-xs text-muted-foreground">
                                  {tDetail("actions.companyChangeHint")}
                                </p>
                              </div>
                              <VacancyLocationFields
                                countryCode={editCountryCode}
                                stateCode={editStateCode}
                                onChange={({ countryCode, stateCode }) => {
                                  setEditCountryCode(countryCode)
                                  setEditStateCode(stateCode)
                                }}
                                countrySelectId="edit-vacancy-country-desktop"
                                stateSelectId="edit-vacancy-state-desktop"
                                countryLabel={t("form.fields.country.label")}
                                stateLabel={t("form.fields.state.label")}
                                disabled={savingVacancy}
                              />
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                  <label className="font-sans text-sm font-medium text-foreground" htmlFor="edit-vacancy-department-desktop">
                                    {t("form.fields.department.label")}
                                  </label>
                                  <select
                                    id="edit-vacancy-department-desktop"
                                    value={editVacancyDepartmentId}
                                    onChange={(e) => setEditVacancyDepartmentId(e.target.value)}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={t("form.fields.department.ariaLabel")}
                                    disabled={loadingVacancyCatalogs}
                                  >
                                    <option value="">{t("form.fields.unspecifiedOption")}</option>
                                    {mergedDepartmentOptions.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.displayName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label className="font-sans text-sm font-medium text-foreground" htmlFor="edit-vacancy-modality-desktop">
                                    {t("form.fields.modality.label")}
                                  </label>
                                  <select
                                    id="edit-vacancy-modality-desktop"
                                    value={editVacancyModalityId}
                                    onChange={(e) => setEditVacancyModalityId(e.target.value)}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={t("form.fields.modality.ariaLabel")}
                                    disabled={loadingVacancyCatalogs}
                                  >
                                    <option value="">{t("form.fields.unspecifiedOption")}</option>
                                    {mergedModalityOptions.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.displayName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {vacancyCatalogsError ? (
                                <p className="font-sans text-sm text-amber-700" role="status">
                                  {vacancyCatalogsError}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <VacancyReadOnlyIdentity
                              title={emptyToDash(vacancy.title)}
                              companyName={vacancyCompanyDisplayName}
                              department={getVacancyDepartmentLabel(vacancy)}
                              modality={getVacancyModalityLabel(vacancy)}
                              countryCode={vacancy.countryCode ?? vacancy.country_code}
                              stateCode={vacancy.stateCode ?? vacancy.state_code}
                              createdAtLabel={tDetail("headerMeta.created", {
                                date: formatShortDate(vacancy.createdAt, locale),
                              })}
                              statusLabel={statusConfig.label}
                              statusClassName={`${statusConfig.bgClass} ${statusConfig.textClass}`}
                              titleClassName="text-2xl"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {!isEditing ? (
                          <>
                            {!isVacancyReadOnly ? (
                              <RematchButton
                                vacancyId={id}
                                needsRematch={vacancy.needsRematch}
                                onSuccess={() => fetchVacancy(true)}
                                onSnackbar={(message, variant = "success") =>
                                  setSnackbar({ open: true, message, variant })
                                }
                              />
                            ) : null}
                            {showFinishProcessButton ? (
                              <button
                                type="button"
                                onClick={() => setFinishProcessModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                                aria-label={tDetail("actions.finishProcessAria")}
                              >
                                {tDetail("actions.finishProcess")}
                              </button>
                            ) : null}
                            {!isVacancyReadOnly ? (
                              <button
                                type="button"
                                onClick={handleEditVacancy}
                                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                                aria-label={tDetail("actions.editVacancyAria")}
                              >
                                {tDetail("actions.editVacancy")}
                              </button>
                            ) : null}
                            <Link
                              href={`/portal-rrhh/entrevistas/${encodeURIComponent(String(Array.isArray(id) ? id[0] : id ?? ""))}`}
                              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                              aria-label={tDetail("actions.interviewsAria")}
                            >
                              {tDetail("actions.interviews")}
                            </Link>
                            <Link
                              href={`/portal-rrhh/vacantes/${encodeURIComponent(String(Array.isArray(id) ? id[0] : id ?? ""))}/resultados`}
                              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                              aria-label={tDetail("actions.resultsAria")}
                            >
                              {tDetail("actions.results")}
                            </Link>
                            <button
                              type="button"
                              onClick={handleCopyVacancy}
                              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                              aria-label={tDetail("actions.copyAria")}
                            >
                              {tDetail("actions.copy")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleRequestPaste}
                              disabled={savingVacancy}
                              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={tForm("actions.pasteAria")}
                            >
                              {tForm("actions.paste")}
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveVacancy}
                              disabled={savingVacancy}
                              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={tDetail("actions.saveAria")}
                            >
                              {savingVacancy ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                              ) : null}
                              {savingVacancy ? tDetail("actions.saving") : tDetail("actions.save")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {saveVacancyError && (
                      <p className="mt-4 font-sans text-sm text-destructive" role="alert">
                        {saveVacancyError}
                      </p>
                    )}
                    {(vacancy.description || vacancy.requirements || vacancy.details || vacancy.salary || vacancy.advantages || isEditing) && (
                      <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
                        {(vacancy.description || vacancy.salary || vacancy.details || isEditing) && (
                        <div
                          className={`grid items-start gap-4${
                            (vacancy.description || isEditing) &&
                            (vacancy.salary || vacancy.details || isEditing)
                              ? " lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,22rem)]"
                              : ""
                          }`}
                        >
                        {(vacancy.description || isEditing) && (
                          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <h2 className="mb-3 flex items-center gap-2.5 font-sans text-sm font-semibold text-foreground">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ats-arena/80 text-gray-700">
                                <FileText className="h-4 w-4" aria-hidden />
                              </span>
                              {tDetail("sections.description")}
                            </h2>
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  rows={5}
                                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
                                  aria-label={t("form.fields.description.label")}
                                  aria-invalid={!!editErrors.description}
                                  aria-describedby={editErrors.description ? "edit-description-error-desktop" : undefined}
                                  placeholder={t("form.fields.description.placeholder")}
                                />
                                {editErrors.description && (
                                  <p id="edit-description-error-desktop" className="font-sans text-sm text-vo-pink" role="alert">
                                    {editErrors.description}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="font-sans text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                {safeString(vacancy.description)}
                              </p>
                            )}
                          </div>
                        )}
                        {(vacancy.salary || vacancy.details || isEditing) && (
                          <div className="flex flex-col gap-4">
                            {(vacancy.salary || isEditing) && (
                              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-5 shadow-sm">
                                <h2 className="mb-3 flex items-center gap-2.5 font-sans text-sm font-semibold text-foreground">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                                    <DollarSign className="h-4 w-4" aria-hidden />
                                  </span>
                                  {tDetail("sections.salary")}
                                </h2>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editSalary}
                                    onChange={(e) => setEditSalary(e.target.value)}
                                    placeholder={t("form.fields.salary.placeholder")}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={t("form.fields.salary.ariaLabel")}
                                  />
                                ) : vacancy.salary ? (
                                  <p className="font-sans text-lg font-semibold text-foreground">
                                    {safeString(vacancy.salary)}
                                  </p>
                                ) : (
                                  <p className="font-sans text-sm italic text-gray-600">
                                    {tDetail("fallbacks.unspecified")}
                                  </p>
                                )}
                              </div>
                            )}
                            {(vacancy.details || isEditing) && (
                              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                <h2 className="mb-3 flex items-center gap-2.5 font-sans text-sm font-semibold text-foreground">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                                    <Info className="h-4 w-4" aria-hidden />
                                  </span>
                                  {tDetail("sections.details")}
                                </h2>
                                {isEditing ? (
                                  <textarea
                                    value={editDetails}
                                    onChange={(e) => setEditDetails(e.target.value)}
                                    rows={4}
                                    placeholder={t("form.fields.details.placeholder")}
                                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                    aria-label={t("form.fields.details.label")}
                                  />
                                ) : vacancy.details ? (
                                  <VacancyDetailsReadout value={vacancy.details} />
                                ) : (
                                  <p className="font-sans text-sm italic text-gray-600">
                                    {tDetail("fallbacks.unspecified")}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                        )}
                        {(vacancy.requirements || isEditing) && (
                          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                              <h2 className="flex items-center gap-2.5 font-sans text-sm font-semibold text-foreground">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-vo-purple/15 text-vo-purple">
                                  <CheckSquare className="h-4 w-4" aria-hidden />
                                </span>
                                {tDetail("sections.requirements")}
                              </h2>
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={handleAddRequirement}
                                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/10 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                                  aria-label={tDetail("actions.addRequirementAria")}
                                >
                                  <Plus className="h-4 w-4" aria-hidden />
                                  {tDetail("actions.addRequirement")}
                                </button>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                                  {editRequirements.map((req, index) => (
                                    <div
                                      key={req.id}
                                      className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3"
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                                        <div className="flex-1 space-y-1">
                                          <input
                                            type="text"
                                            value={req.requirementName}
                                            onChange={(e) =>
                                              handleUpdateRequirement(req.id, "requirementName", e.target.value)
                                            }
                                            placeholder={t("form.fields.requirements.namePlaceholder")}
                                            className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                                            aria-label={`Requerimiento ${index + 1} - Nombre`}
                                            aria-invalid={!!editErrors[`req-name-${req.id}`]}
                                          />
                                          {editErrors[`req-name-${req.id}`] && (
                                            <p className="font-sans text-xs text-vo-pink" role="alert">
                                              {editErrors[`req-name-${req.id}`]}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                          <input
                                            type="text"
                                            value={req.requirementValue}
                                            onChange={(e) =>
                                              handleUpdateRequirement(req.id, "requirementValue", e.target.value)
                                            }
                                            placeholder={t("form.fields.requirements.valuePlaceholder")}
                                            className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                                            aria-label={`Requerimiento ${index + 1} - Valor`}
                                            aria-invalid={!!editErrors[`req-value-${req.id}`]}
                                          />
                                          {editErrors[`req-value-${req.id}`] && (
                                            <p className="font-sans text-xs text-vo-pink" role="alert">
                                              {editErrors[`req-value-${req.id}`]}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex min-w-[160px] flex-col gap-1 sm:shrink-0">
                                          <div className="flex items-center justify-between">
                                            <label
                                              htmlFor={`edit-scale-desktop-${req.id}`}
                                              className="font-sans text-xs text-muted-foreground"
                                            >
                                              {t("form.fields.requirements.importanceLabel")}
                                            </label>
                                            <span className="font-sans text-xs font-medium text-foreground tabular-nums">
                                              {req.scale}
                                            </span>
                                          </div>
                                          <input
                                            id={`edit-scale-desktop-${req.id}`}
                                            type="range"
                                            min={REQUIREMENT_SCALE_MIN}
                                            max={REQUIREMENT_SCALE_MAX}
                                            value={req.scale}
                                            onChange={(e) =>
                                              handleUpdateRequirement(req.id, "scale", e.target.value)
                                            }
                                            className="h-2 w-full cursor-pointer accent-vo-purple"
                                            aria-label={`Requerimiento ${index + 1} - Nivel promedio del 1 al 10`}
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveRequirement(req.id)}
                                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-vo-purple"
                                          aria-label={`Eliminar requerimiento ${index + 1}`}
                                        >
                                          <Trash2 className="h-4 w-4" aria-hidden />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="font-sans text-xs text-muted-foreground">
                                  {t("form.fields.requirements.helper")}
                                </p>
                              </div>
                            ) : (
                              <RequirementsDisplay
                                value={vacancy.requirements}
                                attributeWeights={vacancy.weights?.attributes}
                              />
                            )}
                          </div>
                        )}

                        {(vacancy.advantages || isEditing) && (
                          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <h2 className="mb-3 flex items-center gap-2.5 font-sans text-sm font-semibold text-foreground">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-vo-pink/10 text-vo-pink">
                                <Gift className="h-4 w-4" aria-hidden />
                              </span>
                              {tDetail("sections.advantages")}
                            </h2>
                            {isEditing ? (
                              <textarea
                                value={editAdvantages}
                                onChange={(e) => setEditAdvantages(e.target.value)}
                                rows={4}
                                placeholder={t("form.fields.advantages.placeholder")}
                                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                aria-label={t("form.fields.advantages.label")}
                              />
                            ) : vacancy.advantages ? (
                              <VacancyDelimitedText value={vacancy.advantages} variant="list" />
                            ) : (
                              <p className="font-sans text-sm italic text-gray-600">
                                {tDetail("fallbacks.unspecified")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <section
                    className="flex flex-col gap-4"
                    aria-label={tMatching("aria.matchedCandidates")}
                  >
                  <AiDisclosureNotice
                    title={tMatching("sectionTitle")}
                    description={tMatching("sectionDescription")}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    {AI_EFFICIENCY_KPI_KEYS.map((item) => (
                      <AiKpiCard
                        key={item.titleKey}
                        label={tMatching(item.titleKey)}
                        value={tMatching(item.valueKey)}
                        helper={tMatching(item.helperKey)}
                      />
                    ))}
                  </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSearchSmartRecommendations}
                        disabled={loadingSmart || isVacancyReadOnly}
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple/50 bg-vo-purple/10 px-4 py-2.5 font-sans text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/15 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={tMatching("aria.preliminarySearch")}
                        title={vacancyReadOnlyTitle}
                      >
                        {loadingSmart ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        {loadingSmart
                          ? tMatching("updatingSearch")
                          : tMatching("preliminarySearch")}
                      </button>
                      {displayCandidates.length > 0 && (
                        <button
                          type="button"
                          onClick={handleMatch}
                          disabled={loadingMatch || selectedDocumentIds.length === 0 || isVacancyReadOnly}
                          className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={tMatching("aria.preliminaryAnalysis")}
                          title={vacancyReadOnlyTitle}
                        >
                          {loadingMatch ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <Scale className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          {loadingMatch ? tMatching("reanalyzing") : tMatching("preliminaryAnalysis")}
                        </button>
                      )}
                    </div>
                    {matchError && (
                      <p className="font-sans text-sm text-destructive" role="alert">
                        {matchError}
                      </p>
                    )}
                    {smartError && (
                      <p className="font-sans text-sm text-destructive" role="alert">
                        {smartError} Puedes continuar con filtros y revisión manual.
                      </p>
                    )}

                    {/* 1. Search container: only result of Search button (exclude already in Posibles candidatos) */}
                    <div className="flex flex-col gap-3">
                      {loadingMatch ? (
                        <div
                          className="w-full max-w-2xl space-y-2"
                          role="status"
                          aria-live="polite"
                          aria-label={tMatching("reanalyzingEllipsis")}
                        >
                          <AiDisclosurePillProgress
                            percent={null}
                            timeBasedTypicalMs={getVacancyPreliminaryMatchTypicalMsForDocCount(
                              Math.max(1, selectedDocumentIds.length)
                            )}
                            preliminaryMatchStepLabels
                            className="mt-0!"
                            aria-label={tMatching("aria.analysisProgress")}
                          />
                          <p className="font-sans text-sm text-muted-foreground">
                            {tMatching("reanalyzingEllipsis")}
                          </p>
                        </div>
                      ) : null}
                      <h2 className="flex items-center gap-2 font-sans text-lg font-semibold text-foreground">
                        <Sparkles className="h-5 w-5" aria-hidden />
                        {tMatching("searchResults")}
                        {smartCandidates !== null && (
                          <span className="font-sans text-sm font-normal text-muted-foreground">
                            ({searchResultsToDisplay.length})
                          </span>
                        )}
                      </h2>
                      <div
                        className="rounded-xl border border-border bg-card p-6"
                        aria-label={tMatching("aria.searchResults")}
                      >
                        {loadingSmart && smartCandidates === null ? (
                          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                            <div className="w-full max-w-md px-1">
                              <AiDisclosurePillProgress
                                percent={null}
                                timeBasedTypicalMs={VACANCY_SMART_PRELIMINARY_SEARCH_TYPICAL_MS}
                                className="mt-0!"
                                aria-label={tMatching("aria.searchProgress")}
                              />
                            </div>
                            <p
                              className="font-sans text-sm text-muted-foreground"
                              aria-live="polite"
                            >
                              {tMatching("updatingSearchEllipsis")}
                            </p>
                          </div>
                        ) : smartCandidates === null ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <Sparkles className="h-12 w-12 text-muted-foreground" aria-hidden />
                            <p className="font-sans text-sm text-muted-foreground">
                              {tMatching("emptySearch")}
                            </p>
                          </div>
                        ) : searchResultsToDisplay.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
                            <p className="font-sans text-sm text-muted-foreground">
                              {smartCandidates.length === 0
                                ? tMatching("errors.searchNoResults")
                                : tMatching("errors.searchAlreadyInPipeline")}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={handleSelectAllCandidates}
                                disabled={isVacancyReadOnly}
                                className="font-sans text-sm text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                                aria-label={tMatching("aria.selectAll")}
                              >
                                {tMatching("selectAll")}
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllCandidates}
                                disabled={isVacancyReadOnly}
                                className="font-sans text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                                aria-label={tMatching("aria.deselectAll")}
                              >
                                {tMatching("deselectAll")}
                              </button>
                              {selectedCount > 0 && (
                                <span className="font-sans text-sm text-muted-foreground" aria-live="polite">
                                  {tMatching("selectedCount", { count: selectedCount })}
                                </span>
                              )}
                            </div>
                            <ul className="flex flex-col gap-4" role="list">
                              {searchResultsToDisplay.map((match, index) => {
                                const candidateId = getCandidateId(match, index);
                                return (
                                  <li key={candidateId}>
                                    <MatchCard
                                      match={match}
                                      candidateId={candidateId}
                                      isSelected={selectedCandidateIds.has(candidateId)}
                                      onToggle={handleToggleCandidate}
                                      aiLabel={tMatching("preliminaryMatchBadge")}
                                      readOnly={isVacancyReadOnly}
                                    />
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 2. Posibles candidatos (AI match suggestions) */}
                    <div
                      ref={possibleCandidatesSectionDesktopRef}
                      className="flex flex-col gap-3 scroll-mt-4"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="flex items-center gap-2 font-sans text-lg font-semibold text-foreground">
                          <Users className="h-5 w-5" aria-hidden />
                          {tMatching("possibleCandidates")}
                          <span className="font-sans text-sm font-normal text-muted-foreground">
                            ({vacancyCandidates.length})
                          </span>
                        </h2>
                        <AiDisclosureBadge label={tMatching("preliminaryAnalysisBadge")} />
                        <button
                          type="button"
                          disabled={
                            isVacancyReadOnly ||
                            selectedPossibleCandidateIds.size === 0 ||
                            loadingStartProcess
                          }
                          className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-vo-purple"
                          aria-label={tMatching("includeSelectedHint")}
                          onClick={handleStartProcess}
                        >
                          {loadingStartProcess ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          {loadingStartProcess ? tMatching("including") : tMatching("includeInProcess")}
                        </button>
                      </div>
                      {startProcessError && (
                        <p className="font-sans text-sm text-destructive" role="alert">
                          {startProcessError}
                        </p>
                      )}
                      <div
                        className="rounded-xl border border-border bg-card p-6"
                        aria-label={tMatching("aria.possibleCandidates")}
                      >
                        {vacancyCandidates.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
                            <p className="font-sans text-sm text-muted-foreground">
                              {tMatching("noSuggestions")}
                            </p>
                          </div>
                        ) : (
                          <ul className="flex flex-col gap-4" role="list">
                            {vacancyCandidates.map((match, index) => {
                              const candidateId = getCandidateId(match, index);
                              return (
                                <li key={candidateId}>
                                  <MatchCard
                                    match={match}
                                    candidateId={candidateId}
                                    isSelected={selectedPossibleCandidateIds.has(candidateId)}
                                    onToggle={handleTogglePossibleCandidate}
                                    showVerPerfil
                                    aiLabel={tMatching("aiSuggestionBadge")}
                                    readOnly={isVacancyReadOnly}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* 3. Kanban board (applicants) */}
                    <div
                      ref={etapasSectionDesktopRef}
                      className="flex flex-col gap-3 scroll-mt-4"
                    >
                      <h2 className="flex items-center gap-2 font-sans text-lg font-semibold text-foreground">
                        <Users className="h-5 w-5" aria-hidden />
                        {tMatching("stagesTitle")}
                        <span className="font-sans text-sm font-normal text-muted-foreground">
                          ({applicants.length})
                        </span>
                      </h2>
                      <MoveStageErrorBanner error={applicationStatusError} />
                      <div
                        className="rounded-xl border border-border bg-card p-6"
                        aria-label={tMatching("kanbanBoardAria")}
                      >
                        {applicants.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
                            <p className="font-sans text-sm text-muted-foreground">
                              {tMatching("emptyApplicants")}
                            </p>
                          </div>
                        ) : (
                          <div
                            className="flex gap-4 overflow-x-auto pb-2"
                            role="region"
                            aria-label={tMatching("kanbanStagesAria")}
                          >
                            {candidatesByStage.map(({ stage, candidates: stageCandidates }) => (
                              <KanbanColumn
                                key={stage}
                                stage={stage}
                                candidates={stageCandidates}
                                onDrop={handleKanbanStageDrop}
                                onDragEnter={handleKanbanDragEnter}
                                onDragLeave={handleKanbanDragLeave}
                                isOver={dragOverStage === stage}
                                statuses={statuses}
                                candidateStatusOverrides={candidateStatusOverrides}
                                onStatusChange={handleStatusChange}
                                updatingStatusCandidateId={updatingStatusCandidateId}
                                vacancyId={id != null ? String(id) : null}
                                vacancyTitle={vacancy?.title ?? ""}
                                readOnly={isVacancyReadOnly}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile — fixed height so only main scrolls */}
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel={breadcrumbLabel}
          breadcrumbTrail={breadcrumbTrail}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col p-4 md:p-6">
            {loading ? (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
                aria-live="polite"
              >
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
                  aria-hidden
                />
                <p className="font-sans text-sm text-muted-foreground">
                  {tDetail("loadingStates.loading")}
                </p>
              </div>
            ) : fetchError ? (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
                role="alert"
              >
                <p className="font-sans text-sm text-destructive">
                  {fetchError}
                </p>
                <Link
                  href="/portal-rrhh/vacantes"
                  className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {tDetail("actions.backToVacancies")}
                </Link>
                <button
                  type="button"
                  onClick={fetchVacancy}
                  className="font-sans text-sm text-vo-purple hover:underline"
                >
                  Reintentar
                </button>
              </div>
            ) : vacancy ? (
              <>
                <div className="mb-4">
                  <Link
                    href="/portal-rrhh/vacantes"
                    className="inline-flex w-fit items-center gap-2 font-sans text-sm text-gray-600 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    aria-label={tDetail("actions.backToVacanciesAria")}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    {tDetail("actions.backToVacancies")}
                  </Link>
                </div>

                {isVacancyReadOnly ? (
                  <div className="mb-4">
                    <VacancyReadOnlyBanner reason={vacancyReadOnlyReason ?? "vacancy"} />
                  </div>
                ) : null}

                <section
                  className="mb-6 rounded-xl border border-border bg-card p-5"
                  aria-label={tDetail("page.vacancyInfoAria")}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      {companyLogoSrc ? (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-background">
                          <img
                            src={companyLogoSrc}
                            alt={tDetail("page.logoAlt", { company: vacancyCompanyDisplayName })}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10"
                          aria-hidden
                        >
                          <Briefcase
                            className="h-6 w-6 text-vo-purple"
                            aria-hidden
                          />
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        {isEditing ? (
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                              <label className="font-sans text-sm font-medium text-foreground" htmlFor="edit-vacancy-title-mobile">
                                {t("form.fields.name.label")} <span className="text-vo-pink">*</span>
                              </label>
                              <input
                                id="edit-vacancy-title-mobile"
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                aria-invalid={!!editErrors.title}
                                aria-describedby={editErrors.title ? "edit-title-error-mobile" : undefined}
                                placeholder={t("form.fields.name.placeholder")}
                              />
                              {editErrors.title && (
                                <p id="edit-title-error-mobile" className="font-sans text-sm text-vo-pink" role="alert">
                                  {editErrors.title}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <label
                                className="font-sans text-sm font-medium text-foreground"
                                htmlFor="edit-vacancy-company-mobile"
                              >
                                {t("form.fields.client.label")}
                              </label>
                              <select
                                id="edit-vacancy-company-mobile"
                                value={editCompanyId}
                                onChange={(e) => setEditCompanyId(e.target.value)}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={t("form.fields.client.ariaLabel")}
                                disabled={loadingCompanies || companySelectOptions.length === 0}
                              >
                                {companySelectOptions.map((company) => (
                                  <option key={company.id} value={company.id}>
                                    {company.name}
                                  </option>
                                ))}
                              </select>
                              <p className="font-sans text-xs text-muted-foreground">
                                {tDetail("actions.companyChangeHint")}
                              </p>
                            </div>
                            <VacancyLocationFields
                                countryCode={editCountryCode}
                                stateCode={editStateCode}
                                onChange={({ countryCode, stateCode }) => {
                                  setEditCountryCode(countryCode)
                                  setEditStateCode(stateCode)
                                }}
                                countrySelectId="edit-vacancy-country-mobile"
                                stateSelectId="edit-vacancy-state-mobile"
                                countryLabel={t("form.fields.country.label")}
                                stateLabel={t("form.fields.state.label")}
                                disabled={savingVacancy}
                              />
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                  <label className="font-sans text-sm font-medium text-foreground" htmlFor="edit-vacancy-department-mobile">
                                    {t("form.fields.department.label")}
                                  </label>
                                  <select
                                    id="edit-vacancy-department-mobile"
                                    value={editVacancyDepartmentId}
                                    onChange={(e) => setEditVacancyDepartmentId(e.target.value)}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={t("form.fields.department.ariaLabel")}
                                    disabled={loadingVacancyCatalogs}
                                  >
                                    <option value="">{t("form.fields.unspecifiedOption")}</option>
                                    {mergedDepartmentOptions.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.displayName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label className="font-sans text-sm font-medium text-foreground" htmlFor="edit-vacancy-modality-mobile">
                                    {t("form.fields.modality.label")}
                                  </label>
                                  <select
                                    id="edit-vacancy-modality-mobile"
                                    value={editVacancyModalityId}
                                    onChange={(e) => setEditVacancyModalityId(e.target.value)}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label={t("form.fields.modality.ariaLabel")}
                                    disabled={loadingVacancyCatalogs}
                                  >
                                    <option value="">{t("form.fields.unspecifiedOption")}</option>
                                    {mergedModalityOptions.map((option) => (
                                      <option key={option.id} value={option.id}>
                                        {option.displayName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            {vacancyCatalogsError ? (
                              <p className="font-sans text-sm text-amber-700" role="status">
                                {vacancyCatalogsError}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <VacancyReadOnlyIdentity
                            title={emptyToDash(vacancy.title)}
                            companyName={vacancyCompanyDisplayName}
                            department={getVacancyDepartmentLabel(vacancy)}
                            modality={getVacancyModalityLabel(vacancy)}
                            countryCode={vacancy.countryCode ?? vacancy.country_code}
                            stateCode={vacancy.stateCode ?? vacancy.state_code}
                            createdAtLabel={tDetail("headerMeta.created", {
                              date: formatShortDate(vacancy.createdAt, locale),
                            })}
                            statusLabel={statusConfig.label}
                            statusClassName={`${statusConfig.bgClass} ${statusConfig.textClass}`}
                            titleClassName="text-xl"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {!isEditing ? (
                        <>
                          {!isVacancyReadOnly ? (
                          <button
                            type="button"
                            onClick={handleEditVacancy}
                            className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                            aria-label={tDetail("actions.editVacancyAria")}
                          >
                            {tDetail("actions.editVacancy")}
                          </button>
                          ) : null}
                          <Link
                            href={`/portal-rrhh/entrevistas/${encodeURIComponent(String(Array.isArray(id) ? id[0] : id ?? ""))}`}
                            className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                            aria-label={tDetail("actions.interviewsAria")}
                          >
                            {tDetail("actions.interviews")}
                          </Link>
                          <Link
                            href={`/portal-rrhh/vacantes/${encodeURIComponent(String(Array.isArray(id) ? id[0] : id ?? ""))}/resultados`}
                            className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                            aria-label={tDetail("actions.resultsAria")}
                          >
                            {tDetail("actions.results")}
                          </Link>
                          <button
                            type="button"
                            onClick={handleCopyVacancy}
                            className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                            aria-label={tDetail("actions.copyAria")}
                          >
                            {tDetail("actions.copy")}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleRequestPaste}
                            disabled={savingVacancy}
                            className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={tForm("actions.pasteAria")}
                          >
                            {tForm("actions.paste")}
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveVacancy}
                            disabled={savingVacancy}
                            className="inline-flex w-fit items-center gap-2 rounded-md bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={tDetail("actions.saveAria")}
                          >
                            {savingVacancy ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                            ) : null}
                            {savingVacancy ? tDetail("actions.saving") : tDetail("actions.save")}
                          </button>
                        </>
                      )}
                    </div>
                    {saveVacancyError && (
                      <p className="font-sans text-sm text-destructive" role="alert">
                        {saveVacancyError}
                      </p>
                    )}
                    {(vacancy.description || vacancy.requirements || vacancy.details || vacancy.salary || vacancy.advantages || isEditing) && (
                      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                        {(vacancy.description || isEditing) && (
                          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <h2 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ats-arena/80 text-gray-700">
                                <FileText className="h-3.5 w-3.5" aria-hidden />
                              </span>
                              {tDetail("sections.description")}
                            </h2>
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  rows={5}
                                  className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
                                  aria-label={t("form.fields.description.label")}
                                  aria-invalid={!!editErrors.description}
                                  aria-describedby={editErrors.description ? "edit-description-error-mobile" : undefined}
                                  placeholder={t("form.fields.description.placeholder")}
                                />
                                {editErrors.description && (
                                  <p id="edit-description-error-mobile" className="font-sans text-sm text-vo-pink" role="alert">
                                    {editErrors.description}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="font-sans text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                {safeString(vacancy.description)}
                              </p>
                            )}
                          </div>
                        )}
                        {(vacancy.salary || isEditing) && (
                          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-sm">
                            <h2 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                                <DollarSign className="h-3.5 w-3.5" aria-hidden />
                              </span>
                              {tDetail("sections.salary")}
                            </h2>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editSalary}
                                onChange={(e) => setEditSalary(e.target.value)}
                                placeholder={t("form.fields.salary.placeholder")}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={t("form.fields.salary.ariaLabel")}
                              />
                            ) : vacancy.salary ? (
                              <p className="font-sans text-lg font-semibold text-foreground">
                                {safeString(vacancy.salary)}
                              </p>
                            ) : (
                              <p className="font-sans text-sm italic text-gray-600">
                                {tDetail("fallbacks.unspecified")}
                              </p>
                            )}
                          </div>
                        )}
                        {(vacancy.details || isEditing) && (
                          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <h2 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                                <Info className="h-3.5 w-3.5" aria-hidden />
                              </span>
                              {tDetail("sections.details")}
                            </h2>
                            {isEditing ? (
                              <textarea
                                value={editDetails}
                                onChange={(e) => setEditDetails(e.target.value)}
                                rows={4}
                                placeholder={t("form.fields.details.placeholder")}
                                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                aria-label={t("form.fields.details.label")}
                              />
                            ) : vacancy.details ? (
                              <VacancyDetailsReadout value={vacancy.details} />
                            ) : (
                              <p className="font-sans text-sm italic text-gray-600">
                                {tDetail("fallbacks.unspecified")}
                              </p>
                            )}
                          </div>
                        )}
                        {(vacancy.requirements || isEditing) && (
                          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                              <h2 className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-vo-purple/15 text-vo-purple">
                                  <CheckSquare className="h-3.5 w-3.5" aria-hidden />
                                </span>
                                {tDetail("sections.requirements")}
                              </h2>
                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={handleAddRequirement}
                                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/10 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                                  aria-label={tDetail("actions.addRequirementAria")}
                                >
                                  <Plus className="h-4 w-4" aria-hidden />
                                  {tDetail("actions.addRequirement")}
                                </button>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                                  {editRequirements.map((req, index) => (
                                    <div
                                      key={req.id}
                                      className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3"
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="space-y-1">
                                          <input
                                            type="text"
                                            value={req.requirementName}
                                            onChange={(e) =>
                                              handleUpdateRequirement(req.id, "requirementName", e.target.value)
                                            }
                                            placeholder={t("form.fields.requirements.namePlaceholder")}
                                            className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                                            aria-label={`Requerimiento ${index + 1} - Nombre`}
                                            aria-invalid={!!editErrors[`req-name-${req.id}`]}
                                          />
                                          {editErrors[`req-name-${req.id}`] && (
                                            <p className="font-sans text-xs text-vo-pink" role="alert">
                                              {editErrors[`req-name-${req.id}`]}
                                            </p>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <input
                                            type="text"
                                            value={req.requirementValue}
                                            onChange={(e) =>
                                              handleUpdateRequirement(req.id, "requirementValue", e.target.value)
                                            }
                                            placeholder={t("form.fields.requirements.valuePlaceholder")}
                                            className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent"
                                            aria-label={`Requerimiento ${index + 1} - Valor`}
                                            aria-invalid={!!editErrors[`req-value-${req.id}`]}
                                          />
                                          {editErrors[`req-value-${req.id}`] && (
                                            <p className="font-sans text-xs text-vo-pink" role="alert">
                                              {editErrors[`req-value-${req.id}`]}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center justify-between">
                                            <label
                                              htmlFor={`edit-scale-mobile-${req.id}`}
                                              className="font-sans text-xs text-muted-foreground"
                                            >
                                              {t("form.fields.requirements.importanceLabel")}
                                            </label>
                                            <span className="font-sans text-xs font-medium text-foreground tabular-nums">
                                              {req.scale}
                                            </span>
                                          </div>
                                          <input
                                            id={`edit-scale-mobile-${req.id}`}
                                            type="range"
                                            min={REQUIREMENT_SCALE_MIN}
                                            max={REQUIREMENT_SCALE_MAX}
                                            value={req.scale}
                                            onChange={(e) =>
                                              handleUpdateRequirement(req.id, "scale", e.target.value)
                                            }
                                            className="h-2 w-full cursor-pointer accent-vo-purple"
                                            aria-label={`Requerimiento ${index + 1} - Nivel promedio del 1 al 10`}
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveRequirement(req.id)}
                                          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                                          aria-label={`Eliminar requerimiento ${index + 1}`}
                                        >
                                          <Trash2 className="h-4 w-4" aria-hidden />
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="font-sans text-xs text-muted-foreground">
                                  {t("form.fields.requirements.helper")}
                                </p>
                              </div>
                            ) : (
                              <RequirementsDisplay
                                value={vacancy.requirements}
                                attributeWeights={vacancy.weights?.attributes}
                              />
                            )}
                          </div>
                        )}

                        {(vacancy.advantages || isEditing) && (
                          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <h2 className="mb-2 flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-vo-pink/10 text-vo-pink">
                                <Gift className="h-3.5 w-3.5" aria-hidden />
                              </span>
                              {tDetail("sections.advantages")}
                            </h2>
                            {isEditing ? (
                              <textarea
                                value={editAdvantages}
                                onChange={(e) => setEditAdvantages(e.target.value)}
                                rows={4}
                                placeholder={t("form.fields.advantages.placeholder")}
                                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                aria-label={t("form.fields.advantages.label")}
                              />
                            ) : vacancy.advantages ? (
                              <VacancyDelimitedText value={vacancy.advantages} variant="list" />
                            ) : (
                              <p className="font-sans text-sm italic text-gray-600">
                                {tDetail("fallbacks.unspecified")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section
                  className="flex flex-col gap-4"
                  aria-label="Candidatos con emparejamiento"
                >
                  <AiDisclosureNotice
                    title={tMatching("sectionTitle")}
                    description={tMatching("sectionDescription")}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    {AI_EFFICIENCY_KPI_KEYS.map((item) => (
                      <AiKpiCard
                        key={item.titleKey}
                        label={tMatching(item.titleKey)}
                        value={tMatching(item.valueKey)}
                        helper={tMatching(item.helperKey)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSearchSmartRecommendations}
                      disabled={loadingSmart || isVacancyReadOnly}
                      className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple/50 bg-vo-purple/10 px-4 py-2.5 font-sans text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/15 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={tMatching("aria.preliminarySearch")}
                      title={vacancyReadOnlyTitle}
                    >
                      {loadingSmart ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                      {loadingSmart
                        ? tMatching("updatingSearch")
                        : tMatching("preliminarySearch")}
                    </button>
                    {displayCandidates.length > 0 && (
                      <button
                        type="button"
                        onClick={handleMatch}
                        disabled={
                          isVacancyReadOnly ||
                          loadingMatch ||
                          selectedDocumentIds.length === 0
                        }
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={tMatching("aria.preliminaryAnalysis")}
                        title={vacancyReadOnlyTitle}
                      >
                        {loadingMatch ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <Scale className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        {loadingMatch ? tMatching("reanalyzing") : tMatching("preliminaryAnalysis")}
                      </button>
                    )}
                  </div>
                  {matchError && (
                    <p className="font-sans text-sm text-destructive" role="alert">
                      {matchError}
                    </p>
                  )}
                  {smartError && (
                    <p className="font-sans text-sm text-destructive" role="alert">
                      {smartError} Puedes continuar con filtros y revisión manual.
                    </p>
                  )}

                  {/* 1. Search container: only result of Search button (exclude already in Posibles candidatos) */}
                  <div className="flex flex-col gap-3">
                    {loadingMatch ? (
                      <div
                        className="w-full max-w-2xl space-y-2"
                        role="status"
                        aria-live="polite"
                        aria-label="Reanalizando con IA"
                      >
                        <AiDisclosurePillProgress
                          percent={null}
                          timeBasedTypicalMs={getVacancyPreliminaryMatchTypicalMsForDocCount(
                            Math.max(1, selectedDocumentIds.length)
                          )}
                          preliminaryMatchStepLabels
                          className="mt-0!"
                          aria-label="Progreso del análisis preliminar con IA"
                        />
                        <p className="font-sans text-sm text-muted-foreground">
                          Reanalizando con IA…
                        </p>
                      </div>
                    ) : null}
                    <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-foreground">
                      <Sparkles className="h-4 w-4" aria-hidden />
                      {tMatching("searchResults")}
                      {smartCandidates !== null && (
                        <span className="font-sans text-sm font-normal text-muted-foreground">
                          ({searchResultsToDisplay.length})
                        </span>
                      )}
                    </h2>
                    <div
                      className="rounded-xl border border-border bg-card p-5"
                      aria-label={tMatching("aria.searchResults")}
                    >
                      {loadingSmart && smartCandidates === null ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                          <div className="w-full max-w-md px-1">
                            <AiDisclosurePillProgress
                              percent={null}
                              timeBasedTypicalMs={VACANCY_SMART_PRELIMINARY_SEARCH_TYPICAL_MS}
                              className="mt-0!"
                              aria-label="Progreso de la búsqueda preliminar con IA"
                            />
                          </div>
                          <p
                            className="font-sans text-sm text-muted-foreground"
                            aria-live="polite"
                          >
                            {tMatching("updatingSearchEllipsis")}
                          </p>
                        </div>
                      ) : smartCandidates === null ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Sparkles className="h-10 w-10 text-muted-foreground" aria-hidden />
                          <p className="font-sans text-sm text-muted-foreground">
                            {tMatching("emptySearch")}
                          </p>
                        </div>
                      ) : searchResultsToDisplay.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
                          <p className="font-sans text-sm text-muted-foreground">
                            {smartCandidates.length === 0
                              ? tMatching("errors.searchNoResults")
                              : tMatching("errors.searchAlreadyInPipeline")}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handleSelectAllCandidates}
                              disabled={isVacancyReadOnly}
                              className="font-sans text-sm text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                              aria-label={tMatching("aria.selectAll")}
                            >
                              {tMatching("selectAll")}
                            </button>
                            <button
                              type="button"
                              onClick={handleDeselectAllCandidates}
                              disabled={isVacancyReadOnly}
                              className="font-sans text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                              aria-label={tMatching("aria.deselectAll")}
                            >
                              {tMatching("deselectAll")}
                            </button>
                            {selectedCount > 0 && (
                              <span className="font-sans text-sm text-muted-foreground" aria-live="polite">
                                {tMatching("selectedCount", { count: selectedCount })}
                              </span>
                            )}
                          </div>
                          <ul className="flex flex-col gap-4" role="list">
                            {searchResultsToDisplay.map((match, index) => {
                              const candidateId = getCandidateId(match, index);
                              return (
                                <li key={candidateId}>
                                  <MatchCard
                                    match={match}
                                    candidateId={candidateId}
                                    isSelected={selectedCandidateIds.has(candidateId)}
                                    onToggle={handleToggleCandidate}
                                    aiLabel={tMatching("preliminaryMatchBadge")}
                                    readOnly={isVacancyReadOnly}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 2. Posibles candidatos (AI match suggestions) */}
                  <div
                    ref={possibleCandidatesSectionMobileRef}
                    className="flex flex-col gap-3 scroll-mt-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-foreground">
                        <Users className="h-4 w-4" aria-hidden />
                        {tMatching("possibleCandidates")}
                        <span className="font-sans text-sm font-normal text-muted-foreground">
                          ({vacancyCandidates.length})
                        </span>
                      </h2>
                      <AiDisclosureBadge label={tMatching("preliminaryAnalysisBadge")} />
                      <button
                        type="button"
                        disabled={
                          isVacancyReadOnly ||
                          selectedPossibleCandidateIds.size === 0 ||
                          loadingStartProcess
                        }
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-vo-purple"
                        aria-label={tMatching("includeSelectedHint")}
                        onClick={handleStartProcess}
                      >
                        {loadingStartProcess ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        {loadingStartProcess ? tMatching("starting") : tMatching("startProcess")}
                      </button>
                    </div>
                    {startProcessError && (
                      <p className="font-sans text-sm text-destructive" role="alert">
                        {startProcessError}
                      </p>
                    )}
                    <div
                      className="rounded-xl border border-border bg-card p-5"
                      aria-label={tMatching("aria.possibleCandidates")}
                    >
                      {vacancyCandidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
                          <p className="font-sans text-sm text-muted-foreground">
                            {tMatching("noSuggestions")}
                          </p>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-4" role="list">
                          {vacancyCandidates.map((match, index) => {
                            const candidateId = getCandidateId(match, index);
                            return (
                              <li key={candidateId}>
                                <MatchCard
                                  match={match}
                                  candidateId={candidateId}
                                  isSelected={selectedPossibleCandidateIds.has(candidateId)}
                                  onToggle={handleTogglePossibleCandidate}
                                  showVerPerfil
                                  aiLabel="Sugerencia IA"
                                  readOnly={isVacancyReadOnly}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* 3. Kanban board (applicants) */}
                  <div
                    ref={etapasSectionMobileRef}
                    className="flex flex-col gap-3 scroll-mt-4"
                  >
                    <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-foreground">
                      <Users className="h-4 w-4" aria-hidden />
                      Etapas
                      <span className="font-sans text-sm font-normal text-muted-foreground">
                        ({applicants.length})
                      </span>
                    </h2>
                    <MoveStageErrorBanner error={applicationStatusError} />
                    <div
                      className="rounded-xl border border-border bg-card p-5"
                      aria-label={tMatching("kanbanBoardAria")}
                    >
                      {applicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
                          <p className="font-sans text-sm text-muted-foreground">
                            {tMatching("emptyApplicants")}
                          </p>
                        </div>
                      ) : (
                        <div
                          className="flex gap-3 overflow-x-auto pb-2"
                          role="region"
                          aria-label={tMatching("kanbanStagesAria")}
                        >
                          {candidatesByStage.map(({ stage, candidates: stageCandidates }) => (
                            <KanbanColumn
                              key={stage}
                              stage={stage}
                              candidates={stageCandidates}
                              onDrop={handleKanbanStageDrop}
                              onDragEnter={handleKanbanDragEnter}
                              onDragLeave={handleKanbanDragLeave}
                              isOver={dragOverStage === stage}
                              statuses={statuses}
                              candidateStatusOverrides={candidateStatusOverrides}
                              onStatusChange={handleStatusChange}
                              updatingStatusCandidateId={updatingStatusCandidateId}
                              vacancyId={id != null ? String(id) : null}
                              vacancyTitle={vacancy?.title ?? ""}
                              readOnly={isVacancyReadOnly}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />

      <FinishVacancyProcessModal
        isOpen={finishProcessModalOpen}
        onClose={() => setFinishProcessModalOpen(false)}
        onConfirm={handleFinishProcess}
        loading={finishingProcess}
      />

      <VacancyPasteConfirmModal
        isOpen={pasteConfirmOpen}
        onClose={handleCancelPaste}
        onConfirm={handleConfirmPaste}
      />
    </div>
  );
}
