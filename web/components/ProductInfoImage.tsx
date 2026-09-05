import Image from "next/image";
import type { ProductInfoPanel } from "@/lib/product-info-content";
import styles from "./ProductDetail.module.css";

export function ProductInfoImage({ image, english }: {
  image: { src: string; width: number; height: number; content: ProductInfoPanel };
  english: boolean;
}) {
  const panel = image.content;
  return (
    <div>
      <a href={image.src} target="_blank" rel="noreferrer" className={styles.infoImage} aria-label={`${panel.name} — ${panel.title} · ${english ? "Open full-size image" : "開啟完整圖片"}`}>
        <Image src={image.src} width={image.width} height={image.height} alt={`${panel.name} — ${panel.title}`} unoptimized />
        <span>{english ? "Open full-size image ↗" : "點圖放大查看 ↗"}</span>
      </a>
      <details className={styles.transcript}>
        <summary>{english ? "Read image text" : "閱讀圖片文字"}</summary>
        <p>{panel.subtitle}</p>
        {panel.sections.map((section) => <div key={section.title}>
          <h3>{section.title}</h3>
          <dl>{section.rows.map((row, i) => <div key={i}><dt>{row.name}</dt>{row.value && <dd>{row.value}</dd>}</div>)}</dl>
        </div>)}
        {panel.notes.map((note) => <p key={note}>{note}</p>)}
      </details>
    </div>
  );
}
