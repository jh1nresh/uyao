import { openApiDocument } from "@/lib/openapi";

export const runtime = "nodejs";

/**
 * `/openapi.json`。與 llms.txt 不同，這份在任何環境都回同一份文件 ——
 * 它描述的是 API 形狀，不是可被引用的內容，preview 上讀到也不會產生
 * 「引用了 preview deployment」的問題。
 *
 * 注意 proxy matcher 排除含「.」的路徑，所以這條 route 不經 locale rewrite。
 */
export function GET() {
  return Response.json(openApiDocument(), {
    headers: {
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "access-control-allow-origin": "*",
    },
  });
}
