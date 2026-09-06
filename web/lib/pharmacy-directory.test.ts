import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const HOME_SOURCE = readFileSync(
  join(ROOT, "app", "(consumer)", "app", "page.tsx"),
  "utf8",
);
const GUIDE_SOURCE = readFileSync(
  join(ROOT, "app", "guides", "find-medicine-nearby", "page.tsx"),
  "utf8",
);
const MARQUEE_SOURCE = readFileSync(
  join(ROOT, "components", "landing", "PartnerMarquee.tsx"),
  "utf8",
);

describe("public pharmacy directory", () => {
  it("stays off the homepage and nearby guide", () => {
    expect(HOME_SOURCE).not.toContain("PharmacyDirectoryLinks");
    expect(HOME_SOURCE).not.toContain("目前收錄的 16 家藥局公開資料");
    expect(HOME_SOURCE).toContain("<SearchInput");
    expect(HOME_SOURCE).toContain('resultsPath="/agent"');
    expect(HOME_SOURCE).toContain("<PartnerMarquee");

    expect(GUIDE_SOURCE).not.toContain("PharmacyDirectoryLinks");
    expect(GUIDE_SOURCE).not.toContain("目前收錄的 16 家藥局公開資料");
    expect(GUIDE_SOURCE).toContain("{copy.directAnswer}");
    expect(GUIDE_SOURCE).toContain("content.faq.slice(1)");
    expect(GUIDE_SOURCE).toContain("未經藥師專業審閱");
    expect(GUIDE_SOURCE).toContain("Not reviewed by a licensed pharmacist");

    expect(MARQUEE_SOURCE).not.toContain("/store/");
    expect(MARQUEE_SOURCE).toContain("<span className=\"text-[15px] font-bold");
  });
});
