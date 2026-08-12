# 硬體選型：盒子接誰的掃描器

> 2026-08-06 · 前置：`box-p1.md`（軟體 pipeline 已完成）

## 主線不變：用藥局自己的掃描器

盒子串在「藥局現有掃描器 → 藥局電腦」中間，對電腦模擬成同一支 HID 鍵盤掃描器。
**藥局不用換設備、不用改動作**，這是這個產品能裝進去的唯一理由。賣掃描器是備案，
不是產品。

## 四格：每家藥局裝什麼，由現況決定

P0 進店時除了數 DataMatrix 覆蓋率，就是把這家店分進其中一格 —— 這決定 BOM。

| 藥局現況 | 方案 | 新增動作 | BOM |
|---|---|---|---|
| 有 2D 掃描器、進貨會掃 | Pi 盒子串中間 | 零 | Pi 4 |
| 掃描器是 1D 雷射槍 | 盒子照裝（銷售流照收）；升級成 2D 槍才拿得到效期 | 零 | Pi 4 + 2D 槍 |
| 進貨時不掃 | 拆箱桌放獨立掃描站 | +1 動作 | ESP32-S3 + GM805 |
| 不肯讓我們碰 POS 線 | 純掃描站，完全不接觸他們的設備 | +1 動作 | ESP32-S3 + GM805 |

第一格成本最低、體驗最好 —— **銷售時優先找這種**（電訪問一句掃描器型號就知道）。

已經支援的中間態：藥局有**閒置舊掃描器**時直接插 Pi 當掃描站，連 GM805 都不用買。
`daemon.py` 不設 `PHARMABOX_HIDG` 就走 `NullForwarder`（只側錄、不轉發），
standalone 模式是既有能力不是新功能。

## 為什麼 inline 盒子只能是 Pi

需要**同時**當 USB host（收掃描器）和 USB device（對電腦裝成鍵盤）。
單一原生 USB 口的 MCU 物理上做不到：

| 板子 | 結論 |
|---|---|
| **Pi 4** | ✅ USB-A host + USB-C gadget mode，`setup/gadget-setup.sh` 已寫 |
| Pi Zero | ❌ 只有一個 OTG 口 |
| ESP32-S3 | ❌ 單 USB 口 |
| **Tuya T5AI / BK7258** | ❌ 單 USB 口（板上 Type-C 走 CH343 序列晶片，不是真 USB device）。它的 USB host stack 主要為 UVC 相機做，HID 鍵盤 host 未驗證 |

這個限制只針對「保留藥局現有 USB 掃描器」的透明中介盒。ESP32-S3 可以用於兩種較便宜的形態：

- **獨立掃描站**：GM805 走 UART 進 ESP32-S3，再由 Wi-Fi 上傳；
- **替代／新增掃描器**：GM805 走 UART 進 ESP32-S3，ESP32-S3 唯一的原生 USB 口對 POS 模擬 HID keyboard。

第二種技術上可行，但它要求藥局改用我們的掃描頭或多做一次掃描，不是「原設備、原動作零改變」的
transparent inline 主線，而且目前尚未實作／實機驗證。

### Pi 4 inline 供電陷阱

Pi 4 的 USB-C 同時是 gadget data port 與主要電源輸入。接到藥局電腦做 HID gadget 時，
不可再讓外部電源與電腦 USB 的 5V 直接並聯。第一台 MVP 採兩階段：

1. **standalone demo**：官方 USB-C 電源供電，掃描器接 USB-A，只側錄／上傳，不接下游電腦；
2. **inline demo**：Pi 改由隔離的 PoE HAT 供電，USB-C→電腦的 data cable 加「阻斷 5V、保留 data」的 power blocker。

不要用一般 Y-cable，也不要在未確認 VBUS 隔離時同時接 USB-C host 與外部 5V。GPIO 5V
供電繞過保護，只適合懂電源風險的 bench test，不作為第一台 MVP 的預設方案。
PoE + data-only cable 這組供電方式目前也還沒有實機驗證；進店前必須先量測沒有 VBUS
回灌，並完成斷電重啟與 HID 重新枚舉測試。

官方依據：[Raspberry Pi USB gadget mode](https://www.raspberrypi.com/news/usb-gadget-mode-in-raspberry-pi-os-ssh-over-usb/)、
[ESP32-S3 USB Device Stack](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/usb_device.html)。

## Tuya 的評估結論

TuyaOpen 開源、板便宜、內建麥克風喇叭相機，**但兩個理由不用**：

1. inline 盒子過不了上面那關
2. 掃描站的位置有更好的選擇 —— **ESP-IDF + ESP32-S3**：同樣開源無雲鎖定、
   台美都能買（NCC + FCC 齊）、社群大一個量級，而且我們本來就會寫 ESP32 韌體

紅線：真要用 Tuya 板也**絕不接 Tuya 雲**。藥局進出貨資料過中國 IoT 雲，
資安和觀感都是自殺。

## 掃描站規格（第三、四格才做）

```
藥盒 DataMatrix → GM805（2D，UART）→ 4 條杜邦線 → ESP32-S3 → WiFi → API
                                                      └→ MAX98357 + 喇叭（選配語音回饋）
```

- **接線**：VCC→3V3、GND→GND、**TX↔RX 交叉**（模組 TX 進 ESP32 RX）。整組吃 USB-C 供電
- **唯一的坑**：GM805 出廠多半是 USB 模式，要掃說明書裡的設定條碼切成 TTL/UART 輸出
- **韌體只做一件事**：UART 收字串 → POST 到現有 API，格式與 `spool.py` 上傳一致 ——
  雲端不需要分辨資料來自 Pi 還是掃描站
- 價格待詢（GM805、2D 槍、ESP32-S3 都尚未實際下單）

## 不做

- 自製 PCB（買得到的整合板夠用，量產降本是 100 台以後的事）
- 相機 OCR 站 —— 只有 P0 測出 DataMatrix 覆蓋率過低才啟動
- Tuya 雲 / 任何綁雲的 IoT 平台
