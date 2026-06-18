import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const esPath = path.join(__dirname, "..", "messages", "es.json")
const es = JSON.parse(fs.readFileSync(esPath, "utf8"))

Object.assign(es.Common, {
  delete: "Eliminar",
  unspecified: "Sin especificar",
  downloadPdf: "Descargar PDF",
  generatingPdf: "Generando PDF...",
  userFallback: "Usuario",
  adminRoleFallback: "Administrador",
  selectPlaceholder: "Seleccionar…",
  retry: "Reintentar",
  search: "Buscar",
  clear: "Limpiar",
  edit: "Editar",
  create: "Crear",
  close: "Cerrar",
  back: "Volver",
  continue: "Continuar",
})

Object.assign(es.Actions, {
  delete: "Eliminar",
  cancel: "Cancelar",
  save: "Guardar",
})

Object.assign(es.Metadata, {
  root: {
    description: "Portal del candidato - Resumen de tu proceso de selección",
  },
  candidatePortal: {
    home: {
      title: "ATS | Portal Candidato",
      description: "Portal del candidato - Resumen de tu proceso de selección",
    },
    documents: {
      title: "ATS | Portal Candidato | Documentos",
      description: "Gestiona tus documentos en el portal del candidato",
    },
    interviews: {
      title: "ATS | Portal Candidato | Entrevistas",
      description:
        "Consultá tus entrevistas agendadas e historial en el portal del candidato",
    },
  },
  recruiterPortal: {
    title: "ATS | Portal RRHH",
    description:
      "Portal RRHH - Dashboard de reclutamiento y gestión de candidatos",
  },
  recruiterCandidates: {
    title: "ATS | Portal RRHH | Candidatos",
    description: "Gestiona los candidatos y sus perfiles en el portal RRHH",
  },
  recruiterSettings: {
    title: "ATS | Portal RRHH | Configuración",
    description: "Configuración del portal RRHH",
  },
  publicOpportunities: {
    list: {
      title: "ATS | Oportunidades",
      description: "Explorá vacantes activas por departamento y modalidad",
    },
    detail: {
      title: "ATS | Oportunidades | Vacante",
      description: "Detalle público de una vacante activa",
    },
    apply: {
      title: "ATS | Oportunidades | Aplicar",
      description: "Formulario público para aplicar a una vacante activa",
    },
  },
})

if (!es.Metadata.auth.register) {
  es.Metadata.auth.register = {
    title: "Registrarse",
    description: "Creá tu cuenta en la plataforma ATS",
  }
}

Object.assign(es.PublicOpportunities, {
  navbar: {
    ariaMain: "Navegación principal de oportunidades",
    ariaGoToPortal: "Ir al portal de oportunidades",
    logoIconAlt: "Logo icono ATS",
    portalSubtitle: "Portal de oportunidades",
    ariaGoToSelection: "Ir a selección de portal",
    changePortal: "Cambiar portal",
    portalsShort: "Portales",
  },
  tips: {
    title: "Consejo para tu postulación",
    tip1: "Revisa que tu correo electrónico y teléfono estén actualizados.",
    tip2: "Sube tu hoja de vida en formato PDF.",
    tip3: "Verifica que todos tus datos estén correctos antes de enviar.",
    tip4: "Asegúrate de cumplir con los requisitos principales de la vacante.",
    tip5: "Mantente pendiente de tu correo y teléfono después de postularte.",
    tip6: "Utiliza un nombre de archivo profesional para tu CV.",
    tip7: "Revisa la ortografía de tu información antes de continuar.",
    tip8: "Adjunta todos los documentos solicitados.",
    tip9: "No olvides incluir tu experiencia laboral más reciente.",
    tip10: "Confirma que tu disponibilidad coincida con lo solicitado en la vacante.",
  },
  apply: {
    vacancyNotFound: "No encontramos la vacante para esta aplicación.",
    loadFailed: "No se pudo cargar el formulario de aplicación.",
    backToDetail: "Volver al detalle de la vacante",
    applyBadge: "Postularme",
    beforeSubmit: "Antes de enviar",
    checklistCv: "Tené tu CV en PDF listo para adjuntar.",
    checklistEmail: "Usá el mismo correo asociado a tu cuenta de candidato.",
    checklistData: "Completá nombre, apellido y correo con datos reales.",
    formSectionLabel: "Formulario de postulación",
    formTitle: "Enviá tu postulación",
    formBody:
      "Completá los datos y adjuntá tu CV. La información se envía de forma segura al equipo de reclutamiento.",
    documentTitle: "ATS | Oportunidades | Aplicar a {title}",
  },
})

es.PublicOpportunities.applicationForm.validation.documentTypeRequiresNumber =
  "Si seleccionas un tipo de documento, debes ingresar el número."
es.PublicOpportunities.applicationForm.validation.documentNumberRequiresType =
  "Si ingresas un número de documento, debes seleccionar el tipo."

es.PublicOpportunities.page.resultsShowing =
  "Mostrando {from}-{to} de {total}"
es.PublicOpportunities.page.resultsFilterQuote = 'para "{query}"'
es.PublicOpportunities.page.resultsPage = "en la página {page}"
es.PublicOpportunities.page.locationMobileLabel = "Ubicación"

es.RecruiterPortal.candidateDetail.followUp = {
  title: "Seguimiento | {name}",
  add: "Agregar",
  cancel: "Cancelar",
  saving: "Guardando…",
  save: "Guardar seguimiento",
  sectionTitle: "Seguimiento {index}",
  periodLabel: "Período de seguimiento",
  selectPeriod: "Seleccionar período",
  commentsLabel: "Comentarios de evaluación",
  commentsPlaceholder: "Escribe comentarios sobre el seguimiento del candidato...",
  deleteAria: "Eliminar seguimiento {index}",
  period3: "3 meses post-contratación",
  period6: "6 meses post-contratación",
  period12: "12 meses post-contratación",
  periodMonths: "{months} meses",
  errors: {
    missingCandidateId: "ID de candidato no disponible",
    emptyFollowUp:
      "Debes completar al menos un seguimiento con un período o comentarios.",
    invalidPeriod: "Debes seleccionar un período de seguimiento válido.",
    saveFailed: "No se pudo guardar el seguimiento.",
  },
}

es.RecruiterPortal.vacancies.rematch = {
  ariaLabel: "Reajustar emparejamientos",
  titleNeedsRematch:
    "Requisitos actualizados. Se recomienda reajustar emparejamientos.",
  titleDefault: "Reajustar emparejamientos",
  adjusting: "Ajustando...",
  short: "Reajustar",
  label: "Reajustar emparejamiento",
  success: "¡Éxito!",
  processError: "Error al procesar",
  toastSuccess: "Emparejamiento reajustado correctamente.",
  toastError: "Error al reajustar emparejamiento",
}

es.RecruiterPortal.aiDisclosure = {
  progressAria: "Progreso del procesamiento con IA",
  preliminaryStepsAria: "Etapas del análisis preliminar",
  processingStepsAria: "Estados del procesamiento",
  percentComplete: "{percent} por ciento",
  assistedByAi: "Asistido por IA",
}

Object.assign(es.RecruiterPortal.settings, {
  calendarPage: {
    title: "Calendario",
    description:
      "Conectá Google Calendar para sincronizar entrevistas y enviar invitaciones automáticas.",
    connectedToast: "Google Calendar conectado correctamente.",
    syncing: "Sincronizando…",
    syncInterviews: "Sincronizar entrevistas",
    connectedAs: "Conectado como {email} (tu cuenta)",
    notConnected: "Google Calendar no está conectado.",
    connectHint: "Conectá tu cuenta para sincronizar entrevistas.",
  },
})

es.RecruiterPortal.reports.templateDetail = {
  loading: "Cargando reporte…",
  loadingConfig: "Cargando configuración del reporte…",
  loadingData: "Cargando datos del reporte…",
  errorNoTemplate: "No se encontró una plantilla de reporte con ese identificador.",
  errorNoConfig:
    "Esta plantilla aún no tiene configuración de reporte. Contactá al administrador o usá un reporte del listado.",
  errorNoContent:
    "La plantilla no tiene contenido HTML. Configurá contentTemplate en Administración → Plantillas.",
  errorNoData:
    "No hay datos para los filtros seleccionados. Probá ampliar el rango o cambiar el cliente.",
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
  headerAria: "Encabezado del reporte",
  filtersAria: "Filtros del reporte",
  backToReports: "Volver a reportes",
  breadcrumbReport: "Reporte",
  breadcrumbReports: "Reportes",
  clientFallback: "Cliente",
}

es.RecruiterPortal.reports.resolver = {
  loading: "Buscando el reporte en el catálogo…",
  notFound: "Reporte no encontrado",
  openFailed: "No se pudo abrir el reporte",
  backToReports: "Volver a reportes",
  notFoundDetail: "No encontramos un reporte con ese identificador en el catálogo.",
  unlinked:
    "Este reporte no tiene una plantilla vinculada todavía. Pedile al administrador que vincule una plantilla desde el módulo de reportes.",
}

Object.assign(es.RecruiterPortal.reports.dataView, {
  headerAria: "Encabezado del reporte",
  liveDataHint: "Datos en vivo del reporte. Ajustá filtros y aplicá para recargar.",
  filtersAria: "Filtros del reporte",
})

Object.assign(es.RecruiterPortal.reports.summary.dashboard, {
  clientsRegistered: "Clientes registrados en el periodo",
  vacanciesCreated: "Vacantes creadas",
  vacanciesDistribution:
    "Distribución entre vacantes abiertas y cerradas en el periodo.",
  candidatesRegistered: "Candidatos registrados",
  candidatesHired: "Candidatos finalizados como contratados",
  technicalEvaluationsSubtitle:
    "Seguimiento de evaluaciones completadas y tasa de aprobación.",
  mainSourceSubtitle:
    "Canal con mayor actividad registrada en el periodo seleccionado.",
  noRegisteredSource: "Sin fuente registrada",
  earlyStageHint:
    "Etapa temprana: la mayoría de los procesos aún concentra trabajo por delante respecto al avance global.",
  noVacanciesInPeriod: "No hay vacantes registradas en el periodo seleccionado.",
})

Object.assign(es.RecruiterPortal.dashboard, {
  mockBadges: {
    interview: "Entrevista",
    evaluation: "Evaluación",
    hired: "Contratado",
  },
})

if (!es.RecruiterPortal.vacancies.matching.errors) {
  es.RecruiterPortal.vacancies.matching.errors = {}
}
Object.assign(es.RecruiterPortal.vacancies.matching.errors, {
  moveStageFailed: "No se pudo mover el candidato de etapa.",
  missingDefaultApplicationStatus:
    "Falta el estado de postulación por defecto de la empresa. El servidor lo necesita al mover candidatos entre etapas. Configúralo en Etapas (estados) o pide a un administrador que lo haga.",
  updateApplicationStatusFailed: "No se pudo actualizar el estado de la postulación.",
  candidateMovedStage: "Candidato movido de etapa.",
  applicationStatusUpdated: "Estado de postulación actualizado.",
  missingApplicationId: "No se encontró el ID de la postulación para actualizar el estado.",
  downloadCvFailed: "No se pudo descargar el CV.",
  searchNoResults: "No se encontraron candidatos en la búsqueda.",
  searchAlreadyInPipeline:
    "Los candidatos encontrados ya están en Posibles candidatos o en Etapas.",
  goToStagesAria: "Ir a la sección Etapas para administrar estados de postulación",
  openProfileAria: "Abrir perfil del candidato en una nueva pestaña",
})

if (!es.RecruiterPortal.vacancies.matching.scoreTooltips) {
  es.RecruiterPortal.vacancies.matching.scoreTooltips = {}
}
es.RecruiterPortal.vacancies.matching.scoreTooltips.semanticSimilarity =
  "Mide qué tan alineado está el contenido del CV con la descripción de la vacante, usando comparación semántica de texto."

Object.assign(es.RecruiterPortal.vacancies.location, {
  countryLabel: "País",
  stateLabel: "Estado / provincia",
  helperText: "Opcional. Elige país y estado o provincia donde aplica la vacante.",
})

Object.assign(es.RecruiterPortal.settings, {
  calendarConnect: {
    label: "Conectar Google Calendar",
    redirecting: "Redirigiendo…",
    ariaLabel: "Conectar Google Calendar",
  },
  calendarDisconnect: {
    title: "¿Desconectar Google Calendar?",
    body: "Las entrevistas ya sincronizadas no se eliminarán de tu calendario, pero dejarás de recibir nuevas invitaciones automáticas.",
    confirm: "Desconectar",
    cancel: "Cancelar",
    toastSuccess: "Google Calendar desconectado.",
    toastError: "No se pudo desconectar Google Calendar.",
  },
})

Object.assign(es.RecruiterPortal.interviews, {
  schedule: {
    dateLabel: "Fecha de la entrevista",
    startTimeLabel: "Hora de inicio",
    startLabel: "Inicio",
    endTimeLabel: "Hora de fin",
    dateShort: "Fecha",
    timeShort: "Hora",
  },
})

fs.writeFileSync(esPath, `${JSON.stringify(es, null, 2)}\n`, "utf8")
console.log("Patched es.json with new i18n keys")
