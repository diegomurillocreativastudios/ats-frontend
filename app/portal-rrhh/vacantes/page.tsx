"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, Briefcase } from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import NuevaVacanteModal from "@/components/rrhh/NuevaVacanteModal";
import { VacancyListCard } from "@/components/rrhh/VacancyListCard";
import { VacancyListFilters } from "@/components/rrhh/VacancyListFilters";
import PortalPageHeader from "@/components/ui/PortalPageHeader";
import Snackbar from "@/components/ui/Snackbar";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import { QUERY_PAGE_SIZE_DEFAULT } from "@/lib/api/query-paging";
import { listRecruiterVacanciesPage } from "@/lib/api/recruiter-vacancies";
import {
  EMPTY_VACANCY_LIST_FILTERS,
  filterVacancyList,
  type VacancyListFilters as VacancyFiltersState,
} from "@/lib/vacancies/filter-vacancy-list";
import {
  mapVacancyFromApi,
  type VacancyListItem,
} from "@/lib/vacancies/map-vacancy-list-item";

function VacancyListSection({
  loading,
  fetchError,
  filteredVacancies,
  filters,
  onRetry,
  onCreate,
  onRefresh,
  onSnackbar,
}: {
  loading: boolean;
  fetchError: string | null;
  filteredVacancies: VacancyListItem[];
  filters: VacancyFiltersState;
  onRetry: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  onSnackbar: (message: string, variant?: "success" | "error") => void;
}) {
  const t = useTranslations("RecruiterPortal.vacancies");

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
          aria-hidden
        />
        <p className="font-sans text-sm text-muted-foreground">{t("loadingStates.loading")}</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <p className="font-sans text-sm text-destructive" role="alert">
          {fetchError}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
        >
          {t("actions.retry")}
        </button>
      </div>
    );
  }

  if (filteredVacancies.length === 0) {
    const hasActiveFilters = Boolean(
      filters.titleQuery.trim() ||
        filters.companyId ||
        filters.modalityId ||
        filters.countryCode ||
        filters.departmentId
    );
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <Briefcase className="h-12 w-12 text-muted-foreground" aria-hidden />
        <p className="font-sans text-sm text-muted-foreground">
          {hasActiveFilters
            ? t("emptyStates.noVacanciesFiltered")
            : t("emptyStates.noVacancies")}
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("actions.createVacancy")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
      <ul className="flex flex-col gap-3" role="list">
        {filteredVacancies.map((vacancy) => (
          <li key={vacancy.id}>
            <VacancyListCard
              vacancy={vacancy}
              onRefresh={onRefresh}
              onSnackbar={onSnackbar}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VacantesPage() {
  const t = useTranslations("RecruiterPortal.vacancies");
  const [vacancies, setVacancies] = useState<VacancyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(QUERY_PAGE_SIZE_DEFAULT);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<VacancyFiltersState>(EMPTY_VACANCY_LIST_FILTERS);
  const [statusFilter] = useState("todas");
  const [isNuevaVacanteOpen, setIsNuevaVacanteOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    variant: "success" | "error";
    message: string;
  }>({
    open: false,
    variant: "success",
    message: "",
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const fetchVacancies = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await listRecruiterVacanciesPage({ page, pageSize });
      setVacancies(
        result.items.map((item, i) =>
          mapVacancyFromApi(item as Record<string, unknown>, i)
        )
      );
      setTotalCount(result.totalCount);
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ||
        (err as { detail?: string })?.detail ||
        t("errors.loadFailed");
      setFetchError(message);
      setVacancies([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [t, page, pageSize]);

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  const handleNuevaVacanteSubmit = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchVacancies();
    }
    setSnackbar({
      open: true,
      variant: "success",
      message: t("toasts.created"),
    });
  };

  const handlePageChange = (nextPage: number) => setPage(nextPage);

  const handlePageSizeChange = (nextSize: number) => {
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

  const filteredVacancies = useMemo(() => {
    const filtered = filterVacancyList(vacancies, filters);
    if (statusFilter === "todas") return filtered;
    return filtered.filter((v) => v.status === statusFilter);
  }, [vacancies, filters, statusFilter]);

  const handleSnackbar = (message: string, variant: "success" | "error" = "success") => {
    setSnackbar({ open: true, message, variant });
  };

  const renderPageHeader = () => (
    <PortalPageHeader
      className="shrink-0 gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between"
      title={t("page.title")}
      description={t("page.description")}
      actions={
        <button
          type="button"
          onClick={() => setIsNuevaVacanteOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:w-auto"
          aria-label={t("actions.createAria")}
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("actions.create")}</span>
          <span className="sm:hidden">{t("actions.createShort")}</span>
        </button>
      }
    />
  );

  const renderMainContent = () => (
    <section
      className="flex min-h-0 flex-1 flex-col gap-3"
      aria-label={t("page.listRegionLabel")}
    >
      <div className="shrink-0">
        <VacancyListFilters
          value={filters}
          onChange={setFilters}
          disabled={loading}
        />
      </div>
      <VacancyListSection
        loading={loading}
        fetchError={fetchError}
        filteredVacancies={filteredVacancies}
        filters={filters}
        onRetry={fetchVacancies}
        onCreate={() => setIsNuevaVacanteOpen(true)}
        onRefresh={fetchVacancies}
        onSnackbar={handleSnackbar}
      />
      {!loading && !fetchError ? (
        <div className="shrink-0">
          <ListPaginationBar
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            loading={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            labels={paginationLabels}
          />
        </div>
      ) : null}
    </section>
  );

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel={t("breadcrumb")} />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <section className="shrink-0 px-8 pt-6" aria-label={t("page.headerRegionLabel")}>
                {renderPageHeader()}
              </section>
              <section
                className="flex min-h-0 flex-1 flex-col px-8 pb-4 pt-2"
                aria-label={t("page.filtersAndListRegionLabel")}
              >
                {renderMainContent()}
              </section>
            </div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel={t("breadcrumb")} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 md:p-6">
            {renderPageHeader()}
            {renderMainContent()}
          </div>
        </main>
      </div>

      <NuevaVacanteModal
        isOpen={isNuevaVacanteOpen}
        onClose={() => setIsNuevaVacanteOpen(false)}
        onSubmit={handleNuevaVacanteSubmit}
        onSnackbar={handleSnackbar}
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
