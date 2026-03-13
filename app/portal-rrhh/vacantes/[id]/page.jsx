"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  Download,
  FileText,
  Loader2,
  Mail,
  Phone,
  Scale,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import { apiClient } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { getInitials } from "@/lib/getInitials";

const formatDate = (value) => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const emptyToDash = (value) =>
  value != null && String(value).trim() !== "" ? String(value).trim() : "—";

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

const STATUS_LABELS = {
  activa: { label: "Activa", bgClass: "bg-[#DCFCE7]", textClass: "text-[#166534]" },
  cerrada: { label: "Cerrada", bgClass: "bg-muted", textClass: "text-muted-foreground" },
  pausada: { label: "Pausada", bgClass: "bg-amber-100", textClass: "text-amber-800" },
  open: { label: "Abierta", bgClass: "bg-[#DCFCE7]", textClass: "text-[#166534]" },
  closed: { label: "Cerrada", bgClass: "bg-muted", textClass: "text-muted-foreground" },
  paused: { label: "Pausada", bgClass: "bg-amber-100", textClass: "text-amber-800" },
};

const getStatusConfig = (status) => {
  if (!status) return STATUS_LABELS.activa;
  const key = String(status).toLowerCase();
  return STATUS_LABELS[key] ?? STATUS_LABELS.activa;
};

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const FALLBACK_KANBAN_STAGES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
];

const normalizeKanbanStage = (value, stageNames = FALLBACK_KANBAN_STAGES) => {
  if (!stageNames?.length) return FALLBACK_KANBAN_STAGES[0];
  if (value == null || String(value).trim() === "") return stageNames[0];
  const key = String(value).trim().toLowerCase();
  const found = stageNames.find((s) => s.toLowerCase() === key);
  return found ?? stageNames[0];
};

/** Converts a raw score/attribute key into a natural human-readable label. */
const formatScoreKey = (key) => {
  const k = String(key).trim();
  const map = {
    QualitativeScore: "Puntaje cualitativo",
    qualitativeScore: "Puntaje cualitativo",
    qualitative_score: "Puntaje cualitativo",
    VectorSimilarity: "Similitud semántica",
    vectorSimilarity: "Similitud semántica",
    vector_similarity: "Similitud semántica",
    SemanticScore: "Puntaje semántico",
    semanticScore: "Puntaje semántico",
    semantic_score: "Puntaje semántico",
    TotalScore: "Puntaje total",
    totalScore: "Puntaje total",
    total_score: "Puntaje total",
    attribute_aggregate: "Atributos en conjunto",
    AttributeAggregate: "Atributos en conjunto",
    attributeAggregate: "Atributos en conjunto",
    KeywordScore: "Coincidencia de palabras clave",
    keywordScore: "Coincidencia de palabras clave",
    keyword_score: "Coincidencia de palabras clave",
    ExperienceScore: "Experiencia",
    experienceScore: "Experiencia",
    experience_score: "Experiencia",
    EducationScore: "Educación",
    educationScore: "Educación",
    education_score: "Educación",
    SkillsScore: "Habilidades",
    skillsScore: "Habilidades",
    skills_score: "Habilidades",
  };
  if (map[k]) return map[k];

  // Handle attr_* prefix (e.g. attr_reactjs -> React.js)
  const attrMatch = k.match(/^attr_(.+)$/i);
  if (attrMatch) {
    const inner = attrMatch[1];
    const knownAttr = {
      reactjs: "React.js", nextjs: "Next.js", tailwindcss: "Tailwind CSS",
      javascript: "JavaScript", typescript: "TypeScript", html: "HTML", css: "CSS",
    };
    return knownAttr[inner.toLowerCase()] ?? (inner.charAt(0).toUpperCase() + inner.slice(1));
  }

  // Convert camelCase / snake_case to words
  const words = k
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Formats requirement key for display (e.g. reactjs -> React.js). */
const formatRequirementKey = (key) => {
  const k = String(key).trim().toLowerCase();
  const map = {
    reactjs: "React.js",
    nextjs: "Next.js",
    tailwindcss: "Tailwind CSS",
    javascript: "JavaScript",
    typescript: "TypeScript",
    html: "HTML",
    css: "CSS",
  };
  return map[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
};

/** Renders requirements as string (list/paragraphs), object (key -> level), or array (bullet list). attributeWeights optional: key -> weight to show next to each requirement value. */
const RequirementsDisplay = ({ value, attributeWeights }) => {
  if (value == null) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value).filter(
      ([k]) => k != null && !String(k).startsWith("additionalProp")
    );
    if (entries.length === 0) return null;
    const weights =
      attributeWeights && typeof attributeWeights === "object"
        ? attributeWeights
        : {};
    return (
      <ul className="flex flex-col gap-2 font-inter text-sm text-muted-foreground" role="list">
        {entries.map(([key, val]) => {
          const levelText =
            typeof val === "object" && val !== null
              ? Object.entries(val)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")
              : String(val ?? "—");
          const weight =
            typeof weights[key] === "number" && Number.isFinite(weights[key])
              ? weights[key]
              : null;
          return (
            <li
              key={key}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="requirement_key inline-flex items-center gap-1.5 rounded-md bg-vo-purple/10 px-2.5 py-1 font-medium text-vo-purple">
                {formatRequirementKey(key)}
              </span>
              <span className="requirement_value inline-flex items-center rounded-md bg-vo-sky/10 px-2.5 py-1 text-vo-sky">
                {levelText}
              </span>
              {weight != null && (
                <span className="requirement_weight inline-flex items-center gap-1.5 rounded-md bg-vo-pink/10 px-2.5 py-1 text-vo-pink">
                  <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {weight * 10}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  if (Array.isArray(value)) {
    const items = value.filter((item) => item != null && String(item).trim() !== "");
    if (items.length === 0) return null;
    return (
      <ul className="list-inside list-disc space-y-1.5 font-inter text-sm text-muted-foreground" role="list">
        {items.map((item, i) => (
          <li key={i}>{typeof item === "object" ? safeString(item) : String(item)}</li>
        ))}
      </ul>
    );
  }

  const text = typeof value === "string" ? value.trim() : String(value);
  if (text === "") return null;

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const looksLikeList = lines.length > 1 && lines.some(
    (line) => /^[-*•]\s/.test(line) || /^\d+[.)]\s/.test(line)
  );

  if (looksLikeList) {
    return (
      <ul className="list-inside space-y-1.5 font-inter text-sm text-muted-foreground" role="list">
        {lines.map((line, i) => (
          <li key={i} className="pl-0">
            {line.replace(/^[-*•]\s/, "").replace(/^\d+[.)]\s/, "")}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2 font-inter text-sm text-muted-foreground">
      {lines.map((line, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </div>
  );
};

const CandidateProfileModal = ({ match, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDownloadCV = async () => {
    if (!match.storagePath) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const token = getAccessToken();
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const url = `${baseUrl}/api/Storage/files/${encodeURIComponent(match.storagePath)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("No se pudo descargar el CV.");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = match.storagePath.split("/").pop() || "cv.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      setDownloadError(err?.message ?? "Error al descargar.");
    } finally {
      setDownloading(false);
    }
  };

  const componentScores =
    match.componentScores && typeof match.componentScores === "object" && !Array.isArray(match.componentScores)
      ? Object.entries(match.componentScores).filter(([k]) => !k.startsWith("additionalProp"))
      : [];

  const qualitativeReasoning =
    match.qualitativeReasoning != null && String(match.qualitativeReasoning).trim() !== ""
      ? String(match.qualitativeReasoning).trim()
      : null;

  const initials = getInitials(
    emptyToDash(match.name) !== "—" ? match.name : "",
    match.email ?? ""
  );

  const hasContent = componentScores.length > 0 || qualitativeReasoning != null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Perfil de ${emptyToDash(match.name)}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-white shadow-xl dark:bg-card">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vo-purple font-inter text-base font-semibold text-white"
              aria-hidden
            >
              {initials}
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-inter text-lg font-semibold text-foreground">
                {emptyToDash(match.name)}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-inter text-sm text-muted-foreground">
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
              <p className="font-inter text-xs text-muted-foreground">
                Subido: {formatDate(match.uploadedAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <User className="h-10 w-10 text-muted-foreground" aria-hidden />
              <p className="font-inter text-sm text-muted-foreground">
                No hay información adicional disponible.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Component Scores */}
              {componentScores.length > 0 && (
                <div>
                  <h3 className="mb-3 font-inter text-sm font-semibold text-foreground">
                    Puntuación por componente
                  </h3>
                  <ul className="flex flex-col gap-2.5" role="list">
                    {componentScores.map(([key, val]) => {
                      const pct = typeof val === "number" ? (val * 100).toFixed(1) : null;
                      const barWidth = typeof val === "number" ? Math.min(val * 100, 100) : 0;
                      return (
                        <li key={key} className="flex items-center gap-3">
                          <span className="w-40 shrink-0 font-inter text-xs text-muted-foreground">
                            {formatScoreKey(key)}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-vo-purple transition-all"
                              style={{ width: `${barWidth}%` }}
                              aria-hidden
                            />
                          </div>
                          <span className="w-14 text-right font-inter text-xs font-medium text-foreground">
                            {pct != null ? `${pct}%` : safeString(val)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Qualitative Reasoning */}
              {qualitativeReasoning != null && (
                <div>
                  <h3 className="mb-3 font-inter text-sm font-semibold text-foreground">
                    Razonamiento cualitativo
                  </h3>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="font-inter text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {qualitativeReasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-6">
          <div>
            {downloadError && (
              <p className="font-inter text-xs text-destructive" role="alert">
                {downloadError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {match.storagePath && (
              <button
                type="button"
                onClick={handleDownloadCV}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Descargar CV del candidato"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {downloading ? "Descargando..." : "Descargar CV"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-4 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              aria-label="Cerrar perfil"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MatchCard = ({ match, candidateId, isSelected, onToggle, showVerPerfil = false }) => {
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
        aria-label={`Candidato ${emptyToDash(match.name)}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex shrink-0 items-start gap-3">
              <label
                className="flex cursor-pointer items-center justify-center focus-within:ring-2 focus-within:ring-vo-purple focus-within:ring-offset-2 rounded"
                aria-label={`Seleccionar ${emptyToDash(match.name)}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected ?? false}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-border text-vo-purple focus:ring-vo-purple focus:ring-offset-0 cursor-pointer"
                  aria-label={`Seleccionar candidato ${emptyToDash(match.name)}`}
                />
              </label>
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vo-purple font-inter text-base font-semibold text-white"
                aria-hidden
              >
                {initials}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="font-inter text-base font-semibold text-foreground">
                {emptyToDash(match.name)}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-inter text-sm text-muted-foreground">
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
              <p className="font-inter text-xs text-muted-foreground">
                Subido: {formatDate(match.uploadedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center rounded-lg bg-muted/50 px-4 py-2">
              <span className="font-inter text-lg font-semibold text-foreground">
                {typeof (match.semanticScore ?? match.totalScore) === "number"
                  ? ((match.semanticScore ?? match.totalScore) * 100).toFixed(2)
                  : "—"}
              </span>
              <span className="font-inter text-xs text-muted-foreground">
                Puntaje
              </span>
            </div>
            {showVerPerfil && (
              <button
                type="button"
                onClick={handleOpenModal}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                aria-label={`Ver perfil de ${emptyToDash(match.name)}`}
              >
                <User className="h-4 w-4" aria-hidden />
                Ver perfil
              </button>
            )}
          </div>
        </div>
      </article>
      {showVerPerfil && showModal && (
        <CandidateProfileModal match={match} onClose={handleCloseModal} />
      )}
    </>
  );
};

const mapStatusFromApi = (item, index = 0) => {
  const id = String(item?.id ?? item?.uuid ?? index);
  const name = item?.name ?? item?.status_name ?? "";
  return { id, name };
};

const KanbanCard = ({
  match,
  candidateId,
  stage,
  statuses,
  currentStatusId,
  onStatusChange,
}) => {
  const initials = getInitials(
    emptyToDash(match.name) !== "—" ? match.name : "",
    match.email ?? ""
  );
  const rawScore = match.semanticScore ?? match.totalScore;
  const score = typeof rawScore === "number" ? (rawScore * 100).toFixed(0) : "—";

  const handleDragStart = (e) => {
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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing data-[dragging=true]:opacity-50 data-[dragging=true]:cursor-grabbing"
      role="button"
      tabIndex={0}
      aria-label={`Mover ${emptyToDash(match.name)} a otra etapa`}
      aria-describedby={`kanban-card-${candidateId}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vo-purple font-inter text-sm font-semibold text-white"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1" id={`kanban-card-${candidateId}`}>
          <p className="truncate font-inter text-sm font-medium text-foreground">
            {emptyToDash(match.name)}
          </p>
          <p className="flex items-center gap-1.5 font-inter text-xs text-muted-foreground">
            <span>Puntaje: {score}</span>
          </p>
        </div>
        {statuses.length > 0 ? (
          <select
            value={currentStatusId ?? ""}
            onChange={handleStatusChange}
            onMouseDown={handleSelectMouseDown}
            onClick={handleSelectClick}
            className="shrink-0 rounded-md border border-border bg-background px-2.5 py-1.5 font-inter text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label={`Estado de ${emptyToDash(match.name)}`}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.id}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
};

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
}) => {
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e) => {
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
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    onDragEnter?.(stage);
  };

  const handleDragLeave = (e) => {
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

  return (
    <div
      className="flex min-h-[320px] min-w-[400px] max-w-[520px] flex-1 flex-col rounded-xl border border-border bg-muted/30"
      aria-label={`Columna ${stage}`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-inter text-sm font-semibold text-foreground">
          {stage}
        </h3>
        <span
          className="rounded-full bg-muted px-2 py-0.5 font-inter text-xs text-muted-foreground"
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
          />
        ))}
      </div>
    </div>
  );
};

export default function VacanteDetallePage() {
  const params = useParams();
  const id = params?.id ?? null;
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
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
  const [moveStageError, setMoveStageError] = useState(null);
  const [loadingMoveStage, setLoadingMoveStage] = useState(false);

  const fetchStages = useCallback(async () => {
    try {
      const data = await apiClient.get(
        `/api/recruiter/companies/${COMPANY_ID}/stages`
      );
      const list = Array.isArray(data) ? data : data?.stages ?? data?.items ?? data?.data ?? [];
      const mapped = list.map((item, i) => ({
        id: String(item?.id ?? item?.uuid ?? i),
        name: item.name ?? item.stage_name ?? "",
        order: item.orderIndex ?? item.order ?? i,
      }));
      setStages(mapped.sort((a, b) => a.order - b.order));
    } catch {
      setStages([]);
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await apiClient.get(
        `/api/recruiter/companies/${COMPANY_ID}/statuses`
      );
      const list = Array.isArray(data) ? data : data?.statuses ?? data?.items ?? data?.data ?? [];
      setStatuses(list.map((item, i) => mapStatusFromApi(item, i)));
    } catch {
      setStatuses([]);
    }
  }, []);

  const fetchVacancy = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setFetchError("Falta el ID de la vacante.");
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get(`/api/recruiter/vacancies/${id}`);
      setVacancy(data);
    } catch (err) {
      setFetchError(
        err?.message ?? err?.detail ?? "No se pudo cargar la vacante."
      );
      setVacancy(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVacancy();
  }, [fetchVacancy]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const kanbanStageNames = useMemo(
    () =>
      stages.length > 0
        ? stages.map((s) => s.name).filter(Boolean)
        : FALLBACK_KANBAN_STAGES,
    [stages]
  );

  const handleSearchSmartRecommendations = useCallback(async () => {
    if (!id) return;
    setLoadingSmart(true);
    setSmartError(null);
    setSmartCandidates(null);
    try {
      const url = `/api/recruiter/vacancies/${id}/search-candidates?limit=20&minScore=0.7`;
      const data = await apiClient.post(url, {});
      const list = Array.isArray(data) ? data : data?.candidates ?? data?.results ?? [];
      setSmartCandidates(list);
    } catch (err) {
      setSmartError(
        err?.message ?? err?.detail ?? "No se pudo cargar el match."
      );
      setSmartCandidates([]);
    } finally {
      setLoadingSmart(false);
    }
  }, [id]);

  useEffect(() => {
    if (vacancy?.title) {
      document.title = `ATS | ${vacancy.title}`;
    }
  }, [vacancy?.title]);

  const statusConfig = vacancy ? getStatusConfig(vacancy.status) : STATUS_LABELS.activa;
  /** AI match suggestions from vacancy (for "Posibles candidatos" container). */
  const vacancyCandidates = Array.isArray(vacancy?.aiMatchSuggestions)
    ? vacancy.aiMatchSuggestions
    : Array.isArray(vacancy?.matches)
      ? vacancy.matches
      : [];

  /** Applicants for Kanban board. */
  const applicants = Array.isArray(vacancy?.applicants) ? vacancy.applicants : [];

  const getCandidateId = (match, index) =>
    match.candidateDocumentId ?? match.candidateProfileId ?? match?.id ?? `candidate-${index}`;

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

  const candidatesByStage = useMemo(() => {
    if (applicants.length === 0) {
      return kanbanStageNames.map((stage) => ({ stage, candidates: [] }));
    }
    const withMeta = applicants.map((match, i) => {
      const candidateId = getCandidateId(match, i);
      const stage =
        candidateStageOverrides[candidateId] ??
        normalizeKanbanStage(match.applicationStage ?? match.stage, kanbanStageNames);
      return { match, candidateId, stage };
    });
    return kanbanStageNames.map((stage) => ({
      stage,
      candidates: withMeta
        .filter((c) => c.stage === stage)
        .map((c) => ({ match: c.match, candidateId: c.candidateId })),
    }));
  }, [applicants, candidateStageOverrides, kanbanStageNames]);

  const handleKanbanStageDrop = useCallback(
    async (candidateId, newStage) => {
      setMoveStageError(null);
      const applicant = applicants.find(
        (m, i) => getCandidateId(m, i) === candidateId
      );
      const applicationId = applicant?.applicationId ?? applicant?.application_id;
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
        } catch (err) {
          const message =
            err?.message ?? err?.detail ?? "No se pudo mover el candidato de etapa.";
          setMoveStageError(message);
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
    [applicants, stages]
  );

  const handleKanbanDragEnter = useCallback((stage) => {
    setDragOverStage(stage);
  }, []);

  const handleKanbanDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleStatusChange = useCallback((candidateId, statusId) => {
    setCandidateStatusOverrides((prev) => ({ ...prev, [candidateId]: statusId }));
  }, []);

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
    if (!id) return;
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
      await fetchVacancy();
    } catch (err) {
      setStartProcessError(
        err?.message ?? err?.detail ?? "No se pudo iniciar el proceso."
      );
    } finally {
      setLoadingStartProcess(false);
    }
  }, [id, vacancyCandidates, selectedPossibleCandidateIds, fetchVacancy]);

  /** Selected candidate document IDs to send to the match API. */
  const selectedDocumentIds = displayCandidates
    .map((m, i) => (selectedCandidateIds.has(getCandidateId(m, i)) ? m.candidateDocumentId : null))
    .filter((docId) => docId != null && String(docId).trim() !== "");

  const handleMatch = useCallback(async () => {
    if (!id) return;
    const docIds = displayCandidates
      .map((m, i) => (selectedCandidateIds.has(getCandidateId(m, i)) ? m.candidateDocumentId : null))
      .filter((docId) => docId != null && String(docId).trim() !== "");
    if (docIds.length === 0) return;
    setLoadingMatch(true);
    setMatchError(null);
    try {
      await apiClient.post(`/api/recruiter/vacancies/${id}/match`, docIds);
      window.location.reload();
    } catch (err) {
      setMatchError(
        err?.message ?? err?.detail ?? "No se pudo ejecutar el match."
      );
    } finally {
      setLoadingMatch(false);
    }
  }, [id, displayCandidates, selectedCandidateIds]);

  const selectedCount = selectedCandidateIds.size;

  const breadcrumbLabel = vacancy?.title ? vacancy.title : "Detalle de vacante";

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel={breadcrumbLabel} />
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
                  <p className="font-inter text-sm text-muted-foreground">
                    Cargando vacante...
                  </p>
                </div>
              ) : fetchError ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
                  role="alert"
                >
                  <p className="font-inter text-sm text-destructive">
                    {fetchError}
                  </p>
                  <Link
                    href="/portal-rrhh/vacantes"
                    className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Volver a vacantes
                  </Link>
                  <button
                    type="button"
                    onClick={fetchVacancy}
                    className="font-inter text-sm text-vo-purple hover:underline"
                  >
                    Reintentar
                  </button>
                </div>
              ) : vacancy ? (
                <>
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href="/portal-rrhh/vacantes"
                      className="inline-flex w-fit items-center gap-2 font-inter text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                      aria-label="Volver a vacantes"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                      Volver a vacantes
                    </Link>
                  </div>

                  <section
                    className="mb-8 rounded-xl border border-border bg-card p-6"
                    aria-label="Información de la vacante"
                  >
                    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10"
                          aria-hidden
                        >
                          <Briefcase
                            className="h-7 w-7 text-vo-purple"
                            aria-hidden
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <h1 className="font-inter text-2xl font-bold text-foreground">
                            {emptyToDash(vacancy.title)}
                          </h1>
                          <div className="flex flex-wrap items-center gap-4 font-inter text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                              {emptyToDash(vacancy.department)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                              Creada: {formatDate(vacancy.createdAt)}
                            </span>
                          </div>
                          <span
                            className={`inline-flex w-fit rounded-xl px-2.5 py-1 font-inter text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {(vacancy.description || vacancy.requirements) && (
                      <div className="mt-6 grid gap-6 border-t border-border pt-6 md:grid-cols-2">
                        {vacancy.description && (
                          <div>
                            <h2 className="mb-2 flex items-center gap-2 font-inter text-sm font-semibold text-foreground">
                              <FileText className="h-4 w-4" aria-hidden />
                              Descripción
                            </h2>
                            <p className="font-inter text-sm text-muted-foreground whitespace-pre-wrap">
                              {safeString(vacancy.description)}
                            </p>
                          </div>
                        )}
                        {vacancy.requirements && (
                          <div>
                            <h2 className="mb-2 flex items-center gap-2 font-inter text-sm font-semibold text-foreground">
                              <CheckSquare className="h-4 w-4" aria-hidden />
                              Requisitos
                            </h2>
                            <RequirementsDisplay
                              value={vacancy.requirements}
                              attributeWeights={vacancy.weights?.attributes}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <section
                    className="flex flex-col gap-4"
                    aria-label="Candidatos con match"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSearchSmartRecommendations}
                        disabled={loadingSmart}
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple/5 px-4 py-2.5 font-inter text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/10 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-50"
                        aria-label="Buscar"
                      >
                        {loadingSmart ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        {loadingSmart
                          ? "Buscando..."
                          : "Buscar"}
                      </button>
                      {displayCandidates.length > 0 && (
                        <button
                          type="button"
                          onClick={handleMatch}
                          disabled={loadingMatch || selectedDocumentIds.length === 0}
                          className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple px-4 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Preparar candidatos seleccionados"
                        >
                          {loadingMatch ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <Scale className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          {loadingMatch ? "Preparando..." : "Preparar"}
                        </button>
                      )}
                    </div>
                    {matchError && (
                      <p className="font-inter text-sm text-destructive" role="alert">
                        {matchError}
                      </p>
                    )}
                    {smartError && (
                      <p className="font-inter text-sm text-destructive" role="alert">
                        {smartError}
                      </p>
                    )}

                    {/* 1. Search container: only result of Search button (exclude already in Posibles candidatos) */}
                    <div className="flex flex-col gap-3">
                      <h2 className="flex items-center gap-2 font-inter text-lg font-semibold text-foreground">
                        <Sparkles className="h-5 w-5" aria-hidden />
                        Resultados de búsqueda
                        {smartCandidates !== null && (
                          <span className="font-inter text-sm font-normal text-muted-foreground">
                            ({searchResultsToDisplay.length})
                          </span>
                        )}
                      </h2>
                      <div
                        className="rounded-xl border border-border bg-card p-6"
                        aria-label="Resultados de búsqueda"
                      >
                        {smartCandidates === null ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <Sparkles className="h-12 w-12 text-muted-foreground" aria-hidden />
                            <p className="font-inter text-sm text-muted-foreground">
                              Haz clic en Search para ver candidatos recomendados.
                            </p>
                          </div>
                        ) : searchResultsToDisplay.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
                            <p className="font-inter text-sm text-muted-foreground">
                              {smartCandidates.length === 0
                                ? "No se encontraron candidatos en la búsqueda."
                                : "Los candidatos encontrados ya están en Posibles candidatos o en Etapas."}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={handleSelectAllCandidates}
                                className="font-inter text-sm text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
                                aria-label="Seleccionar todos los candidatos"
                              >
                                Seleccionar todos
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllCandidates}
                                className="font-inter text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
                                aria-label="Desmarcar todos los candidatos"
                              >
                                Desmarcar todos
                              </button>
                              {selectedCount > 0 && (
                                <span className="font-inter text-sm text-muted-foreground" aria-live="polite">
                                  {selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}
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
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="flex items-center gap-2 font-inter text-lg font-semibold text-foreground">
                          <Users className="h-5 w-5" aria-hidden />
                          Posibles candidatos
                          <span className="font-inter text-sm font-normal text-muted-foreground">
                            ({vacancyCandidates.length})
                          </span>
                        </h2>
                        <button
                          type="button"
                          disabled={selectedPossibleCandidateIds.size === 0 || loadingStartProcess}
                          className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple px-4 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-vo-purple"
                          aria-label="Iniciar proceso con candidatos seleccionados"
                          onClick={handleStartProcess}
                        >
                          {loadingStartProcess ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          ) : (
                            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                          {loadingStartProcess ? "Iniciando..." : "Iniciar proceso"}
                        </button>
                      </div>
                      {startProcessError && (
                        <p className="font-inter text-sm text-destructive" role="alert">
                          {startProcessError}
                        </p>
                      )}
                      <div
                        className="rounded-xl border border-border bg-card p-6"
                        aria-label="Posibles candidatos"
                      >
                        {vacancyCandidates.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
                            <p className="font-inter text-sm text-muted-foreground">
                              No hay sugerencias de match para esta vacante.
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
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* 3. Kanban board (applicants) */}
                    <div className="flex flex-col gap-3">
                      <h2 className="flex items-center gap-2 font-inter text-lg font-semibold text-foreground">
                        <Users className="h-5 w-5" aria-hidden />
                        Etapas
                        <span className="font-inter text-sm font-normal text-muted-foreground">
                          ({applicants.length})
                        </span>
                      </h2>
                      {moveStageError && (
                        <p className="font-inter text-sm text-destructive" role="alert">
                          {moveStageError}
                        </p>
                      )}
                      <div
                        className="rounded-xl border border-border bg-card p-6"
                        aria-label="Contenedor del tablero Kanban"
                      >
                        {applicants.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
                            <p className="font-inter text-sm text-muted-foreground">
                              Aún no hay postulantes en esta vacante.
                            </p>
                          </div>
                        ) : (
                          <div
                            className="flex gap-4 overflow-x-auto pb-2"
                            role="region"
                            aria-label="Etapas de candidatos"
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
        <RRHHTopbar variant="tablet" breadcrumbLabel={breadcrumbLabel} />
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
                <p className="font-inter text-sm text-muted-foreground">
                  Cargando vacante...
                </p>
              </div>
            ) : fetchError ? (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
                role="alert"
              >
                <p className="font-inter text-sm text-destructive">
                  {fetchError}
                </p>
                <Link
                  href="/portal-rrhh/vacantes"
                  className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Volver a vacantes
                </Link>
                <button
                  type="button"
                  onClick={fetchVacancy}
                  className="font-inter text-sm text-vo-purple hover:underline"
                >
                  Reintentar
                </button>
              </div>
            ) : vacancy ? (
              <>
                <div className="mb-4">
                  <Link
                    href="/portal-rrhh/vacantes"
                    className="inline-flex w-fit items-center gap-2 font-inter text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    aria-label="Volver a vacantes"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Volver a vacantes
                  </Link>
                </div>

                <section
                  className="mb-6 rounded-xl border border-border bg-card p-5"
                  aria-label="Información de la vacante"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10"
                        aria-hidden
                      >
                        <Briefcase
                          className="h-6 w-6 text-vo-purple"
                          aria-hidden
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <h1 className="font-inter text-xl font-bold text-foreground">
                          {emptyToDash(vacancy.title)}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 font-inter text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {emptyToDash(vacancy.department)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {formatDate(vacancy.createdAt)}
                          </span>
                        </div>
                        <span
                          className={`inline-flex w-fit rounded-xl px-2.5 py-1 font-inter text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    {(vacancy.description || vacancy.requirements) && (
                      <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
                        {vacancy.description && (
                          <div>
                            <h2 className="mb-1.5 flex items-center gap-2 font-inter text-sm font-semibold text-foreground">
                              <FileText className="h-3.5 w-3.5" aria-hidden />
                              Descripción
                            </h2>
                            <p className="font-inter text-sm text-muted-foreground whitespace-pre-wrap">
                              {safeString(vacancy.description)}
                            </p>
                          </div>
                        )}
                        {vacancy.requirements && (
                          <div>
                            <h2 className="mb-1.5 flex items-center gap-2 font-inter text-sm font-semibold text-foreground">
                              <CheckSquare className="h-3.5 w-3.5" aria-hidden />
                              Requisitos
                            </h2>
                            <RequirementsDisplay
                              value={vacancy.requirements}
                              attributeWeights={vacancy.weights?.attributes}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section
                  className="flex flex-col gap-4"
                  aria-label="Candidatos con match"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSearchSmartRecommendations}
                      disabled={loadingSmart}
                      className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple/5 px-4 py-2.5 font-inter text-sm font-medium text-vo-purple transition-colors hover:bg-vo-purple/10 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-50"
                      aria-label="Buscar"
                    >
                      {loadingSmart ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                      {loadingSmart
                        ? "Buscando..."
                        : "Buscar"}
                    </button>
                    {displayCandidates.length > 0 && (
                      <button
                        type="button"
                        onClick={handleMatch}
                        disabled={loadingMatch || selectedDocumentIds.length === 0}
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple px-4 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Preparar candidatos seleccionados"
                      >
                        {loadingMatch ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <Scale className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        {loadingMatch ? "Preparando..." : "Preparar"}
                      </button>
                    )}
                  </div>
                  {matchError && (
                    <p className="font-inter text-sm text-destructive" role="alert">
                      {matchError}
                    </p>
                  )}
                  {smartError && (
                    <p className="font-inter text-sm text-destructive" role="alert">
                      {smartError}
                    </p>
                  )}

                  {/* 1. Search container: only result of Search button (exclude already in Posibles candidatos) */}
                  <div className="flex flex-col gap-3">
                    <h2 className="flex items-center gap-2 font-inter text-base font-semibold text-foreground">
                      <Sparkles className="h-4 w-4" aria-hidden />
                      Resultados de búsqueda
                      {smartCandidates !== null && (
                        <span className="font-inter text-sm font-normal text-muted-foreground">
                          ({searchResultsToDisplay.length})
                        </span>
                      )}
                    </h2>
                    <div
                      className="rounded-xl border border-border bg-card p-5"
                      aria-label="Resultados de búsqueda"
                    >
                      {smartCandidates === null ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Sparkles className="h-10 w-10 text-muted-foreground" aria-hidden />
                          <p className="font-inter text-sm text-muted-foreground">
                            Haz clic en Search para ver candidatos recomendados.
                          </p>
                        </div>
                      ) : searchResultsToDisplay.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
                          <p className="font-inter text-sm text-muted-foreground">
                            {smartCandidates.length === 0
                              ? "No se encontraron candidatos en la búsqueda."
                              : "Los candidatos encontrados ya están en Posibles candidatos o en Etapas."}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={handleSelectAllCandidates}
                              className="font-inter text-sm text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
                              aria-label="Seleccionar todos los candidatos"
                            >
                              Seleccionar todos
                            </button>
                            <button
                              type="button"
                              onClick={handleDeselectAllCandidates}
                              className="font-inter text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
                              aria-label="Desmarcar todos los candidatos"
                            >
                              Desmarcar todos
                            </button>
                            {selectedCount > 0 && (
                              <span className="font-inter text-sm text-muted-foreground" aria-live="polite">
                                {selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}
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
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="flex items-center gap-2 font-inter text-base font-semibold text-foreground">
                        <Users className="h-4 w-4" aria-hidden />
                        Posibles candidatos
                        <span className="font-inter text-sm font-normal text-muted-foreground">
                          ({vacancyCandidates.length})
                        </span>
                      </h2>
                      <button
                        type="button"
                        disabled={selectedPossibleCandidateIds.size === 0 || loadingStartProcess}
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-vo-purple bg-vo-purple px-4 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-vo-purple"
                        aria-label="Iniciar proceso con candidatos seleccionados"
                        onClick={handleStartProcess}
                      >
                        {loadingStartProcess ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        {loadingStartProcess ? "Iniciando..." : "Iniciar proceso"}
                      </button>
                    </div>
                    {startProcessError && (
                      <p className="font-inter text-sm text-destructive" role="alert">
                        {startProcessError}
                      </p>
                    )}
                    <div
                      className="rounded-xl border border-border bg-card p-5"
                      aria-label="Posibles candidatos"
                    >
                      {vacancyCandidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
                          <p className="font-inter text-sm text-muted-foreground">
                            No hay sugerencias de match para esta vacante.
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
                                />
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* 3. Kanban board (applicants) */}
                  <div className="flex flex-col gap-3">
                    <h2 className="flex items-center gap-2 font-inter text-base font-semibold text-foreground">
                      <Users className="h-4 w-4" aria-hidden />
                      Etapas
                      <span className="font-inter text-sm font-normal text-muted-foreground">
                        ({applicants.length})
                      </span>
                    </h2>
                    {moveStageError && (
                      <p className="font-inter text-sm text-destructive" role="alert">
                        {moveStageError}
                      </p>
                    )}
                    <div
                      className="rounded-xl border border-border bg-card p-5"
                      aria-label="Contenedor del tablero Kanban"
                    >
                      {applicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                          <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
                          <p className="font-inter text-sm text-muted-foreground">
                            Aún no hay postulantes en esta vacante.
                          </p>
                        </div>
                      ) : (
                        <div
                          className="flex gap-3 overflow-x-auto pb-2"
                          role="region"
                          aria-label="Etapas de candidatos"
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
  );
}
