#!/usr/bin/env node

// Three read-only synthetic requests; never sends a key or creates a reservation.
const usage = "node scripts/smoke-commerce-agent.mjs --expect-mode catalog|claude|openai [--endpoint URL] [--allow-external]";

function options(args) {
  const result = { endpoint: "http://localhost:3100/api/agent", allowExternal: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--allow-external") result.allowExternal = true;
    else if (arg === "--endpoint" || arg === "--expect-mode") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(usage);
      result[arg === "--endpoint" ? "endpoint" : "mode"] = value;
    } else throw new Error(usage);
  }
  if (!["catalog", "claude", "openai"].includes(result.mode)) throw new Error(usage);
  const url = new URL(result.endpoint);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Endpoint must be an HTTP(S) URL without credentials, query, or fragment.");
  }
  if (url.pathname !== "/api/agent") throw new Error("Endpoint path must be /api/agent.");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !result.allowExternal) {
    throw new Error("External endpoints require both --endpoint URL and --allow-external.");
  }
  return result;
}

async function ask(config, messages, screen, stream, expectedKind) {
  const response = await fetch(config.endpoint, {
    method: "POST",
    redirect: "error",
    headers: {
      "content-type": "application/json",
      accept: stream ? "application/x-ndjson" : "application/json",
    },
    body: JSON.stringify({ messages, area: "datong", locale: "zh", screen, safetyContextConfirmed: true }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}; retry-after=${response.headers.get("retry-after") ?? "absent"}`);
  }
  let reply;
  if (stream) {
    if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
      throw new Error("Expected NDJSON response.");
    }
    let resultCount = 0;
    let lastType;
    for (const line of (await response.text()).split("\n").filter((line) => line.trim())) {
      const event = JSON.parse(line);
      if (!event || typeof event !== "object") throw new Error("Invalid stream event.");
      if (event.type === "error") throw new Error("Agent returned a stream error.");
      if (event.type === "result") {
        resultCount += 1;
        reply = event.reply;
      } else if (event.type !== "progress") throw new Error("Unknown stream event.");
      lastType = event.type;
    }
    if (resultCount !== 1 || lastType !== "result") throw new Error("Stream must end with exactly one result.");
  } else {
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Expected JSON response.");
    }
    reply = await response.json();
  }
  if (!reply || reply.mode !== config.mode || reply.degraded) {
    throw new Error(`Expected ${config.mode}; received mode=${reply?.mode ?? "missing"}, degraded=${Boolean(reply?.degraded)}.`);
  }
  if (reply.kind !== expectedKind || !Array.isArray(reply.products) || !Array.isArray(reply.pharmacies)) {
    throw new Error(`Expected a grounded ${expectedKind} result.`);
  }
  if (!reply.products.length || reply.products.some((product) => typeof product.slug !== "string" || !product.slug)) {
    throw new Error("Result lacks catalog product identifiers.");
  }
  if (expectedKind === "pharmacies" && reply.products[0].slug !== screen.productSlugs[0]) {
    throw new Error("Pharmacy follow-up did not preserve the first visible product.");
  }
  console.log(`PASS ${stream ? "NDJSON" : "JSON"} kind=${reply.kind} mode=${reply.mode} products=${reply.products.length} pharmacies=${reply.pharmacies.length}`);
  return reply;
}

try {
  const config = options(process.argv.slice(2));
  if (config.mode !== "catalog") console.log(`${config.mode} smoke: 3 API requests, up to 12 billed model calls; no retries.`);
  const firstMessage = { role: "user", content: "補鈣" };
  await ask(config, [firstMessage], { productSlugs: [] }, false, "products");
  const first = await ask(config, [firstMessage], { productSlugs: [] }, true, "products");
  await ask(config, [firstMessage, { role: "assistant", content: first.message }, {
    role: "user", content: "看第一個附近藥局",
  }], { productSlugs: first.products.map((product) => product.slug).slice(0, 5) }, true, "pharmacies");
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : "Unknown failure"}`);
  process.exitCode = 1;
}
