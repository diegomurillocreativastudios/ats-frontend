import { NextResponse } from "next/server"
import {
  generateCsrfToken,
  setCsrfCookie,
} from "@/lib/auth/csrf"

/**
 * Issues (or rotates) a readable CSRF cookie for double-submit protection.
 * Safe to call before login / forgot / reset when no session exists yet.
 */
export async function GET() {
  const token = generateCsrfToken()
  const response = NextResponse.json({ token })
  setCsrfCookie(response, token)
  return response
}
