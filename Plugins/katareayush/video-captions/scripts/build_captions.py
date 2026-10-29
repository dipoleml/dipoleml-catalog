#!/usr/bin/env python3
"""Turn word-timestamped segments into captions and render them.

The heart of the skill. Produces caption *events* (short, readable, synced lines) from raw
word timestamps, then renders them to:
  - ASS   (for burning into the video, with optional styling / box / word-by-word highlight)
  - SRT / VTT (editable sidecar files)

Also parses an existing SRT back into events (edit-then-burn). Stdlib only.
"""
import json
import re
import sys
from pathlib import Path

# --- tuning knobs -----------------------------------------------------------
MAX_CHARS_PER_LINE = 42
MAX_LINES = 2
MAX_GAP = 0.7
MAX_DURATION = 6.0
MIN_DURATION = 1.0
INTER_GAP = 0.05
WBW_GROUP = 4        # words shown at once in word-by-word mode
WBW_GAP = 0.5        # a pause longer than this starts a new word-by-word group
CARD_MIN_DURATION = 0.7   # a card never flashes by faster than this
CARD_GAP = 0.04           # breathing room between consecutive cards
# Glyph advances as a fraction of the ASS font size, for sizing a plate to its text.
# libass exposes no metrics, so this is a model — fitted against rendered widths for
# a narrow face (Inter) and a wide one (Verdana) so it never under-estimates. It
# over-estimates a narrow face by up to ~40%, which lands as extra padding rather
# than text running off the plate.
ADV_NARROW, ADV_WIDE, ADV_SPACE, ADV_UPPER, ADV_DEFAULT = 0.26, 0.75, 0.26, 0.62, 0.54
NARROW_CHARS = set("iljtfrI.,!:;'|()[]{}-")
WIDE_CHARS = set("mwMW@")


def text_width(text, fontsize):
    total = 0.0
    for c in text:
        if c == " ":
            total += ADV_SPACE
        elif c in NARROW_CHARS:
            total += ADV_NARROW
        elif c in WIDE_CHARS:
            total += ADV_WIDE
        elif c.isupper() or c.isdigit():
            total += ADV_UPPER
        else:
            total += ADV_DEFAULT
    return total * fontsize


# --- colour / time helpers --------------------------------------------------
def to_ass_color(hex_rgb, alpha=0):
    """#RRGGBB -> ASS &HAABBGGRR (BGR, alpha 0x00 = opaque)."""
    hex_rgb = hex_rgb.lstrip("#")
    r, g, b = hex_rgb[0:2], hex_rgb[2:4], hex_rgb[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def ass_time(t):
    t = max(0.0, t)
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h:d}:{m:02d}:{s:05.2f}"


def srt_time(t, sep=","):
    t = max(0.0, t)
    h = int(t // 3600); m = int((t % 3600) // 60); s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        ms = 0; s += 1
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


# --- fitting: adapt line width & margins to the video's aspect ratio --------
def font_px(height, style):
    return max(16, int(height * style["size_ratio"]))


def side_margin(width):
    return max(30, int(width * 0.06))


def chars_per_line(width, height, style):
    """Max characters per line that actually fit this frame width at the chosen font size.
    Font scales with height; the usable text width scales with width — so a fixed character
    count overflows tall/narrow videos. ~0.5em average glyph advance for proportional fonts."""
    usable = width - 2 * side_margin(width)
    cpl = int(usable / (font_px(height, style) * 0.5))
    return max(10, min(cpl, MAX_CHARS_PER_LINE))


# --- words -> events --------------------------------------------------------
def flatten_words(segments):
    words = []
    for seg in segments:
        seg_words = seg.get("words") or []
        if seg_words:
            words.extend({"text": w["text"], "start": w["start"], "end": w["end"]} for w in seg_words)
        elif seg.get("text"):
            words.append({"text": seg["text"].strip(), "start": seg["start"], "end": seg["end"]})
    return words


def _chunk(words, max_total, max_words, max_gap):
    chunks, cur = [], []

    def cur_len():
        return sum(len(w["text"]) for w in cur) + max(0, len(cur) - 1)

    for w in words:
        if cur:
            gap = w["start"] - cur[-1]["end"]
            dur = w["end"] - cur[0]["start"]
            too_long = cur_len() + 1 + len(w["text"]) > max_total or len(cur) >= max_words
            if too_long or gap > max_gap or dur > MAX_DURATION:
                chunks.append(cur); cur = []
        cur.append(w)
        if w["text"][-1:] in ".!?":
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    return chunks


def _wrap(text, max_chars=MAX_CHARS_PER_LINE, max_lines=MAX_LINES):
    words = text.split()
    lines, cur = [], ""
    for word in words:
        if cur and len(cur) + 1 + len(word) > max_chars:
            lines.append(cur); cur = word
        else:
            cur = word if not cur else f"{cur} {word}"
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[: max_lines - 1] + [" ".join(lines[max_lines - 1:])]
    return "\n".join(lines)


def line_events(segments, cpl=MAX_CHARS_PER_LINE):
    """Normal captions: short wrapped lines synced to speech. Returns [{start,end,text}].
    cpl = characters-per-line budget for this video (see chars_per_line)."""
    chunks = [c for c in _chunk(flatten_words(segments), cpl * MAX_LINES, 99, MAX_GAP) if c]
    events = []
    for i, chunk in enumerate(chunks):
        start, end = chunk[0]["start"], chunk[-1]["end"]
        if end - start < MIN_DURATION:
            end = start + MIN_DURATION
        if i + 1 < len(chunks):
            nxt = chunks[i + 1][0]["start"]
            if end > nxt - INTER_GAP:
                end = max(start + 0.4, nxt - INTER_GAP)
        events.append({"start": start, "end": end, "text": _wrap(" ".join(w["text"] for w in chunk), cpl)})
    return events


# --- renderers --------------------------------------------------------------
def _ass_header(width, height, style, alignment, margin_v, side_m, box):
    fontsize = font_px(height, style)
    bold = -1 if style.get("bold") else 0
    primary = to_ass_color(style["primary"])
    if box:
        border_style = 3                       # opaque box behind text
        outline = max(4, int(style.get("outline", 2)))
        outline_c = to_ass_color(style.get("box_color", "000000"), alpha=0x40)
        shadow = 0
    else:
        border_style = 1                       # outline + shadow
        outline = style.get("outline", 2)
        outline_c = to_ass_color(style["outline_color"])
        shadow = style.get("shadow", 1)
    back_c = to_ass_color("000000", alpha=0x80)
    return (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
        "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, "
        "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,{style['font']},{fontsize},{primary},&H000000FF,{outline_c},"
        f"{back_c},{bold},0,0,0,100,100,0,0,{border_style},{outline},{shadow},"
        f"{alignment},{side_m},{side_m},{margin_v},1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )


def render_ass(events, width, height, style, pos="bottom", box=False):
    alignment = {"bottom": 2, "center": 5, "top": 8}[pos]
    margin_v = int(height * 0.06)
    cpl = chars_per_line(width, height, style)
    out = [_ass_header(width, height, style, alignment, margin_v, side_margin(width), box)]
    for e in events:
        # re-wrap to fit this frame (also fits captions loaded from an edited .srt)
        text = _wrap(" ".join(e["text"].split()), cpl)
        out.append(f"Dialogue: 0,{ass_time(e['start'])},{ass_time(e['end'])},Default,,0,0,0,,"
                   + text.replace("\n", "\\N"))
    return "\n".join(out)


def render_word_by_word(segments, width, height, style, pos="center", highlight="FFFF00"):
    """Viral / karaoke look: a few words on screen, the spoken word highlighted."""
    alignment = {"bottom": 2, "center": 5, "top": 8}[pos]
    margin_v = int(height * 0.06)
    hl = to_ass_color(highlight)
    # keep each group to a single line that fits the frame width
    cpl = chars_per_line(width, height, style)
    groups = [g for g in _chunk(flatten_words(segments), cpl, WBW_GROUP, WBW_GAP) if g]
    out = [_ass_header(width, height, style, alignment, margin_v, side_margin(width), box=False)]
    for group in groups:
        group_end = group[-1]["end"]
        for j, w in enumerate(group):
            start = w["start"]
            end = group[j + 1]["start"] if j + 1 < len(group) else group_end
            if end <= start:
                end = start + 0.1
            parts = []
            for k, ww in enumerate(group):
                if k == j:
                    parts.append("{\\c" + hl + "&}{\\fscx112\\fscy112}" + ww["text"] + "{\\r}")
                else:
                    parts.append(ww["text"])
            out.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Default,,0,0,0,,"
                       + " ".join(parts))
    return "\n".join(out)


def _wrap_words(words, cpl):
    """Wrap a list of word dicts into <= MAX_LINES lines (each a list of the same dicts)."""
    lines, cur, curlen = [], [], 0
    for w in words:
        wl = len(w["text"])
        if cur and curlen + 1 + wl > cpl:
            lines.append(cur); cur, curlen = [], 0
        cur.append(w)
        curlen += (1 if curlen else 0) + wl
    if cur:
        lines.append(cur)
    if len(lines) > MAX_LINES:
        lines = lines[: MAX_LINES - 1] + [[w for ln in lines[MAX_LINES - 1:] for w in ln]]
    return lines


def render_lines_highlighted(segments, width, height, style, pos="bottom", box=False, highlight="FFFF00"):
    """Edited look: full readable lines with the currently-spoken word highlighted (karaoke)."""
    alignment = {"bottom": 2, "center": 5, "top": 8}[pos]
    margin_v = int(height * 0.06)
    cpl = chars_per_line(width, height, style)
    hl = to_ass_color(highlight)
    chunks = [c for c in _chunk(flatten_words(segments), cpl * MAX_LINES, 99, MAX_GAP) if c]
    out = [_ass_header(width, height, style, alignment, margin_v, side_margin(width), box)]
    for chunk in chunks:
        wrapped = _wrap_words(chunk, cpl)
        for gi, w in enumerate(chunk):
            start = w["start"]
            end = chunk[gi + 1]["start"] if gi + 1 < len(chunk) else w["end"]
            if end <= start:
                end = start + 0.05
            line_strs = []
            for ln in wrapped:
                parts = ["{\\c" + hl + "&}" + x["text"] + "{\\r}" if x is w else x["text"] for x in ln]
                line_strs.append(" ".join(parts))
            out.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Default,,0,0,0,,"
                       + "\\N".join(line_strs))
    return "\n".join(out)


# --- card mode: N words at a time, on an optional rounded plate -------------
def word_cards(segments, per_card=3, max_gap=WBW_GAP, min_dur=CARD_MIN_DURATION):
    """Fixed-size word cards: [{start,end,text}]. Breaks on a full stop or a pause."""
    cards, cur = [], []
    for w in flatten_words(segments):
        if cur and (len(cur) >= per_card or w["start"] - cur[-1]["end"] > max_gap):
            cards.append(cur); cur = []
        cur.append(w)
        if w["text"].rstrip()[-1:] in ".!?":
            cards.append(cur); cur = []
    if cur:
        cards.append(cur)

    events = []
    for i, card in enumerate(cards):
        start, end = card[0]["start"], card[-1]["end"]
        if end - start < min_dur:
            end = start + min_dur
        if i + 1 < len(cards):                      # never overlap the next card
            nxt = cards[i + 1][0]["start"]
            if end > nxt - CARD_GAP:
                end = max(start + 0.25, nxt - CARD_GAP)
        events.append({"start": start, "end": end,
                       "text": " ".join(w["text"].strip() for w in card)})
    return events


def _rounded_path(w, h, radius):
    """ASS vector drawing for a rounded rectangle. radius >= h/2 gives a pill."""
    r = max(0.0, min(radius, w / 2.0, h / 2.0))
    k = 0.5523 * r                                  # circle approximation constant
    f = lambda v: f"{v:.0f}"
    return (
        f"m {f(r)} 0 l {f(w - r)} 0 "
        f"b {f(w - r + k)} 0 {f(w)} {f(r - k)} {f(w)} {f(r)} "
        f"l {f(w)} {f(h - r)} "
        f"b {f(w)} {f(h - r + k)} {f(w - r + k)} {f(h)} {f(w - r)} {f(h)} "
        f"l {f(r)} {f(h)} "
        f"b {f(r - k)} {f(h)} 0 {f(h - r + k)} 0 {f(h - r)} "
        f"l 0 {f(r)} "
        f"b 0 {f(r - k)} {f(r - k)} 0 {f(r)} 0"
    )


STOPWORDS = {
    "the", "a", "an", "and", "but", "or", "of", "to", "in", "on", "at", "for", "with",
    "that", "this", "it", "is", "are", "was", "were", "be", "been", "you", "your",
    "i", "we", "they", "he", "she", "as", "so", "if", "then", "than", "just", "not",
}


def _accent_word(text, accent, primary):
    """Colour the card's payload word — longest non-filler — and restore after."""
    words = text.split()
    if not words:
        return text
    rank = lambda i: (words[i].strip(".,!?;:").lower() not in STOPWORDS, len(words[i]), i)
    pick = max(range(len(words)), key=rank)
    words[pick] = ("{\\c" + to_ass_color(accent) + "}" + words[pick]
                   + "{\\c" + to_ass_color(primary) + "}")
    return " ".join(words)


def _strip_punct(text, keep_stop):
    """Captions read cleaner unpunctuated; only the closing card keeps its full stop."""
    text = re.sub(r"[,;:—–]", "", text)
    if not keep_stop:
        text = text.rstrip(".!?")
    return " ".join(text.split())


def render_cards(events, width, height, style, opts=None):
    """One caption per card, optionally on a rounded plate, with fade and rise.

    Positions every card with \\pos so the plate and its text stay locked together;
    style margins and alignment don't apply here.
    """
    o = dict(opts or {})
    base_fs = font_px(height, style)
    primary = style["primary"]
    pad_x = o.get("pad_x", base_fs * 0.61)
    pad_y = o.get("pad_y", base_fs * 0.30)
    radius = o.get("radius")                        # None -> pill
    plate = o.get("plate", False)
    plate_c = o.get("plate_color", "000000")
    plate_a = int(round((1.0 - float(o.get("plate_opacity", 0.82))) * 255))
    fade_in, fade_out = o.get("fade", (0, 0))
    rise = float(o.get("rise", 0))
    accent = o.get("accent")
    accent_every = int(o.get("accent_every", 0) or 0)
    lower = o.get("lowercase", False)
    max_w = width - 2 * side_margin(width)
    y_bottom = o.get("y", 0.88)
    y_bottom = y_bottom * height if y_bottom <= 1.0 else float(y_bottom)

    out = [_ass_header(width, height, style, 2, int(height * 0.06), side_margin(width), box=False)]
    for i, e in enumerate(events):
        text = " ".join(e["text"].split())
        if lower:
            text = text.lower()
        if o.get("strip_punct"):
            text = _strip_punct(text, keep_stop=(i == len(events) - 1))
        if not text:
            continue

        fs = base_fs
        text_w = text_width(text, fs)
        if text_w + 2 * pad_x > max_w:              # shrink rather than wrap or overflow
            fs = max(12.0, fs * (max_w - 2 * pad_x) / text_w)
            text_w = text_width(text, fs)
        plate_w = text_w + 2 * pad_x
        plate_h = fs * 1.15 + 2 * pad_y
        x0 = (width - plate_w) / 2.0
        y0 = y_bottom - plate_h
        cx, cy = width / 2.0, y0 + plate_h / 2.0

        def motion(x, y):
            if rise and fade_in:
                return f"\\move({x:.0f},{y + rise:.0f},{x:.0f},{y:.0f},0,{int(fade_in)})"
            return f"\\pos({x:.0f},{y:.0f})"

        fi, fo = int(fade_in), int(fade_out)
        fad = f"\\fad({fi},{fo})" if (fi or fo) else ""
        dur = max(1, int((e["end"] - e["start"]) * 1000))
        start, end = ass_time(e["start"]), ass_time(e["end"])

        def alpha(a):
            """Hold a translucent shape at alpha `a` while still fading it in and out.
            \\1a alone would clobber \\fad, so a partially-transparent plate needs the
            explicit \\fade form with `a` as its middle value."""
            if not (fi or fo):
                return f"\\1a&H{a:02X}&"
            return f"\\fade(255,{a},255,0,{fi},{max(fi, dur - fo)},{dur})"

        if plate:
            path = _rounded_path(plate_w, plate_h,
                                 plate_h / 2.0 if radius is None else float(radius))
            if o.get("plate_shadow", False):
                out.append(
                    f"Dialogue: 0,{start},{end},Default,,0,0,0,,"
                    "{\\an7" + motion(x0, y0 + fs * 0.17) + "\\p1\\bord0\\shad0\\blur"
                    f"{max(6, int(fs * 0.26))}"
                    "\\c" + to_ass_color(plate_c) + alpha(0xD1) + "}" + path + "{\\p0}"
                )
            out.append(
                f"Dialogue: 1,{start},{end},Default,,0,0,0,,"
                "{\\an7" + motion(x0, y0) + "\\p1\\bord0\\shad0\\c" + to_ass_color(plate_c)
                + alpha(plate_a) + "}" + path + "{\\p0}"
            )

        body = _accent_word(text, accent, primary) if (
            accent and accent_every and i % accent_every == accent_every - 1
        ) else text
        out.append(
            f"Dialogue: 2,{start},{end},Default,,0,0,0,,"
            "{\\an5" + motion(cx, cy) + f"\\fs{fs:.0f}" + fad + "}" + body
        )
    return "\n".join(out)


def render_srt(events):
    out = []
    for i, e in enumerate(events, 1):
        out += [str(i), f"{srt_time(e['start'])} --> {srt_time(e['end'])}", e["text"], ""]
    return "\n".join(out)


def render_vtt(events):
    out = ["WEBVTT", ""]
    for e in events:
        out += [f"{srt_time(e['start'], '.')} --> {srt_time(e['end'], '.')}", e["text"], ""]
    return "\n".join(out)


# --- SRT -> events (edit-then-burn) -----------------------------------------
_SRT_TIME = re.compile(r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})")


def _parse_time(s):
    m = _SRT_TIME.search(s)
    if not m:
        return None
    h, mi, se, ms = m.groups()
    return int(h) * 3600 + int(mi) * 60 + int(se) + int(ms.ljust(3, "0")) / 1000


def parse_srt(path):
    """Read an .srt/.vtt back into [{start,end,text}] so a corrected file can be re-burned."""
    text = Path(path).read_text(encoding="utf-8-sig")
    events = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = [ln for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        time_idx = next((i for i, ln in enumerate(lines) if "-->" in ln), None)
        if time_idx is None:
            continue
        a, _, b = lines[time_idx].partition("-->")
        start, end = _parse_time(a), _parse_time(b)
        if start is None or end is None:
            continue
        body = "\n".join(lines[time_idx + 1:]).strip()
        if body:
            events.append({"start": start, "end": end, "text": body})
    return events


if __name__ == "__main__":
    # build_captions.py segments.json out.ass WIDTH HEIGHT [pos]
    default_style = {"font": "Arial", "size_ratio": 0.05, "primary": "FFFFFF",
                     "outline_color": "000000", "outline": 2, "shadow": 1, "bold": False}
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    ass = render_ass(line_events(data["segments"]), int(sys.argv[3]), int(sys.argv[4]),
                     default_style, pos=sys.argv[5] if len(sys.argv) > 5 else "bottom")
    Path(sys.argv[2]).write_text(ass, encoding="utf-8")
    print(f"Wrote {sys.argv[2]}")
