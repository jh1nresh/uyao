#!/usr/bin/env python3
"""產出電商上架用的 1000×1000 商品圖。

    python3 scripts/build-ecommerce-images.py [--out DIR] [--assets DIR]

版面來自 Claude Design 專案「電商產品圖製作」；文案與數字在 `ecommerce_content.py`，
素材是去背過的實拍（見 `packshot-cleanup.swift`）。用 headless Chrome 逐張截圖，
中文由站上同一份 Noto Sans TC 排 —— 不交給影像模型生成，那會出假字。

輸出預設在 repo 的 `designs/ecommerce/`，該路徑已 gitignore：品牌輸出包只留本機，
跟 `designs/uyao-logo/` 同一個慣例。

缺素材的版位會印出明顯的缺件標記而不是空白，並在收尾列出還缺哪幾張，避免誤上架。
"""

from __future__ import annotations

import argparse
import html
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ecommerce_content import MISSING_NOTE, PRODUCTS  # noqa: E402

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SIZE = 1000


def web_root() -> Path:
    return Path(__file__).resolve().parent.parent


def art(assets: Path, key: str | None, missing_key: str | None, style: str = "") -> str:
    """素材有就放圖，沒有就放缺件標記 —— 不要靜默輸出空白版位。"""
    if key:
        path = assets / f"{key}.png"
        if path.exists():
            return f'<img src="{path.resolve().as_uri()}" style="{style}" alt="">'
    note = MISSING_NOTE.get(missing_key or key or "", "缺素材")
    return f'<div class="missing">素材未到位<br>{html.escape(note)}</div>'


def screen(inner: str, name: str) -> str:
    return f'<div class="screen" data-name="{name}">{inner}</div>'


def main_screen(p: dict, assets: Path) -> str:
    chips = "".join(
        f'<div class="chip" style="background:{bg};color:{fg}">{html.escape(t)}</div>'
        for t, bg, fg in p["chips"]
    )
    if p.get("hero_h"):
        img_style, pad = f'height:{p["hero_h"]};border-radius:14px', "20px"
    else:
        img_style, pad = (
            f'width:{p["hero_w"]};border-radius:10px;'
            f'box-shadow:0 22px 44px rgba(30,30,30,0.18)',
            "30px 40px",
        )
    return screen(
        f'<div class="bar" style="background:{p["bar"]}"></div>'
        f'<div class="head">'
        f'<div class="eyebrow" style="color:{p["accent"]}">{p["eyebrow"]}</div>'
        f'<div class="eyebrow-r">{p["eyebrow_r"]}</div></div>'
        f'<div class="stage"><div class="stage-in" style="background:{p["wash"]};padding:{pad}">'
        f'{art(assets, p.get("hero"), p.get("hero_key"), img_style)}</div></div>'
        f'<div class="foot"><div class="title">{p["title"]}</div>'
        f'<div class="subtitle" style="color:{p["accent"]}">{html.escape(p["subtitle"])}</div>'
        f'<div class="chips">{chips}</div></div>',
        f'{p["slug"]}-1-main',
    )


def usp_screen(p: dict, assets: Path) -> str:
    rows = ""
    for i, (h, body) in enumerate(p["usp"], start=1):
        colour = p["accent"] if i < len(p["usp"]) else p["accent"]
        rows += (
            f'<div class="usp-row"><div class="usp-num" style="background:{colour}">{i}</div>'
            f'<div><div class="usp-h">{html.escape(h)}</div>'
            f'<div class="usp-p">{html.escape(body)}</div></div></div>'
        )
    if p.get("spec_table"):
        table = "".join(
            f'<div style="display:flex;justify-content:space-between;padding:8px 0;'
            f'border-bottom:1px solid #e2eae8"><div style="font-size:22px;font-weight:600;'
            f'color:#333a43">{html.escape(k)}</div><div style="font-size:22px;color:#5a616b">'
            f"{html.escape(v)}</div></div>"
            for k, v in p["spec_table"]
        )
        rows += f'<div style="background:#f4f8f7;border-radius:18px;padding:24px 28px;margin-top:6px">{table}</div>'

    return screen(
        f'<div class="sec-head"><div class="sec-rule" style="background:{p["accent"]}"></div>'
        f'<div class="sec-title">{p.get("usp_title", "產品特色")}</div>'
        f'<div class="sec-tag">{html.escape(p["usp_tag"])}</div></div>'
        f'<div class="usp"><div class="usp-art" style="width:{p["usp_art_w"]};background:{p["wash"]}">'
        f'{art(assets, p.get("usp_art"), p.get("usp_art_key"))}</div>'
        f'<div class="usp-list">{rows}</div></div>',
        f'{p["slug"]}-2-features',
    )


def ing_screen(p: dict, assets: Path) -> str:
    rows = ""
    pad = p.get("ing_row_pad", "13px")
    for k, v, plain in p["ing"]:
        cls = "ing-v plain" if plain else "ing-v"
        style = "" if plain else f' style="color:{p["accent"]}"'
        rows += (
            f'<div class="ing-row" style="padding:{pad} 0">'
            f'<div class="ing-k">{html.escape(k)}</div>'
            f'<div class="{cls}"{style}>{html.escape(v)}</div></div>'
        )
    if p.get("ing_chips"):
        chips = "".join(
            f'<div class="ing-chip" style="background:{p["chip_bg"]};color:{p["accent_deep"]}">'
            f"{html.escape(t)}</div>"
            for t in p["ing_chips"]
        )
        rows += f'<div class="ing-chips">{chips}</div>'
    disclaimer = html.escape(p["disclaimer"]) + html.escape(p.get("company", ""))
    return screen(
        f'<div class="sec-head"><div class="sec-rule" style="background:{p["accent"]}"></div>'
        f'<div class="sec-title">{p["ing_title"]}</div>'
        f'<div class="sec-tag">{html.escape(p["ing_tag"])}</div></div>'
        f'<div class="ing"><div class="ing-list">{rows}</div>'
        f'<div class="ing-side">'
        f'<div class="ing-art" style="background:{p["ing_art_bg"]}">'
        f'{art(assets, p.get("ing_art"), p.get("ing_art_key"))}</div>'
        f'<div class="ing-note" style="background:{p["note_bg"]}">'
        f'<div class="ing-note-h" style="color:{p["note_fg"]}">{html.escape(p["note_h"])}</div>'
        f'<div class="ing-note-p" style="color:{p["note_body_fg"]}">{p["note_p"]}</div>'
        f"</div></div></div>"
        f'<div class="disclaimer">{disclaimer}</div>',
        f'{p["slug"]}-3-ingredients',
    )


def build_screens(assets: Path) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for p in PRODUCTS:
        wanted = p.get("screens", ["main", "usp", "ing"])
        for kind, fn in (("main", main_screen), ("usp", usp_screen), ("ing", ing_screen)):
            if kind in wanted:
                block = fn(p, assets)
                out.append((block.split('data-name="')[1].split('"')[0], block))
    return out


def render(template: str, screens: list[tuple[str, str]], out_dir: Path) -> None:
    """一張圖一個頁面。想只截整份文件裡的某一格，錨點與捲動都不可靠。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    page = web_root() / "scripts" / ".ecommerce-render.html"
    with tempfile.TemporaryDirectory() as tmp:
        for name, block in screens:
            # 模板用相對路徑載字型，頁面必須留在 scripts/ 才找得到 app/fonts/。
            page.write_text(template.replace("__SCREENS__", block), encoding="utf-8")
            shot = Path(tmp) / f"{name}.png"
            try:
                subprocess.run(
                    [
                        CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
                        "--hide-scrollbars", "--force-device-scale-factor=1",
                        f"--window-size={SIZE},{SIZE}",
                        f"--screenshot={shot}", "--virtual-time-budget=6000",
                        page.resolve().as_uri(),
                    ],
                    check=True, capture_output=True,
                )
            finally:
                page.unlink(missing_ok=True)
            shutil.move(str(shot), out_dir / f"{name}.png")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="產出 1000×1000 電商商品圖")
    ap.add_argument("--out", type=Path,
                    default=web_root().parent / "designs" / "ecommerce")
    ap.add_argument("--assets", type=Path,
                    default=web_root().parent / ".tmp" / "ecom-assets")
    args = ap.parse_args(argv)

    if not Path(CHROME).exists():
        print("找不到 Google Chrome，headless 截圖需要它", file=sys.stderr)
        return 1

    template = (web_root() / "scripts" / "ecommerce-plate.html").read_text(encoding="utf-8")
    screens = build_screens(args.assets)
    render(template, screens, args.out)
    names = [n for n, _ in screens]

    missing = [k for k, _ in MISSING_NOTE.items()
               if not (args.assets / f"{k}.png").exists()]
    print(f"{len(names)} 張 → {args.out}")
    for n in names:
        print(f"  {n}.png")
    if missing:
        print("\n尚缺素材（該版位印的是缺件標記，先不要上架）：", file=sys.stderr)
        for k in missing:
            print(f"  {k}.png — {MISSING_NOTE[k]}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
