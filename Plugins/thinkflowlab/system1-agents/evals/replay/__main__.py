# coding: utf-8
"""``python -m evals.replay <trial> [<trial>] --out DIR [--gif] [--strip]``: the pair page, and the GIFs when asked.
Needs the report extra. A trial is a job's trial folder, or a browser run's logs folder (``answer.json`` inside,
frames from ``evals.replay.cast`` under ``frames/``); ``--strip`` lays a browser pair's frames side by side under a
header band instead of the page.

``python -m evals.replay --from-frames DIR [DIR] --out DIR`` stitches one or two folders of PNGs (screencasts) into a GIF,
two of them side by side.
"""

from __future__ import annotations

import s1a.entry  # noqa: F401  # routes the harness logs to files before anything imports openjiuwen
import argparse
from pathlib import Path

from evals.replay.gif import frames_to_gif, strip_columns, strip_gif, write_gif
from evals.replay.page import render_page
from evals.replay.trial import read_trial


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("trials", nargs="*", type=Path, help="one or two trial folders (result.json inside)")
    parser.add_argument("--out", type=Path, required=True, help="where replay.html, the frames and the GIF go")
    parser.add_argument("--gif", action="store_true", help="also write replay.gif (needs the report extra)")
    parser.add_argument(
        "--strip", action="store_true", help="browser runs: also write strip.gif, the cast frames under a header band"
    )
    parser.add_argument("--mode", choices=("time", "step"), default="time", help="GIF clock: episode time or steps")
    parser.add_argument("--speed", type=float, default=4.0, help="time mode: playback speed over real time")
    parser.add_argument("--width", type=int, default=720, help="GIF width in pixels")
    parser.add_argument("--max-frames", type=int, default=120, help="time mode: frame budget")
    parser.add_argument(
        "--from-frames",
        type=Path,
        nargs="+",
        default=None,
        help="stitch these folders' PNGs instead; two go side by side",
    )
    parser.add_argument("--fps", type=float, default=4.0, help="--from-frames: frames per second")
    args = parser.parse_args()
    if args.from_frames is not None:
        print(frames_to_gif(args.from_frames, args.out / "replay.gif", fps=args.fps, width=args.width))
        return
    if not 1 <= len(args.trials) <= 2:
        parser.error("give one or two trial folders")
    trials = [read_trial(path) for path in args.trials]
    page = args.out / "replay.html"
    page.write_text(render_page(trials, out_dir=args.out), encoding="utf-8")
    print(page)
    if args.strip:
        print(
            strip_gif(
                strip_columns(trials),
                args.out / "strip.gif",
                speed=args.speed,
                width=args.width,
                max_frames=args.max_frames,
            )
        )
    if args.gif:
        print(
            write_gif(
                page,
                args.out / "replay.gif",
                mode=args.mode,
                width=args.width,
                speed=args.speed,
                max_frames=args.max_frames,
            )
        )


if __name__ == "__main__":
    main()
