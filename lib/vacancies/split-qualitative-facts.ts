import { splitDelimitedFacts } from "@/lib/vacancies/split-delimited-facts"

// cspell:disable-next-line
const SENTENCE_SPLIT = /(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡])/u

/**
 * Splits qualitative AI prose into scannable facts.
 * Prefers existing bullets or delimiters; otherwise splits on sentences.
 */
export function splitQualitativeFacts(value: unknown): string[] {
  const delimited = splitDelimitedFacts(value)
  if (delimited.length === 0) return []
  if (delimited.length > 1) return delimited

  const text = delimited[0]
  const sentences = text
    .split(SENTENCE_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean)

  return sentences.length > 1 ? sentences : [text]
}
