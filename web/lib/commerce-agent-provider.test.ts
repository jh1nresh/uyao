import { afterEach, describe, expect, it, vi } from "vitest";

import { answerCommerceAgent } from "./commerce-agent";

const input = {
  messages: [{ role: "user" as const, content: "看第一個附近藥局" }],
  area: "datong" as const,
  locale: "zh" as const,
  screen: { productSlugs: ["hugu-gaishu-100"] },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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
      "search_catalog", "present_products", "present_pharmacies", "present_no_match",
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
