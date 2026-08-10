const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const DEFAULT_PILOT_EMAIL_TO = "edwardhsieh0122@gmail.com";
const EMAIL_TIMEOUT_MS = 4000;

export interface PilotApplication {
  name: string;
  area: string;
  contact: string;
  problems: string[];
  createdAt: string;
}

export type PilotEmailResult = "sent" | "not_configured";

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** 每份申請寄一封純文字通知；缺憑證時明確回報，不把資料送到未知服務。 */
export async function sendPilotApplicationEmail(
  application: PilotApplication,
): Promise<PilotEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PILOT_EMAIL_FROM?.trim();
  if (!apiKey || !from) return "not_configured";

  const to = process.env.PILOT_EMAIL_TO?.trim() || DEFAULT_PILOT_EMAIL_TO;
  const subjectName = oneLine(application.name) || "未命名藥局";
  const body = [
    "新的藥局試點申請",
    "",
    `藥局：${application.name}`,
    `區域：${application.area || "未填"}`,
    `聯絡方式：${application.contact}`,
    `問題：${application.problems.length > 0 ? application.problems.join("、") : "未填"}`,
    `送出時間：${application.createdAt}`,
  ].join("\n");

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `藥局試點申請：${subjectName}`,
      text: body,
    }),
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with HTTP ${response.status}`);
  }

  return "sent";
}
