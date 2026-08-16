"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type { StoreReservationSummary } from "@/lib/reservations-store";

import styles from "./ForestView.module.css";

type TreeKind = "healthy" | "thriving" | "warning" | "dead";

const KIND_BY_STATUS: Record<StoreReservationSummary["status"], TreeKind> = {
  pending_store_confirm: "warning",
  confirmed: "healthy",
  picked_up: "thriving",
  rejected_no_stock: "dead",
  cancelled_by_user: "dead",
  expired: "dead",
};

const RAIN_WINDOW_MS = 72 * 60 * 60 * 1000;
const GROWTH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PLOT_ORIGIN = { x: 125, y: 94 };
const PLOT_U = { x: 560, y: 174 };
const PLOT_V = { x: -120, y: 140 };
const FEATURED_POSITIONS = [
  { u: 0.18, v: 0.24 },
  { u: 0.64, v: 0.20 },
  { u: 0.76, v: 0.71 },
  { u: 0.25, v: 0.74 },
];

function hashCode(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function taipeiDayTime(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => (
    parts.find((part) => part.type === type)?.value ?? ""
  );
  return `${value("month")}/${value("day")} ${value("hour")}:${value("minute")}`;
}

interface Tree {
  reservation: StoreReservationSummary;
  kind: TreeKind;
  createdMs: number;
  x: number;
  y: number;
  fullScale: number;
  variant: 0 | 1;
}

function treePosition(index: number, count: number, hash: number) {
  if (count <= FEATURED_POSITIONS.length) {
    const position = FEATURED_POSITIONS[index];
    return {
      u: position.u + ((hash % 9) - 4) * 0.002,
      v: position.v + (((hash >> 4) % 9) - 4) * 0.002,
    };
  }

  const columns = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(count * 1.65))));
  const rows = Math.ceil(count / columns);
  const row = Math.floor(index / columns);
  const itemsInRow = Math.min(columns, count - row * columns);
  const column = index % columns;
  const centeredColumn = column + (columns - itemsInRow) / 2;
  return {
    u: (centeredColumn + 1) / (columns + 1) + ((hash % 7) - 3) * 0.002,
    v: (row + 1) / (rows + 1) + (((hash >> 4) % 7) - 3) * 0.002,
  };
}

function TreeArtwork({ kind, variant }: { kind: TreeKind; variant: 0 | 1 }) {
  if (kind === "dead") {
    return (
      <g className={styles.deadTree}>
        <ellipse className={styles.treeShadow} cx="8" cy="4" rx="28" ry="8" />
        <path className={styles.deadTrunk} d="M-5 2-2-55H5L7 2Z" />
        <path className={styles.deadBranches} d="M1-19-19-38M0-29 20-48M1-41-10-58M-15-35l-6-13M15-43l8-12" />
      </g>
    );
  }

  const canopyClass = kind === "warning"
    ? styles.canopyWarning
    : kind === "thriving"
      ? styles.canopyThriving
      : styles.canopyHealthy;

  return (
    <g>
      <ellipse className={styles.treeShadow} cx="10" cy="5" rx="33" ry="9" />
      <path className={styles.trunk} d="M-5 2-3-50H5L7 2Z" />
      <path className={styles.trunkLight} d="M0-48H4L5 0H1Z" />
      {variant === 0 ? (
        <g className={canopyClass}>
          <circle className={styles.canopyBack} cx="-19" cy="-58" r="24" />
          <circle className={styles.canopyBack} cx="19" cy="-60" r="25" />
          <circle className={styles.canopyMain} cx="0" cy="-78" r="31" />
          <circle className={styles.canopyFront} cx="5" cy="-61" r="28" />
          <ellipse className={styles.canopyHighlight} cx="-11" cy="-84" rx="8" ry="6" />
          <circle className={styles.canopySpark} cx="9" cy="-89" r="3" />
        </g>
      ) : (
        <g className={canopyClass}>
          <path className={styles.canopyBack} d="M0-112 25-75H13l28 38H-41l28-38h-12Z" />
          <path className={styles.canopyMain} d="M0-104 18-78H7l25 34H-32l24-34h-10Z" />
          <path className={styles.canopyFront} d="M0-82 28-43H-28Z" />
          <path className={styles.canopyHighlight} d="m-8-91 7-10 5 7-7 11Z" />
        </g>
      )}
    </g>
  );
}

export function ForestView({
  reservations,
  animate,
  locale,
  statusLabels,
}: {
  reservations: StoreReservationSummary[];
  animate: boolean;
  locale: Locale;
  statusLabels: Record<StoreReservationSummary["status"], string>;
}) {
  const english = locale === "en";
  const [timePercent, setTimePercent] = useState(100);
  const [selectedCode, setSelectedCode] = useState("");
  const now = useMemo(() => Date.now(), []);

  const trees = useMemo<Tree[]>(() => {
    const sorted = [...reservations].sort((a, b) => (
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ));
    const prices = sorted.map((reservation) => reservation.priceTwd);
    const minPrice = Math.min(...prices, Infinity);
    const maxPrice = Math.max(...prices, -Infinity);
    const priceSpan = Math.max(maxPrice - minPrice, 1);
    const densityScale = Math.max(0.58, Math.min(1, 10 / Math.max(sorted.length, 10)));

    return sorted.map((reservation, index) => {
      const hash = hashCode(reservation.code);
      const position = treePosition(index, sorted.length, hash);
      const priceRatio = (reservation.priceTwd - minPrice) / priceSpan;
      return {
        reservation,
        kind: KIND_BY_STATUS[reservation.status],
        createdMs: new Date(reservation.createdAt).getTime(),
        x: PLOT_ORIGIN.x + position.u * PLOT_U.x + position.v * PLOT_V.x,
        y: PLOT_ORIGIN.y + position.u * PLOT_U.y + position.v * PLOT_V.y,
        fullScale: (0.92 + priceRatio * 0.43) * densityScale,
        variant: ((hash >> 3) % 2) as 0 | 1,
      };
    });
  }, [reservations]);

  const earliest = trees.length > 0 ? trees[0].createdMs : now;
  const viewTime = earliest + ((now - earliest) * timePercent) / 100;
  const atNow = timePercent === 100;
  const visibleTrees = trees
    .filter((tree) => tree.createdMs <= viewTime)
    .sort((a, b) => a.y - b.y);
  const raining = animate && visibleTrees.some(({ reservation }) => {
    if (reservation.status !== "picked_up") return false;
    const pickupTime = new Date(reservation.confirmedAt ?? reservation.createdAt).getTime();
    return viewTime >= pickupTime && viewTime - pickupTime < RAIN_WINDOW_MS;
  });
  const counts = { alive: 0, warning: 0, dead: 0 };
  for (const tree of visibleTrees) {
    if (tree.kind === "dead") counts.dead += 1;
    else if (tree.kind === "warning") counts.warning += 1;
    else counts.alive += 1;
  }
  const selected = visibleTrees.find((tree) => tree.reservation.code === selectedCode);

  return (
    <section className={styles.forest} aria-label={english ? "Reservation forest" : "預留森林"}>
      <div className={styles.forestStage} data-raining={raining ? "true" : "false"}>
        <div className={styles.plotMeta}>
          <span>{english ? "RESERVATION FOREST" : "預留森林"}</span>
          <strong>{visibleTrees.length}</strong>
          <small>
            {english
              ? `${counts.warning} need you · ${counts.dead} lost`
              : `${counts.warning} 棵等你確認 · ${counts.dead} 棵已流失`}
          </small>
        </div>
        <div className={styles.weatherStatus} data-raining={raining ? "true" : "false"}>
          <i aria-hidden="true" />
          {raining
            ? (english ? "Recent pickup · raining" : "剛完成取貨 · 降雨中")
            : (english ? "Forest is quiet" : "森林目前平靜")}
        </div>

        <div className={styles.sceneViewport}>
          <svg
            viewBox="0 0 760 500"
            className={styles.forestCanvas}
            role="img"
            aria-label={english
              ? `${visibleTrees.length} trees: ${counts.alive} green, ${counts.warning} amber, ${counts.dead} withered`
              : `${visibleTrees.length} 棵樹：綠樹 ${counts.alive}、橘樹 ${counts.warning}、枯樹 ${counts.dead}`}
          >
            <defs>
              <linearGradient id="forest-scene-sky" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--forest-sky-start)" />
                <stop offset="1" stopColor="var(--forest-sky-end)" />
              </linearGradient>
              <linearGradient id="forest-grass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--forest-grass-light)" />
                <stop offset="1" stopColor="var(--forest-grass-dark)" />
              </linearGradient>
              <clipPath id="forest-platform-clip">
                <path d="M125 94 685 268 565 408 5 234Z" />
              </clipPath>
              <filter id="forest-platform-shadow" x="-20%" y="-20%" width="150%" height="170%">
                <feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="var(--forest-platform-shadow)" />
              </filter>
              <filter id="forest-label-shadow" x="-30%" y="-30%" width="160%" height="170%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="var(--forest-label-shadow)" />
              </filter>
            </defs>

            <rect width="760" height="500" fill="url(#forest-scene-sky)" />
            <circle className={styles.sceneGlow} cx="105" cy="100" r="160" />
            <circle className={styles.sceneParticle} cx="690" cy="86" r="2.5" />
            <circle className={styles.sceneParticle} cx="58" cy="324" r="2" />
            <circle className={styles.sceneParticle} cx="625" cy="380" r="1.8" />

            <g filter="url(#forest-platform-shadow)">
              <path className={styles.platformFront} d="M5 234 565 408v22L5 256Z" />
              <path className={styles.platformSide} d="m685 268-120 140v22l120-140Z" />
              <path className={styles.platformTop} d="M125 94 685 268 565 408 5 234Z" />
            </g>

            <g className={styles.plotGrid} clipPath="url(#forest-platform-clip)" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => {
                const amount = (index + 1) / 9;
                const x = PLOT_ORIGIN.x + amount * PLOT_U.x;
                const y = PLOT_ORIGIN.y + amount * PLOT_U.y;
                return <path key={`u-${index}`} d={`M${x} ${y}l${PLOT_V.x} ${PLOT_V.y}`} />;
              })}
              {Array.from({ length: 5 }, (_, index) => {
                const amount = (index + 1) / 6;
                const x = PLOT_ORIGIN.x + amount * PLOT_V.x;
                const y = PLOT_ORIGIN.y + amount * PLOT_V.y;
                return <path key={`v-${index}`} d={`M${x} ${y}l${PLOT_U.x} ${PLOT_U.y}`} />;
              })}
            </g>

            <g className={styles.groundDetails} aria-hidden="true">
              <ellipse cx="125" cy="265" rx="6" ry="3" />
              <ellipse cx="340" cy="177" rx="4" ry="2" />
              <ellipse cx="610" cy="306" rx="5" ry="2.5" />
              <path d="m92 265-3-10m3 10 5-8m-5 8-8-5M535 344l-2-11m2 11 6-8m-6 8-8-4M365 294l-2-9m2 9 5-7" />
            </g>

            {raining && (
              <g className={styles.rain} aria-hidden="true">
                {Array.from({ length: 24 }, (_, index) => (
                  <line
                    key={index}
                    x1={18 + index * 34}
                    y1={-30 - (index % 6) * 24}
                    x2={7 + index * 34}
                    y2={-2 - (index % 6) * 24}
                    style={{ animationDelay: `${(index % 7) * 0.17}s` }}
                  />
                ))}
              </g>
            )}

            {visibleTrees.map((tree) => {
              const age = viewTime - tree.createdMs;
              const growth = 0.45 + Math.min(age / GROWTH_WINDOW_MS, 1) * 0.55;
              const scale = tree.fullScale * growth;
              const isSelected = tree.reservation.code === selectedCode;
              return (
                <g
                  key={tree.reservation.code}
                  className={`${styles.tree} ${tree.kind === "warning" && animate ? styles.treePulse : ""} ${isSelected ? styles.treeSelected : ""}`}
                  transform={`translate(${tree.x} ${tree.y}) scale(${scale.toFixed(3)})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${tree.reservation.code} · ${tree.reservation.drugName} · ${statusLabels[tree.reservation.status]}`}
                  onClick={() => setSelectedCode(isSelected ? "" : tree.reservation.code)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedCode(isSelected ? "" : tree.reservation.code);
                    }
                  }}
                >
                  <title>{`${tree.reservation.code} · ${tree.reservation.drugName} · NT$ ${tree.reservation.priceTwd} · ${statusLabels[tree.reservation.status]}`}</title>
                  <ellipse className={styles.focusRing} cx="0" cy="3" rx="40" ry="13" />
                  <TreeArtwork kind={tree.kind} variant={tree.variant} />
                </g>
              );
            })}

            {visibleTrees.map((tree) => {
              const age = viewTime - tree.createdMs;
              const growth = 0.45 + Math.min(age / GROWTH_WINDOW_MS, 1) * 0.55;
              const scale = tree.fullScale * growth;
              const labelY = tree.y - (tree.variant === 1 ? 130 : 112) * scale;
              return (
                <g key={`${tree.reservation.code}-label`} className={styles.treeLabel} transform={`translate(${tree.x} ${labelY})`}>
                  <line y1="12" y2={tree.y - 72 * scale - labelY} />
                  <rect x="-52" y="-29" width="104" height="42" rx="8" />
                  <text className={styles.labelCode} y="-14">{tree.reservation.code} · {statusLabels[tree.reservation.status]}</text>
                  <text className={styles.labelValue} y="2">NT$ {tree.reservation.priceTwd}</text>
                </g>
              );
            })}

          </svg>
        </div>

        {selected && (
          <article className={styles.treeDetail}>
            <header>
              <span className={styles.detailCode}>{selected.reservation.code}</span>
              <span data-status={selected.reservation.status}>{statusLabels[selected.reservation.status]}</span>
              <button type="button" onClick={() => setSelectedCode("")} aria-label={english ? "Close details" : "關閉明細"}>×</button>
            </header>
            <h3>{selected.reservation.drugName}</h3>
            <p>{selected.reservation.drugSpec} · NT$ {selected.reservation.priceTwd}</p>
            <time>{taipeiDayTime(selected.createdMs)}</time>
          </article>
        )}

        <div className={styles.legend} aria-hidden="true">
          <span><i data-kind="healthy" />{english ? "Growing" : "成長中"}</span>
          <span><i data-kind="warning" />{english ? "Needs you" : "等你確認"}</span>
          <span><i data-kind="dead" />{english ? "Lost" : "已流失"}</span>
        </div>

        {trees.length > 1 && (
          <div className={styles.timeline}>
            <label htmlFor="forest-timeline">{english ? "Forest history" : "森林時間"}</label>
            <input
              id="forest-timeline"
              type="range"
              min={0}
              max={100}
              value={timePercent}
              onChange={(event) => setTimePercent(Number(event.target.value))}
              aria-valuetext={atNow ? (english ? "Now" : "現在") : taipeiDayTime(viewTime)}
            />
            <span>{atNow ? (english ? "Now" : "現在") : taipeiDayTime(viewTime)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
