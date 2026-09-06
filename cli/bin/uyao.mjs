#!/usr/bin/env node
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { readFileSync, realpathSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const HELP = `uYao 有藥 (uyaohealth.com) — public read-only CLI

Usage:
  uyao catalog [slug] [--locale zh|en]
  uyao pharmacies [--area slug] [--locale zh|en]
  uyao openapi
  uyao --help
  uyao --version

JSON goes to stdout; errors go to stderr with a nonzero exit code.
No login or API key is needed. Records are not live inventory, prices,
medical advice, or confirmed availability. No write operations are supported.
Documentation: https://uyaohealth.com/docs
`;

export async function run(args, {
  fetchImpl = globalThis.fetch,
  stdout = (text) => process.stdout.write(text),
  stderr = (text) => process.stderr.write(text),
} = {}) {
  let requestPath;
  let values;
  try {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: "boolean", short: "h" },
        version: { type: "boolean" },
        locale: { type: "string" },
        area: { type: "string" },
      },
    });
    values = parsed.values;
    if (values.help || args.length === 0) { stdout(HELP); return 0; }
    if (values.version) { stdout(`${version}\n`); return 0; }
    const [command, slug, ...extra] = parsed.positionals;
    if (extra.length || !["catalog", "pharmacies", "openapi"].includes(command)) {
      throw new Error("Use catalog [slug], pharmacies, or openapi. See --help.");
    }
    if (values.locale !== undefined && !["zh", "en"].includes(values.locale)) {
      throw new Error("--locale must be zh or en.");
    }
    if (values.area !== undefined && (command !== "pharmacies" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.area))) {
      throw new Error("--area requires a pharmacy area slug. See /openapi.json for supported areas.");
    }
    if ((slug !== undefined && command !== "catalog") || (command === "openapi" && values.locale !== undefined)) {
      throw new Error("Unsupported arguments for this command. See --help.");
    }
    if (slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error("Invalid catalog slug.");
    }
    requestPath = command === "openapi" ? "/openapi.json"
      : command === "pharmacies" ? "/api/pharmacies"
        : `/api/catalog${slug ? `/${slug}` : ""}`;
  } catch (error) {
    stderr(`${JSON.stringify({ code: "invalid_arguments", message: error.message })}\n`);
    return 2;
  }

  try {
    const url = new URL(requestPath, "https://uyaohealth.com");
    if (values.locale) url.searchParams.set("locale", values.locale);
    if (values.area) url.searchParams.set("area", values.area);
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json", "X-uYao-API-Version": "1.1.0" },
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
      credentials: "omit",
    });
    const contentType = response.headers.get("content-type")?.split(";")[0].trim();
    if (!["application/json", "application/problem+json"].includes(contentType)) {
      throw new Error(`Expected JSON; received HTTP ${response.status} ${contentType ?? "without a content type"}.`);
    }
    const body = await response.json();
    if (!response.ok) {
      stderr(`${JSON.stringify({
        status: response.status,
        problem: body,
        ...(response.headers.has("retry-after") ? { retryAfter: response.headers.get("retry-after") } : {}),
      })}\n`);
      return 1;
    }
    stdout(`${JSON.stringify(body)}\n`);
    return 0;
  } catch (error) {
    stderr(`${JSON.stringify({ code: "request_failed", message: error.message })}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exitCode = await run(process.argv.slice(2));
}
