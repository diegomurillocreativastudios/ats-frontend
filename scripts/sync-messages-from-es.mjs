import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, "..", "messages")

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function deepMerge(base, override) {
  const result = { ...base }
  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key]
    result[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? deepMerge(baseValue, overrideValue)
        : overrideValue
  }
  return result
}

function collectLeafPaths(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const pathKey = prefix ? `${prefix}.${key}` : key
    return isPlainObject(value) ? collectLeafPaths(value, pathKey) : [pathKey]
  })
}

function getAtPath(obj, dotPath) {
  return dotPath.split(".").reduce((acc, key) => acc?.[key], obj)
}

function setAtPath(obj, dotPath, value) {
  const keys = dotPath.split(".")
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!isPlainObject(current[key])) current[key] = {}
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

const ROUGH_EN_REPLACEMENTS = [
  [/Gestiona/g, "Manage"],
  [/Gestión/g, "Management"],
  [/Administra/g, "Manage"],
  [/Definí/g, "Define"],
  [/Cargando/g, "Loading"],
  [/Refrescar/g, "Refresh"],
  [/Reintentar/g, "Retry"],
  [/Editar/g, "Edit"],
  [/Eliminar/g, "Delete"],
  [/Cancelar/g, "Cancel"],
  [/Guardar/g, "Save"],
  [/Actualizar/g, "Update"],
  [/Cerrar/g, "Close"],
  [/Desactivar en su lugar/g, "Deactivate instead"],
  [/Nombre/g, "Name"],
  [/Descripción/g, "Description"],
  [/Acciones/g, "Actions"],
  [/departamento/g, "department"],
  [/Departamento/g, "Department"],
  [/departamentos/g, "departments"],
  [/modalidad/g, "modality"],
  [/Modalidad/g, "Modality"],
  [/modalidades/g, "modalities"],
  [/Crear/g, "Create"],
  [/Aún no hay/g, "No"],
  [/creados/g, "created yet"],
  [/creadas/g, "created yet"],
  [/catálogo global/g, "global catalog"],
  [/para vacantes/g, "for vacancies"],
  [/creado\./g, "created."],
  [/creada\./g, "created."],
  [/actualizado\./g, "updated."],
  [/actualizada\./g, "updated."],
  [/activado\./g, "activated."],
  [/activada\./g, "activated."],
  [/desactivado\./g, "deactivated."],
  [/desactivada\./g, "deactivated."],
  [/eliminado\./g, "deleted."],
  [/eliminada\./g, "deleted."],
  [/No se puede eliminar porque está asociado a vacantes existentes\./g, "Cannot delete because it is linked to existing vacancies."],
  [/nuevo/g, "new"],
  [/El nombre es obligatorio\./g, "Name is required."],
  [/El código es obligatorio\./g, "Code is required."],
  [/Usa solo minúsculas, números y guiones\./g, "Use lowercase letters, numbers and hyphens only."],
  [/El orden es obligatorio\./g, "Sort order is required."],
  [/Ingresa un número entero válido\./g, "Enter a valid integer."],
  [/No se pudo cargar el catálogo\./g, "Could not load the catalog."],
  [/No se pudo cargar el/g, "Could not load the"],
  [/No se pudo guardar el registro\./g, "Could not save the record."],
  [/No se pudo actualizar el registro\./g, "Could not update the record."],
  [/No se pudo eliminar el registro\./g, "Could not delete the record."],
  [/¿Eliminar el/g, "Delete the"],
  [/Esta acción intenta borrar el registro de forma definitiva\./g, "This action attempts to permanently delete the record."],
  [/No se puede eliminar/g, "Cannot delete"],
  [/Podés desactivar/g, "You can deactivate"],
  [/para dejar de ofrecerlo en nuevas vacantes sin perder la referencia de las ya existentes\./g, "to stop offering it on new vacancies without losing references from existing ones."],
  [/Resumen de/g, "Summary of"],
  [/Error al cargar/g, "Error loading"],
  [/Listado de/g, "List of"],
  [/Tipos de Documento/g, "Document Types"],
  [/tipo de documento/g, "document type"],
  [/tipos de documento/g, "document types"],
  [/Nuevo/g, "New"],
  [/Buscar por código o nombre\.\.\./g, "Search by code or name..."],
  [/Código/g, "Code"],
  [/Fecha de creación/g, "Created at"],
  [/Última actualización/g, "Last updated"],
  [/Ej\./g, "E.g."],
  [/Documento Único de Identidad/g, "National ID Document"],
  [/requerido\./g, "required."],
  [/no puede superar los/g, "cannot exceed"],
  [/caracteres\./g, "characters."],
  [/No tienes permisos para realizar esta acción\./g, "You do not have permission to perform this action."],
  [/correctamente\./g, "successfully."],
  [/No se encontraron resultados/g, "No results found"],
  [/Aún no hay tipos de documento creados/g, "No document types created yet"],
  [/Intenta buscar con otros términos\./g, "Try searching with other terms."],
  [/Cuando crees un tipo de documento, quedará disponible para clasificar documentos de identidad de candidatos\./g, "When you create a document type, it will be available to classify candidate identity documents."],
  [/¿Seguro que deseas eliminar este tipo de documento\? Esta acción lo ocultará de los listados activos\./g, "Are you sure you want to delete this document type? This action will hide it from active listings."],
  [/Sin actualizar/g, "Not updated"],
  [/Entrevistas/g, "Interviews"],
  [/Definí los tipos, modalidades y estados de entrevista que usarán los reclutadores al agendar y dar seguimiento en el portal RRHH\./g, "Define the interview types, modalities and statuses recruiters will use when scheduling and tracking in the HR portal."],
  [/Configuración de entrevistas/g, "Interview settings"],
  [/Tipos de entrevista/g, "Interview types"],
  [/Modalidades de entrevista/g, "Interview modalities"],
  [/Estados de entrevista/g, "Interview statuses"],
  [/Calendario de entrevistas/g, "Interview calendar"],
  [/Vista general de todas las entrevistas agendadas\. Los horarios se muestran en tu zona horaria; el API opera en UTC\./g, "Overview of all scheduled interviews. Times are shown in your time zone; the API operates in UTC."],
  [/Cargando entrevistas…/g, "Loading interviews…"],
  [/No hay entrevistas en este rango con los filtros actuales\./g, "No interviews in this range with the current filters."],
  [/Filtros del calendario/g, "Calendar filters"],
  [/Filtros/g, "Filters"],
  [/Limpiar filtros/g, "Clear filters"],
  [/Empresa/g, "Company"],
  [/Vacante/g, "Vacancy"],
  [/Reclutador/g, "Recruiter"],
  [/Estado/g, "Status"],
  [/Tipo \(local\)/g, "Type (local)"],
  [/Modalidad \(local\)/g, "Modality (local)"],
  [/Buscar/g, "Search"],
  [/Candidato, vacante, reclutador…/g, "Candidate, vacancy, recruiter…"],
  [/Incluir canceladas/g, "Include cancelled"],
  [/Todas/g, "All"],
  [/Todos/g, "All"],
  [/Hoy/g, "Today"],
  [/Periodo anterior/g, "Previous period"],
  [/Periodo siguiente/g, "Next period"],
  [/Vista agenda en móvil/g, "Agenda view on mobile"],
  [/Vista del calendario/g, "Calendar view"],
  [/Día/g, "Day"],
  [/Semana/g, "Week"],
  [/Mes/g, "Month"],
  [/Año/g, "Year"],
  [/Agenda/g, "Agenda"],
  [/Indicadores de entrevistas/g, "Interview indicators"],
  [/Total en rango/g, "Total in range"],
  [/Programadas/g, "Scheduled"],
  [/Completadas/g, "Completed"],
  [/Canceladas/g, "Cancelled"],
  [/Detalle de entrevista/g, "Interview detail"],
  [/Abrir en portal RRHH →/g, "Open in HR portal →"],
  [/Cuándo/g, "When"],
  [/Duración/g, "Duration"],
  [/Zona horaria/g, "Time zone"],
  [/Entrevistador/g, "Interviewer"],
  [/ min/g, " min"],
  [/Entrevista/g, "Interview"],
  [/ con /g, " with "],
  [/ para /g, " for "],
  [/Hora/g, "Time"],
  [/Candidato/g, "Candidate"],
  [/Disponibles para nuevas vacantes\./g, "available for new vacancies."],
  [/En uso por vacantes activas o históricas\./g, "In use by active or historical vacancies."],
  [/Cuando crees un/g, "When you create a"],
  [/quedará disponible para clasificar vacantes desde el resto del ATS\./g, "it will be available to classify vacancies across the ATS."],
  [/Gestión de etapas y estados del proceso de reclutamiento/g, "Manage recruitment pipeline stages and statuses"],
  [/Plantillas/g, "Templates"],
  [/Gestión de plantillas de notificaciones y documentos/g, "Manage notification and document templates"],
  [/Gestión del catálogo global de departamentos de vacantes/g, "Manage the global vacancy department catalog"],
  [/Gestión del catálogo global de modalidades de vacantes/g, "Manage the global vacancy modality catalog"],
  [/Gestión del catálogo global de tipos de documento de identidad/g, "Manage the global identity document type catalog"],
  [/Catálogos de tipos, modalidades y estados de entrevista/g, "Catalogs of interview types, modalities and statuses"],
  [/Vista general de entrevistas agendadas/g, "Overview of scheduled interviews"],
  [/Portal Admin/g, "Admin Portal"],
  [/el /g, "the "],
  [/la /g, "the "],
  [/\{count\} más/g, "+{count} more"],
  [/entrevista/g, "interview"],
  [/entrevistas/g, "interviews"],
  [/Lun/g, "Mon"],
  [/Mar/g, "Tue"],
  [/Mié/g, "Wed"],
  [/Jue/g, "Thu"],
  [/Vie/g, "Fri"],
  [/Sáb/g, "Sat"],
  [/Dom/g, "Sun"],
  [/Ene/g, "Jan"],
  [/Feb/g, "Feb"],
  [/Mar/g, "Mar"],
  [/Abr/g, "Apr"],
  [/May/g, "May"],
  [/Jun/g, "Jun"],
  [/Jul/g, "Jul"],
  [/Ago/g, "Aug"],
  [/Sep/g, "Sep"],
  [/Oct/g, "Oct"],
  [/Nov/g, "Nov"],
  [/Dic/g, "Dec"],
]

function roughEnTranslate(text) {
  if (typeof text !== "string") return text
  let result = text
  for (const [pattern, replacement] of ROUGH_EN_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function translateLeaf(esValue, locale) {
  if (typeof esValue !== "string") return esValue
  if (locale === "en") return roughEnTranslate(esValue)
  return roughEnTranslate(esValue)
}

const es = JSON.parse(fs.readFileSync(path.join(messagesDir, "es.json"), "utf8"))
const esPaths = collectLeafPaths(es).sort()

const NEW_PREFIXES = [
  "AdminPortal.vacancyCatalog",
  "AdminPortal.documentTypes",
  "AdminPortal.interviews",
  "Metadata.adminPortal.stages",
  "Metadata.adminPortal.templates",
  "Metadata.adminPortal.departments",
  "Metadata.adminPortal.modalities",
  "Metadata.adminPortal.documentTypes",
  "Metadata.adminPortal.interviewsCatalog",
  "Metadata.adminPortal.interviewsCalendar",
]

const newPaths = esPaths.filter((p) =>
  NEW_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}.`)),
)

for (const locale of ["en", "it", "de", "fr"]) {
  const filePath = path.join(messagesDir, `${locale}.json`)
  const target = JSON.parse(fs.readFileSync(filePath, "utf8"))
  const merged = deepMerge(es, target)

  for (const dotPath of newPaths) {
    const esValue = getAtPath(es, dotPath)
    const existing = getAtPath(target, dotPath)
    if (existing !== undefined) continue
    const translated =
      locale === "en" ? translateLeaf(esValue, "en") : translateLeaf(esValue, locale)
    setAtPath(merged, dotPath, translated)
  }

  fs.writeFileSync(filePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8")
  console.log(`Synced ${locale}.json (${newPaths.length} new leaf paths checked)`)
}
