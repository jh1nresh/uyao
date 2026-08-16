import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES } from "@/lib/aeo";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";

/**
 * v1 guide（spec §4C）：主要意圖「藥品退貨管理」「藥品退貨期限」。
 * Answer boundary：只講該確認哪些欄位與流程；供應商規則未取得，
 * 不寫固定天數或通則，全篇明示「依供應商、品項與契約而異」。
 */

const PAGE = AEO_PAGES.pharmacyReturnWindow;
const {
  datePublished: PUBLISHED,
  dateModified: UPDATED,
  question: TITLE,
  directAnswer: DESCRIPTION,
} = PAGE;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "藥品退貨前要確認的事：窗口、條件與單據｜uYao 藥局營運指南" },
    description: DESCRIPTION,
    alternates: { canonical: PAGE.path },
    robots: await indexablePageRobots(),
  };
}

const CHECKLIST: { title: string; body: string }[] = [
  {
    title: "退貨窗口與期限",
    body: "這家供應商接受退貨的條件是什麼？常見做法是以「剩餘效期」設門檻，但門檻多少、從哪天起算，各家不同，必須逐家確認並記下來。",
  },
  {
    title: "可退品項與狀態條件",
    body: "是否限原包裝完整、未拆封？冷藏品、管制藥品、特價進貨是否除外？同一供應商不同品項的條件也可能不同。",
  },
  {
    title: "需要的單據與資料",
    body: "多數退貨需要對得上的進貨單據：發票或出貨單、批號、效期、數量。平時就把批號層級的進貨紀錄留好，退貨當下才不用翻箱倒櫃。",
  },
  {
    title: "退款或折讓方式",
    body: "是退現金、折抵下次進貨，還是換貨？入帳時間多久？這決定退貨的實際價值，也影響要不要退。",
  },
  {
    title: "聯絡窗口與通知方式",
    body: "找業務、打客服，還是走系統單？需不需要事先報備？把每家的聯絡方式與流程記在同一個地方，換人接手也能辦。",
  },
  {
    title: "退貨後的追蹤",
    body: "送出退貨不等於退成。追蹤到貨確認與入帳，把「這批最後退成了沒、金額多少」記下來，才知道效期管理有沒有真的省到錢。",
  },
];

export default function ReturnWindowGuidePage() {
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
            { name: "藥品退貨管理", path: PAGE.path },
          ]),
        ]}
      />

      <article>
        <h1 className="editorial-display m-0 text-[clamp(30px,4.2vw,42px)] leading-[1.32] [text-wrap:pretty]">
          {TITLE}
        </h1>

        <p className="mt-6 max-w-[38em] border-l-2 border-green pl-5 text-[17px] font-medium leading-[1.9] text-ink">
          {DESCRIPTION}
        </p>

        <section className="mt-9">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">適用對象與情境</h2>
          <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
            本文寫給台灣獨立藥局的經營者與藥師，情境是「這批藥快到供應商退貨門檻了，該怎麼確認與準備」。本文不是法規意見，也不涉及病患用藥。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">退貨前的確認清單</h2>
          <ol className="m-0 grid max-w-[40em] gap-6 pl-0">
            {CHECKLIST.map((item, i) => (
              <li key={item.title} className="grid list-none grid-cols-[2.4em,1fr] gap-3">
                <span className="num pt-0.5 text-[15px] font-semibold text-oxblood">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="m-0 text-[16.5px] font-bold">{item.title}</h3>
                  <p className="mb-0 mt-1.5 text-[15px] leading-[1.85] text-ink-2">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mb-0 mt-6 max-w-[38em] border border-oxblood/50 bg-oxblood-tint/30 px-5 py-4 text-[14px] leading-[1.8] text-ink">
            <b>實際規則依供應商、品項與契約而異。</b>本文不提供任何固定天數或通用門檻；請以各供應商的正式回覆與契約為準。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">uYao 怎麼處理這件工作</h2>
          <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
            uYao 從進貨掃描自動留下批號與效期紀錄，在接近退貨門檻時於 Store OS 建立工作並用 Web Push 提醒，並把單據需要的批號資料整理好交給藥師決定。退貨規則未確認的品項會明確標示「待確認」，不會假造天數。目前為 prototype 並招募試點中，詳見
            <Link href="/zh-tw/evidence" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              產品證據頁
            </Link>
            。效期分層盤點的做法，見
            <Link href="/zh-tw/guides/pharmacy-expiry-management" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              藥品效期管理指南
            </Link>
            。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">限制與不可做的事</h2>
          <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            <li>本文未經藥師專業審閱，不構成藥事或法規意見</li>
            <li>不代表任何供應商的正式退貨政策；引用前請向供應商確認</li>
            <li>不提供病患退藥、換藥或用藥建議</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">原始來源</h2>
          <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            <li>各供應商契約、出貨單據與正式回覆（各家不同，尚無可公開引用的統一規則）</li>
            <li>
              藥事法第 21 條（超過有效期間或保存期限之藥物屬劣藥，背景脈絡）：
              <a
                href="https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030001"
                rel="noopener"
                className="ml-1 break-all text-forest underline underline-offset-2 hover:text-green"
              >
                全國法規資料庫
              </a>
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
            { label: "適用範圍", value: "台灣獨立藥局對供應商的退貨作業；不含病患退換藥" },
          ]}
        />

        <KnowledgeCta
          title="不想再用便利貼追退貨窗口？"
          body="uYao 正在招募願意一起驗證退貨窗口提醒與 Store OS 決策流程的獨立藥局。試點不要求更換 POS，也不碰病患或處方個資。"
        />
      </article>
    </KnowledgeShell>
  );
}
