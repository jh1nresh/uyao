import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const landing = readFileSync(
  join(import.meta.dirname, "..", "components", "landing", "AgentLandingExperience.tsx"),
  "utf8",
);
const storeOsCss = readFileSync(
  join(import.meta.dirname, "..", "components", "StoreOsShell.module.css"),
  "utf8",
);
const home = readFileSync(
  join(import.meta.dirname, "..", "app", "(consumer)", "app", "page.tsx"),
  "utf8",
);
const agent = readFileSync(
  join(import.meta.dirname, "..", "components", "CommerceAgent.tsx"),
  "utf8",
);
const buyBox = readFileSync(
  join(import.meta.dirname, "..", "components", "StoreBuyBox.tsx"),
  "utf8",
);

describe("P2 brand presence, Store OS accents, dual-path copy", () => {
  it("puts the brand lockup into the company landing hero composition", () => {
    expect(landing).toContain('import { BrandLogo } from "@/components/BrandLogo"');
    expect(landing).toContain("<BrandLogo height={52} />");
    expect(landing).toContain("uYAO · PHARMACY OPERATING SYSTEM");
    expect(landing).toContain("uYao · 藥局作業系統");
  });

  it("shifts Store OS interactive accents toward forest greens", () => {
    expect(storeOsCss).toMatch(/--blue:\s*#(2f7a55|1f6b45)/);
    expect(storeOsCss.toLowerCase()).not.toContain("#3d9aff");
    expect(storeOsCss.toLowerCase()).not.toContain("#0285ff");
  });

  it("clarifies ask-vs-browse on shop home and Agent empty state", () => {
    expect(home).toContain(
      "Ask uYao in the box — that opens Agent. Browse the cabinet below when you already know the item.",
    );
    expect(home).toContain("在框裡問 uYao 會進入 Agent；已知品項可直接逛下方藥櫃。");
    expect(agent).toContain(
      "Ask in Agent for a grounded next step. To browse the photographed cabinet instead, go back to Shop.",
    );
    expect(agent).toContain("在 Agent 提問，取得有依據的下一步。若要逛拍攝藥櫃目錄，請回到找藥。");
    expect(agent).toContain('localizedPath("/", locale)');
  });

  it("explains Store OS confirmation when reserve is available", () => {
    expect(buyBox).toContain("The pharmacy confirms in Store OS. Calling is still available if you need to talk to staff now.");
    expect(buyBox).toContain("藥局會在 Store OS 確認這筆預留；若要立刻問人，仍可打電話。");
  });
});
