"""Dev-mode pipeline: stdin plays the scanner (works on macOS, no evdev).

A USB scanner in keyboard mode "types" into the terminal, so piping or
scanning straight into this CLI exercises parse -> classify -> spool,
identical to the Pi daemon minus evdev/HID.

Usage:
  echo ']d201047123456789011727103110A1B2' | python3 -m pharmabox.dev_cli
  python3 -m pharmabox.dev_cli --db /tmp/spool.db     # then scan away, Ctrl-D to end
  python3 -m pharmabox.dev_cli --drain                # try uploading pending rows

In text input, use '|' or literal '\\x1d' to stand in for the GS separator.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

from .classify import SessionClassifier
from .gs1 import classify_and_parse
from .spool import EventSpool, Uploader


def drain_all(up: Uploader, spool: EventSpool) -> int:
    """Drain the spool or fail instead of reporting a false zero-event success."""
    total = 0
    while (n := up.drain_once()) > 0:
        total += n
    remaining = len(spool.pending(10_000))
    if remaining:
        raise RuntimeError(f"upload failed: {remaining} events remain pending")
    return total


def main() -> None:
    ap = argparse.ArgumentParser(description="PharmaBox dev pipeline (stdin scanner)")
    ap.add_argument("--db", default="/tmp/pharmabox-dev.db")
    ap.add_argument("--gap", type=float, default=10.0, help="session gap seconds")
    ap.add_argument("--drain", action="store_true", help="drain spool to PHARMABOX_API_URL and exit")
    ap.add_argument(
        "--device",
        default=os.environ.get("PHARMABOX_DEVICE_ID", "dev-cli"),
        help="device_id sent on upload; the cloud maps it to a store "
        "(simulation: pass the store slug directly)",
    )
    args = ap.parse_args()

    spool = EventSpool(args.db)

    if args.drain:
        api_url = os.environ.get("PHARMABOX_API_URL")
        if not api_url:
            sys.exit("set PHARMABOX_API_URL first")
        up = Uploader(spool, api_url, device_id=args.device,
                      api_key=os.environ.get("PHARMABOX_API_KEY"))
        try:
            total = drain_all(up, spool)
        except RuntimeError as err:
            sys.exit(str(err))
        print(f"uploaded {total} events")
        return

    classifier = SessionClassifier(gap_s=args.gap)

    def apply(finalized):
        if finalized:
            row_ids, kind = finalized
            spool.set_kind(row_ids, kind)
            print(f"  ⇒ session finalized: {kind} ({len(row_ids)} scans)")

    for line in sys.stdin:
        raw = line.rstrip("\r\n")
        if not raw:
            continue
        raw = raw.replace("|", "\x1d").replace("\\x1d", "\x1d")
        scan = classify_and_parse(raw)
        ts = time.time()
        row_id = spool.append(ts, "unknown", scan.to_dict())
        apply(classifier.feed(row_id, ts, scan))
        print(json.dumps(scan.to_dict(), ensure_ascii=False))

    apply(classifier.flush(time.time() + args.gap + 1))
    pending = len(spool.pending(10_000))
    print(f"spool: {pending} events pending upload in {args.db}", file=sys.stderr)


if __name__ == "__main__":
    main()
