from __future__ import annotations

from pathlib import Path

from PIL import Image

DEFAULT_COLS = 3
DEFAULT_GAP = 24
DEFAULT_BACKGROUND = (255, 255, 255)


def composite_grid(
    png_paths: list[Path],
    out: Path,
    *,
    cols: int = DEFAULT_COLS,
    gap: int = DEFAULT_GAP,
    background: tuple[int, int, int] = DEFAULT_BACKGROUND,
) -> None:
    """Stitch PNGs into a grid with *cols* images per row."""
    if not png_paths:
        raise ValueError("composite_grid requires at least one image")
    if len(png_paths) == 1:
        Image.open(png_paths[0]).save(out)
        return

    images = [Image.open(p).convert("RGBA") for p in png_paths]
    try:
        rows: list[list[Image.Image]] = []
        for i in range(0, len(images), cols):
            rows.append(images[i : i + cols])

        row_sizes: list[tuple[int, int]] = []
        for row in rows:
            row_width = sum(img.width for img in row) + gap * (len(row) - 1)
            row_height = max(img.height for img in row)
            row_sizes.append((row_width, row_height))

        total_width = max(w for w, _ in row_sizes)
        total_height = sum(h for _, h in row_sizes) + gap * (len(rows) - 1)

        canvas = Image.new("RGBA", (total_width, total_height), background + (255,))
        y = 0
        for row, (row_width, row_height) in zip(rows, row_sizes):
            x = 0
            for img in row:
                canvas.paste(img, (x, y), img)
                x += img.width + gap
            y += row_height + gap

        canvas.convert("RGB").save(out)
    finally:
        for img in images:
            img.close()
