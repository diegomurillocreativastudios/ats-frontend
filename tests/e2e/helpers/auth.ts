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
 * Tras login exitoso, la app puede mostrar `/seleccion-portal` o redirigir al portal
 * si el usuario ya tiene rol (ver `proxy.ts`).
 */
export async function loginAsDemoUser(page: Page): Promise<void> {
  await page.goto("/auth/iniciar-sesion")
  await fillLoginForm(page, E2E_DEMO_EMAIL, E2E_DEMO_PASSWORD)
  await page.waitForURL(
    /\/(seleccion-portal|portal-rrhh|portal-candidato)/,
    { timeout: 30_000 }
  )
}

/**
 * Desde `/seleccion-portal`, entra al portal RRHH. Si el login ya dejó al usuario en RRHH, no hace nada.
 */
export async function openRRHHPortalFromSelector(page: Page): Promise<void> {
  const pathname = new URL(page.url()).pathname
  if (/^\/portal-rrhh(\/|$)/.test(pathname)) return

  await page.getByTestId("portal-selector-rrhh").click()
  await page.waitForURL(/\/portal-rrhh(\/|$)/, { timeout: 15_000 })
}
