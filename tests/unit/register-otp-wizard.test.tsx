import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import Registrarse from "@/app/auth/registrarse/page"
import esMessages from "@/messages/es.json"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/auth/registrarse",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/auth/csrf-client", () => ({
  csrfHeaders: vi.fn(async (extra?: Record<string, string>) => ({
    ...(extra ?? {}),
    "x-csrf-token": "test-csrf",
  })),
  ensureCsrfToken: vi.fn(async () => "test-csrf"),
}))

function renderRegister() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <Registrarse />
    </NextIntlClientProvider>,
  )
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  retryAfter?: string,
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "retry-after" ? (retryAfter ?? null) : null,
    },
    json: async () => body,
  }
}

function setLocationSearch(search: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      origin: "http://localhost",
      href: `http://localhost/auth/registrarse${search}`,
      pathname: "/auth/registrarse",
      search,
    },
  })
}

async function completeEmailStep() {
  fireEvent.change(screen.getByTestId("auth-register-email"), {
    target: { value: "nuevo@ejemplo.com" },
  })
  fireEvent.submit(screen.getByTestId("auth-register-form"))
  await waitFor(() => {
    expect(screen.getByTestId("auth-register-code")).toBeInTheDocument()
  })
}

async function completeCodeStep() {
  fireEvent.change(screen.getByTestId("auth-register-code"), {
    target: { value: "123456" },
  })
  fireEvent.submit(screen.getByTestId("auth-register-form"))
  await waitFor(() => {
    expect(screen.getByTestId("auth-register-password")).toBeInTheDocument()
  })
}

describe("Registro con One-Time Password", () => {
  beforeEach(() => {
    pushMock.mockReset()
    setLocationSearch("")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { message: "ok" })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("empieza en el paso de correo y no muestra código ni contraseña", () => {
    renderRegister()

    expect(screen.getByTestId("auth-register-form")).toBeInTheDocument()
    expect(screen.getByTestId("auth-register-email")).toBeInTheDocument()
    expect(screen.getByTestId("auth-register-step")).toHaveAttribute(
      "data-step",
      "email",
    )
    expect(screen.queryByTestId("auth-register-code")).not.toBeInTheDocument()
    expect(screen.queryByTestId("auth-register-password")).not.toBeInTheDocument()
  })

  it("avanza a código con el mismo resultado si el correo es nuevo", async () => {
    renderRegister()
    await completeEmailStep()

    expect(screen.getAllByRole("textbox")).toHaveLength(6)
    expect(screen.getByLabelText(/dígito 1 de 6/i)).toBeInTheDocument()

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost/api/auth/register/otp/request",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "nuevo@ejemplo.com" }),
      }),
    )
    expect(screen.getByTestId("auth-register-step")).toHaveAttribute(
      "data-step",
      "code",
    )
    expect(screen.getByTestId("app-snackbar")).toHaveTextContent(
      /si el correo es válido/i,
    )
    expect(JSON.stringify(vi.mocked(fetch).mock.calls)).not.toMatch(
      /\/(api\/bff\/)?register(?!\/otp)/,
    )
  })

  it("muestra error genérico y no revela si el correo ya existe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(400, { message: "El correo ya está registrado" }),
      ),
    )
    renderRegister()

    fireEvent.change(screen.getByTestId("auth-register-email"), {
      target: { value: "ya@existe.com" },
    })
    fireEvent.submit(screen.getByTestId("auth-register-form"))

    await waitFor(() => {
      expect(screen.getByTestId("app-snackbar")).toBeInTheDocument()
    })
    expect(screen.getByTestId("app-snackbar")).not.toHaveTextContent(
      /ya está registrado/i,
    )
    expect(screen.getByTestId("app-snackbar")).toHaveTextContent(
      /no se pudo completar el registro/i,
    )
    expect(screen.getByTestId("auth-register-step")).toHaveAttribute(
      "data-step",
      "email",
    )
  })

  it("bloquea el envío ante 429 y muestra el tope de intentos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(429, { message: "rate" }, "12"),
      ),
    )
    renderRegister()

    fireEvent.change(screen.getByTestId("auth-register-email"), {
      target: { value: "nuevo@ejemplo.com" },
    })
    fireEvent.submit(screen.getByTestId("auth-register-form"))

    await waitFor(() => {
      expect(screen.getByTestId("app-snackbar")).toHaveTextContent(
        /demasiados intentos/i,
      )
    })
    expect(screen.getByTestId("auth-register-submit")).toHaveTextContent(
      /reintentá en 12s/i,
    )
  })

  it("pide contraseña después del código y crea sesión sin POST /register", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/otp/request")) {
        return jsonResponse(200, { message: "ok" })
      }
      if (String(url).includes("/otp/check")) {
        return jsonResponse(200, { message: "ok" })
      }
      if (String(url).includes("/otp/verify")) {
        return jsonResponse(200, { success: true })
      }
      throw new Error(`unexpected url ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    renderRegister()
    await completeEmailStep()
    await completeCodeStep()

    fireEvent.change(screen.getByTestId("auth-register-password"), {
      target: { value: "ClaveSegura1!" },
    })
    fireEvent.change(screen.getByTestId("auth-register-confirm-password"), {
      target: { value: "ClaveSegura1!" },
    })
    fireEvent.submit(screen.getByTestId("auth-register-form"))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/seleccion-portal")
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/api/auth/register/otp/check",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "nuevo@ejemplo.com",
          code: "123456",
        }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/api/auth/register/otp/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "nuevo@ejemplo.com",
          code: "123456",
          password: "ClaveSegura1!",
        }),
      }),
    )
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(
      /\/register(?!\/otp)/,
    )
  })

  it("redirige a from interno después de verificar", async () => {
    setLocationSearch("?from=/portal-candidato")
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/otp/request")) {
        return jsonResponse(200, { message: "ok" })
      }
      if (String(url).includes("/otp/check")) {
        return jsonResponse(200, { message: "ok" })
      }
      return jsonResponse(200, { success: true })
    })
    vi.stubGlobal("fetch", fetchMock)

    renderRegister()
    await completeEmailStep()
    await completeCodeStep()

    fireEvent.change(screen.getByTestId("auth-register-password"), {
      target: { value: "ClaveSegura1!" },
    })
    fireEvent.change(screen.getByTestId("auth-register-confirm-password"), {
      target: { value: "ClaveSegura1!" },
    })
    fireEvent.submit(screen.getByTestId("auth-register-form"))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/portal-candidato")
    })
  })

  it("muestra error genérico de código inválido en verify 401", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/otp/request")) {
        return jsonResponse(200, { message: "ok" })
      }
      if (String(url).includes("/otp/check")) {
        return jsonResponse(200, { message: "ok" })
      }
      return jsonResponse(401, { message: "El código no es válido o venció." })
    })
    vi.stubGlobal("fetch", fetchMock)

    renderRegister()
    await completeEmailStep()
    await completeCodeStep()

    fireEvent.change(screen.getByTestId("auth-register-password"), {
      target: { value: "ClaveSegura1!" },
    })
    fireEvent.change(screen.getByTestId("auth-register-confirm-password"), {
      target: { value: "ClaveSegura1!" },
    })
    fireEvent.submit(screen.getByTestId("auth-register-form"))

    await waitFor(() => {
      expect(screen.getByTestId("app-snackbar")).toHaveTextContent(
        /código no es válido o venció/i,
      )
    })
    expect(screen.getByTestId("auth-register-step")).toHaveAttribute(
      "data-step",
      "code",
    )
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("no avanza a contraseña si el código no es válido", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/otp/request")) {
        return jsonResponse(200, { message: "ok" })
      }
      if (String(url).includes("/otp/check")) {
        return jsonResponse(401, { message: "El código no es válido o venció." })
      }
      throw new Error(`unexpected url ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    renderRegister()
    await completeEmailStep()

    fireEvent.change(screen.getByTestId("auth-register-code"), {
      target: { value: "000000" },
    })
    fireEvent.submit(screen.getByTestId("auth-register-form"))

    await waitFor(() => {
      expect(screen.getByTestId("app-snackbar")).toHaveTextContent(
        /código no es válido o venció/i,
      )
    })
    expect(screen.getByTestId("auth-register-step")).toHaveAttribute(
      "data-step",
      "code",
    )
    expect(screen.getByTestId("auth-register-code")).toBeInTheDocument()
    expect(screen.queryByTestId("auth-register-password")).not.toBeInTheDocument()
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/\/otp\/verify/)
  })
})
