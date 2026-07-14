export async function sendResendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.DIGEST_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!resendKey) {
    return { sent: false, error: "RESEND_API_KEY is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { sent: false, error: body || `Resend ${response.status}` };
  }

  return { sent: true };
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ).replace(/\/$/, "");
}
