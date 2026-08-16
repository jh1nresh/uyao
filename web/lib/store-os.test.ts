import { describe, expect, it } from "vitest";

import {
  RESTOCK_WORK_ITEM,
  STORE_AGENTS,
  isStoreAgentAvailable,
  storeAgent,
  storeAgentCopy,
  storeWorkItemCopy,
} from "@/lib/store-os";

describe("Store OS prototype truth boundaries", () => {
  it("keeps every agent id unique and queryable", () => {
    expect(new Set(STORE_AGENTS.map((agent) => agent.id)).size).toBe(STORE_AGENTS.length);
    expect(storeAgent("purchasing").state).toBe("approval");
  });

  it("does not represent the supplier draft as sent", () => {
    expect(RESTOCK_WORK_ITEM.requiresApproval).toBe(true);
    expect(RESTOCK_WORK_ITEM.draft.sent).toBe(false);
    expect(RESTOCK_WORK_ITEM.steps.at(-1)?.state).toBe("approval");
  });

  it("preserves source evidence instead of claiming exact inventory", () => {
    const inventoryStep = RESTOCK_WORK_ITEM.steps.find(
      (step) => step.agentId === "inventory",
    );
    expect(inventoryStep?.detail).toContain("可用數量仍需人員確認");
  });

  it("exposes the multi-agent demo only inside the demo account", () => {
    expect(isStoreAgentAvailable("manager", false)).toBe(true);
    expect(isStoreAgentAvailable("inventory", false)).toBe(false);
    expect(isStoreAgentAvailable("purchasing", false)).toBe(false);
    expect(isStoreAgentAvailable("checkout", false)).toBe(false);
    expect(STORE_AGENTS.every((agent) => isStoreAgentAvailable(agent.id, true))).toBe(true);
  });

  it("uses the agreed English names for operational agents", () => {
    expect(storeAgentCopy("inventory", "en").name).toBe("Inventory Agent");
    expect(storeAgentCopy("purchasing", "en").name).toBe("Procurement Agent");
    expect(storeAgentCopy("checkout", "en").name).toBe("Checkout Agent");
    expect(storeWorkItemCopy("en").draft.sent).toBe(false);
  });
});
