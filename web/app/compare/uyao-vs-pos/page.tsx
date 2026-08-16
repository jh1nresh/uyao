import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES } from "@/lib/aeo";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";

/**
 * 比較頁（spec §4D）：主要意圖「藥局 POS 庫存差異」「獨立藥局管理系統」
 * 「藥局 AI」。Required distinction：POS 記錄交易與申報；uYao 連接庫存、
 * 效期、附近需求與後續工作；藥師保留批准。不貶低、不宣稱取代 POS。
 */

const PAGE = AEO_PAGES.uyaoVsPos;
const {
  dateModified: UPDATED,
  question: TITLE,
  directAnswer: DESCRIPTION,
} = PAGE;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: PAGE.path },
    robots: await indexablePageRobots(),
  };
}

const ROLES = [
  {
    who: "POS／健保申報系統",
    job: "記錄交易與申報",
    detail: "銷售、庫存帳、健保申報——這是藥局的記錄與合規層，每天都在用，也應該繼續用。",
  },
  {
    who: "uYao",
    job: "連接訊號與行動",
    detail: "把批號效期、缺貨與附近需求整理成「該退、該減、該補、該預留」的具體工作，主動送到 Store OS，並記錄實際結果。",
    hot: true,
  },
  {
    who: "藥師",
    job: "保留專業與批准",
    detail: "每個關鍵決策——退不退、補不補、留不留——都由藥師批准、拒絕或修正。uYao 不替藥師做專業判斷。",
  },
];

const DIFF_ROWS = [
  { q: "回答的問題", pos: "昨天賣了什麼、帳對不對", uyao: "接下來該對哪批藥做什麼" },
  { q: "效期資料", pos: "多半是人工維護的欄位", uyao: "從進貨掃描取得批號層級的效期證據" },
  { q: "需求訊號", pos: "已完成的銷售", uyao: "附近搜尋落空、到貨通知與預留（試點驗證中）" },
  { q: "輸出", pos: "報表與帳目", uyao: "待批准的行動與 outcome receipt" },
];

export default function CompareUyaoVsPosPage() {
  return (
    <KnowledgeShell kicker="比較">
      <JsonLd
        nodes={[
          webPageJsonLd({
            name: TITLE,
            description: DESCRIPTION,
            path: PAGE.path,
            dateModified: UPDATED,
          }),
          breadcrumbJsonLd([
            { name: "uYao", path: "/zh-tw" },
            { name: "uYao 與藥局 POS 的差異", path: PAGE.path },
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

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">三個角色的分工</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {ROLES.map((role) => (
              <div
                key={role.who}
                className={`border p-5 ${role.hot ? "border-forest bg-sage" : "border-line bg-paper"}`}
              >
                <div className="num text-[12px] font-semibold tracking-[.06em] text-muted">{role.who}</div>
                <h3 className="mb-2 mt-1.5 text-[17px] font-bold">{role.job}</h3>
                <p className="m-0 text-[14px] leading-[1.8] text-ink-2">{role.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">逐項比較</h2>
          <div className="border border-line bg-paper">
            <div className="hidden border-b border-line sm:grid sm:grid-cols-[9em,1fr,1.15fr]">
              <div className="num border-r border-line bg-surface px-4 py-3 text-[12px] font-medium tracking-[.06em] text-muted" />
              <div className="num border-r border-line bg-surface px-4 py-3 text-[12px] font-medium tracking-[.06em] text-muted">
                POS／申報系統
              </div>
              <div className="num bg-sage px-4 py-3 text-[12px] font-semibold tracking-[.06em] text-forest">
                uYao
              </div>
            </div>
            {DIFF_ROWS.map((row, i) => (
              <div
                key={row.q}
                className={`grid sm:grid-cols-[9em,1fr,1.15fr] ${i < DIFF_ROWS.length - 1 ? "border-b border-line" : ""}`}
              >
                <div className="bg-surface px-4 pb-1 pt-3.5 text-[13.5px] font-bold text-ink sm:border-r sm:border-line sm:py-4">
                  {row.q}
                </div>
                <div className="px-4 pb-2 pt-1 text-[14.5px] leading-[1.75] text-muted sm:border-r sm:border-line sm:py-4">
                  {row.pos}
                </div>
                <div className="bg-green-tint px-4 pb-3.5 pt-1 text-[14.5px] leading-[1.75] text-ink sm:py-4">
                  {row.uyao}
                </div>
              </div>
            ))}
          </div>
          <p className="mb-0 mt-4 max-w-[40em] text-[14px] leading-[1.8] text-muted">
            uYao 不取代 POS、健保申報或藥師判斷；試點也不要求更換既有系統。表中 uYao 端能力的驗證狀態（code/test、prototype、pilot）見
            <Link href="/zh-tw/evidence" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              產品證據頁
            </Link>
            。
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">什麼情況適合看 uYao</h2>
          <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
            如果你的痛點是帳務或申報，優化 POS 就好。如果痛點是「過期藥變報廢成本」「錯過退貨窗口」「不知道附近的人在找什麼」，那是行動層的問題——可以先從
            <Link href="/zh-tw/guides/pharmacy-expiry-management" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              藥品效期管理指南
            </Link>
            開始；若正在評估工具，也可先看
            <Link href="/zh-tw/guides/ai-tools-pharmacy-inventory" className="mx-1 text-forest underline underline-offset-2 hover:text-green">
              藥局庫存 AI 工具選擇指南
            </Link>
            ，或直接申請試點。
          </p>
        </section>

        <p className="num mt-8 text-[13px] text-muted">最後更新：{UPDATED}</p>

        <KnowledgeCta
          title="用一條退貨閉環試試看"
          body="uYao 正在招募獨立藥局一起驗證第一條現場閉環。不用換 POS，不改掃描流程，也不碰病患或處方個資。"
        />
      </article>
    </KnowledgeShell>
  );
}
