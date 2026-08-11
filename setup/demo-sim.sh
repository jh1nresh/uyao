#!/usr/bin/env bash
# 沒有硬體時的全鏈路模擬：假進貨掃描 → 本地 spool → 上傳雲端 → /en/console 看決策。
#
# 用法：
#   BOX_API_KEY=xxx ./setup/demo-sim.sh                          # 打線上
#   UYAO_URL=http://localhost:3100 ./setup/demo-sim.sh           # 打本機（key 可省）
#   STORE=美得心藥局 BOX_API_KEY=xxx ./setup/demo-sim.sh         # 換一家店
#   VERBOSE=1 ./setup/demo-sim.sh                                # 印原始 JSON（工程證據）
#   DEMO_LANG=zh ./setup/demo-sim.sh                             # 改回中文終端輸出
#
# GTIN 是示範對照表裡的假碼（web/lib/box.ts 的 SIM_GTIN_TO_DRUG）。
# 掃完開 $UYAO_URL/en/console 看流水。
#
# 預設輸出是給 demo 錄影看的人話版；VERBOSE=1 才印 parser 原始 JSON。
set -euo pipefail

UYAO_URL="${UYAO_URL:-https://uyao.vercel.app}"
STORE="${STORE:-中山藥局}"
VERBOSE="${VERBOSE:-0}"
DEMO_LANG="${DEMO_LANG:-en}"
export DEMO_LANG
DB="$(mktemp -d)/spool.db"

cd "$(dirname "$0")/.."
# 一定吃本 repo 的程式 —— 機器上可能有別的 checkout 用 pip install -e 佔住了套件名
export PYTHONPATH="$PWD/src"

# dev_cli 的輸出翻成人話：JSON 掃描行 → 「藥名・批號・效期」，
# session/spool/upload 狀態行 → 錄影用英文結論。VERBOSE=1 原樣放行。
# 藥名對照與 web/lib/box.ts 的 SIM_GTIN_TO_DRUG + web/lib/data.ts 同步。
humanize() {
  if [ "$VERBOSE" = "1" ]; then cat; return; fi
  python3 -u -c "$(cat <<'PYEOF'
import json, os, re, sys

EN = os.environ.get("DEMO_LANG", "en") == "en"
NAMES = ({
    "04712345678901": "Green Oil 10ml",
    "04712345678902": "Salonpas-AE Patch",
    "04712345678903": "Povidone-Iodine Ointment",
    "04712345678904": "Mentholatum AD Ointment",
    "04712345678905": "White Flower Oil No. 5",
} if EN else {
    "04712345678901": "綠油精 10ml", "04712345678902": "撒隆巴斯-愛涼 貼布",
    "04712345678903": "優碘軟膏", "04712345678904": "曼秀雷敦 AD 軟膏",
    "04712345678905": "白花油 5 號",
})
KINDS = {"receiving": "receiving" if EN else "進貨", "dispensing": "dispensing" if EN else "售出"}

for line in sys.stdin:
    s = line.rstrip("\n").strip()
    if s.startswith("{"):
        scan = json.loads(s)
        gtin = scan.get("gtin") or ""
        parts = ["   " + NAMES.get(gtin, gtin or ("Unknown item" if EN else "未知品項"))]
        if scan.get("batch"):
            parts.append(("LOT " if EN else "批號 ") + scan["batch"])
        if scan.get("expiry"):
            parts.append(("EXP " if EN else "效期 ") + scan["expiry"])
        print("  ".join(parts))
        continue
    m = re.search(r"session finalized: (\w+) \((\d+) scans?\)", s)
    if m:
        kind = KINDS.get(m.group(1), m.group(1))
        print(("   ⇒ Classified as a " + kind + " session (" + m.group(2) + " scans)" if EN else "   ⇒ 判定為「" + kind + "」session（" + m.group(2) + " 筆掃描）"))
        continue
    m = re.search(r"spool: (\d+) events pending", s)
    if m:
        print(("   Saved to the local offline spool (" + m.group(1) + " events pending upload)" if EN else "   已存本機 spool・斷網也不掉單（待上傳 " + m.group(1) + " 筆）"))
        continue
    m = re.search(r"uploaded (\d+) events", s)
    if m:
        print(("   ✓ Uploaded all " + m.group(1) + " events; receiving and expiry signals updated" if EN else "   ✓ " + m.group(1) + " 筆全部上傳成功・庫存與效期已更新"))
        continue
    print(line.rstrip("\n"))
PYEOF
)"
}

if [ "$DEMO_LANG" = "en" ]; then
  echo "① RECEIVING SCAN — 3 packages (captured even while offline)"
else
  echo "① 進貨掃描 — 3 盒（box 離線也照收）"
fi
# 三筆連掃 = receiving session；GTIN 對到示範目錄的綠油精/撒隆巴斯/優碘。
# 展開一律帶大括號：macOS 內建 bash 3.2 在 UTF-8 locale 下，$VAR 後面
# 直接接全形字元會把變數名解析錯（實測踩過：$STORE） 變成 unbound）。
if [ "$VERBOSE" = "1" ]; then echo "spool → ${DB}"; fi
printf '%s\n' \
  ']d201047123456789011727103110TW881|21SN0001' \
  ']d201047123456789021728063010TW882' \
  ']d201047123456789031727123110TW883' \
  | python3 -u -m pharmabox.dev_cli --db "$DB" --gap 3 2>&1 | humanize

echo
if [ "$DEMO_LANG" = "en" ]; then
  echo "② UPLOAD → ${STORE} (${UYAO_URL})"
else
  echo "② 上傳 → ${STORE}（${UYAO_URL}）"
fi
PHARMABOX_API_URL="$UYAO_URL/api/box/ingest" \
PHARMABOX_API_KEY="${BOX_API_KEY:-}" \
  python3 -u -m pharmabox.dev_cli --db "$DB" --drain --device "$STORE" 2>&1 | humanize

echo
if [ "$DEMO_LANG" = "en" ]; then
  echo "Done. Open ${UYAO_URL}/en/console, then reserve from ${UYAO_URL}/en/store/${STORE}/preview."
else
  echo "完成。開 ${UYAO_URL}/zh-tw/console 看決策流水；接著到 ${UYAO_URL}/zh-tw/store/${STORE}/preview 做一筆預留。"
fi
