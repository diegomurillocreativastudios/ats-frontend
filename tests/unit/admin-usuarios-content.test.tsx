import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderWithIntl as render } from "@/tests/helpers/render-with-intl"
import AdminUsuariosContent from "@/components/portal-admin/AdminUsuariosContent"
import type {
  AdminUserDetail,
  AdminUserListItem,
} from "@/lib/api/admin-users"

const usersApiMocks = vi.hoisted(() => ({
  fetchAdminUsersList: vi.fn(),
  fetchAdminUserById: vi.fn(),
  createAdminUser: vi.fn(),
  patchAdminUser: vi.fn(),
  setAdminUserLockout: vi.fn(),
  postAdminUserRoles: vi.fn(),
  deleteAdminUserRole: vi.fn(),
  postAdminUserSendPasswordReset: vi.fn(),
}))

vi.mock("@/lib/api/admin-users", () => usersApiMocks)

function buildUser(
  overrides: Partial<AdminUserListItem> = {}
): AdminUserListItem {
  return {
    id: "user-1",
    email: "admin@matchengine.com",
    userName: "admin@matchengine.com",
    emailConfirmed: true,
    lockoutActive: false,
    roles: ["Admin", "Candidate", "Recruiter"],
    ...overrides,
  }
}

describe("AdminUsuariosContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usersApiMocks.fetchAdminUsersList.mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
    })
  })

  it("places refresh next to create in the split header", async () => {
    render(<AdminUsuariosContent />)

    await screen.findByText("No hay usuarios con los filtros actuales.")

    const heading = screen.getByRole("heading", { name: "Usuarios" })
    const header = heading.closest("header")
    expect(header).toBeTruthy()
    expect(
      within(header as HTMLElement).getByRole("button", { name: "Refrescar" })
    ).toBeInTheDocument()
    expect(
      within(header as HTMLElement).getByRole("button", { name: "Nuevo usuario" })
    ).toBeInTheDocument()
  })

  it("keeps one account column and does not repeat identical usernames", async () => {
    usersApiMocks.fetchAdminUsersList.mockResolvedValueOnce({
      items: [buildUser()],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    })

    render(<AdminUsuariosContent />)

    expect(await screen.findByText("admin@matchengine.com")).toBeInTheDocument()
    expect(
      screen.getAllByText("admin@matchengine.com")
    ).toHaveLength(1)
    expect(
      screen.queryByRole("columnheader", { name: "Correo" })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Usuario" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Confirmado" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Gestionar" })).toBeInTheDocument()
  })

  it("opens a balanced detail modal with status actions in the footer", async () => {
    const listUser = buildUser({ userName: "admin" })
    const detailUser: AdminUserDetail = {
      id: listUser.id,
      email: listUser.email,
      userName: "admin",
      emailConfirmed: true,
      lockoutEnabled: false,
      lockoutEnd: null,
      lockoutActive: false,
      roles: ["Admin", "Candidate", "Recruiter"],
      createdAtUtc: "2026-01-01T00:00:00Z",
    }

    usersApiMocks.fetchAdminUsersList.mockResolvedValueOnce({
      items: [listUser],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    })
    usersApiMocks.fetchAdminUserById.mockResolvedValueOnce(detailUser)

    render(<AdminUsuariosContent />)

    fireEvent.click(await screen.findByRole("button", { name: "Gestionar" }))

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: "Detalle del usuario" })
    ).toBeInTheDocument()
    expect(within(dialog).getByText("admin@matchengine.com")).toBeInTheDocument()
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument()
    expect(within(dialog).getByText("Estado de la cuenta")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Bloquear cuenta" })
    ).toBeInTheDocument()
    expect(within(dialog).queryByText(/Lockout activo/i)).not.toBeInTheDocument()
    expect(
      within(dialog).getByText("Ya tiene todos los roles asignables.")
    ).toBeInTheDocument()

    const footer = dialog.querySelector("footer")
    expect(footer).toBeTruthy()
    expect(
      within(footer as HTMLElement).getByRole("button", {
        name: "Enviar recuperación de contraseña",
      })
    ).toBeInTheDocument()
    expect(
      within(footer as HTMLElement).getByRole("button", { name: "Cerrar" })
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(usersApiMocks.fetchAdminUserById).toHaveBeenCalledWith("user-1")
    })
  })
})
