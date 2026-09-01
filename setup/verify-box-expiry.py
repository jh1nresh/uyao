#!/usr/bin/env python3
"""跨語言合約驗證：Python ParsedScan -> /api/box/ingest -> 雲端批號效期。

為什麼需要這支：expiry (AI 17) 與 batch (AI 10) 曾經在這個邊界被靜默
丟掉 —— Python 端一直有送，但 route.ts 的型別裡沒有這兩個欄位，迴圈
只讀 gtin。兩邊的單元測試各自都是綠的，因為沒有任何測試跨過那條線。

所以這支不用 mock：真的 gs1.py 解析、真的 spool 排隊、真的 HTTP 打進
API、再從 /console 讀回雲端算出來的退貨窗口。

用法：
    # 先在另一個終端起 web/：npm run dev -- --port 3100
    python3 setup/verify-box-expiry.py
    UYAO_URL=https://uyao.vercel.app BOX_API_KEY=xxx python3 setup/verify-box-expiry.py

離開碼 0 = 合約完好；非 0 = 有一段斷了，訊息會指出斷在哪。
"""
from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import time
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src"))

from pharmabox.gs1 import classify_and_parse  # noqa: E402
from pharmabox.spool import EventSpool  # noqa: E402

BASE = os.environ.get("UYAO_URL", "http://localhost:3100").rstrip("/")
# 藥局 slug 是中文店名（見 web/lib/stores.generated.json），不是行政區 slug。
# 用錯會拿到 unbound=true：事件收下但不歸屬任何藥局。
STORE = os.environ.get("STORE_SLUG", "中山藥局")
GS = "\x1d"

# 示範 GTIN + AI 17 效期 270601 + AI 10 批號 TW881。
# AI 17 固定 6 碼不需分隔；AI 10 可變長度，用 GS 收尾才符合 GS1。
RAW = "]d2" + "01" + "04712345678901" + "17" + "270601" + "10" + "TW881" + GS

EXPECT_EXPIRY = "2027-06-01"
EXPECT_BATCH = "TW881"
# 退貨窗口 = 效期前 180 天（lib/lots.ts 的 DEFAULT_RETURN_WINDOW_DAYS）
EXPECT_WINDOW_CLOSES = "2026-12-03"

failures: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


def get(path: str, timeout: int = 25) -> str:
    req = urllib.request.Request(f"{BASE}{path}", headers={"user-agent": "verify-box-expiry"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


print("=" * 70)
print("1. Python parser（真的 gs1.py）")
print("=" * 70)
payload = classify_and_parse(RAW).to_dict()
print(json.dumps(payload, ensure_ascii=False, indent=2))
check("symbology = gs1_datamatrix", payload["symbology"] == "gs1_datamatrix", str(payload["symbology"]))
check("GTIN 解出", payload["gtin"] == "04712345678901", str(payload["gtin"]))
check(f"AI 17 效期 -> ISO {EXPECT_EXPIRY}", payload["expiry"] == EXPECT_EXPIRY, str(payload["expiry"]))
check(f"AI 10 批號 -> {EXPECT_BATCH}", payload["batch"] == EXPECT_BATCH, str(payload["batch"]))

if failures:
    print("\nparser 就沒過，不往下打 API")
    sys.exit(1)

print()
print("=" * 70)
print("2. 真的 spool -> 真的 HTTP -> /api/box/ingest")
print("=" * 70)

spool = EventSpool(os.path.join(tempfile.mkdtemp(), "spool.db"))
spool.append(time.time(), "receiving", payload)
pending = spool.pending(10)
print(f"  spool pending={len(pending)}")

# Uploader 的線上 wire format，一模一樣
body = {
    "device_id": STORE,
    "events": [
        {
            "id": r["id"],
            "ts": r["ts"],
            "kind": r["kind"],
            "payload": json.loads(r["payload"]) if isinstance(r["payload"], str) else r["payload"],
        }
        for r in pending
    ],
}

headers = {"content-type": "application/json"}
if os.environ.get("BOX_API_KEY"):
    headers["authorization"] = f"Bearer {os.environ['BOX_API_KEY']}"

req = urllib.request.Request(
    f"{BASE}/api/box/ingest", data=json.dumps(body).encode(), headers=headers, method="POST"
)
with urllib.request.urlopen(req, timeout=20) as r:
    resp = json.loads(r.read())
print("  response:", json.dumps(resp, ensure_ascii=False))

check("API 收下事件", resp.get("accepted") == 1, str(resp.get("accepted")))
if resp.get("unbound"):
    print(f"  ！device_id「{STORE}」沒有綁定藥局 —— 用 STORE_SLUG 指定正確的中文店名")
check("GTIN 對到藥品", resp.get("matched") == 1, str(resp.get("matched")))
check("效期被存下來（lotsRecorded=1）", resp.get("lotsRecorded") == 1, str(resp.get("lotsRecorded")))

print()
print("=" * 70)
print("3. 從 /console 讀回雲端算出的退貨窗口")
print("=" * 70)
time.sleep(1.0)  # logConsole 是 fire-and-forget
# /console 會 308 到 /zh-tw/console，直接打最終路徑
html = get("/zh-tw/console")
text = re.sub(r"<[^>]+>", " ", html)

for line in [ln.strip() for ln in re.split(r"\s{2,}", text) if EXPECT_BATCH in ln][:3]:
    print("   ", line[:170])

check(f"console 流水出現批號 {EXPECT_BATCH}", EXPECT_BATCH in text)
check(f"流水含效期 {EXPECT_EXPIRY}", EXPECT_EXPIRY in text)
check(f"流水含退貨窗口關閉日 {EXPECT_WINDOW_CLOSES}", EXPECT_WINDOW_CLOSES in text)

print()
print("=" * 70)
print("RESULT:", "ALL PASS" if not failures else f"{len(failures)} FAILED -> {failures}")
print("=" * 70)
sys.exit(1 if failures else 0)
