import DOMPurify from "isomorphic-dompurify"

/**
 * Tags used by report / technical-sheet HTML templates (fragments and full documents).
 * Scripts, iframes, object/embed, form controls, and SVG event surfaces are excluded.
 */
const TEMPLATE_HTML_ALLOWED_TAGS = [
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "body",
  "br",
  "caption",
  "col",
  "colgroup",
  "div",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "i",
  "img",
  "label",
  "li",
  "main",
  "mark",
  "meta",
  "nav",
  "ol",
  "p",
  "section",
  "small",
  "span",
  "strong",
  "style",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "u",
  "ul",
] as const

const TEMPLATE_HTML_ALLOWED_ATTR = [
  "alt",
  "aria-hidden",
  "aria-label",
  "class",
  "colspan",
  "content",
  "height",
  "href",
  "id",
  "lang",
  "name",
  "rel",
  "role",
  "rowspan",
  "scope",
  "src",
  "style",
  "target",
  "title",
  "type",
  "width",
  "charset",
  "http-equiv",
] as const

/** http(s), mailto, relative paths, and image data URIs only. */
const TEMPLATE_HTML_ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$)|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,)/i

const PURIFY_BASE: {
  ALLOWED_TAGS: string[]
  ALLOWED_ATTR: string[]
  ALLOW_DATA_ATTR: boolean
  ALLOW_UNKNOWN_PROTOCOLS: boolean
  ALLOWED_URI_REGEXP: RegExp
  FORBID_TAGS: string[]
  SANITIZE_DOM: boolean
} = {
  ALLOWED_TAGS: [...TEMPLATE_HTML_ALLOWED_TAGS],
  ALLOWED_ATTR: [...TEMPLATE_HTML_ALLOWED_ATTR],
  ALLOW_DATA_ATTR: true,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  ALLOWED_URI_REGEXP: TEMPLATE_HTML_ALLOWED_URI_REGEXP,
  FORBID_TAGS: [
    "script",
    "iframe",
    "object",
    "embed",
    "link",
    "base",
    "form",
    "input",
    "button",
    "textarea",
    "select",
  ],
  SANITIZE_DOM: true,
}

function isWholeHtmlDocument(html: string): boolean {
  const trimmed = html.trim()
  return /^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)
}

function extractBodyInnerHtml(documentHtml: string): string {
  const match = documentHtml.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)
  return match ? match[1] : documentHtml
}

/**
 * Sanitizes interpolated template HTML with a strict allowlist.
 * Strips scripts, event handlers, and dangerous URI schemes (`javascript:`, etc.).
 *
 * Fragments are sanitized via a temporary document so `<style>` blocks survive
 * (DOMPurify drops them in fragment mode).
 */
export function sanitizeTemplateHtml(html: string): string {
  if (!html) return ""

  const trimmed = html.trim()
  if (!trimmed) return ""

  if (isWholeHtmlDocument(trimmed)) {
    return DOMPurify.sanitize(trimmed, {
      ...PURIFY_BASE,
      WHOLE_DOCUMENT: true,
    })
  }

  const wrapped = `<!DOCTYPE html><html><head></head><body>${trimmed}</body></html>`
  const cleanedDoc = DOMPurify.sanitize(wrapped, {
    ...PURIFY_BASE,
    WHOLE_DOCUMENT: true,
  })
  return extractBodyInnerHtml(cleanedDoc)
}
