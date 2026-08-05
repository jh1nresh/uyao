"""Receiving vs dispensing session classifier.

Heuristic (P1):
- scans separated by < gap_s belong to one session
- a session containing any GS1 scan with an expiry date -> receiving
  (DataMatrix on the outer box only gets scanned at goods-in)
- a session of >= burst_n scans -> receiving (unpacking a delivery)
- otherwise -> dispensing
Sessions are finalized when the gap elapses; the daemon then back-labels
the session's rows in the spool.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .gs1 import ParsedScan

RECEIVING = "receiving"
DISPENSING = "dispensing"


@dataclass
class _Session:
    row_ids: list[int] = field(default_factory=list)
    last_ts: float = 0.0
    has_expiry: bool = False


class SessionClassifier:
    def __init__(self, gap_s: float = 10.0, burst_n: int = 5) -> None:
        self._gap_s = gap_s
        self._burst_n = burst_n
        self._cur: _Session | None = None

    def _finalize(self) -> tuple[list[int], str] | None:
        if self._cur is None:
            return None
        s = self._cur
        self._cur = None
        if s.has_expiry or len(s.row_ids) >= self._burst_n:
            return (s.row_ids, RECEIVING)
        return (s.row_ids, DISPENSING)

    def feed(self, row_id: int, ts: float, scan: ParsedScan) -> tuple[list[int], str] | None:
        """Add a scan. Returns (row_ids, kind) for a *finalized previous* session, if any."""
        finalized = None
        if self._cur is not None and ts - self._cur.last_ts > self._gap_s:
            finalized = self._finalize()
        if self._cur is None:
            self._cur = _Session()
        self._cur.row_ids.append(row_id)
        self._cur.last_ts = ts
        if scan.expiry is not None:
            self._cur.has_expiry = True
        return finalized

    def flush(self, now: float) -> tuple[list[int], str] | None:
        """Finalize the open session if it has gone quiet."""
        if self._cur is not None and now - self._cur.last_ts > self._gap_s:
            return self._finalize()
        return None
