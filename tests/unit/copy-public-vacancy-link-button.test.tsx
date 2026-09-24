import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"

import { CopyPublicVacancyLinkButton } from "@/components/shared/copy-public-vacancy-link-button"

describe("CopyPublicVacancyLinkButton", () => {
  const writeText = vi.fn()

  beforeEach(() => {
    writeText.mockReset()
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: { writeText },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("copia la URL pública absoluta al portapapeles", async () => {
    render(
      <CopyPublicVacancyLinkButton
        vacancy={{ id: "vac-1", publicSlug: "ejecutivo-negocios" }}
        label="Copiar enlace"
        ariaLabel="Copiar enlace público de esta vacante"
        copiedLabel="Enlace copiado"
        copyFailedLabel="No se pudo copiar el enlace"
      />
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: "Copiar enlace público de esta vacante",
      })
    )

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringMatching(/\/portal-oportunidades\/ejecutivo-negocios$/)
      )
    })
    expect(
      screen.getByRole("button", {
        name: "Copiar enlace público de esta vacante",
      })
    ).toHaveTextContent("Enlace copiado")
  })

  it("notifica al padre cuando se pasa onCopyResult", async () => {
    const onCopyResult = vi.fn()
    render(
      <CopyPublicVacancyLinkButton
        vacancy={{ id: "vac-1", publicSlug: "aoj-9920" }}
        label="Copiar enlace"
        ariaLabel="Copiar enlace público"
        copiedLabel="Enlace copiado"
        copyFailedLabel="Falló"
        onCopyResult={onCopyResult}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace público" }))

    await waitFor(() => {
      expect(onCopyResult).toHaveBeenCalledWith(true)
    })
    expect(screen.getByRole("button")).toHaveTextContent("Copiar enlace")
  })
})
