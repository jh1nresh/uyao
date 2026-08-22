import { catalogPayload, readLocale, PUBLIC_API_VERSION } from "@/lib/public-api";
import {
  catalogMarkdown,
  jsonError,
  negotiatePublicRead,
  publicReadGate,
} from "@/lib/public-read-route";

export const runtime = "nodejs";

/**
 * `GET /api/catalog` —— 公開唯讀目錄。
 *
 * 回傳的就是品項頁已經公開渲染的欄位，沒有多一個。沒有價格、沒有庫存、
 * 沒有 daysSinceScan：uYao 沒有任何一家藥局的即時庫存，輸出這些會被當成
 * 現貨保證。這條 route 不寫入任何東西，也不吃 body.
 */
export async function GET(request: Request) {
  const gated = await publicReadGate(request);
  if (!gated.ok) return gated.response;

  try {
    const locale = readLocale(new URL(request.url).searchParams.get("locale"));
    const items = catalogPayload(locale);
    return negotiatePublicRead({
      request,
      rate: gated.rate,
      markdownBody: catalogMarkdown(locale),
      jsonBody: {
        version: PUBLIC_API_VERSION,
        locale,
        count: items.length,
        disclaimer:
          "Catalog records provided by partner pharmacies. Not live inventory, not purchasable online, and not a recommendation for any symptom. Supply is confirmed by the pharmacy.",
        items,
      },
    });
  } catch {
    return jsonError("catalog_unavailable", 500, {}, gated.rate);
  }
}
