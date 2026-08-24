export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Sends a transactional e-mail via the Resend HTTP API (no SDK dependency — a single fetch call).
 * No-ops when RESEND_API_KEY/EMAIL_FROM aren't set, mirroring how push.ts and storage.ts treat
 * their own optional external services.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!isEmailConfigured()) {
    console.warn(`[email] RESEND_API_KEY/EMAIL_FROM não configurados — e-mail para ${to} não enviado.`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[email] Falha ao enviar e-mail via Resend (${response.status}): ${body}`);
  }
}
