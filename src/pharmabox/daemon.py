"""PharmaBox daemon: scanner evdev -> forward + decode -> classify -> spool.

Linux/Pi entry point. Requires python-evdev (`pip install evdev`).

Env config:
  PHARMABOX_DB          spool path            (default /var/lib/pharmabox/spool.db)
  PHARMABOX_API_URL     upload endpoint       (unset = spool only)
  PHARMABOX_API_KEY     bearer token          (optional)
  PHARMABOX_DEVICE_ID   box identifier        (default: hostname)
  PHARMABOX_SCANNER     substring of the scanner's evdev device name
                        (default: first device whose name contains
                         'scanner'/'barcode'/'bar code', case-insensitive)
  PHARMABOX_HIDG        /dev/hidg0 to enable passthrough (unset = standalone)
"""

from __future__ import annotations

import logging
import os
import socket
import threading
import time

from .classify import SessionClassifier
from .forwarder import HidForwarder, NullForwarder
from .gs1 import classify_and_parse
from .keymap import KeystrokeDecoder
from .spool import EventSpool, Uploader

log = logging.getLogger("pharmabox")


def find_scanner(name_hint: str | None):
    import evdev

    hints = (
        [name_hint.lower()] if name_hint else ["scanner", "barcode", "bar code"]
    )
    devices = [evdev.InputDevice(p) for p in evdev.list_devices()]
    for dev in devices:
        if any(h in dev.name.lower() for h in hints):
            return dev
    raise SystemExit(
        "No scanner found. Devices: "
        + ", ".join(f"{d.path}={d.name!r}" for d in devices)
        + " — set PHARMABOX_SCANNER to a name substring."
    )


def run() -> None:
    import evdev

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

    db_path = os.environ.get("PHARMABOX_DB", "/var/lib/pharmabox/spool.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    spool = EventSpool(db_path)

    api_url = os.environ.get("PHARMABOX_API_URL")
    if api_url:
        Uploader(
            spool,
            api_url,
            device_id=os.environ.get("PHARMABOX_DEVICE_ID", socket.gethostname()),
            api_key=os.environ.get("PHARMABOX_API_KEY"),
        ).start()
    else:
        log.info("PHARMABOX_API_URL unset — spooling locally only")

    hidg = os.environ.get("PHARMABOX_HIDG")
    forwarder = HidForwarder(hidg) if hidg else NullForwarder()

    scanner = find_scanner(os.environ.get("PHARMABOX_SCANNER"))
    scanner.grab()  # exclusive: keystrokes must not also reach the Pi's console
    log.info("Attached to %s (%s), passthrough=%s", scanner.name, scanner.path, bool(hidg))

    decoder = KeystrokeDecoder()
    classifier = SessionClassifier()
    clf_lock = threading.Lock()

    def apply(finalized):
        if finalized:
            row_ids, kind = finalized
            spool.set_kind(row_ids, kind)
            log.info("session -> %s (%d scans)", kind, len(row_ids))

    def flusher():
        # read_loop blocks while idle, so quiet sessions are finalized here
        while True:
            time.sleep(5)
            with clf_lock:
                apply(classifier.flush(time.time()))

    threading.Thread(target=flusher, daemon=True, name="flusher").start()

    for event in scanner.read_loop():
        if event.type != evdev.ecodes.EV_KEY or event.value == 2:  # skip autorepeat
            continue
        pressed = event.value == 1
        forwarder.feed(event.code, pressed)  # passthrough first, always
        barcode = decoder.feed(event.code, pressed)
        if barcode:
            scan = classify_and_parse(barcode)
            ts = time.time()
            row_id = spool.append(ts, "unknown", scan.to_dict())
            with clf_lock:
                apply(classifier.feed(row_id, ts, scan))
            log.info("scan %s %s", scan.symbology, scan.gtin or scan.raw[:32])


if __name__ == "__main__":
    run()
