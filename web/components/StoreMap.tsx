"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import type { LatLng } from "@/lib/geo";
import type { StockBadgeSpec, Store } from "@/lib/types";

/** 有庫存時額外掛在圖釘上的資訊；沒有盒子的藥局就不帶。 */
export interface MapAnnotation {
  priceTwd: number;
  badge: StockBadgeSpec;
}

/**
 * Leaflet 只在使用者切到地圖時才載入 —— 它含 CSS 約 45KB，
 * 不該進共用 bundle 拖累每一個藥局頁的首次載入。
 * `ssr: false` 是必要的：Leaflet 直接碰 window/document。
 */
const TileMap = dynamic(() => import("./TileMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center border border-line bg-surface text-[12px] text-muted-2" style={{ height: 340 }}>
      載入地圖…
    </div>
  ),
});

/**
 * 地圖 —— 真圖磚 + 真經緯度。
 *
 * 吃的是 `Store[]` 而不是庫存列：藥局的位置跟有沒有庫存是兩件事，
 * 綁在一起會讓沒有盒子時整張圖永遠不被渲染。
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
  // 每次 render 都產生新陣列會讓下游 effect 白跑一輪圖層重建
  const located = useMemo(
    () => stores.filter((s) => s.lat !== null && s.lng !== null),
    [stores],
  );

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

  return (
    <div className="relative">
      <TileMap
        stores={located}
        annotations={annotations}
        userPosition={userPosition}
        height={height}
      />
      {located.length < stores.length && (
        <div className="mt-1 text-[10.5px] text-muted-2">
          {stores.length - located.length} 家尚無座標，未顯示在圖上
        </div>
      )}
    </div>
  );
}
