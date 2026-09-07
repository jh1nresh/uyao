import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetForTests,
  append,
  getMany,
  lastN,
  listAll,
  removeFromList,
  set,
  setAndUpdateHistory,
} from "./kv";

beforeEach(() => __resetForTests());

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function mockRestSuccessBody(body: unknown) {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("KV_REST_API_URL", "https://kv.test");
  vi.stubEnv("KV_REST_API_TOKEN", "test-token");
  const mockedFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
    new Response(JSON.stringify(body), { status: 200 })
  ));
  vi.stubGlobal("fetch", mockedFetch);
  return mockedFetch;
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
    await expect(getMany(["r:one"])).rejects.toThrow("KV command failed");
  });

  it("rejects an HTTP-success KV error body instead of fabricating an empty active list", async () => {
    mockRestSuccessBody({ error: "WRONGTYPE" });
    await expect(listAll("store-reservations:test:active")).rejects.toThrow("KV command failed");
  });

  it("rejects malformed or mixed LRANGE values instead of fabricating empty history", async () => {
    mockRestSuccessBody({ error: "WRONGTYPE" });
    await expect(lastN("store-reservations:test", 50)).rejects.toThrow("KV command failed");

    mockRestSuccessBody({ result: ["reservation-token", null] });
    await expect(lastN("store-reservations:test", 50)).rejects.toThrow("KV LRANGE returned an invalid result");
  });

  it("rejects an HTTP-success KV error body for required index writes", async () => {
    mockRestSuccessBody({ error: "WRONGTYPE" });
    await expect(append("store-reservations:test:active", "token", null)).rejects.toThrow("KV command failed");
  });

  it("sends one EVAL for the atomic record/history update and requires its OK result", async () => {
    const mockedFetch = mockRestSuccessBody({ result: "OK" });
    await expect(setAndUpdateHistory("r:token", "record", 60, "history", "token", 500)).resolves.toBeUndefined();
    const request = mockedFetch.mock.calls[0][1] as RequestInit;
    const args = JSON.parse(String(request.body)) as unknown[];
    expect(args.slice(0, 5)).toEqual(["EVAL", expect.any(String), 2, "r:token", "history"]);
    expect(args[1]).toContain("redis.call('TYPE', KEYS[2]).ok");
    expect(args.slice(-4)).toEqual(["record", 60, "token", 500]);

    mockRestSuccessBody({ result: null });
    await expect(setAndUpdateHistory("r:token", "record", 60, "history", "token", 500)).rejects.toThrow(
      "KV reservation history update failed",
    );
  });

});
