"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import PlantillaModal from "@/components/rrhh/PlantillaModal";
import DeleteConfirmModal from "@/components/rrhh/DeleteConfirmModal";
import {
  ADMIN_SURFACE_CLASS,
  AdminEmptyState,
  AdminErrorPanel,
  AdminLoadingState,
  AdminPageFrame,
  AdminSurface,
} from "@/components/portal-admin/admin-page-chrome";
import PortalPageHeader from "@/components/ui/PortalPageHeader";
import { Button } from "@/components/ui/Button";
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
      className={`flex w-full flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${ADMIN_SURFACE_CLASS}`}
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
    <>
      <AdminPageFrame>
                <PortalPageHeader
                  title={t("page.title")}
                  description={t("page.description")}
                  layout="split"
                  actions={
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleNewTemplate}
                      aria-label={t("page.newTemplateAria")}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      {t("page.newTemplate")}
                    </Button>
                  }
                />
                <section className="flex flex-col gap-4" aria-label={t("page.listAria")}>
                  {loading ? (
                    <AdminSurface>
                      <AdminLoadingState label={t("loadingStates.loading")} />
                    </AdminSurface>
                  ) : fetchError ? (
                    <AdminErrorPanel
                      message={fetchError}
                      onRetry={fetchTemplates}
                      retryLabel={t("actions.retry")}
                    />
                  ) : templates.length === 0 ? (
                    <AdminSurface>
                      <AdminEmptyState
                        icon={FileText}
                        title={t("emptyStates.notFound")}
                        action={
                          <Button type="button" variant="primary" onClick={handleNewTemplate}>
                            <Plus className="h-4 w-4" aria-hidden />
                            {t("actions.create")}
                          </Button>
                        }
                      />
                    </AdminSurface>
                  ) : (
                    templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        t={t}
                      />
                    ))
                  )}
                </section>
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
      </AdminPageFrame>

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
    </>
  );
}
