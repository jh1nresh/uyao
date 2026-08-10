#!/usr/bin/env python3
"""
把 Noto Sans TC／Noto Serif TC 依「站上實際用到的字」subset 成自架 woff2。

為什麼要這個：設計稿要 Noto Sans TC 四個字重（400/500/700/900）。直接走
Google Fonts <link>（web-v1 原本的做法）會拉進 430 個 @font-face、約 134KB
gzip 的 render-blocking CSS —— 繁中字型是按 unicode-range 切成上百塊的。

只包實際用到的字之後，sans／serif 各留一個可變字型檔；介面不必下載完整 CJK 字庫。

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

WEB_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = WEB_ROOT / "app" / "fonts"
CACHE = WEB_ROOT / ".font-cache"
FONTS = (
    (
        "NotoSansTC-var.ttf",
        "https://github.com/google/fonts/raw/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf",
        "noto-sans-tc-var.woff2",
    ),
    (
        "NotoSerifTC-var.ttf",
        "https://github.com/google/fonts/raw/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf",
        "noto-serif-tc-var.woff2",
    ),
)
SOURCE_DIRS = ("app", "components", "lib")
# .json 一定要包含：店名、地址、巷弄都在 lib/stores.generated.json，
# 只掃 .ts/.tsx 會讓整批藥局名掉回系統字型（804f344 導入真資料時漏掉這件事）。
SOURCE_SUFFIXES = {".ts", ".tsx", ".json"}

# 介面上會出現、但不一定寫死在原始碼字串裡的符號
EXTRA_CHARS = (
    "、。，．・…—–－「」『』（）〈〉！？：；％＄＃＠　"
    "●○？◎⌕十→←·※0123456789"
)

COMMENT_RE = re.compile(r"/\*.*?\*/|//[^\n]*", re.S)


def collect_chars() -> set[str]:
    """原始碼裡出現過的字元 + 完整 ASCII 可見字元（註解不算，不會被 render）。"""
    chars: set[str] = {chr(c) for c in range(0x20, 0x7F)}
    chars.update(EXTRA_CHARS)
    for d in SOURCE_DIRS:
        for path in (WEB_ROOT / d).rglob("*"):
            if path.is_file() and path.suffix in SOURCE_SUFFIXES:
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


def main() -> int:
    chars = collect_chars()
    print(f"字符集：{len(chars)} 個字元")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(exist_ok=True)

    text_file = CACHE / "glyphs.txt"
    text_file.write_text("".join(sorted(chars)), encoding="utf-8")

    # 保留 wght 軸不切成靜態實例：sans 用於介面，serif 只用於敘事標題；
    # 兩者共用實際字符集，避免載入完整 CJK 字型。
    for cache_name, url, output_name in FONTS:
        var_font = fetch_variable_font(cache_name, url)
        out = OUT_DIR / output_name
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(var_font),
                f"--text-file={text_file}",
                "--flavor=woff2",
                # 用預設 layout features：--layout-features=* 會多帶一堆
                # 這站用不到的 GPOS/GSUB
                f"--output-file={out}",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        print(f"完成 — {out.name} {out.stat().st_size / 1024:.0f} KB（可變字型）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
