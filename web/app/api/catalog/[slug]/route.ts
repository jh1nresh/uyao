import { catalogItem, readLocale, PUBLIC_API_VERSION } from "@/lib/public-api";
import {
  jsonError,
  publicReadGate,
  publicReadHeaders,
} from "@/lib/public-read-route";

export const runtime = "nodejs";

/** `GET /api/catalog/{slug}` —— 單一品項，多帶用量、注意事項與原廠標示。 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const gated = await publicReadGate(request);
  if (!gated.ok) return gated.response;

  const { slug } = await params;
  const locale = readLocale(new URL(request.url).searchParams.get("locale"));
  const item = catalogItem(slug, locale);

  if (!item) {
    return jsonError("catalog_item_not_found", 404, { slug }, gated.rate);
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
        ...publicReadHeaders(gated.rate),
      },
    },
  );
}
