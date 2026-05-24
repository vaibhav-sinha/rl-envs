from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image

from figma_eval.visual.composite import composite_grid


def _solid_png(path: Path, size: tuple[int, int], color: tuple[int, int, int]) -> None:
    img = Image.new("RGB", size, color)
    img.save(path)


def test_composite_grid_single_image(tmp_path: Path):
    src = tmp_path / "one.png"
    out = tmp_path / "out.png"
    _solid_png(src, (100, 50), (255, 0, 0))
    composite_grid([src], out)
    assert out.is_file()
    with Image.open(out) as img:
        assert img.size == (100, 50)


def test_composite_grid_two_images_horizontal_row(tmp_path: Path):
    a = tmp_path / "a.png"
    b = tmp_path / "b.png"
    out = tmp_path / "out.png"
    _solid_png(a, (80, 40), (255, 0, 0))
    _solid_png(b, (60, 30), (0, 255, 0))
    composite_grid([a, b], out, cols=3, gap=10)
    with Image.open(out) as img:
        # row width = 80 + 10 + 60 = 150; row height = max(40,30) = 40
        assert img.size == (150, 40)


def test_composite_grid_four_images_two_rows(tmp_path: Path):
    paths = []
    for i, w in enumerate([50, 70, 40, 60]):
        p = tmp_path / f"{i}.png"
        _solid_png(p, (w, 20), (i * 40, 0, 0))
        paths.append(p)
    out = tmp_path / "grid.png"
    composite_grid(paths, out, cols=3, gap=0)
    with Image.open(out) as img:
        # row1: 50+70+40=160 h=20; row2: 60 h=20 => 160 x 40
        assert img.size == (160, 40)


def test_composite_grid_requires_images(tmp_path: Path):
    with pytest.raises(ValueError):
        composite_grid([], tmp_path / "out.png")
