import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const overrides = JSON.parse(
  readFileSync(join(root, "scripts/recruiter-portal-i18n-overrides.json"), "utf8"),
)

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function deepMerge(base, patch) {
  const result = { ...base }
  for (const [key, patchValue] of Object.entries(patch)) {
    const baseValue = result[key]
    result[key] =
      isPlainObject(baseValue) && isPlainObject(patchValue)
        ? deepMerge(baseValue, patchValue)
        : patchValue
  }
  return result
}

for (const locale of ["en", "fr", "de", "it"]) {
  const filePath = join(root, "messages", `${locale}.json`)
  const data = JSON.parse(readFileSync(filePath, "utf8"))
  data.RecruiterPortal = deepMerge(
    data.RecruiterPortal ?? {},
    overrides[locale],
  )
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`Patched RecruiterPortal in ${locale}.json`)
}
