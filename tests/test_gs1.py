import datetime as dt

from pharmabox.gs1 import GS, classify_and_parse, parse_element_string, parse_gs1_date


def test_datamatrix_with_aim_prefix():
    raw = "]d2" + "0104712345678901" + "17271031" + "10A1B2"
    scan = classify_and_parse(raw)
    assert scan.symbology == "gs1_datamatrix"
    assert scan.gtin == "04712345678901"
    assert scan.expiry == dt.date(2027, 10, 31)
    assert scan.batch == "A1B2"


def test_variable_ai_terminated_by_gs():
    raw = "0104712345678901" + "10LOT99" + GS + "17271031" + "21SER123"
    scan = classify_and_parse(raw)
    assert scan.symbology == "gs1"
    assert scan.batch == "LOT99"
    assert scan.expiry == dt.date(2027, 10, 31)
    assert scan.serial == "SER123"


def test_human_readable_parens_form():
    scan = classify_and_parse("(01)04712345678901(17)271000(10)B7")
    assert scan.gtin == "04712345678901"
    # DD=00 -> end of month
    assert scan.expiry == dt.date(2027, 10, 31)
    assert scan.batch == "B7"


def test_expiry_day_zero_end_of_month():
    assert parse_gs1_date("270200") == dt.date(2027, 2, 28)
    assert parse_gs1_date("280200") == dt.date(2028, 2, 29)  # leap year


def test_bad_dates_return_none():
    assert parse_gs1_date("271301") is None
    assert parse_gs1_date("abc123") is None
    assert parse_gs1_date("2711") is None


def test_ean13():
    scan = classify_and_parse("4711234567890")
    assert scan.symbology == "ean13"
    assert scan.expiry is None


def test_nhi_code():
    scan = classify_and_parse("BC22731100")
    assert scan.symbology == "nhi_code"


def test_unknown_garbage():
    scan = classify_and_parse("hello world")
    assert scan.symbology == "unknown"


def test_element_string_unknown_ai_keeps_prefix():
    ais = parse_element_string("0104712345678901" + "9912345")
    assert ais == {"01": "04712345678901"}
