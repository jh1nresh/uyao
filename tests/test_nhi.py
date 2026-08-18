from pharmabox.nhi import (
    NhiIndex,
    cn_number_to_arabic,
    normalize_address,
    parse,
    parse_sessions,
)

CSV = (
    "醫事機構代碼,醫事機構名稱,醫事機構種類,電話,地址,分區業務組,特約類別,"
    "服務項目,診療科別,終止合約或歇業日期,固定看診時段,備註,縣市別代碼,合約起日\n"
    "5901103183,OK藥師藥局,藥師自營,(02)25170068,臺北市中山區興安街９５號,臺北業務組,5,"
    ",,20301231,星期一上午看診、星期一下午看診,-,63000,20100101\n"
    "5901104144,中山藥局,藥師自營,(02)25236979,臺北市中山區林森北路１２８號,臺北業務組,5,"
    ",,20230831,,-,63000,20100101\n"
)

# 同一個門牌兩筆合約，已終止的排在前面 —— 取自健保署開放資料的真實情形。
MULTI_CONTRACT_CSV = (
    "醫事機構代碼,醫事機構名稱,醫事機構種類,電話,地址,分區業務組,特約類別,"
    "服務項目,診療科別,終止合約或歇業日期,固定看診時段,備註,縣市別代碼,合約起日\n"
    "593106B143,一銘藥局,藥師自營,(02)29961050,新北市新莊區幸福路５４２號（１樓）,臺北業務組,5,"
    ",,20260616,星期一上午看診,-,65000,20210118\n"
    "593106C319,一銘藥局,藥劑生自營,(02)29961050,新北市新莊區幸福路５４２號１樓,臺北業務組,5,"
    ",,20290615,星期一上午看診,-,65000,20260616\n"
)


class TestNumberNormalization:
    def test_converts_chinese_house_numbers(self):
        assert cn_number_to_arabic("吉林路二六七號") == "吉林路267號"
        assert cn_number_to_arabic("民生東路三十二號") == "民生東路32號"
        assert cn_number_to_arabic("中山北路十號") == "中山北路10號"

    def test_leaves_arabic_alone(self):
        assert cn_number_to_arabic("興安街95號") == "興安街95號"


class TestAddressNormalization:
    def test_matches_across_source_formats(self):
        """兩份開放資料同一個地址的三種寫法要壓成同一個字串。"""
        a = normalize_address("臺北市中山區興安街９５號")
        b = normalize_address("台北市中山區興安街95號")
        c = normalize_address("臺北市中山區興安街95號(1樓)")
        assert a == b == c

    def test_strips_floor_suffix(self):
        assert normalize_address("八德路2段307號一樓") == normalize_address("八德路2段307號")


class TestSessions:
    def test_groups_slots_by_weekday(self):
        raw = "星期一上午看診、星期一晚上看診、星期三下午看診"
        assert parse_sessions(raw) == {"一": ["上午", "晚上"], "三": ["下午"]}

    def test_blank_is_empty(self):
        assert parse_sessions("") == {}


class TestParse:
    def test_termination_compared_against_supplied_today(self):
        """不讀系統時鐘 —— today 由呼叫端傳，輸出才可重現。"""
        rows = parse(CSV, "20260805")
        by_name = {r.name: r for r in rows}
        assert by_name["OK藥師藥局"].is_terminated is False
        assert by_name["中山藥局"].is_terminated is True
        assert by_name["中山藥局"].terminated_on == "20230831"

    def test_keeps_institution_code(self):
        assert parse(CSV, "20260805")[0].code == "5901103183"


class TestIndex:
    def setup_method(self):
        self.idx = NhiIndex(parse(CSV, "20260805"))

    def test_exact_address_match_across_formats(self):
        r = self.idx.lookup("OK藥師藥局", "臺北市中山區興安街95號", "中山區")
        assert r is not None and r.code == "5901103183"

    def test_falls_back_to_name_plus_district(self):
        r = self.idx.lookup("OK藥師藥局", "地址完全對不上", "中山區")
        assert r is not None and r.code == "5901103183"

    def test_returns_none_when_district_disagrees(self):
        assert self.idx.lookup("OK藥師藥局", "無關地址", "信義區") is None

    def test_returns_none_for_unknown_pharmacy(self):
        """配錯機構代碼會讓 slug 指到別家藥局 —— 寧可留空也不要模糊比對。"""
        assert self.idx.lookup("不存在藥局", "臺北市中山區某路1號", "中山區") is None

    def test_prefers_the_live_contract_at_the_same_address(self):
        """同址多筆合約時取還有效的那筆。

        一銘藥局的藥師自營約已終止、藥劑生自營約還在，而終止的那筆在 CSV
        裡排在前面。取第一筆會把還在營業的店標成「合約已終止」。
        """
        idx = NhiIndex(parse(MULTI_CONTRACT_CSV, "20260805"))
        r = idx.lookup("一銘藥局", "新北市新莊區幸福路542號(1樓)", "新莊區")
        assert r is not None
        assert r.code == "593106C319"
        assert r.is_terminated is False


class TestArabicNumeralsPreserved:
    def test_does_not_corrupt_plain_arabic_house_numbers(self):
        """曾經為了處理「五0八」而全域把 0 換成〇，結果「308號」變成
        「3〇8號」對不上任何東西。純阿拉伯數字必須原樣通過。"""
        assert cn_number_to_arabic("南京東路308號") == "南京東路308號"
        assert cn_number_to_arabic("八德路2段307號") == "八德路2段307號"

    def test_handles_mixed_chinese_and_arabic_zero(self):
        assert cn_number_to_arabic("忠孝東路五段五0八之四號") == "忠孝東路5段508之4號"

    def test_postal_code_survives_normalization(self):
        assert "10453" in normalize_address("10453臺北市中山區雙城街17之3號1樓")
