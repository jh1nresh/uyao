"""把三份資料合成消費端要吃的藥局 seed。

    食藥署 藥局基本資料 ── 店名/地址/電話/負責人   (prospects.py)
    健保署 特約藥局     ── 醫事機構代碼/看診時段/合約終止  (nhi.py)
    Google Places       ── 座標/精確營業時間/歇業狀態       (places.py)
                              ↓
                    web/lib/stores.generated.json

Places 那層是選配：沒有金鑰照樣產得出 seed，只是沒有座標、營業時間退回
健保署的粗粒度時段。有金鑰再跑一次 `pharmabox.places` 就會自動變好。

    PYTHONPATH=src python3 -m pharmabox.seed

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

# 服務區 slug 對照。要開新區就加這裡，順序即消費端的預設順序。
AREA_BY_DISTRICT = {
    "中山區": "zhongshan",
    "信義區": "xinyi",
}

# 各區中心點，用來算「距離」。v1 沒有真的定位，距離一律是「距區中心」，
# 所以跨區的距離不可互相比較 —— 消費端凡是混區的列表都要標行政區。
AREA_CENTER = {
    "zhongshan": (25.0637, 121.5265),
    "xinyi": (25.0330, 121.5654),
}

WEEKDAY_LABEL = {
    "一": "週一", "二": "週二", "三": "週三", "四": "週四",
    "五": "週五", "六": "週六", "日": "週日",
}


def haversine_m(a: tuple[float, float], b: tuple[float, float]) -> int:
    from math import asin, cos, radians, sin, sqrt

    lat1, lon1, lat2, lon2 = map(radians, (a[0], a[1], b[0], b[1]))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return round(2 * 6371000 * asin(sqrt(h)))


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
    city: str,
    districts: list[str],
    fda_cache: Path,
    nhi_cache: Path,
    places_cache: Path,
    today: str,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    rows = prospects_mod.parse(prospects_mod.fetch_csv(fda_cache))
    picked, _ = prospects_mod.select(rows, city, districts)

    index = nhi_mod.NhiIndex(nhi_mod.parse(nhi_mod.fetch_csv(nhi_cache), today))

    places: dict[str, dict] = {}
    if places_cache.exists():
        for f in places_cache.glob("*.json"):
            data = json.loads(f.read_text(encoding="utf-8"))
            places[data.get("query", "")] = data

    stats = {
        "total": len(picked), "nhi_matched": 0, "with_coords": 0,
        "nhi_terminated": 0, "not_operational": 0, "slug_collisions": 0,
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

        place = places.get(f"{p.name} {p.full_address}")
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

        lat = place.get("lat") if place else None
        lng = place.get("lng") if place else None
        distance = (
            haversine_m(AREA_CENTER[area], (lat, lng)) if lat and lng else None
        )

        hours: list[dict[str, str]] = []
        hours_source = "none"
        if place and place.get("weekday_descriptions"):
            hours = [
                {"label": d.split("：")[0].split(": ")[0], "hours": d.split("：", 1)[-1].split(": ", 1)[-1]}
                for d in place["weekday_descriptions"]
            ]
            hours_source = "google"
        elif record and record.sessions:
            hours = sessions_to_hours(record.sessions)
            hours_source = "nhi"

        notes = []
        if p.nhi_contracted:
            notes.append("健保特約")

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
            "placeId": place.get("place_id") if place else None,
            "businessStatus": place.get("business_status") if place else None,
            "placeMatchConfident": place.get("confident") if place else None,
            "mapsUrl": (place or {}).get("maps_uri")
                or f"https://www.google.com/maps/search/?api=1&query={p.name}+{p.full_address}",
            "hours": hours,
            "hoursSource": hours_source,
            "notes": notes,
            # 還沒有任何一家裝盒子 —— 有掃描流的才會變 live。
            "status": "listed",
        })

    out.sort(key=lambda s: (districts.index(s["district"]), s["name"]))
    return out, stats


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="產生消費端藥局 seed")
    ap.add_argument("--city", default="臺北市")
    ap.add_argument("--districts", default="中山區,信義區")
    ap.add_argument("--fda-cache", default="data/.cache/fda-pharmacies.csv")
    ap.add_argument("--nhi-cache", default="data/.cache/nhi-pharmacies.csv")
    ap.add_argument("--places-cache", default="data/.cache/places")
    ap.add_argument("-o", "--out", default="web/lib/stores.generated.json")
    ap.add_argument("--today", default=date.today().strftime("%Y%m%d"))
    args = ap.parse_args(argv)

    districts = [d.strip() for d in args.districts.split(",") if d.strip()]
    stores, stats = build(
        args.city, districts,
        Path(args.fda_cache), Path(args.nhi_cache), Path(args.places_cache),
        args.today,
    )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({"generatedFrom": "FDA + NHI + Google Places", "stores": stores},
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"藥局 {stats['total']} 家 → {out}")
    print(f"  健保資料命中　{stats['nhi_matched']}（拿到醫事機構代碼與看診時段）")
    print(f"  有座標　　　　{stats['with_coords']}" + ("" if stats["with_coords"] else "　← 跑 pharmabox.places 補"))
    print(f"  合約已終止　　{stats['nhi_terminated']}　需人工確認是否仍營業")
    if stats["not_operational"]:
        print(f"  Google 標非營業中　{stats['not_operational']}")
    if stats["slug_collisions"]:
        print(f"  同名補區別　　{stats['slug_collisions']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
