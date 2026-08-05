"""GS1 element-string parsing for pharma barcodes.

Input is the raw string a scanner emits in keyboard mode. FNC1 group
separators arrive as ASCII GS (0x1D); some scanners are configured to
send an AIM symbology prefix ("]d2", "]C1", ...) which we use to detect
the symbology, then strip.
"""

from __future__ import annotations

import calendar
import datetime as dt
import re
from dataclasses import dataclass, field

GS = "\x1d"

# AIM symbology identifier prefix -> symbology name
AIM_PREFIXES = {
    "]d2": "gs1_datamatrix",
    "]d1": "datamatrix",
    "]C1": "gs1_128",
    "]e0": "gs1_databar",
    "]E0": "ean13",
    "]E4": "ean8",
    "]Q3": "gs1_qr",
    "]Q1": "qr",
}

# AI -> fixed data length, or None for variable length (FNC1/GS terminated).
# Covers what shows up on drug packaging; extend as field data demands.
AI_TABLE: dict[str, int | None] = {
    "01": 14,   # GTIN
    "02": 14,   # GTIN of contained items
    "10": None, # batch/lot (max 20)
    "11": 6,    # production date YYMMDD
    "13": 6,    # packaging date
    "15": 6,    # best-before date
    "17": 6,    # expiration date YYMMDD
    "21": None, # serial number (max 20)
    "30": None, # variable count
    "37": None, # count of trade items
    "240": None, # additional product id
    "710": None, "711": None, "712": None, "713": None, "714": None,  # NHRN
}

_NHI_CODE_RE = re.compile(r"^[A-Z0-9]{10}$")


@dataclass
class ParsedScan:
    raw: str
    symbology: str
    ais: dict[str, str] = field(default_factory=dict)
    gtin: str | None = None
    expiry: dt.date | None = None
    batch: str | None = None
    serial: str | None = None

    def to_dict(self) -> dict:
        return {
            "raw": self.raw,
            "symbology": self.symbology,
            "ais": self.ais,
            "gtin": self.gtin,
            "expiry": self.expiry.isoformat() if self.expiry else None,
            "batch": self.batch,
            "serial": self.serial,
        }


def parse_gs1_date(yymmdd: str) -> dt.date | None:
    if len(yymmdd) != 6 or not yymmdd.isdigit():
        return None
    yy, mm, dd = int(yymmdd[0:2]), int(yymmdd[2:4]), int(yymmdd[4:6])
    if not 1 <= mm <= 12:
        return None
    # GS1: interpret YY within a -49/+50 year window of today.
    century_base = dt.date.today().year - dt.date.today().year % 100
    year = century_base + yy
    if year - dt.date.today().year > 50:
        year -= 100
    elif dt.date.today().year - year > 49:
        year += 100
    # DD=00 means "end of month"
    if dd == 0:
        dd = calendar.monthrange(year, mm)[1]
    try:
        return dt.date(year, mm, dd)
    except ValueError:
        return None


def _strip_aim(raw: str) -> tuple[str, str | None]:
    if len(raw) >= 3 and raw[0] == "]":
        prefix = raw[:3]
        return raw[3:], AIM_PREFIXES.get(prefix, "unknown")
    return raw, None


def _normalize(data: str) -> str:
    # Human-readable "(01)0470..." form -> bare element string with GS.
    if data.startswith("("):
        data = re.sub(r"\((\d{2,4})\)", lambda m: GS + m.group(1), data)
        data = data.lstrip(GS)
        # variable-length fields followed by "(" already got a GS injected
    return data


def parse_element_string(data: str) -> dict[str, str]:
    """Parse a GS1 element string into {AI: value}. Unknown AI aborts cleanly."""
    ais: dict[str, str] = {}
    i = 0
    while i < len(data):
        if data[i] == GS:
            i += 1
            continue
        matched = False
        for ai_len in (2, 3, 4):
            ai = data[i : i + ai_len]
            if ai in AI_TABLE:
                i += ai_len
                fixed = AI_TABLE[ai]
                if fixed is not None:
                    ais[ai] = data[i : i + fixed]
                    i += fixed
                else:
                    end = data.find(GS, i)
                    if end == -1:
                        end = len(data)
                    ais[ai] = data[i:end]
                    i = end
                matched = True
                break
        if not matched:
            break  # unparseable tail; keep what we have
    return ais


def looks_like_gs1(data: str) -> bool:
    if GS in data:
        return True
    # bare element string starting with a plausible fixed AI
    return bool(re.match(r"^01\d{14}", data)) or data.startswith("(")


def classify_and_parse(raw: str) -> ParsedScan:
    data, aim_symbology = _strip_aim(raw.strip("\r\n"))
    data = _normalize(data)

    if aim_symbology in ("gs1_datamatrix", "gs1_128", "gs1_qr", "gs1_databar") or (
        aim_symbology is None and looks_like_gs1(data)
    ):
        ais = parse_element_string(data)
        if ais:
            scan = ParsedScan(raw=raw, symbology=aim_symbology or "gs1", ais=ais)
            scan.gtin = ais.get("01")
            scan.batch = ais.get("10")
            scan.serial = ais.get("21")
            if "17" in ais:
                scan.expiry = parse_gs1_date(ais["17"])
            return scan

    if data.isdigit() and len(data) == 13:
        return ParsedScan(raw=raw, symbology="ean13")
    if data.isdigit() and len(data) == 8:
        return ParsedScan(raw=raw, symbology="ean8")
    # Taiwan NHI drug code: 10 alphanumeric with at least one letter
    if _NHI_CODE_RE.match(data) and not data.isdigit():
        return ParsedScan(raw=raw, symbology="nhi_code")
    return ParsedScan(raw=raw, symbology=aim_symbology or "unknown")
