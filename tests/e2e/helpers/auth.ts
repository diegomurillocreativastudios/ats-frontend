import type { Page } from "@playwright/test"

/**
 * Credenciales demo documentadas para E2E (validación client-side + API `/login`).
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
 * Flujo estándar: ir a login, credenciales demo, esperar portal RRHH.
 */
export async function loginAsDemoUser(page: Page): Promise<void> {
  await page.goto("/auth/iniciar-sesion")
  await fillLoginForm(page, E2E_DEMO_EMAIL, E2E_DEMO_PASSWORD)
  await page.waitForURL(/\/portal-rrhh\//, { timeout: 30_000 })
}
