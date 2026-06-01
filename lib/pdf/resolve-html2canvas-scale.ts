/** Chrome and similar engines cap canvas dimensions (~32k px per side). */
export const HTML2CANVAS_MAX_DIMENSION_PX = 16384

/**
 * Lowers html2canvas scale so width/height × scale stay within browser canvas limits.
 */
export function resolveHtml2CanvasScale(
  widthPx: number,
  heightPx: number,
  requestedScale = 2
): number {
  const w = Math.max(1, Math.ceil(widthPx))
  const h = Math.max(1, Math.ceil(heightPx))
  let scale = requestedScale

  while (
    scale > 0.25 &&
    (w * scale > HTML2CANVAS_MAX_DIMENSION_PX || h * scale > HTML2CANVAS_MAX_DIMENSION_PX)
  ) {
    scale -= 0.25
  }

  if (w * scale > HTML2CANVAS_MAX_DIMENSION_PX || h * scale > HTML2CANVAS_MAX_DIMENSION_PX) {
    const fit = Math.min(
      HTML2CANVAS_MAX_DIMENSION_PX / w,
      HTML2CANVAS_MAX_DIMENSION_PX / h
    )
    return Math.max(0.25, fit)
  }

  return scale
}
