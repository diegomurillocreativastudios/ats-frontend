/**
 * Convierte un instante UTC (ISO 8601 del API) al formato `datetime-local` en zona local.
 */
export function utcIsoToLocalDatetimeInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${y}-${m}-${day}T${h}:${min}`
}

/**
 * Interpreta un valor de `input[type="datetime-local"]` como hora local y lo serializa a ISO UTC.
 */
export function localDatetimeInputToUtcIso(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new Error("Fecha u hora inválida")
  }
  return d.toISOString()
}

/**
 * Muestra fecha/hora en zona local del navegador (el API envía UTC en ISO).
 */
export function formatInterviewLocalDateTime(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === "") return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/**
 * Fecha local `YYYY-MM-DD` para usar en `input type="date"`.
 */
export function getTodayDateInputValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * Separa `YYYY-MM-DDTHH:mm` (datetime-local) en fecha y hora `HH:mm`.
 */
export function splitDatetimeLocal(value: string): { date: string; time: string } {
  const trimmed = value.trim()
  if (!trimmed) return { date: "", time: "" }
  const tIndex = trimmed.indexOf("T")
  if (tIndex === -1) {
    return { date: trimmed.slice(0, 10), time: "" }
  }
  const date = trimmed.slice(0, tIndex)
  const timePart = trimmed.slice(tIndex + 1)
  const time = timePart.slice(0, 5)
  return { date, time }
}

/**
 * Compone datetime-local a partir de `YYYY-MM-DD` y `HH:mm`.
 */
export function combineDatetimeLocal(date: string, time: string): string {
  if (!date || !time) return ""
  const parts = time.split(":")
  const hh = pad2(Number.parseInt(parts[0] ?? "0", 10))
  const mm = pad2(Number.parseInt(parts[1] ?? "0", 10))
  return `${date}T${hh}:${mm}`
}

/**
 * Etiqueta legible tipo calendario: "Jueves, 16 de abril".
 */
export function formatInterviewScheduleDateLabel(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ""
  const raw = d.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  if (!raw) return ""
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/**
 * Suma minutos a una hora `HH:mm` del mismo día (envuelve pasada la medianoche).
 */
export function addMinutesToClockTime(timeHHmm: string, addMinutes: number): string {
  const [h, m] = timeHHmm.split(":").map((x) => parseInt(x, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return "09:00"
  let total = h * 60 + m + addMinutes
  total = ((total % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${pad2(hh)}:${pad2(mm)}`
}

/**
 * Minutos entre dos horas el mismo día; si la hora fin es menor o igual, cuenta hasta el día siguiente (cruce de medianoche).
 */
export function sameDayMinutesFromStartToEnd(
  timeStart: string,
  timeEnd: string
): number {
  const [sh, sm] = timeStart.split(":").map((x) => parseInt(x, 10))
  const [eh, em] = timeEnd.split(":").map((x) => parseInt(x, 10))
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
  let a = sh * 60 + sm
  let b = eh * 60 + em
  if (b <= a) b += 24 * 60
  return b - a
}

const QUARTER_MINUTES = [0, 15, 30, 45] as const

/**
 * Etiqueta corta para listas de hora (12 h, español: "10:15 a. m.").
 * Formato manual (sin `toLocaleTimeString`) para que servidor y cliente coincidan
 * en hidratación: Node y el navegador pueden usar espacios Unicode distintos alrededor de "a. m." / "p. m.".
 */
export function formatTimePickerLabel(hhmm: string): string {
  if (!hhmm || hhmm.length < 4) return ""
  const parts = hhmm.split(":")
  const h = Number.parseInt(parts[0] ?? "0", 10)
  const m = Number.parseInt(parts[1] ?? "0", 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const isPM = h >= 12
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const suffix = isPM ? "p. m." : "a. m."
  return `${hour12}:${pad2(m)} ${suffix}`
}

/**
 * Opciones de hora cada 15 minutos (00:00 … 23:45).
 */
export function getQuarterHourTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of QUARTER_MINUTES) {
      const value = `${pad2(hour)}:${pad2(minute)}`
      options.push({ value, label: formatTimePickerLabel(value) })
    }
  }
  return options
}

/**
 * Indica si `HH:mm` cae en un cuarto de hora exacto.
 */
export function isQuarterHourTime(hhmm: string): boolean {
  const parts = hhmm.split(":")
  const m = Number.parseInt(parts[1] ?? "", 10)
  if (Number.isNaN(m)) return false
  return m % 15 === 0
}

/**
 * Normaliza texto de hora a `HH:mm`, o `""` si queda vacío tras recortar.
 * Acepta `H:mm`, `HH:mm` y solo horas (`9` → `09:00`).
 * Devuelve `null` si el texto no es vacío pero no es una hora válida.
 */
export function normalizeClockTimeInput(raw: string): string | null {
  const t = raw.trim()
  if (!t) return ""
  const segments = t.split(":")
  if (segments.length > 2) return null
  if (segments.length === 2) {
    const hhStr = (segments[0] ?? "").trim()
    const mmStr = (segments[1] ?? "").trim()
    if (!/^\d{1,2}$/.test(hhStr) || !/^\d{1,2}$/.test(mmStr)) return null
    const hh = Number.parseInt(hhStr, 10)
    const mm = Number.parseInt(mmStr, 10)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
    return `${pad2(hh)}:${pad2(mm)}`
  }
  const hhOnly = Number.parseInt(segments[0] ?? "", 10)
  if (Number.isNaN(hhOnly) || hhOnly < 0 || hhOnly > 23) return null
  return `${pad2(hhOnly)}:00`
}

/**
 * Hora local redondeada al cuarto de hora más cercano (para desplazar la lista al abrir).
 */
export function getNearestQuarterHourClockNow(): string {
  const d = new Date()
  let totalMin = d.getHours() * 60 + d.getMinutes()
  totalMin = Math.round(totalMin / 15) * 15
  const maxIdx = 23 * 60 + 45
  if (totalMin > maxIdx) totalMin = maxIdx
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${pad2(h)}:${pad2(m)}`
}

/**
 * Acepta `HH:mm` / texto libre de {@link normalizeClockTimeInput} o etiqueta 12 h tipo `3:30 p. m.`.
 */
export function parseFlexibleTimeInput(raw: string): string | null {
  const t = raw.trim()
  if (!t) return ""
  const as24 = normalizeClockTimeInput(t)
  if (as24 !== null) return as24

  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(a\.\s*m\.|p\.\s*m\.)\s*$/i)
  if (!m12) return null
  const hh12 = Number.parseInt(m12[1] ?? "", 10)
  const mm = Number.parseInt(m12[2] ?? "", 10)
  const periodRaw = (m12[3] ?? "").toLowerCase().replace(/\s+/g, "")
  if (
    Number.isNaN(hh12) ||
    Number.isNaN(mm) ||
    hh12 < 1 ||
    hh12 > 12 ||
    mm < 0 ||
    mm > 59
  ) {
    return null
  }
  const isPm = periodRaw.startsWith("p")
  let h24: number
  if (isPm) {
    h24 = hh12 === 12 ? 12 : hh12 + 12
  } else {
    h24 = hh12 === 12 ? 0 : hh12
  }
  return `${pad2(h24)}:${pad2(mm)}`
}
