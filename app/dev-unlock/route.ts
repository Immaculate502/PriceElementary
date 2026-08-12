import { NextResponse } from "next/server"
import { UNLOCK_COOKIE, SESSION_MAX_AGE, getCurrentPasswordHash, unlockToken } from "@/lib/admin-auth"

// TEMPORARY dev-only helper used to verify the leadership console in the
// preview browser. Removed after verification.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 })
  }
  const hash = await getCurrentPasswordHash()
  const res = NextResponse.redirect(new URL("http://localhost:3000/admin"))
  res.cookies.set(UNLOCK_COOKIE, unlockToken(hash), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
