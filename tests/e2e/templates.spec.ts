import { test, expect } from "@playwright/test"
import { loginAsDemoUser, openAdminPortalFromSelector } from "./helpers/auth"
import { readE2EAuthState } from "./helpers/e2e-auth-state"

const e2eAuth = readE2EAuthState()

test.describe("Template Management E2E", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eAuth.isAuthAvailable, e2eAuth.message)
    await loginAsDemoUser(page)
    await openAdminPortalFromSelector(page)
  })

  test("should allow a user to create and delete a Notification template", async ({
    page,
  }) => {
    await page.goto("/portal-admin/plantillas")
    await expect(page.getByRole("heading", { name: "Plantillas" }).first()).toBeVisible()

    const templateName = `E2E Test Template ${Date.now()}`
    await page.getByRole("button", { name: /Nueva Plantilla/i }).first().click()

    await page.locator("#plantilla-name").fill(templateName)
    await page.locator("#plantilla-subject").fill("E2E Subject")
    await page.locator("#plantilla-body").fill("E2E Body Content")

    await page.getByRole("button", { name: /Crear plantilla/i }).click()

    await expect(page.getByText(templateName).first()).toBeVisible()

    const card = page.locator("article", { hasText: templateName }).first()
    await card.getByRole("button", { name: "Eliminar" }).click()

    await page.getByRole("button", { name: "Aceptar" }).click()

    await expect(page.getByText(templateName).first()).not.toBeVisible()
  })

  test("should allow a user to create and delete a Document template", async ({
    page,
  }) => {
    await page.goto("/portal-admin/plantillas")
    await expect(page.getByRole("heading", { name: "Plantillas" }).first()).toBeVisible()

    const docName = `E2E Doc ${Date.now()}`
    await page.getByRole("button", { name: /Nueva Plantilla/i }).first().click()

    await page.locator("#plantilla-type").selectOption("Document")

    await page.locator("#plantilla-name").fill(docName)
    await page.locator("#plantilla-content-template").fill("<h1>Test Document</h1>")
    await page.locator("#plantilla-output-format").selectOption("PDF")

    await page.getByRole("button", { name: /Crear plantilla/i }).click()

    await expect(page.getByText(docName).first()).toBeVisible()
    await expect(page.getByText("Documento").first()).toBeVisible()

    const card = page.locator("article", { hasText: docName }).first()
    await card.getByRole("button", { name: "Eliminar" }).click()
    await page.getByRole("button", { name: "Aceptar" }).click()
    await expect(page.getByText(docName).first()).not.toBeVisible()
  })
})
