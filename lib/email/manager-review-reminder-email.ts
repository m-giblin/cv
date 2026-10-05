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
  const subject = `Review needed — ${input.seName}: ${input.itemTitle}`;

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F2F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F2F4F8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #D6DCE8;border-radius:14px;">
          <tr>
            <td style="background:#0033A1;height:4px;padding:0;font-size:0;line-height:0;"></td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 8px;font-family:Menlo,Consolas,'Courier New',monospace;font-size:12px;font-weight:500;letter-spacing:0.03em;text-transform:uppercase;color:#0033A1;">SE Enablement</p>
              <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#0A1A3F;">A review is waiting on you</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2B3A5C;">
                Hi ${escapeHtml(input.managerName)},
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#2B3A5C;">
                <strong>${escapeHtml(input.seName)}</strong> submitted a ${escapeHtml(kindLabel.toLowerCase())}
                <strong>${escapeHtml(String(input.pendingDays))} days ago</strong> and is still waiting for your feedback.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#E5ECFA;border:1px solid #D6DCE8;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-family:Menlo,Consolas,'Courier New',monospace;font-size:12px;font-weight:500;letter-spacing:0.03em;text-transform:uppercase;color:#4A5878;">${escapeHtml(kindLabel)}</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#0A1A3F;">${escapeHtml(input.itemTitle)}</p>
                    <p style="margin:8px 0 0;font-size:13px;color:#4A5878;">${escapeHtml(input.triggerLabel)}</p>
                  </td>
                </tr>
              </table>
              <a href="${inboxUrl}" style="display:inline-block;background:#FFB81C;color:#0A1A3F;border:1.5px solid #0A1A3F;border-radius:999px;text-decoration:none;font-size:15px;font-weight:700;padding:10px 20px;">
                Open inbox →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#4A5878;">
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
