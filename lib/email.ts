import "server-only"

/**
 * Minimal Resend client built on fetch so no extra dependency is required.
 *
 * RESEND_API_KEY and RESEND_FROM_EMAIL are server-only secrets. RESEND_FROM_EMAIL
 * must use a domain verified in Resend (e.g. "New Light <info@newlight.org>"),
 * otherwise Resend rejects the send.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ""
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? ""

export function isEmailConfigured() {
  return RESEND_API_KEY.length > 0 && RESEND_FROM_EMAIL.length > 0
}

type SendArgs = {
  to: string
  subject: string
  html: string
  text: string
  /** Where a member's reply should go, if different from the sender. */
  replyTo?: string
}

export type SendResult = {
  ok: boolean
  error?: string
  /**
   * True when the send failed because of how the app is configured (bad API key,
   * unverified sender domain) rather than anything about the recipient. Callers
   * use this to tell a member "we couldn't send" instead of silently claiming
   * success — it reveals nothing about whether the address exists.
   */
  configError?: boolean
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendArgs): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email is not configured.", configError: true }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to,
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      // Never let a slow mail API hang the reset request.
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      // Resend returns a JSON error body; surface its message for the server log
      // without leaking it to the end user.
      const detail = await res.text().catch(() => "")

      // 401 = bad API key, 403 = sender domain not verified. Both mean no mail
      // will ever reach anyone until it's fixed, so don't report success.
      const configError =
        res.status === 401 || res.status === 403 || /not verified|domain/i.test(detail)

      return { ok: false, error: `Resend responded ${res.status}: ${detail}`, configError }
    }

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error"
    return { ok: false, error: message }
  }
}
