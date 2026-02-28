"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronDown,
  Building2,
  MapPin,
  Palette,
  Code,
  Briefcase,
} from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import NuevaVacanteModal from "@/components/rrhh/NuevaVacanteModal";
import { apiClient } from "@/lib/api";

const ICON_BY_DEPARTMENT = {
  diseño: Palette,
  design: Palette,
  tecnología: Code,
  technology: Code,
  tech: Code,
};

const mapVacancyFromApi = (item, index = 0) => {
  const id = String(item?.id ?? item?.uuid ?? index);
  const title = item.title ?? item.name ?? "";
  const department = item.department ?? item.department_name ?? "—";
  const location = item.location ?? item.work_arrangement ?? "—";
  const candidates = item.candidates ?? item.candidates_count ?? item.applicants_count ?? 0;
  const interviews = item.interviews ?? item.interviews_count ?? 0;
  const rawStatus = (item.status ?? item.state ?? "active").toLowerCase();
  const status =
    rawStatus.includes("active") || rawStatus === "activa" || rawStatus === "open"
      ? "activa"
      : rawStatus.includes("closed") || rawStatus === "cerrada"
        ? "cerrada"
        : "pausada";
  const deptLower = String(department).toLowerCase();
  const icon =
    ICON_BY_DEPARTMENT[deptLower] ??
    (title.toLowerCase().includes("design") || title.toLowerCase().includes("ux")
      ? Palette
      : Code);

  return { id, title, department, location, candidates, interviews, status, icon };
};

const STATUS_LABELS = {
  activa: { label: "Activa", bgClass: "bg-[#DCFCE7]", textClass: "text-[#166534]" },
  cerrada: { label: "Cerrada", bgClass: "bg-muted", textClass: "text-muted-foreground" },
  pausada: { label: "Pausada", bgClass: "bg-amber-100", textClass: "text-amber-800" },
};

const VacancyCard = ({ vacancy }) => {
  const Icon = vacancy.icon;
  const statusConfig = STATUS_LABELS[vacancy.status] ?? STATUS_LABELS.activa;

  return (
    <article
      className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label={`Vacante: ${vacancy.title}`}
    >
      <div className="flex flex-1 items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10"
          aria-hidden
        >
          <Icon className="h-6 w-6 text-vo-purple" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-inter text-base font-semibold text-foreground">
            {vacancy.title}
          </h3>
          <div className="flex flex-wrap items-center gap-4 font-inter text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {vacancy.department}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {vacancy.location}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-inter text-lg font-semibold text-foreground">
              {vacancy.candidates}
            </span>
            <span className="font-inter text-xs text-muted-foreground">
              Candidatos
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-inter text-lg font-semibold text-foreground">
              {vacancy.interviews}
            </span>
            <span className="font-inter text-xs text-muted-foreground">
              Entrevistas
            </span>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-xl px-2.5 py-1 font-inter text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
        >
          {statusConfig.label}
        </span>
        <Link
          href={`/portal-rrhh/vacantes/${vacancy.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-6 py-3 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={`Ver detalles de vacante ${vacancy.title}`}
        >
          Ver detalles
        </Link>
      </div>
    </article>
  );
};

export default function VacantesPage() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [isNuevaVacanteOpen, setIsNuevaVacanteOpen] = useState(false);

  const fetchVacancies = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get("/api/recruiter/vacancies");
      const list = Array.isArray(data) ? data : data?.vacancies ?? data?.items ?? data?.data ?? [];
      setVacancies(list.map((item, i) => mapVacancyFromApi(item, i)));
    } catch (err) {
      setFetchError(
        err?.message || err?.detail || "No se pudieron cargar las vacantes."
      );
      setVacancies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  const handleNuevaVacanteSubmit = () => {
    fetchVacancies();
  };

  const filteredVacancies = vacancies.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "todas" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel="Vacantes" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col">
              <section
                className="flex flex-col gap-4 border-b border-border px-8 py-5 sm:flex-row sm:items-center sm:justify-between"
                aria-label="Encabezado de vacantes"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="font-inter text-2xl font-bold text-foreground">
                    Vacantes
                  </h1>
                  <p className="font-inter text-sm text-muted-foreground">
                    Gestiona las posiciones abiertas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNuevaVacanteOpen(true)}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-vo-purple px-6 py-3 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label="Crear nueva vacante"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nueva Vacante
                </button>
              </section>
              <section className="flex flex-col gap-6 p-8" aria-label="Lista de vacantes">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="relative w-full max-w-[320px]">
                    <Search
                      className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Buscar vacantes..."
                      className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                      aria-label="Buscar vacantes"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5">
                    <span className="font-inter text-sm text-foreground">
                      Todas las vacantes
                    </span>
                    <button
                      type="button"
                      className="flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple rounded"
                      aria-label="Filtrar por estado"
                      aria-haspopup="listbox"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                      <p className="font-inter text-sm text-muted-foreground">
                        Cargando vacantes...
                      </p>
                    </div>
                  ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <p className="font-inter text-sm text-destructive" role="alert">
                        {fetchError}
                      </p>
                      <button
                        type="button"
                        onClick={fetchVacancies}
                        className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : filteredVacancies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <Briefcase className="h-12 w-12 text-muted-foreground" aria-hidden />
                      <p className="font-inter text-sm text-muted-foreground">
                        No se encontraron vacantes
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsNuevaVacanteOpen(true)}
                        className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Crear vacante
                      </button>
                    </div>
                  ) : (
                    filteredVacancies.map((vacancy) => (
                      <VacancyCard key={vacancy.id} vacancy={vacancy} />
                    ))
                  )}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile: topbar + content — fixed height so only main scrolls */}
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel="Vacantes" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Encabezado de vacantes"
            >
              <div className="flex flex-col gap-1">
                <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                  Vacantes
                </h1>
                <p className="font-inter text-sm text-muted-foreground">
                  Gestiona las posiciones abiertas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNuevaVacanteOpen(true)}
                className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                aria-label="Crear nueva vacante"
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Nueva Vacante</span>
                <span className="sm:hidden" aria-hidden>Nueva</span>
              </button>
            </section>
            <section className="flex flex-col gap-4" aria-label="Filtros y lista">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative w-full max-w-[320px]">
                  <Search
                    className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Buscar vacantes..."
                    className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    aria-label="Buscar vacantes"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5">
                  <span className="font-inter text-sm text-foreground">
                    Todas las vacantes
                  </span>
                  <button
                    type="button"
                    className="flex items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple"
                    aria-label="Filtrar por estado"
                    aria-haspopup="listbox"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                    <p className="font-inter text-sm text-muted-foreground">
                      Cargando vacantes...
                    </p>
                  </div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <p className="font-inter text-sm text-destructive" role="alert">
                      {fetchError}
                    </p>
                    <button
                      type="button"
                      onClick={fetchVacancies}
                      className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : filteredVacancies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <Briefcase className="h-12 w-12 text-muted-foreground" aria-hidden />
                    <p className="font-inter text-sm text-muted-foreground">
                      No se encontraron vacantes
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsNuevaVacanteOpen(true)}
                      className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Crear vacante
                    </button>
                  </div>
                ) : (
                  filteredVacancies.map((vacancy) => (
                    <VacancyCard key={vacancy.id} vacancy={vacancy} />
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <NuevaVacanteModal
        isOpen={isNuevaVacanteOpen}
        onClose={() => setIsNuevaVacanteOpen(false)}
        onSubmit={handleNuevaVacanteSubmit}
      />
    </div>
  );
}
