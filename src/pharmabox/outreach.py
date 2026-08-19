"""招商報表 —— 把落空搜尋變成打電話時說得出口的那一句。

`demand.py` 產的是**給自己看的**總覽。這支產的是**給藥局看的**兩份東西：

    call sheet   一家藥局一行，帶該區數字與開場白 → 電訪時放在手邊
    brief        一區一頁 markdown → 可以印、轉 PDF、貼進 LINE 給老闆看

兩份都不需要任何一台盒子上線就能產出 —— 這是這條路線唯一在裝機前就
能累積的資產。

    python3 -m pharmabox.outreach                      # 印 call sheet
    python3 -m pharmabox.outreach --days 30 --write    # 另外寫出檔案
    vercel logs <url> --json | python3 -m pharmabox.outreach --stdin

## 三條規則，違反了這份東西就沒有價值

1. **少於 `--min` 筆不產 brief。** 「你這區有 2 個人搜過」比不說更傷。
   湊不出來的區要說湊不出來，不要為了有東西發而發。
2. **數字一定跟著期間走，而且只講「次」。** 報表上寫 37 筆卻沒說算幾天，
   對方問一句就崩；把 37 次搜尋講成 37 個人，就是在說謊。
3. **brief 不出現任何店名。** 那份會被轉發，A 店的缺貨印在給 B 店看的紙上
   一次就把供給側的信任燒光。要指名道姓的版本在 call sheet，只給自己看。

名單只有電話沒有 email（FDA 開放資料就沒有），所以這裡不寄信 ——
產出的是電訪用的表和一頁可轉發的 brief。
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from pharmabox import demand as demand_mod
from pharmabox.paths import data_path, repo_root

STORES_JSON = repo_root() / "web" / "lib" / "stores.generated.json"
DATA_TS = repo_root() / "web" / "lib" / "data.ts"

# 一個區至少要有這麼多筆落空，才值得拿去跟藥局講。
MIN_RECORDS = 5

# 印在 brief 上的站台網址。**必須是真的打得開的那一個** —— 這張紙會被拿到
# 藥局櫃台，上面印一個不解析的網域，第一印象就沒了。自訂網域接好之後改這裡
# （或用 --site 覆寫），別讓它繼續指著一個還沒生效的 DNS。
SITE = "uyao.vercel.app"

AREA_LABEL = {
    "datong": "大同區",
    "linkou": "林口區",
    "xinzhuang": "新莊區",
    "zhongshan": "中山區",
    "xinyi": "信義區",
}


@dataclass
class AreaDemand:
    """一個區的落空搜尋長什麼樣。三種 kind 分開放，因為**行動對象不同**：
    miss 的對象是「這一區」，指名沒貨的對象是**那一家店**。
    """

    area: str
    total: int = 0
    contacts: int = 0
    inventory: Counter = field(default_factory=Counter)  # drugSlug -> n
    catalog: Counter = field(default_factory=Counter)    # 原始 query -> n
    named: Counter = field(default_factory=Counter)      # (storeSlug, drugSlug) -> n

    @property
    def label(self) -> str:
        return AREA_LABEL.get(self.area, self.area)

    def named_for(self, store_slug: str) -> Counter:
        out: Counter = Counter()
        for (store, drug), n in self.named.items():
            if store == store_slug:
                out[drug] += n
        return out


@dataclass
class CallRow:
    store: dict
    area: AreaDemand
    named_hits: int
    named_top: str  # drugSlug，沒有就空字串
    opener: str

    @property
    def starred(self) -> bool:
        """有人指名要來這家店、店家回報沒貨 —— 這通電話最好打。"""
        return self.named_hits > 0


def pad(text: str, width: int) -> str:
    """補到指定的**顯示**寬度。`f"{s:<16}"` 數的是字元數，中文是雙寬，
    整份名單會歪掉 —— 這份東西是拿著打電話用的，欄位對不齊就難掃。
    """
    shown = sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in text)
    return text + " " * max(1, width - shown)


def load_stores(path: Path = STORES_JSON) -> list[dict]:
    """藥局名單取自 seed 產物而不是 `data/prospects*.csv`：那份 json 已經
    join 過健保與 Places，而且**帶 slug 與 area slug**，跟需求紀錄可以直接
    對上，不用再做「中山區 ↔ zhongshan」的字串轉換。

    沒有這個檔就先跑 `python3 -m pharmabox.seed`。
    """
    if not path.exists():
        return []
    blob = json.loads(path.read_text(encoding="utf-8"))
    return blob.get("stores", []) if isinstance(blob, dict) else blob


def load_labels(path: Path = DATA_TS) -> dict[str, str]:
    """slug → 中文名，**只用來顯示**。

    直接從 `data.ts` 撈 slug/name/spec 配對。從 Python 讀 TS 當然是脆的，
    但這裡的失敗代價只是報表印出 slug 而不是「護智慷 60粒」——所以刻意
    不做成硬相依，撈不到就退回 slug 原樣。
    真要穩，是等目錄搬進資料庫，不是在這裡寫 TS parser。

    先切成一筆一筆再撈，不要求 `name` 緊接在 `slug` 後面：欄位順序本來就
    會變（`nameEn`、`updatedOn` 都是後來插進來的），綁死順序等於每次改
    schema 都要回來修這裡。切開的另一個好處是某筆缺 `spec` 時，不會跨到
    下一筆去撿一個不屬於它的值。
    """
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    if "const DRUGS" not in text:
        return {}
    catalog = text.split("const DRUGS", 1)[1].split("];", 1)[0]

    labels: dict[str, str] = {}
    # 每筆都以 `slug:` 開頭，切點取下一個 `slug:` 之前。
    for record in re.split(r'\n(?=\s*slug:\s*")', catalog):
        slug = re.search(r'^\s*slug:\s*"([^"]+)"', record)
        name = re.search(r'^\s*name:\s*"([^"]+)"', record, re.MULTILINE)
        if not slug or not name:
            continue
        spec = re.search(r'^\s*spec:\s*"([^"]+)"', record, re.MULTILINE)
        # 沒寫 spec 的走 partnerProvidedProduct 的預設值。
        value = spec.group(1) if spec else "規格待確認"
        labels[slug.group(1)] = (
            name.group(1) if value == "規格待確認" else f"{name.group(1)} {value}"
        )
    return labels


def aggregate(records: list[dict]) -> dict[str, AreaDemand]:
    out: dict[str, AreaDemand] = {}
    for r in records:
        area = r.get("area") or "?"
        ad = out.setdefault(area, AreaDemand(area=area))
        ad.total += 1
        if r.get("contact"):
            ad.contacts += 1

        kind = r.get("kind")
        if kind == "inventory_miss":
            ad.inventory[r.get("drugSlug") or r.get("query") or "?"] += 1
        elif kind == "catalog_miss":
            # 原話，不正規化 —— 同義詞/錯字/症狀→成分是之後離線重跑的事
            ad.catalog[r.get("query") or "?"] += 1
        elif kind == "rejected_no_stock":
            ad.named[(r.get("storeSlug") or "?", r.get("drugSlug") or "?")] += 1
    return out


def opener(row_store: dict, ad: AreaDemand, named: Counter,
           labels: dict[str, str], days: int | None) -> str:
    """進店第一句。賣的不是盒子，是「這條街有多少人在找你沒有的東西」。"""
    window = f"近 {days} 天" if days else "目前為止"

    if named:
        drug, n = named.most_common(1)[0]
        return (
            f"{window}有 {n} 個人在網站上指名要來{row_store['name']}拿"
            f"「{labels.get(drug, drug)}」，被回報沒貨。"
        )

    hot = (ad.inventory + ad.catalog).most_common(1)
    if hot:
        what, n = hot[0]
        return (
            f"{window}{ad.label}有 {ad.total} 次搜尋沒找到東西，"
            f"最多人找的是「{labels.get(what, what)}」（{n} 次）。"
        )
    return f"{window}{ad.label}有 {ad.total} 次搜尋沒找到東西。"


def call_rows(stores: list[dict], by_area: dict[str, AreaDemand],
              labels: dict[str, str], days: int | None) -> list[CallRow]:
    rows: list[CallRow] = []
    for store in stores:
        ad = by_area.get(store.get("area", ""))
        if ad is None or ad.total == 0:
            continue  # 這區沒有訊號，就沒有可講的東西 —— 不要硬湊一行
        named = ad.named_for(store.get("slug", ""))
        rows.append(
            CallRow(
                store=store,
                area=ad,
                named_hits=sum(named.values()),
                named_top=named.most_common(1)[0][0] if named else "",
                opener=opener(store, ad, named, labels, days),
            )
        )

    # 指名沒貨的排最前面，其餘照該區訊號量。同分用店名，讓輸出可重現。
    rows.sort(key=lambda r: (-r.named_hits, -r.area.total, r.store.get("name", "")))
    return rows


def brief_markdown(ad: AreaDemand, labels: dict[str, str], days: int | None,
                   today: date, site: str = SITE) -> str:
    """**這份會被轉發出去**，所以有三件事跟 call sheet 不一樣：

    - 不出現任何店名。指名缺貨是那家店的私事，拿去給隔壁看是背刺
    - 不出現來源路徑。精確來源（KV / 哪個檔）留在 call sheet 與終端輸出
    - 一律講「次」不講「人」。同一個人搜三次就是三次，沒有去重
    """
    window = f"近 {days} 天" if days else "開站至今"
    lines = [
        f"# {ad.label}：{window}有 {ad.total} 次搜尋沒有結果",
        "",
        f"> {site} 站內搜尋紀錄 · 統計期間 {window} · 產生於 {today.isoformat()}",
        "",
    ]

    if ad.inventory:
        lines += [f"## 找得到這支藥，但{ad.label}沒有一家有貨（{sum(ad.inventory.values())} 次）", ""]
        lines += [f"- **{labels.get(k, k)}** — {n} 次" for k, n in ad.inventory.most_common(10)]
        lines.append("")

    if ad.catalog:
        lines += [f"## 我們目錄裡還沒有的（{sum(ad.catalog.values())} 次）", ""]
        lines += [f"- 「{k}」— {n} 次" for k, n in ad.catalog.most_common(10)]
        lines.append("")

    if ad.named:
        # **刻意不列店名。** 這是最強的訊號（有人已經願意出門、還指名到某一家），
        # 但把 A 店的缺貨印在要給 B 店看的紙上，一次就把供給側的信任燒光。
        # 要指名道姓的版本在 call sheet，那份只給自己看。
        by_drug: Counter = Counter()
        for (_store, drug), n in ad.named.items():
            by_drug[drug] += n
        lines += [
            f"## 已經有人跑到店裡才發現沒貨（{sum(by_drug.values())} 次）",
            "",
            "這些是走進門的客人，不是路過的搜尋：",
            "",
        ]
        lines += [f"- **{labels.get(k, k)}** — {n} 次" for k, n in by_drug.most_common(10)]
        lines.append("")

    if ad.contacts:
        lines += [
            f"其中 **{ad.contacts} 個人留下聯絡方式**，說這區有藥局有貨時要通知他們。",
            "",
        ]

    # 對外的東西一定要把限制寫進去。誇大一次，之後每個數字都不會有人信。
    lines += [
        "---",
        "",
        "只記錄查詢字串、地區與時間，不含任何個人資料，也不含其他藥局的營業狀況。",
        "同一個人搜三次算三次，沒有去重；搜尋量不等於成交量 —— 這是需求訊號，不是銷售預測。",
        "",
    ]
    return "\n".join(lines)


def write_csv(rows: list[CallRow], path: Path, labels: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["區", "藥局名稱", "電話", "負責人", "地址",
                    "指名沒貨", "該區落空數", "該區最多人找", "開場白"])
        for r in rows:
            hot = (r.area.inventory + r.area.catalog).most_common(1)
            w.writerow([
                r.store.get("district", ""),
                r.store.get("name", ""),
                r.store.get("phone", ""),
                r.store.get("owner", ""),
                r.store.get("address", ""),
                r.named_hits or "",
                r.area.total,
                labels.get(hot[0][0], hot[0][0]) if hot else "",
                r.opener,
            ])


def print_sheet(rows: list[CallRow], by_area: dict[str, AreaDemand],
                labels: dict[str, str], days: int | None, source: str) -> None:
    window = f"近 {days} 天" if days else "全部"
    print(f"招商 call sheet · {window} · 來源 {source}\n")

    for ad in sorted(by_area.values(), key=lambda a: -a.total):
        hot = (ad.inventory + ad.catalog).most_common(3)
        print(f"── {ad.label}　{ad.total} 筆落空（留了聯絡方式 {ad.contacts}）")
        if hot:
            print("   最多人找：" + " · ".join(
                f"{labels.get(k, k)} {n}" for k, n in hot))
        print()

        for r in (x for x in rows if x.area.area == ad.area):
            mark = f"★{r.named_hits}" if r.starred else "  "
            phone = r.store.get("phone") or "（沒有電話）"
            print(f"  {mark} {pad(r.store.get('name', ''), 22)}"
                  f"{pad(phone, 28)}{r.store.get('owner', '')}")
            if r.starred:
                print(f"       ↳ {r.opener}")
        print()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--days", type=int, default=30, help="統計期間，0 = 全部（預設 30）")
    ap.add_argument("--min", type=int, default=MIN_RECORDS,
                    help=f"少於這個筆數的區不產 brief（預設 {MIN_RECORDS}）")
    ap.add_argument("--stdin", action="store_true", help="從 stdin 讀 vercel logs --json")
    ap.add_argument("--file", type=Path, default=None, help="指定 demand jsonl")
    ap.add_argument("--stores", type=Path, default=STORES_JSON)
    ap.add_argument("--site", default=SITE,
                    help=f"印在 brief 上的站台網址（預設 {SITE}）")
    ap.add_argument("--write", action="store_true", help="另外寫出 brief 與 call sheet CSV")
    ap.add_argument("-o", "--out", type=Path, default=None,
                    help="輸出目錄（預設 data/outreach）")
    args = ap.parse_args(argv)

    days = args.days or None
    records, source = demand_mod.load(
        file=args.file, stdin=sys.stdin if args.stdin else None
    )
    if not records:
        demand_mod.no_records_hint()
        return 1

    by_area = aggregate(demand_mod.within(records, days))
    if not by_area:
        print(f"近 {days} 天沒有任何紀錄（總共有 {len(records)} 筆，"
              f"用 --days 0 看全部）。")
        return 1

    stores = load_stores(args.stores)
    if not stores:
        print(f"找不到 {args.stores}，先跑：python3 -m pharmabox.seed")
        return 1

    labels = load_labels()
    rows = call_rows(stores, by_area, labels, days)
    print_sheet(rows, by_area, labels, days, source)

    if not args.write:
        print("（加 --write 會把 brief 與 CSV 寫出來）")
        return 0

    out_dir = args.out or data_path("outreach")
    today = date.today()
    write_csv(rows, out_dir / f"{today.isoformat()}-call-sheet.csv", labels)
    print(f"call sheet → {out_dir / f'{today.isoformat()}-call-sheet.csv'}")

    for ad in sorted(by_area.values(), key=lambda a: -a.total):
        if ad.total < args.min:
            # 這不是錯誤，是這份東西的規則：湊不出來就不要發
            print(f"跳過 {ad.label}：只有 {ad.total} 筆，低於門檻 {args.min}")
            continue
        path = out_dir / f"{today.isoformat()}-{ad.area}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(brief_markdown(ad, labels, days, today, args.site),
                        encoding="utf-8")
        print(f"brief → {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
