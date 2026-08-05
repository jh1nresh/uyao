"""落空搜尋彙總 —— 打電話給藥局之前看一眼。

資料來源兩種，因為線上目前寫不進檔案：

    本機 jsonl   web/.data/demand.jsonl（dev 跑出來的）
    線上 log     vercel logs <url> --json 裡的 UYAO_RECORD 行

Vercel 的 `/var/task` 是唯讀的，`POST /api/demand` 會回 200 但寫檔失敗，
所以 `web/lib/record.ts` 在失敗時把整筆印成 `UYAO_RECORD demand {...}`。
**log 保留期有限，這是止血不是持久化** —— 接上真正的儲存之後這條路就該拿掉。

用法：

    python3 -m pharmabox.demand                      # 讀本機 jsonl
    vercel logs https://uyao.vercel.app --json \\
        | python3 -m pharmabox.demand --stdin        # 讀線上 log
    python3 -m pharmabox.demand --days 7             # 只看近 7 天
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_JSONL = REPO_ROOT / "web" / ".data" / "demand.jsonl"
SENTINEL = "UYAO_RECORD demand "

AREA_NAMES = {"zhongshan": "中山區", "xinyi": "信義區"}
KIND_NAMES = {
    "catalog_miss": "目錄沒有這支藥",
    "inventory_miss": "有這支藥但沒庫存",
}


def from_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def from_vercel_logs(stream) -> list[dict]:
    """吃 `vercel logs --json`。每行是一個 log event，訊息裡才是我們的紀錄。"""
    out = []
    for line in stream:
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        # 訊息可能在 message，也可能在 logs[].message
        blobs = [event.get("message", "")]
        blobs += [x.get("message", "") for x in event.get("logs", []) or []]
        for blob in blobs:
            for part in str(blob).split("\n"):
                idx = part.find(SENTINEL)
                if idx == -1:
                    continue
                try:
                    out.append(json.loads(part[idx + len(SENTINEL):]))
                except json.JSONDecodeError:
                    continue
    return out


def dedupe(records: list[dict]) -> list[dict]:
    """同一筆可能同時出現在 message 與 logs[]，用內容去重。"""
    seen, out = set(), []
    for r in records:
        key = json.dumps(r, sort_keys=True, ensure_ascii=False)
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def within(records: list[dict], days: int | None) -> list[dict]:
    if not days:
        return records
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    out = []
    for r in records:
        try:
            if datetime.fromisoformat(r["at"].replace("Z", "+00:00")) >= cutoff:
                out.append(r)
        except (KeyError, ValueError):
            out.append(r)  # 時間壞掉的照樣算，不要靜默丟資料
    return out


def report(records: list[dict], days: int | None) -> None:
    if not records:
        print("沒有任何紀錄。")
        print("  本機：先在 dev 上跑幾次搜尋，或確認 web/.data/demand.jsonl 存在")
        print("  線上：vercel logs <url> --json | python3 -m pharmabox.demand --stdin")
        return

    window = f"近 {days} 天" if days else "全部"
    by_area: dict[str, list[dict]] = defaultdict(list)
    for r in records:
        by_area[r.get("area", "?")].append(r)

    print(f"落空搜尋彙總 · {window} · 共 {len(records)} 筆\n")

    for area, rows in sorted(by_area.items(), key=lambda kv: -len(kv[1])):
        contacts = [r for r in rows if r.get("contact")]
        print(f"── {AREA_NAMES.get(area, area)}　{len(rows)} 筆"
              f"（留了聯絡方式 {len(contacts)}）")

        for kind in ("inventory_miss", "catalog_miss"):
            sub = [r for r in rows if r.get("kind") == kind]
            if not sub:
                continue
            top = Counter(r.get("query", "") for r in sub).most_common(8)
            print(f"   {KIND_NAMES[kind]}　{len(sub)}")
            for q, n in top:
                print(f"     {n:>3}　{q}")
        print()

    gaps = Counter(
        r.get("query", "") for r in records if r.get("kind") == "catalog_miss"
    )
    if gaps:
        print("目錄該補的品項（catalog_miss，不用等任何人裝盒子就能自己補）：")
        for q, n in gaps.most_common(10):
            print(f"  {n:>3}　{q}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--stdin", action="store_true",
                    help="從 stdin 讀 vercel logs --json")
    ap.add_argument("--file", type=Path, default=DEFAULT_JSONL,
                    help=f"jsonl 路徑（預設 {DEFAULT_JSONL}）")
    ap.add_argument("--days", type=int, default=None, help="只看近 N 天")
    args = ap.parse_args()

    records = from_vercel_logs(sys.stdin) if args.stdin else from_jsonl(args.file)
    report(within(dedupe(records), args.days), args.days)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
