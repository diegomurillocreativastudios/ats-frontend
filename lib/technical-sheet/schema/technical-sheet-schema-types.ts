export interface TechnicalSheetSchema {
  version: number
  kind: "technical-sheet"
  title?: string
  sections: TechnicalSheetSection[]
}

export interface LabeledBinding {
  label: string
  binding: string
}

export interface RepeatCardsBullets {
  title: string
  rowsBinding: string
  item?: string
}

export interface RepeatCardsSection {
  type: "repeatCards"
  title: string
  rowsBinding: string
  fields: LabeledBinding[]
  bullets?: RepeatCardsBullets
  emptyText?: string
}

export interface BulletListSection {
  type: "bulletList"
  title: string
  rowsBinding: string
  item: string
  emptyText?: string
}

export interface FactsItem {
  label: string
  value: string
}

export interface FactsSection {
  type: "facts"
  title: string
  items: FactsItem[]
}

export interface ParagraphSection {
  type: "paragraph"
  title: string
  text: string
}

export type TechnicalSheetSection =
  | RepeatCardsSection
  | BulletListSection
  | FactsSection
  | ParagraphSection
