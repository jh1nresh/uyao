import { describe, expect, it, vi } from "vitest";

import {
  answerCommerceAgent,
  localCommerceAgentReply,
  parseCommerceAgentMessages,
  type CommerceModelCaller,
  type CommerceModelResponse,
} from "./commerce-agent";

const input = (content: string) => ({
  messages: [{ role: "user" as const, content }],
  area: "datong" as const,
  locale: "zh" as const,
});

describe("uYao commerce agent harness", () => {
  it("routes safety-sensitive symptom language before any model or catalog result", async () => {
    const caller = vi.fn<CommerceModelCaller>();
    const reply = await answerCommerceAgent(input("胸痛，幫我找藥"), caller);

    expect(reply.kind).toBe("safety");
    expect(reply.products).toEqual([]);
    expect(reply.message).toContain("直接就醫");
    expect(caller).not.toHaveBeenCalled();
  });

  it("uses existing server ranking and exposes no price or stock field", () => {
    const reply = localCommerceAgentReply(input("補鈣"));

    expect(reply.kind).toBe("products");
    expect(reply.products.length).toBeGreaterThan(0);
    expect(reply.products[0].reason).toContain("比對到");
    expect(JSON.stringify(reply)).not.toMatch(/priceTwd|inStock|daysSinceScan/);
  });

  it("rejects a hallucinated product id before rendering, then accepts a server-issued id", async () => {
    const responses: CommerceModelResponse[] = [
      {
        content: [{
          type: "tool_use",
          id: "tool-1",
          name: "search_catalog",
          input: { query: "護谷鈣素" },
        }],
      },
      {
        content: [{
          type: "tool_use",
          id: "tool-2",
          name: "present_products",
          input: { product_ids: ["p_999"] },
        }],
      },
      {
        content: [{
          type: "tool_use",
          id: "tool-3",
          name: "present_products",
          input: { product_ids: ["p_1"] },
        }],
      },
    ];
    const caller = vi.fn<CommerceModelCaller>(async () => responses.shift()!);

    const reply = await answerCommerceAgent(input("護谷鈣素"), caller);

    expect(reply).toMatchObject({ kind: "products", mode: "claude" });
    expect(reply.products[0]).toMatchObject({ slug: "hugu-gaishu-100" });
    const thirdRequest = caller.mock.calls[2][0];
    expect(JSON.stringify(thirdRequest.messages)).toContain("Use only product_id values");
  });

  it("falls back to grounded catalog behavior when the model fails", async () => {
    const caller: CommerceModelCaller = async () => {
      throw new Error("provider unavailable");
    };
    const reply = await answerCommerceAgent(input("護谷鈣素"), caller);

    expect(reply).toMatchObject({ kind: "products", mode: "catalog", degraded: true });
  });

  it("keeps only a bounded plain-text conversation ending in a user turn", () => {
    expect(parseCommerceAgentMessages([
      { role: "user", content: "  補鈣  " },
      { role: "assistant", content: "找到一項" },
      { role: "user", content: "看第一項" },
    ])).toEqual([
      { role: "user", content: "補鈣" },
      { role: "assistant", content: "找到一項" },
      { role: "user", content: "看第一項" },
    ]);
    expect(parseCommerceAgentMessages([{ role: "assistant", content: "no" }])).toBeNull();
  });
});
