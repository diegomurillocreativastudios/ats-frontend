/**
 * Traducciones para el portal del candidato
 */

const applicationStatusLabels: Record<string, string> = {
  Active: "Activa",
  Pending: "Pendiente",
  Rejected: "No seleccionada",
  Hired: "Contratado",
  Completed: "Finalizada",
}

const stageStatusLabels: Record<string, string> = {
  current: "Etapa actual",
  pending: "Pendiente",
  completed: "Completada",
}

const stageNameLabels: Record<string, string> = {
  Revision: "Revisión",
  Offer: "Oferta",
  Hired: "Contratado",
  Rejected: "No seleccionado",
  Aplicantes: "Aplicantes",
  Entrevista: "Entrevista",
  "En espera": "En espera",
}

export function translateApplicationStatus(status: string): string {
  return applicationStatusLabels[status] ?? status
}

export function translateStageStatus(status: string): string {
  return stageStatusLabels[status] ?? status
}

export function translateStageName(name: string): string {
  return stageNameLabels[name] ?? name
}

export function getApplicationStatusStyle(statusLabel: string): string {
  const normalized = (statusLabel || "").toLowerCase()
  
  if (normalized.includes("contratado") || normalized.includes("hired")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200"
  }
  
  if (
    normalized.includes("rechaz") ||
    normalized.includes("rejected") ||
    normalized.includes("no seleccionada") ||
    normalized.includes("descart")
  ) {
    return "bg-red-50 text-red-700 border border-red-200"
  }
  
  if (normalized.includes("activ") || normalized.includes("active")) {
    return "bg-blue-50 text-blue-700 border border-blue-200"
  }
  
  if (normalized.includes("pendiente") || normalized.includes("pending")) {
    return "bg-amber-50 text-amber-700 border border-amber-200"
  }
  
  if (normalized.includes("finalizada") || normalized.includes("completed")) {
    return "bg-gray-50 text-gray-700 border border-gray-200"
  }
  
  return "bg-gray-50 text-gray-700 border border-gray-200"
}
