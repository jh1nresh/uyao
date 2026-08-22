import { AREAS } from "@/lib/data";
import { pharmaciesPayload, readLocale, PUBLIC_API_VERSION } from "@/lib/public-api";

export const runtime = "nodejs";

/**
 * `GET /api/pharmacies` —— 食藥署與健保署開放資料整理出的公開藥局紀錄。
 *
 * 不輸出負責藥師姓名（站上任何一頁都沒顯示），也不輸出任何庫存或價格。
 * `hoursSource: "nhi"` 代表健保調劑時段而不是營業時間，回應裡明講，
 * 免得被摘要成「這家 24 小時營業」。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = readLocale(url.searchParams.get("locale"));
  const rawArea = url.searchParams.get("area");

  if (rawArea && !AREAS.some((area) => area.slug === rawArea)) {
    return Response.json(
      { error: "unknown_area", area: rawArea, known: AREAS.map((a) => a.slug) },
      { status: 400 },
    );
  }

  const pharmacies = pharmaciesPayload(locale, rawArea ?? undefined);

  return Response.json(
    {
      version: PUBLIC_API_VERSION,
      locale,
      count: pharmacies.length,
      disclaimer:
        "Public pharmacy records from Taiwan open data. Listing does not mean a uYao partnership, an installed device, or available stock. When hoursSource is \"nhi\", the hours are National Health Insurance dispensing hours, not store opening hours.",
      pharmacies,
    },
    {
      headers: {
        "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        "access-control-allow-origin": "*",
      },
    },
  );
}
