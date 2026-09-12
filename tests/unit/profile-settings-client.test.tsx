import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import esMessages from "@/messages/es.json"
import { ProfileSettingsClient } from "@/app/portal-rrhh/configuracion/perfil/profile-settings-client"

const userState = vi.hoisted(() => ({
  user: {
    id: "u-1",
    name: "Diego",
    email: "diego@example.com",
    role: "recruiter",
    hasPhoto: false,
  } as {
    id: string | null
    name: string
    email: string
    role: string | null
    hasPhoto: boolean
  } | null,
  photoSrc: null as string | null,
  loading: false,
}))

const updateRecruiterAccountMock = vi.hoisted(() => vi.fn())
const uploadRecruiterProfilePhotoMock = vi.hoisted(() => vi.fn())
const deleteRecruiterProfilePhotoMock = vi.hoisted(() => vi.fn())
const writeRecruiterPhotoCacheMock = vi.hoisted(() => vi.fn())
const notifyCurrentUserUpdatedMock = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: userState.user,
    photoSrc: userState.photoSrc,
    loading: userState.loading,
  }),
  notifyCurrentUserUpdated: () => notifyCurrentUserUpdatedMock(),
}))

vi.mock("@/lib/api/recruiter-account", () => ({
  updateRecruiterAccount: (...args: unknown[]) =>
    updateRecruiterAccountMock(...args),
}))

vi.mock("@/lib/api/recruiter-profile-photo", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/recruiter-profile-photo")
  >("@/lib/api/recruiter-profile-photo")
  return {
    ...actual,
    uploadRecruiterProfilePhoto: (...args: unknown[]) =>
      uploadRecruiterProfilePhotoMock(...args),
    deleteRecruiterProfilePhoto: (...args: unknown[]) =>
      deleteRecruiterProfilePhotoMock(...args),
  }
})

vi.mock("@/lib/rrhh/recruiter-photo-cache", () => ({
  writeRecruiterPhotoCache: (...args: unknown[]) =>
    writeRecruiterPhotoCacheMock(...args),
}))

vi.mock("@/components/ui/Snackbar", () => ({
  default: ({
    open,
    message,
  }: {
    open: boolean
    message: string
  }) => (open ? <div role="status">{message}</div> : null),
}))

function renderPage() {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <ProfileSettingsClient />
    </NextIntlClientProvider>
  )
}

function resetUser() {
  userState.user = {
    id: "u-1",
    name: "Diego",
    email: "diego@example.com",
    role: "recruiter",
    hasPhoto: false,
  }
  userState.photoSrc = null
  userState.loading = false
}

describe("ProfileSettingsClient", () => {
  beforeEach(() => {
    resetUser()
    updateRecruiterAccountMock.mockReset()
    uploadRecruiterProfilePhotoMock.mockReset()
    deleteRecruiterProfilePhotoMock.mockReset()
    writeRecruiterPhotoCacheMock.mockReset()
    notifyCurrentUserUpdatedMock.mockReset()
  })

  it("muestra nombre, correo y rol de la sesión", () => {
    renderPage()

    expect(screen.getByLabelText("Nombre visible")).toHaveValue("Diego")
    expect(screen.getByText("diego@example.com")).toBeInTheDocument()
    expect(screen.getByText("Reclutador")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Guardar cambios" })
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Agregar foto" })).toBeEnabled()
    expect(
      screen.queryByRole("button", { name: "Eliminar foto" })
    ).not.toBeInTheDocument()
  })

  it("no precarga el correo en el nombre visible", () => {
    userState.user = {
      id: "u-1",
      name: "diego@example.com",
      email: "diego@example.com",
      role: "recruiter",
      hasPhoto: false,
    }

    renderPage()

    expect(screen.getByLabelText("Nombre visible")).toHaveValue("diego")
    expect(screen.getByText("diego@example.com")).toBeInTheDocument()
  })

  it("guarda el nombre visible y avisa a la sesión", async () => {
    updateRecruiterAccountMock.mockResolvedValueOnce({
      id: "u-1",
      name: "Diego Murillo",
      userName: "Diego Murillo",
      email: "diego@example.com",
      role: "recruiter",
      hasPhoto: false,
    })

    renderPage()

    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "Diego Murillo" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => {
      expect(updateRecruiterAccountMock).toHaveBeenCalledWith({
        userName: "Diego Murillo",
      })
    })
    expect(notifyCurrentUserUpdatedMock).toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent("Perfil actualizado.")
  })

  it("muestra error de validación si el nombre queda vacío", () => {
    renderPage()

    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "   " },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Escribe tu nombre.")
    expect(updateRecruiterAccountMock).not.toHaveBeenCalled()
  })

  it("muestra el message de 400 junto al nombre", async () => {
    updateRecruiterAccountMock.mockRejectedValueOnce(
      Object.assign(new Error("El nombre debe tener entre 2 y 80 caracteres."), {
        status: 400,
      })
    )

    renderPage()

    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "Diego Murillo" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "El nombre debe tener entre 2 y 80 caracteres."
      )
    })
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("deshabilita el guardado ante 429 y no reintenta", async () => {
    updateRecruiterAccountMock.mockRejectedValueOnce(
      Object.assign(
        new Error("Demasiados intentos. Probá de nuevo más tarde."),
        { status: 429, retryAfter: 30 }
      )
    )

    renderPage()

    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "Diego Murillo" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Demasiados intentos. Probá de nuevo más tarde."
      )
    })
    expect(updateRecruiterAccountMock).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole("button", { name: "Guardar cambios" })
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Agregar foto" })).toBeDisabled()
  })

  it("sube una foto válida de inmediato", async () => {
    uploadRecruiterProfilePhotoMock.mockResolvedValueOnce({
      photoFileId: "p-1",
      contentType: "image/png",
      fileName: "avatar.png",
      sizeBytes: 12,
      dataUri: "data:image/png;base64,abc",
    })

    renderPage()

    const file = new File([new Uint8Array([1, 2, 3, 4])], "avatar.png", {
      type: "image/png",
    })
    fireEvent.change(screen.getByLabelText("Foto de perfil"), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(uploadRecruiterProfilePhotoMock).toHaveBeenCalledWith(file)
    })
    expect(writeRecruiterPhotoCacheMock).toHaveBeenCalledWith(
      "u-1",
      "data:image/png;base64,abc"
    )
    expect(notifyCurrentUserUpdatedMock).toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Foto de perfil actualizada."
    )
  })

  it("rechaza un archivo que no es imagen sin llamar a la API", () => {
    renderPage()

    const file = new File(["not-an-image"], "notes.txt", {
      type: "text/plain",
    })
    fireEvent.change(screen.getByLabelText("Foto de perfil"), {
      target: { files: [file] },
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La foto debe ser PNG, JPEG, WebP o GIF."
    )
    expect(uploadRecruiterProfilePhotoMock).not.toHaveBeenCalled()
  })

  it("muestra y elimina la foto actual", async () => {
    userState.user = {
      id: "u-1",
      name: "Diego",
      email: "diego@example.com",
      role: "recruiter",
      hasPhoto: true,
    }
    userState.photoSrc = "data:image/png;base64,abc"
    deleteRecruiterProfilePhotoMock.mockResolvedValueOnce(undefined)

    renderPage()

    expect(
      screen.getByRole("img", { name: "Foto de perfil de Diego" })
    ).toHaveAttribute("src", "data:image/png;base64,abc")
    expect(screen.getByRole("button", { name: "Cambiar foto" })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: "Eliminar foto" }))

    await waitFor(() => {
      expect(deleteRecruiterProfilePhotoMock).toHaveBeenCalledTimes(1)
    })
    expect(writeRecruiterPhotoCacheMock).toHaveBeenCalledWith("u-1", null)
    expect(notifyCurrentUserUpdatedMock).toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Foto de perfil eliminada."
    )
  })
})
