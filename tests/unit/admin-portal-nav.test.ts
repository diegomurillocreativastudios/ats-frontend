import { describe, it, expect } from "vitest"
import {
  adminNavGroupContainsPath,
  isAdminNavHrefActive,
  resolveAdminPortalBreadcrumbTrail,
  resolveAdminPortalNavLabelKey,
} from "@/lib/admin-portal-nav"

describe("admin portal nav", () => {
  it("marca la ruta exacta y sus subrutas como activas", () => {
    expect(
      isAdminNavHrefActive(
        "/portal-admin/vacantes/etapas",
        "/portal-admin/vacantes/etapas",
      ),
    ).toBe(true)
    expect(
      isAdminNavHrefActive(
        "/portal-admin/vacantes/etapas/nueva",
        "/portal-admin/vacantes/etapas",
      ),
    ).toBe(true)
    expect(
      isAdminNavHrefActive(
        "/portal-admin/vacantes/estados",
        "/portal-admin/vacantes/etapas",
      ),
    ).toBe(false)
    expect(
      isAdminNavHrefActive(
        "/portal-admin/vacantes/estados",
        "/portal-admin/vacantes/estados",
      ),
    ).toBe(true)
    expect(
      isAdminNavHrefActive(
        "/portal-admin/vacantes/etapas",
        "/portal-admin/vacantes",
      ),
    ).toBe(false)
    expect(
      isAdminNavHrefActive(
        "/portal-admin/entrevistas/tipos",
        "/portal-admin/entrevistas/modalidades",
      ),
    ).toBe(false)
    expect(
      isAdminNavHrefActive(
        "/portal-admin/entrevistas/tipos",
        "/portal-admin/entrevistas",
      ),
    ).toBe(false)
  })

  it("abre el grupo de entrevistas en catálogos y en el calendario legado", () => {
    const interviewsGroup = {
      id: "interviews" as const,
      href: "/portal-admin/entrevistas",
      children: [
        { href: "/portal-admin/entrevistas/tipos", labelKey: "interviewTypes" },
      ],
    }

    expect(
      adminNavGroupContainsPath("/portal-admin/entrevistas/tipos", interviewsGroup),
    ).toBe(true)
    expect(
      adminNavGroupContainsPath("/portal-admin/entrevistas/general", interviewsGroup),
    ).toBe(true)
    expect(
      adminNavGroupContainsPath("/portal-admin/vacantes/etapas", interviewsGroup),
    ).toBe(false)
  })

  it("resuelve la clave de navegación de cada destino del menú", () => {
    expect(resolveAdminPortalNavLabelKey("/portal-admin/vacantes")).toBe(
      "vacancies",
    )
    expect(resolveAdminPortalNavLabelKey("/portal-admin/vacantes/etapas")).toBe(
      "stages",
    )
    expect(resolveAdminPortalNavLabelKey("/portal-admin/vacantes/estados")).toBe(
      "stageStatuses",
    )
    expect(
      resolveAdminPortalNavLabelKey("/portal-admin/vacantes/departamentos"),
    ).toBe("departments")
    expect(
      resolveAdminPortalNavLabelKey("/portal-admin/vacantes/modalidades"),
    ).toBe("modalities")
    expect(resolveAdminPortalNavLabelKey("/portal-admin/plantillas")).toBe(
      "templates",
    )
    expect(resolveAdminPortalNavLabelKey("/portal-admin/entrevistas")).toBe(
      "interviews",
    )
    expect(resolveAdminPortalNavLabelKey("/portal-admin/entrevistas/tipos")).toBe(
      "interviewTypes",
    )
    expect(
      resolveAdminPortalNavLabelKey("/portal-admin/entrevistas/modalidades"),
    ).toBe("interviewModalities")
    expect(resolveAdminPortalNavLabelKey("/portal-admin/entrevistas/estados")).toBe(
      "interviewStatuses",
    )
    expect(resolveAdminPortalNavLabelKey("/portal-admin/administracion")).toBe(
      "administration",
    )
    expect(
      resolveAdminPortalNavLabelKey("/portal-admin/administracion/usuarios"),
    ).toBe("users")
    expect(
      resolveAdminPortalNavLabelKey(
        "/portal-admin/administracion/tipos-de-documento",
      ),
    ).toBe("documentTypes")
    expect(resolveAdminPortalNavLabelKey("/portal-admin/empresas")).toBe(
      "companies",
    )
    expect(resolveAdminPortalNavLabelKey("/portal-admin/entrevistas/general")).toBe(
      "interviewsCalendar",
    )
  })

  it("arma las migas con el grupo del menú y la página actual", () => {
    expect(
      resolveAdminPortalBreadcrumbTrail("/portal-admin/vacantes/etapas"),
    ).toEqual([
      { href: "/portal-admin/vacantes", labelKey: "vacancies" },
      { href: "/portal-admin/vacantes/etapas", labelKey: "stages" },
    ])
    expect(
      resolveAdminPortalBreadcrumbTrail("/portal-admin/vacantes/estados"),
    ).toEqual([
      { href: "/portal-admin/vacantes", labelKey: "vacancies" },
      { href: "/portal-admin/vacantes/estados", labelKey: "stageStatuses" },
    ])
    expect(resolveAdminPortalBreadcrumbTrail("/portal-admin/plantillas")).toEqual([
      { href: "/portal-admin/plantillas", labelKey: "templates" },
    ])
    expect(
      resolveAdminPortalBreadcrumbTrail("/portal-admin/entrevistas/tipos"),
    ).toEqual([
      { href: "/portal-admin/entrevistas", labelKey: "interviews" },
      { href: "/portal-admin/entrevistas/tipos", labelKey: "interviewTypes" },
    ])
    expect(
      resolveAdminPortalBreadcrumbTrail("/portal-admin/entrevistas/modalidades"),
    ).toEqual([
      { href: "/portal-admin/entrevistas", labelKey: "interviews" },
      {
        href: "/portal-admin/entrevistas/modalidades",
        labelKey: "interviewModalities",
      },
    ])
    expect(
      resolveAdminPortalBreadcrumbTrail("/portal-admin/administracion/usuarios"),
    ).toEqual([
      { href: "/portal-admin/administracion", labelKey: "administration" },
      { href: "/portal-admin/administracion/usuarios", labelKey: "users" },
    ])
    expect(
      resolveAdminPortalBreadcrumbTrail("/portal-admin/entrevistas/general"),
    ).toEqual([
      { href: "/portal-admin/entrevistas", labelKey: "interviews" },
      {
        href: "/portal-admin/entrevistas/general",
        labelKey: "interviewsCalendar",
      },
    ])
    expect(resolveAdminPortalBreadcrumbTrail("/portal-admin/empresas")).toEqual([
      { href: "/portal-admin/empresas", labelKey: "companies" },
    ])
  })
})
