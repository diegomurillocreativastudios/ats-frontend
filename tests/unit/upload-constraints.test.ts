import { describe, expect, it } from "vitest"
import {
  LOGO_EXTENSIONS,
  LOGO_TYPES,
  PDF_DOCX_EXTENSIONS,
  PDF_DOCX_TYPES,
  PDF_DOCX_TXT_EXTENSIONS,
  PDF_DOCX_TXT_TYPES,
  UPLOAD_MAX_BYTES_5_MB,
  UPLOAD_MAX_BYTES_15_MB,
  VACANCY_FILE_EXTENSIONS,
  VACANCY_FILE_TYPES,
  UPLOAD_MAX_BYTES_10_MB,
  getUploadApiErrorMessage,
  validateUploadFile,
} from "@/lib/upload-constraints"

describe("validateUploadFile", () => {
  const pdfDocx = {
    types: PDF_DOCX_TYPES,
    extensions: PDF_DOCX_EXTENSIONS,
    maxBytes: UPLOAD_MAX_BYTES_15_MB,
  }

  it("accepts pdf/docx by extension or mime", () => {
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "cv.pdf", { type: "application/pdf" }),
        pdfDocx
      ).valid
    ).toBe(true)
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "cv.PDF", { type: "" }),
        pdfDocx
      ).valid
    ).toBe(true)
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "cv.docx", { type: "" }),
        pdfDocx
      ).valid
    ).toBe(true)
  })

  it("rejects doc, svg, empty, and oversized files", () => {
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "cv.doc", { type: "" }),
        pdfDocx
      )
    ).toEqual({ valid: false, reason: "type" })
    expect(
      validateUploadFile(new File([], "cv.pdf", { type: "application/pdf" }), pdfDocx)
    ).toEqual({ valid: false, reason: "empty" })
    const oversized = new File([new Uint8Array([1])], "cv.pdf", {
      type: "application/pdf",
    })
    Object.defineProperty(oversized, "size", {
      value: UPLOAD_MAX_BYTES_15_MB + 1,
    })
    expect(validateUploadFile(oversized, pdfDocx)).toEqual({
      valid: false,
      reason: "size",
    })
  })

  it("allows txt only when the allowlist includes it", () => {
    const withTxt = {
      types: PDF_DOCX_TXT_TYPES,
      extensions: PDF_DOCX_TXT_EXTENSIONS,
      maxBytes: UPLOAD_MAX_BYTES_15_MB,
    }
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "cv.txt", { type: "text/plain" }),
        withTxt
      ).valid
    ).toBe(true)
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "cv.txt", { type: "text/plain" }),
        pdfDocx
      ).valid
    ).toBe(false)
  })

  it("rejects svg logos and accepts png/gif", () => {
    const logo = {
      types: LOGO_TYPES,
      extensions: LOGO_EXTENSIONS,
      maxBytes: UPLOAD_MAX_BYTES_5_MB,
    }
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "logo.svg", {
          type: "image/svg+xml",
        }),
        logo
      )
    ).toEqual({ valid: false, reason: "type" })
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "logo.png", { type: "image/png" }),
        logo
      ).valid
    ).toBe(true)
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "logo.gif", { type: "image/gif" }),
        logo
      ).valid
    ).toBe(true)
  })

  it("accepts vacancy md and rejects txt for tailoring allowlist", () => {
    const vacancy = {
      types: VACANCY_FILE_TYPES,
      extensions: VACANCY_FILE_EXTENSIONS,
      maxBytes: UPLOAD_MAX_BYTES_10_MB,
    }
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "job.md", { type: "text/markdown" }),
        vacancy
      ).valid
    ).toBe(true)
    expect(
      validateUploadFile(
        new File([new Uint8Array([1])], "job.txt", { type: "text/plain" }),
        vacancy
      ).valid
    ).toBe(false)
  })
})

describe("getUploadApiErrorMessage", () => {
  it("maps 413, 415 and 400 with defaults when server message is generic", () => {
    const err413 = Object.assign(new Error("Solicitud fallida (413)"), {
      status: 413,
    })
    const err415 = Object.assign(new Error("Error desconocido"), {
      status: 415,
    })
    const err400 = Object.assign(new Error("Error desconocido"), {
      status: 400,
    })
    expect(getUploadApiErrorMessage(err413)).toContain("demasiado grande")
    expect(getUploadApiErrorMessage(err415)).toContain("no coincide")
    expect(getUploadApiErrorMessage(err400)).toContain("no soportado")
  })

  it("prefers useful server message over defaults", () => {
    const err = Object.assign(new Error("CV supera el límite"), {
      status: 413,
    })
    expect(getUploadApiErrorMessage(err)).toBe("CV supera el límite")
  })

  it("uses custom fallbacks when provided", () => {
    const err = Object.assign(new Error("Error desconocido"), { status: 415 })
    expect(
      getUploadApiErrorMessage(err, {
        typeMismatch: "Tipo inválido personalizado",
      })
    ).toBe("Tipo inválido personalizado")
  })
})
