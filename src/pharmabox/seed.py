"""把三份資料合成消費端要吃的藥局 seed。

    食藥署 藥局基本資料 ── 店名/地址/電話/負責人   (prospects.py)
    健保署 特約藥局     ── 醫事機構代碼/看診時段/合約終止  (nhi.py)
    Google Places       ── 座標/精確營業時間/歇業狀態       (places.py)
                              ↓
                    web/lib/stores.generated.json

Places 那層是選配：沒有金鑰照樣產得出 seed，只是沒有座標、營業時間退回
健保署的粗粒度時段。有金鑰再跑一次 `pharmabox.places` 就會自動變好。

    python3 -m pharmabox.seed

**每家藥局的 offers 一律是空的。** 站上目前沒有任何一家裝了盒子，沒有
掃描流就沒有庫存與價格 —— 這不是待辦，是這個產品現在真實的狀態，庫存
徽章的「？ 請預留確認」本來就是為這個狀態設計的。
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any

from pharmabox import nhi as nhi_mod
from pharmabox import prospects as prospects_mod
from pharmabox.paths import data_path, repo_root

# 服務區 slug 對照。要開新區就加這裡，順序即消費端的預設順序。
AREA_BY_DISTRICT = {
    "中山區": "zhongshan",
    "信義區": "xinyi",
    "大同區": "datong",
    "林口區": "linkou",
    "蘆洲區": "luzhou",
    "新莊區": "xinzhuang",
    "西屯區": "xitun",
    "苗栗市": "miaoli",
}

# 各區中心點，用來算「距離」。v1 沒有真的定位，距離一律是「距區中心」，
# 所以跨區的距離不可互相比較 —— 消費端凡是混區的列表都要標行政區。
AREA_CENTER = {
    "zhongshan": (25.0637, 121.5265),
    "xinyi": (25.0330, 121.5654),
    "datong": (25.0633, 121.5130),
    "linkou": (25.0772, 121.3916),
    "luzhou": (25.0849, 121.4737),
    "xinzhuang": (25.0359, 121.4322),
    "xitun": (24.1813, 120.6466),
    "miaoli": (24.566667, 120.816444),
}

# 目前首波收錄的店。洽談狀態不進公開資料，也不等於已安裝盒子。
# 店址行政區以政府登記為準；「美得心」與新莊的「美德心」是不同店。
LISTED_STORES = (
    ("建利西藥房", "臺北市", "大同區"),
    ("美得心藥局", "新北市", "林口區"),
    ("樂活健保藥局", "新北市", "新莊區"),
    ("祥好大藥局", "新北市", "新莊區"),
    ("中山藥局", "臺北市", "中山區"),
    ("萊康連鎖藥局", "新北市", "蘆洲區"),
    ("萊康中華健保藥局", "新北市", "蘆洲區"),
    ("永遠藥師藥局", "臺中市", "西屯區"),
    ("發元藥局", "苗栗縣", "苗栗市"),
)

# 食藥署「藥局基本資料」不含一般西藥房。建利仍有有效的西藥零售商業登記，
# 因此在這裡補一筆並保留來源註記；不要把它偽裝成健保特約藥局。
MANUAL_STORES = (
    prospects_mod.Pharmacy(
        name="建利西藥房",
        city="臺北市",
        district="大同區",
        address="重慶北路1段85之3號1樓",
        owner="",
        phone="02-25556484",
        nhi_contracted=False,
    ),
    prospects_mod.Pharmacy(
        name="發元藥局",
        city="苗栗縣",
        district="苗栗市",
        address="中正路908號",
        owner="",
        phone="037-320285",
        nhi_contracted=False,
    ),
)
MANUAL_STORE_NAMES = {store.name for store in MANUAL_STORES}
MANUAL_STORE_NOTES = {
    "建利西藥房": "資料來源：臺北市商業登記",
    "發元藥局": "資料來源：合作藥局實地確認",
}

DEFAULT_SCOPES = "臺北市:大同區,中山區;新北市:林口區,新莊區,蘆洲區;臺中市:西屯區;苗栗縣:苗栗市"
DEFAULT_STORE_NAMES = ",".join(name for name, _, _ in LISTED_STORES)

WEEKDAY_LABEL = {
    "一": "週一", "二": "週二", "三": "週三", "四": "週四",
    "五": "週五", "六": "週六", "日": "週日",
}


def haversine_m(a: tuple[float, float], b: tuple[float, float]) -> int:
    from math import asin, cos, radians, sin, sqrt

    lat1, lon1, lat2, lon2 = map(radians, (a[0], a[1], b[0], b[1]))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return round(2 * 6371000 * asin(sqrt(h)))


def match_score(place: dict, name: str, full_address: str) -> int:
    """這筆 Google 結果有多像同一家店。0 = 不採用。

    分數用來解決「兩家藥局搶同一個 Google Place」：實測 Google 常把小店
    配到附近較有名的那家，例如「沛久藥局」被配到「可康藥局」。這時分數高
    的那家留著，另一家退回沒有座標 —— 全部丟掉的話會連對的那家一起犧牲。
    """
    got_name = place.get("display_name", "")
    if not got_name:
        return 0

    got_addr = nhi_mod.normalize_address(place.get("formatted_address", ""))
    want_addr = nhi_mod.normalize_address(full_address)
    street = want_addr.split("區")[-1]
    addr_ok = bool(street) and street in got_addr
    name_ok = name in got_name or got_name in name

    if name_ok and addr_ok:
        return 3
    if name_ok:
        return 2
    # 只有門牌對上時要再確認「是不是藥局」：同一個門牌可能有診所、醫美、
    # 事務所。實測「佑華藥局」被配到同址的「新佑泉診所」。
    if addr_ok and any(k in got_name for k in ("藥局", "藥房", "藥師", "藥妝")):
        return 1
    return 0


def resolve_contested(claims: dict[str, list[tuple[str, int]]]) -> set[str]:
    """回傳「該放棄這個 place」的店家識別碼集合。

    每個 place_id 只留分數最高的那一家；同分代表分不出來，全部放棄。
    """
    losers: set[str] = set()
    for holders in claims.values():
        if len(holders) < 2:
            continue
        best = max(score for _, score in holders)
        winners = [ident for ident, score in holders if score == best]
        for ident, _ in holders:
            if len(winners) > 1 or ident not in winners:
                losers.add(ident)
    return losers


def slugify(name: str) -> str:
    """中文店名直接當 slug。

    台灣在地搜尋用中文網址是正常且對 SEO 有利的，而羅馬拼音要多一個相依
    套件、又會產生「huimin」這種沒人搜的字串。真正穩定的鍵是醫事機構代碼，
    它也一起寫進 seed，之後要換 slug 還能做轉址。
    """
    cleaned = "".join(c for c in name if c.isalnum() or c in "-－")
    return cleaned.replace("－", "-") or "store"


def sessions_to_hours(sessions: dict[str, list[str]]) -> list[dict[str, str]]:
    """健保「星期一上午看診」→ 顯示用的粗粒度時段，並把連續同型的日子併行。"""
    if not sessions:
        return []
    rows: list[tuple[str, str]] = []
    for day, slots in sessions.items():
        rows.append((day, "、".join(slots)))

    merged: list[dict[str, str]] = []
    for day, slots in rows:
        if merged and merged[-1]["hours"] == slots and merged[-1]["_last"] == day:
            continue
        if merged and merged[-1]["hours"] == slots:
            merged[-1]["label"] = f"{merged[-1]['label'].split('–')[0]}–{WEEKDAY_LABEL[day]}"
            merged[-1]["_last"] = day
        else:
            merged.append({"label": WEEKDAY_LABEL[day], "hours": slots, "_last": day})
    for m in merged:
        m.pop("_last", None)
    return merged


def build(
    scopes: list[tuple[str, list[str]]],
    fda_cache: Path,
    nhi_cache: Path,
    places_cache: Path,
    today: str,
    only_stores: set[str] | None = None,
    reuse_from: Path | None = None,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    rows = prospects_mod.parse(prospects_mod.fetch_csv(fda_cache))
    rows.extend(MANUAL_STORES)
    picked = []
    districts: list[str] = []
    for city, city_districts in scopes:
        got, _ = prospects_mod.select(rows, city, city_districts)
        picked.extend(got)
        districts.extend(city_districts)

    # 公開收錄店家白名單。找不到的店名直接報錯 ——
    # 名單是手打的，錯字比「那家店真的不在開放資料裡」常見得多。
    if only_stores:
        picked = [p for p in picked if p.name in only_stores]
        missing = only_stores - {p.name for p in picked}
        if missing:
            raise SystemExit(f"這些店在開放資料的指定區域裡找不到：{'、'.join(sorted(missing))}")

    # Places cache 沒進 repo：重產 seed 時從上一版 generated json 回收
    # 座標/營業時間，不用重打付費 API。key 用 名字+地址，搬家就不沿用。
    reuse: dict[str, dict[str, Any]] = {}
    if reuse_from and reuse_from.exists():
        prev = json.loads(reuse_from.read_text(encoding="utf-8"))
        for s in prev.get("stores", []):
            reuse[f"{s['name']} {s['address']}"] = s

    index = nhi_mod.NhiIndex(nhi_mod.parse(nhi_mod.fetch_csv(nhi_cache), today))

    places: dict[str, dict] = {}
    if places_cache.exists():
        for f in places_cache.glob("*.json"):
            data = json.loads(f.read_text(encoding="utf-8"))
            places[data.get("query", "")] = data

    # 先算每家的比對分數，再解決「同一個 place_id 被多家搶」。
    scores: dict[str, int] = {}
    claims: dict[str, list[tuple[str, int]]] = {}
    for p in picked:
        ident = f"{p.name} {p.full_address}"
        data = places.get(ident)
        if not data:
            continue
        score = match_score(data, p.name, p.full_address)
        scores[ident] = score
        if score > 0 and data.get("place_id"):
            claims.setdefault(data["place_id"], []).append((ident, score))
    losers = resolve_contested(claims)

    stats = {
        "total": len(picked), "nhi_matched": 0, "with_coords": 0,
        "nhi_terminated": 0, "not_operational": 0, "slug_collisions": 0,
        "place_rejected": 0,
    }
    seen: dict[str, int] = {}
    out: list[dict[str, Any]] = []

    for p in picked:
        area = AREA_BY_DISTRICT[p.district]
        record = index.lookup(p.name, p.full_address, p.district)
        if record:
            stats["nhi_matched"] += 1
            if record.is_terminated:
                stats["nhi_terminated"] += 1

        ident = f"{p.name} {p.full_address}"
        place = places.get(ident)
        # 比對強度在這裡重算，不採用 cache 裡的旗標 —— 改進判斷準則不該
        # 需要重打一次付費 API。
        if place and (scores.get(ident, 0) == 0 or ident in losers):
            stats["place_rejected"] += 1
            place = None

        prev = reuse.get(ident) if not place else None

        if place:
            if place.get("lat"):
                stats["with_coords"] += 1
            if place.get("business_status") not in ("OPERATIONAL", "", None):
                stats["not_operational"] += 1

        slug = slugify(p.name)
        if slug in seen:  # 同名不同店：補行政區
            stats["slug_collisions"] += 1
            slug = f"{slug}-{p.district.replace('區', '')}"
        seen[slug] = seen.get(slug, 0) + 1

        lat = place.get("lat") if place else (prev.get("lat") if prev else None)
        lng = place.get("lng") if place else (prev.get("lng") if prev else None)
        if prev and prev.get("lat"):
            stats["with_coords"] += 1
        distance = (
            haversine_m(AREA_CENTER[area], (lat, lng)) if lat and lng else None
        )

        hours: list[dict[str, str]] = []
        hours_source = "none"
        if place and place.get("weekday_descriptions"):
            # Google 給「星期一: 09:00 – 12:00, ...」，標籤統一成「週一」
            # 跟健保來源一致，時間裡多餘的空白也收掉免得版面撐開。
            hours = []
            for d in place["weekday_descriptions"]:
                label, _, value = d.partition("：") if "：" in d else d.partition(": ")
                hours.append({
                    "label": label.replace("星期", "週").strip(),
                    "hours": value.strip().replace(" – ", "–").replace(", ", "、"),
                })
            hours_source = "google"
        elif prev and prev.get("hoursSource") == "google" and prev.get("hours"):
            hours = prev["hours"]
            hours_source = "google"
        elif record and record.sessions:
            hours = sessions_to_hours(record.sessions)
            hours_source = "nhi"

        notes = []
        if p.nhi_contracted:
            notes.append("健保特約")
        if p.name in MANUAL_STORE_NAMES:
            notes.append(MANUAL_STORE_NOTES[p.name])

        out.append({
            "slug": slug,
            "name": p.name,
            "area": area,
            "district": p.district,
            "address": p.full_address,
            "phone": p.dial,
            "owner": p.owner,
            "nhiCode": record.code if record else None,
            "nhiContracted": p.nhi_contracted,
            # 合約終止日已過。可能只是退出健保、也可能整間收掉 ——
            # 分不出來，所以不寫成「已歇業」，交給 Places 的 businessStatus 定奪。
            "nhiTerminatedOn": record.terminated_on if record and record.is_terminated else None,
            "lat": lat,
            "lng": lng,
            "distanceM": distance,
            "placeId": place.get("place_id") if place else (prev.get("placeId") if prev else None),
            "businessStatus": place.get("business_status") if place
                else (prev.get("businessStatus") if prev else None),
            "mapsUrl": (place or {}).get("maps_uri")
                or (prev or {}).get("mapsUrl")
                or f"https://www.google.com/maps/search/?api=1&query={p.name}+{p.full_address}",
            "hours": hours,
            "hoursSource": hours_source,
            "notes": notes,
            # 還沒有任何一家裝盒子 —— 有掃描流的才會變 live。
            "status": "listed",
        })

    listed_order = {name: i for i, (name, _, _) in enumerate(LISTED_STORES)}
    out.sort(key=lambda s: (
        listed_order.get(s["name"], len(listed_order)),
        districts.index(s["district"]),
        s["name"],
    ))
    return out, stats


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="產生消費端藥局 seed")
    ap.add_argument("--city", default="臺北市")
    ap.add_argument("--districts", default="中山區,信義區")
    ap.add_argument(
        "--scopes",
        default=DEFAULT_SCOPES,
        help='跨城市範圍，覆蓋 --city/--districts。格式：「臺北市:大同區,中山區;新北市:林口區,新莊區」',
    )
    ap.add_argument(
        "--stores",
        default=DEFAULT_STORE_NAMES,
        help="店名白名單（頓號/逗號分隔）。只留這些公開收錄店家。",
    )
    ap.add_argument(
        "--reuse-from",
        default=str(repo_root() / "web" / "lib" / "stores.generated.json"),
        help="從上一版 generated json 回收座標/營業時間（places cache 不進 repo）",
    )
    ap.add_argument("--fda-cache", default=str(data_path(".cache", "fda-pharmacies.csv")))
    ap.add_argument("--nhi-cache", default=str(data_path(".cache", "nhi-pharmacies.csv")))
    ap.add_argument("--places-cache", default=str(data_path(".cache", "places")))
    ap.add_argument("-o", "--out", default=str(repo_root() / "web" / "lib" / "stores.generated.json"))
    ap.add_argument("--today", default=date.today().strftime("%Y%m%d"))
    args = ap.parse_args(argv)

    if args.scopes:
        scopes = []
        for part in args.scopes.split(";"):
            city, _, ds = part.strip().partition(":")
            scopes.append((city, [d.strip() for d in ds.split(",") if d.strip()]))
    else:
        scopes = [(args.city, [d.strip() for d in args.districts.split(",") if d.strip()])]

    only_stores = (
        {s.strip() for s in args.stores.replace("、", ",").split(",") if s.strip()}
        if args.stores
        else None
    )

    stores, stats = build(
        scopes,
        Path(args.fda_cache), Path(args.nhi_cache), Path(args.places_cache),
        args.today,
        only_stores=only_stores,
        reuse_from=Path(args.reuse_from) if args.reuse_from else None,
    )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({
            "generatedFrom": "FDA + NHI + Google Places + 人工查核店家",
            "stores": stores,
        },
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"藥局 {stats['total']} 家 → {out}")
    print(f"  健保資料命中　{stats['nhi_matched']}（拿到醫事機構代碼與看診時段）")
    print(f"  有座標　　　　{stats['with_coords']}" + ("" if stats["with_coords"] else "　← 跑 pharmabox.places 補"))
    if stats["place_rejected"]:
        print(f"  Google 比對不符　{stats['place_rejected']}　已丟棄該筆（座標會指到別家店）")
    print(f"  合約已終止　　{stats['nhi_terminated']}　需人工確認是否仍營業")
    if stats["not_operational"]:
        print(f"  Google 標非營業中　{stats['not_operational']}")
    if stats["slug_collisions"]:
        print(f"  同名補區別　　{stats['slug_collisions']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
