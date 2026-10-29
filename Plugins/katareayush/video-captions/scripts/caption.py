#!/usr/bin/env python3
"""Orchestrator: video in -> captioned video out (and/or subtitle files).

Runs transcribe -> build_captions -> ffmpeg burn. Cross-platform (Windows/macOS/Linux):
uses pathlib for paths and runs ffmpeg with the caption file as a bare relative name from the
work directory, which sidesteps the Windows `subtitles=C:\\...` colon/backslash escaping bug.

The look is minimal and common by default; every aspect is overridable via flags so the
caller (Claude) can translate a user's freeform description ("big yellow text at the top")
into concrete styling.

Also supports: SRT/VTT export, edit-then-burn from an existing .srt, word-by-word (viral)
captions, a readability box, translation / any language, and batch-captioning a folder.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from ffmpeg_tools import find_ffmpeg

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".mpg", ".mpeg", ".wmv", ".flv"}

# Edited baseline: bold, punchy, high-contrast (real captions, not thin subtitles).
# The spoken word is highlighted by default; overridden by flags per the user's prompt.
DEFAULT_STYLE = {
    "font": "Arial",
    "size_ratio": 0.058,  # font height as a fraction of video height
    "primary": "FFFFFF",  # text colour (RRGGBB)
    "outline_color": "000000",
    "outline": 3,         # outline width
    "shadow": 1,          # shadow depth
    "bold": True,
}

COLORS = {
    "white": "FFFFFF", "black": "000000", "yellow": "FFFF00", "red": "FF0000",
    "green": "00FF00", "blue": "0000FF", "cyan": "00FFFF", "magenta": "FF00FF",
    "orange": "FFA500", "pink": "FF69B4", "purple": "800080", "gray": "808080",
    "grey": "808080",
}
SIZES = {"small": 0.042, "medium": 0.052, "large": 0.072, "huge": 0.095}

# One built-in look, because it takes more than a colour flag to reach: a real
# rounded plate, fixed-size word cards, and a fade. Everything in it is still
# reachable one flag at a time, so `--preset` is a shortcut, not a special case.
PILL_PRESET = {
    "style": {"font": "Inter", "primary": "FAF8F3", "outline": 0, "shadow": 0, "bold": False},
    "opts": {
        "words": 3, "plate": True, "plate_color": "27211C", "plate_opacity": 0.82,
        "plate_shadow": True, "lowercase": True, "strip_punct": True,
        "accent": "9BB187", "accent_every": 5, "fade": (140, 100), "rise": 8,
    },
    # Portrait wants a smaller type ratio and more room under it for platform chrome.
    "portrait": {"size_ratio": 0.0333, "y": 0.78},
    "landscape": {"size_ratio": 0.0426, "y": 0.88},
}
PRESET_ALIASES = {"pill", "ink", "ink-pill", "editorial", "minimal-pill"}


def probe_dimensions(ffprobe, video):
    """Return (width, height) via ffprobe; fall back to 1280x720 if unavailable."""
    try:
        out = subprocess.run(
            [
                ffprobe, "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=width,height", "-of", "json", str(video),
            ],
            capture_output=True, text=True, check=True,
        ).stdout
        stream = json.loads(out)["streams"][0]
        return int(stream["width"]), int(stream["height"])
    except Exception:
        return 1280, 720


def parse_color(value):
    v = value.strip().lstrip("#")
    if len(v) == 6 and all(c in "0123456789abcdefABCDEF" for c in v):
        return v.upper()
    if v.lower() in COLORS:
        return COLORS[v.lower()]
    sys.exit(f"Unknown color '{value}'. Use a hex like FFCC00 or a name: {', '.join(COLORS)}")


def parse_size(value):
    if value.lower() in SIZES:
        return SIZES[value.lower()]
    try:
        return float(value)
    except ValueError:
        sys.exit("--size must be small|medium|large|huge or a number like 0.05")


def build_style(args, word_by_word=False, preset=None):
    """Start from the minimal baseline; apply only what the caller specified."""
    style = dict(DEFAULT_STYLE)
    if word_by_word:                       # viral captions read best big + bold
        style["size_ratio"] = SIZES["large"]
        style["bold"] = True
    if preset:
        style.update(preset)
    if args.font:
        style["font"] = args.font
    if args.size:
        style["size_ratio"] = parse_size(args.size)
    if args.color:
        style["primary"] = parse_color(args.color)
    if args.outline_color:
        style["outline_color"] = parse_color(args.outline_color)
    if args.outline is not None:
        style["outline"] = args.outline
    if args.shadow is not None:
        style["shadow"] = args.shadow
    if args.weight:
        style["bold"] = args.weight == "bold"
    if args.box_color:
        style["box_color"] = parse_color(args.box_color)
    return style


def build_card_opts(args, width, height):
    """Card-mode options: the preset first, then anything the caller named explicitly."""
    opts = {}
    if args.preset:
        opts.update(PILL_PRESET["opts"])
        opts.update(PILL_PRESET["portrait" if height > width else "landscape"])
        opts.pop("size_ratio", None)       # that one belongs to the style, not here
    if args.words:
        opts["words"] = args.words
    if args.plate:
        opts["plate"] = True
    if args.plate_color:
        opts["plate_color"] = parse_color(args.plate_color)
    if args.plate_opacity is not None:
        opts["plate_opacity"] = args.plate_opacity
    if args.plate_radius is not None:
        opts["radius"] = args.plate_radius
    if args.no_plate_shadow:
        opts["plate_shadow"] = False
    if args.plate_pad:
        parts = [float(p) for p in str(args.plate_pad).split(",")]
        opts["pad_x"], opts["pad_y"] = parts[0], parts[-1]
    if args.lowercase:
        opts["lowercase"] = True
    if args.accent:
        opts["accent"] = parse_color(args.accent)
    if args.accent_every is not None:
        opts["accent_every"] = args.accent_every
    if args.fade is not None:
        parts = [p.strip() for p in str(args.fade).split(",")]
        opts["fade"] = (int(parts[0]), int(parts[-1]))
    if args.y is not None:
        opts["y"] = args.y
    return opts


def caption_one(video, args, ffmpeg, ffprobe):
    import build_captions as bc

    out = (
        Path(args.out).expanduser().resolve()
        if args.out
        else video.with_name(video.stem + "_captioned.mp4")
    )
    word_by_word = args.word_by_word
    pos = args.pos or ("center" if word_by_word else "bottom")

    work = Path(tempfile.mkdtemp(prefix="vidcap_"))
    ass_name = "captions.ass"
    ass_path = work / ass_name
    width, height = probe_dimensions(ffprobe, video)

    preset_style = None
    if args.preset:
        preset_style = dict(PILL_PRESET["style"])
        preset_style["size_ratio"] = PILL_PRESET[
            "portrait" if height > width else "landscape"]["size_ratio"]
    style = build_style(args, word_by_word, preset_style)
    card_opts = build_card_opts(args, width, height)
    cards = bool(card_opts)

    # --- gather caption events / ASS ---------------------------------------
    if args.from_srt:
        events = bc.parse_srt(Path(args.from_srt).expanduser())
        if not events:
            sys.exit(f"No captions parsed from {args.from_srt}")
        # An .srt has no word timings, so cards keep its lines and only restyle them.
        ass = (bc.render_cards(events, width, height, style, card_opts) if cards
               else bc.render_ass(events, width, height, style, pos=pos, box=args.box))
    else:
        seg_path = work / "segments.json"
        from transcribe import transcribe
        print(f"Transcribing {video.name} (first run downloads the model)...")
        transcribe(video, args.model, seg_path, language=args.lang,
                   translate=args.translate, context=args.context)
        segments = json.loads(seg_path.read_text(encoding="utf-8"))["segments"]
        events = bc.line_events(segments, bc.chars_per_line(width, height, style))
        hl = parse_color(args.highlight)
        if cards:
            card_events = bc.word_cards(segments, per_card=card_opts.get("words", 3))
            events = card_events if args.export != "none" else events
            ass = bc.render_cards(card_events, width, height, style, card_opts)
        elif word_by_word:
            ass = bc.render_word_by_word(segments, width, height, style, pos=pos, highlight=hl)
        elif args.plain:
            ass = bc.render_ass(events, width, height, style, pos=pos, box=args.box)
        else:  # default "edited" look: full lines, spoken word highlighted
            ass = bc.render_lines_highlighted(segments, width, height, style, pos=pos,
                                              box=args.box, highlight=hl)

    # --- sidecar subtitle exports ------------------------------------------
    if args.export in ("srt", "both"):
        p = video.with_suffix(".srt"); p.write_text(bc.render_srt(events), encoding="utf-8")
        print(f"Wrote {p}")
    if args.export in ("vtt", "both"):
        p = video.with_suffix(".vtt"); p.write_text(bc.render_vtt(events), encoding="utf-8")
        print(f"Wrote {p}")

    # --- burn --------------------------------------------------------------
    if args.no_burn:
        print("Skipped burning (--no-burn).")
        return
    ass_path.write_text(ass, encoding="utf-8")
    print(f"Burning captions into {video.name}...")
    vf = f"subtitles={ass_name}"
    if args.fontsdir:
        # Copied in, so the filter argument stays a bare relative name — the same
        # reason the .ass does (Windows chokes on `subtitles=C:\...`).
        fonts = work / "fonts"
        fonts.mkdir(exist_ok=True)
        for f in Path(args.fontsdir).expanduser().iterdir():
            if f.suffix.lower() in {".ttf", ".otf", ".ttc"}:
                fonts.joinpath(f.name).write_bytes(f.read_bytes())
        vf += ":fontsdir=fonts"
    subprocess.run(
        [ffmpeg, "-y", "-i", str(video), "-vf", vf, "-c:a", "copy", str(out)],
        cwd=str(work), check=True,
    )
    print(f"Done -> {out}")


def main():
    ap = argparse.ArgumentParser(description="Transcribe a video and burn in captions.")
    ap.add_argument("video", help="path to a video, or a folder to batch-caption")
    ap.add_argument("--pos", default=None, choices=["top", "center", "bottom"])
    ap.add_argument("--model", default="small",
                    help="whisper model: base (fast) | small (default) | medium | large-v3 (most accurate)")
    ap.add_argument("--context", default=None,
                    help="hint of names/jargon/topic to transcribe hard words correctly")
    ap.add_argument("--out", default=None, help="output path (single video only)")
    # style overrides — Claude fills these from the user's freeform description
    ap.add_argument("--font", help="font family, e.g. Arial, Impact, Georgia")
    ap.add_argument("--size", help="small|medium|large|huge or a ratio like 0.06")
    ap.add_argument("--color", help="text colour: a name (yellow) or hex (FFCC00)")
    ap.add_argument("--outline-color", dest="outline_color", help="outline colour (name or hex)")
    ap.add_argument("--outline", type=float, help="outline width (0 for none)")
    ap.add_argument("--shadow", type=float, help="shadow depth (0 for none)")
    ap.add_argument("--weight", choices=["bold", "normal"], help="text weight")
    # feature flags
    ap.add_argument("--word-by-word", dest="word_by_word", action="store_true",
                    help="viral karaoke look: a few words at a time, active word highlighted")
    ap.add_argument("--plain", action="store_true",
                    help="static subtitles with no spoken-word highlight")
    ap.add_argument("--highlight", default="yellow", help="highlight colour for the spoken word")
    ap.add_argument("--box", action="store_true", help="semi-transparent band behind the text")
    ap.add_argument("--box-color", dest="box_color", help="box colour (name or hex, default black)")
    # card mode: N words at a time on a rounded plate
    ap.add_argument("--preset", nargs="?", const="pill", default=None,
                    help="built-in look: 'pill' — 3 lowercase words on a dark rounded plate")
    ap.add_argument("--words", type=int, help="show N words at a time as static cards")
    ap.add_argument("--plate", action="store_true", help="rounded plate behind the text")
    ap.add_argument("--plate-color", dest="plate_color", help="plate colour (name or hex)")
    ap.add_argument("--plate-opacity", dest="plate_opacity", type=float,
                    help="plate opacity 0-1 (default 0.82)")
    ap.add_argument("--plate-radius", dest="plate_radius", type=float,
                    help="corner radius in px (default: a full pill)")
    ap.add_argument("--no-plate-shadow", dest="no_plate_shadow", action="store_true",
                    help="drop the soft shadow under the plate")
    ap.add_argument("--lowercase", action="store_true", help="force captions to lowercase")
    ap.add_argument("--accent", help="colour one word per card (name or hex)")
    ap.add_argument("--accent-every", dest="accent_every", type=int,
                    help="accent a word every N cards (default 5)")
    ap.add_argument("--plate-pad", dest="plate_pad", help="padding inside the plate: x,y in px")
    ap.add_argument("--fade", help="fade in,out in ms, e.g. 140,100")
    ap.add_argument("--y", type=float,
                    help="caption bottom edge: a ratio like 0.88 or a pixel value")
    ap.add_argument("--fontsdir", help="folder of .ttf/.otf files to load fonts from")
    ap.add_argument("--export", default="none", choices=["none", "srt", "vtt", "both"],
                    help="also write an editable subtitle file next to the video")
    ap.add_argument("--no-burn", dest="no_burn", action="store_true",
                    help="don't render the video; only export subtitle file(s)")
    ap.add_argument("--from-srt", dest="from_srt", help="burn captions from an existing .srt (skip transcription)")
    ap.add_argument("--lang", default=None, help="source language code (default: auto-detect)")
    ap.add_argument("--translate", action="store_true", help="translate speech to English captions")
    args = ap.parse_args()

    if args.preset and args.preset.lower() not in PRESET_ALIASES:
        sys.exit(f"Unknown preset '{args.preset}'. Available: {', '.join(sorted(PRESET_ALIASES))}")

    ffmpeg, ffprobe = find_ffmpeg()
    if ffmpeg is None:
        sys.exit(
            "No ffmpeg with subtitle support found. Run: python scripts/setup.py\n"
            "(macOS: `brew install ffmpeg-full`; Windows/Linux: install ffmpeg.)"
        )

    target = Path(args.video).expanduser().resolve()
    if not target.exists():
        sys.exit(f"Not found: {target}")

    if target.is_dir():
        videos = sorted(p for p in target.iterdir()
                        if p.suffix.lower() in VIDEO_EXTS and "_captioned" not in p.stem)
        if not videos:
            sys.exit(f"No videos found in {target}")
        if args.out:
            sys.exit("--out can't be used when captioning a folder.")
        print(f"Batch: {len(videos)} video(s) in {target}")
        for v in videos:
            caption_one(v, args, ffmpeg, ffprobe)
    else:
        caption_one(target, args, ffmpeg, ffprobe)


if __name__ == "__main__":
    main()
