"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import PlantillaModal from "@/components/rrhh/PlantillaModal";
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal";
import PortalPageHeader from "@/components/ui/PortalPageHeader";
import Snackbar from "@/components/ui/Snackbar";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { apiClient } from "@/lib/api";
import { QUERY_PAGE_SIZE_DEFAULT, fetchHeaderPagedList } from "@/lib/api/query-paging";
import { getApiErrorMessage } from "@/lib/api-error";

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
  const isTechnicalSheet = Boolean(item?.isTechnicalSheet);
  const isReport = Boolean(item?.isReport);

  // Questionnaire fields
  const description = item.description ?? "";
  const isMandatory = !!item.isMandatory;

  return {
    id, name, type,
    subject, body, channels,
    contentTemplate, outputFormat, isTechnicalSheet, isReport,
    description, isMandatory
  };
};

const TemplateCard = ({ template, onEdit, onDelete, t }) => {
  const typeLabel =
    template.type === "Notification"
      ? t("types.notification")
      : template.type === "Document"
        ? t("types.document")
        : t("types.questionnaire");

  return (
    <article
      className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label={t("card.templateAria", { name: template.name })}
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
            <h3 className="font-sans text-base font-semibold text-foreground">
              {template.name}
            </h3>
            <span className={`rounded-full px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider ${template.type === 'Notification' ? 'bg-blue-100 text-blue-700' :
                template.type === 'Document' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-amber-100 text-amber-700'
              }`}>
              {typeLabel}
            </span>
            {template.type === 'Document' && template.isTechnicalSheet && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-slate-700">
                {t("types.technicalSheet")}
              </span>
            )}
            {template.type === 'Document' && template.isReport && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-violet-800">
                {t("types.report")}
              </span>
            )}
          </div>
          {template.type === 'Notification' && (
            <>
              {template.subject && (
                <p className="font-sans text-sm text-muted-foreground line-clamp-1">
                  <span className="font-semibold">{t("card.subject")}</span> {template.subject}
                </p>
              )}
              {template.body && (
                <p className="font-sans text-sm text-muted-foreground line-clamp-2 italic">
                  &quot;{template.body}&quot;
                </p>
              )}
            </>
          )}
          {template.type === 'Document' && (
            <p className="font-sans text-sm text-muted-foreground line-clamp-2">
              <span className="font-semibold">{t("card.format")}</span> {template.outputFormat}
            </p>
          )}
          {template.type === 'Questionnaire' && (
            <p className="font-sans text-sm text-muted-foreground line-clamp-2">
              {template.description} {template.isMandatory && <span className="text-vo-pink">{t("card.required")}</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onEdit(template)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={t("actions.editAria", { name: template.name })}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {t("actions.edit")}
        </button>
        <button
          type="button"
          onClick={() => onDelete(template)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-background px-4 py-2.5 font-sans text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
          aria-label={t("actions.deleteAria", { name: template.name })}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("actions.delete")}
        </button>
      </div>
    </article>
  );
};

export default function PlantillasPage() {
  const t = useTranslations("AdminPortal.templates");
  const tCommon = useTranslations("Common");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(QUERY_PAGE_SIZE_DEFAULT);
  const [totalCount, setTotalCount] = useState(0);
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
      const result = await fetchHeaderPagedList("/api/Templates", {
        page,
        pageSize,
      });
      setTemplates(result.items.map((item, i) => mapTemplateFromApi(item, i)));
      setTotalCount(result.totalCount);
    } catch (err) {
      setFetchError(
        getApiErrorMessage(err) || t("errors.loadFailed")
      );
      setTemplates([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, t]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleModalSubmit = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchTemplates();
    }
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
        message: t("toasts.deleted"),
      });
    } catch (err) {
      const msg =
        getApiErrorMessage(err) || t("errors.deleteFailed");
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

  const handlePageChange = (nextPage) => setPage(nextPage);

  const handlePageSizeChange = (nextSize) => {
    setPageSize(nextSize);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const paginationLabels = {
    perPage: t("pagination.perPage"),
    pageSizeAria: t("pagination.pageSizeAria"),
    regionAria: t("pagination.regionAria"),
    summary: t("pagination.summary", { page, total: totalPages }),
    prev: t("pagination.prev"),
    next: t("pagination.next"),
    count: t("pagination.count", { count: totalCount }),
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background font-sans text-foreground">
      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="min-w-0 flex flex-col">
              <section className="px-8 py-6" aria-label={t("page.headerAria")}>
                <PortalPageHeader
                  title={t("page.title")}
                  description={t("page.description")}
                  actions={
                    <button
                      type="button"
                      onClick={handleNewTemplate}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                      aria-label={t("page.newTemplateAria")}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      {t("page.newTemplate")}
                    </button>
                  }
                />
              </section>
              <section className="flex flex-col gap-6 p-8" aria-label={t("page.listAria")}>
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
                      placeholder={t("page.searchPlaceholder")}
                      className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                      aria-label={t("page.searchAria")}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent" aria-hidden />
                      <p className="font-sans text-sm text-muted-foreground">
                        {t("loadingStates.loading")}
                      </p>
                    </div>
                  ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <p className="font-sans text-sm text-destructive" role="alert">
                        {fetchError}
                      </p>
                      <button
                        type="button"
                        onClick={fetchTemplates}
                        className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                      >
                        {t("actions.retry")}
                      </button>
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground" aria-hidden />
                      <p className="font-sans text-sm text-muted-foreground">
                        {t("emptyStates.notFound")}
                      </p>
                      <button
                        type="button"
                        onClick={handleNewTemplate}
                        className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        {t("actions.create")}
                      </button>
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        t={t}
                      />
                    ))
                  )}
                </div>
                {!loading && !fetchError ? (
                  <ListPaginationBar
                    page={page}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    loading={loading}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    labels={paginationLabels}
                  />
                ) : null}
              </section>
            </div>
          </main>



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
        title={t("deleteConfirm.title")}
        message={
          templateToDelete
            ? t("deleteConfirm.message", { name: templateToDelete.name })
            : ""
        }
        confirmText={t("actions.accept")}
        cancelText={tCommon("cancel")}
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
