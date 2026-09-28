import { cp, mkdir } from "node:fs/promises"
import path from "node:path"

const source = path.join(
  process.cwd(),
  "node_modules",
  "@countrystatecity",
  "countries-browser",
  "dist",
  "data",
  "states"
)
const destination = path.join(process.cwd(), "public", "location-catalog", "states")

await mkdir(destination, { recursive: true })
await cp(source, destination, { recursive: true })
