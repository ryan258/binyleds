#!/usr/bin/env python3
"""Generate the Storyscape utility seal and favicon family."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "static"
IMAGES = STATIC / "images"

OBSIDIAN = "#0C100F"
PARCHMENT = "#EEE5D4"
VERDIGRIS = "#1E6658"
GOLD = "#C19A52"


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "/System/Library/Fonts/Supplemental/Baskerville.ttc",
        "/System/Library/Fonts/NewYork.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=0)
        except OSError:
            continue
    return ImageFont.load_default()


def make_seal(size: int = 1024) -> Image.Image:
    image = Image.new("RGB", (size, size), OBSIDIAN)
    draw = ImageDraw.Draw(image)
    margin = int(size * 0.13)
    points = [
        (size // 2, margin),
        (size - margin, int(size * 0.23)),
        (int(size * 0.83), int(size * 0.73)),
        (size // 2, size - margin),
        (int(size * 0.17), int(size * 0.73)),
        (margin, int(size * 0.23)),
    ]
    draw.polygon(points, fill=VERDIGRIS, outline=GOLD, width=max(2, size // 100))

    inset = int(size * 0.055)
    inner = [
        (size // 2, margin + inset),
        (size - margin - inset, int(size * 0.23) + inset),
        (int(size * 0.83) - inset, int(size * 0.73) - inset),
        (size // 2, size - margin - inset),
        (int(size * 0.17) + inset, int(size * 0.73) - inset),
        (margin + inset, int(size * 0.23) + inset),
    ]
    draw.line(inner + [inner[0]], fill=GOLD, width=max(1, size // 260), joint="curve")

    font = load_font(int(size * 0.28))
    text = "BS"
    box = draw.textbbox((0, 0), text, font=font)
    text_width = box[2] - box[0]
    text_height = box[3] - box[1]
    draw.text(
        ((size - text_width) / 2, (size - text_height) / 2 - box[1] - size * 0.015),
        text,
        font=font,
        fill=PARCHMENT,
    )
    return image


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    seal = make_seal()
    seal.save(IMAGES / "utility-seal.png", optimize=True)

    resampling = Image.Resampling.LANCZOS
    seal.resize((180, 180), resampling).save(STATIC / "apple-touch-icon.png", optimize=True)
    seal.resize((32, 32), resampling).save(STATIC / "favicon-32x32.png", optimize=True)
    seal.resize((16, 16), resampling).save(STATIC / "favicon-16x16.png", optimize=True)
    seal.resize((64, 64), resampling).save(
        STATIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    )


if __name__ == "__main__":
    main()

