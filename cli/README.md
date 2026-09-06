# uYao 有藥 CLI (uyaohealth-cli)

Read public catalog and pharmacy records from [uyaohealth.com](https://uyaohealth.com/docs).
Requires Node.js 20 or newer. No dependencies, API key, account, or cookies.
Records are not live inventory, prices, medical advice, or availability guarantees.
Supply and pickup remain subject to pharmacy confirmation.

## Install from this repository

The package is prepared locally and **has not been published to npm**.
From the repository root:

```sh
npm install --global ./cli
uyao --help
```

Or run directly without installation:

```sh
node cli/bin/uyao.mjs catalog --locale en
node cli/bin/uyao.mjs catalog greenplus-elgucare
node cli/bin/uyao.mjs pharmacies --area datong --locale en
node cli/bin/uyao.mjs openapi
```

The `uyao` executable accepts the same commands. All commands use GET on the
canonical HTTPS domain. Catalog and pharmacies accept `--locale zh|en`; only
pharmacies accepts `--area` (valid areas are listed in OpenAPI). The API contract
is pinned with `X-uYao-API-Version: 1.1.0`.

Successful JSON, including the API disclaimer, goes to stdout. Failures go to
stderr as JSON: API errors preserve the problem body, HTTP status and Retry-After
when present. Exit codes: 0 success, 1 request/API failure, 2 invalid arguments.
Requests time out after 15 seconds. The CLI does not retry or follow redirects;
on HTTP 429, wait for Retry-After before requesting again.

There are no write, reservation, Store OS, diagnostic, webhook, or MCP commands.
Reading OpenAPI does not authorize use of its `x-internal` operations.

## Verify and prepare a release

```sh
npm --prefix cli test
npm pack ./cli --dry-run
```

Before a first npm release, confirm package-name ownership, the publishing
account, and distribution/license terms (currently UNLICENSED). This repository
does not publish automatically. Only after an authorized successful publication
should the site document registry installation commands.
