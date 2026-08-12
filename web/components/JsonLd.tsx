import { jsonLdGraph } from "@/lib/seo";

/** 一頁一個 @graph script。node 內容必須與頁面可見 claims 一致（spec §3）。 */
export function JsonLd({ nodes }: { nodes: Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdGraph(nodes) }}
    />
  );
}
