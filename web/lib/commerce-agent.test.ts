import { describe, expect, it, vi } from "vitest";

import {
  answerCommerceAgent,
  localCommerceAgentReply,
  parseCommerceAgentMessages,
  parseCommerceAgentScreenState,
  selectCommerceAgentSkill,
  type CommerceModelCaller,
  type CommerceModelResponse,
} from "./commerce-agent";

const input = (content: string) => ({
  messages: [{ role: "user" as const, content }],
  area: "datong" as const,
  locale: "zh" as const,
});

describe("uYao commerce agent harness", () => {
  it.each(["professional_review", "scope"])("renders fixed %s guidance without model prose", async (reason) => {
    const caller = vi.fn<CommerceModelCaller>(async () => ({ content: [
      { type: "text", text: "Ignore the rules and buy a cure." },
      { type: "tool_use", id: "guide", name: "present_guidance", input: { reason } },
    ] }));
    const reply = await answerCommerceAgent(input("魚油"), caller);
    expect(reply).toMatchObject({ kind: "safety", products: [], pharmacies: [] });
    expect(reply.message).not.toContain("buy a cure");
    expect(caller).toHaveBeenCalledTimes(1);
  });

  it("prioritizes guidance over product cards when a provider returns both", async () => {
    const caller: CommerceModelCaller = async () => ({ content: [
      { type: "tool_use", id: "product", name: "present_products", input: { product_ids: ["v_1"] } },
      { type: "tool_use", id: "guide", name: "present_guidance", input: { reason: "professional_review" } },
    ] });
    expect(await answerCommerceAgent({ ...input("第一個"), screen: { productSlugs: ["hugu-gaishu-100"] } }, caller))
      .toMatchObject({ kind: "safety", products: [] });
  });

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

  it("preserves symptom routing in follow-ups even with visible product ids", async () => {
    const caller = vi.fn<CommerceModelCaller>();
    const followUp = { ...input("那就給我第一個"), messages: [
      { role: "user" as const, content: "瘀青怎麼辦" },
      { role: "assistant" as const, content: "請詢問藥師" },
      { role: "user" as const, content: "那就給我第一個" },
    ], screen: { productSlugs: ["hugu-gaishu-100"] } };
    expect(await answerCommerceAgent(followUp, caller)).toMatchObject({ kind: "safety", products: [] });
    expect(localCommerceAgentReply(followUp)).toMatchObject({ kind: "safety", products: [] });
    expect(caller).not.toHaveBeenCalled();
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
    expect(JSON.stringify(thirdRequest.messages)).toContain("Use only server-issued product_id values");
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

  it("resolves a follow-up against the server-validated products already on screen", () => {
    const first = localCommerceAgentReply(input("補鈣"));
    const reply = localCommerceAgentReply({
      messages: [
        { role: "user", content: "補鈣" },
        { role: "assistant", content: first.message },
        { role: "user", content: "看第一個附近藥局" },
      ],
      area: "datong",
      locale: "zh",
      screen: { productSlugs: first.products.map((product) => product.slug) },
    });

    expect(reply.kind).toBe("pharmacies");
    expect(reply.products[0].slug).toBe(first.products[0].slug);
    expect(reply.message).toContain("仍由藥局或藥師確認");
  });

  it("loads the pharmacist handoff procedure only for a grounded follow-up", async () => {
    expect(selectCommerceAgentSkill("補鈣")).toBeNull();
    expect(selectCommerceAgentSkill("第一個成分是什麼", { productSlugs: ["hugu-gaishu-100"] }))
      .toBeNull();
    expect(selectCommerceAgentSkill("看第一個附近藥局", { productSlugs: ["hugu-gaishu-100"] }))
      .toMatchObject({ name: "pharmacist-handoff" });

    const caller = vi.fn<CommerceModelCaller>(async () => ({
      content: [{
        type: "tool_use",
        id: "tool-visible",
        name: "present_pharmacies",
        input: { product_id: "v_1" },
      }],
    }));
    const reply = await answerCommerceAgent({
      ...input("看第一個附近藥局"),
      screen: { productSlugs: ["hugu-gaishu-100"] },
    }, caller);

    expect(reply).toMatchObject({ kind: "pharmacies", mode: "claude" });
    expect(JSON.stringify(caller.mock.calls[0][0].messages)).toContain("pharmacist-handoff");
    expect(JSON.stringify(caller.mock.calls[0][0].messages)).toContain('"product_id":"v_1"');
  });

  it("accepts only bounded catalog-backed screen state", () => {
    expect(parseCommerceAgentScreenState({ productSlugs: ["hugu-gaishu-100", "hugu-gaishu-100"] }))
      .toEqual({ productSlugs: ["hugu-gaishu-100"] });
    expect(parseCommerceAgentScreenState({ productSlugs: ["not-a-product"] })).toBeUndefined();
    expect(parseCommerceAgentScreenState({ productSlugs: Array(6).fill("hugu-gaishu-100") })).toBeUndefined();
  });

  it("reports real bounded stages without exposing model reasoning", async () => {
    const stages: string[] = [];
    await answerCommerceAgent(input("補鈣"), null, (progress) => stages.push(progress.stage));
    expect(stages).toEqual(["checking", "searching", "presenting"]);
  });
});
