import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"

import MiPerfilContent from "@/app/portal-candidato/mi-perfil/MiPerfilContent"
import { renderWithIntl } from "@/tests/helpers/render-with-intl"

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { name: "Ana", email: "ana@test.com", role: "Candidato" },
    loading: false,
  }),
}))

vi.mock("@/hooks/useCandidateProfile", () => ({
  useCandidateProfile: () => ({
    profile: null,
    loading: false,
    error: null,
    notFound: true,
    save: vi.fn(),
    saving: false,
    saveError: null,
    clearSaveError: vi.fn(),
    refetch: vi.fn(),
  }),
}))

vi.mock("@/hooks/useCandidateSelfProfile", () => ({
  useCandidateSelfProfile: () => ({
    profile: null,
    loading: false,
    refetch: vi.fn(),
  }),
}))

vi.mock("@/components/candidato/CandidateSidebar", () => ({
  default: () => <aside data-testid="candidate-sidebar" />,
}))

vi.mock("@/components/candidato/CandidateTopbar", () => ({
  default: () => <header data-testid="candidate-topbar" />,
}))

vi.mock("@/components/candidato/AgregarCandidatoModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Completar información" /> : null,
}))

vi.mock("@/components/candidato/consent-authorization-modal", () => ({
  ConsentAuthorizationModal: () => null,
}))

vi.mock("@/lib/candidate-auth-consent", () => ({
  fetchCandidateAuthConsentStatus: vi.fn(async () => ({
    requiresReacceptance: false,
    authAndConsentVerification: true,
  })),
  mapCandidateAuthConsentError: vi.fn(),
  submitCandidateAuthConsent: vi.fn(),
}))

/**
 * El botón Completar información vive en Mi perfil y abre el modal self.
 */
describe("MiPerfilContent complete information", () => {
  it("muestra el botón Completar información y abre el modal", () => {
    renderWithIntl(<MiPerfilContent />)

    const buttons = screen.getAllByRole("button", {
      name: "Completar información del candidato",
    })
    expect(buttons.length).toBeGreaterThan(0)

    fireEvent.click(buttons[0])
    expect(
      screen.getByRole("dialog", { name: "Completar información" }),
    ).toBeInTheDocument()
  })
})
