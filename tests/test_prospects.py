from pharmabox.prospects import Pharmacy, classify, parse, select


def mk(name="測試藥局", city="臺北市", district="中山區", phone=""):
    tier, brand = classify(name)
    return Pharmacy(
        name=name, city=city, district=district, address="測試路 1 號",
        owner="王小明", phone=phone, nhi_contracted=True, tier=tier, brand=brand,
    )


class TestClassify:
    def test_national_chains(self):
        # 連鎖品牌常放在分店名前面，也有放後面的
        assert classify("躍獅光復藥局") == ("全國連鎖", "躍獅")
        assert classify("杏一後山埤藥局") == ("全國連鎖", "杏一")
        assert classify("新資生北信義大藥局") == ("全國連鎖", "新資生")
        assert classify("農安台安藥局")[0] == "全國連鎖"

    def test_regional_chains(self):
        assert classify("錦州春天生活藥局") == ("區域連鎖", "春天")
        assert classify("十二願玥藥局") == ("區域連鎖", "十二願")

    def test_auspicious_names_are_not_chains(self):
        """吉祥字撞名 — 全國分散但各自獨立。純用出現頻率會誤判成連鎖，
        所以連鎖名單是人工策展的，這幾個是回歸測試。"""
        for name in ("健康藥局", "安康藥局", "永安藥局", "長青藥局",
                     "第一藥局", "仁愛藥局", "喜樂藥局", "中山藥局"):
            assert classify(name) == ("獨立", ""), name


class TestDial:
    def test_adds_missing_area_code_from_city(self):
        assert mk(phone="25170068").dials == ["02-2517-0068"]
        assert mk(phone="22345678", city="臺中市").dials == ["04-2234-5678"]

    def test_splits_multiple_numbers(self):
        assert mk(phone="25236979、0937661282").dials == [
            "02-2523-6979", "0937-661-282",
        ]

    def test_reformats_existing_separators(self):
        assert mk(phone="02-27774628").dials == ["02-2777-4628"]
        assert mk(phone="(02)2708-5566").dials == ["02-2708-5566"]

    def test_three_digit_area_code_uses_pharmacy_city(self):
        assert mk(phone="037-320285", city="苗栗縣").dials == ["037-320-285"]

    def test_blank_phone_yields_nothing(self):
        assert mk(phone="").dials == []
        assert mk(phone="   ").dials == []

    def test_never_fabricates_a_number(self):
        """補不回區碼就留原樣 — 電訪名單上寧可空著也不要撥錯號。"""
        assert mk(phone="1234").dials == ["1234"]


class TestParse:
    CSV = (
        '"機構狀態","機構名稱","地址縣市別","地址鄉鎮市區","地址街道巷弄號",'
        '"負責人姓名","負責人性別","電話","是否為健保特約藥局"\n'
        '"開業","惠民藥局","臺北市","中山區","民生東路 1 號","王小明","男","25170068","Y"\n'
        '"開業","躍獅光復藥局","臺北市","信義區","光復南路 2 號","李大華","女","27778888","Y"\n'
        '"停業","關門藥局","臺北市","中山區","南京東路 3 號","陳某","男","","N"\n'
    )

    def test_skips_closed_pharmacies(self):
        rows = parse(self.CSV)
        assert [p.name for p in rows] == ["惠民藥局", "躍獅光復藥局"]

    def test_select_excludes_chains_by_default(self):
        picked, summary = parse(self.CSV), None
        picked, summary = select(parse(self.CSV), "臺北市", ["中山區", "信義區"])
        assert [p.name for p in picked] == ["惠民藥局"]
        assert summary.total_in_area == 2
        assert summary.independent == 1

    def test_include_chains_opt_in(self):
        picked, _ = select(
            parse(self.CSV), "臺北市", ["中山區", "信義區"], include_chains=True
        )
        assert len(picked) == 2

    def test_orders_by_requested_district_then_name(self):
        picked, _ = select(
            parse(self.CSV), "臺北市", ["信義區", "中山區"], include_chains=True
        )
        assert [p.district for p in picked] == ["信義區", "中山區"]

    def test_other_districts_excluded(self):
        picked, summary = select(parse(self.CSV), "臺北市", ["大安區"])
        assert picked == []
        assert summary.total_in_area == 0
