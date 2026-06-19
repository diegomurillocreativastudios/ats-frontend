import { APP_LOGO_SVG_SRC } from "@/lib/app-brand"

/**
 * Carga el icono de Appli AI como data URI en el navegador.
 */
export async function fetchVisibleLogoDataUriClient(origin: string): Promise<string> {
  const base = origin.replace(/\/$/, "")
  if (!base) return ""
  const url = `${base}${APP_LOGO_SVG_SRC}`
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "force-cache" })
    if (!res.ok) return url
    const blob = await res.blob()
    if (blob.size === 0) return url
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        resolve(typeof result === "string" ? result : url)
      }
      reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"))
      reader.readAsDataURL(blob)
    })
  } catch {
    return url
  }
}
