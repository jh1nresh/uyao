#!/usr/bin/env node
/**
 * Agent-facing storeOS control CLI. Every command prints one JSON object
 * to stdout. Diagnostics go to the run log, never to stdout.
 */
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createConnection } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(SKILL_DIR, "../../..");
const WEB_DIR = path.join(REPO_ROOT, "web");
const RUN_DIR = path.join(SKILL_DIR, ".run");
const RUN_FILE = path.join(RUN_DIR, "run.json");
const EVIDENCE_DIR = path.join(SKILL_DIR, "evidence");
const WEB_PACKAGE = path.join(WEB_DIR, "package.json");

const DEFAULT_APP_PORT = 43100;
const DEFAULT_CDP_PORT = 43101;
const READY_TIMEOUT_MS = 90_000;
const FEATURE_IDS = [
  "store-login",
  "reservation-inbox",
  "account-settings",
  "support-agent",
  "agent-workboard",
];

const PUBLIC_STORE_OS = "https://store.uyaohealth.com/";

function nowIso() {
  return new Date().toISOString();
}

function envPort(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer port, got ${raw}`);
  }
  return value;
}

function appPort() {
  return envPort("VERIFY_UYA_PORT", DEFAULT_APP_PORT);
}

function cdpPort() {
  return envPort("VERIFY_UYA_CDP_PORT", DEFAULT_CDP_PORT);
}

function chromeBin() {
  return process.env.VERIFY_UYA_CHROME
    || [
      "/usr/local/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ].find((candidate) => existsSync(candidate))
    || "google-chrome";
}

function emit(payload, exitCode = 0) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(exitCode);
}

function fail(payload, exitCode = 1) {
  emit({ ok: false, ...payload }, exitCode);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function webVersion() {
  try {
    return readJson(WEB_PACKAGE).version ?? null;
  } catch {
    return null;
  }
}

function loadRun() {
  if (!existsSync(RUN_FILE)) return null;
  try {
    return readJson(RUN_FILE);
  } catch {
    return null;
  }
}

function saveRun(run) {
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(RUN_FILE, `${JSON.stringify(run, null, 2)}\n`);
}

function pidAlive(pid) {
  if (!pid || !Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function portOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const finish = (ok) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(400);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function whoOwnsPort(port) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);
  try {
    const { stdout } = await exec("ss", ["-ltnp", `sport = :${port}`], { encoding: "utf8" });
    const match = stdout.match(/pid=(\d+)/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function urlsFor(port, target = "local") {
  if (target === "public") {
    return {
      origin: "https://store.uyaohealth.com",
      storeOs: PUBLIC_STORE_OS,
      preview: null,
      cdp: null,
    };
  }
  return {
    origin: `http://127.0.0.1:${port}`,
    storeOs: `http://store.localhost:${port}/`,
    preview: `http://127.0.0.1:${port}/store-os-preview`,
    cdp: `http://127.0.0.1:${cdpPort()}`,
  };
}

async function fetchText(url, { headers = {}, timeoutMs = 8000, method = "GET" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      headers: { accept: "text/html", ...headers },
      signal: controller.signal,
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, url: response.url, body };
  } catch (error) {
    return { ok: false, status: 0, url, body: "", error: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function inspectStoreHtml(body, finalUrl = "") {
  const login = /登入你的藥局|Sign in to your pharmacy/.test(body);
  const workspace = /門市預留單|Store reservations|需要你|Needs you/.test(body);
  const preview = /store-os-preview/.test(finalUrl) || /uYao 示範藥局|林藥師/.test(body);
  const authDisabled = /這個環境尚未設定店家帳號|Store accounts are not configured/.test(body);
  const authEnabled = login && /name="username"/.test(body) && !authDisabled && !/disabled/.test(body);
  return {
    surface: workspace ? (preview ? "preview-workspace" : "workspace") : login ? "login" : "unknown",
    login,
    workspace,
    preview,
    auth: {
      configured: authEnabled,
      disabledNotice: authDisabled,
      mode: workspace ? (preview ? "dev-preview" : "session") : login ? (authDisabled ? "unconfigured" : "login-form") : "unknown",
    },
  };
}

function spawnOwned(command, args, { cwd, logFile, extraEnv = {} }) {
  mkdirSync(path.dirname(logFile), { recursive: true });
  const fd = openSync(logFile, "a");
  const child = spawn(command, args, {
    cwd,
    detached: true,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", fd, fd],
  });
  child.unref();
  return child;
}

async function waitFor(predicate, { timeoutMs, intervalMs = 250, label }) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await predicate();
    if (last) return last;
    await sleep(intervalMs);
  }
  throw new Error(`${label} timed out after ${timeoutMs}ms`);
}

function killOwned(pid) {
  if (!pidAlive(pid)) return { pid, killed: false, reason: "not-running" };
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return { pid, killed: false, reason: "signal-failed" };
    }
  }
  return { pid, killed: true, signal: "SIGTERM" };
}

async function reap(pid, timeoutMs = 4000) {
  const started = Date.now();
  while (pidAlive(pid) && Date.now() - started < timeoutMs) {
    await sleep(150);
  }
  if (!pidAlive(pid)) return { pid, reaped: true };
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      return { pid, reaped: false };
    }
  }
  await sleep(200);
  return { pid, reaped: !pidAlive(pid) };
}

async function ensureSkillDeps() {
  if (existsSync(path.join(SKILL_DIR, "node_modules/playwright-core"))) return;
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("npm", ["ci", "--omit=dev"], {
    cwd: SKILL_DIR,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`npm ci failed in skill dir: ${result.stderr || result.stdout}`);
  }
}

async function ensureWebDeps() {
  if (existsSync(path.join(WEB_DIR, "node_modules/next"))) return;
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("npm", ["ci"], {
    cwd: WEB_DIR,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`npm ci failed in web/: ${result.stderr || result.stdout}`);
  }
}

async function connectBrowser(run) {
  await ensureSkillDeps();
  const { chromium } = await import("playwright-core");
  const browser = await chromium.connectOverCDP(run.urls.cdp);
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();
  return { browser, context, page };
}

async function ariaSnapshot(page) {
  return page.evaluate(() => {
    const interesting = new Set([
      "button", "link", "textbox", "searchbox", "combobox", "checkbox",
      "radio", "switch", "heading", "dialog", "navigation", "listbox",
      "option", "tab", "tablist", "alert", "status", "form", "article",
      "img", "menuitem",
    ]);

    function roleOf(el) {
      const explicit = el.getAttribute("role");
      if (explicit) return explicit;
      const name = el.tagName.toLowerCase();
      if (name === "button") return "button";
      if (name === "a" && el.hasAttribute("href")) return "link";
      if (name === "input") {
        const type = (el.getAttribute("type") || "text").toLowerCase();
        if (type === "email" || type === "text" || type === "password" || type === "search") return "textbox";
        if (type === "checkbox") return "checkbox";
        if (type === "radio") return "radio";
        if (type === "submit" || type === "button") return "button";
      }
      if (name === "textarea" || name === "select") return name === "select" ? "combobox" : "textbox";
      if (/^h[1-6]$/.test(name)) return "heading";
      if (name === "nav") return "navigation";
      if (name === "dialog") return "dialog";
      return "";
    }

    function nameOf(el) {
      const labelled = el.getAttribute("aria-label");
      if (labelled) return labelled.trim();
      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        return labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText ?? "").join(" ").trim();
      }
      if (el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return label.innerText.trim();
      }
      return (el.innerText || el.value || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim();
    }

    const nodes = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.closest("[aria-hidden='true']")) continue;
      const role = roleOf(el);
      if (!interesting.has(role)) continue;
      const name = nameOf(el).slice(0, 180);
      if (!name && role !== "alert" && role !== "status") continue;
      nodes.push({
        role,
        name,
        level: role === "heading" ? Number(el.tagName[1] || 0) || undefined : undefined,
        checked: el.getAttribute("aria-checked") ?? (el.checked === true ? "true" : undefined),
        disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || undefined,
        current: el.getAttribute("aria-current") || undefined,
      });
    }
    return {
      title: document.title,
      url: location.href,
      lang: document.documentElement.lang || null,
      nodes,
    };
  });
}

async function probeLocal(port) {
  const store = await fetchText(`http://127.0.0.1:${port}/`, {
    headers: { host: `store.localhost:${port}` },
  });
  const preview = await fetchText(`http://127.0.0.1:${port}/store-os-preview`);
  return {
    store: { status: store.status, url: store.url, ...inspectStoreHtml(store.body, store.url) },
    preview: { status: preview.status, url: preview.url, ...inspectStoreHtml(preview.body, preview.url) },
  };
}

function usage() {
  return {
    commands: ["doctor", "launch", "drive <path-id>", "screenshot", "snapshot", "cleanup"],
    pathIds: FEATURE_IDS,
  };
}

async function doctor() {
  const port = appPort();
  const run = loadRun();
  const ownedApp = Boolean(run?.app?.owned && pidAlive(run.app.pid));
  const ownedBrowser = Boolean(run?.browser?.owned && pidAlive(run.browser.pid));
  const listening = await portOpen(port);
  const ownerPid = listening ? await whoOwnsPort(port) : null;
  const ownedByUs = Boolean(run?.app?.pid && ownerPid === run.app.pid) || ownedApp;
  let probe = null;
  let error = null;
  if (listening) {
    probe = await probeLocal(port);
  } else if (run?.target === "public") {
    const publicPage = await fetchText(PUBLIC_STORE_OS);
    probe = {
      store: { status: publicPage.status, url: publicPage.url, ...inspectStoreHtml(publicPage.body, publicPage.url) },
      preview: null,
    };
  }

  const worthDriving = Boolean(
    probe?.store?.login || probe?.store?.workspace || probe?.preview?.workspace,
  );
  const payload = {
    ok: worthDriving,
    command: "doctor",
    version: webVersion(),
    build: { web: "uyao-web", next: "dev", node: process.version },
    port,
    listening,
    process: {
      appPid: run?.app?.pid ?? ownerPid,
      browserPid: run?.browser?.pid ?? null,
      ownedApp,
      ownedBrowser,
      ownedByThisRun: ownedByUs,
      alive: ownedApp || listening,
    },
    auth: probe?.store?.auth ?? probe?.preview?.auth ?? { configured: false, mode: "unknown" },
    urls: run?.urls ?? urlsFor(port, run?.target || "local"),
    surface: {
      store: probe?.store?.surface ?? null,
      preview: probe?.preview?.surface ?? null,
    },
    artifacts: [],
    worthDriving,
    error,
  };
  if (!worthDriving) {
    payload.error = listening
      ? "Port is up but the HTML is not storeOS login or workspace"
      : "No storeOS instance on the verification port";
    fail(payload);
  }
  emit(payload);
}

async function launch() {
  const port = appPort();
  const debugPort = cdpPort();
  const existing = loadRun();
  if (existing?.app?.owned && pidAlive(existing.app.pid) && await portOpen(port)) {
    const probe = await probeLocal(port);
    emit({
      ok: true,
      command: "launch",
      reused: true,
      version: webVersion(),
      port,
      urls: existing.urls,
      auth: probe.store.auth,
      artifacts: [],
      ready: true,
      isolation: isolationNotes(port, debugPort),
    });
  }

  if (await portOpen(port)) {
    const owner = await whoOwnsPort(port);
    fail({
      command: "launch",
      error: `Port ${port} is already in use by pid ${owner ?? "unknown"}; refusing to attach to a foreign storeOS instance`,
      port,
      urls: urlsFor(port),
      artifacts: [],
      isolation: isolationNotes(port, debugPort),
    });
  }
  if (await portOpen(debugPort)) {
    fail({
      command: "launch",
      error: `CDP port ${debugPort} is already in use; set VERIFY_UYA_CDP_PORT to isolate`,
      port,
      urls: urlsFor(port),
      artifacts: [],
    });
  }

  await ensureWebDeps();
  mkdirSync(RUN_DIR, { recursive: true });
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const appLog = path.join(RUN_DIR, "next.log");
  const chromeLog = path.join(RUN_DIR, "chrome.log");
  const userDataDir = path.join(RUN_DIR, "chrome-profile");
  rmSync(userDataDir, { recursive: true, force: true });
  mkdirSync(userDataDir, { recursive: true });

  const app = spawnOwned(
    process.execPath,
    [path.join(WEB_DIR, "node_modules/.bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: WEB_DIR,
      logFile: appLog,
      extraEnv: {
        NODE_ENV: "development",
        PORT: String(port),
      },
    },
  );

  try {
    await waitFor(async () => {
      if (!pidAlive(app.pid)) throw new Error("next dev exited before becoming ready");
      const probe = await probeLocal(port);
      return (probe.store.status === 200 && probe.store.login)
        || (probe.preview.status === 200 && probe.preview.workspace)
        ? probe
        : null;
    }, { timeoutMs: READY_TIMEOUT_MS, label: "storeOS ready" });
  } catch (error) {
    killOwned(app.pid);
    await reap(app.pid);
    fail({
      command: "launch",
      error: String(error),
      hint: "Local next dev did not serve storeOS. Public fallback is https://store.uyaohealth.com/ (login only).",
      artifacts: [appLog],
      urls: urlsFor(port),
    });
  }

  const headed = Boolean(process.env.DISPLAY) && process.env.VERIFY_UYA_HEADED === "1";
  const chromeArgs = [
    headed ? null : "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--remote-debugging-address=127.0.0.1`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,1100",
    "about:blank",
  ].filter(Boolean);

  const chrome = spawnOwned(chromeBin(), chromeArgs, {
    cwd: RUN_DIR,
    logFile: chromeLog,
  });

  try {
    await waitFor(async () => {
      if (!pidAlive(chrome.pid)) throw new Error("chrome exited before CDP came up");
      const version = await fetchText(`http://127.0.0.1:${debugPort}/json/version`, { timeoutMs: 800 });
      return version.ok ? version : null;
    }, { timeoutMs: 20_000, label: "chrome CDP ready" });
  } catch (error) {
    killOwned(chrome.pid);
    killOwned(app.pid);
    await reap(chrome.pid);
    await reap(app.pid);
    fail({
      command: "launch",
      error: String(error),
      artifacts: [appLog, chromeLog],
      urls: urlsFor(port),
    });
  }

  const probe = await probeLocal(port);
  const urls = urlsFor(port);
  const run = {
    runId: `verify-uyao-${Date.now()}`,
    startedAt: nowIso(),
    target: "local",
    version: webVersion(),
    app: { pid: app.pid, port, owned: true, log: appLog },
    browser: { pid: chrome.pid, cdpPort: debugPort, owned: true, userDataDir, log: chromeLog },
    urls,
    lastPath: null,
    lastUrl: null,
  };
  saveRun(run);
  emit({
    ok: true,
    command: "launch",
    reused: false,
    version: run.version,
    port,
    urls,
    auth: probe.store.auth,
    process: { appPid: app.pid, browserPid: chrome.pid, ownedByThisRun: true },
    artifacts: [appLog, chromeLog],
    ready: true,
    isolation: isolationNotes(port, debugPort),
  });
}

function isolationNotes(port, debugPort) {
  return {
    appPort: port,
    cdpPort: debugPort,
    profile: path.join(RUN_DIR, "chrome-profile"),
    developerPort: 3100,
    note: "Verification binds 43100/43101 by default so it does not steal a human npm run dev on 3100. A second run needs VERIFY_UYA_PORT and VERIFY_UYA_CDP_PORT. Do not drive a storeOS you did not launch.",
  };
}

async function drive(pathId) {
  if (!FEATURE_IDS.includes(pathId)) {
    fail({ command: "drive", error: `Unknown path-id ${pathId}`, pathIds: FEATURE_IDS, artifacts: [] });
  }
  const run = loadRun();
  if (!run?.urls) {
    fail({ command: "drive", error: "No run state. Call launch first.", artifacts: [] });
  }
  const { browser, page } = await connectBrowser(run);
  const result = await drivePath(pathId, page, run);
  run.lastPath = pathId;
  run.lastUrl = page.url();
  saveRun(run);
  const shot = await captureScreenshot(page, pathId, "drive");
  const snap = await captureSnapshot(page, pathId, "drive");
  await browser.close().catch(() => null);
  emit({
    ok: true,
    command: "drive",
    pathId,
    url: page.url(),
    urls: run.urls,
    observed: result.observed,
    artifacts: [shot, snap],
    steps: result.steps,
  });
}

async function drivePath(pathId, page, run) {
  page.setDefaultTimeout(20_000);
  if (pathId === "store-login") {
    await page.goto(run.urls.storeOs, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /登入你的藥局|Sign in to your pharmacy/ }).waitFor();
    const email = page.locator('input[name="username"]');
    const password = page.locator('input[name="password"]');
    const submit = page.getByRole("button", { name: /登入 Store OS|Sign in to StoreOS/ });
    await email.waitFor();
    const configured = await email.isEnabled();
    return {
      steps: ["opened canonical store host", "saw sign-in heading and email/password fields"],
      observed: {
        heading: await page.getByRole("heading", { level: 2 }).first().innerText(),
        emailEnabled: configured,
        submitEnabled: await submit.isEnabled(),
        brand: await page.locator("strong").filter({ hasText: "uYao Store" }).first().innerText(),
      },
    };
  }

  if (pathId === "reservation-inbox") {
    await page.goto(run.urls.preview, { waitUntil: "domcontentloaded" });
    await page.getByRole("navigation", { name: /工作分類|Work categories/ }).waitFor();
    await page.getByRole("heading", { name: /需要你|Needs you/ }).waitFor();
    await page.getByRole("region", { name: /門市預留單|Store reservations/ }).waitFor();
    await page.getByText("A-482").waitFor();
    await page.getByRole("button", { name: /確認有貨|Confirm in stock/ }).waitFor();
    await page.getByRole("button", { name: /全部工作|All work/ }).click();
    await page.getByRole("heading", { name: /全部工作|All work/ }).waitFor();
    await page.getByText("A-481").waitFor();
    await page.getByRole("button", { name: /需要你|Needs you/ }).click();
    await page.getByRole("heading", { name: /需要你|Needs you/ }).waitFor();
    return {
      steps: [
        "opened /store-os-preview pharmacist workspace",
        "saw Needs you inbox with A-482",
        "opened All work and confirmed A-481 remains listed",
        "returned to Needs you",
      ],
      observed: {
        heading: await page.getByRole("heading", { level: 1 }).first().innerText(),
        pendingCode: "A-482",
        confirmVisible: await page.getByRole("button", { name: /確認有貨|Confirm in stock/ }).isVisible(),
        storeName: await page.getByText("uYao 示範藥局").first().innerText(),
      },
    };
  }

  if (pathId === "account-settings") {
    await page.goto(run.urls.preview, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /開啟帳號與門市設定|Open account and store settings/ }).click();
    const dialog = page.getByRole("dialog", { name: /帳號與門市設定|Account and store settings/ });
    await dialog.waitFor();
    await dialog.getByText("demo@uyaohealth.com").waitFor();
    await dialog.getByRole("combobox", { name: /介面語言|Interface language/ }).waitFor();
    return {
      steps: ["opened preview workspace", "opened account and store settings dialog"],
      observed: {
        title: await dialog.getByRole("heading").first().innerText(),
        operator: "林藥師",
        email: "demo@uyaohealth.com",
        pharmacy: "uYao 示範藥局",
      },
    };
  }

  if (pathId === "support-agent") {
    await page.goto(run.urls.preview, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /支援 Agent · 待命|Support Agent · Standing by/ }).click();
    const support = page.getByRole("region", { name: /uYao 支援|uYao Support/ });
    await support.waitFor();
    await support.getByRole("button", { name: /Store OS 關閉後怎麼收到新工作|How do I receive new work/ }).click();
    await page.locator('[data-role="agent"]').first().waitFor();
    return {
      steps: ["opened Support Agent", "asked the notification FAQ"],
      observed: {
        panel: await support.getAttribute("aria-label"),
        agentReply: await page.locator('[data-role="agent"]').first().innerText(),
      },
    };
  }

  if (pathId === "agent-workboard") {
    await page.goto(run.urls.preview, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /採購 Agent/ }).click();
    await page.getByRole("heading", { name: /葉黃素低庫存處理|lutein/i }).waitFor();
    await page.getByRole("button", { name: /檢查固定草稿|Review the fixed draft/ }).click();
    const dialog = page.getByRole("dialog", { name: /檢查採購草稿|Review procurement draft/ });
    await dialog.waitFor();
    return {
      steps: ["opened Procurement Agent workboard", "opened the fixed restock draft"],
      observed: {
        title: await page.getByRole("heading", { level: 1 }).first().innerText(),
        draftTitle: await dialog.getByRole("heading").first().innerText(),
        notSubmitted: await dialog.getByText(/尚未送出|Not submitted/).innerText(),
      },
    };
  }

  throw new Error(`No driver for ${pathId}`);
}

function artifactDir(pathId) {
  const dir = path.join(EVIDENCE_DIR, pathId || "session");
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function captureScreenshot(page, pathId, label) {
  const file = path.join(artifactDir(pathId), `${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function captureSnapshot(page, pathId, label) {
  const file = path.join(artifactDir(pathId), `${label}.aria.json`);
  const snapshot = await ariaSnapshot(page);
  writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
  return file;
}

async function screenshot() {
  const run = loadRun();
  if (!run?.urls) fail({ command: "screenshot", error: "No run state. Call launch first.", artifacts: [] });
  const pathId = run.lastPath || "session";
  const { browser, page } = await connectBrowser(run);
  if (!run.lastUrl || page.url() === "about:blank") {
    await page.goto(run.urls.preview || run.urls.storeOs, { waitUntil: "domcontentloaded" });
  }
  const file = await captureScreenshot(page, pathId, "screenshot");
  await browser.close().catch(() => null);
  emit({
    ok: true,
    command: "screenshot",
    pathId,
    url: page.url(),
    urls: run.urls,
    artifacts: [file],
  });
}

async function snapshot() {
  const run = loadRun();
  if (!run?.urls) fail({ command: "snapshot", error: "No run state. Call launch first.", artifacts: [] });
  const pathId = run.lastPath || "session";
  const { browser, page } = await connectBrowser(run);
  if (!run.lastUrl || page.url() === "about:blank") {
    await page.goto(run.urls.preview || run.urls.storeOs, { waitUntil: "domcontentloaded" });
  }
  const file = await captureSnapshot(page, pathId, "snapshot");
  await browser.close().catch(() => null);
  emit({
    ok: true,
    command: "snapshot",
    pathId,
    url: page.url(),
    urls: run.urls,
    artifacts: [file],
  });
}

async function cleanup() {
  const run = loadRun();
  const evidenceStill = EVIDENCE_DIR;
  if (!run) {
    emit({
      ok: true,
      command: "cleanup",
      killed: [],
      urls: {},
      artifacts: [],
      evidence: evidenceStill,
      note: "Nothing to tear down; evidence directory was not touched.",
    });
  }
  const killed = [];
  if (run.browser?.owned) {
    killed.push(killOwned(run.browser.pid));
    await reap(run.browser.pid);
  }
  if (run.app?.owned) {
    killed.push(killOwned(run.app.pid));
    await reap(run.app.pid);
  }
  const leftover = {
    app: run.app?.owned ? pidAlive(run.app.pid) : false,
    browser: run.browser?.owned ? pidAlive(run.browser.pid) : false,
  };
  rmSync(path.join(RUN_DIR, "chrome-profile"), { recursive: true, force: true });
  if (existsSync(RUN_FILE)) rmSync(RUN_FILE);
  emit({
    ok: !leftover.app && !leftover.browser,
    command: "cleanup",
    killed,
    leftover,
    urls: run.urls,
    artifacts: [],
    evidence: evidenceStill,
    note: "Killed only pids recorded for this run. Evidence was not deleted.",
  });
}

async function main() {
  const [command, pathId] = process.argv.slice(2);
  try {
    if (command === "doctor") return await doctor();
    if (command === "launch") return await launch();
    if (command === "drive") return await drive(pathId);
    if (command === "screenshot") return await screenshot();
    if (command === "snapshot") return await snapshot();
    if (command === "cleanup") return await cleanup();
    fail({ command: command ?? null, error: "Usage: verify-uyao <doctor|launch|drive|screenshot|snapshot|cleanup>", ...usage(), artifacts: [] });
  } catch (error) {
    fail({
      command: command ?? null,
      error: error instanceof Error ? error.message : String(error),
      artifacts: [],
    });
  }
}

await main();
