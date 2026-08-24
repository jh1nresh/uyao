import { STORE_HOMEPAGE_H1, STORE_PUBLIC_PARAGRAPHS } from "@/lib/store-public";

import styles from "./StoreOsPublicContext.module.css";

/** Public context below the full-height login screen; no tenant data appears here. */
export function StoreOsPublicContext() {
  return (
    <section className={styles.context} aria-labelledby="store-os-public-heading">
      <div className={styles.inner}>
        <p className={styles.kicker}>UYAO STORE OS</p>
        <h1 id="store-os-public-heading">{STORE_HOMEPAGE_H1}</h1>
        {STORE_PUBLIC_PARAGRAPHS.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <h2>uYao Developer Resources</h2>
        <ul>
          <li><a href="https://uyaohealth.com/docs">Public API documentation</a></li>
          <li><a href="/openapi.json">OpenAPI 3.1 specification</a></li>
          <li><a href="/api/catalog">Catalog API</a></li>
          <li><a href="/api/pharmacies">Public pharmacy API</a></li>
          <li><a href="/llms.txt">llms.txt agent instructions</a></li>
        </ul>
      </div>
    </section>
  );
}
