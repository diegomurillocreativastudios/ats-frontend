/**
 * ATS-safe CV PDF from an adapted candidate profile (PDFKit, single column, no images).
 * Text is extractable so parsers (Workday, Greenhouse, Taleo) can read it.
 */

import PDFDocument from "pdfkit"
import type { CandidateProfile } from "@/lib/candidate-profile"
import {
  eduRowFromObj,
  langRowFromObj,
  normalizeObjectArray,
  parseSkillsToLines,
  workRowFromObj,
} from "@/lib/candidate-profile-structured"

type PdfDoc = InstanceType<typeof PDFDocument>

export interface AdaptedCvPdfMeta {
  vacancyTitle?: string | null
  versionNumber?: number | null
  label?: string | null
}

const MARGIN = { top: 48, bottom: 48, left: 54, right: 54 }
const TEXT_COLOR = "#111111"
const MUTED_COLOR = "#333333"
const RULE_COLOR = "#666666"

function contentWidth(doc: PdfDoc): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right
}

function ensureSpace(doc: PdfDoc, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom
  if (doc.y + needed > bottom) {
    doc.addPage()
  }
}

function drawHorizontalRule(doc: PdfDoc) {
  const left = doc.page.margins.left
  const width = contentWidth(doc)
  const y = doc.y + 2
  doc
    .moveTo(left, y)
    .lineTo(left + width, y)
    .strokeColor(RULE_COLOR)
    .lineWidth(0.6)
    .stroke()
  doc.y = y + 10
}

function writeSectionHeading(doc: PdfDoc, title: string) {
  ensureSpace(doc, 36)
  doc.moveDown(0.6)
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(TEXT_COLOR)
    .text(title.toUpperCase(), { width: contentWidth(doc) })
  drawHorizontalRule(doc)
}

function writeBody(doc: PdfDoc, text: string, options?: { bold?: boolean; size?: number }) {
  const trimmed = text.trim()
  if (!trimmed) return
  ensureSpace(doc, 18)
  doc
    .font(options?.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options?.size ?? 10)
    .fillColor(TEXT_COLOR)
    .text(trimmed, {
      width: contentWidth(doc),
      align: "left",
      lineGap: 2,
    })
}

function writeMuted(doc: PdfDoc, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  ensureSpace(doc, 16)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED_COLOR)
    .text(trimmed, { width: contentWidth(doc), lineGap: 1.5 })
}

function fullName(profile: CandidateProfile): string {
  return [profile.firstName, profile.lastName]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ")
}

function contactLine(profile: CandidateProfile): string {
  const parts = [
    profile.email?.trim(),
    profile.phoneNumber?.trim(),
    profile.country?.trim(),
  ].filter(Boolean)
  return parts.join("  |  ")
}

function dateRange(start: string, end: string): string {
  const s = start.trim()
  const e = end.trim()
  if (s && e) return `${s} - ${e}`
  if (s) return s
  if (e) return e
  return ""
}

function writeHeader(doc: PdfDoc, profile: CandidateProfile) {
  const name = fullName(profile) || "Curriculum Vitae"
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(TEXT_COLOR)
    .text(name, { width: contentWidth(doc), align: "left" })

  if (profile.headline?.trim()) {
    doc.moveDown(0.25)
    writeBody(doc, profile.headline, { size: 11 })
  }

  const contact = contactLine(profile)
  if (contact) {
    doc.moveDown(0.2)
    writeMuted(doc, contact)
  }
}

function writeSummary(doc: PdfDoc, profile: CandidateProfile) {
  if (!profile.summary?.trim()) return
  writeSectionHeading(doc, "Resumen")
  writeBody(doc, profile.summary)
}

function writeExperience(doc: PdfDoc, profile: CandidateProfile) {
  const rows = normalizeObjectArray(profile.workExperience).map(workRowFromObj)
  const usable = rows.filter(
    (r) => r.company || r.role || r.description || r.startDate || r.endDate
  )
  if (usable.length === 0) return

  writeSectionHeading(doc, "Experiencia")
  for (const job of usable) {
    ensureSpace(doc, 40)
    const titleLine = [job.role, job.company].filter(Boolean).join(" — ")
    if (titleLine) writeBody(doc, titleLine, { bold: true })
    const period = dateRange(job.startDate, job.endDate)
    if (period) writeMuted(doc, period)
    if (job.description.trim()) {
      doc.moveDown(0.15)
      writeBody(doc, job.description)
    }
    doc.moveDown(0.45)
  }
}

function writeEducation(doc: PdfDoc, profile: CandidateProfile) {
  const rows = normalizeObjectArray(profile.education).map(eduRowFromObj)
  const usable = rows.filter(
    (r) => r.institution || r.degree || r.startDate || r.endDate
  )
  if (usable.length === 0) return

  writeSectionHeading(doc, "Educación")
  for (const edu of usable) {
    ensureSpace(doc, 32)
    const titleLine = [edu.degree, edu.institution].filter(Boolean).join(" — ")
    if (titleLine) writeBody(doc, titleLine, { bold: true })
    const period = dateRange(edu.startDate, edu.endDate)
    if (period) writeMuted(doc, period)
    doc.moveDown(0.35)
  }
}

function writeSkills(doc: PdfDoc, profile: CandidateProfile) {
  const skills = parseSkillsToLines(profile.skills)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (skills.length === 0) return

  writeSectionHeading(doc, "Habilidades")
  writeBody(doc, skills.join(", "))
}

function writeLanguages(doc: PdfDoc, profile: CandidateProfile) {
  const rows = normalizeObjectArray(profile.languages).map(langRowFromObj)
  const usable = rows.filter((r) => r.language || r.level)
  if (usable.length === 0) return

  writeSectionHeading(doc, "Idiomas")
  for (const lang of usable) {
    const line = [lang.language, lang.level].filter(Boolean).join(": ")
    if (line) writeBody(doc, line)
  }
}

/**
 * Builds a plain, single-column PDF buffer suitable for ATS parsers.
 */
export function buildAdaptedCvPdfBuffer(
  profile: CandidateProfile,
  _meta?: AdaptedCvPdfMeta
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: MARGIN,
      info: {
        Title: fullName(profile) || "CV",
        Author: fullName(profile) || "Candidate",
        Subject: "Curriculum Vitae",
      },
    })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    try {
      writeHeader(doc, profile)
      writeSummary(doc, profile)
      writeExperience(doc, profile)
      writeEducation(doc, profile)
      writeSkills(doc, profile)
      writeLanguages(doc, profile)
    } catch (err) {
      reject(err)
      return
    }
    doc.end()
  })
}

/** ASCII-safe download filename for Content-Disposition. */
export function buildAdaptedCvPdfFilename(meta?: AdaptedCvPdfMeta): string {
  const slugSource =
    meta?.label?.trim() ||
    meta?.vacancyTitle?.trim() ||
    (meta?.versionNumber != null ? `v${meta.versionNumber}` : "perfil")
  const slug = slugSource
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return `cv-adaptado-${slug || "perfil"}.pdf`
}
