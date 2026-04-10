"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  Download,
  FileText,
  GraduationCap,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import {
  SectionCard,
  InfoGrid,
  JobPreferencesBlock,
  WorkExperienceList,
  EducationList,
  LanguagesList,
  SkillsCloud,
  SocialLinksList,
  ReferencesList,
  RecognitionsList,
  emptyToDash,
} from "@/components/rrhh/CandidateProfileSections";
import { apiClient } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatPhoneSvDisplay } from "@/lib/formatPhoneSv";
import { getInitials } from "@/lib/getInitials";
import { resolveCountryDisplay } from "@/lib/normalizeCountryDisplay"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  mergeRecruiterNormalizedWithCanonicalProfile,
  pickEmbeddedCanonicalProfile,
} from "@/lib/recruiter-canonical-profile-merge"

interface CandidateProfileState {
  id: string | number | null
  storagePath: string | null
  normalizedData: Record<string, unknown>
  normalizedDataRaw: string | null
  normalizedDataParseFailed: boolean
}

/**
 * GET /api/recruiter/candidates/{id} puede devolver normalizedData como objeto o como string JSON (OpenAPI).
 */
const parseNormalizedDataField = (rawNd: unknown) => {
  if (rawNd == null) {
    return { normalizedData: {}, rawString: null, parseFailed: false };
  }
  if (typeof rawNd === "object" && rawNd !== null && !Array.isArray(rawNd)) {
    return { normalizedData: rawNd, rawString: null, parseFailed: false };
  }
  if (typeof rawNd === "string") {
    const trimmed = rawNd.trim();
    if (!trimmed) {
      return { normalizedData: {}, rawString: null, parseFailed: false };
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { normalizedData: parsed, rawString: null, parseFailed: false };
      }
      return { normalizedData: {}, rawString: trimmed, parseFailed: true };
    } catch {
      return { normalizedData: {}, rawString: trimmed, parseFailed: true };
    }
  }
  return {
    normalizedData: {},
    rawString: String(rawNd),
    parseFailed: true,
  };
};

const META_KEYS = new Set([
  "id",
  "documentId",
  "normalizedData",
  "storagePath",
  "storage_path",
  "data",
]);

/**
 * Respuesta de GET /api/recruiter/candidates/{id}: id, normalizedData, storagePath.
 */
const extractProfile = (raw: unknown): CandidateProfileState => {
  const empty: CandidateProfileState = {
    id: null,
    storagePath: null,
    normalizedData: {},
    normalizedDataRaw: null,
    normalizedDataParseFailed: false,
  };
  if (!raw) return empty

  const top = raw as Record<string, unknown>
  const root = (top["data"] ?? top) as Record<string, unknown>
  const id = (root["id"] ?? root["documentId"] ?? null) as
    | string
    | number
    | null
  const storagePath = (root["storagePath"] ??
    root["storage_path"] ??
    null) as string | null

  const { normalizedData, rawString, parseFailed } = parseNormalizedDataField(
    root["normalizedData"]
  )

  if (Object.keys(normalizedData).length > 0 || rawString != null) {
    return {
      id,
      storagePath,
      normalizedData,
      normalizedDataRaw: rawString,
      normalizedDataParseFailed: parseFailed,
    };
  }

  const hasLegacyKeys =
    root["FirstName"] != null ||
    root["firstName"] != null ||
    root["WorkExperience"] != null ||
    root["workExperience"] != null

  if (hasLegacyKeys) {
    const legacy = { ...root }
    META_KEYS.forEach((k) => {
      delete legacy[k]
    })
    return {
      id,
      storagePath,
      normalizedData: legacy,
      normalizedDataRaw: null,
      normalizedDataParseFailed: false,
    };
  }

  return {
    id,
    storagePath,
    normalizedData: {},
    normalizedDataRaw: rawString,
    normalizedDataParseFailed: parseFailed,
  };
};

const formatBirthDate = (value: unknown) => {
  if (!value) return null
  const d =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : null
  if (!d || Number.isNaN(d.getTime())) return emptyToDash(value)
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function CandidatoDetallePage() {
  const params = useParams();
  const candidateId = params?.candidateId ?? null;

  const [profile, setProfile] = useState<CandidateProfileState | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const fetchCandidate = useCallback(async () => {
    if (!candidateId) {
      setLoading(false);
      setFetchError("Falta el identificador del candidato.");
      setProfile(null);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get(`/api/recruiter/candidates/${candidateId}`)
      const base = extractProfile(data)
      const root = (data as Record<string, unknown> | null | undefined)?.data ?? data
      let canonical: unknown = null
      if (root && typeof root === "object" && !Array.isArray(root)) {
        canonical = pickEmbeddedCanonicalProfile(root as Record<string, unknown>)
      }
      if (!canonical) {
        try {
          canonical = await apiClient.get(
            `/api/recruiter/candidates/${encodeURIComponent(String(candidateId))}/profile`
          )
        } catch {
          canonical = null
        }
      }
      const normalizedData = mergeRecruiterNormalizedWithCanonicalProfile(
        base.normalizedData,
        canonical
      )
      setProfile({ ...base, normalizedData })
    } catch (err: unknown) {
      setFetchError(
        getApiErrorMessage(err) ||
          "No se pudo cargar el perfil del candidato."
      )
      setProfile(null)
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const nd = (profile?.normalizedData ?? {}) as Record<string, any>
  const firstName = nd.FirstName ?? nd.firstName ?? "";
  const lastName = nd.LastName ?? nd.lastName ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Candidato";

  const email = nd.Email ?? nd.email ?? "";
  const phoneRaw = nd.PhoneNumber ?? nd.phoneNumber ?? nd.phone ?? "";
  const phoneDisplay = formatPhoneSvDisplay(phoneRaw);
  const countryRaw = nd.Country ?? nd.country ?? "";
  const countryDisplay = resolveCountryDisplay(countryRaw, phoneDisplay);
  const birthCity = nd.BirthCity ?? nd.birthCity ?? "";
  const birthDateRaw = nd.BirthDate ?? nd.birthDate ?? null;
  const marital = nd.MaritalStatus ?? nd.maritalStatus ?? "";
  const gender = nd.Gender ?? nd.gender ?? "";
  const summary = nd.Summary ?? nd.summary ?? "";

  const jobPrefs = nd.JobPreferences ?? nd.jobPreferences ?? null;
  const workExperience = nd.WorkExperience ?? nd.workExperience ?? [];
  const education = nd.Education ?? nd.education ?? [];
  const languages = nd.Languages ?? nd.languages ?? [];
  const skills = nd.Skills ?? nd.skills ?? [];
  const socialLinks = nd.SocialLinks ?? nd.socialLinks ?? [];
  const references = nd.References ?? nd.references ?? [];
  const recognitions = nd.Recognitions ?? nd.recognitions ?? [];

  const initials = getInitials(fullName, email);

  const breadcrumbLabel = loading ? "Candidato" : fullName;
  const breadcrumbTrail = useMemo(
    () => [
      { label: "Candidatos", href: "/portal-rrhh/candidatos" },
      { label: breadcrumbLabel },
    ],
    [breadcrumbLabel]
  );

  useEffect(() => {
    if (!loading && fullName) {
      document.title = `ATS | ${fullName}`;
    }
  }, [loading, fullName]);

  const handleDownloadCv = async () => {
    const path = profile?.storagePath;
    if (!path) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const token = getAccessToken();
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      const url = `${baseUrl}/api/Storage/files/${encodeURIComponent(path)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("No se pudo descargar el CV.");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = path.split("/").pop() || "cv.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err: unknown) {
      setDownloadError(getApiErrorMessage(err) || "Error al descargar.")
    } finally {
      setDownloading(false);
    }
  };

  const contactItems = useMemo(
    () => [
      { label: "Correo", value: email },
      { label: "Teléfono", value: phoneDisplay },
      { label: "País", value: countryDisplay },
      { label: "Ciudad de nacimiento", value: birthCity },
      {
        label: "Fecha de nacimiento",
        value: birthDateRaw ? formatBirthDate(birthDateRaw) : null,
      },
      { label: "Estado civil", value: marital },
      { label: "Género", value: gender },
    ],
    [email, phoneDisplay, countryDisplay, birthCity, birthDateRaw, marital, gender]
  );

  const mainInner = (
    <>
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
            Cargando perfil...
          </p>
        </div>
      ) : fetchError ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center"
          role="alert"
        >
          <p className="font-inter text-sm text-destructive">{fetchError}</p>
          <Link
            href="/portal-rrhh/candidatos"
            className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver a candidatos
          </Link>
          <button
            type="button"
            onClick={fetchCandidate}
            className="font-inter text-sm text-vo-purple hover:underline"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Link
              href="/portal-rrhh/candidatos"
              className="inline-flex w-fit items-center gap-2 font-inter text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
              aria-label="Volver a candidatos"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver a candidatos
            </Link>
            {profile?.storagePath ? (
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={handleDownloadCv}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Descargar CV en PDF"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {downloading ? "Descargando..." : "Descargar CV"}
                </button>
                {downloadError ? (
                  <p className="font-inter text-xs text-destructive" role="alert">
                    {downloadError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <section
            className="mb-8 rounded-xl border border-border bg-card p-6"
            aria-label="Resumen del candidato"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-vo-purple font-inter text-lg font-semibold text-white"
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-inter text-2xl font-bold text-foreground">
                  {fullName}
                </h1>
                {summary ? (
                  <p className="mt-3 max-w-3xl font-inter text-sm leading-relaxed text-muted-foreground">
                    {summary}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2 font-inter text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-2 text-foreground hover:text-vo-purple focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
                    >
                      <Mail className="h-4 w-4 shrink-0" aria-hidden />
                      {email}
                    </a>
                  ) : null}
                  {phoneDisplay !== "—" ? (
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      {phoneDisplay}
                    </span>
                  ) : null}
                  {countryDisplay !== "—" ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                      {countryDisplay}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-inter text-xs text-muted-foreground">
                  ID: {emptyToDash(profile?.id ?? candidateId)}
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <SectionCard
              title="Datos de contacto y personales"
              icon={User}
              sectionId="sec-contact"
            >
              <InfoGrid items={contactItems} />
            </SectionCard>

            <SectionCard
              title="Preferencias laborales"
              icon={Briefcase}
              sectionId="sec-job-prefs"
            >
              <JobPreferencesBlock prefs={jobPrefs} />
            </SectionCard>

            <SectionCard
              title="Experiencia laboral"
              icon={Building2}
              sectionId="sec-work"
            >
              <WorkExperienceList items={workExperience} />
            </SectionCard>

            <SectionCard
              title="Educación"
              icon={GraduationCap}
              sectionId="sec-edu"
            >
              <EducationList items={education} />
            </SectionCard>

            <SectionCard
              title="Idiomas"
              icon={Languages}
              sectionId="sec-lang"
            >
              <LanguagesList items={languages} />
            </SectionCard>

            <SectionCard
              title="Habilidades"
              icon={Sparkles}
              sectionId="sec-skills"
            >
              <SkillsCloud skills={skills} />
            </SectionCard>

            <SectionCard
              title="Enlaces"
              icon={FileText}
              sectionId="sec-links"
            >
              <div>
                <p className="mb-2 font-inter text-xs font-medium text-muted-foreground">
                  Redes y web
                </p>
                <SocialLinksList links={socialLinks} />
              </div>
            </SectionCard>

            <SectionCard
              title="Referencias"
              icon={Users}
              sectionId="sec-refs"
            >
              <ReferencesList items={references} />
            </SectionCard>

            <SectionCard
              title="Reconocimientos"
              icon={Award}
              sectionId="sec-awards"
            >
              <RecognitionsList items={recognitions} />
            </SectionCard>

            {profile?.normalizedDataParseFailed && profile?.normalizedDataRaw ? (
              <SectionCard
                title="normalizedData (texto sin parsear)"
                icon={FileText}
                sectionId="sec-nd-raw"
              >
                <p className="mb-2 font-inter text-xs text-amber-800 dark:text-amber-200" role="status">
                  El API devolvió normalizedData como texto que no es JSON válido. Contenido crudo:
                </p>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs text-foreground">
                  {profile.normalizedDataRaw}
                </pre>
              </SectionCard>
            ) : null}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel={breadcrumbLabel}
            breadcrumbTrail={breadcrumbTrail}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col p-8">{mainInner}</div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel={breadcrumbLabel}
          breadcrumbTrail={breadcrumbTrail}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col p-4 md:p-6">{mainInner}</div>
        </main>
      </div>
    </div>
  );
}
