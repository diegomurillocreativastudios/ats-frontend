const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Separa "Nombre · correo" o "Nombre - correo" para mostrarlos en líneas distintas. */
export function splitCandidateIdentity(raw: string): {
  name: string
  email: string | null
} {
  const trimmed = raw.trim()
  if (!trimmed) return { name: "", email: null }

  const separators = [" · ", " - ", " – ", " — "] as const
  for (const sep of separators) {
    const idx = trimmed.lastIndexOf(sep)
    if (idx <= 0) continue
    const name = trimmed.slice(0, idx).trim()
    const email = trimmed.slice(idx + sep.length).trim()
    if (name && EMAIL_LIKE.test(email)) {
      return { name, email }
    }
  }

  return { name: trimmed, email: null }
}
