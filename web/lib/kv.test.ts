import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetForTests, append, getMany, lastN, listAll, removeFromList, set } from "./kv";

beforeEach(() => __resetForTests());

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function mockRestSuccessBody(body: unknown): void {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "test-token");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
}

describe("KV list and batch primitives", () => {
  it("batches scalar reads without changing missing-key semantics", async () => {
    await set("a", "one");
    await set("b", "two");
    await expect(getMany(["b", "missing", "a"])).resolves.toEqual(["two", null, "one"]);
  });

  it("keeps bounded history and removes terminal tokens from an active list", async () => {
    await append("history", "old", 2);
    await append("history", "middle", 2);
    await append("history", "new", 2);
    await append("active", "old", null);
    await append("active", "new", null);
    await removeFromList("active", "old");

    await expect(listAll("history")).resolves.toEqual(["middle", "new"]);
    await expect(listAll("active")).resolves.toEqual(["new"]);
  });

  it("rejects an HTTP-success KV error body instead of fabricating missing MGET rows", async () => {
    mockRestSuccessBody({ error: "WRONGTYPE" });
    await expect(getMany(["r:one"])).rejects.toThrow("KV MGET returned an invalid result");
  });

  it("rejects an HTTP-success KV error body instead of fabricating an empty active list", async () => {
    mockRestSuccessBody({ error: "WRONGTYPE" });
    await expect(listAll("store-reservations:test:active")).rejects.toThrow("KV LRANGE returned an invalid result");
  });

  it("rejects malformed or mixed LRANGE values instead of fabricating empty history", async () => {
    mockRestSuccessBody({ error: "WRONGTYPE" });
    await expect(lastN("store-reservations:test", 50)).rejects.toThrow("KV LRANGE returned an invalid result");

    mockRestSuccessBody({ result: ["reservation-token", null] });
    await expect(lastN("store-reservations:test", 50)).rejects.toThrow("KV LRANGE returned an invalid result");
  });
});
