#!/usr/bin/env python3
"""
把 Noto Sans TC／Noto Serif TC 依「站上實際用到的字」subset 成自架 woff2。

為什麼要這個：設計稿要 Noto Sans TC 四個字重（400/500/700/900）。直接走
Google Fonts <link>（web-v1 原本的做法）會拉進 430 個 @font-face、約 134KB
gzip 的 render-blocking CSS —— 繁中字型是按 unicode-range 切成上百塊的。

每個字型家族切成六塊，對應站上的幾個 surface：

    core     公司首頁那條路徑（landing + 品牌元件）
    common   兩個以上 surface 都用到的字，加上沒被任何 surface 認領的殘餘
    guides   只有 guides / compare / evidence / pharmacy 用到的字
    stores   藥局名與地址（政府開放資料）
    shop     消費端藥品目錄、症狀、成分
    storeos  只有 Store OS / console 用到的字

globals.css 把六個家族串成 fallback chain。六塊互斥（partition，跑完會
assert），瀏覽器逐字往後找、缺字才會去抓下一塊。實際量到的字型下載量
（Chrome，production build，含 IBM Plex Mono 的 20KB）：

    /zh-tw                              core                       221KB
    /zh-tw/guides/*                     core+common+guides         427KB
    /zh-tw/evidence                     core+common+guides+stores  450KB
    /zh-tw/pharmacy                     以上再加 shop+storeos       600KB
    （切之前一律 738KB）

/pharmacy 那 155KB 是溢抓：它的 HTML 一個 shop/storeos 字元都沒有，但
Chrome 還是把兩塊拉下來。加 unicode-range 想擋掉反而更糟 —— Chrome 會改成
「範圍有交集就抓」，把沒 render 的文字（JSON-LD 之類）也算進去，首頁直接從
221KB 變成 430KB。兩害相權，維持預設的「缺字才往下找」。

切錯的後果只是多抓一個檔，不會缺字 —— chain 最後還有系統中文字型接著。

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
from collections import Counter
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

# core 刻意只有「公司首頁自己渲染的檔案」，不含 lib/：lib/seo.ts、lib/aeo.ts
# 那些字串大多是 JSON-LD 與 meta，不會變成畫面上的字，掃進來只會讓 core 白白
# 變大。對照過 production /zh-tw 與 /en 的實際可見文字：437 個字元全部落在
# 這份 core 裡。
CORE_SOURCES = (
    "app/page.tsx",
    "app/en/page.tsx",
    "components/landing",
    "components/avatar-lab",
    "components/BrandLogo.tsx",
    "components/BrandMark.tsx",
    "components/ThemeToggle.tsx",
)
# 每頁都會 render 的 chrome。這些字一律進 common —— 否則它們會被「剛好也用到
# 同一個字」的 surface 認領走，害得別的頁面為了頁尾的一兩個字扛整塊 slice
# （/pharmacy 曾經為了 SiteFooter 的「呈府廣放」多抓 248KB 的藥品目錄）。
COMMON_SOURCES = (
    "app/layout.tsx",
    "app/not-found.tsx",
    "app/(consumer)/layout.tsx",
    "components/SiteHeader.tsx",
    "components/SiteFooter.tsx",
    "components/LanguageSwitch.tsx",
    "components/AreaSwitch.tsx",
    "components/SupportAgent.tsx",
)
# 其餘三個 surface。lib/ 的資料模組要跟著渲染它的 surface 走，否則整批藥名、
# 藥局名會落進 common，每個頁面都得付一次。
#
# 路由歸屬跟著 proxy.ts 的 COMPANY_ONLY_ROUTES / CONSUMER_ROUTES 走，而不是
# 檔案在哪個資料夾：`/pharmacy` 雖然放在 app/(consumer)/ 底下，卻是公司網域的
# 招募頁，歸 guides。把它算成 shop 的話，它會為了 4 個 guides 專屬字元
# （域廢窗願）多抓一整塊 27KB。
SURFACE_SOURCES = (
    (
        "guides",
        (
            "app/guides",
            "app/compare",
            "app/evidence",
            "app/(consumer)/pharmacy",
            "components/PilotForm.tsx",
            "lib/aeo.ts",
        ),
    ),
    (
        "shop",
        (
            "app/(consumer)/app",
            "app/(consumer)/category",
            "app/(consumer)/demo",
            "app/(consumer)/drug",
            "app/(consumer)/r",
            "app/(consumer)/search",
            "app/(consumer)/stock-badges",
            "app/(consumer)/store",
            "app/(consumer)/layout.tsx",
            "components/DrugResults.tsx",
            "components/PharmacyList.tsx",
            "components/StoreView.tsx",
            "components/SearchResultLink.tsx",
            "components/StockBadge.tsx",
            "components/AreaSwitch.tsx",
            "components/LocateButton.tsx",
            "components/PreviewShelf.tsx",
            "components/SupportAgent.tsx",
            "components/ReserveSheet.tsx",
            "lib/data.ts",
            "lib/partners.ts",
            "lib/partner-stores.ts",
            "lib/symptoms.ts",
            "lib/ingredients.ts",
            "lib/catalog-groups.ts",
            "lib/stores.generated.json",
            "lib/stock.ts",
            "lib/pricing.ts",
            "lib/hours.ts",
            "lib/geo.ts",
        ),
    ),
    (
        "storeos",
        (
            "app/store-os",
            "app/store-os-preview",
            "app/console",
            "components/store-os",
            "components/StoreOsShell.tsx",
            "lib/store-os.ts",
            "lib/store-os-locale.ts",
            "lib/store-demo.ts",
            "lib/store-admin.ts",
            "lib/store-auth.ts",
            "lib/store-reservation-command.ts",
            "lib/support.ts",
        ),
    ),
)

# shop 這塊再依資料來源切一刀：藥局名與地址（政府開放資料）跟藥品目錄的字
# 重疊不多，而公司端的 /evidence（合作藥局清單）與 /pharmacy（區域切換器）
# 只需要前者。分開之後那兩頁少抓 241KB，消費端也少抓 42KB。
STORE_DATA_SOURCES = (
    "lib/stores.generated.json",
    "lib/partner-stores.ts",
    "lib/geo.ts",
    "lib/hours.ts",
)

# .json 一定要包含：店名、地址、巷弄都在 lib/stores.generated.json，
# 只掃 .ts/.tsx 會讓整批藥局名掉回系統字型（804f344 導入真資料時漏掉這件事）。
SOURCE_SUFFIXES = {".ts", ".tsx", ".json"}
# 測試檔與 API route 不會 render 任何字，掃進來只是讓每個 slice 白白變胖
# （光是 *.test.ts 就多帶 79 個字元）。
SKIP_NAME = re.compile(r"\.test\.tsx?$|\.d\.ts$")
SKIP_DIRS = ("app/api/",)

# 介面上會出現、但不一定寫死在原始碼字串裡的符號
EXTRA_CHARS = (
    "、。，．・…—–－「」『』（）〈〉！？：；％＄＃＠　"
    "●○？◎⌕十→←·※0123456789"
)

COMMENT_RE = re.compile(r"/\*.*?\*/|//[^\n]*", re.S)


def renders_text(path: Path) -> bool:
    if path.suffix not in SOURCE_SUFFIXES or SKIP_NAME.search(path.name):
        return False
    rel = path.relative_to(WEB_ROOT).as_posix()
    return not rel.startswith(SKIP_DIRS)


def source_files(roots: tuple[str, ...]) -> list[Path]:
    files: list[Path] = []
    for entry in roots:
        target = WEB_ROOT / entry
        if target.is_file():
            files.append(target)
        elif target.is_dir():
            files.extend(p for p in target.rglob("*") if p.is_file())
    return [p for p in files if renders_text(p)]


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


def partition() -> dict[str, set[str]]:
    """把全站字符切成互斥的 core / common / <surface> 六塊。"""
    everything = collect_chars(SOURCE_DIRS)
    core = collect_chars(CORE_SOURCES) & everything
    chrome = (collect_chars(COMMON_SOURCES) & everything) - core
    surfaces = {
        name: collect_chars(roots) - core - chrome for name, roots in SURFACE_SOURCES
    }

    # 每頁都有的 chrome、兩個以上 surface 都用到的字、以及沒被任何 surface
    # 認領的殘餘，全部進 common —— 各 surface 的 slice 才會互斥。
    seen: Counter[str] = Counter()
    for chars in surfaces.values():
        seen.update(chars)
    claimed = set(seen)
    common = (
        chrome
        | {c for c, n in seen.items() if n >= 2}
        | (everything - core - chrome - claimed)
    )

    slices = {"core": core, "common": common}
    slices.update({name: chars - common for name, chars in surfaces.items()})

    # shop 再切出 stores（藥局名與地址）。重疊的字判給 stores：會看藥品目錄的
    # 頁面本來就同時顯示藥局名，多抓一塊沒有損失，但公司端只列藥局的頁面就
    # 不必為了地址去扛整份藥品目錄。
    store_data = collect_chars(STORE_DATA_SOURCES)
    slices["stores"] = slices["shop"] & store_data
    slices["shop"] = slices["shop"] - store_data

    # 互斥 + 全覆蓋。任何一邊破了，就會有頁面重複下載或缺字。
    total = sum(len(s) for s in slices.values())
    assert total == len(everything), f"slice 不是 partition：{total} != {len(everything)}"
    return slices


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
    slices = partition()
    print("字符集：" + "、".join(f"{name} {len(chars)}" for name, chars in slices.items()))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(exist_ok=True)

    text_files = {}
    for name, chars in slices.items():
        path = CACHE / f"glyphs-{name}.txt"
        path.write_text("".join(sorted(chars)), encoding="utf-8")
        text_files[name] = path

    for cache_name, url, stem, instance_wght in FONTS:
        var_font = fetch_variable_font(cache_name, url)
        for name, text_file in text_files.items():
            out = OUT_DIR / f"{stem}-{name}.woff2"
            build(var_font, text_file, out, instance_wght)
            kind = f"靜態 wght={instance_wght}" if instance_wght is not None else "可變字型"
            print(f"完成 — {out.name} {out.stat().st_size / 1024:.0f} KB（{kind}）")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
