import type { MetadataRoute } from "next"

import { buildRobots } from "@/lib/seo/public-metadata"
import { readPublicOrigin } from "@/lib/seo/site-origin"

export default function robots(): MetadataRoute.Robots {
  return buildRobots(readPublicOrigin())
}
