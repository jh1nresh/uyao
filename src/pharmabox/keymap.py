"""Keycode tables: evdev keycode -> char, and evdev keycode -> USB HID usage.

Scanners in keyboard mode type the barcode as keystrokes. We need to
(a) decode those keystrokes back into the barcode string, and
(b) replay them out the USB gadget port as HID reports.

Only the keys a scanner can emit are mapped; anything else is forwarded
raw (for HID) and ignored (for decoding).
"""

from __future__ import annotations

# evdev KEY_* code -> (char, shifted_char)
EVDEV_TO_CHAR: dict[int, tuple[str, str]] = {
    2: ("1", "!"), 3: ("2", "@"), 4: ("3", "#"), 5: ("4", "$"),
    6: ("5", "%"), 7: ("6", "^"), 8: ("7", "&"), 9: ("8", "*"),
    10: ("9", "("), 11: ("0", ")"), 12: ("-", "_"), 13: ("=", "+"),
    16: ("q", "Q"), 17: ("w", "W"), 18: ("e", "E"), 19: ("r", "R"),
    20: ("t", "T"), 21: ("y", "Y"), 22: ("u", "U"), 23: ("i", "I"),
    24: ("o", "O"), 25: ("p", "P"), 26: ("[", "{"), 27: ("]", "}"),
    30: ("a", "A"), 31: ("s", "S"), 32: ("d", "D"), 33: ("f", "F"),
    34: ("g", "G"), 35: ("h", "H"), 36: ("j", "J"), 37: ("k", "K"),
    38: ("l", "L"), 39: (";", ":"), 40: ("'", '"'), 41: ("`", "~"),
    43: ("\\", "|"), 44: ("z", "Z"), 45: ("x", "X"), 46: ("c", "C"),
    47: ("v", "V"), 48: ("b", "B"), 49: ("n", "N"), 50: ("m", "M"),
    51: (",", "<"), 52: (".", ">"), 53: ("/", "?"), 57: (" ", " "),
}

KEY_ENTER = 28
KEY_KPENTER = 96
KEY_TAB = 15
KEY_LEFTSHIFT = 42
KEY_RIGHTSHIFT = 54
KEY_LEFTCTRL = 29
KEY_RIGHTCTRL = 97

# Ctrl+] is the common scanner encoding for the GS separator (0x1D)
KEY_RIGHTBRACE = 27

# evdev keycode -> USB HID usage id (HID Usage Tables, keyboard page 0x07)
EVDEV_TO_HID: dict[int, int] = {
    # letters: evdev q..p etc -> HID a=4..z=29
    30: 4, 48: 5, 46: 6, 32: 7, 18: 8, 33: 9, 34: 10, 35: 11, 23: 12,
    36: 13, 37: 14, 38: 15, 50: 16, 49: 17, 24: 18, 25: 19, 16: 20,
    19: 21, 31: 22, 20: 23, 22: 24, 47: 25, 17: 26, 45: 27, 21: 28, 44: 29,
    # digits 1..9,0 -> HID 30..39
    2: 30, 3: 31, 4: 32, 5: 33, 6: 34, 7: 35, 8: 36, 9: 37, 10: 38, 11: 39,
    KEY_ENTER: 40, KEY_KPENTER: 88, KEY_TAB: 43, 57: 44,
    12: 45, 13: 46, 26: 47, 27: 48, 43: 49, 39: 51, 40: 52, 41: 53,
    51: 54, 52: 55, 53: 56,
    KEY_LEFTSHIFT: 0, KEY_RIGHTSHIFT: 0, KEY_LEFTCTRL: 0, KEY_RIGHTCTRL: 0,
}

HID_MOD_LCTRL = 0x01
HID_MOD_LSHIFT = 0x02
HID_MOD_RSHIFT = 0x20
HID_MOD_RCTRL = 0x10


class KeystrokeDecoder:
    """Accumulate evdev key events into barcode strings.

    Emits the completed string when Enter/Tab arrives (scanner suffix).
    Ctrl+] is decoded as the GS group separator.
    """

    def __init__(self) -> None:
        self._buf: list[str] = []
        self._shift = False
        self._ctrl = False

    def feed(self, keycode: int, pressed: bool) -> str | None:
        if keycode in (KEY_LEFTSHIFT, KEY_RIGHTSHIFT):
            self._shift = pressed
            return None
        if keycode in (KEY_LEFTCTRL, KEY_RIGHTCTRL):
            self._ctrl = pressed
            return None
        if not pressed:
            return None
        if keycode in (KEY_ENTER, KEY_KPENTER, KEY_TAB):
            out = "".join(self._buf)
            self._buf.clear()
            return out if out else None
        if self._ctrl and keycode == KEY_RIGHTBRACE:
            self._buf.append("\x1d")
            return None
        pair = EVDEV_TO_CHAR.get(keycode)
        if pair:
            self._buf.append(pair[1] if self._shift else pair[0])
        return None
