const MODERN_COLOR_FUNCTION_RE =
  /(?:oklab|oklch|color-mix|lab|lch)\((?:[^()]*|\([^()]*\))*\)/gi

const COLOR_RELATED_PROPERTIES = new Set([
  "color",
  "background",
  "background-color",
  "background-image",
  "border",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "column-rule-color",
  "caret-color",
  "fill",
  "stroke",
  "box-shadow",
  "text-shadow",
])

let colorProbeCanvas: HTMLCanvasElement | null = null

/**
 * Convierte un color moderno (oklab/oklch/etc.) a un valor que html2canvas entiende (#rrggbb).
 */
export function normalizeColorForHtml2Canvas(color: string): string {
  const trimmed = color.trim()
  if (!trimmed || trimmed === "none" || trimmed === "transparent") return trimmed
  if (!MODERN_COLOR_FUNCTION_RE.test(trimmed)) return trimmed

  MODERN_COLOR_FUNCTION_RE.lastIndex = 0

  if (!colorProbeCanvas && typeof document !== "undefined") {
    colorProbeCanvas = document.createElement("canvas")
  }

  const ctx = colorProbeCanvas?.getContext("2d")
  if (!ctx) return "#000000"

  try {
    ctx.fillStyle = "#000000"
    ctx.fillStyle = trimmed
    return ctx.fillStyle
  } catch {
    return "#000000"
  }
}

/**
 * Reemplaza funciones de color modernas dentro de un valor CSS (p. ej. box-shadow).
 */
export function sanitizeCSSValueForHtml2Canvas(value: string): string {
  if (!value || !MODERN_COLOR_FUNCTION_RE.test(value)) return value

  MODERN_COLOR_FUNCTION_RE.lastIndex = 0
  return value.replace(MODERN_COLOR_FUNCTION_RE, (match) => normalizeColorForHtml2Canvas(match))
}

export function sanitizeCssTextForHtml2Canvas(css: string): string {
  if (!css || !MODERN_COLOR_FUNCTION_RE.test(css)) return css
  MODERN_COLOR_FUNCTION_RE.lastIndex = 0
  return css.replace(MODERN_COLOR_FUNCTION_RE, (match) => normalizeColorForHtml2Canvas(match))
}

function stripStylesheetsFromClone(clonedDoc: Document): void {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((node) => node.remove())
  clonedDoc.querySelectorAll("style").forEach((styleEl) => {
    if (styleEl.textContent) {
      styleEl.textContent = sanitizeCssTextForHtml2Canvas(styleEl.textContent)
    }
  })
}

function walkElementsInParallel(
  source: Element,
  clone: Element,
  visit: (source: Element, clone: Element) => void
): void {
  visit(source, clone)
  const sourceChildren = source.children
  const cloneChildren = clone.children
  const len = Math.min(sourceChildren.length, cloneChildren.length)
  for (let i = 0; i < len; i += 1) {
    walkElementsInParallel(sourceChildren[i], cloneChildren[i], visit)
  }
}

function inlineComputedStylesForHtml2Canvas(
  sourceRoot: HTMLElement,
  cloneRoot: HTMLElement,
  sourceView: Window
): void {
  walkElementsInParallel(sourceRoot, cloneRoot, (source, clone) => {
    if (!(source instanceof HTMLElement) || !(clone instanceof HTMLElement)) return

    const computed = sourceView.getComputedStyle(source)
    const declarations: string[] = []

    for (let i = 0; i < computed.length; i += 1) {
      const prop = computed[i]
      let value = computed.getPropertyValue(prop)
      if (!value || value === "initial") continue

      if (COLOR_RELATED_PROPERTIES.has(prop) || MODERN_COLOR_FUNCTION_RE.test(value)) {
        value = sanitizeCSSValueForHtml2Canvas(value)
      }

      declarations.push(`${prop}:${value}`)
    }

    if (declarations.length > 0) {
      clone.style.cssText = `${declarations.join(";")};${clone.style.cssText}`
    }

    const inlineStyle = clone.getAttribute("style")
    if (inlineStyle && MODERN_COLOR_FUNCTION_RE.test(inlineStyle)) {
      clone.setAttribute("style", sanitizeCssTextForHtml2Canvas(inlineStyle))
    }
  })
}

/**
 * Prepara el documento clonado para html2canvas (Tailwind v4 / oklab).
 * Quita hojas externas que html2canvas no puede parsear e inlinea estilos calculados en RGB.
 */
export function prepareHtml2CanvasClone(
  clonedDoc: Document,
  sourceRoot: HTMLElement,
  cloneRoot: HTMLElement
): void {
  stripStylesheetsFromClone(clonedDoc)

  const sourceView = sourceRoot.ownerDocument?.defaultView
  if (!sourceView) return

  inlineComputedStylesForHtml2Canvas(sourceRoot, cloneRoot, sourceView)
}
