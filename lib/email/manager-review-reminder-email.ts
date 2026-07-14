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
  const inboxUrl = `${appBaseUrl()}/manager?section=inbox`;
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
    `Open your Action Inbox: ${inboxUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f4f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2dfd9;">
          <tr>
            <td style="background:linear-gradient(90deg,#0033a1,#0071ce,#cc27b0);height:4px;padding:0;"></td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0071ce;">SE Enablement</p>
              <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#00143a;">A review is waiting on you</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d3c38;">
                Hi ${escapeHtml(input.managerName)},
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3d3c38;">
                <strong>${escapeHtml(input.seName)}</strong> submitted a ${escapeHtml(kindLabel.toLowerCase())}
                <strong>${escapeHtml(String(input.pendingDays))} days ago</strong> and is still waiting for your feedback.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9f8f6;border:1px solid #eceae6;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a09d98;">${escapeHtml(kindLabel)}</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#0d0e12;">${escapeHtml(input.itemTitle)}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#6b6860;">${escapeHtml(input.triggerLabel)}</p>
                  </td>
                </tr>
              </table>
              <a href="${inboxUrl}" style="display:inline-block;background:#00143a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;">
                Open Action Inbox →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#a09d98;">
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
