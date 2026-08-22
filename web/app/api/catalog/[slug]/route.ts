import { catalogItem, readLocale, PUBLIC_API_VERSION } from "@/lib/public-api";
import {
  jsonError,
  publicApiHeaders,
  publicApiVersionGate,
} from "@/lib/public-read-route";

export const runtime = "nodejs";

/** `GET /api/catalog/{slug}` —— 單一品項，多帶用量、注意事項與原廠標示。 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const versionError = publicApiVersionGate(request);
  if (versionError) return versionError;

  const { slug } = await params;
  const locale = readLocale(new URL(request.url).searchParams.get("locale"));
  const item = catalogItem(slug, locale);

  if (!item) {
    return jsonError("catalog_item_not_found", 404, { slug });
  }

  return Response.json(
    {
      version: PUBLIC_API_VERSION,
      locale,
      disclaimer:
        "Product details come from the packaging or the partner pharmacy and are reproduced as provided. This is not medical advice, not live inventory, and not purchasable online.",
      item,
    },
    {
      headers: {
        "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        "access-control-allow-origin": "*",
        ...publicApiHeaders(),
      },
    },
  );
}
