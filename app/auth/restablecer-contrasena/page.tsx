import { redirect } from "next/navigation"

type Search = Record<string, string | string[] | undefined>

export default async function AuthRestablecerContrasenaRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams
  const q = new URLSearchParams()
  const token = sp.token
  const email = sp.email
  if (typeof token === "string") q.set("token", token)
  if (typeof email === "string") q.set("email", email)
  const suffix = q.toString() ? `?${q.toString()}` : ""
  redirect(`/restablecer-contrasena${suffix}`)
}
