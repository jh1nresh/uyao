"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

import type { MapAnnotation } from "./StoreMap";
import { formatPrice } from "@/lib/format";
import type { LatLng } from "@/lib/geo";
import type { Store } from "@/lib/types";

/**
 * 圖磚預設用 CARTO Positron（灰階）。
 *
 * 不用標準 OSM 圖磚是設計決定：那套有綠公園、黃道路、藍水域，會把
 * 我們唯一的綠 accent 淹掉，庫存徽章的綠就不再是「放心去」的訊號。
 * 灰階底圖讓圖釘是畫面上唯一的顏色。
 *
 * 換供應商只要改這兩個環境變數 —— CARTO 免費額度要求標示出處，
 * 正式上線流量大時要申請帳號或換 MapTiler / Stadia。
 */
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** 藥局圖釘。用 divIcon 而不是 Leaflet 預設的藍色 PNG，才守得住設計系統。 */
function storeIcon(dim: boolean, label: string | null): L.DivIcon {
  const dot = `<span style="display:block;width:11px;height:11px;border-radius:50%;border:2px solid #fff;background:${
    dim ? "#8A968D" : "#0B7A3E"
  };box-shadow:0 0 0 1px rgba(26,36,32,.18)"></span>`;
  const text = label
    ? `<span style="position:absolute;left:15px;top:-3px;white-space:nowrap;border:1px solid #C2CCC5;background:#fff;padding:1px 5px;font:500 10.5px 'Noto Sans TC',sans-serif;color:${
        dim ? "#5C6B62" : "#1A2420"
      }">${escapeHtml(label)}</span>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative">${dot}${text}</div>`,
    iconSize: [11, 11],
    iconAnchor: [5, 5],
  });
}

const USER_ICON_HTML =
  '<div style="position:relative">' +
  '<span style="display:block;width:12px;height:12px;border-radius:50%;border:2px solid #fff;background:#1A2420;box-shadow:0 0 0 1px rgba(26,36,32,.25)"></span>' +
  "<span style=\"position:absolute;left:-8px;top:14px;white-space:nowrap;font:500 10.5px 'Noto Sans TC',sans-serif;color:#1A2420\">你在這</span>" +
  "</div>";

export default function TileMap({
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
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // 地圖本身只建一次。
  //
  // 之前把 stores 放進這個 effect 的依賴，而上層每次 render 都會產生新的
  // 陣列（filter / Object.fromEntries），結果每次 render 都把整張地圖
  // remove 再重建 —— 在 StrictMode 的雙跑下會撞成空白圖（容器在、圖磚與
  // 圖釘都沒了）。圖層更新交給下面第二個 effect。
  useEffect(() => {
    const el = elRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: true,
      // 滾輪縮放會搶走頁面捲動 —— 地圖只是頁面的一段，不是主角
      scrollWheelZoom: false,
      attributionControl: true,
      // 建立當下就要有視野。沒有 center/zoom 的 Leaflet 地圖不會畫任何
      // 圖磚或圖釘 —— 之前把設定視野交給下一個 effect 的 rAF，而 StrictMode
      // 的 cleanup 會把那個 rAF 取消掉，結果是一張永遠空白的地圖。
      center: [25.05, 121.54],
      zoom: 13,
    });
    mapRef.current = map;
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);

    // 動態載入的容器高度可能還沒定案，尺寸不對會讓 fitBounds 縮太遠
    // （實測行動端整個台北盆地都進來了），之後的尺寸變化也要重算。
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // 資料變了只換圖層，不動地圖本身。
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const points: L.LatLngExpression[] = [];
    // 一整個行政區 80+ 家時標籤會疊成一片糊，只留點、點擊看詳情；
    // 藥品頁那種幾家的圖則直接把價格標出來。
    const dense = stores.length > 25;

    for (const s of stores) {
      if (s.lat === null || s.lng === null) continue;
      const note = annotations?.[s.slug];
      const dim = note ? note.badge.tier === "unknown" : false;
      const label = dense ? null : note ? formatPrice(note.priceTwd) : s.name.replace(/藥局$/, "");

      L.marker([s.lat, s.lng], { icon: storeIcon(dim, label), title: s.name, alt: s.name })
        .bindPopup(
          `<div style="font:500 13px 'Noto Sans TC',sans-serif;color:#1A2420">${escapeHtml(s.name)}</div>` +
            `<div style="font:400 11.5px 'Noto Sans TC',sans-serif;color:#5C6B62;margin-top:2px">${escapeHtml(s.address)}</div>` +
            (note
              ? `<div style="font:600 12px 'IBM Plex Mono',monospace;margin-top:4px">${escapeHtml(formatPrice(note.priceTwd))} · ${escapeHtml(note.badge.text)}</div>`
              : "") +
            `<a href="/store/${encodeURIComponent(s.slug)}" style="display:inline-block;margin-top:6px;font:700 12px 'Noto Sans TC',sans-serif;color:#0B7A3E">看這家 →</a>`,
        )
        .addTo(layer);
      points.push([s.lat, s.lng]);
    }

    if (userPosition) {
      L.marker([userPosition.lat, userPosition.lng], {
        icon: L.divIcon({
          className: "",
          html: USER_ICON_HTML,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
        title: "你的位置",
      }).addTo(layer);
      points.push([userPosition.lat, userPosition.lng]);
    }

    const fit = () => {
      if (!mapRef.current || points.length === 0) return;
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 17 });
    };

    // 先同步 fit 一次，正確性不依賴 rAF 有沒有被取消。
    fit();
    // 動態載入的容器高度可能晚一拍才定案，尺寸不對會縮太遠 —— 再校一次。
    const raf = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(raf);
  }, [stores, annotations, userPosition]);

  return (
    <div
      ref={elRef}
      style={{ height }}
      className="w-full border border-line"
      role="application"
      aria-label="藥局位置地圖"
    />
  );
}
