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
  [/Consultá/g, "View"],
  [/Consulta/g, "View"],
  [/Explorá/g, "Explore"],
  [/Creá/g, "Create"],
  [/Elegí/g, "Choose"],
  [/Definí/g, "Define"],
  [/Cargando/g, "Loading"],
  [/Guardando/g, "Saving"],
  [/Reintentar/g, "Retry"],
  [/Editar/g, "Edit"],
  [/Eliminar/g, "Delete"],
  [/Cancelar/g, "Cancel"],
  [/Guardar/g, "Save"],
  [/Agregar/g, "Add"],
  [/Actualizar/g, "Update"],
  [/Cerrar/g, "Close"],
  [/Volver/g, "Back"],
  [/Continuar/g, "Continue"],
  [/Buscar/g, "Search"],
  [/Limpiar/g, "Clear"],
  [/Seleccionar/g, "Select"],
  [/Selecciona/g, "Select"],
  [/Consejo/g, "Tip"],
  [/postulación/g, "application"],
  [/Postulación/g, "Application"],
  [/Postularme/g, "Apply"],
  [/oportunidades/g, "opportunities"],
  [/Oportunidades/g, "Opportunities"],
  [/vacante/g, "vacancy"],
  [/Vacante/g, "Vacancy"],
  [/vacantes/g, "vacancies"],
  [/Vacantes/g, "Vacancies"],
  [/candidato/g, "candidate"],
  [/Candidato/g, "Candidate"],
  [/candidatos/g, "candidates"],
  [/Candidatos/g, "Candidates"],
  [/entrevista/g, "interview"],
  [/Entrevista/g, "Interview"],
  [/entrevistas/g, "interviews"],
  [/Entrevistas/g, "Interviews"],
  [/Configuración/g, "Settings"],
  [/Configuracion/g, "Settings"],
  [/Reporte/g, "Report"],
  [/Reportes/g, "Reports"],
  [/Empresa/g, "Company"],
  [/Usuario/g, "User"],
  [/Perfil/g, "Profile"],
  [/Documentos/g, "Documents"],
  [/Calendario/g, "Calendar"],
  [/Sincronizando/g, "Syncing"],
  [/Conectar/g, "Connect"],
  [/Desconectar/g, "Disconnect"],
  [/Seguimiento/g, "Follow-up"],
  [/Período/g, "Period"],
  [/Comentarios/g, "Comments"],
  [/Reajustar/g, "Re-adjust"],
  [/Emparejamiento/g, "Matching"],
  [/Análisis/g, "Analysis"],
  [/Búsqueda/g, "Search"],
  [/Sin /g, "No "],
  [/No hay/g, "No"],
  [/No se pudo/g, "Could not"],
  [/No se pudieron/g, "Could not"],
  [/No encontramos/g, "We could not find"],
  [/¿/g, ""],
  [/…/g, "..."],
  [/á/g, "a"],
  [/é/g, "e"],
  [/í/g, "i"],
  [/ó/g, "o"],
  [/ú/g, "u"],
  [/ñ/g, "n"],
]

function roughEnTranslate(text) {
  if (typeof text !== "string") return text
  let result = text
  for (const [pattern, replacement] of ROUGH_EN_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

const es = JSON.parse(fs.readFileSync(path.join(messagesDir, "es.json"), "utf8"))
const esPaths = collectLeafPaths(es).sort()

for (const locale of ["en", "it", "de", "fr"]) {
  const filePath = path.join(messagesDir, `${locale}.json`)
  const existing = JSON.parse(fs.readFileSync(filePath, "utf8"))
  const merged = deepMerge(es, existing)
  let added = 0

  for (const dotPath of esPaths) {
    const esValue = getAtPath(es, dotPath)
    const current = getAtPath(existing, dotPath)
    if (current !== undefined) continue
    const translated =
      locale === "es"
        ? esValue
        : locale === "en"
          ? roughEnTranslate(esValue)
          : roughEnTranslate(getAtPath(merged, dotPath) ?? esValue)
    setAtPath(merged, dotPath, translated)
    added++
  }

  fs.writeFileSync(filePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8")
  console.log(`Synced ${locale}.json (+${added} new leaf paths)`)
}
