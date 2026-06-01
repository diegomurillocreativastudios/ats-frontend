import type { LucideIcon } from "lucide-react"
import { ExternalLink, Github, Globe, Linkedin, Twitter } from "lucide-react"

export interface SocialLinkPresetDefinition {
  id: string
  label: string
  Icon: LucideIcon
}

export const SOCIAL_LINK_PRESET_OTHER_ID = "other"

export const SOCIAL_LINK_PRESETS: SocialLinkPresetDefinition[] = [
  { id: "personal", label: "Sitio web personal", Icon: Globe },
  { id: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { id: "github", label: "GitHub", Icon: Github },
  { id: "twitter", label: "Twitter / X", Icon: Twitter },
  { id: SOCIAL_LINK_PRESET_OTHER_ID, label: "Otro", Icon: ExternalLink },
]

const PRESET_BY_ID = new Map(SOCIAL_LINK_PRESETS.map((p) => [p.id, p]))

const normalize = (s: string) => s.trim().toLowerCase()

const ALIAS_TO_ID: Record<string, string> = {
  linkedin: "linkedin",
  "linked in": "linkedin",
  github: "github",
  git: "github",
  twitter: "twitter",
  x: "twitter",
  "twitter / x": "twitter",
  otro: SOCIAL_LINK_PRESET_OTHER_ID,
  other: SOCIAL_LINK_PRESET_OTHER_ID,
  "sitio web personal": "personal",
  "sitio web": "personal",
  website: "personal",
}

export function getPresetById(id: string): SocialLinkPresetDefinition | undefined {
  return PRESET_BY_ID.get(id)
}

/**
 * Interpreta el texto guardado en `Platform` y devuelve un id de preset conocido u "other".
 */
export function inferPresetIdFromStoredPlatform(platform: string): string {
  const t = platform.trim()
  if (!t) return ""
  const n = normalize(t)
  for (const p of SOCIAL_LINK_PRESETS) {
    if (p.id !== SOCIAL_LINK_PRESET_OTHER_ID && normalize(p.label) === n) {
      return p.id
    }
  }
  const alias = ALIAS_TO_ID[n]
  if (alias) return alias
  return SOCIAL_LINK_PRESET_OTHER_ID
}

export function getPlatformLabelForPresetId(id: string): string {
  return getPresetById(id)?.label ?? ""
}
