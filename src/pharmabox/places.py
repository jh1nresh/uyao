"""Google Places API (New) — 補政府開放資料缺的三樣東西。

1. **座標**：消費端的「距離」現在是寫死的公尺數。有座標才能真的算，
   地圖也才能從示意圖變真圖。
2. **精確營業時間**：健保資料只有「星期一上午看診」這種粒度，撐不起
   設計稿上的「營業中 · 至 21:30」。
3. **businessStatus**：政府資料的「開業」會落後現實。健保合約終止日已過
   的那批（名單裡有 20 家）到底是單純退出健保、還是整間收掉，只有這個
   欄位分得出來。

需要環境變數 `GOOGLE_MAPS_API_KEY`（Places API (New) 要在 GCP 開通並綁定
帳單）。每家藥局查一次、結果落地成 JSON cache，重跑不會重複計費。

    export GOOGLE_MAPS_API_KEY=...
    python3 -m pharmabox.places --limit 5   # 先試跑 5 家
    python3 -m pharmabox.places             # 全跑
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path

from pharmabox.paths import data_path

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

# 只要這些欄位 —— field mask 直接決定計費級距，不要順手多拿。
# 評分與照片是 Enterprise 級且設計方向上用不到，刻意不取。
FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.googleMapsUri",
    "places.businessStatus",
    "places.nationalPhoneNumber",
    "places.regularOpeningHours.weekdayDescriptions",
    "places.regularOpeningHours.periods",
])

# 大同、林口、新莊、中山四區的外框，用來避免撞到外縣市同名藥局。
SERVICE_BIAS = {
    "low": {"latitude": 25.020, "longitude": 121.370},
    "high": {"latitude": 25.100, "longitude": 121.550},
}


class MissingApiKey(RuntimeError):
    pass


class PlacesAccessDenied(RuntimeError):
    """401/403 —— 金鑰無效、API 沒啟用、或帳單沒綁。

    這種錯不會因為多打幾次就好，所以第一筆就停，不要把 166 家全打完。
    Google 的訊息裡通常帶一條可直接點的啟用連結，原樣轉給使用者。
    """

    def __init__(self, status: int, payload: str):
        self.status = status
        self.payload = payload
        super().__init__(f"HTTP {status}")

    @property
    def google_message(self) -> str:
        try:
            return json.loads(self.payload)["error"]["message"]
        except (ValueError, KeyError, TypeError):
            return self.payload.strip()

    def advice(self) -> str:
        msg = self.google_message
        url = ""
        for token in msg.replace("\n", " ").split():
            if token.startswith("https://console"):
                url = token.rstrip(".,")
                break

        lines = [f"Google 拒絕了這次請求（HTTP {self.status}）：", f"  {msg}", ""]
        if "has not been used in project" in msg or "is disabled" in msg:
            lines += [
                "這是專案還沒啟用 Places API (New)，不是金鑰壞掉。要做的事：",
                f"  1. 開 {url or 'https://console.cloud.google.com/apis/library/places.googleapis.com'}",
                "  2. 按 Enable（注意是 Places API (New)，不是舊版 Places API）",
                "  3. 確認該專案已綁定帳單帳戶",
                "  4. 等一兩分鐘讓設定生效，再重跑",
            ]
        elif self.status == 401:
            lines += ["金鑰無效或已撤銷。重新產一把再 export GOOGLE_MAPS_API_KEY。"]
        else:
            lines += [
                "常見原因：金鑰設了 HTTP referer/IP 限制（命令列打不通），",
                "或是金鑰的 API 限制清單裡沒有勾 Places API (New)。",
            ]
        return "\n".join(lines)


@dataclass
class PlaceResult:
    place_id: str
    display_name: str
    formatted_address: str
    lat: float
    lng: float
    maps_uri: str
    business_status: str
    phone: str
    """Google 給的人類可讀營業時間，7 行，一行一天。"""
    weekday_descriptions: list[str]
    """periods 原始結構，之後要算「現在是否營業」用得到。"""
    periods: list[dict]
    """比對信心：名稱與地址是否都對得上。false 的要人工看過再用。"""
    confident: bool
    query: str


def _api_key() -> str:
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        raise MissingApiKey(
            "缺 GOOGLE_MAPS_API_KEY。到 GCP 開通 Places API (New) 並綁帳單後：\n"
            "  export GOOGLE_MAPS_API_KEY=..."
        )
    return key


def search_text(query: str, key: str | None = None) -> dict:
    body = json.dumps({
        "textQuery": query,
        "languageCode": "zh-TW",
        "regionCode": "TW",
        "maxResultCount": 3,
        "locationBias": {"rectangle": SERVICE_BIAS},
    }).encode("utf-8")

    req = urllib.request.Request(
        SEARCH_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key or _api_key(),
            "X-Goog-FieldMask": FIELD_MASK,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _confident(candidate: dict, name: str, street: str) -> bool:
    """Google 回的第一筆不一定是同一家 —— 名稱或地址至少要有一個真的對上。

    地址比對只取門牌前段（街名 + 號），因為 Google 的地址格式與政府的不同。
    """
    got_name = (candidate.get("displayName") or {}).get("text", "")
    got_addr = candidate.get("formattedAddress", "")
    name_ok = name in got_name or got_name in name
    key = street.split("號")[0]
    addr_ok = bool(key) and key in got_addr.replace(" ", "")
    return name_ok or addr_ok


def lookup(name: str, full_address: str, street: str, key: str | None = None) -> PlaceResult | None:
    query = f"{name} {full_address}"
    data = search_text(query, key)
    places = data.get("places") or []
    if not places:
        return None

    best = places[0]
    loc = best.get("location") or {}
    hours = best.get("regularOpeningHours") or {}
    return PlaceResult(
        place_id=best.get("id", ""),
        display_name=(best.get("displayName") or {}).get("text", ""),
        formatted_address=best.get("formattedAddress", ""),
        lat=loc.get("latitude", 0.0),
        lng=loc.get("longitude", 0.0),
        maps_uri=best.get("googleMapsUri", ""),
        business_status=best.get("businessStatus", ""),
        phone=best.get("nationalPhoneNumber", ""),
        weekday_descriptions=hours.get("weekdayDescriptions", []),
        periods=hours.get("periods", []),
        confident=_confident(best, name, street),
        query=query,
    )


def enrich(
    rows: list,
    cache_dir: Path,
    limit: int | None = None,
    refresh: bool = False,
    delay: float = 0.1,
) -> dict[str, PlaceResult]:
    """對每家藥局查一次並落地 cache。cache 命中就不再打 API。

    `rows` 是 `prospects.Pharmacy`。回傳 key 為 `name|full_address`。
    """
    cache_dir.mkdir(parents=True, exist_ok=True)
    key = _api_key()
    out: dict[str, PlaceResult] = {}

    todo = rows[:limit] if limit else rows
    for i, p in enumerate(todo, 1):
        ident = f"{p.name}|{p.full_address}"
        safe = "".join(c if c.isalnum() else "_" for c in ident)[:120]
        path = cache_dir / f"{safe}.json"

        if path.exists() and not refresh:
            out[ident] = PlaceResult(**json.loads(path.read_text(encoding="utf-8")))
            continue

        try:
            res = lookup(p.name, p.full_address, p.address, key)
        except urllib.error.HTTPError as err:
            payload = err.read().decode("utf-8", "replace")
            if err.code in (401, 403):  # 金鑰或授權問題，繼續打只是浪費
                raise PlacesAccessDenied(err.code, payload) from None
            print(f"  [{i}/{len(todo)}] {p.name} HTTP {err.code}: {payload[:200]}", file=sys.stderr)
            continue
        except urllib.error.URLError as err:
            print(f"  [{i}/{len(todo)}] {p.name} 連線失敗: {err}", file=sys.stderr)
            continue

        if res is None:
            print(f"  [{i}/{len(todo)}] {p.name} Google 查無此店")
            continue

        path.write_text(json.dumps(asdict(res), ensure_ascii=False, indent=2), encoding="utf-8")
        out[ident] = res
        flag = "" if res.confident else "  ⚠ 比對存疑"
        print(f"  [{i}/{len(todo)}] {p.name} → {res.display_name} {res.business_status}{flag}")
        time.sleep(delay)

    return out


def main(argv: list[str] | None = None) -> int:
    from pharmabox.prospects import fetch_csv, parse, select
    from pharmabox.seed import DEFAULT_SCOPES, DEFAULT_STORE_NAMES, MANUAL_STORES

    ap = argparse.ArgumentParser(description="用 Google Places 補齊藥局座標與營業時間")
    ap.add_argument("--city", default="臺北市")
    ap.add_argument("--districts", default="中山區,信義區")
    ap.add_argument(
        "--scopes",
        default=DEFAULT_SCOPES,
        help='跨城市範圍，覆蓋 --city/--districts。格式同 seed：「臺北市:大同區,中山區;新北市:林口區,新莊區」。傳空字串退回 --city/--districts。',
    )
    ap.add_argument(
        "--stores",
        default=DEFAULT_STORE_NAMES,
        help="店名白名單（頓號/逗號分隔），只查這些店免得整區都產生 API 費用。傳空字串查整個範圍。",
    )
    ap.add_argument("--limit", type=int, default=None, help="只跑前 N 家，試打用")
    ap.add_argument("--refresh", action="store_true", help="忽略 cache 重查")
    ap.add_argument("--cache", default=str(data_path(".cache", "fda-pharmacies.csv")))
    ap.add_argument("--places-cache", default=str(data_path(".cache", "places")))
    args = ap.parse_args(argv)

    rows = parse(fetch_csv(Path(args.cache)))
    # 食藥署資料集不含一般西藥房 —— 手動補的店（如建利西藥房）也要能查座標。
    rows = [*rows, *MANUAL_STORES]

    if args.scopes:
        scopes = []
        for part in args.scopes.split(";"):
            city, _, ds = part.strip().partition(":")
            scopes.append((city, [d.strip() for d in ds.split(",") if d.strip()]))
    else:
        scopes = [(args.city, [d.strip() for d in args.districts.split(",") if d.strip()])]

    picked = []
    for city, districts in scopes:
        got_rows, _ = select(rows, city, districts)
        picked.extend(got_rows)

    if args.stores:
        only = {s.strip() for s in args.stores.replace("、", ",").split(",") if s.strip()}
        picked = [p for p in picked if p.name in only]
        missing = only - {p.name for p in picked}
        if missing:
            print(f"這些店在指定範圍找不到：{'、'.join(sorted(missing))}", file=sys.stderr)
            return 2

    try:
        got = enrich(picked, Path(args.places_cache), args.limit, args.refresh)
    except MissingApiKey as err:
        print(err, file=sys.stderr)
        return 2
    except PlacesAccessDenied as err:
        # 設定問題不是程式問題 —— 給可執行的下一步，不要吐 traceback。
        print(err.advice(), file=sys.stderr)
        return 3

    unsure = [k for k, v in got.items() if not v.confident]
    closed = [k for k, v in got.items() if v.business_status not in ("OPERATIONAL", "")]
    print(f"\n查到 {len(got)}/{len(picked)} 家")
    print(f"比對存疑 {len(unsure)}　非營業中 {len(closed)}")
    for k in closed:
        print(f"  {k.split('|')[0]} → {got[k].business_status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
