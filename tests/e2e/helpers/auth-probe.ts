const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504])

/**
 * Errores que pueden desaparecer solos: cold start del API (502/503/504),
 * corte de red, o cuenta bloqueada temporalmente.
 * Un 401/403 no se reintenta: las credenciales ya fueron rechazadas.
 */
export function isRetryableAuthProbeFailure(input: {
  httpStatus: number | null
  detail: string
}): boolean {
  if (
    input.httpStatus !== null &&
    TRANSIENT_GATEWAY_STATUSES.has(input.httpStatus)
  ) {
    return true
  }
  if (input.httpStatus === null) return true
  return input.detail.toLowerCase().includes("bloqueada")
}

export function authProbeFailureHint(httpStatus: number | null): string {
  if (httpStatus !== null && httpStatus >= 500) {
    return (
      "El backend de pruebas respondió con un error de gateway. " +
      "Si el servicio se duerme entre corridas, reejecutá el workflow cuando esté despierto."
    )
  }
  return (
    "Configurá los secrets E2E_DEMO_EMAIL y E2E_DEMO_PASSWORD en GitHub, " +
    "o restablecé el usuario de prueba en el backend."
  )
}
