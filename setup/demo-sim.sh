#!/usr/bin/env bash
# 沒有硬體時的全鏈路模擬：假掃描 → 本地 spool → 上傳雲端 → /console 看決策。
#
# 用法：
#   BOX_API_KEY=xxx ./setup/demo-sim.sh                          # 打線上
#   UYAO_URL=http://localhost:3100 ./setup/demo-sim.sh           # 打本機（key 可省）
#   STORE=中山伊通藥局 BOX_API_KEY=xxx ./setup/demo-sim.sh       # 換一家店
#
# GTIN 是示範對照表裡的假碼（web/lib/box.ts 的 SIM_GTIN_TO_DRUG）。
# 掃完開 $UYAO_URL/console 看流水。
set -euo pipefail

UYAO_URL="${UYAO_URL:-https://uyao.vercel.app}"
STORE="${STORE:-OK藥師藥局}"
DB="$(mktemp -d)/spool.db"

cd "$(dirname "$0")/.."
# 一定吃本 repo 的程式 —— 機器上可能有別的 checkout 用 pip install -e 佔住了套件名
export PYTHONPATH="$PWD/src"

# 展開一律帶大括號：macOS 內建 bash 3.2 在 UTF-8 locale 下，$VAR 後面
# 直接接全形字元會把變數名解析錯（實測踩過：$STORE） 變成 unbound）。
echo "① 模擬掃描（進貨一批 + 單筆售出）→ ${DB}"
# 三筆連掃 = receiving session；GTIN 對到示範目錄的綠油精/撒隆巴斯/優碘
printf '%s\n' \
  ']d201047123456789011727103110TW881|21SN0001' \
  ']d201047123456789021728063010TW882' \
  ']d201047123456789031727123110TW883' \
  | python3 -m pharmabox.dev_cli --db "$DB" --gap 3

sleep 4  # 讓 session 收斂

echo "② 單筆售出（間隔夠久，會被判成 dispensing）"
printf ']d20104712345678901\n' | python3 -m pharmabox.dev_cli --db "$DB" --gap 3

echo "③ 上傳 → ${UYAO_URL}/api/box/ingest（device = ${STORE}）"
PHARMABOX_API_URL="$UYAO_URL/api/box/ingest" \
PHARMABOX_API_KEY="${BOX_API_KEY:-}" \
  python3 -m pharmabox.dev_cli --db "$DB" --drain --device "$STORE"

echo
echo "完成。開 ${UYAO_URL}/console 看決策流水；接著在店頁做一筆預留，整條線就串起來了。"
