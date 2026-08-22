import type { ReactNode } from "react";
import type { Metadata } from "next";

import { KnowledgeShell } from "@/components/landing/KnowledgeShell";
import { TRUST_PAGES, type PublicPagePath } from "@/lib/agent-public";
import { publicReadOpenApiDocument } from "@/lib/openapi";
import { CONTACT_EMAIL, organizationJsonLd, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

type TrustPath = Exclude<PublicPagePath, "/">;

export function trustPageMetadata(path: TrustPath): Metadata {
  const page = TRUST_PAGES[path];
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.canonicalPath },
    robots: { index: false, follow: true },
  };
}

function PacketParagraph({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const pattern = /(\/zh-tw\/evidence|uyao@agentmail\.to)/g;
  let last = 0;
  let match = pattern.exec(text);
  let key = 0;
  while (match) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    nodes.push(
      token.includes("@") ? (
        <a key={key} href={`mailto:${token}`}>{token}</a>
      ) : (
        <a key={key} href={token}>{token}</a>
      ),
    );
    key += 1;
    last = match.index + token.length;
    match = pattern.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <p className="text-[16px] leading-[1.8] text-ink-2">{nodes}</p>;
}

export function TrustPage({ path }: { path: TrustPath }) {
  const page = TRUST_PAGES[path];
  return (
    <>
      <JsonLd
        nodes={[
          organizationJsonLd(),
          webPageJsonLd({
            name: page.title,
            description: page.description,
            path: page.canonicalPath,
            dateModified: "2026-08-22",
            inLanguage: page.locale === "en" ? "en" : "zh-Hant-TW",
          }),
        ]}
      />
      <KnowledgeShell kicker={page.kicker} locale={page.locale}>
        <h1 className="editorial-display mb-6 mt-0 text-[clamp(36px,5vw,52px)] leading-[1.15]">
          {page.title}
        </h1>
        {page.body.split("\n\n").map((paragraph) => (
          <PacketParagraph key={paragraph.slice(0, 32)} text={paragraph} />
        ))}
        {path === "/docs" ? <DocsEndpoints /> : null}
        <p className="mt-10 text-[15px] text-muted">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {" · "}
          <a href="/llms.txt">llms.txt</a>
        </p>
      </KnowledgeShell>
    </>
  );
}

function DocsEndpoints() {
  const spec = publicReadOpenApiDocument();
  return (
    <section className="mt-10 border border-line-strong bg-surface p-6">
      <h2 className="editorial-display m-0 text-[24px]">Public GET endpoints</h2>
      <p className="mt-4 text-[15px] leading-[1.7] text-ink-2">
        These two reads are the public contract. They are not live inventory.
        OpenAPI for just these paths is below; the host also serves the fuller
        {" "}<a href="/openapi.json">/openapi.json</a>, which marks site-form
        POST routes <code>x-internal</code>.
      </p>
      <h3 className="mt-6 text-[16px] font-bold">GET /api/catalog</h3>
      <p className="mt-2 text-[15px] leading-[1.7] text-ink-2">
        Partner-listed catalog records. No price, stock, or availability field.
      </p>
      <pre className="mt-3 overflow-x-auto bg-ivory p-4 text-[13px]">{`curl -sS https://uyaohealth.com/api/catalog`}</pre>
      <h3 className="mt-6 text-[16px] font-bold">GET /api/pharmacies</h3>
      <p className="mt-2 text-[15px] leading-[1.7] text-ink-2">
        Public pharmacy records from Taiwan open data. A listing is not stock.
      </p>
      <pre className="mt-3 overflow-x-auto bg-ivory p-4 text-[13px]">{`curl -sS https://uyaohealth.com/api/pharmacies`}</pre>
      <h2 className="editorial-display mb-0 mt-10 text-[24px]">OpenAPI (these two GETs only)</h2>
      <pre className="mt-4 overflow-x-auto bg-ivory p-4 text-[12px] leading-[1.6]">
        {JSON.stringify(spec, null, 2)}
      </pre>
    </section>
  );
}
