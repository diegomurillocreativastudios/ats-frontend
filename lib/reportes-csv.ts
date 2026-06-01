/**
 * Escapa un valor para una celda CSV (RFC-style básico).
 */
export function escapeCsvCell(value: string): string {
  const needsQuote = /[",\n\r]/.test(value)
  const inner = value.replace(/"/g, '""')
  return needsQuote ? `"${inner}"` : inner
}

export function buildCsvFromMatrix(rows: string[][]): string {
  const lines = rows.map((cells) => cells.map(escapeCsvCell).join(","))
  return lines.join("\r\n")
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([`\ufeff${csvContent}`], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
