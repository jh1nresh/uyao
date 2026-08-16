const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const DEFAULT_SUPPORT_EMAIL_TO = "edwardhsieh0122@gmail.com";
const EMAIL_TIMEOUT_MS = 4000;

export interface SupportTicketEmail {
  ticketId: string;
  storeSlug: string;
  operatorName: string;
  replyEmail: string;
  message: string;
  createdAt: string;
}

export type SupportEmailResult = "sent" | "not_configured";

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendSupportTicketEmail(
  ticket: SupportTicketEmail,
): Promise<SupportEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SUPPORT_EMAIL_FROM?.trim() || process.env.PILOT_EMAIL_FROM?.trim();
  if (!apiKey || !from) return "not_configured";

  const to = process.env.SUPPORT_EMAIL_TO?.trim()
    || process.env.PILOT_EMAIL_TO?.trim()
    || DEFAULT_SUPPORT_EMAIL_TO;
  const ticketId = oneLine(ticket.ticketId);
  const body = [
    "新的 Store OS 真人支援單",
    "",
    `單號：${ticketId}`,
    `門市：${ticket.storeSlug}`,
    `操作人：${ticket.operatorName}`,
    `回覆 Email：${ticket.replyEmail}`,
    `問題：${ticket.message}`,
    `建立時間：${ticket.createdAt}`,
    "",
    "請直接回覆藥局留下的 Email。",
  ].join("\n");

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": ticket.ticketId,
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: ticket.replyEmail,
      subject: `Store OS 支援單 ${ticketId}`,
      text: body,
    }),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Resend email failed with HTTP ${response.status}`);
  return "sent";
}
