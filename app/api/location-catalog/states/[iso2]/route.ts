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
const STATES_DIR = path.join(
  "node_modules",
  "@countrystatecity",
  "countries-browser",
  "dist",
  "data",
  "states"
)

interface RouteContext {
  params: Promise<{ iso2: string }>
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const code =
    "code" in error ? String((error as { code?: unknown }).code) : ""
  if (
    code === "ENOENT" ||
    code === "MODULE_NOT_FOUND" ||
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "ERR_PACKAGE_PATH_NOT_EXPORTED"
  ) {
    return true
  }
  const message =
    "message" in error ? String((error as { message?: unknown }).message) : ""
  return (
    /cannot find module|package path not exported/i.test(message) ||
    message.toUpperCase().includes("ENOENT")
  )
}

function statesFileCandidates(iso2: string): string[] {
  const fileName = `${iso2}.json`
  const cwd = process.cwd()
  const fromPackageRoot = resolveBesidePackageEntry(iso2)
  return [
    path.join(cwd, "public", "location-catalog", "states", fileName),
    path.join(cwd, STATES_DIR, fileName),
    path.join(cwd, ".next", "standalone", STATES_DIR, fileName),
    path.join(cwd, ".next", "server", STATES_DIR, fileName),
    ...(fromPackageRoot ? [fromPackageRoot] : []),
  ]
}

function requireFromApp(): ReturnType<typeof createRequire> {
  return createRequire(path.join(process.cwd(), "package.json"))
}

function resolveBesidePackageEntry(iso2: string): string | null {
  try {
    const pkgEntry = requireFromApp().resolve(
      "@countrystatecity/countries-browser"
    )
    return path.join(
      path.dirname(pkgEntry),
      "data",
      "states",
      `${iso2}.json`
    )
  } catch {
    return null
  }
}

function resolveViaPackageExports(iso2: string): string | null {
  try {
    return requireFromApp().resolve(
      `@countrystatecity/countries-browser/data/states/${iso2}.json`
    )
  } catch {
    return null
  }
}

async function readStatesFile(iso2: string): Promise<string> {
  let lastMissing: unknown = null

  for (const filePath of statesFileCandidates(iso2)) {
    try {
      return await readFile(filePath, "utf8")
    } catch (error) {
      if (!isMissingFileError(error)) throw error
      lastMissing = error
    }
  }

  const resolved = resolveViaPackageExports(iso2)
  if (resolved) {
    try {
      return await readFile(resolved, "utf8")
    } catch (error) {
      if (!isMissingFileError(error)) throw error
      lastMissing = error
    }
  }

  throw lastMissing ?? Object.assign(new Error("STATES_FILE_NOT_FOUND"), { code: "ENOENT" })
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
    const contents = await readStatesFile(iso2)
    return new NextResponse(contents, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": PRIVATE_NO_STORE_CACHE_CONTROL,
      },
    })
  } catch (error) {
    if (isMissingFileError(error)) {
      return jsonWithPrivateNoStore({ message: "No encontrado" }, { status: 404 })
    }
    console.error("[location-catalog] failed to read states file", {
      iso2,
      code:
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code)
          : undefined,
    })
    return jsonWithPrivateNoStore(
      { message: "No se pudo leer el catálogo de estados" },
      { status: 500 }
    )
  }
}
