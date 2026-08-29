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

  it("places create in the page header like the vacancy list", async () => {
    render(<AdminUsuariosContent />)

    await screen.findByText("No se encontraron usuarios")

    const heading = screen.getByRole("heading", { name: "Usuarios" })
    const header = heading.closest("header")
    expect(header).toBeTruthy()
    expect(
      within(header as HTMLElement).queryByRole("button", { name: "Refrescar" })
    ).not.toBeInTheDocument()
    expect(
      within(header as HTMLElement).getByRole("button", {
        name: "Crear nuevo usuario",
      })
    ).toBeInTheDocument()
  })

  it("renders each user as a card and does not repeat identical usernames", async () => {
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
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument()
    expect(
      screen.getByRole("article", { name: "Usuario: admin@matchengine.com" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: "Gestionar usuario admin@matchengine.com",
      })
    ).toBeInTheDocument()
  })

  it("shows every assigned role on the card without a leftover count", async () => {
    usersApiMocks.fetchAdminUsersList.mockResolvedValueOnce({
      items: [buildUser({ userName: "admin" })],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    })

    render(<AdminUsuariosContent />)

    const card = await screen.findByRole("article", {
      name: "Usuario: admin@matchengine.com",
    })
    expect(within(card).getByText("admin")).toBeInTheDocument()
    expect(within(card).getByText("Admin")).toBeInTheDocument()
    expect(within(card).getByText("Candidate")).toBeInTheDocument()
    expect(within(card).getByText("Recruiter")).toBeInTheDocument()
    expect(within(card).queryByText("+1")).not.toBeInTheDocument()
    expect(within(card).getByText("Roles")).toBeInTheDocument()
    expect(within(card).getByText("Estado")).toBeInTheDocument()
  })

  it("opens a balanced detail modal with lock in the status tile and recovery in the footer", async () => {
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

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Gestionar usuario admin@matchengine.com",
      })
    )

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByRole("heading", { name: "Detalle del usuario" })
    ).toBeInTheDocument()
    expect(within(dialog).getByText("admin@matchengine.com")).toBeInTheDocument()
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument()
    expect(within(dialog).getByText("Estado de la cuenta")).toBeInTheDocument()
    expect(within(dialog).getByText("admin")).toBeInTheDocument()
    expect(within(dialog).getByText("Creado")).toBeInTheDocument()
    expect(
      within(dialog).getByText("Este correo ya está verificado.")
    ).toBeInTheDocument()
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
    expect(
      within(footer as HTMLElement).queryByRole("button", {
        name: "Bloquear cuenta",
      })
    ).not.toBeInTheDocument()

    await waitFor(() => {
      expect(usersApiMocks.fetchAdminUserById).toHaveBeenCalledWith("user-1")
    })
  })

  it("keeps add-role controls on a single aligned row when roles are missing", async () => {
    const listUser = buildUser({
      userName: "admin",
      roles: ["Admin", "Recruiter"],
    })
    const detailUser: AdminUserDetail = {
      id: listUser.id,
      email: listUser.email,
      userName: "admin",
      emailConfirmed: false,
      lockoutEnabled: false,
      lockoutEnd: null,
      lockoutActive: false,
      roles: ["Admin", "Recruiter"],
      createdAtUtc: null,
    }

    usersApiMocks.fetchAdminUsersList.mockResolvedValueOnce({
      items: [listUser],
      totalCount: 1,
      page: 1,
      pageSize: 20,
    })
    usersApiMocks.fetchAdminUserById.mockResolvedValueOnce(detailUser)

    render(<AdminUsuariosContent />)

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Gestionar usuario admin@matchengine.com",
      })
    )

    const dialog = await screen.findByRole("dialog")
    expect(
      within(dialog).getByText("Este correo aún no está verificado.")
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Añadir roles")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("checkbox", { name: "Candidate" })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "Añadir" })
    ).toBeInTheDocument()
  })
})
