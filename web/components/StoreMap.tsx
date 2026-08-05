import { StockBadge } from "./StockBadge";
import { formatPrice } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import type { StockBadgeSpec, Store } from "@/lib/types";

/** 有庫存時額外掛在圖釘上的資訊；沒有盒子的藥局就不帶。 */
export interface MapAnnotation {
  priceTwd: number;
  badge: StockBadgeSpec;
}

/**
 * 地圖 —— 用真實經緯度把藥局投影到框內。
 *
 * 吃的是 `Store[]` 而不是庫存列 —— 原本掛在 offers 上，導致沒有藥局裝
 * 盒子時整張圖永遠不會被渲染（實質死程式碼）。藥局的位置跟有沒有庫存
 * 是兩件事。
 *
 * 座標來自 Google Places。沒有座標的藥局**不會被畫出來**，而不是擺在
 * 隨便一個位置：圖上的點代表「這家在這裡」，猜一個位置等於騙人。
 */
export function StoreMap({
  stores,
  annotations,
  userPosition = null,
  height = 340,
}: {
  stores: Store[];
  annotations?: Record<string, MapAnnotation>;
  userPosition?: LatLng | null;
  height?: number;
}) {
  const located = stores.filter((s) => s.lat !== null && s.lng !== null);

  if (located.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 border border-line bg-surface px-6 text-center"
        style={{ height }}
      >
        <p className="text-[13px] font-medium text-ink">這一區還沒有藥局座標</p>
        <p className="text-[11.5px] leading-[1.6] text-muted">
          地圖需要每家藥局的經緯度。政府開放資料只有地址，座標要另外向
          Google Places 查詢後才會出現在這裡。
        </p>
      </div>
    );
  }

  // 投影邊界含使用者位置，不然人在框外就看不到自己的點。
  const lats = located.map((s) => s.lat as number);
  const lngs = located.map((s) => s.lng as number);
  if (userPosition) {
    lats.push(userPosition.lat);
    lngs.push(userPosition.lng);
  }
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const spanLat = maxLat - minLat || 0.001;
  const spanLng = maxLng - minLng || 0.001;

  // 密度門檻：一整個行政區（80+ 家）標籤全開會疊成一片糊；
  // 藥品頁那種 5 家的圖則要看得到店名與價格。
  const dense = located.length > 25;

  const project = (lat: number, lng: number) => ({
    // 緯度往北是上，所以 y 要翻轉
    y: 10 + ((maxLat - lat) / spanLat) * 80,
    x: 10 + ((lng - minLng) / spanLng) * 80,
  });

  return (
    <div
      className="crossfade relative overflow-hidden border border-line bg-map-bg"
      style={{ height }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(#DFE5DE 1px,transparent 1px),linear-gradient(90deg,#DFE5DE 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {located.map((s) => {
        const pos = project(s.lat as number, s.lng as number);
        const note = annotations?.[s.slug];
        const dim = note ? note.badge.tier === "unknown" : false;
        return (
          <div
            key={s.slug}
            className="group absolute flex items-center gap-1.5"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: dense ? 1 : undefined }}
          >
            <span
              aria-hidden
              className={`h-2.5 w-2.5 flex-none rounded-full border-2 border-white ${
                dim ? "bg-muted-2" : "bg-green"
              }`}
            />
            <span
              className={`whitespace-nowrap border border-line-strong bg-white px-[6px] py-0.5 text-[10.5px] font-medium ${
                dim ? "text-muted" : "text-ink"
              } ${
                // 一整區 80+ 家時標籤會疊成一片糊 —— 平常只留點，
                // 滑過（或鍵盤 focus）才顯示名字。
                dense
                  ? "pointer-events-none absolute left-4 opacity-0 shadow-sm group-hover:z-10 group-hover:opacity-100"
                  : ""
              }`}
            >
              {s.name.replace(/藥局$/, "")}
              {note && (
                <>
                  {" "}
                  <span className="num">{formatPrice(note.priceTwd)}</span>
                  <StockBadge badge={note.badge} short className="ml-1 text-[10px]" />
                </>
              )}
            </span>
            {dense && <span className="sr-only">{s.name}</span>}
          </div>
        );
      })}

      {userPosition && (
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: `${project(userPosition.lat, userPosition.lng).x}%`,
            top: `${project(userPosition.lat, userPosition.lng).y}%`,
          }}
        >
          <span aria-hidden className="h-3 w-3 rounded-full border-2 border-white bg-ink" />
          <span className="mt-0.5 whitespace-nowrap text-[10.5px] font-medium text-ink">
            你在這
          </span>
        </div>
      )}

      {located.length < stores.length && (
        <div className="absolute bottom-2.5 right-2.5 border border-line-strong bg-white px-2 py-0.5 text-[10px] text-muted-2">
          {stores.length - located.length} 家尚無座標未顯示
        </div>
      )}
    </div>
  );
}
