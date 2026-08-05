"""Local event spool: SQLite queue + best-effort batch uploader.

Fire-and-forget with retry: scans always land locally first; a background
loop drains un-uploaded rows to the API when the network cooperates.
Network death never blocks or drops a scan.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import time
import urllib.error
import urllib.request

_SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL NOT NULL,
    kind TEXT NOT NULL,           -- receiving | dispensing | unknown
    payload TEXT NOT NULL,        -- ParsedScan.to_dict() as JSON
    uploaded INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_events_uploaded ON events(uploaded);
"""


class EventSpool:
    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._lock = threading.Lock()
        with self._conn() as conn:
            conn.executescript(_SCHEMA)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        return conn

    def append(self, ts: float, kind: str, payload: dict) -> int:
        with self._lock, self._conn() as conn:
            cur = conn.execute(
                "INSERT INTO events (ts, kind, payload) VALUES (?, ?, ?)",
                (ts, kind, json.dumps(payload, ensure_ascii=False)),
            )
            return cur.lastrowid

    def set_kind(self, ids: list[int], kind: str) -> None:
        if not ids:
            return
        with self._lock, self._conn() as conn:
            conn.executemany(
                "UPDATE events SET kind = ? WHERE id = ?", [(kind, i) for i in ids]
            )

    def pending(self, limit: int = 100) -> list[sqlite3.Row]:
        with self._lock, self._conn() as conn:
            return conn.execute(
                "SELECT * FROM events WHERE uploaded = 0 ORDER BY id LIMIT ?",
                (limit,),
            ).fetchall()

    def mark_uploaded(self, ids: list[int]) -> None:
        if not ids:
            return
        with self._lock, self._conn() as conn:
            conn.executemany(
                "UPDATE events SET uploaded = 1 WHERE id = ?", [(i,) for i in ids]
            )


class Uploader:
    """Drains the spool to `api_url` in batches with exponential backoff."""

    def __init__(
        self,
        spool: EventSpool,
        api_url: str,
        device_id: str,
        api_key: str | None = None,
        batch_size: int = 100,
        poll_interval: float = 5.0,
        max_backoff: float = 300.0,
        http_post=None,  # injectable for tests
    ) -> None:
        self._spool = spool
        self._api_url = api_url
        self._device_id = device_id
        self._api_key = api_key
        self._batch_size = batch_size
        self._poll_interval = poll_interval
        self._max_backoff = max_backoff
        self._post = http_post or self._default_post
        self._stop = threading.Event()

    def _default_post(self, url: str, body: dict) -> bool:
        data = json.dumps(body, ensure_ascii=False).encode()
        req = urllib.request.Request(
            url, data=data, headers={"Content-Type": "application/json"}
        )
        if self._api_key:
            req.add_header("Authorization", f"Bearer {self._api_key}")
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return 200 <= resp.status < 300
        except (urllib.error.URLError, OSError, TimeoutError):
            return False

    def drain_once(self) -> int:
        """Upload one batch. Returns number of rows uploaded (0 = nothing/failed)."""
        rows = self._spool.pending(self._batch_size)
        if not rows:
            return 0
        body = {
            "device_id": self._device_id,
            "events": [
                {
                    "id": r["id"],
                    "ts": r["ts"],
                    "kind": r["kind"],
                    "payload": json.loads(r["payload"]),
                }
                for r in rows
            ],
        }
        if self._post(self._api_url, body):
            ids = [r["id"] for r in rows]
            self._spool.mark_uploaded(ids)
            return len(ids)
        return 0

    def run_forever(self) -> None:
        backoff = self._poll_interval
        while not self._stop.is_set():
            uploaded = self.drain_once()
            if uploaded:
                backoff = self._poll_interval
            else:
                if self._spool.pending(1):  # had rows but upload failed
                    backoff = min(backoff * 2, self._max_backoff)
                else:
                    backoff = self._poll_interval
            self._stop.wait(backoff)

    def start(self) -> threading.Thread:
        t = threading.Thread(target=self.run_forever, daemon=True, name="uploader")
        t.start()
        return t

    def stop(self) -> None:
        self._stop.set()
