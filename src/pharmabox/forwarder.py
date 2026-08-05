"""HID gadget forwarder (runs on the Pi only).

Replays evdev key events out /dev/hidg0 so the pharmacy computer sees a
normal keyboard scanner. Forwarding happens per-event, before decoding,
so added latency is one write() syscall.
"""

from __future__ import annotations

from .keymap import (
    EVDEV_TO_HID,
    HID_MOD_LCTRL,
    HID_MOD_LSHIFT,
    HID_MOD_RCTRL,
    HID_MOD_RSHIFT,
    KEY_LEFTCTRL,
    KEY_LEFTSHIFT,
    KEY_RIGHTCTRL,
    KEY_RIGHTSHIFT,
)

_MOD_KEYS = {
    KEY_LEFTSHIFT: HID_MOD_LSHIFT,
    KEY_RIGHTSHIFT: HID_MOD_RSHIFT,
    KEY_LEFTCTRL: HID_MOD_LCTRL,
    KEY_RIGHTCTRL: HID_MOD_RCTRL,
}


class HidForwarder:
    def __init__(self, hidg_path: str = "/dev/hidg0") -> None:
        self._fd = open(hidg_path, "wb", buffering=0)
        self._mods = 0

    def feed(self, keycode: int, pressed: bool) -> None:
        if keycode in _MOD_KEYS:
            if pressed:
                self._mods |= _MOD_KEYS[keycode]
            else:
                self._mods &= ~_MOD_KEYS[keycode]
            self._write(0)
            return
        usage = EVDEV_TO_HID.get(keycode)
        if usage is None:
            return
        self._write(usage if pressed else 0)

    def _write(self, usage: int) -> None:
        # 8-byte boot keyboard report: mods, reserved, key1..key6
        report = bytes([self._mods, 0, usage, 0, 0, 0, 0, 0])
        try:
            self._fd.write(report)
        except (BrokenPipeError, OSError):
            pass  # host unplugged; scanning must keep working regardless

    def close(self) -> None:
        self._fd.close()


class NullForwarder:
    """Dev mode / standalone mode: no downstream computer."""

    def feed(self, keycode: int, pressed: bool) -> None:
        pass

    def close(self) -> None:
        pass
