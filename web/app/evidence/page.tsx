import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeShell } from "@/components/landing/KnowledgeShell";
import { ENTITY_DESCRIPTION, breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";
import { SHOP_URL } from "@/lib/shop";

/**
 * 官方產品事實與 GEO 引用入口（spec §4A）。這頁是 uYao 對外主張的
 * single source of truth：AI assistant 與合作方查證都指到這裡。
 * 誠實紅線：repo/test proof 不寫成市場驗證；沒有簽約試點就寫沒有。
 */

const EVIDENCE_DATE = "2026-08-12";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "uYao 目前做到什麼？產品證據與試點進度" },
    description:
      "uYao 的官方產品事實：目前已在程式與測試中驗證的能力、prototype 範圍、試點進度、已知限制與證據更新日期。",
    alternates: { canonical: "/zh-tw/evidence" },
    robots: await indexablePageRobots(),
  };
}

/** Evidence ladder。狀態詞彙固定（spec §4A），不得升級成市場驗證。 */
const LADDER: { status: string; hot?: boolean; items: string[] }[] = [
  {
    status: "Verified in code/test",
    hot: true,
    items: [
      "GS1 DataMatrix／EAN 條碼解析與批號、效期擷取（自動化測試）",
      "掃描 session 分類與離線暫存（斷線不掉資料）",
      "消費端預留流程與 LINE 通知（自動化測試）",
      "藥局試點申請表單與通知（自動化測試）",
    ],
  },
  {
    status: "Prototype",
    items: [
      "掃描器 connector box：串在現有條碼掃描器與電腦之間，不改店內流程",
      "LINE 退貨／補貨核准卡片與 outcome receipt 流程",
      "Consumer Web 找藥、到貨通知與需求訊號彙總",
    ],
  },
  {
    status: "Example data",
    items: ["網站上示範的批號、退貨建議與附近需求數字，皆為示範資料，非真實藥局紀錄"],
  },
  {
    status: "Pending verification",
    items: [
      "真實藥局現場的完整退貨閉環（掃描 → 提醒 → 藥師批准 → 實際退貨結果）",
      "可驗證的金額結果（避免報廢、成功退貨的實際金額）",
    ],
  },
  {
    status: "Not yet supported",
    items: [
      "即時庫存查詢（消費端顯示的庫存非即時，未接掃描器的資料為模擬）",
      "POS／健保申報系統整合或替代",
      "供應商退貨規則資料庫（各家規則仍需個別確認）",
    ],
  },
];

const NOT_LIST = [
  "不是線上藥局或藥品電商：不做線上交易，實際交付由藥師於門市完成",
  "不是 POS 或健保申報系統，也不取代它們",
  "不是醫療或用藥建議服務",
  "不是宣稱即時掌握所有藥局庫存的找藥平台",
];

export default function EvidencePage() {
  return (
    <KnowledgeShell kicker="產品證據">
      <JsonLd
        nodes={[
          webPageJsonLd({
            name: "uYao 目前做到什麼？產品證據與試點進度",
            description:
              "uYao 的官方產品事實：已驗證能力、prototype 範圍、試點進度、已知限制與證據更新日期。",
            path: "/zh-tw/evidence",
            dateModified: EVIDENCE_DATE,
          }),
          breadcrumbJsonLd([
            { name: "uYao", path: "/zh-tw" },
            { name: "產品證據", path: "/zh-tw/evidence" },
          ]),
        ]}
      />

      <h1 className="editorial-display m-0 text-[clamp(32px,4.5vw,44px)] leading-[1.3] [text-wrap:pretty]">
        uYao 目前做到什麼？
      </h1>
      <p className="num mt-3 text-[13px] font-medium text-muted">
        證據更新日期：{EVIDENCE_DATE}
      </p>

      <section className="mt-10">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">uYao 是什麼</h2>
        <p className="m-0 max-w-[38em] text-[16px] leading-[1.9] text-ink-2">{ENTITY_DESCRIPTION.zh}</p>
        <h3 className="mb-3 mt-7 text-[16px] font-bold">uYao 不是什麼</h3>
        <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
          {NOT_LIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">產品閉環</h2>
        <p className="mb-5 mt-0 max-w-[38em] text-[15px] leading-[1.8] text-ink-2">
          uYao 的核心不是 dashboard，而是一條把訊號變成已完成工作的閉環：
        </p>
        <ol className="m-0 grid max-w-[38em] gap-2.5 pl-5 text-[15px] leading-[1.8] text-ink-2">
          <li>擷取：從現有掃描流程取得品項、批號、效期；從 Consumer Web 取得附近需求</li>
          <li>訊號：整理成退貨窗口、缺貨與積壓等待處理事項</li>
          <li>準備行動：對照可驗證規則，準備退貨、減量、補貨或預留建議</li>
          <li>藥師批准：關鍵決策由藥師在 LINE 批准、拒絕或修正</li>
          <li>執行與結果：記錄實際結果（outcome receipt），回頭修正下一次建議</li>
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-5 mt-0 text-[26px] leading-[1.4]">Evidence ladder</h2>
        <div className="border border-line bg-paper">
          {LADDER.map((tier, i) => (
            <div
              key={tier.status}
              className={`grid sm:grid-cols-[13em,1fr] ${i < LADDER.length - 1 ? "border-b border-line" : ""}`}
            >
              <div
                className={`num px-5 pb-1 pt-4 text-[12.5px] font-semibold tracking-[.04em] sm:border-r sm:border-line sm:py-5 ${
                  tier.hot ? "text-green" : "text-muted"
                }`}
              >
                {tier.status}
              </div>
              <ul className="m-0 grid gap-1.5 px-5 pb-4 pt-1 pl-9 text-[14.5px] leading-[1.75] text-ink-2 sm:py-5">
                {tier.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="partners" className="mt-12 scroll-mt-24">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">已公開合作關係</h2>
        <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
          uYao 已與生技公司<b className="text-ink">維淳有限公司（WeStrong／WE STRONG CO., LTD.）</b>建立合作關係。uYao 負責本站、找藥服務與藥局工作流產品；現階段公開資訊只確認 WeStrong 的公司層級合作夥伴身分，未公開的合作細節不由本站推定。
        </p>
        <p className="mb-0 mt-3 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
          這項合作不代表已有合作藥局、已安裝設備、任何商品已有即時庫存、可透過 uYao 購買，或構成醫療與用藥背書。維淳統一編號為 16816971；可查閱其
          <a href="https://taiwanwestrong.com/info.html" className="ml-1 text-forest underline underline-offset-2 hover:text-green">
            公開網站
          </a>
          。
        </p>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">目前試點進度</h2>
        <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
          目前<b className="text-ink">尚無正式簽約的試點藥局</b>。我們正在雙北四區（大同、林口、新莊、中山）進行現場流程訪談與試點招募。區域聚焦不代表已正式合作、已安裝設備或已有即時庫存。
        </p>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">限制與未知</h2>
        <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
          <li>供應商退貨規則因供應商、品項與契約而異，尚未取得可公開的統一規則</li>
          <li>尚無真實藥局的金額結果；所有節省或成效數字在取得前不會出現在本站</li>
          <li>需求訊號目前來自 prototype 環境，規模與代表性尚待試點驗證</li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">Changelog</h2>
        <p className="num m-0 text-[14px] leading-[1.8] text-ink-2">
          {EVIDENCE_DATE} — 首次發布本頁；evidence ladder 與試點狀態同步至當日 repo 與招募現況。
        </p>
      </section>

      <section className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-8 text-[15px]">
        <Link href="/zh-tw" className="text-forest underline underline-offset-2 hover:text-green">
          公司介紹
        </Link>
        <Link href="/zh-tw/pharmacy" className="text-forest underline underline-offset-2 hover:text-green">
          藥局試點說明與申請
        </Link>
        <a href={`${SHOP_URL.replace(/\/$/, "")}/zh-tw`} className="text-forest underline underline-offset-2 hover:text-green">
          消費者找藥（Consumer Web）
        </a>
        <Link
          href="/zh-tw/compare/uyao-vs-pos"
          className="text-forest underline underline-offset-2 hover:text-green"
        >
          uYao 與 POS 的差異
        </Link>
      </section>
    </KnowledgeShell>
  );
}
