import Link from "next/link";

import {
  HOMEPAGE_H1,
  HOMEPAGE_LIMITS,
  HOMEPAGE_LIMITS_HEADING,
  HOMEPAGE_PROSE,
} from "@/lib/agent-public";

/**
 * Server-rendered homepage copy. The interactive landing stays a client
 * island; this block is in the raw HTML so a no-JS agent still sees an H1
 * and more than 500 characters of real sentences.
 */
export function CompanyHomeHonesty() {
  return (
    <article className="border-t border-line bg-paper">
      <div className="mx-auto max-w-[720px] px-5 py-16 sm:px-8 sm:py-20">
        <h1 className="editorial-display m-0 text-[clamp(32px,4vw,44px)] leading-[1.2]">
          {HOMEPAGE_H1}
        </h1>
        {HOMEPAGE_PROSE.split("\n\n").map((paragraph) => (
          <p key={paragraph.slice(0, 24)} className="mt-5 text-[16px] leading-[1.8] text-ink-2">
            {paragraph}
          </p>
        ))}
        <h2 className="editorial-display mb-0 mt-12 text-[28px] leading-[1.3]">
          {HOMEPAGE_LIMITS_HEADING}
        </h2>
        <ul className="mt-4 list-disc pl-5 text-[16px] leading-[1.75] text-ink-2">
          {HOMEPAGE_LIMITS.map((item) => (
            <li key={item} className="mt-2">{item}</li>
          ))}
        </ul>
        <h3 className="mt-10 text-[18px] font-bold text-ink">For agents</h3>
        <p className="mt-3 text-[16px] leading-[1.75] text-ink-2">
          Read <Link href="/about">/about</Link>, <Link href="/contact">/contact</Link>,{" "}
          <Link href="/privacy">/privacy</Link>, <Link href="/docs">/docs</Link>, and{" "}
          <Link href="/llms.txt">/llms.txt</Link>. The public GETs are{" "}
          <Link href="/api/catalog">/api/catalog</Link> and{" "}
          <Link href="/api/pharmacies">/api/pharmacies</Link>. They are not live inventory.
        </p>
      </div>
    </article>
  );
}
