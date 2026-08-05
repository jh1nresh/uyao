from pharmabox.keymap import (
    KEY_ENTER,
    KEY_LEFTCTRL,
    KEY_LEFTSHIFT,
    KEY_RIGHTBRACE,
    KeystrokeDecoder,
)

# evdev codes: 2..11 are '1'..'9','0'; 30='a', 48='b', 46='c'


def _type(dec, keycode):
    out = dec.feed(keycode, True)
    dec.feed(keycode, False)
    return out


def test_digits_and_enter():
    dec = KeystrokeDecoder()
    for code in (2, 3, 4):  # "123"
        assert _type(dec, code) is None
    assert _type(dec, KEY_ENTER) == "123"


def test_shift_uppercase():
    dec = KeystrokeDecoder()
    dec.feed(KEY_LEFTSHIFT, True)
    _type(dec, 30)  # A
    dec.feed(KEY_LEFTSHIFT, False)
    _type(dec, 48)  # b
    assert _type(dec, KEY_ENTER) == "Ab"


def test_ctrl_rightbrace_is_gs():
    dec = KeystrokeDecoder()
    _type(dec, 2)
    dec.feed(KEY_LEFTCTRL, True)
    _type(dec, KEY_RIGHTBRACE)
    dec.feed(KEY_LEFTCTRL, False)
    _type(dec, 3)
    assert _type(dec, KEY_ENTER) == "1\x1d2"


def test_empty_enter_emits_nothing():
    dec = KeystrokeDecoder()
    assert _type(dec, KEY_ENTER) is None
