#!/usr/bin/env python3
"""Find queries the site ranks for but has no dedicated content for.

Implements the GSC content-gap loop:
  1. Google Search Console -> Performance -> set date range to 12 months -> Export.
  2. Run this script on the exported Queries.csv and Pages.csv.
  3. Output is a ranked list of query clusters with impressions but no
     dedicated page, i.e. the cheapest content to write for quick ranking gains.

Usage:
  python3 web/scripts/gsc-content-gap.py \
    --queries Queries.csv --pages Pages.csv \
    [--sitemap https://uyaohealth.com/sitemap.xml] \
    [--min-impressions 10] [--min-position 4] [--max-position 40] \
    [--out gaps.csv]

Stdlib only. Accepts GSC exports with English or zh-TW column headers.
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import urllib.request
from dataclasses import dataclass, field
from xml.etree import ElementTree

QUERY_HEADERS = {"top queries", "query", "最熱門查詢", "查詢"}
PAGE_HEADERS = {"top pages", "page", "熱門網頁", "網頁"}
CLICK_HEADERS = {"clicks", "點擊"}
IMPRESSION_HEADERS = {"impressions", "曝光", "曝光次數"}
POSITION_HEADERS = {"position", "排序", "平均排名"}

# Expected CTR by position band; used to size the opportunity of moving a
# ranked-but-uncovered query onto a dedicated page.
TARGET_CTR = 0.12  # rough top-3 CTR

STOPWORDS = {
    "the", "a", "an", "of", "for", "to", "in", "on", "and", "or", "is",
    "what", "how", "why", "with", "near", "me", "vs",
    "的", "是", "嗎", "在", "與", "和", "怎麼", "如何", "哪裡",
}


def norm_header(h: str) -> str:
    return h.strip().lstrip("﻿").lower()


def pick_column(headers: list[str], candidates: set[str]) -> int | None:
    for i, h in enumerate(headers):
        if norm_header(h) in candidates:
            return i
    return None


def parse_number(raw: str) -> float:
    raw = raw.strip().replace(",", "").replace("%", "")
    if not raw or raw == "-":
        return 0.0
    return float(raw)


def tokenize(text: str) -> set[str]:
    """Word tokens for latin text, character bigrams for CJK."""
    text = text.lower()
    tokens: set[str] = set()
    for word in re.findall(r"[a-z0-9]+", text):
        if word not in STOPWORDS:
            tokens.add(word)
    cjk = re.findall(r"[一-鿿]", text)
    cjk = [c for c in cjk if c not in STOPWORDS]
    for i in range(len(cjk) - 1):
        tokens.add(cjk[i] + cjk[i + 1])
    if len(cjk) == 1:
        tokens.add(cjk[0])
    return tokens


@dataclass
class QueryRow:
    query: str
    clicks: float
    impressions: float
    position: float
    tokens: set[str] = field(default_factory=set)

    def __post_init__(self) -> None:
        self.tokens = tokenize(self.query)


def read_gsc_csv(path: str, key_headers: set[str]) -> list[tuple[str, float, float, float]]:
    """Return (key, clicks, impressions, position) rows from a GSC export."""
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.reader(fh)
        headers = next(reader)
        key_i = pick_column(headers, key_headers)
        if key_i is None:
            sys.exit(f"{path}: no key column found in {headers}")
        clicks_i = pick_column(headers, CLICK_HEADERS)
        imp_i = pick_column(headers, IMPRESSION_HEADERS)
        pos_i = pick_column(headers, POSITION_HEADERS)
        rows = []
        for row in reader:
            if not row or not row[key_i].strip():
                continue
            rows.append((
                row[key_i].strip(),
                parse_number(row[clicks_i]) if clicks_i is not None else 0.0,
                parse_number(row[imp_i]) if imp_i is not None else 0.0,
                parse_number(row[pos_i]) if pos_i is not None else 0.0,
            ))
        return rows


def fetch_sitemap_urls(url: str) -> list[str]:
    with urllib.request.urlopen(url, timeout=15) as resp:
        tree = ElementTree.fromstring(resp.read())
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return [loc.text.strip() for loc in tree.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc") if loc.text]


def page_tokens(url: str, fetch_titles: bool = False) -> set[str]:
    """Tokens from the URL path, optionally plus the live title/description.

    Slugs are often English while queries are Chinese (or vice versa); the
    page's <title> and meta description usually carry the query language, so
    fetching them makes coverage matching cross-lingual.
    """
    path = re.sub(r"^https?://[^/]+", "", url)
    path = path.replace("-", " ").replace("/", " ").replace("_", " ")
    tokens = tokenize(path)
    if fetch_titles:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "gsc-content-gap/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                html = resp.read(200_000).decode("utf-8", errors="replace")
            for m in re.findall(r"<title[^>]*>(.*?)</title>", html, re.I | re.S):
                tokens |= tokenize(m)
            for m in re.findall(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)', html, re.I):
                tokens |= tokenize(m)
            for m in re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.I | re.S):
                tokens |= tokenize(re.sub(r"<[^>]+>", " ", m))
        except OSError as exc:
            print(f"warn: could not fetch {url}: {exc}", file=sys.stderr)
    return tokens


def coverage(query: QueryRow, pages: list[set[str]]) -> float:
    """Best token-overlap ratio between the query and any single page."""
    if not query.tokens:
        return 1.0  # unmatchable query; treat as covered so it never surfaces
    best = 0.0
    for pt in pages:
        if not pt:
            continue
        overlap = len(query.tokens & pt) / len(query.tokens)
        best = max(best, overlap)
    return best


def cluster(rows: list[QueryRow]) -> list[list[QueryRow]]:
    """Greedy clustering by token overlap so one page idea = one cluster."""
    clusters: list[tuple[set[str], list[QueryRow]]] = []
    for row in sorted(rows, key=lambda r: -r.impressions):
        placed = False
        for tokens, members in clusters:
            union = row.tokens | tokens
            if union and len(row.tokens & tokens) / min(len(row.tokens), len(tokens) or 1) >= 0.5:
                members.append(row)
                tokens |= row.tokens
                placed = True
                break
        if not placed:
            clusters.append((set(row.tokens), [row]))
    return [members for _, members in clusters]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--queries", required=True, help="GSC Queries.csv export")
    ap.add_argument("--pages", required=True, help="GSC Pages.csv export")
    ap.add_argument("--sitemap", action="append", default=[],
                    help="sitemap URL(s) to extend the known-content list")
    ap.add_argument("--min-impressions", type=float, default=10)
    ap.add_argument("--min-position", type=float, default=4,
                    help="ignore queries already ranking above this")
    ap.add_argument("--max-position", type=float, default=40)
    ap.add_argument("--covered-threshold", type=float, default=0.6,
                    help="token-overlap ratio at which a query counts as covered")
    ap.add_argument("--fetch-titles", action="store_true",
                    help="fetch each page's title/description/h1 for "
                         "cross-lingual coverage matching (needs network)")
    ap.add_argument("--out", default=None, help="write ranked gaps to this CSV")
    args = ap.parse_args()

    queries = [QueryRow(q, c, i, p) for q, c, i, p in read_gsc_csv(args.queries, QUERY_HEADERS)]
    page_urls = [u for u, *_ in read_gsc_csv(args.pages, PAGE_HEADERS)]
    for sm in args.sitemap:
        page_urls.extend(fetch_sitemap_urls(sm))
    page_urls = sorted(set(page_urls))
    page_token_sets = [page_tokens(u, fetch_titles=args.fetch_titles) for u in page_urls]

    print(f"queries: {len(queries)}  known pages: {len(page_urls)}", file=sys.stderr)

    gaps: list[tuple[float, QueryRow]] = []
    for q in queries:
        if q.impressions < args.min_impressions:
            continue
        if not (args.min_position <= q.position <= args.max_position):
            continue
        cov = coverage(q, page_token_sets)
        if cov >= args.covered_threshold:
            continue
        current_ctr = q.clicks / q.impressions if q.impressions else 0.0
        score = q.impressions * max(TARGET_CTR - current_ctr, 0.0)
        gaps.append((score, q))

    if not gaps:
        print("No content gaps above thresholds. Either coverage is genuinely "
              "complete, or the site has too little GSC data yet.", file=sys.stderr)
        return

    clustered = cluster([q for _, q in gaps])
    ranked = sorted(
        clustered,
        key=lambda ms: -sum(m.impressions for m in ms),
    )

    writer = None
    if args.out:
        out_fh = open(args.out, "w", newline="", encoding="utf-8")
        writer = csv.writer(out_fh)
        writer.writerow(["cluster_rank", "query", "clicks", "impressions",
                         "position", "est_monthly_click_upside"])

    for rank, members in enumerate(ranked, 1):
        total_imp = sum(m.impressions for m in members)
        upside = sum(m.impressions * max(TARGET_CTR - (m.clicks / m.impressions if m.impressions else 0), 0)
                     for m in members)
        head = members[0].query
        print(f"\n#{rank}  \"{head}\"  ({len(members)} queries, "
              f"{total_imp:.0f} impressions, ~{upside:.0f} clicks/period upside)")
        for m in sorted(members, key=lambda r: -r.impressions):
            print(f"    {m.query}  imp={m.impressions:.0f} pos={m.position:.1f} clicks={m.clicks:.0f}")
            if writer:
                writer.writerow([rank, m.query, f"{m.clicks:.0f}", f"{m.impressions:.0f}",
                                 f"{m.position:.1f}", f"{m.impressions * max(TARGET_CTR - (m.clicks / m.impressions if m.impressions else 0), 0):.1f}"])

    if args.out:
        out_fh.close()
        print(f"\nwrote {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
