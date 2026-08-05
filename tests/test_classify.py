from pharmabox.classify import DISPENSING, RECEIVING, SessionClassifier
from pharmabox.gs1 import classify_and_parse

EAN = "4711234567890"
DM = "(01)04712345678901(17)271031(10)B7"


def test_burst_is_receiving():
    clf = SessionClassifier(gap_s=10, burst_n=5)
    t = 1000.0
    for i in range(6):
        assert clf.feed(i, t + i, classify_and_parse(EAN)) is None
    out = clf.flush(t + 100)
    assert out == ([0, 1, 2, 3, 4, 5], RECEIVING)


def test_single_scan_is_dispensing():
    clf = SessionClassifier(gap_s=10, burst_n=5)
    clf.feed(1, 1000.0, classify_and_parse(EAN))
    out = clf.flush(1020.0)
    assert out == ([1], DISPENSING)


def test_expiry_scan_forces_receiving_even_if_small():
    clf = SessionClassifier(gap_s=10, burst_n=5)
    clf.feed(1, 1000.0, classify_and_parse(DM))
    out = clf.flush(1020.0)
    assert out == ([1], RECEIVING)


def test_gap_splits_sessions():
    clf = SessionClassifier(gap_s=10, burst_n=5)
    clf.feed(1, 1000.0, classify_and_parse(EAN))
    finalized = clf.feed(2, 1050.0, classify_and_parse(EAN))  # 50s later
    assert finalized == ([1], DISPENSING)
    out = clf.flush(1100.0)
    assert out == ([2], DISPENSING)


def test_flush_respects_quiet_period():
    clf = SessionClassifier(gap_s=10, burst_n=5)
    clf.feed(1, 1000.0, classify_and_parse(EAN))
    assert clf.flush(1005.0) is None  # still inside gap window
