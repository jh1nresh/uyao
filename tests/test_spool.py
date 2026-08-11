from pharmabox.spool import EventSpool, Uploader
from pharmabox.dev_cli import drain_all


def make_spool(tmp_path):
    return EventSpool(str(tmp_path / "spool.db"))


def test_append_and_pending(tmp_path):
    spool = make_spool(tmp_path)
    spool.append(1000.0, "unknown", {"raw": "123"})
    spool.append(1001.0, "unknown", {"raw": "456"})
    rows = spool.pending()
    assert len(rows) == 2
    assert rows[0]["kind"] == "unknown"


def test_set_kind_backlabels(tmp_path):
    spool = make_spool(tmp_path)
    a = spool.append(1000.0, "unknown", {"raw": "1"})
    b = spool.append(1001.0, "unknown", {"raw": "2"})
    spool.set_kind([a, b], "receiving")
    assert all(r["kind"] == "receiving" for r in spool.pending())


def test_upload_failure_keeps_rows(tmp_path):
    spool = make_spool(tmp_path)
    spool.append(1000.0, "dispensing", {"raw": "1"})
    up = Uploader(spool, "http://x", "dev", http_post=lambda url, body: False)
    assert up.drain_once() == 0
    assert len(spool.pending()) == 1  # nothing lost


def test_upload_success_marks_and_drains(tmp_path):
    spool = make_spool(tmp_path)
    for i in range(3):
        spool.append(1000.0 + i, "dispensing", {"raw": str(i)})
    sent = []
    up = Uploader(
        spool, "http://x", "dev", http_post=lambda url, body: sent.append(body) or True
    )
    assert up.drain_once() == 3
    assert up.drain_once() == 0
    assert spool.pending() == []
    assert len(sent[0]["events"]) == 3
    assert sent[0]["device_id"] == "dev"


def test_recovery_after_outage(tmp_path):
    spool = make_spool(tmp_path)
    spool.append(1000.0, "dispensing", {"raw": "1"})
    ok = {"v": False}
    up = Uploader(spool, "http://x", "dev", http_post=lambda url, body: ok["v"])
    assert up.drain_once() == 0
    ok["v"] = True
    assert up.drain_once() == 1
    assert spool.pending() == []


def test_dev_drain_reports_success_only_when_spool_is_empty(tmp_path):
    spool = make_spool(tmp_path)
    spool.append(1000.0, "receiving", {"raw": "1"})
    up = Uploader(spool, "http://x", "dev", http_post=lambda url, body: True)
    assert drain_all(up, spool) == 1
    assert spool.pending() == []


def test_dev_drain_fails_when_upload_leaves_pending_rows(tmp_path):
    spool = make_spool(tmp_path)
    spool.append(1000.0, "receiving", {"raw": "1"})
    up = Uploader(spool, "http://x", "dev", http_post=lambda url, body: False)
    try:
        drain_all(up, spool)
    except RuntimeError as err:
        assert str(err) == "upload failed: 1 events remain pending"
    else:
        raise AssertionError("drain_all should fail when pending rows remain")
