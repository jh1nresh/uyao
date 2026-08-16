"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type { StoreReservationSummary } from "@/lib/reservations-store";

import styles from "./ForestView.module.css";

/* 森林檢視:每筆預留單長成一棵樹。金額大 → 樹大;待確認 → 橘色;
   取消/缺貨/逾期 → 枯樹;近期完成取貨 → 下雨。時間軸可回看森林成長。 */

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
  /** 由金額決定的成樹大小 (0.72–1.4)。 */
  fullScale: number;
  /** 樹形變化:0 = 針葉樹, 1 = 闊葉樹。 */
  variant: 0 | 1;
}

function Canopy({ kind, variant }: { kind: TreeKind; variant: 0 | 1 }) {
  if (kind === "dead") {
    return (
      <g className={styles.deadWood}>
        <path d="M0 0 V-34" />
        <path d="M0 -14 L-11 -26" />
        <path d="M0 -20 L10 -31" />
        <path d="M0 -27 L-6 -36" />
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
      <g>
        <path className={styles.trunk} d="M-2 0 H2 V-12 H-2 Z" />
        <g className={canopyClass}>
          <path d="M0 -52 L14 -30 H-14 Z" />
          <path d="M0 -42 L17 -18 H-17 Z" />
          <path d="M0 -32 L20 -6 H-20 Z" />
        </g>
      </g>
    );
  }
  return (
    <g>
      <path className={styles.trunk} d="M-2.4 0 H2.4 V-16 H-2.4 Z" />
      <g className={canopyClass}>
        <circle cx="-9" cy="-22" r="11" />
        <circle cx="9" cy="-24" r="12" />
        <circle cx="0" cy="-34" r="13" />
      </g>
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

  /* now 只在掛載時取一次:時間軸的右端點,不需要 tick。 */
  const now = useMemo(() => Date.now(), []);

  const trees = useMemo<Tree[]>(() => {
    const sorted = [...reservations].sort((a, b) => (
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ));
    const prices = sorted.map((reservation) => reservation.priceTwd);
    const minPrice = Math.min(...prices, Infinity);
    const maxPrice = Math.max(...prices, -Infinity);
    const priceSpan = Math.max(maxPrice - minPrice, 1);
    const width = Math.max(680, sorted.length * 88 + 120);
    const spacing = (width - 140) / Math.max(sorted.length - 1, 1);
    return sorted.map((reservation, index) => {
      const hash = hashCode(reservation.code);
      const priceRatio = (reservation.priceTwd - minPrice) / priceSpan;
      return {
        reservation,
        kind: KIND_BY_STATUS[reservation.status],
        createdMs: new Date(reservation.createdAt).getTime(),
        x: sorted.length === 1
          ? width / 2
          : 70 + index * spacing + ((hash % 29) - 14),
        y: 204 + ((hash >> 5) % 25) - 12,
        fullScale: 1.05 + priceRatio * 0.85,
        variant: ((hash >> 3) % 2) as 0 | 1,
      };
    });
  }, [reservations]);

  const earliest = trees.length > 0 ? trees[0].createdMs : now;
  const viewTime = earliest + ((now - earliest) * timePercent) / 100;
  const atNow = timePercent === 100;

  const visibleTrees = trees
    .filter((tree) => tree.createdMs <= viewTime)
    /* y 大的在前景,後畫 → 正確遮擋。 */
    .sort((a, b) => a.y - b.y);

  const raining = animate && visibleTrees.some(({ reservation }) => (
    reservation.status === "picked_up"
    && viewTime - new Date(reservation.confirmedAt ?? reservation.createdAt).getTime() < RAIN_WINDOW_MS
  ));

  const counts = { alive: 0, warning: 0, dead: 0 };
  for (const tree of visibleTrees) {
    if (tree.kind === "dead") counts.dead += 1;
    else if (tree.kind === "warning") counts.warning += 1;
    else counts.alive += 1;
  }

  const selected = visibleTrees.find((tree) => tree.reservation.code === selectedCode);
  const viewWidth = Math.max(680, trees.length * 88 + 120);

  return (
    <section className={styles.forest} aria-label={english ? "Reservation forest" : "預留森林"}>
      <div className={styles.forestScroll}>
        <svg
          viewBox={`0 0 ${viewWidth} 250`}
          width={viewWidth}
          height={250}
          className={styles.forestCanvas}
          data-raining={raining ? "true" : "false"}
          role="img"
          aria-label={english
            ? `${visibleTrees.length} trees: ${counts.alive} green, ${counts.warning} amber, ${counts.dead} withered`
            : `${visibleTrees.length} 棵樹:綠樹 ${counts.alive}、橘樹 ${counts.warning}、枯樹 ${counts.dead}`}
        >
          <ellipse className={styles.ground} cx={viewWidth / 2} cy={252} rx={viewWidth / 2 + 80} ry={52} />
          {visibleTrees.map((tree) => {
            const age = viewTime - tree.createdMs;
            const growth = 0.45 + Math.min(age / GROWTH_WINDOW_MS, 1) * 0.55;
            const isSelected = tree.reservation.code === selectedCode;
            return (
              <g
                key={tree.reservation.code}
                className={`${styles.tree} ${tree.kind === "warning" && animate ? styles.treePulse : ""} ${isSelected ? styles.treeSelected : ""}`}
                transform={`translate(${tree.x} ${tree.y}) scale(${(tree.fullScale * growth).toFixed(3)})`}
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
                <ellipse className={styles.treeShadow} cx="0" cy="2" rx="16" ry="4" />
                <Canopy kind={tree.kind} variant={tree.variant} />
              </g>
            );
          })}
          {raining && (
            <g className={styles.rain} aria-hidden="true">
              {Array.from({ length: Math.min(26, Math.ceil(viewWidth / 34)) }, (_, index) => (
                <line
                  key={index}
                  x1={20 + index * 34 + ((index * 7919) % 23)}
                  y1={-20}
                  x2={14 + index * 34 + ((index * 7919) % 23)}
                  y2={0}
                  style={{ animationDelay: `${(index % 7) * 0.19}s` }}
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span><i data-kind="healthy" />{english ? "Growing / picked up" : "成長中/已取貨"}</span>
        <span><i data-kind="warning" />{english ? "Waiting for you" : "等你確認"}</span>
        <span><i data-kind="dead" />{english ? "Withered (lost)" : "枯萎(流失)"}</span>
        <span><i data-kind="rain" />{english ? "Rain = recent pickup" : "下雨 = 最近有完成取貨"}</span>
      </div>

      {trees.length > 1 && (
        <div className={styles.timeline}>
          <label htmlFor="forest-timeline">{english ? "Look back" : "回看"}</label>
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

      {selected && (
        <article className={styles.treeDetail}>
          <header>
            <span className={styles.detailCode}>{selected.reservation.code}</span>
            <span data-status={selected.reservation.status}>{statusLabels[selected.reservation.status]}</span>
            <button type="button" onClick={() => setSelectedCode("")} aria-label={english ? "Close details" : "關閉明細"}>×</button>
          </header>
          <h3>{selected.reservation.drugName}</h3>
          <p>
            {selected.reservation.drugSpec} · NT$ {selected.reservation.priceTwd}
            {" · "}
            {taipeiDayTime(selected.createdMs)}
          </p>
        </article>
      )}
    </section>
  );
}
