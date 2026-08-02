import "server-only"

/**
 * Password-reset email content. Email clients ignore external CSS and don't
 * understand oklch, so everything is inline hex that mirrors the app's
 * gold-on-dark F.A.M.E. brand.
 */
export function passwordResetEmail(resetUrl: string) {
  const subject = "Reset your F.A.M.E. password"

  // Plain-text fallback for clients that block HTML.
  const text = [
    "Reset your F.A.M.E. password",
    "",
    "We received a request to reset the password for your New Light F.A.M.E. account.",
    "Open this link to choose a new password:",
    resetUrl,
    "",
    "This link expires in about an hour and can only be used once.",
    "If you didn't request this, you can safely ignore this email — your password stays the same.",
  ].join("\n")

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f5f2ea;font-family:Georgia,'Times New Roman',serif;color:#2b2620;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f2ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e0d2;">
            <tr>
              <td style="background-color:#211d18;padding:32px;text-align:center;">
                <div style="font-size:24px;font-weight:bold;letter-spacing:2px;color:#d8b451;">F.A.M.E.</div>
                <div style="font-size:12px;letter-spacing:1px;color:#b7ac97;margin-top:6px;">FAITH · ACTION · MINISTRY · EVANGELISM</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#211d18;">Reset your password</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a4437;">
                  We received a request to reset the password for your New Light F.A.M.E. account.
                  Tap the button below to choose a new one.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="border-radius:10px;background-color:#d8b451;">
                      <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#211d18;text-decoration:none;">
                        Choose a new password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b6455;">
                  This link expires in about an hour and can only be used once.
                </p>
                <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#6b6455;">
                  If you didn't request this, you can safely ignore this email — your password won't change.
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8a8272;word-break:break-all;">
                  Button not working? Copy and paste this link into your browser:<br />
                  <a href="${resetUrl}" style="color:#9a7d2e;">${resetUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f5f2ea;padding:20px 32px;text-align:center;border-top:1px solid #e7e0d2;">
                <p style="margin:0;font-size:12px;color:#8a8272;">New Light Church · F.A.M.E. Discipleship</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, html, text }
}
