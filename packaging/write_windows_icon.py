"""Render the Lumen favicon artwork into a multi-resolution Windows icon."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "build" / "generated" / "Lumen.ico"


def render(size: int) -> Image.Image:
    scale = size / 64
    image = Image.new("RGBA", (size, size), "#171713")
    draw = ImageDraw.Draw(image)

    def box(coordinates: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        return tuple(round(value * scale) for value in coordinates)

    draw.rounded_rectangle(box((0, 0, 64, 64)), radius=round(10 * scale), fill="#171713")
    draw.rectangle(box((10, 10, 54, 54)), fill="#fff3d6", outline="#120f0a", width=max(1, round(4 * scale)))
    draw.rectangle(box((20, 24, 28, 32)), fill="#d96c4b")
    draw.rectangle(box((36, 24, 44, 32)), fill="#d96c4b")
    draw.rectangle(box((24, 42, 40, 46)), fill="#120f0a")
    draw.rectangle(box((28, 4, 36, 12)), fill="#d96c4b")
    return image


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [render(size) for size in sizes]
    images[-1].save(OUTPUT, format="ICO", append_images=images[:-1], sizes=[(size, size) for size in sizes])


if __name__ == "__main__":
    main()
