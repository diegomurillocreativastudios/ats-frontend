import { createRequire } from "node:module"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse, type NextRequest } from "next/server"
import {
  jsonWithPrivateNoStore,
  PRIVATE_NO_STORE_CACHE_CONTROL,
} from "@/lib/security/cache-headers"

export const runtime = "nodejs"

const ISO2_PATTERN = /^[A-Z]{2}$/

interface RouteContext {
  params: Promise<{ iso2: string }>
}

function resolveStatesFile(iso2: string): string {
  const requireFromApp = createRequire(path.join(process.cwd(), "package.json"))
  return requireFromApp.resolve(
    `@countrystatecity/countries-browser/data/states/${iso2}.json`
  )
}

/**
 * Serves packaged state/province JSON same-origin so the vacancy location
 * picker does not fetch jsDelivr (blocked by Content Security Policy).
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { iso2: rawIso2 } = await context.params
  const iso2 = rawIso2.trim().toUpperCase()
  if (!ISO2_PATTERN.test(iso2)) {
    return jsonWithPrivateNoStore({ message: "Código de país inválido" }, { status: 400 })
  }

  try {
    const contents = await readFile(resolveStatesFile(iso2), "utf8")
    return new NextResponse(contents, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": PRIVATE_NO_STORE_CACHE_CONTROL,
      },
    })
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : ""
    if (code === "ENOENT" || code === "MODULE_NOT_FOUND") {
      return jsonWithPrivateNoStore({ message: "No encontrado" }, { status: 404 })
    }
    return jsonWithPrivateNoStore(
      { message: "No se pudo leer el catálogo de estados" },
      { status: 500 }
    )
  }
}
