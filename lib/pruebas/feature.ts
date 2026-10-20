/**
 * Cross-portal entry points into Portal Pruebas (e.g. "Asignar prueba" in RRHH).
 * Keep false until the feature is ready to surface from other portals.
 * `/portal-pruebas` itself is not gated by this flag.
 */
export const SHOW_PRUEBAS_CROSS_PORTAL_UI = false

/**
 * Card for Portal Pruebas on `/seleccion-portal`.
 * Keep false to hide the demo portal from the picker.
 * Direct navigation to `/portal-pruebas` stays available.
 */
export const SHOW_PRUEBAS_IN_PORTAL_SELECTION = false
