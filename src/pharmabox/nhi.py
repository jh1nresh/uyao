"""健保特約藥局資料 — 補上食藥署資料沒有的欄位。

食藥署「藥局基本資料」給的是店名/地址/電話，缺兩樣關鍵的：

- **醫事機構代碼**：政府配發的穩定 ID。網址 slug 需要一個不會因為店名
  改字就變掉的鍵，這是唯一可靠的來源。
- **固定看診時段**：「星期一上午看診」這種粗粒度營業時段。不夠精確到
  09:00–21:30，但在拿到 Google Places 之前足以判斷「今天有沒有開」。

另外 `終止合約或歇業日期` 是實測有用的新鮮度訊號：全國 10,080 筆裡有
2,423 筆日期已過 = 已終止合約或歇業，但食藥署那份仍標「開業」。名單裡
撞到這種要標記出來，不然會叫業務去打一家已經關掉的店。

資料來源：健保署「健保特約醫事機構-藥局」 https://data.gov.tw/dataset/39284
"""

from __future__ import annotations

import csv
import io
import re
import urllib.request
from dataclasses import dataclass
from pathlib import Path

NHI_CSV_URL = "https://info.nhi.gov.tw/api/iode0000s01/Dataset?rId=A21030000I-D21005-001"

_FULLWIDTH = "０１２３４５６７８９"
_HALFWIDTH = "0123456789"
_CN_DIGITS = "〇一二三四五六七八九十"

WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"]
SLOTS = ["上午", "下午", "晚上"]


@dataclass
class NhiRecord:
    code: str
    name: str
    address: str
    phone: str
    """看診時段：{'一': ['上午','下午'], ...}，沒填就是空 dict。"""
    sessions: dict[str, list[str]]
    terminated_on: str
    """該筆的合約終止/歇業日已過 —— 食藥署資料可能還沒同步。"""
    is_terminated: bool


def to_halfwidth(s: str) -> str:
    for a, b in zip(_FULLWIDTH, _HALFWIDTH):
        s = s.replace(a, b)
    return s


# 門牌裡會接數字的單位。只在這些字前面轉換，才不會把「三重」「十分」
# 這種地名裡的國字也一起改掉。
_ADDRESS_UNITS = "號巷弄段樓之"


def cn_number_to_arabic(s: str) -> str:
    """「二六七號」→「267號」、「八十二巷五號」→「82巷5號」。

    地址門牌在兩份資料裡一份用國字一份用阿拉伯數字，不轉就對不起來。
    單位不只「號」—— 巷、弄、段、樓、之 都會接數字，漏掉任何一個就會
    讓「虎林街八十二巷五號」對不上「虎林街82巷5號」。
    """

    def digit(c: str) -> int:
        return int(c) if c.isdigit() else _CN_DIGITS.index(c)

    def rep(m: re.Match[str]) -> str:
        t = m.group(0).replace("零", "〇")
        # 至少要有一個國字數字才動手。純阿拉伯的「308號」原樣放過 ——
        # 一律轉換會把中間的 0 拆壞。
        if not any(c in _CN_DIGITS for c in t):
            return m.group(0)
        try:
            if "十" in t:
                head, _, tail = t.partition("十")
                value = (digit(head) if head else 1) * 10 + (digit(tail) if tail else 0)
            else:
                value = int("".join(str(digit(c)) for c in t))
        except (ValueError, IndexError):
            return m.group(0)
        return str(value)

    # 阿拉伯數字也納入同一串：「五0八」這種國字混阿拉伯零的寫法真的存在
    # （忠孝東路五段五0八之四號）。但只有整串含國字時才會被轉換。
    return re.sub(
        rf"[〇零0-9一二三四五六七八九十]+(?=[{_ADDRESS_UNITS}])", rep, s
    )


def normalize_address(s: str) -> str:
    """把兩份資料的地址壓成可比對的形式。

    差異來源：全形數字、台/臺、樓層與括號補述、空白。
    """
    # 先轉半形再處理國字：全形「０」也要能併進國字數字串裡。
    s = cn_number_to_arabic(to_halfwidth(s.strip()))
    # 「68之3號」與「68-3號」是同一個門牌，兩份資料各寫各的。
    s = s.replace("台", "臺").replace("之", "-").replace("–", "-").replace("‑", "-")
    s = re.sub(r"[(（][^)）]*[)）]", "", s)
    # 樓層兩種寫法都要剝：「307號1樓」與「二六七號一樓」都出現在真實資料裡。
    # cn_number_to_arabic 只轉「N號」不轉「N樓」，所以這裡得吃國字。
    s = re.sub(r"[之\-]?[0-9〇一二三四五六七八九十]*樓$", "", s)
    return re.sub(r"\s+", "", s)


def parse_sessions(raw: str) -> dict[str, list[str]]:
    """「星期一上午看診、星期一下午看診」→ {'一': ['上午','下午']}"""
    out: dict[str, list[str]] = {}
    for day in WEEKDAYS:
        got = [s for s in SLOTS if f"星期{day}{s}看診" in raw]
        if got:
            out[day] = got
    return out


def fetch_csv(cache: Path | None = None, refresh: bool = False) -> str:
    if cache and cache.exists() and not refresh:
        return cache.read_text(encoding="utf-8-sig")
    with urllib.request.urlopen(NHI_CSV_URL, timeout=180) as resp:
        raw = resp.read().decode("utf-8-sig")
    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(raw, encoding="utf-8")
    return raw


def parse(raw: str, today: str) -> list[NhiRecord]:
    """`today` 用 YYYYMMDD，由呼叫端傳入 —— 讓輸出可重現，不隱含讀時鐘。"""
    out: list[NhiRecord] = []
    for row in csv.DictReader(io.StringIO(raw)):
        term = (row.get("終止合約或歇業日期") or "").strip()
        out.append(
            NhiRecord(
                code=(row.get("醫事機構代碼") or "").strip(),
                name=(row.get("醫事機構名稱") or "").strip(),
                address=(row.get("地址") or "").strip(),
                phone=(row.get("電話") or "").strip(),
                sessions=parse_sessions(row.get("固定看診時段") or ""),
                terminated_on=term,
                is_terminated=bool(term) and term < today,
            )
        )
    return out


class NhiIndex:
    """兩段式比對：先地址精準對，對不上再退回「店名 + 行政區唯一」。

    刻意不做模糊比對 —— 配錯機構代碼會讓 slug 指到別家藥局，寧可留空。
    """

    def __init__(self, records: list[NhiRecord]):
        self._by_key: dict[tuple[str, str], NhiRecord] = {}
        self._by_name: dict[str, list[NhiRecord]] = {}
        for r in records:
            key = (r.name, normalize_address(r.address))
            held = self._by_key.get(key)
            # 同一個門牌可能有多筆合約，例如藥師自營約終止後換成藥劑生自營約
            # （一銘藥局就是這樣）。CSV 順序不保證新約在前，取第一筆會讓還在
            # 營業的店被標成「合約已終止」—— 有效約一律優先。
            if held is None or (held.is_terminated and not r.is_terminated):
                self._by_key[key] = r
            self._by_name.setdefault(r.name, []).append(r)

    def lookup(self, name: str, full_address: str, district: str) -> NhiRecord | None:
        exact = self._by_key.get((name, normalize_address(full_address)))
        if exact:
            return exact
        same_district = [r for r in self._by_name.get(name, []) if district in r.address]
        return same_district[0] if len(same_district) == 1 else None
