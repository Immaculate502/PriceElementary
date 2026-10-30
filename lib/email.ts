import "server-only"

/**
 * Minimal Resend client built on fetch so no extra dependency is required.
 *
 * RESEND_API_KEY and RESEND_FROM_EMAIL are server-only secrets. RESEND_FROM_EMAIL
 * must use a domain verified in Resend (e.g. "New Light <info@newlight.org>"),
 * otherwise Resend rejects the send.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ""
// Falls back to the domain already verified in Resend so an empty
// RESEND_FROM_EMAIL doesn't silently disable every outgoing email.
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL?.trim() || "Rooted <marc.hurrigan@rootedministry.online>"

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

export type SendResult = { ok: boolean; error?: string }

/**
 * Sends many individual emails via Resend's batch endpoint (max 100 per call),
 * so recipients never see each other's addresses.
 */
export async function sendBatchEmails(
  messages: SendArgs[],
): Promise<{ sent: number; failed: number; error?: string }> {
  if (!isEmailConfigured()) return { sent: 0, failed: messages.length, error: "Email is not configured." }
  let sent = 0
  let failed = 0
  let lastError: string | undefined

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          chunk.map((m) => ({
            from: RESEND_FROM_EMAIL,
            to: m.to,
            subject: m.subject,
            html: m.html,
            text: m.text,
            ...(m.replyTo ? { reply_to: m.replyTo } : {}),
          })),
        ),
        signal: AbortSignal.timeout(20_000),
      })
      if (res.ok) {
        sent += chunk.length
      } else {
        failed += chunk.length
        lastError = `Resend responded ${res.status}: ${await res.text().catch(() => "")}`
      }
    } catch (err) {
      failed += chunk.length
      lastError = err instanceof Error ? err.message : "Unknown email error"
    }
  }

  return { sent, failed, error: lastError }
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendArgs): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Email is not configured." }
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
      return { ok: false, error: `Resend responded ${res.status}: ${detail}` }
    }

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error"
    return { ok: false, error: message }
  }
}
