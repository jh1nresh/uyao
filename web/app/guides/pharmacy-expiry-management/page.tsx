import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES } from "@/lib/aeo";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";

/**
 * v1 guide（spec §4B）：主要意圖「藥品效期管理」「藥局過期藥品管理」。
 * 內容契約（spec §5）：H1 問題 → 直接答案 → 適用對象 → 步驟 →
 * uYao 角色 → 限制 → 來源 → 出處欄位 → CTA。只談藥局營運，
 * 不碰病患用藥建議（high-trust red line）。
 */

const PAGE = AEO_PAGES.pharmacyExpiryManagement;
const {
  datePublished: PUBLISHED,
  dateModified: UPDATED,
  question: TITLE,
  directAnswer: DESCRIPTION,
} = PAGE;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "藥品效期管理：從批號記錄到退貨窗口｜uYao 藥局營運指南" },
    description: DESCRIPTION,
    alternates: { canonical: PAGE.path },
    robots: await indexablePageRobots(),
  };
}

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "進貨當下記錄批號與效期",
    body: "效期管理的最小單位是「批號」，不是品項。同一個藥不同批的效期可能差很多；進貨掃描或登錄時就把批號、效期記成清單，之後才有辦法分批處理。",
  },
  {
    title: "用「剩餘效期」而不是「到期日」檢視",
    body: "把庫存依剩餘天數分層（例如 180 天內、90 天內；實際門檻應依各供應商退貨規則調整），每次盤點先看最上層，而不是等到期才發現。",
  },
  {
    title: "對照各供應商的退貨規則與窗口",
    body: (
      <>
        多數供應商對可退貨的剩餘效期有門檻，且各家不同。哪些欄位要先確認，見
        <Link href="/zh-tw/guides/pharmacy-return-window" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
          藥品退貨前要確認的事
        </Link>
        。
      </>
    ),
  },
  {
    title: "在窗口關閉前決定行動",
    body: "對每一批快到期品項做一個明確決定：辦退貨、下次減量進貨、加速流動（調劑優先出這批），或確認只能報廢。不做決定本身就是最貴的決定。",
  },
  {
    title: "記錄每批的實際結果",
    body: "退成了多少、避免了多少報廢、哪些品項反覆出事——這些紀錄會回頭修正進貨量與盤點頻率，讓下一輪更準。",
  },
];

export default function ExpiryGuidePage() {
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
            { name: "藥品效期管理", path: PAGE.path },
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
            本文寫給台灣獨立藥局的經營者與藥師，處理的是「店內庫存的效期與報廢成本」這件營運工作。本文<b className="text-ink">不是</b>病患用藥指導，也不涉及個別藥品的使用建議。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">實際步驟</h2>
          <ol className="m-0 grid max-w-[40em] gap-6 pl-0">
            {STEPS.map((step, i) => (
              <li key={step.title} className="grid list-none grid-cols-[2.4em,1fr] gap-3">
                <span className="num pt-0.5 text-[15px] font-semibold text-oxblood">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="m-0 text-[16.5px] font-bold">{step.title}</h3>
                  <p className="mb-0 mt-1.5 text-[15px] leading-[1.85] text-ink-2">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">uYao 怎麼處理這件工作</h2>
          <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
            uYao 把一個小盒子串在藥局現有的條碼掃描器上，進貨照掃，批號與效期自動記錄；接近退貨窗口時在 Store OS 建立工作並用 Web Push 提醒，藥師只需批准、拒絕或修正，最後記下每批的實際結果。目前為 prototype 並招募試點中——實際做到哪裡、還沒做到哪裡，見
            <Link href="/zh-tw/evidence" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              產品證據頁
            </Link>
            。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">限制與不可做的事</h2>
          <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            <li>供應商退貨規則沒有公開統一標準，本文不提供任何固定天數；實際規則依供應商、品項與契約而異</li>
            <li>本文未經藥師專業審閱，不構成藥事或法規意見</li>
            <li>不提供病患用藥、調劑或藥品選用建議</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">原始來源</h2>
          <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            <li>
              藥事法第 21 條（超過有效期間或保存期限之藥物屬劣藥）：
              <a
                href="https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030001"
                rel="noopener"
                className="ml-1 break-all text-forest underline underline-offset-2 hover:text-green"
              >
                全國法規資料庫
              </a>
            </li>
            <li>各供應商退貨規則：依供應商契約與出貨單據為準，尚未取得可公開引用的統一版本</li>
          </ul>
        </section>

        <ProvenanceBox
          fields={[
            { label: "作者", value: "uYao 團隊" },
            { label: "專業背景", value: "藥局營運工作流研究與軟體產品開發（非藥師）" },
            { label: "醫療專業審閱", value: <b className="text-oxblood">未經藥師專業審閱</b> },
            { label: "發布日期", value: PUBLISHED },
            { label: "最後更新", value: UPDATED },
            { label: "適用範圍", value: "台灣獨立藥局的庫存效期營運；不含病患用藥建議" },
          ]}
        />

        <KnowledgeCta
          title="想在退貨窗口關閉前收到提醒？"
          body="uYao 正在招募願意一起驗證掃描流程與退貨窗口提醒的獨立藥局。試點不要求更換 POS，也不碰病患或處方個資。"
        />
      </article>
    </KnowledgeShell>
  );
}
