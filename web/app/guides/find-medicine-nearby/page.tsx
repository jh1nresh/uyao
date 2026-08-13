import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES } from "@/lib/aeo";
import { SERVICE_AREA_LABEL } from "@/lib/data";
import { articleJsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";
import { SHOP_URL } from "@/lib/shop";

const PAGE = AEO_PAGES.findMedicineNearby;
const {
  datePublished: PUBLISHED,
  dateModified: UPDATED,
  question: TITLE,
  directAnswer: DESCRIPTION,
} = PAGE;

const FAQ = [
  {
    question: TITLE,
    answer: DESCRIPTION,
  },
  {
    question: "uYao 顯示的是即時庫存嗎？",
    answer:
      "目前不是。uYao 會分開標示公開藥局資料、試營運目錄與待藥局確認的供應狀態，不會把收錄店家寫成已有現貨。",
  },
  {
    question: "出發去藥局前還需要確認嗎？",
    answer:
      "需要。品項、數量、價格、預留時間與個人是否適合使用，都應由藥局或藥師確認；前往門市前建議先電話聯絡或等待回覆。",
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "附近藥局怎麼找藥？搜尋、確認與到店步驟｜uYao" },
    description: DESCRIPTION,
    alternates: { canonical: PAGE.path },
    robots: await indexablePageRobots(),
  };
}

export default function FindMedicineNearbyGuidePage() {
  return (
    <KnowledgeShell kicker="找藥指南">
      <JsonLd
        nodes={[
          articleJsonLd({
            headline: TITLE,
            description: DESCRIPTION,
            path: PAGE.path,
            datePublished: PUBLISHED,
            dateModified: UPDATED,
          }),
          faqPageJsonLd([...FAQ]),
          breadcrumbJsonLd([
            { name: "uYao", path: "/zh-tw" },
            { name: TITLE, path: PAGE.path },
          ]),
        ]}
      />

      <article>
        <h1 className="editorial-display m-0 text-[clamp(32px,4.5vw,44px)] leading-[1.3] [text-wrap:pretty]">
          {TITLE}
        </h1>
        <p className="mt-6 max-w-[40em] border-l-2 border-green pl-5 text-[17px] font-medium leading-[1.9] text-ink">
          {DESCRIPTION}
        </p>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[25px] leading-[1.4]">五個步驟</h2>
          <ol className="m-0 grid max-w-[42em] gap-6 pl-0">
            {[
              ["輸入你知道的資訊", "可搜尋商品名、主成分或症狀描述。症狀搜尋只協助縮小方向，不是診斷。"],
              ["選擇地區", `目前首波收錄範圍為${SERVICE_AREA_LABEL}；收錄不代表藥局已與 uYao 合作。`],
              ["查看資料狀態", "分清楚公開藥局資料、試營運品項紀錄與需要藥局確認的供應狀態。"],
              ["留下找藥需求", "找不到時可留下品項與地區需求，讓 uYao 記錄這次搜尋落空。"],
              ["等待藥局確認", "前往門市前，確認品項、數量、領取安排與用藥問題；不要把網站收錄當成現貨保證。"],
            ].map(([title, body], index) => (
              <li key={title} className="grid list-none grid-cols-[2.5em,1fr] gap-3">
                <span className="num pt-0.5 text-[15px] font-semibold text-oxblood">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="m-0 text-[16.5px] font-bold text-ink">{title}</h3>
                  <p className="mb-0 mt-1.5 text-[15px] leading-[1.85] text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-11">
          <h2 className="editorial-display mb-4 mt-0 text-[25px] leading-[1.4]">常見問題</h2>
          <dl className="m-0 grid max-w-[42em] gap-6">
            {FAQ.slice(1).map((item) => (
              <div key={item.question}>
                <dt className="text-[16px] font-bold text-ink">{item.question}</dt>
                <dd className="mb-0 ml-0 mt-2 text-[15px] leading-[1.85] text-ink-2">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-11 border border-forest bg-sage p-7">
          <h2 className="editorial-display m-0 text-[24px] leading-[1.4]">開始搜尋附近藥局</h2>
          <p className="mb-5 mt-2 max-w-[40em] text-[15px] leading-[1.8] text-ink-2">
            搜尋結果是下一步線索，不是即時庫存保證。供應與用藥問題仍由藥局或藥師確認。
          </p>
          <a href={`${SHOP_URL.replace(/\/$/, "")}/zh-tw`} className="action-primary inline-flex px-7 py-3.5 text-[15px]">
            前往 uYao 找藥
          </a>
        </section>

        <section className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-8 text-[15px]">
          <Link href="/zh-tw/guides/medicine-out-of-stock" className="text-forest underline underline-offset-2 hover:text-green">
            藥品缺貨時怎麼處理？
          </Link>
          <Link href="/zh-tw/evidence" className="text-forest underline underline-offset-2 hover:text-green">
            查看產品證據與限制
          </Link>
        </section>

        <ProvenanceBox
          fields={[
            { label: "作者", value: "uYao 團隊" },
            { label: "資料來源", value: "uYao 試營運目錄與公開藥局資料" },
            { label: "醫療專業審閱", value: <b className="text-oxblood">未經藥師專業審閱</b> },
            { label: "發布日期", value: PUBLISHED },
            { label: "最後更新", value: UPDATED },
            { label: "適用範圍", value: "台灣的附近藥局資料搜尋；不代表即時庫存或醫療建議" },
          ]}
        />
      </article>
    </KnowledgeShell>
  );
}
