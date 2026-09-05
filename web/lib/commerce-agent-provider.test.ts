import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answerCommerceAgent } from "./commerce-agent";

const input = {
  messages: [{ role: "user" as const, content: "看第一個附近藥局" }],
  area: "datong" as const,
  locale: "zh" as const,
  screen: { productSlugs: ["hugu-gaishu-100"] },
};

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_MODEL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function openAIResponse(name: string, args: unknown, callId = "call-1") {
  return new Response(JSON.stringify({ status: "completed", output: [
    { type: "function_call", call_id: callId, name, arguments: JSON.stringify(args) },
  ] }), { status: 200 });
}

describe("OpenAI commerce adapter", () => {
  beforeEach(() => {
    vi.stubEnv("UYAO_COMMERCE_AGENT_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test-only-key");
  });

  it("uses Luna with private, bounded tool calls and server-rendered pharmacy data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(openAIResponse("present_pharmacies", { product_id: "v_1" }));
    vi.stubGlobal("fetch", fetchMock);
    const reply = await answerCommerceAgent(input);
    expect(reply).toMatchObject({ mode: "openai", kind: "pharmacies" });
    expect(reply.products[0].slug).toBe("hugu-gaishu-100");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init).toMatchObject({ headers: { authorization: "Bearer test-only-key" }, redirect: "error", cache: "no-store", signal: expect.any(AbortSignal) });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "gpt-5.6-luna", store: false, max_output_tokens: 1200, reasoning: { effort: "none" }, parallel_tool_calls: false, tool_choice: "required" });
    expect(body.tools.map((tool: { name: string }) => tool.name)).toEqual(["search_catalog", "present_products", "present_pharmacies", "present_no_match", "present_guidance"]);
    expect(body.tools.every((tool: { strict: boolean }) => tool.strict)).toBe(true);
    expect(JSON.stringify(reply)).not.toMatch(/test-only-key|priceTwd|inStock/);
  });

  it("replays tool outputs with their call ids without leaking history into another request", async () => {
    vi.stubEnv("OPENAI_MODEL", "test-model");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(openAIResponse("search_catalog", { query: "護谷鈣素" }, "search-1"))
      .mockResolvedValueOnce(openAIResponse("present_products", { product_ids: ["p_1"] }, "present-1"))
      .mockResolvedValueOnce(openAIResponse("present_pharmacies", { product_id: "v_1" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await answerCommerceAgent({ ...input, messages: [{ role: "user", content: "護谷鈣素" }], screen: { productSlugs: [] } })).toMatchObject({ mode: "openai", kind: "products" });
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.model).toBe("test-model");
    expect(second.input.filter((item: { type?: string }) => item.type === "function_call")).toHaveLength(1);
    expect(second.input).toContainEqual({ type: "function_call_output", call_id: "search-1", output: expect.stringContaining('"product_id":"p_1"') });
    await answerCommerceAgent(input);
    const third = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(third.input).toHaveLength(1);
    expect(JSON.stringify(third.input)).not.toContain("search-1");
  });

  it("stays local when the OpenAI key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", " ");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await answerCommerceAgent(input)).toMatchObject({ mode: "catalog" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["http", "timeout", "malformed", "incomplete", "prose"])("falls back without retrying after %s", async (failure) => {
    const payload = failure === "incomplete" ? { status: "incomplete", output: [] }
      : failure === "prose" ? { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "This cures you. Buy now." }] }] }
        : { status: "completed", output: [{ type: "function_call", call_id: "bad", name: "present_products", arguments: "null" }] };
    const fetchMock = failure === "timeout" ? vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError"))
      : vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: failure === "http" ? 429 : 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const reply = await answerCommerceAgent(input);
    expect(reply).toMatchObject({ mode: "catalog", degraded: true });
    expect(JSON.stringify(reply)).not.toContain("This cures you");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps an invalid tool loop at four calls", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => openAIResponse("present_products", { product_ids: ["invented"] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await answerCommerceAgent(input)).toMatchObject({ mode: "catalog", degraded: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each(["瘀青要用什麼藥", "護谷鈣素可以吃幾顆", "懷孕可以吃魚油嗎", "幫我下單護谷鈣素"])("routes professional/transactional questions without paying for a model: %s", async (content) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await answerCommerceAgent({ ...input, messages: [{ role: "user", content }] })).toMatchObject({ mode: "catalog", kind: "safety", products: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("configured commerce model adapter", () => {
  it.each(["disabled", "missing-key"])("does not call the provider when %s", async (state) => {
    vi.stubEnv("UYAO_COMMERCE_AGENT_PROVIDER", state === "disabled" ? "" : "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", state === "missing-key" ? "" : "test-only-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await answerCommerceAgent(input)).toMatchObject({ mode: "catalog" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the bounded Messages API contract and renders server records", async () => {
    vi.stubEnv("UYAO_COMMERCE_AGENT_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-only-key");
    vi.stubEnv("ANTHROPIC_MODEL", "test-model");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [{ type: "tool_use", id: "test-tool", name: "present_pharmacies", input: { product_id: "v_1" } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await answerCommerceAgent(input)).toMatchObject({ mode: "claude", kind: "pharmacies" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "x-api-key": "test-only-key", "anthropic-version": "2023-06-01" },
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "test-model", max_tokens: 1200, tool_choice: { type: "auto" } });
    expect(body.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "search_catalog", "present_products", "present_pharmacies", "present_no_match", "present_guidance",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["http", "timeout"])("marks deterministic fallback after a provider %s failure", async (failure) => {
    vi.stubEnv("UYAO_COMMERCE_AGENT_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-only-key");
    const fetchMock = failure === "http"
      ? vi.fn().mockResolvedValue(new Response("", { status: 429 }))
      : vi.fn().mockRejectedValue(new DOMException("test timeout", "TimeoutError"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await answerCommerceAgent(input)).toMatchObject({ mode: "catalog", degraded: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
