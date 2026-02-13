/**
 * Convierte un segmento de ruta en formato kebab-case a título legible.
 * Ej: "crear-cuenta" → "Crear Cuenta"
 * @param {string} segment - Segmento de la URL (ej: "crear-cuenta")
 * @returns {string} Título formateado
 */
export const segmentToTitle = (segment) => {
  if (!segment || typeof segment !== "string") return "";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Mapa opcional de rutas a títulos personalizados.
 * Si una ruta no está aquí, se deriva automáticamente con segmentToTitle.
 */
export const CUSTOM_PAGE_TITLES = {
  "/crear-cuenta": "Crear Cuenta",
  "/iniciar-sesion": "Iniciar Sesión",
  "/auth/iniciar-sesion": "Iniciar Sesión",
  "/auth/registrate": "Regístrate",
};

const BASE_TITLE = "ATS";

/**
 * Obtiene el título de la página según la ruta.
 * @param {string} pathname - Ruta actual (ej: "/crear-cuenta")
 * @returns {string} Título completo para el documento (ej: "ATS | Crear Cuenta")
 */
export const getPageTitle = (pathname) => {
  const normalizedPath = pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;

  const customTitle = CUSTOM_PAGE_TITLES[normalizedPath];
  if (customTitle) {
    return `${BASE_TITLE} | ${customTitle}`;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return BASE_TITLE;
  }

  const lastSegment = segments[segments.length - 1];
  const pageTitle = segmentToTitle(lastSegment);
  return pageTitle ? `${BASE_TITLE} | ${pageTitle}` : BASE_TITLE;
};
