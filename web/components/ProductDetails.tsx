"use client";

import { useState, type ReactNode } from "react";
import type { ProductInfoPanel } from "@/lib/product-info-content";
import styles from "./ProductDetail.module.css";

export function ProductDetails({ features, facts, english, children }: {
  features?: ProductInfoPanel;
  facts: ProductInfoPanel;
  english: boolean;
  children: ReactNode;
}) {
  const tabs = [
    ...(features ? [{ id: "features", label: english ? "Features" : "產品特色", panel: features }] : []),
    { id: "facts", label: english ? "Ingredients & specs" : "成分規格", panel: facts },
    { id: "source", label: english ? "Sources" : "資料來源", panel: null },
  ];
  const [active, setActive] = useState(tabs[0].id);
  return (
    <div id="product-details" className={styles.details}>
      <div role="tablist" aria-label={english ? "Product details" : "產品資料"} className={styles.tabs}>
        {tabs.map((tab, index) => (
          <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={active === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault();
              setActive(tabs[next].id);
              document.getElementById(`tab-${tabs[next].id}`)?.focus();
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} id={`panel-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`} hidden={active !== tab.id} tabIndex={0} className={styles.detailPanel}>
          {tab.panel ? <>
            <p className={styles.panelAttribution}>{tab.panel.subtitle}</p>
            {tab.panel.sections.map((section) => (
              <section key={section.title} className={styles.factGroup}>
                <h2>{section.title}</h2>
                <dl>{section.rows.slice(0, 3).map((row, index) => <div key={index}><dt>{row.name}</dt>{row.value && <dd>{row.value}</dd>}</div>)}</dl>
                {section.rows.length > 3 && <details><summary>{english ? `Show all ${section.rows.length} entries` : `展開全部 ${section.rows.length} 項`}</summary><dl>{section.rows.slice(3).map((row, index) => <div key={index}><dt>{row.name}</dt>{row.value && <dd>{row.value}</dd>}</div>)}</dl></details>}
              </section>
            ))}
            {tab.panel.notes.length > 0 && <details className={styles.panelNotes}><summary>{english ? "Notes & cautions" : "注意事項"}</summary>{tab.panel.notes.map((note) => <p key={note}>{note}</p>)}</details>}
          </> : children}
        </div>
      ))}
    </div>
  );
}
