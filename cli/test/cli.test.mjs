import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { run } from "../bin/uyao.mjs";

async function invoke(args, handler = () => Response.json({ disclaimer: "Not live inventory", items: [] })) {
  const calls = [];
  let out = "";
  let err = "";
  const code = await run(args, {
    fetchImpl: async (url, options) => { calls.push({ url, options }); return handler(url, options); },
    stdout: (text) => { out += text; },
    stderr: (text) => { err += text; },
  });
  return { code, out, err, calls };
}

test("help and version work offline, including the executable entry point", async () => {
  for (const args of [[], ["--help"], ["-h"], ["--version"]]) {
    const result = await invoke(args);
    assert.equal(result.code, 0);
    assert.equal(result.calls.length, 0);
    assert.ok(result.out.length > 0);
    assert.equal(result.err, "");
  }
  const child = spawnSync(process.execPath, [new URL("../bin/uyao.mjs", import.meta.url).pathname, "--version"], { encoding: "utf8" });
  assert.equal(child.status, 0);
  assert.equal(child.stdout, "0.1.0\n");
});

test("commands issue only canonical public GETs and preserve complete JSON", async () => {
  const payload = { disclaimer: "Not live inventory", items: [{ name: "測試" }] };
  for (const [args, path] of [
    [["catalog"], "/api/catalog"],
    [["catalog", "greenplus-elgucare", "--locale", "en"], "/api/catalog/greenplus-elgucare?locale=en"],
    [["pharmacies", "--area", "datong", "--locale", "zh"], "/api/pharmacies?locale=zh&area=datong"],
    [["openapi"], "/openapi.json"],
  ]) {
    const result = await invoke(args, () => Response.json(payload));
    assert.equal(result.code, 0);
    assert.equal(result.err, "");
    assert.deepEqual(JSON.parse(result.out), payload);
    assert.equal(result.calls.length, 1);
    const { url, options } = result.calls[0];
    assert.equal(url.href, `https://uyaohealth.com${path}`);
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Accept, "application/json");
    assert.equal(options.headers["X-uYao-API-Version"], "1.1.0");
    assert.equal(options.redirect, "error");
    assert.equal(options.credentials, "omit");
    assert.ok(options.signal instanceof AbortSignal);
  }
});

test("invalid commands, extra arguments and path traversal fail before any request", async () => {
  for (const args of [
    ["reserve"], ["catalog", "../store"], ["catalog", "x/y"], ["catalog", "%2e%2e"],
    ["catalog", "one", "two"], ["catalog", "--area", "datong"],
    ["catalog", "--locale", "fr"], ["catalog", "--locale", ""], ["catalog", "--locale"],
    ["pharmacies", "extra"], ["pharmacies", "--area", ""],
    ["openapi", "--locale", "en"], ["catalog", "--token", "secret"],
  ]) {
    const result = await invoke(args);
    assert.equal(result.code, 2, args.join(" "));
    assert.equal(result.out, "");
    assert.equal(result.calls.length, 0);
    assert.equal(JSON.parse(result.err).code, "invalid_arguments");
  }
});

test("HTTP failures preserve problem details and retry guidance without retrying", async () => {
  for (const status of [400, 404, 429, 500]) {
    const problem = { type: "https://uyaohealth.com/docs#api-errors", status, code: "test_problem", resolution: "Read the docs" };
    const result = await invoke(["catalog"], () => Response.json(problem, {
      status, headers: { "content-type": "application/problem+json", "retry-after": "60" },
    }));
    assert.equal(result.code, 1);
    assert.equal(result.out, "");
    assert.equal(result.calls.length, 1);
    assert.deepEqual(JSON.parse(result.err), { status, problem, retryAfter: "60" });
  }
});

test("HTML, malformed JSON, network errors and timeouts fail as machine-readable errors", async () => {
  for (const handler of [
    () => new Response("<html>error</html>", { headers: { "content-type": "text/html" } }),
    () => new Response("{", { headers: { "content-type": "application/json" } }),
    () => { throw new TypeError("Network unavailable"); },
    () => { throw new DOMException("Timed out", "TimeoutError"); },
  ]) {
    const result = await invoke(["catalog"], handler);
    assert.equal(result.code, 1);
    assert.equal(result.out, "");
    assert.equal(result.calls.length, 1);
    assert.equal(JSON.parse(result.err).code, "request_failed");
  }
});
