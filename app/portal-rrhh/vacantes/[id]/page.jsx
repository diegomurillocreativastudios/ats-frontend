"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  FileText,
  Mail,
  Phone,
  User,
  Users,
} from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import { apiClient } from "@/lib/api";
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

/** Renders requirements as string (list/paragraphs), object (key-value list or badges), or array (bullet list). */
const RequirementsDisplay = ({ value }) => {
  if (value == null) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value).filter(
      ([k]) => k != null && !String(k).startsWith("additionalProp")
    );
    if (entries.length === 0) return null;
    return (
      <ul className="flex flex-col gap-2 font-inter text-sm text-muted-foreground" role="list">
        {entries.map(([key, val]) => (
          <li
            key={key}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              {String(key).trim()}
            </span>
            <span className="text-muted-foreground">
              {typeof val === "object" && val !== null
                ? Object.entries(val)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")
                : String(val ?? "—")}
            </span>
          </li>
        ))}
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

const MatchCard = ({ match }) => {
  const initials = getInitials(
    emptyToDash(match.name) !== "—" ? match.name : "",
    match.email ?? ""
  );
  const componentScores =
    match.componentScores && typeof match.componentScores === "object"
      ? Object.entries(match.componentScores).filter(
          ([k]) => !k.startsWith("additionalProp")
        )
      : [];
  const matchedAttrs =
    match.matchedAttributes && typeof match.matchedAttributes === "object"
      ? Object.entries(match.matchedAttributes).filter(
          ([k]) => !k.startsWith("additionalProp")
        )
      : [];

  const detailHref =
    match.candidateProfileId
      ? `/portal-rrhh/candidatos/${match.candidateProfileId}`
      : null;

  return (
    <article
      className="rounded-xl border border-border bg-card p-5"
      aria-label={`Candidato ${emptyToDash(match.name)}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vo-purple font-inter text-base font-semibold text-white"
            aria-hidden
          >
            {initials}
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
              {typeof match.totalScore === "number" ? match.totalScore : "—"}
            </span>
            <span className="font-inter text-xs text-muted-foreground">
              Puntaje
            </span>
          </div>
          {detailHref && (
            <Link
              href={detailHref}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              aria-label={`Ver perfil de ${emptyToDash(match.name)}`}
            >
              <User className="h-4 w-4" aria-hidden />
              Ver perfil
            </Link>
          )}
        </div>
      </div>
      {(componentScores.length > 0 || matchedAttrs.length > 0) && (
        <div className="mt-4 border-t border-border pt-4">
          {componentScores.length > 0 && (
            <div className="mb-3">
              <span className="font-inter text-xs font-medium text-muted-foreground">
                Puntajes por componente
              </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {componentScores.map(([key, val]) => (
                  <span
                    key={key}
                    className="inline-flex rounded-md bg-muted px-2.5 py-1 font-inter text-xs text-foreground"
                  >
                    {key}: {typeof val === "number" ? val : safeString(val)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {matchedAttrs.length > 0 && (
            <div>
              <span className="font-inter text-xs font-medium text-muted-foreground">
                Atributos coincidentes
              </span>
              <ul className="mt-1 list-inside list-disc font-inter text-xs text-foreground">
                {matchedAttrs.map(([key, val]) => (
                  <li key={key}>
                    {key}: {safeString(val)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default function VacanteDetallePage() {
  const params = useParams();
  const id = params?.id ?? null;
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

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
    if (vacancy?.title) {
      document.title = `ATS | ${vacancy.title}`;
    }
  }, [vacancy?.title]);

  const statusConfig = vacancy ? getStatusConfig(vacancy.status) : STATUS_LABELS.activa;
  const matches = Array.isArray(vacancy?.matches) ? vacancy.matches : [];

  const breadcrumbLabel = vacancy?.title ? vacancy.title : "Detalle de vacante";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main */}
      <div className="hidden lg:flex lg:min-h-screen">
        <RRHHSidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <RRHHTopbar variant="desktop" breadcrumbLabel={breadcrumbLabel} />
          <main className="flex-1 overflow-auto">
            <div className="flex flex-col p-8">
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
                            <RequirementsDisplay value={vacancy.requirements} />
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  <section
                    className="flex flex-col gap-4"
                    aria-label="Candidatos con match"
                  >
                    <h2 className="flex items-center gap-2 font-inter text-lg font-semibold text-foreground">
                      <Users className="h-5 w-5" aria-hidden />
                      Candidatos ({matches.length})
                    </h2>
                    {matches.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
                        <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
                        <p className="font-inter text-sm text-muted-foreground">
                          Aún no hay candidatos con match para esta vacante.
                        </p>
                      </div>
                    ) : (
                      <ul className="flex flex-col gap-4" role="list">
                        {matches.map((match, index) => (
                          <li key={match.candidateDocumentId ?? match.candidateProfileId ?? index}>
                            <MatchCard match={match} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : null}
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile */}
      <div className="flex min-h-screen flex-col lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel={breadcrumbLabel} />
        <main className="flex-1 overflow-auto">
          <div className="flex flex-col p-4 md:p-6">
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
                            <RequirementsDisplay value={vacancy.requirements} />
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
                  <h2 className="flex items-center gap-2 font-inter text-base font-semibold text-foreground">
                    <Users className="h-4 w-4" aria-hidden />
                    Candidatos ({matches.length})
                  </h2>
                  {matches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-10 text-center">
                      <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
                      <p className="font-inter text-sm text-muted-foreground">
                        Aún no hay candidatos con match para esta vacante.
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-4" role="list">
                      {matches.map((match, index) => (
                        <li key={match.candidateDocumentId ?? match.candidateProfileId ?? index}>
                          <MatchCard match={match} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
