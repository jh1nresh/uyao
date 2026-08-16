import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES } from "@/lib/aeo";
import { SERVICE_AREA_LABEL } from "@/lib/data";
import { articleJsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";

const PAGE = AEO_PAGES.joinUyao;
const {
  datePublished: PUBLISHED,
  dateModified: UPDATED,
  question: TITLE,
  directAnswer: DESCRIPTION,
} = PAGE;

const FAQ = [
  { question: TITLE, answer: DESCRIPTION },
  {
    question: "加入 uYao 需要更換 POS 嗎？",
    answer:
      "目前試點不要求更換 POS。uYao 的方向是從既有掃描流程取得必要訊號，再把待處理工作送到 Store OS；實際接法仍需在現場訪談後確認。",
  },
  {
    question: "提交申請就代表成為合作藥局嗎？",
    answer:
      "不是。提交表單只代表提出試點意願；是否進入試點、安裝設備或公開為合作藥局，仍需完成流程確認與雙方同意。",
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: "藥局如何加入 uYao？試點申請與合作流程" },
    description: DESCRIPTION,
    alternates: { canonical: PAGE.path },
    robots: await indexablePageRobots(),
  };
}

export default function JoinUYaoGuidePage() {
  return (
    <KnowledgeShell kicker="藥局合作">
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
          <h2 className="editorial-display mb-5 mt-0 text-[25px] leading-[1.4]">加入流程</h2>
          <ol className="m-0 grid max-w-[42em] gap-6 pl-0">
            {[
              ["確認試點方向", "uYao 聚焦批次與效期紀錄、退貨／補貨待辦，以及附近找藥需求；不是 POS、健保申報或線上藥局。"],
              ["提交基本資料", "提供藥局名稱、所在地區與可聯絡方式，並勾選最常遇到的庫存或效期問題。"],
              ["進行流程訪談", "一起確認現有掃描器、進貨掃描、退貨窗口與 Store OS 通知方式，不先假設每家店的流程相同。"],
              ["確認試點條件", "雙方確認資料範圍、設備接法、責任邊界與成功指標後，才決定是否啟動。"],
              ["小範圍驗證", "先驗證掃描到提醒、藥師批准與結果回寫的閉環，再評估是否擴大。"],
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

        <section className="mt-11 border border-line bg-paper p-6">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">目前試點範圍</h2>
          <p className="m-0 max-w-[40em] text-[15px] leading-[1.85] text-ink-2">
            首波聚焦{SERVICE_AREA_LABEL}的獨立藥局。區域聚焦不代表已有正式合作、已安裝設備或已有即時庫存；提交申請也不等於自動納入試點。
          </p>
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

        <section className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-8 text-[15px]">
          <Link href="/zh-tw/pharmacy" className="text-forest underline underline-offset-2 hover:text-green">
            查看完整試點說明
          </Link>
          <Link href="/zh-tw/evidence" className="text-forest underline underline-offset-2 hover:text-green">
            查看產品證據與目前進度
          </Link>
        </section>

        <ProvenanceBox
          fields={[
            { label: "作者", value: "uYao 團隊" },
            { label: "內容依據", value: "目前公開的試點申請與產品證據" },
            { label: "合作狀態", value: "提交申請不代表正式合作或設備安裝" },
            { label: "發布日期", value: PUBLISHED },
            { label: "最後更新", value: UPDATED },
            { label: "適用範圍", value: "台灣獨立藥局的 uYao 試點申請" },
          ]}
        />

        <KnowledgeCta
          title="想確認你的藥局流程是否適合？"
          body="提交基本資料後，我們會先聊現有掃描、進貨與退貨流程；在雙方確認前，不會把申請寫成正式合作。"
        />
      </article>
    </KnowledgeShell>
  );
}
