import { formatPrice } from "@/lib/format";
import type { StoreRow } from "@/lib/data";

/**
 * 地圖 —— 用真實經緯度把藥局投影到框內。
 *
 * 座標來自 Google Places（跑 `python3 -m pharmabox.places` 補）。還沒補到
 * 座標的藥局**不會被畫出來**，而不是擺在隨便一個位置：地圖上的點代表
 * 「這家在這裡」，猜一個位置等於騙人。
 */
export function StoreMap({ rows }: { rows: StoreRow[] }) {
  const located = rows.filter((r) => r.store.lat !== null && r.store.lng !== null);

  if (located.length === 0) {
    return (
      <div className="flex h-[340px] flex-col items-center justify-center gap-2 border border-line bg-surface px-6 text-center">
        <p className="text-[13px] font-medium text-ink">這一區還沒有藥局座標</p>
        <p className="text-[11.5px] leading-[1.6] text-muted">
          地圖需要每家藥局的經緯度。政府開放資料只有地址，座標要另外向
          Google Places 查詢後才會出現在這裡。
        </p>
      </div>
    );
  }

  // 用這批藥局自身的範圍當投影邊界，留 12% 邊距免得點貼在框上。
  const lats = located.map((r) => r.store.lat as number);
  const lngs = located.map((r) => r.store.lng as number);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const spanLat = maxLat - minLat || 0.001;
  const spanLng = maxLng - minLng || 0.001;

  const project = (lat: number, lng: number) => ({
    // 緯度往北是上，所以 y 要翻轉
    y: 12 + ((maxLat - lat) / spanLat) * 76,
    x: 12 + ((lng - minLng) / spanLng) * 76,
  });

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
      {located.map((r) => {
        const pos = project(r.store.lat as number, r.store.lng as number);
        return (
          <div
            key={r.store.slug}
            className="absolute flex items-center gap-1.5"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <span
              aria-hidden
              className={`h-3 w-3 rounded-full border-2 border-white ${
                r.badge.tier === "unknown" ? "bg-muted-2" : "bg-green"
              }`}
            />
            <span
              className={`whitespace-nowrap border border-line-strong bg-white px-[7px] py-0.5 text-[11px] font-medium ${
                r.badge.tier === "unknown" ? "text-muted" : "text-ink"
              }`}
            >
              {r.store.name.replace(/藥局$/, "")}{" "}
              <span className="num">{formatPrice(r.priceTwd)}</span>
            </span>
          </div>
        );
      })}
      {located.length < rows.length && (
        <div className="absolute bottom-2.5 right-2.5 border border-line-strong bg-white px-2 py-0.5 text-[10px] text-muted-2">
          {rows.length - located.length} 家尚無座標未顯示
        </div>
      )}
    </div>
  );
}
