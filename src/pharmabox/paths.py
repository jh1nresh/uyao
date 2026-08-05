"""預設資料路徑錨在 repo 根目錄，不是當下的工作目錄。

`pip install -e .` 之後這些 CLI 在任何地方都跑得起來，但預設值如果是
相對 cwd 的 `data/.cache/...`，在 home 目錄跑就會憑空生出 `~/data/`，
而且因為 cache 找不到會重新下載一次開放資料 —— 看起來能跑，結果散在
兩個地方。實際踩過一次。
"""

from __future__ import annotations

import os
from pathlib import Path

_MARKERS = ("pyproject.toml", ".git")


def repo_root() -> Path:
    """從套件位置往上找 repo 標記；找不到（非 editable 安裝）就退回 cwd。"""
    for parent in Path(__file__).resolve().parents:
        if any((parent / m).exists() for m in _MARKERS):
            return parent
    return Path.cwd()


def data_path(*parts: str) -> Path:
    """`PHARMABOX_DATA_DIR` 可覆寫，其餘一律 `<repo>/data/...`。"""
    base = os.environ.get("PHARMABOX_DATA_DIR")
    root = Path(base).expanduser() if base else repo_root() / "data"
    return root.joinpath(*parts)
