"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Eye, Users, Plus } from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import { apiClient } from "@/lib/api"
import { createSilentError } from "@/lib/api-error"
import { formatPhoneSvDisplay } from "@/lib/formatPhoneSv";
import { getInitials } from "@/lib/getInitials";
import { resolveCountryDisplay } from "@/lib/normalizeCountryDisplay";
import Modal from "@/components/ui/Modal";
import Snackbar from "@/components/ui/Snackbar";
import DocumentsUploadZone from "@/components/candidato/DocumentsUploadZone";

const formatDate = (value) => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const emptyToDash = (value) => (value && String(value).trim() ? String(value).trim() : "—");

/**
 * Maps API candidate document to table row shape.
 * API shape: documentId, profileId, name, email, phone, country, headline, uploadedAt, summary
 * Rutas y GET /api/recruiter/candidates/{id} usan profileId (no documentId).
 */
const mapCandidateFromApi = (item, index = 0) => {
  const id = String(
    item?.profileId ?? item?.documentId ?? item?.id ?? item?.uuid ?? index
  );
  const name = emptyToDash(item?.name) === "—" ? "Sin nombre" : (item?.name ?? "Sin nombre").trim();
  const email = emptyToDash(item?.email);
  const phone = formatPhoneSvDisplay(item?.phone);
  const country = resolveCountryDisplay(item?.country, phone);
  const headline = emptyToDash(item?.headline);
  const summary = emptyToDash(item?.summary);
  const date = formatDate(item?.uploadedAt ?? item?.createdAt ?? item?.created_at ?? null);
  const initials = getInitials(name, email !== "—" ? email : "");

  return {
    id,
    name,
    email,
    phone,
    country,
    headline,
    summary,
    date,
    initials,
  };
};

const CandidateRow = ({ candidate }) => {
  const detailHref = `/portal-rrhh/candidatos/${candidate.id}`;

  return (
    <tr
      className="border-b border-border last:border-b-0"
      aria-label={`Candidato ${candidate.name}`}
    >
      <td className="px-5 py-4 align-middle">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vo-purple font-inter text-sm font-semibold text-white"
            aria-hidden
          >
            {candidate.initials}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-inter text-sm font-semibold text-foreground">
              {candidate.name}
            </span>
            <span className="font-inter text-xs text-muted-foreground truncate max-w-[200px]">
              {candidate.email}
            </span>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 font-inter text-[13px] text-foreground align-middle">
        {candidate.phone}
      </td>
      <td className="px-5 py-4 font-inter text-[13px] text-foreground align-middle">
        {candidate.country}
      </td>
      <td className="px-5 py-4 font-inter text-[13px] text-foreground align-middle max-w-[200px] truncate" title={candidate.headline !== "—" ? candidate.headline : undefined}>
        {candidate.headline}
      </td>
      <td className="px-5 py-4 font-inter text-[13px] text-muted-foreground align-middle">
        {candidate.date}
      </td>
      <td className="px-5 py-4 align-middle">
        <Link
          href={detailHref}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={`Ver detalle de ${candidate.name}`}
        >
          <Eye className="h-4 w-4" aria-hidden />
        </Link>
      </td>
    </tr>
  );
};

export default function CandidatosPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleProcessUpload = async (file) => {
    const formData = new FormData();
    formData.append("File", file);
    formData.append("EntityType", "Candidate");
    try {
      await apiClient.postFormData("/Ingest/upload", formData);
      await fetchCandidates();
      setIsUploadModalOpen(false);
      setSnackbar({
        open: true,
        variant: "success",
        message: "CV cargado y procesado correctamente.",
      });
    } catch (err) {
      const message =
        err?.detail ||
        err?.message ||
        "Error al procesar el CV.";

      setSnackbar({
        open: true,
        variant: "error",
        message,
      });

      // Importante: re-lanzar el error para que `DocumentsUploadZone` no marque
      // el archivo como "Listo" cuando el backend realmente falló.
      throw createSilentError(message)
    }
  };

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get("/api/recruiter/candidates/all");
      const list = Array.isArray(data)
        ? data
        : data?.candidates ?? data?.items ?? data?.data ?? [];
      setCandidates(list.map((item, i) => mapCandidateFromApi(item, i)));
    } catch (err) {
      setFetchError(
        err?.message ?? err?.detail ?? "No se pudieron cargar los candidatos."
      );
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email !== "—" && c.email.toLowerCase().includes(q)) ||
      (c.phone !== "—" && c.phone.toLowerCase().includes(q)) ||
      (c.country !== "—" && c.country.toLowerCase().includes(q)) ||
      (c.headline !== "—" && c.headline.toLowerCase().includes(q)) ||
      (c.summary !== "—" && c.summary.toLowerCase().includes(q))
    );
  });

  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  const mainContent = (
    <section className="flex flex-col gap-6" aria-label="Lista de candidatos">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative w-full max-w-[320px]">
          <Search
            className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Buscar candidatos..."
            className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label="Buscar candidatos"
          />
        </div>
        <button
          type="button"
          onClick={handleOpenUploadModal}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span>Agregar candidato</span>
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
              aria-hidden
            />
            <p className="font-inter text-sm text-muted-foreground">
              Cargando candidatos...
            </p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="font-inter text-sm text-destructive" role="alert">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={fetchCandidates}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
            >
              Reintentar
            </button>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
            <p className="font-inter text-sm text-muted-foreground">
              No hay candidatos
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] font-inter" role="table">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th
                    className="px-5 py-4 text-left font-inter text-[13px] font-semibold text-foreground"
                    scope="col"
                  >
                    Candidato
                  </th>
                  <th
                    className="px-5 py-4 text-left font-inter text-[13px] font-semibold text-foreground"
                    scope="col"
                  >
                    Teléfono
                  </th>
                  <th
                    className="px-5 py-4 text-left font-inter text-[13px] font-semibold text-foreground"
                    scope="col"
                  >
                    País
                  </th>
                  <th
                    className="px-5 py-4 text-left font-inter text-[13px] font-semibold text-foreground"
                    scope="col"
                  >
                    Título
                  </th>
                  <th
                    className="px-5 py-4 text-left font-inter text-[13px] font-semibold text-foreground"
                    scope="col"
                  >
                    Fecha subida
                  </th>
                  <th
                    className="px-5 py-4 text-left font-inter text-[13px] font-semibold text-foreground"
                    scope="col"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate, index) => (
                  <CandidateRow
                    key={`${candidate.id}-${index}`}
                    candidate={candidate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel="Candidatos" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col">
              <section
                className="flex flex-col gap-4 border-b border-border px-8 py-5 sm:flex-row sm:items-center sm:justify-between"
                aria-label="Encabezado de candidatos"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="font-inter text-2xl font-bold text-foreground">
                    Gestión de Candidatos
                  </h1>
                  <p className="font-inter text-sm text-muted-foreground">
                    Revisa y gestiona todos los candidatos
                  </p>
                </div>
              </section>
              <section className="p-8" aria-label="Contenido de candidatos">
                {mainContent}
              </section>
            </div>
          </main>
          <Modal
            isOpen={isUploadModalOpen}
            onClose={handleCloseUploadModal}
            title="Agregar candidato"
            size="lg"
          >
            <div className="flex flex-col gap-4">
              <p className="font-inter text-sm text-muted-foreground">
                Sube el CV del candidato en formato PDF para crear su perfil automáticamente.
              </p>
              <DocumentsUploadZone
                onProcess={handleProcessUpload}
                acceptedTypes={["application/pdf"]}
                acceptedExtensions={[".pdf"]}
                accept="application/pdf,.pdf"
                helperText="Solo archivos PDF hasta 10 MB"
                processAllAcceptedFiles
              />
            </div>
          </Modal>
        </div>
      </div>

      {/* Tablet & Mobile — fixed height so only main scrolls */}
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel="Candidatos" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Encabezado de candidatos"
            >
              <div className="flex flex-col gap-1">
                <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                  Gestión de Candidatos
                </h1>
                <p className="font-inter text-sm text-muted-foreground">
                  Revisa y gestiona todos los candidatos
                </p>
              </div>
            </section>
            {mainContent}
          </div>
        </main>
      </div>

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </div>
  );
}
