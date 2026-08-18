#!/usr/bin/env python3
"""把品項圖壓成上線尺寸，放進 `web/public/products/`。

    python3 scripts/optimize-product-images.py 來源.png --slug greenplus-elgucare

來源可以是 AI 生成的示意圖，也可以是藥局或原廠給的實拍。輸出固定是 900px 寬
的 WebP：品項圖都是大面積平塗，WebP 有損 q88 大約 26 KB，同一張 PNG 是 1 MB，
差 40 倍，而畫面上看不出差別。

只用 `cwebp`（Homebrew webp）與 macOS 內建的 `sips`，不加 npm 相依 —— web 端
沒有 sharp，為了幾張圖裝一個原生模組不划算。

**這支腳本不判斷圖是實拍還是示意圖。** 那要在 `lib/data.ts` 的 `image.kind`
手動標；標錯會讓使用者以為生成圖是真的包裝，跟填假許可證字號是同一種錯。
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

TARGET_WIDTH = 900
QUALITY = 88


def web_root() -> Path:
    return Path(__file__).resolve().parent.parent


def run(cmd: list[str]) -> str:
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def dimensions(path: Path) -> tuple[int, int]:
    got: dict[str, int] = {}
    for line in run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)]).splitlines():
        key, _, value = line.strip().partition(": ")
        if key in ("pixelWidth", "pixelHeight"):
            got[key] = int(value)
    return got["pixelWidth"], got["pixelHeight"]


def optimize(source: Path, slug: str, width: int) -> Path:
    out_dir = web_root() / "public" / "products"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{slug}.webp"
    # cwebp 不會帶 EXIF 過去。商品實拍常含 GPS，門市座標不該進版控。
    run(["cwebp", "-quiet", "-resize", str(width), "0", "-q", str(QUALITY), "-m", "6",
         str(source), "-o", str(out)])
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="壓縮品項圖並輸出 data.ts 要填的寬高")
    ap.add_argument("source", type=Path, help="來源圖檔")
    ap.add_argument("--slug", required=True, help="品項 slug，決定輸出檔名")
    ap.add_argument("--width", type=int, default=TARGET_WIDTH)
    args = ap.parse_args(argv)

    if not args.source.exists():
        print(f"找不到來源圖：{args.source}", file=sys.stderr)
        return 1
    for tool in ("cwebp", "sips"):
        if not shutil.which(tool):
            print(f"缺少 {tool}（cwebp 用 `brew install webp` 裝）", file=sys.stderr)
            return 1

    out = optimize(args.source, args.slug, args.width)
    w, h = dimensions(out)
    print(f"{out.relative_to(web_root())}  {w}×{h}  {out.stat().st_size // 1024} KB")
    print(f'  image: {{ src: "/products/{args.slug}.webp", width: {w}, height: {h}, kind: "illustration", ... }}')
    return 0


if __name__ == "__main__":
    sys.exit(main())
