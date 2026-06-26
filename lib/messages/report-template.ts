type ReportTemplateTranslator = (key: string) => string

export function getReportTemplateMessages(t: ReportTemplateTranslator) {
  return {
    loading: t("loading"),
    loadingConfig: t("loadingConfig"),
    loadingData: t("loadingData"),
    errorNoTemplate: t("errorNoTemplate"),
    errorNoConfig: t("errorNoConfig"),
    errorNoContent: t("errorNoContent"),
    errorNoData: t("errorNoData"),
    errorForbidden: t("errorForbidden"),
    errorGeneric: t("errorGeneric"),
    errorPreview: t("errorPreview"),
    errorInvalidId: t("errorInvalidId"),
    downloadPdf: t("downloadPdf"),
    downloadingPdf: t("downloadingPdf"),
    savingPdf: t("savingPdf"),
    pdfExportFailed: t("pdfExportFailed"),
    pdfHistoryWarning: t("pdfHistoryWarning"),
    previewTitle: t("previewTitle"),
    filtersHint: t("filtersHint"),
    applyFilters: t("applyFilters"),
    legacyModeHint: t("legacyModeHint"),
    reportKeyBadge: t("reportKeyBadge"),
    headerAria: t("headerAria"),
    filtersAria: t("filtersAria"),
    backToReports: t("backToReports"),
    breadcrumbReport: t("breadcrumbReport"),
    breadcrumbReports: t("breadcrumbReports"),
    clientFallback: t("clientFallback"),
    resolverLoading: t("loading"),
    resolverNotFound: t("errorNoTemplate"),
    resolverUnlinked: t("errorNoConfig"),
  }
}

/** @deprecated Use getReportTemplateMessages with useTranslations */
export const reportTemplateMessages = {
  loading: "Cargando reporte…",
  loadingConfig: "Cargando configuración del reporte…",
  errorNoTemplate: "No se encontró una plantilla de reporte con ese identificador.",
  errorNoConfig:
    "Esta plantilla aún no tiene configuración de reporte. Contactá al administrador o usá un reporte del listado.",
  errorNoContent:
    "La plantilla no tiene contenido HTML. Configurá contentTemplate en Administración → Plantillas.",
  errorNoData: "No hay datos para los filtros seleccionados. Probá ampliar el rango o cambiar el cliente.",
  errorForbidden: "No tenés permisos para ver este reporte.",
  errorGeneric: "No se pudo cargar el reporte.",
  errorPreview: "No se pudo generar la vista previa. Revisá los filtros e intentá de nuevo.",
  errorInvalidId: "Identificador de plantilla no válido.",
  downloadPdf: "Descargar PDF",
  downloadingPdf: "Generando PDF…",
  savingPdf: "Guardando copia en historial…",
  pdfExportFailed: "No se pudo generar el PDF. Intentá de nuevo.",
  pdfHistoryWarning:
    "El PDF se descargó correctamente, pero no se pudo guardar en el historial. Podés reintentar más tarde.",
  previewTitle: "Vista previa del reporte",
  filtersHint: "Ajustá los filtros y aplicá para actualizar la vista previa del reporte.",
  applyFilters: "Aplicar filtros",
  legacyModeHint:
    "Modo temporal: usando resumen ejecutivo hasta que el backend publique la configuración dinámica.",
  reportKeyBadge: "Tipo de reporte",
  resolverLoading: "Buscando el reporte en el catálogo…",
  resolverNotFound: "No encontramos un reporte con ese identificador en el catálogo.",
  resolverUnlinked:
    "Este reporte no tiene una plantilla vinculada todavía. Pedile al administrador que vincule una plantilla desde el módulo de reportes.",
}
