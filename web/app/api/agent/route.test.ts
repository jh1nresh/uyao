import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";

import { POST } from "./route";

function request(body: unknown, ip = "127.0.2.1", stream = false) {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      ...(stream ? { accept: "application/x-ndjson" } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetForTests();
  delete process.env.UYAO_COMMERCE_AGENT_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
});

describe("POST /api/agent", () => {
  it("returns grounded catalog cards without exposing price or stock claims", async () => {
    const response = await POST(request({
      messages: [{ role: "user", content: "補鈣" }],
      area: "datong",
      locale: "zh",
      safetyContextConfirmed: true,
    }));
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ kind: "products", mode: "catalog" });
    expect(JSON.stringify(body)).not.toMatch(/priceTwd|inStock|daysSinceScan/);
    expect(JSON.stringify(body)).toContain("不是用藥推薦");
  });

  it("requires the allergy gate without accepting allergy details", async () => {
    const response = await POST(request({
      messages: [{ role: "user", content: "護谷鈣素" }],
      area: "datong",
      locale: "zh",
    }));

    expect(response.status).toBe(428);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("過敏") });
  });

  it("rejects oversized or malformed conversations", async () => {
    const response = await POST(request({
      messages: [{ role: "assistant", content: "not a user turn" }],
      area: "datong",
      locale: "zh",
      safetyContextConfirmed: true,
    }));

    expect(response.status).toBe(422);
  });

  it("streams bounded progress before the grounded result", async () => {
    const response = await POST(request({
      messages: [{ role: "user", content: "補鈣" }],
      area: "datong",
      locale: "zh",
      screen: { productSlugs: [] },
      safetyContextConfirmed: true,
    }, "127.0.2.8", true));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line)) as Array<Record<string, unknown>>;

    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(events.map((event) => event.type)).toEqual(["progress", "progress", "progress", "result"]);
    expect(events.at(-1)).toMatchObject({ type: "result", reply: { kind: "products" } });
    expect(JSON.stringify(events)).not.toMatch(/priceTwd|inStock|daysSinceScan/);
  });

  it("rejects forged screen state instead of passing it to the model", async () => {
    const response = await POST(request({
      messages: [{ role: "user", content: "看第一個" }],
      area: "datong",
      locale: "zh",
      screen: { productSlugs: ["forged-product"] },
      safetyContextConfirmed: true,
    }, "127.0.2.9"));

    expect(response.status).toBe(422);
  });
});
