export async function dispatchCorpusEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ sent: boolean; error?: string }> {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.CORPUS_QA_EMAIL_FROM;

  if (!smtpUrl || !from) {
    return { sent: false, error: "SMTP not configured" };
  }

  try {
    const response = await fetch(smtpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.body,
      }),
    });

    if (!response.ok) {
      return { sent: false, error: `SMTP relay failed (${response.status})` };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Email dispatch failed",
    };
  }
}
