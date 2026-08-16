import * as kv from "./kv";

const TTL_SECONDS = 24 * 60 * 60;

export interface SupportRequestReceipt {
  ticketId: string;
  status: "processing" | "sent";
}

function key(userId: string, requestId: string): string {
  const user = Buffer.from(userId).toString("base64url");
  return `support:req:${user}:${requestId}`;
}

export async function claimSupportRequest(
  userId: string,
  requestId: string,
  ticketId: string,
): Promise<SupportRequestReceipt | null> {
  const storageKey = key(userId, requestId);
  const claimed = await kv.setIfAbsent(
    storageKey,
    JSON.stringify({ ticketId, status: "processing" }),
    TTL_SECONDS,
  );
  if (claimed) return null;
  const raw = await kv.get(storageKey);
  if (!raw) return { ticketId, status: "processing" };
  try {
    const receipt = JSON.parse(raw) as Partial<SupportRequestReceipt>;
    if (typeof receipt.ticketId === "string" && (receipt.status === "processing" || receipt.status === "sent")) {
      return receipt as SupportRequestReceipt;
    }
  } catch {
    // 壞掉的 receipt 仍視為處理中，避免重複寄信。
  }
  return { ticketId, status: "processing" };
}

export async function completeSupportRequest(
  userId: string,
  requestId: string,
  ticketId: string,
): Promise<void> {
  await kv.set(key(userId, requestId), JSON.stringify({ ticketId, status: "sent" }), TTL_SECONDS);
}
