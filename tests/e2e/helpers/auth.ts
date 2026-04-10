import type { Page } from "@playwright/test"

/**
 * Credenciales demo para E2E (validación client-side + API `/login`).
 * El primer campo acepta usuario `admin` (no hace falta formato de correo) con contraseña `admin`.
 * Requiere backend accesible vía `NEXT_PUBLIC_API_URL` si el login remoto falla.
 */
export const E2E_DEMO_EMAIL = "admin"
export const E2E_DEMO_PASSWORD = "admin"

/**
 * Completa el formulario de iniciar sesión y envía.
 */
export async function fillLoginForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.getByTestId("auth-login-email").fill(email)
  await page.getByTestId("auth-login-password").fill(password)
  await page.getByTestId("auth-login-submit").click()
}

/**
 * Tras login exitoso, la app muestra la pantalla de elección de portal.
 */
export async function loginAsDemoUser(page: Page): Promise<void> {
  await page.goto("/auth/iniciar-sesion")
  await fillLoginForm(page, E2E_DEMO_EMAIL, E2E_DEMO_PASSWORD)
  await page.waitForURL(/\/seleccion-portal/, { timeout: 30_000 })
}

/**
 * Desde `/seleccion-portal`, entra al portal RRHH (flujos que antes asumían ir directo a RRHH).
 */
export async function openRRHHPortalFromSelector(page: Page): Promise<void> {
  await page.getByTestId("portal-selector-rrhh").click()
  await page.waitForURL(/\/portal-rrhh\//, { timeout: 15_000 })
}
