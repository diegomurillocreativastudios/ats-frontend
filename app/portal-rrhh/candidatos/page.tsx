"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Search, Eye, Users, Plus, ClipboardList } from "lucide-react";
import RRHHSidebar from "@/components/rrhh/RRHHSidebar";
import RRHHTopbar from "@/components/rrhh/RRHHTopbar";
import PortalPageHeader from "@/components/ui/PortalPageHeader";
import Snackbar from "@/components/ui/Snackbar";
import { ListPaginationBar } from "@/components/ui/list-pagination-bar";
import AgregarCandidatoModal from "@/components/candidato/AgregarCandidatoModal";
import CandidateFollowUpModal, {
  type CandidateProfile,
} from "@/components/candidato/CandidateFollowUpModal";
import { listRecruiterCandidatesAll } from "@/lib/api/recruiter-candidates";
import { QUERY_PAGE_SIZE_DEFAULT } from "@/lib/api/query-paging";
import { formatPhoneSvDisplay } from "@/lib/formatPhoneSv";
import { getInitials } from "@/lib/getInitials";
import { resolveCountryDisplay } from "@/lib/normalizeCountryDisplay";

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

const TABLE_HEAD_CELL_CLASS =
  "sticky top-0 z-10 border-b border-border bg-muted px-5 py-3 text-left font-sans text-[13px] font-semibold text-foreground";
const TABLE_BODY_CELL_CLASS = "border-b border-border px-5 py-3 align-middle";

/**
 * Maps API candidate document to table row shape.
 * New API shape: { id, document: { id, uploadedAt }, personalInfo: { name, email, phone, country }, profile: { headline, summary }, recruitment: { hired, evaluations } }
 */
const mapCandidateFromApi = (item, index = 0, noNameLabel = "Sin nombre") => {
  // Handle both old and new format
  const id = String(
    item?.id ?? item?.profileId ?? item?.documentId ?? item?.uuid ?? index
  );
  
  // Extract data from nested structure or fallback to old flat structure
  const personalInfo = item?.personalInfo ?? {};
  const profile = item?.profile ?? {};
  const document = item?.document ?? {};
  const recruitment = item?.recruitment ?? {};
  
  // Etapa 10: `noNameLabel` es un fallback frontend controlado (no es data del
  // backend). Solo se aplica cuando el nombre real llega vacío.
  const name = emptyToDash(personalInfo?.name ?? item?.name) === "—" ? noNameLabel : (personalInfo?.name ?? item?.name ?? noNameLabel).trim();
  const email = emptyToDash(personalInfo?.email ?? item?.email);
  const phone = formatPhoneSvDisplay(personalInfo?.phone ?? item?.phone);
  const country = resolveCountryDisplay(personalInfo?.country ?? item?.country, phone);
  const headline = emptyToDash(profile?.headline ?? item?.headline);
  const summary = emptyToDash(profile?.summary ?? item?.summary);
  
  // Date from document.uploadedAt or fallback to old fields
  const date = formatDate(
    document?.uploadedAt ?? 
    item?.uploadedAt ?? 
    item?.createdAt ?? 
    item?.created_at ?? 
    null
  );
  
  const initials = getInitials(name, email !== "—" ? email : "");
  
  // Handle evaluations from new nested structure
  const evaluations = recruitment?.evaluations ?? item?.evaluations ?? [];
  const latestEval = evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;

  return {
    id,
    profileId: id, // Use the main id as profileId
    name,
    email,
    phone,
    country,
    headline,
    summary,
    date,
    initials,
    evalMonth: latestEval?.evalMonth ?? item?.evalMonth ?? null,
    evalComments: latestEval?.evalComments ?? item?.evalComments ?? null,
    evaluations,
    hired: recruitment?.hired ?? false,
  };
};

const CandidateRow = ({ candidate, onFollowUpClick }) => {
  const t = useTranslations("RecruiterPortal.candidates");
  const detailHref = `/portal-rrhh/candidatos/${candidate.id}`;
  const isHired = candidate.hired === true;
  const followUpDisabled = !isHired; // Invertido: solo contratados pueden tener seguimiento
  const tooltipText = isHired ? t("hired") : t("notHired");

  return (
    <tr aria-label={t("rowAriaLabel", { name: candidate.name })}>
      <td className={TABLE_BODY_CELL_CLASS}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vo-purple font-sans text-sm font-semibold text-white"
            aria-hidden
          >
            {candidate.initials}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-sans text-sm font-semibold text-foreground">
              {candidate.name}
            </span>
            <span className="font-sans text-xs text-muted-foreground truncate max-w-[200px]">
              {candidate.email}
            </span>
          </div>
        </div>
      </td>
      <td className={`${TABLE_BODY_CELL_CLASS} font-sans text-[13px] text-foreground`}>
        {candidate.phone}
      </td>
      <td className={`${TABLE_BODY_CELL_CLASS} font-sans text-[13px] text-foreground`}>
        {candidate.country}
      </td>
      <td
        className={`${TABLE_BODY_CELL_CLASS} max-w-[200px] truncate font-sans text-[13px] text-foreground`}
        title={candidate.headline !== "—" ? candidate.headline : undefined}
      >
        {candidate.headline}
      </td>
      <td className={`${TABLE_BODY_CELL_CLASS} font-sans text-[13px] text-muted-foreground`}>
        {candidate.date}
      </td>
      <td className={TABLE_BODY_CELL_CLASS}>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              type="button"
              onClick={followUpDisabled ? undefined : () => onFollowUpClick(candidate)}
              disabled={followUpDisabled}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 ${
                followUpDisabled
                  ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
              aria-label={followUpDisabled ? tooltipText : t("followUpAriaLabel", { name: candidate.name })}
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {tooltipText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
          <Link
            href={detailHref}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label={t("viewDetailAriaLabel", { name: candidate.name })}
          >
            <Eye className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </td>
    </tr>
  );
};

export default function CandidatosPage() {
  const t = useTranslations("RecruiterPortal.candidates");
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(QUERY_PAGE_SIZE_DEFAULT);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    variant: "success",
    message: "",
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSnackbar = (message: string, variant: "success" | "error" = "success") => {
    setSnackbar({ open: true, message, variant });
  };

  const handleFollowUpClick = (candidate: CandidateProfile) => {
    setSelectedCandidate(candidate);
    setIsFollowUpModalOpen(true);
  };

  const handleFollowUpClose = () => {
    setIsFollowUpModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleCandidateUpdated = (updatedCandidate: CandidateProfile) => {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === updatedCandidate.id || c.profileId === updatedCandidate.id
          ? { ...c, ...updatedCandidate }
          : c
      )
    );
    handleSnackbar(t("followUpSaved"), "success");
  };

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await listRecruiterCandidatesAll({ page, pageSize });
      const noNameLabel = t("noName");
      setCandidates(
        result.items.map((item, i) => mapCandidateFromApi(item, i, noNameLabel))
      );
      setTotalCount(result.totalCount);
    } catch (err) {
      setFetchError(
        err?.message ?? err?.detail ?? t("loadError")
      );
      setCandidates([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [t, page, pageSize]);

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

  const handlePageChange = (nextPage) => setPage(nextPage);

  const handlePageSizeChange = (nextSize) => {
    setPageSize(nextSize);
    setPage(1);
  };

  const handleCandidatesMutated = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    void fetchCandidates();
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

  const renderPageHeader = () => (
    <PortalPageHeader
      className="shrink-0 gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between"
      title={t("title")}
      description={t("description")}
      actions={
        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span>{t("addCandidate")}</span>
        </button>
      }
    />
  );

  const mainContent = (
    <section className="flex min-h-0 flex-1 flex-col gap-3" aria-label={t("regionLabel")}>
      <div className="relative w-full shrink-0">
        <Search
          className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full rounded-lg border-0 bg-muted py-2.5 pl-10 pr-3.5 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={t("searchAriaLabel")}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
              aria-hidden
            />
            <p className="font-sans text-sm text-muted-foreground">
              {t("loading")}
            </p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="font-sans text-sm text-destructive" role="alert">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={fetchCandidates}
              className="inline-flex items-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover"
            >
              {t("retry")}
            </button>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">
              {t("empty")}
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 font-sans">
              <thead>
                <tr>
                  <th className={TABLE_HEAD_CELL_CLASS} scope="col">
                    {t("table.candidate")}
                  </th>
                  <th className={TABLE_HEAD_CELL_CLASS} scope="col">
                    {t("table.phone")}
                  </th>
                  <th className={TABLE_HEAD_CELL_CLASS} scope="col">
                    {t("table.country")}
                  </th>
                  <th className={TABLE_HEAD_CELL_CLASS} scope="col">
                    {t("table.headline")}
                  </th>
                  <th className={TABLE_HEAD_CELL_CLASS} scope="col">
                    {t("table.uploadedAt")}
                  </th>
                  <th className={TABLE_HEAD_CELL_CLASS} scope="col">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate, index) => (
                  <CandidateRow
                    key={`${candidate.id}-${index}`}
                    candidate={candidate}
                    onFollowUpClick={handleFollowUpClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
      {/* Desktop: sidebar + main — fixed height so only main scrolls */}
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar variant="desktop" breadcrumbLabel={t("breadcrumb")} />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <section className="shrink-0 px-8 pt-6" aria-label={t("headerRegionLabel")}>
                {renderPageHeader()}
              </section>
              <section className="flex min-h-0 flex-1 flex-col px-8 pb-4 pt-2" aria-label={t("contentRegionLabel")}>
                {mainContent}
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Tablet & Mobile — fixed height so only main scrolls */}
      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar variant="tablet" breadcrumbLabel={t("breadcrumb")} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 md:p-6">
            {renderPageHeader()}
            {mainContent}
          </div>
        </main>
      </div>

      <AgregarCandidatoModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleCandidatesMutated}
        onSnackbar={handleSnackbar}
      />

      <CandidateFollowUpModal
        open={isFollowUpModalOpen}
        candidate={selectedCandidate}
        onClose={handleFollowUpClose}
        onUpdated={handleCandidateUpdated}
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
