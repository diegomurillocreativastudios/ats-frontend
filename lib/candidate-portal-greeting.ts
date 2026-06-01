/**
 * Nombre para el saludo: prioriza firstName del dashboard, luego nombre de sesión.
 */
export function getCandidateGreetingFirstName(
  greetingNameFromApi: string | null | undefined,
  userName: string | null | undefined,
  userEmail: string | null | undefined
): string {
  const trimmed = greetingNameFromApi?.trim()
  if (trimmed) return trimmed

  const fromDisplayName = userName?.trim()
  if (fromDisplayName) {
    const first = fromDisplayName.split(/\s+/)[0]
    if (first) return first
  }

  const local = userEmail?.split("@")[0]?.trim()
  if (local) return local

  return "Candidato"
}
