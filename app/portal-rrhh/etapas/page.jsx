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
import { apiClient } from "@/lib/api";
import "react-nestable/dist/styles/index.css";
import "./nestable-custom.css";

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const mapStageFromApi = (item, index = 0) => {
  const id = String(item?.id ?? item?.uuid ?? index);
  const name = item.name ?? item.stage_name ?? "";
  const description = item.description ?? "";
  const order = item.orderIndex ?? item.order ?? item.stage_order ?? index;

  return { id, name, description, order };
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
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <span className="font-inter text-xs text-muted-foreground">
            Orden:
          </span>
          <span className="font-inter text-sm font-semibold text-foreground">
            {item.order + 1}
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

  const fetchStages = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get(
        `/api/recruiter/companies/${COMPANY_ID}/stages`
      );
      const list = Array.isArray(data) ? data : data?.stages ?? data?.items ?? data?.data ?? [];
      setStages(list.map((item, i) => mapStageFromApi(item, i)));
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
    
    // If a new stage was created, put it first (order 0) and reorder the rest
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
          .sort((a, b) => a.order - b.order);
        
        // New stage first (order 0), then the rest in their current order
        const sortedStages = newStage ? [newStage, ...others] : [...mappedStages].sort((a, b) => a.order - b.order);
        const reorderedStages = sortedStages.map((stage, index) => ({
          ...stage,
          order: index,
        }));
        
        await Promise.all(
          reorderedStages.map((stage) =>
            apiClient.put(
              `/api/recruiter/companies/${COMPANY_ID}/stages/${stage.id}`,
              { name: stage.name, orderIndex: stage.order }
            )
          )
        );
        
        await fetchStages();
      } catch (err) {
        console.error("Error reordering stages:", err);
      }
    }
    
    setEditingStage(null);
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
        const sortedStages = [...mappedStages].sort((a, b) => a.order - b.order);
        const reorderedStages = sortedStages.map((stage, index) => ({
          ...stage,
          order: index,
        }));
        
        // Update all stages with new order
        await Promise.all(
          reorderedStages.map((stage) =>
            apiClient.put(
              `/api/recruiter/companies/${COMPANY_ID}/stages/${stage.id}`,
              { name: stage.name, orderIndex: stage.order }
            )
          )
        );
        
        // Refresh the list
        await fetchStages();
      } catch (err) {
        console.error("Error reordering stages after delete:", err);
        // Still refresh even if reorder fails
        await fetchStages();
      }
    } catch (err) {
      setFetchError(
        err?.message || err?.detail || "No se pudo eliminar la etapa. Intenta de nuevo."
      );
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

    const updatedStages = items.map((item, index) => ({
      ...item,
      order: index,
      orderIndex: index,
    }));

    setStages(updatedStages);
    setReorderLoading(true);

    try {
      await Promise.all(
        updatedStages.map((stage) =>
          apiClient.put(
            `/api/recruiter/companies/${COMPANY_ID}/stages/${stage.id}`,
            { name: stage.name, orderIndex: stage.order }
          )
        )
      );
    } catch (err) {
      setFetchError(
        err?.message || err?.detail || "No se pudo reordenar las etapas. Intenta de nuevo."
      );
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

  const sortedStages = [...filteredStages].sort((a, b) => a.order - b.order);

  const nestableItems = sortedStages.map((stage) => ({
    ...stage,
    onEdit: handleEdit,
    onDelete: handleDelete,
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
      />
    </div>
  );
}
