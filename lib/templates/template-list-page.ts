/** 1-based page that contains `name` when the API returns `namesInOrder`. */
export function pageNumberForNamedItem(
  namesInOrder: readonly string[],
  name: string,
  pageSize: number
): number | null {
  const index = namesInOrder.indexOf(name)
  if (index < 0) return null
  const size = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1
  return Math.floor(index / size) + 1
}
