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
const FEATURED_POSITIONS = [
  { x: 0.22, y: 0.30 },
  { x: 0.68, y: 0.25 },
  { x: 0.71, y: 0.71 },
  { x: 0.27, y: 0.72 },
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
      x: position.x + ((hash % 9) - 4) * 0.003,
      y: position.y + (((hash >> 4) % 9) - 4) * 0.003,
    };
  }

  const columns = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(count * 1.7))));
  const rows = Math.ceil(count / columns);
  const row = Math.floor(index / columns);
  const itemsInRow = Math.min(columns, count - row * columns);
  const column = index % columns;
  const centeredColumn = column + (columns - itemsInRow) / 2;
  return {
    x: (centeredColumn + 1) / (columns + 1) + ((hash % 7) - 3) * 0.003,
    y: (row + 1) / (rows + 1) + (((hash >> 4) % 7) - 3) * 0.003,
  };
}

function Canopy({ kind, variant }: { kind: TreeKind; variant: 0 | 1 }) {
  if (kind === "dead") {
    return (
      <g className={styles.deadWood}>
        <circle className={styles.stump} r="12" />
        <circle className={styles.stumpRing} r="6" />
        <path d="M0-11V-25M8-8l17-10M10 2l22 6M6 9l11 19M-5 10l-12 19M-10 3l-23 7M-8-7l-17-13" />
      </g>
    );
  }

  const canopyClass = kind === "warning"
    ? styles.canopyWarning
    : kind === "thriving"
      ? styles.canopyThriving
      : styles.canopyHealthy;

  if (variant === 0) {
    return (
      <g className={canopyClass}>
        <circle className={styles.canopyOuter} r="32" />
        <circle className={styles.canopyLobe} cx="-15" cy="-7" r="18" />
        <circle className={styles.canopyLobe} cx="14" cy="-9" r="19" />
        <circle className={styles.canopyLobe} cx="3" cy="14" r="18" />
        <circle className={styles.canopyCore} r="13" />
        <path className={styles.canopyVein} d="M0-24V20M-22-7 20 12M19-14-18 16" />
      </g>
    );
  }

  return (
    <g className={canopyClass}>
      <path className={styles.canopyOuter} d="m0-35 11 19 21-6-6 21 16 13-21 6-2 22-18-13-17 14-3-22-22-5 16-15-8-20 22 4Z" />
      <circle className={styles.canopyCore} r="14" />
      <path className={styles.canopyVein} d="M0-27V27M-26 0h52M-19-19l38 38M19-19l-38 38" />
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
    const densityScale = Math.max(0.6, Math.min(1, 10 / Math.max(sorted.length, 10)));

    return sorted.map((reservation, index) => {
      const hash = hashCode(reservation.code);
      const position = treePosition(index, sorted.length, hash);
      const priceRatio = (reservation.priceTwd - minPrice) / priceSpan;
      return {
        reservation,
        kind: KIND_BY_STATUS[reservation.status],
        createdMs: new Date(reservation.createdAt).getTime(),
        x: 84 + position.x * 552,
        y: 65 + position.y * 250,
        fullScale: (0.8 + priceRatio * 0.48) * densityScale,
        variant: ((hash >> 3) % 2) as 0 | 1,
      };
    });
  }, [reservations]);

  const earliest = trees.length > 0 ? trees[0].createdMs : now;
  const viewTime = earliest + ((now - earliest) * timePercent) / 100;
  const atNow = timePercent === 100;
  const visibleTrees = trees.filter((tree) => tree.createdMs <= viewTime);
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
          <span>{english ? "LIVE RESERVATION PLOT" : "即時預留林地"}</span>
          <strong>{visibleTrees.length} {english ? "trees" : "棵樹"}</strong>
        </div>
        <div className={styles.weatherStatus} data-raining={raining ? "true" : "false"}>
          <i aria-hidden="true" />
          {raining
            ? (english ? "Recent pickup · rain" : "剛完成取貨 · 降雨中")
            : (english ? "No recent pickup · quiet" : "目前沒有新取貨 · 平靜")}
        </div>

        <svg
          viewBox="0 0 720 380"
          className={styles.forestCanvas}
          role="img"
          aria-label={english
            ? `${visibleTrees.length} trees: ${counts.alive} green, ${counts.warning} amber, ${counts.dead} withered`
            : `${visibleTrees.length} 棵樹：綠樹 ${counts.alive}、橘樹 ${counts.warning}、枯樹 ${counts.dead}`}
        >
          <defs>
            <clipPath id="forest-plot-clip">
              <path d="M72 55 648 72 625 329 52 310Z" />
            </clipPath>
          </defs>

          <path className={styles.plotGround} d="M72 55 648 72 625 329 52 310Z" />
          <g className={styles.plotGrid} clipPath="url(#forest-plot-clip)" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <path key={`column-${index}`} d={`M${74 + index * 50} 48  ${54 + index * 50} 335`} />
            ))}
            {Array.from({ length: 6 }, (_, index) => (
              <path key={`row-${index}`} d={`M44 ${76 + index * 44} 655 ${94 + index * 44}`} />
            ))}
          </g>
          <g className={styles.contours} clipPath="url(#forest-plot-clip)" aria-hidden="true">
            <path d="M-5 139c93-68 184 24 284-28s195-5 267 20 140-17 198-60" />
            <path d="M-8 173c101-72 191 31 290-23s188-4 264 22 140-14 203-59" />
            <path d="M-12 278c90-61 191 20 283-22s192-9 282 22 151-8 213-50" />
          </g>
          <path className={styles.walkingLine} d="M91 267c96-63 184-3 260-52 82-53 149-25 238-91" aria-hidden="true" />

          {visibleTrees.map((tree) => {
            const age = viewTime - tree.createdMs;
            const growth = 0.45 + Math.min(age / GROWTH_WINDOW_MS, 1) * 0.55;
            const scale = tree.fullScale * growth;
            const isSelected = tree.reservation.code === selectedCode;
            return (
              <g
                key={tree.reservation.code}
                className={`${styles.tree} ${tree.kind === "warning" && animate ? styles.treePulse : ""} ${isSelected ? styles.treeSelected : ""}`}
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
                <g transform={`translate(${tree.x} ${tree.y}) scale(${scale.toFixed(3)})`}>
                  <circle className={styles.focusRing} r="42" />
                  <Canopy kind={tree.kind} variant={tree.variant} />
                </g>
                <text className={styles.treeCode} x={tree.x} y={tree.y + 48 * scale}>{tree.reservation.code}</text>
              </g>
            );
          })}

          {raining && (
            <g className={styles.rain} clipPath="url(#forest-plot-clip)" aria-hidden="true">
              {Array.from({ length: 24 }, (_, index) => (
                <line
                  key={index}
                  x1={28 + index * 31}
                  y1={20 - (index % 6) * 27}
                  x2={19 + index * 31}
                  y2={44 - (index % 6) * 27}
                  style={{ animationDelay: `${(index % 7) * 0.17}s` }}
                />
              ))}
            </g>
          )}
        </svg>

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

        <div className={styles.forestControls}>
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
      </div>
    </section>
  );
}
