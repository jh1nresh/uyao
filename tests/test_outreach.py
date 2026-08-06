import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from pharmabox import demand as demand_mod
from pharmabox.outreach import (
    DATA_TS,
    SITE,
    AreaDemand,
    aggregate,
    brief_markdown,
    call_rows,
    load_labels,
    load_stores,
    main,
    opener,
)


def rec(kind="inventory_miss", area="zhongshan", ago_days=1, **kw):
    at = datetime.now(timezone.utc) - timedelta(days=ago_days)
    return {"at": at.isoformat().replace("+00:00", "Z"), "kind": kind, "area": area, **kw}


def store(slug="OK藥師藥局", area="zhongshan", district="中山區"):
    return {
        "slug": slug, "name": slug, "area": area, "district": district,
        "address": f"臺北市{district}測試路 1 號", "phone": "02-2517-0068",
        "owner": "呂發財",
    }


class TestAggregate:
    def test_splits_by_kind(self):
        ad = aggregate([
            rec("inventory_miss", drugSlug="salonpas-ae"),
            rec("inventory_miss", drugSlug="salonpas-ae"),
            rec("catalog_miss", query="腰痛貼的那個"),
            rec("rejected_no_stock", storeSlug="OK藥師藥局", drugSlug="green-oil"),
        ])["zhongshan"]

        assert ad.total == 4
        assert ad.inventory["salonpas-ae"] == 2
        assert ad.catalog["腰痛貼的那個"] == 1
        assert ad.named[("OK藥師藥局", "green-oil")] == 1

    def test_counts_contacts_only_when_present(self):
        ad = aggregate([
            rec(drugSlug="green-oil", contact="0912345678"),
            rec(drugSlug="green-oil"),
        ])["zhongshan"]
        assert (ad.total, ad.contacts) == (2, 1)

    def test_catalog_miss_keeps_raw_query(self):
        """原話不正規化 —— 正規化是之後離線重跑歷史資料的事，
        在這裡先合併就永遠補不回來了。"""
        ad = aggregate([
            rec("catalog_miss", query="撒隆巴斯"),
            rec("catalog_miss", query="撒龍巴斯"),
        ])["zhongshan"]
        assert ad.catalog["撒隆巴斯"] == 1 and ad.catalog["撒龍巴斯"] == 1

    def test_areas_are_separate(self):
        by_area = aggregate([rec(area="zhongshan"), rec(area="xinyi"), rec(area="xinyi")])
        assert by_area["zhongshan"].total == 1
        assert by_area["xinyi"].total == 2

    def test_named_for_filters_by_store(self):
        ad = aggregate([
            rec("rejected_no_stock", storeSlug="甲藥局", drugSlug="green-oil"),
            rec("rejected_no_stock", storeSlug="甲藥局", drugSlug="green-oil"),
            rec("rejected_no_stock", storeSlug="乙藥局", drugSlug="salonpas-ae"),
        ])["zhongshan"]
        assert ad.named_for("甲藥局")["green-oil"] == 2
        assert "salonpas-ae" not in ad.named_for("甲藥局")


class TestCallRows:
    def test_named_no_stock_sorts_first(self):
        by_area = aggregate([
            rec(drugSlug="green-oil"),
            rec("rejected_no_stock", storeSlug="乙藥局", drugSlug="salonpas-ae"),
        ])
        rows = call_rows([store("甲藥局"), store("乙藥局")], by_area, {}, 30)
        assert [r.store["name"] for r in rows] == ["乙藥局", "甲藥局"]
        assert rows[0].starred and not rows[1].starred

    def test_skips_areas_with_no_signal(self):
        """沒有訊號的區不該硬湊一行 —— 空手打的電話比不打更糟。"""
        by_area = aggregate([rec(area="zhongshan")])
        rows = call_rows(
            [store("甲藥局", area="zhongshan"),
             store("乙藥局", area="xinyi", district="信義區")],
            by_area, {}, 30,
        )
        assert [r.store["name"] for r in rows] == ["甲藥局"]

    def test_order_is_stable_for_ties(self):
        by_area = aggregate([rec(drugSlug="green-oil")])
        names = [r.store["name"] for r in
                 call_rows([store("乙藥局"), store("甲藥局")], by_area, {}, 30)]
        assert names == sorted(names)


class TestOpener:
    def test_named_no_stock_wins_over_area_stats(self):
        ad = aggregate([
            rec(drugSlug="green-oil"),
            rec("rejected_no_stock", storeSlug="甲藥局", drugSlug="salonpas-ae"),
        ])["zhongshan"]
        line = opener(store("甲藥局"), ad, ad.named_for("甲藥局"),
                      {"salonpas-ae": "撒隆巴斯®-愛涼 貼布"}, 30)
        assert "指名" in line and "撒隆巴斯®-愛涼 貼布" in line

    def test_falls_back_to_area_stats(self):
        ad = aggregate([rec(drugSlug="green-oil"), rec(drugSlug="green-oil")])["zhongshan"]
        line = opener(store(), ad, ad.named_for("沒人指名"), {"green-oil": "綠油精"}, 30)
        assert "中山區" in line and "綠油精" in line

    def test_unknown_slug_degrades_to_slug(self):
        ad = aggregate([rec(drugSlug="not-in-catalog")])["zhongshan"]
        assert "not-in-catalog" in opener(store(), ad, ad.named_for("x"), {}, 30)


class TestBrief:
    def test_states_the_window(self):
        ad = aggregate([rec(drugSlug="green-oil")])["zhongshan"]
        md = brief_markdown(ad, {"green-oil": "綠油精"}, 30, date(2026, 8, 6))
        assert "近 30 天" in md and "2026-08-06" in md and "綠油精" in md

    def test_counts_events_not_people(self):
        """43 次搜尋 ≠ 43 個人。沒有去重就不能講「人」。"""
        ad = aggregate([rec(drugSlug="green-oil") for _ in range(3)])["zhongshan"]
        md = brief_markdown(ad, {}, 30, date(2026, 8, 6))
        assert "3 次搜尋沒有結果" in md
        assert "3 個人" not in md
        assert "同一個人搜三次算三次" in md

    def test_does_not_overclaim(self):
        ad = aggregate([rec(drugSlug="green-oil")])["zhongshan"]
        md = brief_markdown(ad, {}, 30, date(2026, 8, 6))
        assert "不含任何個人資料" in md
        assert "搜尋量不等於成交量" in md

    def test_never_names_another_pharmacy(self):
        """brief 會被轉發。把 A 店的缺貨印在要給 B 店看的紙上 =
        一次燒光供給側的信任。指名道姓的版本只存在 call sheet。"""
        ad = aggregate([
            rec("rejected_no_stock", storeSlug="OK藥師藥局", drugSlug="green-oil"),
            rec("rejected_no_stock", storeSlug="中崙藥局", drugSlug="green-oil"),
        ])["zhongshan"]
        md = brief_markdown(ad, {"green-oil": "綠油精"}, 30, date(2026, 8, 6))
        assert "OK藥師藥局" not in md and "中崙藥局" not in md
        assert "2 次" in md  # 訊號還在，只是不指名
        assert "其他藥局的營業狀況" in md

    def test_no_provenance_leaks(self):
        """會被轉發的檔案裡不該出現本機路徑或 KV key。查詢原話本身可能含
        斜線（「OK繃/貼布」），所以只擋真正的洩漏向量，不是所有 `/`。"""
        ad = aggregate([rec(drugSlug="green-oil"),
                        rec("catalog_miss", query="OK繃/貼布")])["zhongshan"]
        md = brief_markdown(ad, {}, 30, date(2026, 8, 6))
        assert "OK繃/貼布" in md
        for leak in ("/Users/", "/private/", "rec:demand", ".jsonl", "KV_REST"):
            assert leak not in md, leak

    def test_sections_appear_only_when_they_have_data(self):
        ad = aggregate([rec("catalog_miss", query="腰痛貼的那個")])["zhongshan"]
        md = brief_markdown(ad, {}, None, date(2026, 8, 6))
        assert "腰痛貼的那個" in md
        assert "沒有一家有貨" not in md  # 沒有 inventory_miss 就不該有這段
        assert "開站至今" in md


class TestLabels:
    def test_reads_real_catalog(self):
        """撈 TS 是脆的，所以這裡當回歸測試 —— data.ts 換格式時要有人吵。
        失敗不會讓報表壞掉（會退回印 slug），但名字會變難看。"""
        if not DATA_TS.exists():
            return
        labels = load_labels()
        assert labels.get("salonpas-ae", "").startswith("撒隆巴斯")
        assert labels.get("green-oil") == "綠油精"

    def test_missing_file_is_not_fatal(self, tmp_path):
        assert load_labels(tmp_path / "nope.ts") == {}


class TestStores:
    def test_missing_file_returns_empty(self, tmp_path):
        assert load_stores(tmp_path / "nope.json") == []

    def test_reads_generated_shape(self, tmp_path):
        p = tmp_path / "s.json"
        p.write_text(json.dumps({"generatedFrom": "x", "stores": [store()]}),
                     encoding="utf-8")
        assert load_stores(p)[0]["slug"] == "OK藥師藥局"


class TestKv:
    def test_no_credentials_is_quiet(self, monkeypatch):
        """沒設金鑰要安靜回空，呼叫端才能退回本機檔案。"""
        monkeypatch.delenv("KV_REST_API_URL", raising=False)
        monkeypatch.delenv("KV_REST_API_TOKEN", raising=False)
        assert demand_mod.from_kv() == []

    def test_prefers_the_read_only_token(self, monkeypatch):
        """報表只做 LRANGE。能寫能刪的金鑰不該被貼進 shell 或 cron。"""
        seen = {}

        class FakeResp:
            def read(self):
                return b'{"result": []}'

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def fake_urlopen(req, **kw):
            seen["auth"] = req.headers["Authorization"]
            return FakeResp()

        monkeypatch.setenv("KV_REST_API_URL", "https://kv.example")
        monkeypatch.setenv("KV_REST_API_TOKEN", "可寫的")
        monkeypatch.setenv("KV_REST_API_READ_ONLY_TOKEN", "唯讀的")
        monkeypatch.setattr(demand_mod.urllib.request, "urlopen", fake_urlopen)

        demand_mod.from_kv()
        assert seen["auth"] == "Bearer 唯讀的"

        # 沒發唯讀 token 的舊設定要照樣能跑
        monkeypatch.delenv("KV_REST_API_READ_ONLY_TOKEN")
        demand_mod.from_kv()
        assert seen["auth"] == "Bearer 可寫的"

    def test_parses_lrange_payload(self, monkeypatch):
        payload = {"result": [json.dumps(rec(drugSlug="green-oil")), "壞掉的不是 json"]}

        class FakeResp:
            def read(self):
                return json.dumps(payload).encode()

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        monkeypatch.setattr(demand_mod.urllib.request, "urlopen", lambda *a, **k: FakeResp())
        rows = demand_mod.from_kv(url="https://kv.example", token="t")
        assert len(rows) == 1 and rows[0]["drugSlug"] == "green-oil"


class TestEnvFile:
    """把金鑰貼進 web/.env.local 是完全合理的直覺（Next.js 就讀那個檔）。
    Python 不跟著讀的話，「我設好了」跟「報表印 0 筆」會同時成立。"""

    def _write(self, tmp_path, body):
        p = tmp_path / ".env.local"
        p.write_text(body, encoding="utf-8")
        return [p]

    def test_real_env_wins(self, tmp_path, monkeypatch):
        monkeypatch.setenv("KV_REST_API_URL", "來自環境變數")
        paths = self._write(tmp_path, 'KV_REST_API_URL="來自檔案"\n')
        assert demand_mod.env_or_file("KV_REST_API_URL", paths) == "來自環境變數"

    def test_falls_back_to_file(self, tmp_path, monkeypatch):
        monkeypatch.delenv("KV_REST_API_URL", raising=False)
        paths = self._write(tmp_path, 'KV_REST_API_URL="https://kv.example"\n')
        assert demand_mod.env_or_file("KV_REST_API_URL", paths) == "https://kv.example"

    def test_tolerates_real_world_formatting(self, tmp_path, monkeypatch):
        monkeypatch.delenv("A", raising=False)
        monkeypatch.delenv("B", raising=False)
        monkeypatch.delenv("C", raising=False)
        paths = self._write(
            tmp_path,
            "# 註解\n\nexport A='單引號'\nB=沒有引號\nC=\n",
        )
        assert demand_mod.env_or_file("A", paths) == "單引號"
        assert demand_mod.env_or_file("B", paths) == "沒有引號"
        assert demand_mod.env_or_file("C", paths) is None  # 空值等於沒設

    def test_missing_file_is_not_fatal(self, tmp_path, monkeypatch):
        monkeypatch.delenv("KV_REST_API_URL", raising=False)
        assert demand_mod.env_or_file("KV_REST_API_URL", [tmp_path / "nope"]) is None

    def test_cwd_is_searched_before_module_root(self, monkeypatch):
        """`pip install -e .` 是從哪個 checkout 裝的就永遠指向哪個。在
        worktree 裝過、回主 repo 跑，錨在 __file__ 會翻到錯的 .env.local。"""
        monkeypatch.delenv("PHARMABOX_ENV_FILE", raising=False)
        files = demand_mod.env_files()
        assert files[0] == Path.cwd() / "web" / ".env.local"
        assert files[-1] == demand_mod.REPO_ROOT / "web" / ".env.local"

    def test_explicit_override_wins(self, tmp_path, monkeypatch):
        monkeypatch.setenv("PHARMABOX_ENV_FILE", str(tmp_path / "x.env"))
        assert demand_mod.env_files() == [tmp_path / "x.env"]

    def test_from_kv_uses_the_file(self, tmp_path, monkeypatch):
        for v in ("KV_REST_API_URL", "KV_REST_API_TOKEN",
                  "KV_REST_API_READ_ONLY_TOKEN"):
            monkeypatch.delenv(v, raising=False)
        monkeypatch.setenv("PHARMABOX_ENV_FILE", str(tmp_path / ".env.local"))
        (tmp_path / ".env.local").write_text(
            'KV_REST_API_URL="https://kv.example"\n'
            'KV_REST_API_READ_ONLY_TOKEN="唯讀的"\n', encoding="utf-8")

        seen = {}

        class FakeResp:
            def read(self):
                return b'{"result": []}'

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

        def fake_urlopen(req, **kw):
            seen["url"] = req.full_url
            seen["auth"] = req.headers["Authorization"]
            return FakeResp()

        monkeypatch.setattr(demand_mod.urllib.request, "urlopen", fake_urlopen)
        demand_mod.from_kv()
        assert seen == {"url": "https://kv.example", "auth": "Bearer 唯讀的"}


class TestSiteUrl:
    def test_brief_uses_a_reachable_default(self):
        """這張紙會被拿到藥局櫃台。印一個不解析的網域，第一印象就沒了。"""
        ad = aggregate([rec(drugSlug="green-oil")])["zhongshan"]
        md = brief_markdown(ad, {}, 30, date(2026, 8, 6))
        assert "uyao.tw" not in md
        assert SITE in md

    def test_site_is_overridable(self):
        ad = aggregate([rec(drugSlug="green-oil")])["zhongshan"]
        md = brief_markdown(ad, {}, 30, date(2026, 8, 6), site="uyao.tw")
        assert "uyao.tw" in md


class TestCli:
    def _fixture(self, tmp_path, n_zhongshan=6):
        jsonl = tmp_path / "demand.jsonl"
        rows = [rec(drugSlug="green-oil") for _ in range(n_zhongshan)]
        rows.append(rec(area="xinyi", drugSlug="salonpas-ae"))  # 只有 1 筆，該被跳過
        jsonl.write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")

        stores = tmp_path / "stores.json"
        stores.write_text(json.dumps({"stores": [
            store("甲藥局"), store("乙藥局", area="xinyi", district="信義區"),
        ]}), encoding="utf-8")
        return jsonl, stores

    def test_writes_brief_and_sheet(self, tmp_path, capsys):
        jsonl, stores = self._fixture(tmp_path)
        out = tmp_path / "outreach"
        code = main(["--file", str(jsonl), "--stores", str(stores),
                     "--days", "30", "--write", "-o", str(out)])
        assert code == 0

        today = date.today().isoformat()
        assert (out / f"{today}-call-sheet.csv").exists()
        assert (out / f"{today}-zhongshan.md").exists()
        # 信義區只有 1 筆，低於門檻 → 不該產出
        assert not (out / f"{today}-xinyi.md").exists()
        assert "跳過 信義區" in capsys.readouterr().out

    def test_min_threshold_is_configurable(self, tmp_path):
        jsonl, stores = self._fixture(tmp_path)
        out = tmp_path / "outreach"
        main(["--file", str(jsonl), "--stores", str(stores), "--days", "30",
              "--write", "--min", "1", "-o", str(out)])
        assert (out / f"{date.today().isoformat()}-xinyi.md").exists()

    def test_no_records_exits_nonzero(self, tmp_path):
        empty = tmp_path / "empty.jsonl"
        empty.write_text("", encoding="utf-8")
        assert main(["--file", str(empty)]) == 1

    def test_missing_stores_tells_you_to_seed(self, tmp_path, capsys):
        jsonl, _ = self._fixture(tmp_path)
        assert main(["--file", str(jsonl), "--stores", str(tmp_path / "nope.json")]) == 1
        assert "pharmabox.seed" in capsys.readouterr().out

    def test_csv_carries_the_opener(self, tmp_path):
        jsonl, stores = self._fixture(tmp_path)
        out = tmp_path / "outreach"
        main(["--file", str(jsonl), "--stores", str(stores), "--days", "30",
              "--write", "-o", str(out)])
        body = (out / f"{date.today().isoformat()}-call-sheet.csv").read_text(
            encoding="utf-8-sig")
        assert "開場白" in body and "甲藥局" in body
