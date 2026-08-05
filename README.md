# PharmaBox

藥局掃描器中間人盒子（Pointy-style）。串在「藥局現有掃描器 → 藥局電腦」之間：
對電腦模擬同一支 HID 鍵盤掃描器原樣轉發（POS 無感），同時側錄每筆掃描 →
解析（GS1 DataMatrix 效期/批號、EAN-13、健保碼）→ 進貨/調劑 session 分類 →
SQLite spool → 斷網不掉單的批次上傳。

```
藥局掃描器 ──USB──▶ [Pi 4: capture → forward] ──USB-C gadget──▶ 藥局電腦
                          │
                          └─ decode → gs1 parse → classify → spool ─▶ API
```

## Dev mode（Mac，不用 Pi）

掃描器插筆電就是鍵盤，直接對 CLI 掃（或用 echo 模擬；`|` 代表 GS 分隔符）：

一次性把套件裝成可匯入（之後所有指令都不用 `PYTHONPATH=src` 前綴）：

```bash
python3 -m pip install -e .
```

```bash
python3 -m pharmabox.dev_cli
echo '(01)04712345678901(17)271031(10)B7' | python3 -m pharmabox.dev_cli
python3 -m pytest
```

## Pi 部署（P2，到手硬體後）

1. `config.txt` 加 `dtoverlay=dwc2`，`cmdline.txt` 加 `modules-load=dwc2`
2. `pip install evdev`；repo 放 `/opt/pharmabox`
3. `cp setup/pharmabox.service /etc/systemd/system/ && systemctl enable --now pharmabox`
4. 設定寫 `/etc/pharmabox.env`（`PHARMABOX_API_URL` / `PHARMABOX_SCANNER` 等，見 `daemon.py` docstring）

## 模組

| 檔案 | 職責 |
|---|---|
| `gs1.py` | AIM prefix / GS1 AI 解析（01/17/10/21…）、效期 YYMMDD→date（DD=00→月底）、EAN/健保碼分類 |
| `keymap.py` | 掃描器 keystroke → 字串（含 Ctrl+] → GS）、evdev→HID usage 表 |
| `forwarder.py` | /dev/hidg0 逐鍵轉發；主機拔線不影響側錄 |
| `classify.py` | session 分類：含效期→進貨；≥5 連掃→進貨；孤立→調劑 |
| `spool.py` | SQLite queue + 指數退避上傳（fire-and-forget with retry） |
| `daemon.py` | Pi 主程式（evdev grab → 全 pipeline） |
| `dev_cli.py` | stdin 模擬掃描器，Mac 上開發整條 pipeline |
| `prospects.py` | 藥局獲客名單：FDA 開放資料 → 過濾區域 → 排除連鎖 → 電訪 CSV |
| `nhi.py` | 健保特約資料：醫事機構代碼（穩定 ID）、調劑時段、合約終止偵測 |
| `places.py` | Google Places 補座標／營業時間／歇業狀態（需 API 金鑰） |
| `seed.py` | 三份資料合成消費端的 `web/lib/stores.generated.json` |

## 藥局獲客名單

盒子要插進去的是「自己能決定的店」，所以名單預設排除連鎖。資料來自食藥署
[藥局基本資料](https://data.gov.tw/dataset/6134) 開放資料集 —— 不爬網頁。

```bash
python3 -m pharmabox.prospects -o data/prospects.csv
python3 -m pharmabox.prospects --districts 大安區,松山區 --refresh
```

### 匯入消費端

```bash
python3 -m pharmabox.seed          # → web/lib/stores.generated.json
export GOOGLE_MAPS_API_KEY=...                    # 選配：補座標與營業時間
python3 -m pharmabox.places
python3 -m pharmabox.seed          # 再跑一次就吃得到座標
```

沒有金鑰也產得出 seed，只是沒有座標（距離與地圖不顯示），營業時段退回
健保署的粗粒度資料。**健保「固定看診時段」不是營業時間** —— 那是藥師可
調劑健保處方的時段，所以站上標題會跟著資料來源改寫成「健保調劑時段」。

健保合約終止日已過的有 20 家。那**不等於歇業**（可能只是退出健保仍賣成藥），
所以文案只寫「合約已終止，建議先電話確認」，真正的歇業判斷要靠 Places 的
`businessStatus`。

連鎖名單（`NATIONAL_CHAINS` / `REGIONAL_CHAINS`）是**人工策展**不是自動推導：
純用名稱出現頻率會把「健康／安康／永安／長青」這類吉祥字撞名的獨立藥局誤判成
連鎖，`tests/test_prospects.py` 有回歸測試擋這件事。

## 消費端 Web

盒子掃出來的庫存最後長成什麼樣子：`web/`（Next.js 14，`specs/web-marketplace.md` 的 v1 實作）。

```bash
cd web && npm install && npm run dev   # http://localhost:3100
```

## 已知限制 / 待驗證

- 掃描器需設定為 keyboard mode 且輸出 GS 分隔符（多數 2D 槍預設 Ctrl+]，各廠牌要驗）
- 1D 雷射槍讀不到 DataMatrix → 效期永遠不會流過盒子，需換 2D 槍
- 中文/特殊鍵盤 layout 掃描器後綴未處理（假設 US layout + Enter 後綴）
- Pi gadget mode 未實機驗證（P2）
