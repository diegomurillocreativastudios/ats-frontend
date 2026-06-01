/**
 * Genera public/chromium-pack.tar desde @sparticuz/chromium (patrón Vercel / puppeteer-on-vercel).
 * Se ejecuta en postinstall y antes de `next build` para que el .tar se sirva en /chromium-pack.tar.
 */
import { execSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(__dirname)

function main() {
  if (process.env.SKIP_CHROMIUM_PACK === "1") {
    console.log("[chromium-pack] SKIP_CHROMIUM_PACK=1 — omitiendo generación del tar")
    return
  }

  try {
    const chromiumPkgDir = dirname(require.resolve("@sparticuz/chromium/package.json"))
    const binDir = join(chromiumPkgDir, "bin")

    if (!existsSync(binDir)) {
      throw new Error(`No existe el directorio bin de @sparticuz/chromium: ${binDir}`)
    }

    const publicDir = join(projectRoot, "public")
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true })
    }

    const outputPath = join(publicDir, "chromium-pack.tar")
    console.log("[chromium-pack] Creando", outputPath)

    execSync(`tar -cf "${outputPath}" -C "${binDir}" .`, {
      stdio: "inherit",
      cwd: projectRoot,
    })

    console.log("[chromium-pack] Listo")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[chromium-pack] Error:", message)
    console.error(
      "[chromium-pack] Instalá @sparticuz/chromium (devDependency) o definí SKIP_CHROMIUM_PACK=1 en local."
    )
    process.exit(1)
  }
}

main()
