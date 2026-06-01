import { getApiErrorMessage } from "@/lib/api-error"
import {
  mapTemplatesList,
  unwrapTemplatesResponse,
  type TemplateListItem,
} from "@/lib/templates/technical-sheet-template"

/**
 * Lista plantillas desde el backend con Bearer (Route Handlers / servidor).
 */
export async function fetchTemplatesListForServer(
  baseUrl: string,
  accessToken: string
): Promise<TemplateListItem[]> {
  const root = baseUrl.replace(/\/$/, "")
  const res = await fetch(`${root}/api/Templates?type=Document`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })
  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      getApiErrorMessage(raw) ||
      getApiErrorMessage(res.statusText) ||
      `No se pudieron cargar las plantillas (${res.status})`
    const err = new Error(message) as Error & { status: number }
    err.status = res.status
    throw err
  }
  return mapTemplatesList(unwrapTemplatesResponse(raw))
}
