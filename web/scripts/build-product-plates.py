#!/usr/bin/env python3
"""把一張產品照排成品項圖：照片在上，中文品名與規格在下。

    python3 scripts/build-product-plates.py \\
        --slug yuanding-puregps-defense-450 \\
        --shot /path/to/packshot.png \\
        --name "強抗力優 450+ Defense" \\
        --meta "植物膠囊 · 60粒 · 圓鼎生物科技"

輸出 `public/products/<slug>.webp`，900×1125（4:5）。

**中文一律在瀏覽器裡用真字型排，不交給影像模型生成。** 影像模型畫出來的
繁體中文是變形的假字；藥局網站上出現假字看起來就像仿冒包裝，比空白包裝
更糟。所以流程固定是「生成無字包裝照 → 這支腳本排真字」。

需要 Google Chrome（headless 截圖）與 cwebp。
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WIDTH, HEIGHT = 900, 1125
QUALITY = 88


def web_root() -> Path:
    return Path(__file__).resolve().parent.parent


NOTE = {
    # kind 決定這行字，也決定 data.ts 要標哪一種 —— 兩邊必須一致。
    "packshot": "合作藥局提供的包裝照片",
    "illustration": "示意圖，非實際包裝",
}


def render(shot: Path, name: str, meta: str, out: Path, kind: str, focus: str) -> None:
    template = (web_root() / "scripts" / "product-plate.html").read_text(encoding="utf-8")
    html = (
        template.replace("__SHOT__", shot.resolve().as_uri())
        .replace("__NAME__", name)
        .replace("__META__", meta)
        .replace("__NOTE__", NOTE[kind])
        .replace("__FOCUS__", focus)
    )

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        # 模板用相對路徑載字型，所以 HTML 要留在 scripts/ 底下才找得到 app/fonts/。
        page = web_root() / "scripts" / ".plate-render.html"
        page.write_text(html, encoding="utf-8")
        shot_png = tmp_dir / "plate.png"
        try:
            subprocess.run(
                [
                    CHROME,
                    # 舊的 `--headless` 在目前的 Chrome 上會卡住幾分鐘才吐圖。
                    "--headless=new",
                    "--disable-gpu",
                    "--no-sandbox",
                    "--hide-scrollbars",
                    "--force-device-scale-factor=2",
                    f"--window-size={WIDTH},{HEIGHT}",
                    f"--screenshot={shot_png}",
                    "--virtual-time-budget=4000",
                    page.resolve().as_uri(),
                ],
                check=True,
                capture_output=True,
            )
        finally:
            page.unlink(missing_ok=True)

        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["cwebp", "-quiet", "-resize", str(WIDTH), "0", "-q", str(QUALITY), "-m", "6",
             str(shot_png), "-o", str(out)],
            check=True,
            capture_output=True,
        )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="產出帶中文品名的品項圖")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--shot", type=Path, required=True, help="無字的包裝照")
    ap.add_argument("--name", required=True, help="品名，照 data.ts 的 name")
    ap.add_argument("--meta", required=True, help="劑型 · 規格 · 廠商")
    ap.add_argument("--kind", choices=sorted(NOTE), default="illustration",
                    help="packshot = 可代表實際包裝的實拍；illustration = 生成示意圖")
    ap.add_argument("--focus", default="50% 50%",
                    help="CSS object-position，用來把商品框進畫面，例如 \"45% 55%\"")
    args = ap.parse_args(argv)

    if not args.shot.exists():
        print(f"找不到來源圖：{args.shot}", file=sys.stderr)
        return 1
    if not Path(CHROME).exists():
        print("找不到 Google Chrome，headless 截圖需要它", file=sys.stderr)
        return 1
    if not shutil.which("cwebp"):
        print("缺少 cwebp（brew install webp）", file=sys.stderr)
        return 1

    out = web_root() / "public" / "products" / f"{args.slug}.webp"
    render(args.shot, args.name, args.meta, out, args.kind, args.focus)
    print(f"{out.relative_to(web_root())}  {WIDTH}×{HEIGHT}  {out.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
