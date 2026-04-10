import { test, expect } from "@playwright/test"
import { fillLoginForm, loginAsDemoUser } from "./helpers/auth"

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

  test("login demo redirige al portal RRHH", async ({ page }) => {
    await loginAsDemoUser(page)
    await expect(page).toHaveURL(/\/portal-rrhh\//)
  })
})
