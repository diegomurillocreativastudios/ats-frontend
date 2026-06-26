import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const overrides = JSON.parse(
  readFileSync(
    join(root, "scripts/admin-document-types-i18n-overrides.json"),
    "utf8",
  ),
)

function setPath(obj, path, value) {
  const keys = path.split(".")
  let current = obj
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i]
    if (current[key] == null || typeof current[key] !== "object") {
      current[key] = {}
    }
    current = current[key]
  }
  current[keys[keys.length - 1]] = value
}

for (const [locale, entries] of Object.entries(overrides)) {
  const filePath = join(root, `messages/${locale}.json`)
  const messages = JSON.parse(readFileSync(filePath, "utf8"))

  for (const [dotPath, value] of Object.entries(entries)) {
    setPath(messages, dotPath, value)
  }

  writeFileSync(filePath, `${JSON.stringify(messages, null, 2)}\n`, "utf8")
  console.log(`Patched messages/${locale}.json (${Object.keys(entries).length} keys)`)
}
