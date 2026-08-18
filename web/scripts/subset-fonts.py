#!/usr/bin/env python3
"""
把 Noto Sans TC／Noto Serif TC 依「站上實際用到的字」subset 成自架 woff2。

為什麼要這個：設計稿要 Noto Sans TC 四個字重（400/500/700/900）。直接走
Google Fonts <link>（web-v1 原本的做法）會拉進 430 個 @font-face、約 134KB
gzip 的 render-blocking CSS —— 繁中字型是按 unicode-range 切成上百塊的。

每個字型家族輸出兩個檔：

    core — 公司首頁那條路徑上會出現的字（見 CORE_SOURCES）
    ext  — 其餘全站字符（藥名、藥局名、guides 內文…）

`--font-sans` / `--font-serif` 在 globals.css 把兩個家族串成 fallback chain
（core 在前、ext 在後）。瀏覽器只有在頁面真的需要某個字時才會去抓那個檔，
所以首頁只下載 core，消費端頁面才會再抓 ext。切錯的後果只是多抓一個檔，
不會缺字 —— fallback chain 保證顯示正確。

用法：
    python3 scripts/subset-fonts.py

前置：pip install "fonttools[woff]" brotli

⚠️ 字符集是從 app/ components/ lib/ 的原始碼掃出來的（`lib/data.ts` 的藥名、
藥局名都在裡面）。**改文案或加藥品資料就要重跑**，否則新字會掉回系統中文字型。
使用者在搜尋框自己打的字本來就不在 subset 內 —— 那一格會用系統字型，是刻意的取捨。
"""

from __future__ import annotations

import re
import subprocess
import sys
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont

WEB_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = WEB_ROOT / "app" / "fonts"
CACHE = WEB_ROOT / ".font-cache"
# instance_wght：把可變字型固定成單一字重的靜態字型，wght 軸的 delta 表就整個
# 拿掉。serif 只服務 .editorial-display（globals.css 裡唯一的 --font-serif 使用
# 者，font-weight: 600），所以固定成 600 之後檔案少一半，畫面完全不變。
# sans 介面上要 400/500/700/900 四個字重，必須保持可變。
FONTS = (
    (
        "NotoSansTC-var.ttf",
        "https://github.com/google/fonts/raw/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf",
        "noto-sans-tc",
        None,
    ),
    (
        "NotoSerifTC-var.ttf",
        "https://github.com/google/fonts/raw/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf",
        "noto-serif-tc",
        600,
    ),
)
SOURCE_DIRS = ("app", "components", "lib")
# core 的來源刻意只有「公司首頁自己渲染的檔案」，不含 lib/：lib/seo.ts、lib/aeo.ts
# 那些字串大多是 JSON-LD 與 meta，不會變成畫面上的字，掃進來只會讓 core 白白變大。
# 對照過 production /zh-tw 與 /en 的實際可見文字：437 個字元全部落在這份 core 裡。
CORE_SOURCES = (
    "app/page.tsx",
    "app/en/page.tsx",
    "components/landing",
    "components/avatar-lab",
    "components/BrandLogo.tsx",
    "components/BrandMark.tsx",
    "components/ThemeToggle.tsx",
)
# .json 一定要包含：店名、地址、巷弄都在 lib/stores.generated.json，
# 只掃 .ts/.tsx 會讓整批藥局名掉回系統字型（804f344 導入真資料時漏掉這件事）。
SOURCE_SUFFIXES = {".ts", ".tsx", ".json"}

# 介面上會出現、但不一定寫死在原始碼字串裡的符號
EXTRA_CHARS = (
    "、。，．・…—–－「」『』（）〈〉！？：；％＄＃＠　"
    "●○？◎⌕十→←·※0123456789"
)

COMMENT_RE = re.compile(r"/\*.*?\*/|//[^\n]*", re.S)


def source_files(roots: tuple[str, ...]) -> list[Path]:
    files: list[Path] = []
    for entry in roots:
        target = WEB_ROOT / entry
        if target.is_file():
            files.append(target)
        elif target.is_dir():
            files.extend(
                p for p in target.rglob("*") if p.is_file() and p.suffix in SOURCE_SUFFIXES
            )
    return files


def collect_chars(roots: tuple[str, ...]) -> set[str]:
    """原始碼裡出現過的字元 + 完整 ASCII 可見字元（註解不算，不會被 render）。"""
    chars: set[str] = {chr(c) for c in range(0x20, 0x7F)}
    chars.update(EXTRA_CHARS)
    for path in source_files(roots):
        text = path.read_text(encoding="utf-8")
        # JSON 沒有註解，而且值裡面有 "https://" —— 拿註解規則去掃會把
        # 整行後面吃掉，所以只對原始碼做這件事。
        if path.suffix != ".json":
            text = COMMENT_RE.sub(" ", text)
        chars.update(text)
    return {c for c in chars if c.isprintable() or c == " "}


def fetch_variable_font(cache_name: str, url: str) -> Path:
    CACHE.mkdir(exist_ok=True)
    dest = CACHE / cache_name
    if not dest.exists():
        print(f"下載 {url} …")
        urllib.request.urlretrieve(url, dest)
    print(f"來源字型：{dest.name} ({dest.stat().st_size / 1_000_000:.1f} MB)")
    return dest


def build(var_font: Path, text_file: Path, out: Path, instance_wght: int | None) -> None:
    # 先 subset 成 ttf；要固定字重的話還得再過 instancer，woff2 壓縮放最後。
    subset_ttf = CACHE / f"{out.stem}-subset.ttf"
    subprocess.run(
        [
            sys.executable, "-m", "fontTools.subset", str(var_font),
            f"--text-file={text_file}",
            # 用預設 layout features：--layout-features=* 會多帶一堆
            # 這站用不到的 GPOS/GSUB
            f"--output-file={subset_ttf}",
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )

    source = subset_ttf
    if instance_wght is not None:
        static_ttf = CACHE / f"{out.stem}-static.ttf"
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.varLib.instancer", str(subset_ttf),
                f"wght={instance_wght}",
                "-o", str(static_ttf),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        source = static_ttf

    font = TTFont(source)
    font.flavor = "woff2"
    font.save(out)
    font.close()


def main() -> int:
    all_chars = collect_chars(SOURCE_DIRS)
    core_chars = collect_chars(CORE_SOURCES) & all_chars
    ext_chars = all_chars - core_chars
    print(f"字符集：core {len(core_chars)}、ext {len(ext_chars)}（合計 {len(all_chars)}）")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(exist_ok=True)

    slices = {}
    for name, chars in (("core", core_chars), ("ext", ext_chars)):
        path = CACHE / f"glyphs-{name}.txt"
        path.write_text("".join(sorted(chars)), encoding="utf-8")
        slices[name] = path

    for cache_name, url, stem, instance_wght in FONTS:
        var_font = fetch_variable_font(cache_name, url)
        for name, text_file in slices.items():
            out = OUT_DIR / f"{stem}-{name}.woff2"
            build(var_font, text_file, out, instance_wght)
            kind = f"靜態 wght={instance_wght}" if instance_wght is not None else "可變字型"
            print(f"完成 — {out.name} {out.stat().st_size / 1024:.0f} KB（{kind}）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
