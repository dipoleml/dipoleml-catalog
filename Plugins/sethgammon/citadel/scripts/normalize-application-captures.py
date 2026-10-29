#!/usr/bin/env python3
"""Normalize browser captures into exact, correctly encoded application PNGs."""

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "docs" / "assets" / "application"
CAPTURES = (
    "01-product-entry.png",
    "02-evidence-hero.png",
    "03-policy-comparison.png",
)
SIZE = (1440, 900)


def main() -> None:
    for filename in CAPTURES:
        target = MEDIA / filename
        with Image.open(target) as source:
            normalized = ImageOps.fit(
                source.convert("RGB"),
                SIZE,
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            temporary = target.with_suffix(".normalized.png")
            normalized.save(temporary, format="PNG", optimize=True)
        temporary.replace(target)
        print(f"normalized {target.relative_to(ROOT)} to {SIZE[0]}x{SIZE[1]} PNG")


if __name__ == "__main__":
    main()
