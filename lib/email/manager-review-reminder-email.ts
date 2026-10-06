import { appBaseUrl } from "@/lib/email/send-resend-email";

export type ManagerReviewReminderEmailInput = {
  managerName: string;
  seName: string;
  itemTitle: string;
  itemKind: "challenge" | "coaching";
  pendingDays: number;
  triggerLabel: "automatic reminder" | "nudge from your SE";
};

export function buildManagerReviewReminderEmail(input: ManagerReviewReminderEmailInput) {
  const inboxUrl = `${appBaseUrl()}/manager/inbox`;
  const kindLabel = input.itemKind === "challenge" ? "Challenge submission" : "Simulation coaching card";
  const subject = `Review needed: ${input.seName}, ${input.itemTitle}`;

  const text = [
    `Hi ${input.managerName},`,
    "",
    `${input.seName}'s ${kindLabel.toLowerCase()} has been waiting for your review for ${input.pendingDays} days.`,
    "",
    `Item: ${input.itemTitle}`,
    `Triggered by: ${input.triggerLabel}`,
    "",
    `Open your inbox: ${inboxUrl}`,
  ].join("\n");

  // Email-safe inline styles on the v3 palette: warm paper, 1px warm lines, ink text, one amber button.
  // No webfonts and no monospace; system sans-serif only.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F6F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F6F3EE;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E6E0D6;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#0033A1;padding:14px 32px;">
              <p style="margin:0;font-size:15px;font-weight:800;letter-spacing:0.01em;text-transform:uppercase;color:#FFFFFF;">SE Enablement</p>
              <p style="margin:2px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FFB81C;">Field readiness</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#121A2E;">A review is waiting on you</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3A4256;">
                Hi ${escapeHtml(input.managerName)},
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3A4256;">
                <strong style="color:#121A2E;">${escapeHtml(input.seName)}</strong> submitted a ${escapeHtml(kindLabel.toLowerCase())}
                <strong style="color:#121A2E;">${escapeHtml(String(input.pendingDays))} days ago</strong> and is still waiting for your feedback.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFFFFF;border:1px solid #E6E0D6;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 18px;border-left:3px solid #0033A1;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#5E6577;">${escapeHtml(kindLabel)}</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#121A2E;">${escapeHtml(input.itemTitle)}</p>
                    <p style="margin:8px 0 0;font-size:13px;color:#5E6577;">Sent as ${input.triggerLabel === "nudge from your SE" ? "a nudge from your SE" : "an automatic reminder"}.</p>
                  </td>
                </tr>
              </table>
              <a href="${inboxUrl}" style="display:inline-block;background:#FFB81C;color:#121A2E;border:1px solid #C98F00;border-radius:999px;box-shadow:0 2px 0 #121A2E;text-decoration:none;font-size:15px;font-weight:700;padding:10px 22px;">
                Open inbox
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #EFEAE2;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#5E6577;">
                Timely reviews keep your team moving. This ${input.triggerLabel === "nudge from your SE" ? "nudge" : "reminder"} is sent at most once every 7 days per item.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
