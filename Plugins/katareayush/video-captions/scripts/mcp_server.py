#!/usr/bin/env python3
"""A stdio MCP server for video-captions — the fallback distribution channel.

Agents that read the Agent Skills standard (Claude Code, Codex, Gemini CLI, Copilot,
Cursor, OpenCode) should use SKILL.md instead: it costs ~40 tokens until triggered and
lets the model compose flags freely. This server exists for hosts that only speak MCP
(Zed, Windsurf, ChatGPT desktop, n8n, LM Studio), where a skill would never be seen.

Deliberately dependency-free: it speaks JSON-RPC 2.0 over stdin/stdout directly rather
than importing the `mcp` package, so `pip install` is never a prerequisite for the very
thing whose job is to install prerequisites.

Register it with, e.g.:
    {"command": "python3", "args": ["<abs path>/mcp_server.py"]}
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROTOCOL_VERSION = "2025-06-18"

# Mirrors caption.py's argparse. Kept flat and string-typed on purpose: MCP hosts vary
# wildly in how well they coerce types, and caption.py parses strings anyway.
FLAGS = {
    "preset": ("boolean", "Built-in 'pill' look: 3 lowercase words on a dark rounded plate. Best for light footage."),
    "word_by_word": ("boolean", "Viral/TikTok karaoke look: a few words at a time, active word highlighted."),
    "plain": ("boolean", "Static subtitles with no spoken-word highlight."),
    "words": ("integer", "Show N words at a time as static cards."),
    "pos": ("string", "top | center | bottom"),
    "size": ("string", "small | medium | large | huge, or a ratio like 0.06"),
    "color": ("string", "Text colour: a name (yellow) or hex (FFCC00)."),
    "outline_color": ("string", "Outline colour (name or hex)."),
    "outline": ("number", "Outline width; 0 for none."),
    "shadow": ("number", "Shadow depth; 0 for none."),
    "weight": ("string", "bold | normal"),
    "font": ("string", "Font family, e.g. Arial, Impact, Georgia."),
    "fontsdir": ("string", "Folder of .ttf/.otf files to load fonts from."),
    "highlight": ("string", "Highlight colour for the spoken word (default yellow)."),
    "box": ("boolean", "Semi-transparent band behind the text."),
    "box_color": ("string", "Box colour (name or hex)."),
    "plate": ("boolean", "Rounded plate behind the text."),
    "plate_color": ("string", "Plate colour (name or hex)."),
    "plate_opacity": ("number", "Plate opacity, 0-1."),
    "plate_radius": ("number", "Corner radius in px; omit for a full pill."),
    "plate_pad": ("string", "Padding inside the plate: 'x,y' in px."),
    "no_plate_shadow": ("boolean", "Drop the soft shadow under the plate."),
    "lowercase": ("boolean", "Force captions to lowercase."),
    "accent": ("string", "Colour one word per card (name or hex)."),
    "accent_every": ("integer", "Accent a word every N cards."),
    "fade": ("string", "Fade in,out in ms, e.g. '140,100'."),
    "y": ("number", "Caption bottom edge: a ratio like 0.88 or a pixel value."),
    "model": ("string", "Whisper model: base | small (default) | medium | large-v3."),
    "context": ("string", "Names/jargon/topic hint so hard words transcribe correctly. The single biggest accuracy lever."),
    "lang": ("string", "Source language code, e.g. hi, es. Default: auto-detect."),
    "translate": ("boolean", "Translate speech to English captions."),
    "export": ("string", "Also write a subtitle file: srt | vtt | both."),
    "no_burn": ("boolean", "Don't render the video; only export subtitle file(s)."),
    "from_srt": ("string", "Burn captions from an existing .srt, skipping transcription."),
    "out": ("string", "Output path (single video only)."),
}

CAPTION_SCHEMA = {
    "type": "object",
    "properties": {
        "video": {
            "type": "string",
            "description": "Absolute path to a video file, or a folder to batch-caption.",
        },
        **{name: {"type": t, "description": d} for name, (t, d) in FLAGS.items()},
    },
    "required": ["video"],
}

TOOLS = [
    {
        "name": "caption_video",
        "description": (
            "Transcribe a video's speech locally (faster-whisper) and burn accurately-timed "
            "captions into it (ffmpeg). Offline after a one-time model download; no API key. "
            "Writes <name>_captioned.mp4 next to the input and returns its path. Defaults to a "
            "bold, high-contrast look with the spoken word highlighted. Runs for roughly the "
            "duration of the video, and longer on the very first call while the model downloads."
        ),
        "inputSchema": CAPTION_SCHEMA,
    },
    {
        "name": "setup_captions",
        "description": (
            "Install the prerequisites: faster-whisper, a subtitle-capable ffmpeg build, and a "
            "video-captions launcher on PATH. Idempotent. Run once, or whenever caption_video "
            "reports a missing dependency."
        ),
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def run(cmd):
    """Run a bundled script and fold stdout+stderr into one text payload."""
    proc = subprocess.run(cmd, capture_output=True, text=True)
    body = (proc.stdout or "") + (proc.stderr or "")
    return body.strip() or "(no output)", proc.returncode != 0


def build_argv(args):
    """Translate the flat MCP argument object into caption.py's argv."""
    argv = [sys.executable, str(HERE / "caption.py"), str(args["video"])]
    for name, (kind, _) in FLAGS.items():
        if name not in args or args[name] is None:
            continue
        value = args[name]
        flag = "--" + name.replace("_", "-")
        if kind == "boolean":
            if value:
                argv.append(flag)
        else:
            argv += [flag, str(value)]
    return argv


def call_tool(name, args):
    if name == "setup_captions":
        return run([sys.executable, str(HERE / "setup.py")])
    if name == "caption_video":
        if not args.get("video"):
            return "Error: 'video' is required.", True
        return run(build_argv(args))
    return f"Unknown tool: {name}", True


def handle(request):
    """Return a result dict, or None for notifications (which take no response)."""
    method = request.get("method")

    if method == "initialize":
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "video-captions", "version": "1.4.0"},
        }
    if method == "tools/list":
        return {"tools": TOOLS}
    if method == "tools/call":
        params = request.get("params") or {}
        text, failed = call_tool(params.get("name"), params.get("arguments") or {})
        return {"content": [{"type": "text", "text": text}], "isError": failed}
    if method == "ping":
        return {}
    if method and method.startswith("notifications/"):
        return None
    raise LookupError(method)


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            continue

        req_id = request.get("id")
        try:
            result = handle(request)
        except LookupError as exc:
            response = {"jsonrpc": "2.0", "id": req_id,
                        "error": {"code": -32601, "message": f"Method not found: {exc}"}}
        except Exception as exc:  # never take the transport down over one bad call
            response = {"jsonrpc": "2.0", "id": req_id,
                        "error": {"code": -32603, "message": str(exc)}}
        else:
            # Notifications carry no id and must not be answered.
            if result is None or req_id is None:
                continue
            response = {"jsonrpc": "2.0", "id": req_id, "result": result}

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
