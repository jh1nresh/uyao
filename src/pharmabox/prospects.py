"""藥局名單 pipeline — 從 FDA 開放資料撈出目標區域的獨立藥局。

供給側獲客用：盒子要插進去的是「自己能決定的店」，連鎖有總部集中採購和
既有 POS/ERP，不是 P1 的對象。

    python3 -m pharmabox.prospects                       # 預設臺北市 中山區,信義區
    python3 -m pharmabox.prospects --districts 大安區,松山區
    python3 -m pharmabox.prospects --include-chains -o all.csv

資料來源：衛福部食藥署「藥局基本資料」開放資料集
https://data.gov.tw/dataset/6134 → https://data.fda.gov.tw/data/opendata/export/35/csv

注意這個資料集只涵蓋**藥局**。屈臣氏、寶雅等藥妝通路不在裡面（它們以藥妝店
登記），所以名單裡不會出現、也不需要另外排除。
"""

from __future__ import annotations

import argparse
import csv
import io
import sys
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from pharmabox.paths import data_path

FDA_CSV_URL = "https://data.fda.gov.tw/data/opendata/export/35/csv"

# 補市話區碼用。資料裡不少店家只填 8 碼本地號碼。
AREA_CODES = {
    "臺北市": "02", "新北市": "02", "基隆市": "02", "桃園市": "03",
    "新竹市": "03", "新竹縣": "03", "宜蘭縣": "03", "花蓮縣": "03",
    "苗栗縣": "037", "臺中市": "04", "彰化縣": "04", "南投縣": "049",
    "雲林縣": "05", "嘉義市": "05", "嘉義縣": "05", "臺南市": "06",
    "澎湖縣": "06", "高雄市": "07", "屏東縣": "08", "臺東縣": "089",
    "金門縣": "082", "連江縣": "0836",
}

# 全國/大型連鎖：總部集中採購，門市沒有裝盒子的決定權。預設排除。
# 每個都用全國家數 + 跨縣市分布驗證過（見 tests/test_prospects.py）。
NATIONAL_CHAINS = (
    "康是美",
    "躍獅",
    "大樹",
    "佑全",
    "杏一",
    "丁丁",
    "啄木鳥",
    "富康活力",
    "美康",
    "台安",
    "新資生",
    "安麗兒",
    "合康連鎖",
    "維康",
    "健康人生",
)

# 區域連鎖：集中在雙北的多店品牌。仍有自主性但要找到對的窗口，
# 標記出來讓你決定要不要打，預設排除。
REGIONAL_CHAINS = (
    "專品",
    "春天",
    "十二願",
    "北一",
)

# 生僻但重要：底下這些是「吉祥字撞名」不是連鎖 —— 全國分散、每縣市 1–2 家。
# 純用出現頻率分類會把它們誤判成連鎖，所以連鎖名單是人工策展不是自動推導。
NOT_CHAINS_LOOKALIKE = (
    "健康",
    "安康",
    "永安",
    "長青",
    "第一",
    "仁愛",
    "喜樂",
    "中山",
    "大安",
)


@dataclass
class Pharmacy:
    name: str
    city: str
    district: str
    address: str
    owner: str
    phone: str
    nhi_contracted: bool
    tier: str = "獨立"
    brand: str = ""

    @property
    def full_address(self) -> str:
        return f"{self.city}{self.district}{self.address}"

    @property
    def dials(self) -> list[str]:
        """原始電話欄位很髒，正規化成可直接撥的號碼。實際見過的形態：

            25170068              市話漏了區碼
            25236979、0937661282  一格塞兩支
            02-27774628           已經有分隔線
            (02)2708-5566         括號區碼
            ''                    沒填

        區碼補法用「藥局所在縣市」推，不是猜 —— 這份資料是全國的。
        """
        raw = self.phone
        for sep in ("、", "，", ",", "/", ";", "；", " "):
            raw = raw.replace(sep, "|")

        out: list[str] = []
        for chunk in raw.split("|"):
            d = "".join(c for c in chunk if c.isdigit())
            if not d:
                continue
            if d.startswith("09") and len(d) == 10:  # 手機
                out.append(f"{d[:4]}-{d[4:7]}-{d[7:]}")
                continue
            if not d.startswith("0"):  # 漏區碼，用縣市補
                d = AREA_CODES.get(self.city, "") + d
            if not d.startswith("0") or len(d) < 9:
                out.append(chunk.strip())  # 補不回來就留原樣，不要偽造號碼
                continue
            area_code = AREA_CODES.get(self.city, "")
            head = len(area_code) if area_code and d.startswith(area_code) else 2
            rest = d[head:]
            if len(rest) == 6:
                out.append(f"{d[:head]}-{rest[:3]}-{rest[3:]}")
            else:
                out.append(f"{d[:head]}-{rest[:-4]}-{rest[-4:]}")
        return out

    @property
    def dial(self) -> str:
        return "、".join(self.dials)


@dataclass
class Summary:
    total_in_area: int = 0
    independent: int = 0
    by_tier: dict[str, int] = field(default_factory=dict)
    by_district: dict[str, int] = field(default_factory=dict)


def fetch_csv(cache: Path | None = None, refresh: bool = False) -> str:
    """抓開放資料。有 cache 就重複使用 —— 這份資料一年只更新幾次。"""
    if cache and cache.exists() and not refresh:
        return cache.read_text(encoding="utf-8-sig")

    with urllib.request.urlopen(FDA_CSV_URL, timeout=120) as resp:
        raw = resp.read().decode("utf-8-sig")

    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(raw, encoding="utf-8")
    return raw


def classify(name: str) -> tuple[str, str]:
    """回傳 (tier, brand)。比對用 `in` 不是 startswith —— 連鎖品牌常放在
    分店名後面，例如「大直小太陽藥局」對比「杏一龍錦藥局」。"""
    for brand in NATIONAL_CHAINS:
        if brand in name:
            return "全國連鎖", brand
    for brand in REGIONAL_CHAINS:
        if brand in name:
            return "區域連鎖", brand
    return "獨立", ""


def parse(raw: str) -> list[Pharmacy]:
    out: list[Pharmacy] = []
    for row in csv.DictReader(io.StringIO(raw)):
        if row.get("機構狀態") != "開業":
            continue
        name = (row.get("機構名稱") or "").strip()
        tier, brand = classify(name)
        out.append(
            Pharmacy(
                name=name,
                city=(row.get("地址縣市別") or "").strip(),
                district=(row.get("地址鄉鎮市區") or "").strip(),
                address=(row.get("地址街道巷弄號") or "").strip(),
                owner=(row.get("負責人姓名") or "").strip(),
                phone=(row.get("電話") or "").strip(),
                nhi_contracted=(row.get("是否為健保特約藥局") or "").strip() == "Y",
                tier=tier,
                brand=brand,
            )
        )
    return out


def select(
    pharmacies: list[Pharmacy],
    city: str,
    districts: list[str],
    include_chains: bool = False,
) -> tuple[list[Pharmacy], Summary]:
    in_area = [p for p in pharmacies if p.city == city and p.district in districts]

    summary = Summary(total_in_area=len(in_area))
    for p in in_area:
        summary.by_tier[p.tier] = summary.by_tier.get(p.tier, 0) + 1

    picked = in_area if include_chains else [p for p in in_area if p.tier == "獨立"]
    picked.sort(key=lambda p: (districts.index(p.district), p.name))

    summary.independent = sum(1 for p in in_area if p.tier == "獨立")
    for p in picked:
        summary.by_district[p.district] = summary.by_district.get(p.district, 0) + 1
    return picked, summary


def write_csv(rows: list[Pharmacy], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["區", "藥局名稱", "地址", "電話", "負責人", "健保特約", "類型", "品牌"])
        for p in rows:
            w.writerow([
                p.district,
                p.name,
                p.full_address,
                p.dial,
                p.owner,
                "Y" if p.nhi_contracted else "N",
                p.tier,
                p.brand,
            ])


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="從 FDA 開放資料產生藥局獲客名單")
    ap.add_argument("--city", default="臺北市")
    ap.add_argument("--districts", default="中山區,信義區", help="逗號分隔")
    ap.add_argument("--include-chains", action="store_true", help="連鎖也一起輸出")
    ap.add_argument("-o", "--out", default=str(data_path("prospects.csv")))
    ap.add_argument("--cache", default=str(data_path(".cache", "fda-pharmacies.csv")))
    ap.add_argument("--refresh", action="store_true", help="忽略 cache 重抓")
    args = ap.parse_args(argv)

    districts = [d.strip() for d in args.districts.split(",") if d.strip()]
    raw = fetch_csv(Path(args.cache) if args.cache else None, refresh=args.refresh)
    pharmacies = parse(raw)
    picked, summary = select(pharmacies, args.city, districts, args.include_chains)

    out = Path(args.out)
    write_csv(picked, out)

    print(f"全國開業藥局　{len(pharmacies)}")
    print(f"{args.city} {'/'.join(districts)}　{summary.total_in_area} 家")
    for tier, n in sorted(summary.by_tier.items(), key=lambda kv: -kv[1]):
        print(f"  {tier:<6}{n}")
    print(f"\n名單 {len(picked)} 家 → {out}")
    for d, n in summary.by_district.items():
        print(f"  {d} {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
