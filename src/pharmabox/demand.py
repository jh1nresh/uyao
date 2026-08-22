"""落空搜尋彙總 —— 打電話給藥局之前看一眼。

資料來源三種，優先序就是「存得住的程度」：

    KV          upstash 的 `rec:demand` list（線上唯一真的存得住的地方）
    本機 jsonl   web/.data/demand.jsonl（dev 跑出來的）
    線上 log     vercel logs <url> --json 裡的 UYAO_RECORD 行

`web/lib/record.ts` 會同時送三個 sink，全滅才退回印 log。Vercel 的
`/var/task` 是唯讀的，所以線上 fs 必定失敗 —— 沒設 KV 的話資料其實只
活在會過期的 log 裡。**log 是止血不是持久化**，設了 KV 就該用 KV。

用法：

    python3 -m pharmabox.demand                      # KV（沒設就退回本機 jsonl）
    python3 -m pharmabox.demand --file some.jsonl    # 指定檔案
    vercel logs https://uyao.vercel.app --json \\
        | python3 -m pharmabox.demand --stdin        # 讀線上 log
    python3 -m pharmabox.demand --days 7             # 只看近 7 天

要把這些數字變成打給藥局的那通電話，見 `pharmabox.outreach`。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_JSONL = REPO_ROOT / "web" / ".data" / "demand.jsonl"
# 本機沒設 upstash 時 kv.ts 的 file driver 落腳處。key 裡的 `:` 是合法字元
# （它只換掉 [^A-Za-z0-9_:.-]），所以檔名真的帶冒號。
DEFAULT_KV_FILE = REPO_ROOT / "web" / ".data" / "kv" / "rec:demand.json"
SENTINEL = "UYAO_RECORD demand "
KV_LIST_KEY = "rec:demand"

def env_files() -> list[Path]:
    """`web/.env.local` 是 Next.js 的慣例檔，Python 不會自己讀它。

    順序有意義：**cwd 排在模組位置前面**。`pip install -e .` 是從哪個
    checkout 裝的就永遠指向哪個 —— 在 worktree 裝過、之後回主 repo 跑，
    錨在 `__file__` 會去翻 worktree 那份空的 `.env.local`，然後安靜印 0 筆。
    `paths.py` 的 docstring 記過同一個坑的另一面。
    """
    override = os.environ.get("PHARMABOX_ENV_FILE")
    if override:
        return [Path(override).expanduser()]
    return [Path.cwd() / "web" / ".env.local", REPO_ROOT / "web" / ".env.local"]


def env_or_file(name: str, paths: list[Path] | None = None) -> str | None:
    """先看真正的環境變數，沒有才翻 `.env.local`。

    不跟著讀這個檔的話，「我把 KV 設好了」跟「報表印 0 筆」會同時成立 ——
    那是最花時間的失敗模式，因為兩邊看起來都沒錯。環境變數優先，檔案只補位。
    """
    got = os.environ.get(name)
    if got:
        return got

    for path in paths if paths is not None else env_files():
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            line = line.removeprefix("export ").strip()
            key, sep, value = line.partition("=")
            if sep and key.strip() == name:
                value = value.strip().strip('"').strip("'")
                if value:
                    return value
    return None

AREA_NAMES = {
    "datong": "大同區",
    "linkou": "林口區",
    "xinzhuang": "新莊區",
    "zhongshan": "中山區",
    "shilin": "士林區",
    "xinyi": "信義區",
}
KIND_NAMES = {
    "catalog_miss": "目錄沒有這支藥",
    "inventory_miss": "有這支藥但沒庫存",
    # 藥局在 LINE 上按「沒貨」時寫進來的。這是這條鏈上最強的一筆需求：
    # 不是有人搜過，是**有人已經願意出門去買**，而且指名到某一家店。
    "rejected_no_stock": "預留了才被回報沒貨",
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


def from_kv(
    url: str | None = None,
    token: str | None = None,
    key: str = KV_LIST_KEY,
    timeout: int = 15,
) -> list[dict]:
    """讀 upstash 的 `rec:demand`。這是 `record.ts` 的 kv sink 的對應讀取端。

    沒設金鑰就回空 list 而不是丟例外 —— 呼叫端要能安靜退回本機檔案。
    kv.ts 用 `RPUSH` 寫入，所以這裡是 `LRANGE 0 -1`（附加順序 = 時間順序）。

    **優先吃唯讀 token。** 這條路上只會做 `LRANGE`，沒有任何理由讓一支
    產報表的 CLI 握著能寫能刪的金鑰 —— 它會被貼進 shell、cron、筆記本。
    Vercel 的 KV 整合本來就一起發 `KV_REST_API_READ_ONLY_TOKEN`。
    """
    url = url or env_or_file("KV_REST_API_URL")
    token = (
        token
        or env_or_file("KV_REST_API_READ_ONLY_TOKEN")
        or env_or_file("KV_REST_API_TOKEN")
    )
    if not (url and token):
        return []

    req = urllib.request.Request(
        url,
        data=json.dumps(["LRANGE", key, 0, -1]).encode("utf-8"),
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    out = []
    for item in payload.get("result") or []:
        try:
            out.append(json.loads(item))
        except (TypeError, json.JSONDecodeError):
            continue  # 手動塞進去的髒資料不該讓整份報表掛掉
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


def load(file: Path | None = None, stdin=None) -> tuple[list[dict], str]:
    """取得紀錄 + 它從哪來。**來源一定要跟著數字走** —— 報表上寫「37 筆」
    卻沒說是哪來的，下一個看到的人（包括三週後的自己）沒辦法判斷可不可信。

    優先序：明確指定的 stdin/file > KV > 本機 kv file driver > 本機 jsonl。
    """
    if stdin is not None:
        return dedupe(from_vercel_logs(stdin)), "vercel logs"
    if file is not None:
        return dedupe(from_jsonl(file)), str(file)

    kv = from_kv()
    if kv:
        return dedupe(kv), f"KV {KV_LIST_KEY}"
    for path in (DEFAULT_KV_FILE, DEFAULT_JSONL):
        rows = from_jsonl(path)
        if rows:
            return dedupe(rows), str(path)
    return [], "（找不到任何來源）"


def no_records_hint() -> None:
    print("沒有任何紀錄。")
    print("  線上：設 KV_REST_API_URL / KV_REST_API_TOKEN 後直接跑")
    print("  本機：先在 dev 上跑幾次搜尋（會寫 web/.data/demand.jsonl）")
    print("  救援：vercel logs <url> --json | python3 -m pharmabox.demand --stdin")


def report(records: list[dict], days: int | None) -> None:
    if not records:
        no_records_hint()
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

        for kind in ("inventory_miss", "catalog_miss", "rejected_no_stock"):
            sub = [r for r in rows if r.get("kind") == kind]
            if not sub:
                continue
            # rejected_no_stock 沒有原始查詢字串（是從預留單反推的），
            # 退回 drugSlug —— 不然整批會印成空行。
            top = Counter(
                r.get("query") or r.get("drugSlug", "") for r in sub
            ).most_common(8)
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

    # 這一段跟上面分開，因為行動對象不同：miss 的對象是「這一區」，
    # 沒貨的對象是**那一家店**。打電話時這句最有力 ——
    # 「有人已經在我們站上預留你的貨，你回沒有。」
    rejected = Counter(
        (r.get("storeSlug", "?"), r.get("drugSlug", "?"))
        for r in records
        if r.get("kind") == "rejected_no_stock"
    )
    if rejected:
        print("\n有人指名要買、藥局回報沒貨（這通電話最好打）：")
        for (store, drug), n in rejected.most_common(10):
            print(f"  {n:>3}　{store}　{drug}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--stdin", action="store_true",
                    help="從 stdin 讀 vercel logs --json")
    ap.add_argument("--file", type=Path, default=None,
                    help="指定 jsonl 路徑（預設自動找 KV → 本機檔案）")
    ap.add_argument("--days", type=int, default=None, help="只看近 N 天")
    args = ap.parse_args()

    records, source = load(file=args.file, stdin=sys.stdin if args.stdin else None)
    if records:
        print(f"（來源：{source}）")
    report(within(records, args.days), args.days)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
