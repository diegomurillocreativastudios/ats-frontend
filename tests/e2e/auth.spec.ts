import { test, expect } from "@playwright/test"
import { fillLoginForm, loginAsDemoUser } from "./helpers/auth"
import { readE2EAuthState } from "./helpers/e2e-auth-state"

const e2eAuth = readE2EAuthState()

test.describe("@smoke Auth", () => {
  test("muestra el formulario de iniciar sesión", async ({ page }) => {
    await page.goto("/auth/iniciar-sesion")
    await expect(
      page.getByRole("heading", { name: /iniciar sesión/i })
    ).toBeVisible()
    await expect(page.getByTestId("auth-login-form")).toBeVisible()
    await expect(page.getByTestId("auth-login-email")).toBeVisible()
    await expect(page.getByTestId("auth-login-password")).toBeVisible()
    await expect(page.getByTestId("auth-login-submit")).toBeVisible()
  })

  test("credenciales inválidas no redirigen al portal", async ({ page }) => {
    await page.goto("/auth/iniciar-sesion")
    await fillLoginForm(page, "no-existe@test.invalid", "WrongPass123!")
    await expect(page).toHaveURL(/\/auth\/iniciar-sesion/)
  })

  test("restablecer contraseña sin email ni token muestra aviso", async ({
    page,
  }) => {
    await page.goto("/restablecer-contrasena")
    await expect(page.getByTestId("auth-reset-invalid-link")).toBeVisible()
  })

  test("ruta /auth/restablecer-contrasena sin token muestra aviso (enlace del mail)", async ({
    page,
  }) => {
    await page.goto("/auth/restablecer-contrasena")
    await expect(page.getByTestId("auth-reset-invalid-link")).toBeVisible()
  })

  test("login demo completa sesión (selector o portal según rol)", async ({
    page,
  }) => {
    test.skip(!e2eAuth.isAuthAvailable, e2eAuth.message)
    await loginAsDemoUser(page)
    const pathname = new URL(page.url()).pathname
    if (pathname.startsWith("/seleccion-portal")) {
      await expect(page.getByTestId("portal-selector-candidato")).toBeVisible()
      await expect(page.getByTestId("portal-selector-rrhh")).toBeVisible()
      return
    }
    await expect(page).toHaveURL(/\/portal-(rrhh|candidato|admin)/)
  })
})
