from pharmabox.places import _confident
from pharmabox.seed import haversine_m, sessions_to_hours, slugify


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
