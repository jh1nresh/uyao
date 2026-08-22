from pharmabox.places import PlacesAccessDenied, _confident
from pharmabox.seed import (
    DEFAULT_SCOPES,
    LISTED_STORES,
    haversine_m,
    match_score,
    resolve_contested,
    sessions_to_hours,
    slugify,
)


def test_partner_store_scope_is_the_current_public_list():
    assert LISTED_STORES == (
        ("建利西藥房", "臺北市", "大同區"),
        ("美得心藥局", "新北市", "林口區"),
        ("樂活健保藥局", "新北市", "新莊區"),
        ("祥好大藥局", "新北市", "新莊區"),
        ("中山藥局", "臺北市", "中山區"),
        ("萊康連鎖藥局", "新北市", "蘆洲區"),
        ("萊康中華健保藥局", "新北市", "蘆洲區"),
        ("永遠藥師藥局", "臺中市", "西屯區"),
        ("發元藥局", "苗栗縣", "苗栗市"),
        ("南興西藥房", "宜蘭縣", "宜蘭市"),
        ("建芳藥局", "宜蘭縣", "羅東鎮"),
        ("大豐藥局", "臺北市", "大同區"),
        ("喜來樂中西藥局", "新北市", "新莊區"),
        ("一銘藥局", "新北市", "新莊區"),
        ("天養藥局", "臺北市", "士林區"),
        ("美麗田藥局", "臺北市", "士林區"),
    )
    assert DEFAULT_SCOPES == "臺北市:大同區,中山區,士林區;新北市:林口區,新莊區,蘆洲區;臺中市:西屯區;苗栗縣:苗栗市;宜蘭縣:宜蘭市,羅東鎮"


class TestSlug:
    def test_keeps_chinese(self):
        assert slugify("惠民藥局") == "惠民藥局"

    def test_strips_url_hostile_characters(self):
        assert slugify("惠民 藥局") == "惠民藥局"
        assert slugify("新資生北信義大藥局（總店）") == "新資生北信義大藥局總店"

    def test_never_returns_empty(self):
        assert slugify("（）") == "store"


class TestSessionsToHours:
    def test_merges_consecutive_identical_days(self):
        got = sessions_to_hours({d: ["上午", "下午"] for d in "一二三四五"})
        assert got == [{"label": "週一–週五", "hours": "上午、下午"}]

    def test_splits_when_slots_differ(self):
        got = sessions_to_hours({"一": ["上午"], "二": ["上午"], "六": ["晚上"]})
        assert got == [
            {"label": "週一–週二", "hours": "上午"},
            {"label": "週六", "hours": "晚上"},
        ]

    def test_single_day_is_not_a_range(self):
        assert sessions_to_hours({"一": ["晚上"]}) == [{"label": "週一", "hours": "晚上"}]

    def test_empty(self):
        assert sessions_to_hours({}) == []


class TestDistance:
    def test_known_distance(self):
        """中山區中心 → 信義區中心，約 5 公里量級。"""
        d = haversine_m((25.0637, 121.5265), (25.0330, 121.5654))
        assert 4500 < d < 5500

    def test_same_point_is_zero(self):
        assert haversine_m((25.0637, 121.5265), (25.0637, 121.5265)) == 0


class TestPlaceMatchConfidence:
    def test_accepts_when_name_matches(self):
        c = {"displayName": {"text": "惠民藥局"}, "formattedAddress": "完全不同的地址"}
        assert _confident(c, "惠民藥局", "南京東路96號") is True

    def test_accepts_when_address_matches(self):
        c = {"displayName": {"text": "惠民藥品"}, "formattedAddress": "台北市中山區南京東路96號"}
        assert _confident(c, "惠民藥局", "南京東路96號") is True

    def test_rejects_when_neither_matches(self):
        """Google 回的第一筆常常是附近另一家店 —— 名稱地址都對不上就不能採用。"""
        c = {"displayName": {"text": "全家便利商店"}, "formattedAddress": "台北市信義區松高路11號"}
        assert _confident(c, "惠民藥局", "南京東路96號") is False


class TestPlacesAccessDenied:
    DISABLED = (
        '{"error":{"code":403,"message":"Places API (New) has not been used in '
        'project 686920181618 before or it is disabled. Enable it by visiting '
        "https://console.developers.google.com/apis/api/places.googleapis.com/overview"
        '?project=686920181618 then retry.","status":"PERMISSION_DENIED"}}'
    )

    def test_extracts_enable_url_from_google_message(self):
        """403 是設定問題不是程式問題 —— 錯誤訊息要能直接照著做。"""
        advice = PlacesAccessDenied(403, self.DISABLED).advice()
        assert "console.developers.google.com" in advice
        assert "686920181618" in advice
        assert "不是金鑰壞掉" in advice

    def test_invalid_key_gets_different_advice(self):
        advice = PlacesAccessDenied(401, '{"error":{"message":"API key not valid"}}').advice()
        assert "金鑰無效" in advice

    def test_survives_non_json_payload(self):
        advice = PlacesAccessDenied(403, "<html>502 Bad Gateway</html>").advice()
        assert "502 Bad Gateway" in advice


def place(name, addr):
    return {"display_name": name, "formatted_address": addr, "place_id": "X"}


class TestMatchScore:
    """案例全部來自 166 家實跑結果 —— 這些是 Google 真的回過的東西。"""

    def test_name_and_address_both_match_is_strongest(self):
        p = place("中山伊通藥局", "104094臺北市中山區中央里伊通街97-2號1樓")
        assert match_score(p, "中山伊通藥局", "臺北市中山區伊通街97之2號") == 3

    def test_name_variant_accepted_on_address_evidence(self):
        """政府登記「榮昌藥局」，Google 叫「榮昌健保藥局」——名字互不包含，
        但門牌一致且對方看起來是藥局，所以採用（分數 1 已足夠）。"""
        p = place("榮昌健保藥局", "10453臺北市中山區恆安里雙城街17之3號1樓")
        assert match_score(p, "榮昌藥局", "臺北市中山區雙城街十七之三號") == 1

    def test_chinese_numeral_address_still_matches(self):
        """「虎林街八十二巷五號」要對得上 Google 的「虎林街82巷5號」。"""
        p = place("華泰藥師健保藥局", "110臺北市信義區四維里虎林街82巷5號")
        assert match_score(p, "華泰藥局", "臺北市信義區虎林街八十二巷五號") == 1

    def test_clinic_at_same_address_is_rejected(self):
        """同門牌但不是藥局 —— 佑華藥局被配到新佑泉診所。"""
        p = place("新佑泉診所", "110臺北市信義區松光里忠孝東路五段508之4號")
        assert match_score(p, "佑華藥局", "臺北市信義區忠孝東路五段五0八之四號一樓") == 0

    def test_different_pharmacy_nearby_is_rejected(self):
        """星安藥局在龍江路278號，Google 回隔壁280號的榮星診所。"""
        p = place("榮星診所", "104臺北市中山區江寧里龍江路280號")
        assert match_score(p, "星安藥局", "臺北市中山區龍江路278號1樓") == 0

    def test_same_name_different_district_is_rejected(self):
        p = place("逸帆中西藥局", "100臺北市中正區頂東里金門街6之5號")
        assert match_score(p, "逸帆藥局", "臺北市中山區錦州街189號") == 0


class TestResolveContested:
    def test_higher_score_keeps_the_place(self):
        """保德明水藥局(3) vs 明水藥局(2) 搶同一筆 —— 分高的留著。"""
        losers = resolve_contested({"P": [("保德明水藥局 A", 3), ("明水藥局 B", 2)]})
        assert losers == {"明水藥局 B"}

    def test_tie_drops_everyone(self):
        """分不出來就都不要 —— 大浲藥局與市政藥局雙雙配到大樹信義市政店。"""
        losers = resolve_contested({"P": [("大浲藥局 A", 1), ("市政藥局 B", 1)]})
        assert losers == {"大浲藥局 A", "市政藥局 B"}

    def test_uncontested_place_is_untouched(self):
        assert resolve_contested({"P": [("只有一家 A", 1)]}) == set()
