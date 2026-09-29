import { describe, expect, it } from "vitest"
import { getProfileTailoringErrorMessage } from "@/lib/profile-tailoring-error"

const messages = {
  unprocessable: "La IA no pudo generar un perfil adaptado válido.",
  vacancyUnavailable: "La vacante ya no está disponible.",
  fallback: "No se pudo procesar el perfil para la vacante.",
}

function httpError(status: number, body?: unknown) {
  return Object.assign(new Error(`Solicitud fallida (${status})`), { status, body })
}

describe("getProfileTailoringErrorMessage", () => {
  it("maps 404 to vacancy unavailable, ignoring the backend text", () => {
    expect(
      getProfileTailoringErrorMessage(
        httpError(404, { message: "Vacancy not found." }),
        messages
      )
    ).toBe(messages.vacancyUnavailable)
  })

  it("maps 422 to the server message or the unprocessable copy", () => {
    expect(
      getProfileTailoringErrorMessage(
        httpError(422, { message: "Perfil inválido." }),
        messages
      )
    ).toBe("Perfil inválido.")
    expect(
      getProfileTailoringErrorMessage({ status: 422, body: {} }, messages)
    ).toBe(messages.unprocessable)
  })

  it("keeps the useful server message or the fallback for other errors", () => {
    expect(
      getProfileTailoringErrorMessage(
        httpError(500, { message: "Servicio de IA caído." }),
        messages
      )
    ).toBe("Servicio de IA caído.")
    expect(getProfileTailoringErrorMessage({ status: 500 }, messages)).toBe(
      messages.fallback
    )
  })
})
