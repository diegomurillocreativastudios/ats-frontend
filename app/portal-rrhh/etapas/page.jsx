"use client";

import { useState, useEffect, useCallback } from "react";
import Nestable from "react-nestable";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ListOrdered,
  GripVertical,
} from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import EtapaModal from "@/components/rrhh/EtapaModal";
import EstadosModal from "@/components/rrhh/EstadosModal";
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal";
import Snackbar from "@/components/ui/Snackbar";
import { apiClient } from "@/lib/api";
import { buildRecruiterStagePutPayload } from "@/lib/recruiterStagePayload";
import "react-nestable/dist/styles/index.css";
import "./nestable-custom.css";

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Orden de etapa: siempre `orderIndex` (mismo nombre y semántica que el API, 1…n).
 */
const mapStageFromApi = (item, index = 0) => {
  const id = String(item?.id ?? item?.uuid ?? index);
  const name = item.name ?? item.stage_name ?? "";
  const description = item.description ?? "";
  const raw = item.orderIndex ?? item.order ?? item.stage_order;
  const parsed = Number(raw);
  const orderIndex = Number.isFinite(parsed) ? parsed : index + 1;

  return {
    id,
    name,
    description,
    orderIndex,
    isDefault: Boolean(
      item.isDefault ?? item.is_default ?? item.IsDefault
    ),
    triggersNotification: Boolean(item.triggersNotification),
    notificationTemplateId: item.notificationTemplateId ?? null,
  };
};

/** Mismo criterio que el API con orderIndex repetidos: ordenar por orderIndex y desempatar por id. */
const sortStagesStable = (a, b) => {
  if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
  return String(a.id).localeCompare(String(b.id));
};

const persistStageOrdersSequential = async (orderedStages) => {
  for (let i = 0; i < orderedStages.length; i++) {
    const stage = orderedStages[i];
    await apiClient.put(
      `/api/recruiter/companies/${COMPANY_ID}/stages/${stage.id}`,
      buildRecruiterStagePutPayload(stage)
    );
  }
};

const DefaultStageSwitch = ({ stage, onActivate, disabled }) => {
  const isOn = Boolean(stage.isDefault);
  const handleClick = () => {
    if (disabled) return;
    if (isOn) return;
    onActivate(stage);
  };
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (isOn) return;
    onActivate(stage);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={
        isOn
          ? `${stage.name}: Etapa por defecto activa`
          : `Marcar ${stage.name} como etapa por defecto`
      }
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-[background-color,box-shadow,border-color] duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-pink/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
        isOn
          ? "bg-vo-pink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
          : "border border-slate-300/80 bg-slate-100 shadow-[inset_0_1px_1px_rgba(15,23,42,0.06)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-[transform,box-shadow] duration-200 ease-out ${
          isOn
            ? "translate-x-5 shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
            : "translate-x-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/40"
        }`}
        aria-hidden
      />
    </button>
  );
};

const renderStageItem = ({ item, collapseIcon, handler }) => {
  return (
    <div className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-4">
        <div
          {...handler}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10 cursor-grab active:cursor-grabbing"
          aria-label="Arrastrar para reordenar"
        >
          <GripVertical className="h-6 w-6 text-vo-purple" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-inter text-base font-semibold text-foreground">
            {item.name}
          </h3>
          {item.description && (
            <p className="font-inter text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-inter text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
            Etapa por defecto
          </span>
          <DefaultStageSwitch
            stage={item}
            onActivate={item.onDefaultActivate}
            disabled={item.defaultSwitchDisabled}
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <span className="font-inter text-xs text-muted-foreground">
            Orden:
          </span>
          <span className="font-inter text-sm font-semibold text-foreground">
            {item.orderIndex}
          </span>
        </div>
        <button
          type="button"
          onClick={() => item.onEdit(item)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={`Editar etapa ${item.name}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Editar
        </button>
        <button
          type="button"
          onClick={() => item.onDelete(item)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-background px-4 py-2.5 font-inter text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
          aria-label={`Eliminar etapa ${item.name}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default function EtapasPage() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [isEstadosModalOpen, setIsEstadosModalOpen] = useState(false);
  const [defaultStageSwitchLoading, setDefaultStageSwitchLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const fetchStages = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get(
        `/api/recruiter/companies/${COMPANY_ID}/stages`
      );
      const list = Array.isArray(data) ? data : data?.stages ?? data?.items ?? data?.data ?? [];
      const mapped = list.map((item, i) => mapStageFromApi(item, i));
      setStages([...mapped].sort(sortStagesStable));
    } catch (err) {
      setFetchError(
        err?.message || err?.detail || "No se pudieron cargar las etapas."
      );
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const handleModalSubmit = async (wasCreating, createdStage) => {
    await fetchStages();
    
    // Si se creó una etapa, dejarla primera (orderIndex 1) y reenumerar el resto
    if (wasCreating && createdStage) {
      try {
        const data = await apiClient.get(
          `/api/recruiter/companies/${COMPANY_ID}/stages`
        );
        const list = Array.isArray(data) ? data : data?.stages ?? data?.items ?? data?.data ?? [];
        const mappedStages = list.map((item, i) => mapStageFromApi(item, i));
        
        const createdId = String(createdStage?.id ?? createdStage?.uuid ?? "");
        const newStage = mappedStages.find((s) => String(s.id) === createdId);
        const others = mappedStages
          .filter((s) => String(s.id) !== createdId)
          .sort(sortStagesStable);

        const sortedStages = newStage
          ? [newStage, ...others]
          : [...mappedStages].sort(sortStagesStable);
        const reorderedStages = sortedStages.map((stage, index) => ({
          ...stage,
          orderIndex: index + 1,
        }));
        
        await persistStageOrdersSequential(reorderedStages);

        await fetchStages();
      } catch (err) {
        console.error("Error reordering stages:", err);
      }
    }

    setEditingStage(null);
    setSnackbar({
      open: true,
      variant: "success",
      message: wasCreating
        ? "Etapa creada correctamente."
        : "Etapa actualizada correctamente.",
    });
  };

  const handleDefaultStageActivate = async (targetStage) => {
    if (defaultStageSwitchLoading) return;
    if (targetStage.isDefault) return;

    setDefaultStageSwitchLoading(true);
    try {
      const target =
        stages.find((s) => String(s.id) === String(targetStage.id)) ??
        targetStage;
      await apiClient.put(
        `/api/recruiter/companies/${COMPANY_ID}/stages/${target.id}`,
        buildRecruiterStagePutPayload({ ...target, isDefault: true })
      );
      for (const s of stages) {
        if (String(s.id) === String(target.id)) continue;
        await apiClient.put(
          `/api/recruiter/companies/${COMPANY_ID}/stages/${s.id}`,
          buildRecruiterStagePutPayload({ ...s, isDefault: false })
        );
      }
      await fetchStages();
      setSnackbar({
        open: true,
        variant: "success",
        message: "Etapa por defecto actualizada.",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        variant: "error",
        message:
          err?.message ||
          err?.detail ||
          "No se pudo actualizar la etapa por defecto. Intenta de nuevo.",
      });
    } finally {
      setDefaultStageSwitchLoading(false);
    }
  };

  const handleEdit = (stage) => {
    setEditingStage(stage);
    setIsModalOpen(true);
  };

  const handleDelete = (stage) => {
    setStageToDelete(stage);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!stageToDelete) return;

    setDeleteLoading(true);
    try {
      await apiClient.delete(
        `/api/recruiter/companies/${COMPANY_ID}/stages/${stageToDelete.id}`
      );
      setIsDeleteModalOpen(false);
      setStageToDelete(null);
      
      // After deleting, reorder all remaining stages
      try {
        const data = await apiClient.get(
          `/api/recruiter/companies/${COMPANY_ID}/stages`
        );
        const list = Array.isArray(data) ? data : data?.stages ?? data?.items ?? data?.data ?? [];
        const mappedStages = list.map((item, i) => mapStageFromApi(item, i));
        
        // Sort by current order and reassign sequential order
        const sortedStages = [...mappedStages].sort(sortStagesStable);
        const reorderedStages = sortedStages.map((stage, index) => ({
          ...stage,
          orderIndex: index + 1,
        }));

        await persistStageOrdersSequential(reorderedStages);

        // Refresh the list
        await fetchStages();
      } catch (err) {
        console.error("Error reordering stages after delete:", err);
        // Still refresh even if reorder fails
        await fetchStages();
      }

      setSnackbar({
        open: true,
        variant: "success",
        message: "Etapa eliminada correctamente.",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        variant: "error",
        message:
          err?.message ||
          err?.detail ||
          "No se pudo eliminar la etapa. Intenta de nuevo.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!deleteLoading) {
      setIsDeleteModalOpen(false);
      setStageToDelete(null);
    }
  };

  const handleNewStage = () => {
    setEditingStage(null);
    setIsModalOpen(true);
  };

  const handleReorder = async ({ items }) => {
    if (reorderLoading) return;

    if (items.length !== stages.length) {
      setSnackbar({
        open: true,
        variant: "warning",
        message:
          "Para guardar el orden, muestra todas las etapas (sin filtrar la búsqueda).",
      });
      await fetchStages();
      return;
    }

    const updatedStages = items.map((item, index) => ({
      ...item,
      orderIndex: index + 1,
    }));

    setStages(updatedStages);
    setReorderLoading(true);

    try {
      await persistStageOrdersSequential(updatedStages);
      setSnackbar({
        open: true,
        variant: "success",
        message: "Orden guardado correctamente.",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        variant: "error",
        message:
          err?.message ||
          err?.detail ||
          "No se pudo reordenar las etapas. Intenta de nuevo.",
      });
      await fetchStages();
    } finally {
      setReorderLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStage(null);
  };

  const filteredStages = stages.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const sortedStages = [...filteredStages].sort(sortStagesStable);

  const nestableItems = sortedStages.map((stage) => ({
    ...stage,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onDefaultActivate: handleDefaultStageActivate,
    defaultSwitchDisabled:
      defaultStageSwitchLoading || reorderLoading || deleteLoading,
  }));

  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel="Etapas" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col">
              <section
                className="flex flex-col gap-4 border-b border-border px-8 py-5 sm:flex-row sm:items-center sm:justify-between"
                aria-label="Encabezado de etapas"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="font-inter text-2xl font-bold text-foreground">
                    Etapas
                  </h1>
                  <p className="font-inter text-sm text-muted-foreground">
                    Gestiona las etapas del proceso de reclutamiento
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEstadosModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-border bg-background px-6 py-3 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    aria-label="Gestionar estados"
                  >
                    Estados
                  </button>
                  <button
                    type="button"
                    onClick={handleNewStage}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-vo-purple px-6 py-3 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    aria-label="Crear nueva etapa"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Nueva Etapa
                  </button>
                </div>
              </section>
              <section className="flex flex-col gap-6 p-8" aria-label="Lista de etapas">
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
                      placeholder="Buscar etapas..."
                      className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                      aria-label="Buscar etapas"
                    />
                  </div>
                  {reorderLoading && (
                    <div className="flex items-center gap-2 text-vo-purple">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                      <span className="font-inter text-sm font-medium">
                        Guardando orden...
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                      <p className="font-inter text-sm text-muted-foreground">
                        Cargando etapas...
                      </p>
                    </div>
                  ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <p className="font-inter text-sm text-destructive" role="alert">
                        {fetchError}
                      </p>
                      <button
                        type="button"
                        onClick={fetchStages}
                        className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : sortedStages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <ListOrdered className="h-12 w-12 text-muted-foreground" aria-hidden />
                      <p className="font-inter text-sm text-muted-foreground">
                        No se encontraron etapas
                      </p>
                      <button
                        type="button"
                        onClick={handleNewStage}
                        className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Crear etapa
                      </button>
                    </div>
                  ) : (
                    <Nestable
                      items={nestableItems}
                      renderItem={renderStageItem}
                      onChange={handleReorder}
                      maxDepth={1}
                    />
                  )}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile: topbar + content — fixed height so only main scrolls */}
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel="Etapas" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Encabezado de etapas"
            >
              <div className="flex flex-col gap-1">
                <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                  Etapas
                </h1>
                <p className="font-inter text-sm text-muted-foreground">
                  Gestiona las etapas del proceso de reclutamiento
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEstadosModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label="Gestionar estados"
                >
                  Estados
                </button>
                <button
                  type="button"
                  onClick={handleNewStage}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label="Crear nueva etapa"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Nueva Etapa</span>
                  <span className="sm:hidden" aria-hidden>Nueva</span>
                </button>
              </div>
            </section>
            <section className="flex flex-col gap-4" aria-label="Filtros y lista">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-[320px]">
                  <Search
                    className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Buscar etapas..."
                    className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    aria-label="Buscar etapas"
                  />
                </div>
                {reorderLoading && (
                  <div className="flex items-center gap-2 text-vo-purple">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                    <span className="font-inter text-sm font-medium">
                      Guardando orden...
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                    <p className="font-inter text-sm text-muted-foreground">
                      Cargando etapas...
                    </p>
                  </div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <p className="font-inter text-sm text-destructive" role="alert">
                      {fetchError}
                    </p>
                    <button
                      type="button"
                      onClick={fetchStages}
                      className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : sortedStages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <ListOrdered className="h-12 w-12 text-muted-foreground" aria-hidden />
                    <p className="font-inter text-sm text-muted-foreground">
                      No se encontraron etapas
                    </p>
                    <button
                      type="button"
                      onClick={handleNewStage}
                      className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Crear etapa
                    </button>
                  </div>
                ) : (
                  <Nestable
                    items={nestableItems}
                    renderItem={renderStageItem}
                    onChange={handleReorder}
                    maxDepth={1}
                  />
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <EtapaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        editingStage={editingStage}
        companyId={COMPANY_ID}
        setAsDefaultOnCreate={!editingStage && stages.length === 0}
        onSnackbar={(message, variant = "success") =>
          setSnackbar({ open: true, message, variant })
        }
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Eliminar etapa"
        message={`¿Estás seguro de eliminar la etapa "${stageToDelete?.name}"?`}
        confirmText="Aceptar"
        cancelText="Cancelar"
        loading={deleteLoading}
      />

      <EstadosModal
        isOpen={isEstadosModalOpen}
        onClose={() => setIsEstadosModalOpen(false)}
        onSnackbar={(message, variant = "success") =>
          setSnackbar({ open: true, message, variant })
        }
      />

      <Snackbar
        open={snackbar.open}
        onClose={handleCloseSnackbar}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </div>
  );
}
