import { AREAS } from "@/lib/data";
import { pharmaciesPayload, readLocale, PUBLIC_API_VERSION } from "@/lib/public-api";
import {
  jsonError,
  negotiatePublicRead,
  pharmaciesMarkdown,
  publicReadGate,
} from "@/lib/public-read-route";

export const runtime = "nodejs";

/**
 * `GET /api/pharmacies` —— 食藥署與健保署開放資料整理出的公開藥局紀錄。
 *
 * 不輸出負責藥師姓名（站上任何一頁都沒顯示），也不輸出任何庫存或價格。
 * `hoursSource: "nhi"` 代表健保調劑時段而不是營業時間，回應裡明講，
 * 免得被摘要成「這家 24 小時營業」。
 */
export async function GET(request: Request) {
  const gated = await publicReadGate(request);
  if (!gated.ok) return gated.response;

  try {
    const url = new URL(request.url);
    const locale = readLocale(url.searchParams.get("locale"));
    const rawArea = url.searchParams.get("area");

    if (rawArea && !AREAS.some((area) => area.slug === rawArea)) {
      return jsonError("unknown_area", 400, {
        area: rawArea,
        known: AREAS.map((area) => area.slug),
      }, gated.rate);
    }

    const pharmacies = pharmaciesPayload(locale, rawArea ?? undefined);
    return negotiatePublicRead({
      request,
      rate: gated.rate,
      markdownBody: pharmaciesMarkdown(locale, rawArea ?? undefined),
      jsonBody: {
        version: PUBLIC_API_VERSION,
        locale,
        count: pharmacies.length,
        disclaimer:
          "Public pharmacy records from Taiwan open data. Listing does not mean a uYao partnership, an installed device, or available stock. When hoursSource is \"nhi\", the hours are National Health Insurance dispensing hours, not store opening hours.",
        pharmacies,
      },
    });
  } catch {
    return jsonError("pharmacies_unavailable", 500);
  }
}
