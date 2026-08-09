#!/usr/bin/env bash
# 錄影/展示前的歸零：清掉 console 流水與掃描訊號，讓 /console 從空白開始。
#
# 只刪 demo 產物（scan:* 與 console:log），**不碰**預留（r:/c:）、綁定（bind:）、
# 放鳥計數（noshow:）—— 那些可能是真資料。
#
# 讀 web/.env.local 的 KV 設定；沒設 KV 的環境（純本機檔案）直接清 .data/。
set -euo pipefail
cd "$(dirname "$0")/../web"

node -e '
const fs = require("fs");
const env = {};
try {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z_]+)="?([^"]*)"?$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
} catch { /* 沒有 .env.local */ }

const url = env.KV_REST_API_URL, token = env.KV_REST_API_TOKEN;
if (!url || !token) {
  // 檔案 driver：直接刪對應檔案
  const dir = ".data/kv";
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith("scan:") || f.startsWith("console:")) fs.unlinkSync(`${dir}/${f}`);
    }
  }
  console.log("已清空本機檔案 KV 的示範資料");
  process.exit(0);
}

async function cmd(args) {
  const r = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`KV ${r.status}`);
  return (await r.json()).result;
}
(async () => {
  const scans = (await cmd(["KEYS", "scan:*"])) ?? [];
  for (const k of scans) await cmd(["DEL", k]);
  await cmd(["DEL", "console:log"]);
  console.log(`已清除 ${scans.length} 個掃描訊號 + console 流水，/console 現在是空白`);
})();
'
