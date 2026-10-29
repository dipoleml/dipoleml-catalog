#!/usr/bin/env python3
"""Convert an image to high-quality ASCII art for WAYD posts.

Produces results comparable to asciiart.eu: edge-enhanced, sharpened,
contrast-boosted, with a dense 70-char gradient.

Usage:
  img2ascii.py --image PATH [--width N] [--invert] [--caption TEXT]
               [--edge-weight F] [--sharpen] [--contrast F]

Prints JSON to stdout: {"ok": true, "art": "...", "chars": N}

Options:
  --image PATH       Image file (JPEG, PNG, GIF, WebP, DNG, …)
  --width N          Width in chars (default: 100). Height auto-calculated.
  --invert           Invert brightness (for light-background images).
  --caption TEXT     Text appended below the art (2 blank lines separator).
  --edge-weight F    How much edge detection to blend in, 0.0–1.0 (default 0.4).
                     Higher = more defined outlines like asciiart.eu.
  --sharpen          Apply sharpening before conversion (default: on).
  --no-sharpen       Disable sharpening.
  --contrast F       Contrast multiplier (default: 1.3). 1.0 = no change.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import shared  # noqa: E402

# Dense 70-char gradient from dark to light (dark terminal).
# Derived from the classic Paulm gradient used by most quality converters.
_RAMP_DARK = r'$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^`\'. '
_RAMP_LIGHT = _RAMP_DARK[::-1]


def _px(luminance: int, ramp: str) -> str:
    return ramp[int(luminance / 255 * (len(ramp) - 1))]


def image_to_ascii(
    image_path: str,
    width: int = 100,
    invert: bool = False,
    edge_weight: float = 0.4,
    sharpen: bool = True,
    contrast: float = 1.3,
    caption: str = "",
    max_chars: int | None = None,
) -> str:
    """Return ASCII art string. Raises ValueError on failure."""
    try:
        from PIL import Image, ImageEnhance, ImageFilter  # type: ignore[import]
    except ImportError:
        raise ValueError("Pillow is required: pip install Pillow")

    try:
        img = Image.open(image_path)
    except FileNotFoundError:
        raise ValueError(f"Image not found: {image_path}")
    except Exception as exc:
        raise ValueError(f"Cannot open image: {exc}")

    # Convert to RGB then grayscale (handles RGBA, P, CMYK, DNG/TIFF, etc.)
    img = img.convert("RGB")

    # --- Preprocessing (mimics asciiart.eu quality pipeline) ---

    if sharpen:
        img = ImageEnhance.Sharpness(img).enhance(2.0)

    if contrast != 1.0:
        img = ImageEnhance.Contrast(img).enhance(contrast)

    gray = img.convert("L")

    # Compute target height preserving aspect ratio.
    # Terminal chars are ~2:1 tall:wide; 0.45 corrects for that.
    aspect = img.height / img.width
    height = max(1, int(width * aspect * 0.45))

    # Shrink to fit max_chars budget if given (art-only chars, no caption).
    if max_chars is not None:
        caption_cost = len(caption) + 2 if caption else 0
        while width >= 20:
            if width * height + height + caption_cost <= max_chars:
                break
            width = int(width * 0.9)
            height = max(1, int(width * aspect * 0.45))

    # Resize both base image and edge map to the target size.
    base = gray.resize((width, height), Image.LANCZOS)

    # Edge detection: find edges on a slightly blurred version for clean lines.
    edge_src = gray.filter(ImageFilter.GaussianBlur(1)).filter(ImageFilter.FIND_EDGES)
    edges = edge_src.resize((width, height), Image.LANCZOS)

    # Blend: final_lum = base * (1 - w) + edges * w
    # Edge pixels push luminance toward dark (dense chars = outlines).
    base_px = base.tobytes()
    edge_px = edges.tobytes()

    ramp = _RAMP_LIGHT if invert else _RAMP_DARK
    lines: list[str] = []

    for row in range(height):
        chars = []
        for col in range(width):
            idx = row * width + col
            b = base_px[idx]
            e = edge_px[idx]
            # Invert edge contribution so edges → darker chars (denser).
            blended = int(b * (1 - edge_weight) + (255 - e) * edge_weight)
            blended = max(0, min(255, blended))
            chars.append(_px(blended, ramp))
        lines.append("".join(chars))

    art = "\n".join(lines)
    if caption:
        art = art + "\n\n" + caption
    return art


def main() -> None:
    parser = argparse.ArgumentParser(description="High-quality image → ASCII art.")
    parser.add_argument("--image", required=True)
    parser.add_argument("--width", type=int, default=100)
    parser.add_argument("--invert", action="store_true")
    parser.add_argument("--caption", default="")
    parser.add_argument("--edge-weight", type=float, default=0.4)
    parser.add_argument("--sharpen", dest="sharpen", action="store_true", default=True)
    parser.add_argument("--no-sharpen", dest="sharpen", action="store_false")
    parser.add_argument("--contrast", type=float, default=1.3)
    parser.add_argument("--max-chars", type=int, default=None)
    args = parser.parse_args()

    try:
        art = image_to_ascii(
            image_path=args.image,
            width=args.width,
            invert=args.invert,
            edge_weight=args.edge_weight,
            sharpen=args.sharpen,
            contrast=args.contrast,
            caption=args.caption,
            max_chars=args.max_chars,
        )
    except ValueError as exc:
        shared.emit({"ok": False, "code": "img2ascii_error", "message": str(exc)})
        sys.exit(1)

    shared.emit({"ok": True, "art": art, "chars": len(art)})


if __name__ == "__main__":
    main()
