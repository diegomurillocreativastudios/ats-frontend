/** Página única mientras el modo mantenimiento está activo. */
export const MAINTENANCE_PATH = "/mantenimiento"

/** Cuerpo fijo del 503. El proxy no resuelve next-intl. */
export const MAINTENANCE_API_MESSAGE = "ApplicanTree está en mantenimiento"

/**
 * Solo el valor exacto `true` enciende el corte.
 * Se lee en cada request para que los tests puedan cambiar la variable.
 */
export function isMaintenanceMode(): boolean {
  return process.env.MAINTENANCE_MODE === "true"
}
