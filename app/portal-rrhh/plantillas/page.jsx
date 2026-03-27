"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import PlantillaModal from "@/components/rrhh/PlantillaModal";
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal";
import Snackbar from "@/components/ui/Snackbar";
import { apiClient } from "@/lib/api";

const mapTemplateFromApi = (item, index = 0) => {
  const id = item?.id ?? index;
  const name = item.name ?? "";
  const type = item.type ?? "Notification";

  // Notification fields
  const subject = item.subjectTemplate ?? "";
  const body = item.bodyTemplate ?? "";
  const channels = Array.isArray(item?.channels) ? item.channels : [];

  // Document fields
  const contentTemplate = item.contentTemplate ?? "";
  const outputFormat = item.outputFormat ?? "PDF";

  // Questionnaire fields
  const description = item.description ?? "";
  const isMandatory = !!item.isMandatory;

  return {
    id, name, type,
    subject, body, channels,
    contentTemplate, outputFormat,
    description, isMandatory
  };
};

const TemplateCard = ({ template, onEdit, onDelete }) => {
  return (
    <article
      className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label={`Plantilla: ${template.name}`}
    >
      <div className="flex flex-1 items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-vo-purple/10"
          aria-hidden
        >
          <FileText className="h-6 w-6 text-vo-purple" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-inter text-base font-semibold text-foreground">
              {template.name}
            </h3>
            <span className={`rounded-full px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wider ${template.type === 'Notification' ? 'bg-blue-100 text-blue-700' :
                template.type === 'Document' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-amber-100 text-amber-700'
              }`}>
              {template.type === 'Notification' ? 'Notificación' :
                template.type === 'Document' ? 'Documento' : 'Cuestionario'}
            </span>
          </div>
          {template.type === 'Notification' && (
            <>
              {template.subject && (
                <p className="font-inter text-sm text-muted-foreground line-clamp-1">
                  <span className="font-semibold">Asunto:</span> {template.subject}
                </p>
              )}
              {template.body && (
                <p className="font-inter text-sm text-muted-foreground line-clamp-2 italic">
                  "{template.body}"
                </p>
              )}
            </>
          )}
          {template.type === 'Document' && (
            <p className="font-inter text-sm text-muted-foreground line-clamp-2">
              <span className="font-semibold">Formato:</span> {template.outputFormat}
            </p>
          )}
          {template.type === 'Questionnaire' && (
            <p className="font-inter text-sm text-muted-foreground line-clamp-2">
              {template.description} {template.isMandatory && <span className="text-vo-pink">(Obligatorio)</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onEdit(template)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-inter text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={`Editar plantilla ${template.name}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(template)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-background px-4 py-2.5 font-inter text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
          aria-label={`Eliminar plantilla ${template.name}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Eliminar
        </button>
      </div>
    </article>
  );
};

export default function PlantillasPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get("/api/Templates");
      const list = Array.isArray(data) ? data : data?.templates ?? data?.items ?? data?.data ?? [];
      setTemplates(list.map((item, i) => mapTemplateFromApi(item, i)));
    } catch (err) {
      setFetchError(
        err?.message || err?.detail || "No se pudieron cargar las plantillas."
      );
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleModalSubmit = () => {
    fetchTemplates();
    setEditingTemplate(null);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = (template) => {
    setTemplateToDelete(template);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setDeleteLoading(true);
    try {
      await apiClient.delete(
        `/api/Templates/${templateToDelete.id}`
      );
      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
      await fetchTemplates();
      setSnackbar({
        open: true,
        variant: "success",
        message: "Plantilla eliminada correctamente.",
      });
    } catch (err) {
      const msg =
        err?.message || err?.detail || "No se pudo eliminar la plantilla. Intenta de nuevo.";
      setSnackbar({ open: true, variant: "error", message: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!deleteLoading) {
      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.subject && t.subject.toLowerCase().includes(q)) ||
      (t.body && t.body.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.type && t.type.toLowerCase().includes(q))
    );
  });

  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel="Plantillas" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col">
              <section
                className="flex flex-col gap-4 border-b border-border px-8 py-5 sm:flex-row sm:items-center sm:justify-between"
                aria-label="Encabezado de plantillas"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="font-inter text-2xl font-bold text-foreground">
                    Plantillas
                  </h1>
                  <p className="font-inter text-sm text-muted-foreground">
                    Gestiona las plantillas de notificaciones
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNewTemplate}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-vo-purple px-6 py-3 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label="Crear nueva plantilla"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Nueva Plantilla
                </button>
              </section>
              <section className="flex flex-col gap-6 p-8" aria-label="Lista de plantillas">
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
                      placeholder="Buscar plantillas..."
                      className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                      aria-label="Buscar plantillas"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                      <p className="font-inter text-sm text-muted-foreground">
                        Cargando plantillas...
                      </p>
                    </div>
                  ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <p className="font-inter text-sm text-destructive" role="alert">
                        {fetchError}
                      </p>
                      <button
                        type="button"
                        onClick={fetchTemplates}
                        className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground" aria-hidden />
                      <p className="font-inter text-sm text-muted-foreground">
                        No se encontraron plantillas
                      </p>
                      <button
                        type="button"
                        onClick={handleNewTemplate}
                        className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Crear plantilla
                      </button>
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile — fixed height so only main scrolls */}
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel="Plantillas" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              aria-label="Encabezado de plantillas"
            >
              <div className="flex flex-col gap-1">
                <h1 className="font-inter text-xl font-bold text-foreground md:text-2xl">
                  Plantillas
                </h1>
                <p className="font-inter text-sm text-muted-foreground">
                  Gestiona las plantillas de notificaciones
                </p>
              </div>
              <button
                type="button"
                onClick={handleNewTemplate}
                className="inline-flex items-center justify-center gap-2 self-start rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                aria-label="Crear nueva plantilla"
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Nueva Plantilla</span>
                <span className="sm:hidden" aria-hidden>Nueva</span>
              </button>
            </section>
            <section className="flex flex-col gap-4" aria-label="Filtros y lista">
              <div className="relative w-full max-w-[320px]">
                <Search
                  className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Buscar plantillas..."
                  className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-inter text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label="Buscar plantillas"
                />
              </div>
              <div className="flex flex-col gap-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                    <p className="font-inter text-sm text-muted-foreground">
                      Cargando plantillas...
                    </p>
                  </div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <p className="font-inter text-sm text-destructive" role="alert">
                      {fetchError}
                    </p>
                    <button
                      type="button"
                      onClick={fetchTemplates}
                      className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-12 text-center md:py-16">
                    <FileText className="h-12 w-12 text-muted-foreground" aria-hidden />
                    <p className="font-inter text-sm text-muted-foreground">
                      No se encontraron plantillas
                    </p>
                    <button
                      type="button"
                      onClick={handleNewTemplate}
                      className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Crear plantilla
                    </button>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <PlantillaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        editingTemplate={editingTemplate}
        onSnackbar={(message, variant = "success") =>
          setSnackbar({ open: true, message, variant })
        }
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Eliminar plantilla"
        message={`¿Estás seguro de eliminar la plantilla "${templateToDelete?.name}"?`}
        confirmText="Aceptar"
        cancelText="Cancelar"
        loading={deleteLoading}
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
