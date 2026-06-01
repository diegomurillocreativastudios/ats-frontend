export type TemplateKind = "Notification" | "Document" | "Questionnaire"

export interface TemplateBase {
  id: number
  name: string
  slug: string
  type: TemplateKind
  isTechnicalSheet: boolean
  isReport: boolean
  schemaJson?: unknown
}

export interface DocumentTemplate extends TemplateBase {
  $type: "Document"
  contentTemplate: string
  outputFormat: string
}

export interface NotificationTemplate extends TemplateBase {
  $type: "Notification"
  subjectTemplate: string
  bodyTemplate: string
  channels?: string[]
}

export interface QuestionnaireTemplate extends TemplateBase {
  $type: "Questionnaire"
  description: string
  isMandatory: boolean
}
