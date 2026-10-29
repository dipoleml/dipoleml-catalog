# video-captions

An agent skill (and standalone CLI) that **transcribes the speech in a video and burns
accurately-timed captions into it** — fully offline, cross-platform (Windows + macOS + Linux),
no server and no API key.

Runs in Claude Code, Codex CLI, Gemini CLI, GitHub Copilot, Cursor, Windsurf and OpenCode
from one `SKILL.md`, in MCP-only hosts via the bundled server, and on its own from a
terminal. See the [root README](../../README.md) for per-agent install commands.

The focus is getting the important part right: **accurate transcription** and **captions that
are synced to the speech, chunked into short readable lines, and positioned well.** The look
defaults to a minimal, common style — and you can **describe any design in plain words** and it
gets applied.

## How it works

```
video ──faster-whisper──▶ words + timestamps
                                  │
                 build_captions ──▶ captions.ass   (readable lines, synced timing, styling)
                                  │
                       ffmpeg ────▶ <name>_captioned.mp4
```

- **faster-whisper** does the speech-to-text with word-level timestamps. Pure `pip` install
  (no PyTorch, no Homebrew), and it downloads its model automatically on first use.
- **ffmpeg** (with libass) burns the styled captions into the video.

## Requirements

- **Python 3.9+**
- **ffmpeg with subtitle support (libass).** `scripts/setup.py` handles this:
  - macOS: installs `ffmpeg-full` via Homebrew (the default `ffmpeg` lacks libass).
  - Windows: `winget install Gyan.FFmpeg` (includes libass).
  - Linux: `sudo apt install ffmpeg` (includes libass).
- **faster-whisper** (installed by setup).

## Setup (once)

```bash
python3 scripts/setup.py      # use `python` on Windows
```

Installs faster-whisper and a subtitle-capable ffmpeg, then you're done. The Whisper model
downloads automatically the first time you caption a video (a few hundred MB); everything after is offline.

## Usage

```bash
python3 scripts/caption.py "path/to/video.mp4"
```

Writes `path/to/video_captioned.mp4` with a clean, minimal caption look.

### The `pill` preset

```bash
python3 scripts/caption.py demo.mp4 --preset
```

Three lowercase words at a time on a dark rounded pill, one accent word every fifth card,
fading in with a small upward drift. Built for **light footage**, where a pale plate would
dissolve into the picture. Type size and height adapt to the aspect ratio (46px at 88% height
for landscape, 64px at 78% for portrait — clear of platform chrome).

| Flag | Values | Meaning |
|------|--------|---------|
| `--preset` | `pill` (default value) | the whole look in one flag |
| `--words` | number | words per card, static, no highlight (preset: 3) |
| `--plate` | — | rounded plate behind the text |
| `--plate-color` | name or hex | plate colour |
| `--plate-opacity` | `0`–`1` | plate opacity (default `0.82`) |
| `--plate-radius` | px | corner radius (default: a full pill) |
| `--plate-pad` | `x,y` in px | padding inside the plate |
| `--no-plate-shadow` | — | drop the soft shadow |
| `--lowercase` | — | force lowercase |
| `--accent` | name or hex | colour one word per card |
| `--accent-every` | number | accent every N cards (default `5`, `0` = never) |
| `--fade` | `in,out` ms | e.g. `140,100` |
| `--y` | ratio or px | caption's bottom edge, e.g. `0.88` |

Every one of these works on its own, so the preset is a shortcut rather than a special case:
`--words 2 --plate --plate-radius 16` is a perfectly good look that isn't the preset.

The plate is sized by a glyph-width model rather than real font metrics — fitted so it never
under-estimates, which means a narrow face gets a slightly roomier pill. `--plate-pad` tightens it.

### Describe the design

Everything else is freeform — pass whatever the desired look implies:

| Flag | Values | Meaning |
|------|--------|---------|
| `--pos` | `top` / `center` / `bottom` | position (default bottom) |
| `--color` | name or hex (`yellow`, `FFCC00`) | text colour |
| `--outline-color` | name or hex | outline colour |
| `--size` | `small` / `medium` / `large` / `huge` or a ratio | text size |
| `--outline` | number (`0` = none) | outline thickness |
| `--shadow` | number (`0` = none) | shadow depth |
| `--weight` | `bold` / `normal` | text weight |
| `--font` | family name (`Impact`, `Georgia`) | font |
| `--fontsdir` | folder | load `.ttf`/`.otf` from a folder when the font isn't installed |
| `--model` | `base` / `small` / `medium` / `large-v3` | transcription model (default `small`; bigger = more accurate, slower) |
| `--context` | free text | hint of names/jargon/topic so hard words transcribe correctly, e.g. `--context "Grafana, Ayush Katare"` |
| `--lang` | code | force source language (default: auto-detect) |
| `--out` | path | output file |

### More capabilities

| Flag | Meaning |
|------|---------|
| *(default)* | bold, edited captions with the spoken word highlighted |
| `--plain` | static subtitles with no spoken-word highlight |
| `--word-by-word` | viral / TikTok karaoke style — a few words at a time, active word highlighted (big & bold) |
| `--highlight` | highlight colour for the spoken word (name or hex, default yellow) |
| `--box` / `--box-color` | semi-transparent band behind the text for busy footage |
| `--lang <code>` | source language (default: auto-detect) |
| `--translate` | output English captions from any spoken language |
| `--export srt\|vtt\|both` | also write an editable subtitle file next to the video |
| `--no-burn` | skip rendering; only export the subtitle file(s) |
| `--from-srt <file>` | burn captions from an existing/edited `.srt` (no re-transcription) |
| *(folder path)* | pass a directory to batch-caption every video in it |

Examples:

```bash
python3 scripts/caption.py talk.mp4 --pos top --size large --weight bold --color yellow
python3 scripts/caption.py talk.mp4 --word-by-word                 # viral style
python3 scripts/caption.py talk.mp4 --translate                    # English subs from any language
python3 scripts/caption.py talk.mp4 --export srt --no-burn         # just an .srt
python3 scripts/caption.py talk.mp4 --from-srt talk.srt            # burn a corrected .srt
python3 scripts/caption.py ./clips                                 # batch a folder
python3 scripts/caption.py talk.mp4 --color white --outline-color black --outline 4
python3 scripts/caption.py talk.mp4 --shadow 0            # flat, minimal
python3 scripts/caption.py talk.mp4 --model small         # if a few words were wrong
```

## Using it as an agent skill

`SKILL.md` makes this discoverable to any agent implementing the
[Agent Skills](https://agentskills.dev) standard, which reads a user's plain-language request
(*"add big yellow captions at the top of demo.mp4"*) and translates it into the right flags.

Run `python3 install.py` from the repo root to install it into every agent on your machine,
or see the [root README](../../README.md) for one agent at a time. Then just say
*"add captions to demo.mp4"*.

## Project layout

```
video-captions/
├── SKILL.md              # agent skill definition (portable across hosts)
├── README.md
├── requirements.txt
└── scripts/
    ├── setup.py          # cross-platform dependency check/install + PATH launcher
    ├── ffmpeg_tools.py   # find an ffmpeg build that supports subtitles (libass)
    ├── transcribe.py     # faster-whisper -> segments.json (word timestamps)
    ├── build_captions.py # segments.json -> captions.ass (timing + placement + styling)
    ├── caption.py        # orchestrator: transcribe -> build -> ffmpeg burn
    └── mcp_server.py     # stdio MCP server, for hosts with no skills support
```

## Notes & limitations

- Captions are **burned in** (open captions), baked into the pixels — ready to post as-is.
- English works out of the box; faster-whisper auto-detects other languages.
- Not real-time / "live" captions — this processes an existing file.
- Fully local: after the one-time model download, no network is used.
