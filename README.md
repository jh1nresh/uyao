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

```bash
PYTHONPATH=src python3 -m pharmabox.dev_cli
echo '(01)04712345678901(17)271031(10)B7' | PYTHONPATH=src python3 -m pharmabox.dev_cli
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
