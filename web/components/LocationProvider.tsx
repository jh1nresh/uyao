"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { LatLng } from "@/lib/geo";

export type LocationStatus =
  | "idle"
  | "prompting"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout";

interface LocationValue {
  position: LatLng | null;
  status: LocationStatus;
  request: () => void;
  clear: () => void;
}

const Ctx = createContext<LocationValue>({
  position: null,
  status: "idle",
  request: () => {},
  clear: () => {},
});

const STORAGE_KEY = "uyao.position";

/**
 * 定位狀態。**不會自動要權限** —— 一進站就跳系統對話框是敵意設計，
 * 而且瀏覽器會記住使用者的拒絕，之後真的需要時反而要不到。
 *
 * 關鍵限制：`position` 的初始值在伺服器與 client 首次 render 必須一致
 * （都是 null），sessionStorage 只在 mount 後才讀。否則會 hydration
 * mismatch，而且會讓 166 個藥局頁沒辦法靜態產生。
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LatLng;
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          setPosition(parsed);
          setStatus("granted");
        }
      }
    } catch {
      /* 存取不到就當沒定位過，不影響其他功能 */
    }
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(next);
        setStatus("granted");
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* 隱私模式寫不進去也沒關係，這一輪仍然有定位 */
        }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "timeout");
      },
      // 藥局距離不需要公尺級精度，低精度更快也更省電
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const clear = useCallback(() => {
    setPosition(null);
    setStatus("idle");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 同上 */
    }
  }, []);

  return (
    <Ctx.Provider value={{ position, status, request, clear }}>{children}</Ctx.Provider>
  );
}

export function useLocation(): LocationValue {
  return useContext(Ctx);
}
