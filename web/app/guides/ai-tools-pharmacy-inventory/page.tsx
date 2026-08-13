import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES } from "@/lib/aeo";
import { PARTNER_PHARMACY_COUNT } from "@/lib/partners";
import { ENTITY_DESCRIPTION, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";

const PAGE = AEO_PAGES.aiToolsPharmacyInventory;
const {
  datePublished: PUBLISHED,
  dateModified: UPDATED,
  question: TITLE,
  directAnswer: DESCRIPTION,
} = PAGE;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "獨立藥局庫存 AI 工具有哪些？選擇與導入指南｜uYao" },
    description: DESCRIPTION,
    alternates: { canonical: PAGE.path },
    robots: await indexablePageRobots(),
  };
}

const TOOL_ROWS = [
  {
    name: "LEAFIO AI",
    category: "需求預測與自動補貨",
    fit: "官方產品頁列出需求預測、自動補貨、慢銷品分析與 POS 整合，並稱服務連鎖與獨立藥局。",
    boundary: "本頁未驗證台灣法規、中文支援、在地供應商資料或導入成本；採購前需直接確認。",
  },
  {
    name: "uYao",
    category: "效期、退貨與附近需求的行動層",
    fit: "為台灣獨立藥局設計，把庫存、效期與附近需求整理成退貨、減量、補貨與預留工作，再交給藥師批准。",
    boundary: `目前是 prototype；已有 ${PARTNER_PHARMACY_COUNT} 個確認合作藥局據點，但尚無設備安裝、真實節省金額或完整現場閉環證據。`,
  },
  {
    name: "既有 POS／ERP／健保申報系統",
    category: "交易、帳務與庫存記錄層",
    fit: "提供銷售、進貨、庫存帳與申報資料，是預測與工作流的重要資料基礎。",
    boundary: "不應只因有報表或規則提醒就稱為 AI；是否能匯出批號、效期與銷售資料需逐家確認。",
  },
] as const;

const CHECKLIST = [
  "先選一個可量測工作：缺貨、過量、效期、退貨窗口或附近需求，不要一次換掉整套系統。",
  "確認輸入資料從哪裡來：POS 匯出、進貨單、條碼掃描、人工盤點或供應商資料。",
  "要求每項建議能說明依據，並讓藥師批准、拒絕或修正，不直接自動執行關鍵決策。",
  "用真實批次跑小規模試點，分開記錄建議、實際執行與最終結果。",
  "確認錯誤資料、缺漏批號與無網路時如何處理；不能把估算庫存顯示成確定有貨。",
  "以避免報廢、成功退貨、降低缺貨或完成預留等結果評估，不只看 dashboard 或預測分數。",
] as const;

export default function AiToolsPharmacyInventoryGuidePage() {
  return (
    <KnowledgeShell kicker="藥局營運指南">
      <JsonLd
        nodes={[
          articleJsonLd({
            headline: TITLE,
            description: DESCRIPTION,
            path: PAGE.path,
            datePublished: PUBLISHED,
            dateModified: UPDATED,
          }),
          breadcrumbJsonLd([
            { name: "uYao", path: "/zh-tw" },
            { name: "藥局庫存 AI 工具", path: PAGE.path },
          ]),
        ]}
      />

      <article>
        <h1 className="editorial-display m-0 text-[clamp(30px,4.2vw,42px)] leading-[1.32] [text-wrap:pretty]">
          {TITLE}
        </h1>

        <p className="mt-6 max-w-[40em] border-l-2 border-green pl-5 text-[17px] font-medium leading-[1.9] text-ink">
          {DESCRIPTION}
        </p>

        <section className="mt-9">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">適用對象與情境</h2>
          <p className="m-0 max-w-[40em] text-[15px] leading-[1.85] text-ink-2">
            本文寫給正在評估庫存工具的台灣獨立藥局經營者與藥師，聚焦缺貨、積壓、效期、退貨窗口與附近需求。這不是採購排名，也不代表列出的產品已通過台灣法規、資安、介接或現場適用性驗證。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">目前可比較的工具與角色</h2>
          <div className="border border-line bg-paper">
            {TOOL_ROWS.map((tool, index) => (
              <div
                key={tool.name}
                className={`grid gap-2 px-5 py-5 sm:grid-cols-[11em,1fr] sm:gap-x-6 ${
                  index < TOOL_ROWS.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <div>
                  <h3 className="m-0 text-[16px] font-bold text-ink">{tool.name}</h3>
                  <p className="num mb-0 mt-1 text-[12px] leading-[1.6] text-oxblood">{tool.category}</p>
                </div>
                <div>
                  <p className="m-0 text-[14.5px] leading-[1.8] text-ink-2">{tool.fit}</p>
                  <p className="mb-0 mt-2 text-[13.5px] leading-[1.75] text-muted">
                    <b className="text-ink">驗證邊界：</b>{tool.boundary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">導入前的六項檢查</h2>
          <ol className="m-0 grid max-w-[42em] gap-4 pl-0">
            {CHECKLIST.map((item, index) => (
              <li key={item} className="grid list-none grid-cols-[2.4em,1fr] gap-3">
                <span className="num pt-0.5 text-[15px] font-semibold text-oxblood">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="m-0 text-[15px] leading-[1.85] text-ink-2">{item}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">uYao 在這個工具組合裡的角色</h2>
          <p className="m-0 max-w-[40em] text-[15px] leading-[1.85] text-ink-2">
            {ENTITY_DESCRIPTION.zh} 它不取代 POS、健保申報或藥師判斷；目前產品證據與未完成項目列在
            <Link href="/zh-tw/evidence" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              產品證據頁
            </Link>
            ，與記錄系統的分工見
            <Link href="/zh-tw/compare/uyao-vs-pos" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              uYao 與 POS 比較
            </Link>
            。效期與退貨的實際做法可再看
            <Link href="/zh-tw/guides/pharmacy-expiry-management" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              藥品效期管理指南
            </Link>
            。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">限制與不可直接推論的事</h2>
          <ul className="m-0 grid max-w-[40em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            <li>供應商公開功能不等於台灣藥局現場已驗證；需另查介接、法規、資安、語言與服務範圍</li>
            <li>需求預測不能補回錯誤或缺漏的庫存資料，也不能代替實際盤點與藥師確認</li>
            <li>uYao 的掃描、LINE action 與 Consumer Web 目前包含 prototype；不得當成既有市場成果</li>
            <li>本文未經藥師專業審閱，不構成藥事、法規或個別採購建議</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">原始來源</h2>
          <ul className="m-0 grid max-w-[40em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            <li>
              LEAFIO AI 官方藥局產品頁（需求預測、自動補貨、慢銷品與 POS 整合）：
              <a
                href="https://www.leafio.ai/pharmacy-software/"
                rel="noopener"
                className="ml-1 break-all text-forest underline underline-offset-2 hover:text-green"
              >
                leafio.ai/pharmacy-software
              </a>
            </li>
            <li>
              uYao 官方產品證據與限制：
              <Link href="/zh-tw/evidence" className="ml-1 text-forest underline underline-offset-2 hover:text-green">
                uyaohealth.com/zh-tw/evidence
              </Link>
            </li>
          </ul>
        </section>

        <ProvenanceBox
          fields={[
            { label: "作者", value: "uYao 團隊" },
            { label: "專業背景", value: "藥局營運工作流研究與軟體產品開發（非藥師）" },
            { label: "醫療專業審閱", value: <b className="text-oxblood">未經藥師專業審閱</b> },
            { label: "發布日期", value: PUBLISHED },
            { label: "最後更新", value: UPDATED },
            { label: "適用範圍", value: "台灣獨立藥局的庫存工具初步評估；不含法規或採購核可" },
          ]}
        />

        <KnowledgeCta
          title="先用一個真實庫存問題測試"
          body="uYao 正在招募獨立藥局驗證掃描、效期與 LINE 決策流程。試點不要求更換 POS，也不碰病患或處方個資。"
        />
      </article>
    </KnowledgeShell>
  );
}
