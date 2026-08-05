import { formatPrice } from "@/lib/format";
import type { StoreRow } from "@/lib/data";

/**
 * 示意地圖 — 正式版接圖資。這裡只證明 list ⇄ map 是同一份資料的兩種讀法。
 */
export function StoreMap({ rows }: { rows: StoreRow[] }) {
  return (
    <div className="crossfade relative h-[340px] overflow-hidden border border-line bg-map-bg">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(#DFE5DE 1px,transparent 1px),linear-gradient(90deg,#DFE5DE 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {rows.map((r) => (
        <div
          key={r.store.slug}
          className="absolute flex items-center gap-1.5"
          style={{ left: `${r.store.mapPos.x}%`, top: `${r.store.mapPos.y}%` }}
        >
          <span
            aria-hidden
            className={`h-3 w-3 rounded-full border-2 border-white ${
              r.badge.tier === "unknown" ? "bg-muted-2" : "bg-green"
            }`}
          />
          <span
            className={`border border-line-strong bg-white px-[7px] py-0.5 text-[11px] font-medium ${
              r.badge.tier === "unknown" ? "text-muted" : "text-ink"
            }`}
          >
            {r.store.name.replace(/藥局$/, "")}{" "}
            <span className="num">{formatPrice(r.priceTwd)}</span>
          </span>
        </div>
      ))}
      <div className="absolute left-1/2 top-[68%] flex flex-col items-center">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-white bg-ink" />
        <span className="mt-1 text-[11px] font-medium text-ink-2">目前位置</span>
      </div>
      <div className="absolute bottom-2.5 right-2.5 border border-line-strong bg-white px-2 py-0.5 text-[10px] text-muted-2">
        地圖示意 — 正式版接圖資
      </div>
    </div>
  );
}
